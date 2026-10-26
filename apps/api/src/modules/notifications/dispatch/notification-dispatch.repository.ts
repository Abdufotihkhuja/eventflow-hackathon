import { Injectable, Logger } from '@nestjs/common';
import { OrderKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CancelByInput,
  DELIVERY_STATUS,
  NotificationChannel,
  SCHEDULED_STATUS,
  ScheduledRefs,
  ScheduledRowLike,
} from './notification.types';

type Db = PrismaService | Prisma.TransactionClient;

export interface CreateDeliveryData {
  dedupKey: string;
  catalogId: string;
  channel: NotificationChannel;
  accountId: string | null;
  organizationId: string | null;
  eventId?: string | null;
  registrationId?: string | null;
  orderId?: string | null;
  status: string;
  payload: Prisma.InputJsonValue;
  error?: string | null;
}

/**
 * Prisma-доступ ядра диспатчера: журнал NotificationDelivery, планировщик
 * ScheduledNotification, guard-перечитка доменных ссылок. Все обращения к
 * tenant-моделям — здесь, в repository-слое (инвариант №7).
 */
@Injectable()
export class NotificationDispatchRepository {
  private readonly logger = new Logger(NotificationDispatchRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient): Db {
    return tx ?? this.prisma;
  }

  /**
   * INSERT одной delivery-строки. P2002 по composite unique
   * (dedupKey, accountId, channel) → null: эта доставка этому получателю по
   * этому каналу уже была (инвариант №1, noop с логом).
   */
  async createDelivery(
    data: CreateDeliveryData,
    tx?: Prisma.TransactionClient,
  ) {
    try {
      return await this.db(tx).notificationDelivery.create({
        data: {
          dedupKey: data.dedupKey,
          catalogId: data.catalogId,
          channel: data.channel,
          accountId: data.accountId,
          organizationId: data.organizationId,
          eventId: data.eventId ?? null,
          registrationId: data.registrationId ?? null,
          orderId: data.orderId ?? null,
          status: data.status,
          payload: data.payload,
          error: data.error ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          JSON.stringify({
            type: 'notification.deduplicated',
            dedupKey: data.dedupKey,
            channel: data.channel,
            accountId: data.accountId,
          }),
        );
        return null;
      }
      throw error;
    }
  }

  async updateDelivery(
    id: string,
    data: Prisma.NotificationDeliveryUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(tx).notificationDelivery.update({ where: { id }, data });
  }

  async getDelivery(id: string) {
    return this.prisma.notificationDelivery.findUnique({ where: { id } });
  }

  /** Застрявшие enqueued-строки для reaper-свипа (BL-06/D-01). */
  async findStuckEnqueued(olderThan: Date, limit: number) {
    return this.prisma.notificationDelivery.findMany({
      where: {
        status: DELIVERY_STATUS.ENQUEUED,
        updatedAt: { lt: olderThan },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  /** Идемпотентное планирование: create; P2002 → политика onConflict. */
  async upsertScheduled(
    data: {
      catalogId: string;
      dedupKey: string;
      runAt: Date;
      eventId?: string | null;
      registrationId?: string | null;
      orderId?: string | null;
      accountId?: string | null;
      organizationId?: string | null;
      context: Prisma.InputJsonValue;
    },
    onConflict: 'keep' | 'updateRunAt' | 'resurrect',
    tx?: Prisma.TransactionClient,
  ): Promise<{ created: boolean }> {
    try {
      await this.db(tx).scheduledNotification.create({
        data: {
          catalogId: data.catalogId,
          dedupKey: data.dedupKey,
          runAt: data.runAt,
          status: SCHEDULED_STATUS.SCHEDULED,
          eventId: data.eventId ?? null,
          registrationId: data.registrationId ?? null,
          orderId: data.orderId ?? null,
          accountId: data.accountId ?? null,
          organizationId: data.organizationId ?? null,
          context: data.context,
        },
      });
      return { created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (onConflict === 'updateRunAt') {
          // Обновляем только ещё-не-исполненную строку: dispatched/cancelled
          // не воскрешаем — их пересоздание это ЯВНЫЙ новый dedupKey.
          await this.db(tx).scheduledNotification.updateMany({
            where: {
              dedupKey: data.dedupKey,
              status: SCHEDULED_STATUS.SCHEDULED,
            },
            data: { runAt: data.runAt, context: data.context },
          });
        } else if (onConflict === 'resurrect') {
          // Переоткрытие регистрации/reconcile (D-11): каскадно отменённая
          // строка с тем же dedupKey оживает. dispatched не трогаем —
          // повторная отправка возможна только под новым ключом.
          await this.db(tx).scheduledNotification.updateMany({
            where: {
              dedupKey: data.dedupKey,
              status: {
                in: [SCHEDULED_STATUS.SCHEDULED, SCHEDULED_STATUS.CANCELLED],
              },
            },
            data: {
              status: SCHEDULED_STATUS.SCHEDULED,
              runAt: data.runAt,
              context: data.context,
              cancelledAt: null,
              cancelReason: null,
            },
          });
        }
        return { created: false };
      }
      throw error;
    }
  }

  /**
   * Тик dispatch-due: захват due-строк `FOR UPDATE SKIP LOCKED` внутри
   * транзакции вызывающего. Сортировка (priority, runAt) — приоритизация CLS
   * по ближайшему дедлайну достигается runAt-порядком внутри приоритета.
   */
  async claimDueScheduled(
    tx: Prisma.TransactionClient,
    now: Date,
    limit: number,
  ): Promise<ScheduledRowLike[]> {
    const ids = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM scheduled_notifications
      WHERE status = 'scheduled' AND run_at <= ${now}
      ORDER BY
        CASE COALESCE(context->>'priority', 'normal')
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          ELSE 2
        END,
        run_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `);
    if (ids.length === 0) {
      return [];
    }
    const rows = await tx.scheduledNotification.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
    });
    // Восстанавливаем порядок захвата (findMany его не гарантирует).
    const order = new Map(ids.map((r, index) => [r.id, index]));
    return rows
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((row) => ({
        id: row.id,
        catalogId: row.catalogId,
        dedupKey: row.dedupKey,
        runAt: row.runAt,
        eventId: row.eventId,
        registrationId: row.registrationId,
        orderId: row.orderId,
        accountId: row.accountId,
        organizationId: row.organizationId,
        context: (row.context as Record<string, unknown> | null) ?? null,
      }));
  }

  async markScheduled(
    id: string,
    data: Prisma.ScheduledNotificationUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.db(tx).scheduledNotification.update({ where: { id }, data });
  }

  /** Каскадная инвалидация (инвариант №3) с гранулярностью по типам (BL-03). */
  async cancelScheduledBy(input: CancelByInput): Promise<number> {
    const where = this.buildCancelWhere(input);
    const result = await this.db(input.tx).scheduledNotification.updateMany({
      where: { ...where, status: SCHEDULED_STATUS.SCHEDULED },
      data: {
        status: SCHEDULED_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: input.reason,
      },
    });
    return result.count;
  }

  /**
   * Пометка cancelled ещё-не-отправленных доставок. providerRef=null —
   * ушедшее провайдеру не отменяем (уже в полёте, BL-06).
   */
  async cancelDeliveriesBy(input: CancelByInput): Promise<number> {
    const where = this.buildCancelWhere(input);
    const result = await this.db(input.tx).notificationDelivery.updateMany({
      where: {
        ...where,
        status: {
          in: [DELIVERY_STATUS.SCHEDULED, DELIVERY_STATUS.ENQUEUED],
        },
        providerRef: null,
      },
      data: { status: DELIVERY_STATUS.CANCELLED, error: input.reason },
    });
    return result.count;
  }

  /** Анонимизация журнала при hard-delete аккаунта (BL-07/OQ-22): payload → {}. */
  async anonymizeDeliveriesForAccount(
    accountId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await this.db(tx).notificationDelivery.updateMany({
      where: { accountId },
      data: { payload: {} },
    });
    return result.count;
  }

  /**
   * Общее where каскадной отмены: структурный тип, совместимый и со
   * ScheduledNotification, и с NotificationDelivery (одинаковые ref-колонки).
   */
  private buildCancelWhere(input: CancelByInput): {
    eventId?: string;
    registrationId?: string;
    orderId?: string;
    accountId?: string;
    OR?: Array<{ catalogId: { startsWith: string } }>;
  } {
    const refs: {
      eventId?: string;
      registrationId?: string;
      orderId?: string;
      accountId?: string;
    } = {};
    if (input.eventId) refs.eventId = input.eventId;
    if (input.registrationId) refs.registrationId = input.registrationId;
    if (input.orderId) refs.orderId = input.orderId;
    if (input.accountId) refs.accountId = input.accountId;
    if (
      !input.eventId &&
      !input.registrationId &&
      !input.orderId &&
      !input.accountId
    ) {
      throw new Error(
        'cancelBy: нужна хотя бы одна ссылка (eventId/registrationId/orderId/accountId)',
      );
    }
    if (input.types && input.types.length > 0) {
      return {
        ...refs,
        OR: input.types.map((type) => ({
          catalogId: { startsWith: type },
        })),
      };
    }
    return refs;
  }

  /**
   * Guard-перечитка доменных ссылок плановой строки (BL-07/BL-10).
   * Order явно скоупится kind=TICKET_SALE (B-05): биллинговые заказы других
   * kind цепочка уведомлений не читает.
   */
  async readScheduledRefs(
    row: ScheduledRowLike,
    tx?: Prisma.TransactionClient,
  ): Promise<ScheduledRefs> {
    const db = this.db(tx);
    const refs: ScheduledRefs = {};

    if (row.eventId) {
      refs.event = await db.event.findUnique({
        where: { id: row.eventId },
        select: { id: true, status: true, startDate: true, endDate: true },
      });
    }
    if (row.registrationId) {
      refs.registration = await db.registration.findUnique({
        where: { id: row.registrationId },
        select: { id: true, status: true, eventId: true, userId: true },
      });
    }
    if (row.orderId) {
      refs.order = await db.order.findFirst({
        where: { id: row.orderId, kind: OrderKind.TICKET_SALE },
        select: { id: true, status: true, kind: true },
      });
    }
    if (row.accountId) {
      const account = await db.account.findUnique({
        where: { id: row.accountId },
        select: { id: true, deletedAt: true },
      });
      refs.account = account && !account.deletedAt ? { id: account.id } : null;
    }
    if (row.organizationId) {
      // OQ-7: archive/suspension is a sticky deny for already queued work.
      // Re-read immediately inside the dispatch transaction so a stale job
      // cannot perform the external side effect for an unavailable tenant.
      const organization = await db.organization.findFirst({
        where: {
          id: row.organizationId,
          deletedAt: null,
          suspendedAt: null,
        },
        select: { id: true },
      });
      refs.organization = organization;
    }
    return refs;
  }

  async getEventById(eventId: string) {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        registrationDeadline: true,
        timezone: true,
        organizationId: true,
      },
    });
  }
}
