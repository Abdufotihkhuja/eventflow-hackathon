import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventStatus, RegistrationStatus } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { NotificationAudienceRepository } from '../dispatch/notification-audience.repository';
import { NotificationDispatcherService } from '../dispatch/notification-dispatcher.service';
import { NotificationReplanService } from '../dispatch/notification-replan.service';
import {
  MaterializeResult,
  NotificationIntent,
  ScheduledRefs,
  ScheduledRowLike,
} from '../dispatch/notification.types';
import {
  ChainEventSnapshot,
  NotificationChainDataRepository,
} from './chain-data.repository';
import { epochSeconds, resolveEventTimezone } from './chain-shared';

/** CLS-01 — «закрывается через 24ч» сохранившим (SavedEvent). */
const CLS01_OFFSET_MS = 24 * 60 * 60 * 1000;
/** CLS-03 — итог организатору через 5 минут после дедлайна. */
const CLS03_DELAY_MS = 5 * 60 * 1000;

/**
 * Цепочка 4 — закрытие регистрации (CLS-01..03, NOTIFICATIONS_CATALOG §6;
 * CLS-04 слит в CLS-03 — BL-17е).
 *
 * Триггер плановых строк — registrationDeadline; ручной тумблер
 * registrationOpen приоритетен (D-11: ключ ручного закрытия — closeEpoch).
 */
@Injectable()
export class ClosingChainService implements OnModuleInit {
  private readonly logger = new Logger(ClosingChainService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly audience: NotificationAudienceRepository,
    private readonly data: NotificationChainDataRepository,
    private readonly replan: NotificationReplanService,
  ) {}

  onModuleInit(): void {
    this.dispatcher.registerMaterializer(
      'CLS-01',
      this.materializeClosingSoon.bind(this),
    );
    this.dispatcher.registerMaterializer(
      'CLS-03',
      this.materializeOrgSummary.bind(this),
    );
    // BL-03: перенос registrationDeadline → пересоздание CLS-строк.
    this.replan.registerReplanHandler('CLS', async (event) => {
      if (event.status !== EventStatus.PUBLISHED) {
        return;
      }
      const snapshot = await this.data.getEventSnapshot(event.id);
      if (snapshot) {
        await this.scheduleForEvent(snapshot, { resurrect: true });
      }
    });
  }

  /**
   * Плановые CLS-строки: только при заданном дедлайне и открытой регистрации
   * (без дедлайна CLS-03 существует лишь в ручном пути с closeEpoch, D-11).
   */
  async scheduleForEvent(
    event: ChainEventSnapshot,
    options: { resurrect?: boolean } = {},
  ): Promise<void> {
    try {
      if (!event.registrationDeadline || !event.registrationOpen) {
        return;
      }
      const deadlineEpoch = epochSeconds(event.registrationDeadline);
      const timezone = resolveEventTimezone(event.timezone);
      const onConflict = options.resurrect ? 'resurrect' : 'keep';

      const cls01RunAt = new Date(
        event.registrationDeadline.getTime() - CLS01_OFFSET_MS,
      );
      if (cls01RunAt.getTime() > Date.now()) {
        await this.dispatcher.schedule({
          catalogId: 'CLS-01',
          dedupKey: `cls:interest:${event.id}:${deadlineEpoch}`,
          runAt: cls01RunAt,
          kind: 'informational',
          priority: 'normal',
          preferenceKey: 'saved_event_alerts',
          eventId: event.id,
          timezone,
          context: { deadlineEpoch },
          onConflict,
        });
      }

      await this.dispatcher.schedule({
        catalogId: 'CLS-03',
        dedupKey: `cls:orgsummary:${event.id}:${deadlineEpoch}`,
        runAt: new Date(
          event.registrationDeadline.getTime() + CLS03_DELAY_MS,
        ),
        kind: 'informational',
        priority: 'normal',
        preferenceKey: 'organizer_registrations',
        eventId: event.id,
        organizationId: event.organizationId,
        timezone,
        context: { deadlineEpoch },
        onConflict,
      });
    } catch (error) {
      this.swallow('scheduleForEvent', event.id, error);
    }
  }

  /**
   * Ручной тумблер registrationOpen (events.service.update).
   * Закрытие: cancel CLS-01/02-плана + немедленный CLS-03 с ключом
   * {closeEpoch} — «закрыл→открыл→закрыл» даёт новый ключ (D-11).
   * Открытие: пересоздание плана по дедлайну (resurrect).
   */
  async onRegistrationToggle(eventId: string, open: boolean): Promise<void> {
    try {
      const event = await this.data.getEventSnapshot(eventId);
      if (!event) {
        return;
      }
      if (open) {
        await this.scheduleForEvent(event, { resurrect: true });
        return;
      }
      await this.dispatcher.cancelBy({
        eventId,
        types: ['CLS'],
        reason: 'registration_closed_manually',
      });
      const intent = await this.buildOrgSummaryIntent(
        event,
        `cls:orgsummary:${eventId}:${epochSeconds(new Date())}`,
      );
      if (intent) {
        await this.dispatcher.dispatch(intent);
      }
    } catch (error) {
      this.swallow('onRegistrationToggle', eventId, error);
    }
  }

  /**
   * CLS-02 «осталось N мест»: sync при падении остатка ниже порога
   * max(3, 10% maxParticipants). Антифлаппинг — ключ без порога: одна строка
   * (dedupKey, accountId, push) на пользователя-событие навсегда.
   */
  async onSeatsChanged(event: ChainEventSnapshot): Promise<void> {
    try {
      if (event.maxParticipants === null || event.maxParticipants <= 0) {
        return;
      }
      const taken = await this.data.countRegistrations(event.id, [
        RegistrationStatus.PENDING,
        RegistrationStatus.APPROVED,
      ]);
      const seatsLeft = event.maxParticipants - taken;
      const threshold = Math.max(3, Math.ceil(event.maxParticipants * 0.1));
      if (seatsLeft <= 0) {
        // Capacity 100%: CLS-01/02 больше не актуальны (STATE_MACHINES §4).
        await this.dispatcher.cancelBy({
          eventId: event.id,
          types: ['CLS-01', 'CLS-02'],
          reason: 'capacity_full',
        });
        return;
      }
      if (seatsLeft > threshold || !event.registrationOpen) {
        return;
      }
      const recipients = await this.audience.resolveSavedEventAudience(
        event.id,
      );
      if (recipients.length === 0) {
        return;
      }
      await this.dispatcher.dispatch({
        catalogId: 'CLS-02',
        dedupKey: `cls:seats:${event.id}`,
        eventId: event.id,
        recipients,
        push: {
          params: { eventTitle: event.title, seatsLeft },
          routeParams: { id: event.id },
          payload: {},
        },
      });
    } catch (error) {
      this.swallow('onSeatsChanged', event.id, error);
    }
  }

  /** CLS-01: guard'ы BL-18 — регистрация всё ещё открыта, дедлайн тот же. */
  private async materializeClosingSoon(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    if (!refs.event || refs.event.status !== EventStatus.PUBLISHED) {
      return { action: 'skip', reason: 'event_not_published' };
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    if (!event) {
      return { action: 'skip', reason: 'event_gone' };
    }
    if (!event.registrationOpen || !event.registrationDeadline) {
      return { action: 'skip', reason: 'registration_closed' };
    }
    const deadlineEpoch = row.context?.deadlineEpoch;
    if (
      typeof deadlineEpoch === 'number' &&
      deadlineEpoch !== epochSeconds(event.registrationDeadline)
    ) {
      return { action: 'skip', reason: 'stale_deadline' };
    }
    if (event.registrationDeadline.getTime() <= Date.now()) {
      return { action: 'skip', reason: 'deadline_passed' };
    }
    // Аудитория перечитывается В МОМЕНТ отправки: unsave → выпал (BL-18/D-07),
    // зарегистрировался → выпал (guard в самом запросе аудитории).
    let recipients = await this.audience.resolveSavedEventAudience(event.id);
    // D-10: cap ≤2 CLS-01 на (user, event) при переносах дедлайна.
    const saturated = await this.data.getCls01SaturatedAccounts(event.id);
    recipients = recipients.filter(
      (r) => !r.accountId || !saturated.has(r.accountId),
    );
    if (recipients.length === 0) {
      return { action: 'skip', reason: 'no_recipients' };
    }
    return {
      action: 'dispatch',
      intent: {
        catalogId: 'CLS-01',
        dedupKey: row.dedupKey,
        eventId: event.id,
        recipients,
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: event.id },
          payload: {},
        },
      },
    };
  }

  /** CLS-03 (плановый путь): дедлайн прошёл ЛИБО регистрация закрыта. */
  private async materializeOrgSummary(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    if (!refs.event || refs.event.status === EventStatus.CANCELLED) {
      return { action: 'skip', reason: 'event_cancelled' };
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    if (!event) {
      return { action: 'skip', reason: 'event_gone' };
    }
    const deadlineEpoch = row.context?.deadlineEpoch;
    if (
      typeof deadlineEpoch === 'number' &&
      event.registrationDeadline &&
      deadlineEpoch !== epochSeconds(event.registrationDeadline)
    ) {
      return { action: 'skip', reason: 'stale_deadline' };
    }
    // Дедлайн перенесён вперёд, регистрация фактически открыта → итог рано.
    if (
      event.registrationOpen &&
      event.registrationDeadline &&
      event.registrationDeadline.getTime() > Date.now()
    ) {
      return { action: 'skip', reason: 'registration_still_open' };
    }
    const intent = await this.buildOrgSummaryIntent(event, row.dedupKey);
    if (!intent) {
      return { action: 'skip', reason: 'no_recipients' };
    }
    return { action: 'dispatch', intent };
  }

  /**
   * Итог закрытия (CLS-03): N регистраций / M вместимость / Σ PAID UZS;
   * при countPENDING>0 — блок «X заявок ждут решения» (бывший CLS-04).
   */
  private async buildOrgSummaryIntent(
    event: ChainEventSnapshot,
    dedupKey: string,
  ): Promise<NotificationIntent | null> {
    const recipients = await this.audience.resolveOrganizerAudience(
      event.id,
      PERMISSIONS.REGISTRATIONS_READ,
    );
    if (recipients.length === 0) {
      return null;
    }
    const [totalCount, pendingCount, paid] = await Promise.all([
      this.data.countRegistrations(event.id, [
        RegistrationStatus.PENDING,
        RegistrationStatus.APPROVED,
      ]),
      this.data.countRegistrations(event.id, [RegistrationStatus.PENDING]),
      this.data.getPaidTicketStats(event.id),
    ]);
    return {
      catalogId: 'CLS-03',
      dedupKey,
      eventId: event.id,
      organizationId: event.organizationId,
      recipients,
      push: {
        params: {
          eventTitle: event.title,
          totalCount,
          pendingCount,
        },
        routeParams: { eventId: event.id },
        payload: {},
      },
      orgInApp: {
        organizationId: event.organizationId,
        type: 'REGISTRATION_CLOSED',
        entityType: 'event',
        entityId: event.id,
        payload: {
          eventTitle: event.title,
          totalCount,
          pendingCount,
          paidCount: paid.paidCount,
          revenueMinor: paid.revenueMinor.toString(10),
          maxParticipants: event.maxParticipants,
        },
      },
    };
  }

  private swallow(method: string, id: string, error: unknown): void {
    this.logger.error(
      `Цепочка закрытия регистрации: ${method}(${id}) не выполнена`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
