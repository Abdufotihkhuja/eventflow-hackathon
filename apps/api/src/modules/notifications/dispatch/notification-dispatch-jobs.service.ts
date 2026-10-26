import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { REAPER_REQUEUED_MARKER } from '../channels/channel-sender';
import { NotificationDispatchRepository } from './notification-dispatch.repository';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import {
  DELIVERY_STATUS,
  SCHEDULED_STATUS,
  SKIP_REASON_ORGANIZATION_UNAVAILABLE,
  SKIP_REASON_RECIPIENT_GONE,
  ScheduledRefs,
  ScheduledRowLike,
} from './notification.types';
import {
  PLATFORM_TIMEZONE,
  isWithinQuietHours,
  shiftOutOfQuietHours,
} from './quiet-hours';

export interface DispatchDueTickResult {
  claimed: number;
  dispatched: number;
  skipped: number;
  rescheduled: number;
}

export interface ReaperSweepResult {
  examined: number;
  sentUnconfirmed: number;
  requeued: number;
  failed: number;
  skipped: number;
}

/**
 * Плановые job'ы диспатчера (BL-10/BL-06/BL-07):
 *
 * - тик `dispatch-due` (repeatable 60s): захват due-строк ScheduledNotification
 *   `FOR UPDATE SKIP LOCKED`, guard-перечитка актуального состояния домена,
 *   материализация в NotificationDelivery + канальные job'ы ПОСЛЕ commit;
 * - reaper (repeatable 10 мин): застрявшие enqueued-доставки — providerRef
 *   есть → не переотправлять (sent_unconfirmed); нет → max 1 повторная
 *   постановка, дальше failed (OQ-24, at-least-once с ограничителем).
 */
@Injectable()
export class NotificationDispatchJobsService {
  static readonly DISPATCH_BATCH = 50;
  static readonly REAPER_BATCH = 200;
  static readonly REAPER_STUCK_MS = 10 * 60 * 1000;

  private readonly logger = new Logger(NotificationDispatchJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: NotificationDispatchRepository,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  async runDispatchDueTick(): Promise<DispatchDueTickResult> {
    const result: DispatchDueTickResult = {
      claimed: 0,
      dispatched: 0,
      skipped: 0,
      rescheduled: 0,
    };
    const enqueues: Array<() => Promise<void>> = [];

    await this.prisma.$transaction(async (tx) => {
      const rows = await this.repository.claimDueScheduled(
        tx,
        new Date(),
        NotificationDispatchJobsService.DISPATCH_BATCH,
      );
      result.claimed = rows.length;

      for (const row of rows) {
        const outcome = await this.processDueRow(row, tx, enqueues);
        result[outcome] += 1;
      }
    });

    // BL-06/OQ-27: канальные job'ы — строго ПОСЛЕ commit транзакции тика.
    for (const enqueue of enqueues) {
      await enqueue();
    }

    if (result.claimed > 0) {
      this.logger.log(
        JSON.stringify({ type: 'notification.dispatch_due', ...result }),
      );
    }
    return result;
  }

  private async processDueRow(
    row: ScheduledRowLike,
    tx: Prisma.TransactionClient,
    enqueues: Array<() => Promise<void>>,
  ): Promise<'dispatched' | 'skipped' | 'rescheduled'> {
    const refs = await this.repository.readScheduledRefs(row, tx);

    // OQ-7: restoring an organization must not revive old jobs. A row that was
    // claimed while the tenant was archived/suspended becomes terminal.
    if (row.organizationId && !refs.organization) {
      await this.repository.markScheduled(
        row.id,
        {
          status: SCHEDULED_STATUS.SKIPPED,
          cancelReason: SKIP_REASON_ORGANIZATION_UNAVAILABLE,
        },
        tx,
      );
      return 'skipped';
    }

    // BL-07: висячие ссылки (hard-delete, каскады) → терминальный skipped
    // recipient_gone: не fallback, не retry.
    if (this.hasDanglingRefs(row, refs)) {
      await this.repository.markScheduled(
        row.id,
        {
          status: SCHEDULED_STATUS.SKIPPED,
          cancelReason: SKIP_REASON_RECIPIENT_GONE,
        },
        tx,
      );
      return 'skipped';
    }

    // Quiet hours на исполнении (страховка второго эшелона): informational,
    // попавший в тихое окно (строка могла быть создана до сдвига или тик
    // отстал), переносится на ближайшие 08:00 и остаётся scheduled.
    const kind = row.context?.kind;
    if (kind === 'informational') {
      const timezone =
        typeof row.context?.timezone === 'string'
          ? row.context.timezone
          : PLATFORM_TIMEZONE;
      const now = new Date();
      if (isWithinQuietHours(now, timezone)) {
        await this.repository.markScheduled(
          row.id,
          { runAt: shiftOutOfQuietHours(now, timezone) },
          tx,
        );
        return 'rescheduled';
      }
    }

    const materializer = this.dispatcher.resolveMaterializer(row.catalogId);
    if (!materializer) {
      // Цепочки регистрируют материализаторы при старте (Батч 6); строка
      // неизвестного типа — ошибка конфигурации, терминальный skip, чтобы
      // тик не жевал её вечно.
      this.logger.error(
        `Нет материализатора для плановой строки ${row.id} (${row.catalogId})`,
      );
      await this.repository.markScheduled(
        row.id,
        { status: SCHEDULED_STATUS.SKIPPED, cancelReason: 'no_materializer' },
        tx,
      );
      return 'skipped';
    }

    // Guard-перечитка по типу уведомления: замыкание цепочки само решает
    // (событие всё ещё PUBLISHED? регистрация не отменена? Order
    // kind=TICKET_SALE и статус актуален?) по свежим refs.
    const materialized = await materializer(row, refs);
    if (materialized.action === 'skip') {
      await this.repository.markScheduled(
        row.id,
        { status: SCHEDULED_STATUS.SKIPPED, cancelReason: materialized.reason },
        tx,
      );
      return 'skipped';
    }

    const intents =
      materialized.action === 'dispatchMany'
        ? materialized.intents
        : [materialized.intent];
    for (const intent of intents) {
      const dispatchResult = await this.dispatcher.dispatchNow(intent, tx);
      enqueues.push(dispatchResult.enqueue);
    }
    await this.repository.markScheduled(
      row.id,
      { status: SCHEDULED_STATUS.DISPATCHED, dispatchedAt: new Date() },
      tx,
    );
    return 'dispatched';
  }

  private hasDanglingRefs(row: ScheduledRowLike, refs: ScheduledRefs): boolean {
    return Boolean(
      (row.registrationId && !refs.registration) ||
      (row.eventId && !refs.event) ||
      (row.orderId && !refs.order) ||
      (row.accountId && !refs.account),
    );
  }

  /**
   * Reaper застрявших enqueued (BL-06, D-01):
   * - providerRef есть → send УЖЕ мог дойти до провайдера: не переотправляем,
   *   помечаем sent_unconfirmed (для email providerRef = SMTP messageId);
   * - providerRef нет → max 1 повторная постановка (маркер в error), затем failed;
   * - висячие ссылки → терминальный skipped recipient_gone (BL-07).
   */
  async runReaperSweep(): Promise<ReaperSweepResult> {
    const result: ReaperSweepResult = {
      examined: 0,
      sentUnconfirmed: 0,
      requeued: 0,
      failed: 0,
      skipped: 0,
    };

    const olderThan = new Date(
      Date.now() - NotificationDispatchJobsService.REAPER_STUCK_MS,
    );
    const rows = await this.repository.findStuckEnqueued(
      olderThan,
      NotificationDispatchJobsService.REAPER_BATCH,
    );
    result.examined = rows.length;

    for (const row of rows) {
      if (row.providerRef) {
        await this.repository.updateDelivery(row.id, {
          status: DELIVERY_STATUS.SENT_UNCONFIRMED,
        });
        result.sentUnconfirmed += 1;
        continue;
      }

      if (row.error === REAPER_REQUEUED_MARKER) {
        await this.repository.updateDelivery(row.id, {
          status: DELIVERY_STATUS.FAILED,
          error: 'reaper_retry_exhausted',
        });
        result.failed += 1;
        continue;
      }

      const refs = await this.repository.readScheduledRefs(
        {
          id: row.id,
          catalogId: row.catalogId,
          dedupKey: row.dedupKey,
          runAt: row.createdAt,
          eventId: row.eventId,
          registrationId: row.registrationId,
          orderId: row.orderId,
          accountId: row.accountId,
          organizationId: row.organizationId,
          context: null,
        },
        undefined,
      );
      if (
        (row.organizationId && !refs.organization) ||
        this.hasDanglingRefs(
          {
            id: row.id,
            catalogId: row.catalogId,
            dedupKey: row.dedupKey,
            runAt: row.createdAt,
            eventId: row.eventId,
            registrationId: row.registrationId,
            orderId: row.orderId,
            accountId: row.accountId,
            organizationId: row.organizationId,
            context: null,
          },
          refs,
        )
      ) {
        await this.repository.updateDelivery(row.id, {
          status: DELIVERY_STATUS.SKIPPED,
          error:
            row.organizationId && !refs.organization
              ? SKIP_REASON_ORGANIZATION_UNAVAILABLE
              : SKIP_REASON_RECIPIENT_GONE,
        });
        result.skipped += 1;
        continue;
      }

      // Маркер ДО повторной постановки: краш между ними считает попытку
      // потраченной — дубль хуже потери здесь (OQ-24).
      await this.repository.updateDelivery(row.id, {
        error: REAPER_REQUEUED_MARKER,
      });
      const sender = this.dispatcher.getChannelSender(row.channel);
      if (sender) {
        try {
          await sender.dispatchDelivery({
            id: row.id,
            dedupKey: row.dedupKey,
            catalogId: row.catalogId,
            channel: row.channel,
            accountId: row.accountId,
            organizationId: row.organizationId,
            payload: row.payload,
            error: REAPER_REQUEUED_MARKER,
          });
        } catch (error) {
          this.logger.error(
            `Reaper: повторная постановка ${row.id} не удалась`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      } else {
        this.logger.warn(
          `Reaper: нет sender'а для канала '${row.channel}' (delivery ${row.id})`,
        );
      }
      result.requeued += 1;
    }

    if (result.examined > 0) {
      this.logger.log(
        JSON.stringify({ type: 'notification.reaper', ...result }),
      );
    }
    return result;
  }
}
