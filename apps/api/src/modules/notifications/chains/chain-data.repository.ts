import { Injectable } from '@nestjs/common';
import {
  EventStatus,
  MemberStatus,
  MembershipKind,
  OrderKind,
  OrderStatus,
  Prisma,
  RegistrationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

/** Снапшот события, достаточный любой цепочке (guard + тексты + расписание). */
export interface ChainEventSnapshot {
  id: string;
  slug: string;
  title: string;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date | null;
  timezone: string | null;
  format: string;
  onlineUrl: string | null;
  venue: string | null;
  address: string | null;
  type: string;
  price: Prisma.Decimal | null;
  maxParticipants: number | null;
  registrationOpen: boolean;
  viewsCount: number;
  organizationId: string;
  organizationName: string;
  rejectionReason: string | null;
}

export interface DigestAccountStats {
  newCount: number;
  cancelledCount: number;
  eventsCount: number;
}

/**
 * Доменные чтения пяти цепочек (Батч 6б). Всё, что цепочки читают из чужих
 * моделей, живёт здесь (repository-слой модуля notifications — инвариант №7);
 * аудитории получателей — в NotificationAudienceRepository.
 */
@Injectable()
export class NotificationChainDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient): Db {
    return tx ?? this.prisma;
  }

  async getEventSnapshot(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ChainEventSnapshot | null> {
    const event = await this.db(tx).event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        registrationDeadline: true,
        timezone: true,
        format: true,
        onlineUrl: true,
        venue: true,
        address: true,
        type: true,
        price: true,
        maxParticipants: true,
        registrationOpen: true,
        viewsCount: true,
        organizationId: true,
        deletedAt: true,
        rejectionReason: true,
        organization: { select: { companyName: true } },
      },
    });
    if (!event || event.deletedAt) {
      return null;
    }
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      timezone: event.timezone,
      format: event.format,
      onlineUrl: event.onlineUrl,
      venue: event.venue,
      address: event.address,
      type: event.type,
      price: event.price,
      maxParticipants: event.maxParticipants,
      registrationOpen: event.registrationOpen,
      viewsCount: event.viewsCount,
      organizationId: event.organizationId,
      organizationName: event.organization.companyName,
      rejectionReason: event.rejectionReason,
    };
  }

  countRegistrations(
    eventId: string,
    statuses: RegistrationStatus[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return this.db(tx).registration.count({
      where: { eventId, status: { in: statuses } },
    });
  }

  /** Все регистрации события любого статуса — детектор «первой» (REG-20). */
  countAllRegistrations(eventId: string): Promise<number> {
    return this.prisma.registration.count({ where: { eventId } });
  }

  getRegistration(registrationId: string, tx?: Prisma.TransactionClient) {
    return this.db(tx).registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        status: true,
        eventId: true,
        userId: true,
        ticketNumber: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /** Список APPROVED-регистраций события (планирование REM при publish). */
  listApprovedRegistrations(
    eventId: string,
  ): Promise<Array<{ id: string }>> {
    return this.prisma.registration.findMany({
      where: { eventId, status: RegistrationStatus.APPROVED },
      select: { id: true },
    });
  }

  /** Очередь модерации: сколько событий ждёт (контекст писем MOD-02/06). */
  countPendingReviewEvents(): Promise<number> {
    return this.prisma.event.count({
      where: { status: EventStatus.PENDING_REVIEW, deletedAt: null },
    });
  }

  /**
   * submitSeq (MOD §3, D-12): число предыдущих подач = число РАЗНЫХ
   * dedup-ключей модераторской очереди этого события. Новая колонка не
   * нужна — считаем по журналу доставок MOD-02/MOD-06.
   */
  async countPriorSubmissions(eventId: string): Promise<number> {
    const rows = await this.prisma.notificationDelivery.findMany({
      where: { eventId, catalogId: { in: ['MOD-02', 'MOD-06'] } },
      select: { dedupKey: true },
      distinct: ['dedupKey'],
    });
    return rows.length;
  }

  getOrder(orderId: string, tx?: Prisma.TransactionClient) {
    return this.db(tx).order.findFirst({
      where: { id: orderId, kind: OrderKind.TICKET_SALE },
      select: {
        id: true,
        status: true,
        kind: true,
        eventId: true,
        registrationId: true,
        amountMinor: true,
        currency: true,
        holdExpiresAt: true,
        organizationId: true,
      },
    });
  }

  /**
   * REG-04 = триггер фактической экспирации (каталог): PENDING_PAYMENT с
   * истёкшим hold → EXPIRED. registrationId обнуляется как в lazy-пути
   * ticketing.repository.expireStaleOrders (partial-unique освобождается
   * для нового чекаута). true — экспирация выполнена этим вызовом.
   */
  async expireOrderIfDue(orderId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        kind: OrderKind.TICKET_SALE,
        status: OrderStatus.PENDING_PAYMENT,
        holdExpiresAt: { lte: now },
      },
      data: { status: OrderStatus.EXPIRED, registrationId: null },
    });
    return result.count > 0;
  }

  /** Σ PAID-заказов kind=TICKET_SALE события (CLS-03/SUM-02, B-05). */
  async getPaidTicketStats(eventId: string): Promise<{
    paidCount: number;
    revenueMinor: bigint;
    commissionMinor: bigint;
  }> {
    const rows = await this.prisma.order.findMany({
      where: {
        eventId,
        kind: OrderKind.TICKET_SALE,
        status: OrderStatus.PAID,
      },
      select: { amountMinor: true, commissionAmountMinor: true },
    });
    let revenueMinor = 0n;
    let commissionMinor = 0n;
    for (const row of rows) {
      revenueMinor += row.amountMinor;
      commissionMinor += row.commissionAmountMinor ?? 0n;
    }
    return { paidCount: rows.length, revenueMinor, commissionMinor };
  }

  /** PAID-заказ регистрации — «судьба денег» в REG-10 (возврат оформляется). */
  getPaidOrderForRegistration(registrationId: string) {
    return this.prisma.order.findFirst({
      where: {
        registrationId,
        kind: OrderKind.TICKET_SALE,
        status: OrderStatus.PAID,
      },
      select: { id: true, amountMinor: true, currency: true },
    });
  }

  /** Число пришедших (регистрации с ≥1 Attendance) — SUM-02. */
  countAttendedRegistrations(eventId: string): Promise<number> {
    return this.prisma.registration.count({
      where: {
        eventId,
        status: RegistrationStatus.APPROVED,
        attendances: { some: {} },
      },
    });
  }

  /** Актуальный сертификат регистрации (SUM-01: deep link /certificate/[id]). */
  getCertificateForRegistration(registrationId: string) {
    return this.prisma.certificate.findFirst({
      where: { registrationId, isCurrent: true },
      select: { id: true, certificateUrl: true },
    });
  }

  /** Ближайшее будущее PUBLISHED-событие организации (анонс в SUM-01). */
  getNextPublishedEvent(organizationId: string, excludeEventId: string) {
    return this.prisma.event.findFirst({
      where: {
        organizationId,
        id: { not: excludeEventId },
        status: EventStatus.PUBLISHED,
        deletedAt: null,
        startDate: { gt: new Date() },
      },
      orderBy: { startDate: 'asc' },
      select: { id: true, title: true, slug: true },
    });
  }

  /**
   * Cap ≤2 CLS-01 на (user, event) при переносах дедлайна (BL-18/D-10):
   * аккаунты, уже получившие два пуша CLS-01 по событию.
   */
  async getCls01SaturatedAccounts(eventId: string): Promise<Set<string>> {
    const rows = await this.prisma.notificationDelivery.groupBy({
      by: ['accountId'],
      where: {
        eventId,
        catalogId: 'CLS-01',
        channel: 'push',
        accountId: { not: null },
      },
      _count: { _all: true },
    });
    const saturated = new Set<string>();
    for (const row of rows) {
      if (row.accountId && row._count._all >= 2) {
        saturated.add(row.accountId);
      }
    }
    return saturated;
  }

  /**
   * Аккаунты-получатели дневного дайджеста (REG-22/OQ-23): владельцы и
   * члены с `registrations:read` организаций, у которых есть живое
   * PUBLISHED-событие. Персональные права резолвятся как в
   * resolveOrganizerAudience (роль + персональные пермишены).
   */
  async listDigestAccountIds(permissionCode: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        organization: {
          events: { some: { status: EventStatus.PUBLISHED, deletedAt: null } },
        },
        OR: [
          { kind: MembershipKind.OWNER },
          {
            organizationMember: {
              deletedAt: null,
              status: MemberStatus.ACTIVE,
              OR: [
                {
                  role: {
                    permissions: {
                      some: { permission: { code: permissionCode } },
                    },
                  },
                },
                {
                  permissions: {
                    some: { permission: { code: permissionCode } },
                  },
                },
              ],
            },
          },
        ],
        account: { deletedAt: null },
      },
      select: { accountId: true },
    });
    return [...new Set(memberships.map((m) => m.accountId))];
  }

  /** Организации аккаунта, где он владелец или имеет permission. */
  async listAccountOrganizationIds(
    accountId: string,
    permissionCode: string,
  ): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        accountId,
        OR: [
          { kind: MembershipKind.OWNER },
          {
            organizationMember: {
              deletedAt: null,
              status: MemberStatus.ACTIVE,
              OR: [
                {
                  role: {
                    permissions: {
                      some: { permission: { code: permissionCode } },
                    },
                  },
                },
                {
                  permissions: {
                    some: { permission: { code: permissionCode } },
                  },
                },
              ],
            },
          },
        ],
      },
      select: { organizationId: true },
    });
    return [...new Set(memberships.map((m) => m.organizationId))];
  }

  /**
   * Статистика суток для per-account дайджеста (OQ-23): новые регистрации
   * (createdAt в окне) и отмены (CANCELLED с updatedAt в окне) по
   * PUBLISHED-событиям организаций аккаунта. Порог «не first»: событие, чья
   * ЕДИНСТВЕННАЯ регистрация родилась в окне, исключается — о ней уже был
   * пуш REG-20.
   */
  async getDigestStats(
    organizationIds: string[],
    windowStart: Date,
    windowEnd: Date,
  ): Promise<DigestAccountStats> {
    if (organizationIds.length === 0) {
      return { newCount: 0, cancelledCount: 0, eventsCount: 0 };
    }
    const eventWhere = {
      organizationId: { in: organizationIds },
      status: EventStatus.PUBLISHED,
      deletedAt: null,
    };
    const [created, cancelled] = await Promise.all([
      this.prisma.registration.groupBy({
        by: ['eventId'],
        where: {
          event: eventWhere,
          createdAt: { gte: windowStart, lt: windowEnd },
          status: {
            in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
          },
        },
        _count: { _all: true },
      }),
      this.prisma.registration.groupBy({
        by: ['eventId'],
        where: {
          event: eventWhere,
          status: RegistrationStatus.CANCELLED,
          updatedAt: { gte: windowStart, lt: windowEnd },
        },
        _count: { _all: true },
      }),
    ]);

    // «Не first»: событие с единственной (и свежей) регистрацией уже
    // объявлено пушем REG-20 — не дублируем его дайджестом.
    const createdEventIds = created.map((c) => c.eventId);
    const totals = createdEventIds.length
      ? await this.prisma.registration.groupBy({
          by: ['eventId'],
          where: { eventId: { in: createdEventIds } },
          _count: { _all: true },
        })
      : [];
    const totalByEvent = new Map(
      totals.map((t) => [t.eventId, t._count._all]),
    );

    let newCount = 0;
    const events = new Set<string>();
    for (const row of created) {
      const total = totalByEvent.get(row.eventId) ?? 0;
      if (total === 1 && row._count._all === 1) {
        continue; // first-only событие — покрыто REG-20
      }
      newCount += row._count._all;
      events.add(row.eventId);
    }
    let cancelledCount = 0;
    for (const row of cancelled) {
      cancelledCount += row._count._all;
      events.add(row.eventId);
    }
    return { newCount, cancelledCount, eventsCount: events.size };
  }

  /** Платформенная настройка (SLA модерации, час дайджеста, офсеты REM). */
  async getPlatformSetting(key: string): Promise<string | null> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key },
    });
    return row?.value ?? null;
  }

  /**
   * Живые события для reconcile-свипа: PUBLISHED с будущими датами и
   * недавно завершённые (SUM-плечо T_end+24h ещё впереди).
   */
  listEventsForReconcile(now: Date, limit = 500) {
    const horizon = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    return this.prisma.event.findMany({
      where: {
        deletedAt: null,
        status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        endDate: { gte: horizon },
      },
      select: { id: true },
      take: limit,
    });
  }

  /**
   * Осиротевшие плановые строки: событие исчезло/отменено/удалено.
   * Возвращает eventId со scheduled-строками для батчевой сверки.
   */
  async listScheduledEventIds(): Promise<string[]> {
    const rows = await this.prisma.scheduledNotification.findMany({
      where: { status: 'scheduled', eventId: { not: null } },
      select: { eventId: true },
      distinct: ['eventId'],
    });
    return rows
      .map((r) => r.eventId)
      .filter((id): id is string => id !== null);
  }

  /** Статусы событий по списку id (для гашения осиротевших строк). */
  async getEventStates(
    eventIds: string[],
  ): Promise<Map<string, { status: EventStatus; deletedAt: Date | null }>> {
    if (eventIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, status: true, deletedAt: true },
    });
    return new Map(
      rows.map((r) => [r.id, { status: r.status, deletedAt: r.deletedAt }]),
    );
  }
}
