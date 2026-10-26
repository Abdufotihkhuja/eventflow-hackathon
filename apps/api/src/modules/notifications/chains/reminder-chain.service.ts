import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventFormat, EventStatus, RegistrationStatus } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { NotificationAudienceRepository } from '../dispatch/notification-audience.repository';
import { NotificationDispatcherService } from '../dispatch/notification-dispatcher.service';
import { NotificationReplanService } from '../dispatch/notification-replan.service';
import {
  MaterializeResult,
  ScheduledRefs,
  ScheduledRowLike,
} from '../dispatch/notification.types';
import {
  ChainEventSnapshot,
  NotificationChainDataRepository,
} from './chain-data.repository';
import {
  eventVersion,
  formatTimeInZone,
  resolveEventTimezone,
} from './chain-shared';

/** Офсеты REM-01/REM-02 (каталог §5): конфиг PlatformSetting поверх дефолта. */
const OFFSETS_SETTING_KEY = 'notifications.reminder_offsets';
const DEFAULT_OFFSETS: ReminderOffset[] = [{ key: '24h', minutes: 1440 }];
/** Правило позднего события/регистрации: ≥2h — немедленно, <2h — skip. */
const LATE_RULE_MS = 2 * 60 * 60 * 1000;
/** REM-03: «событие началось» за 10 минут (ONLINE/HYBRID). */
const ONLINE_OFFSET_MS = 10 * 60 * 1000;

export interface ReminderOffset {
  key: string;
  minutes: number;
}

/**
 * Цепочка 3 — напоминания (REM-01/02/03, NOTIFICATIONS_CATALOG §5).
 *
 * Генератор schedule-строк: publish события и approve регистрации; replan при
 * смене startDate — синхронно через реестр NotificationReplanService (BL-03).
 * Отмена регистрации/события гасится cancelBy из цепочки 2 + guard'ами
 * материализаторов (второй эшелон).
 */
@Injectable()
export class ReminderChainService implements OnModuleInit {
  private readonly logger = new Logger(ReminderChainService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly audience: NotificationAudienceRepository,
    private readonly data: NotificationChainDataRepository,
    private readonly replan: NotificationReplanService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.dispatcher.registerMaterializer(
      'REM-01',
      this.materializeAttendeeReminder.bind(this),
    );
    this.dispatcher.registerMaterializer(
      'REM-02',
      this.materializeOrganizerReminder.bind(this),
    );
    this.dispatcher.registerMaterializer(
      'REM-03',
      this.materializeOnlineStart.bind(this),
    );
    // BL-03: перенос startDate → синхронное пересоздание REM-строк.
    this.replan.registerReplanHandler('REM', async (event) => {
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
   * Публикация события: REM-02 организатору + REM-01/03 всем уже
   * подтверждённым (ре-модерация сохраняет регистрации). Идемпотентно по
   * dedup-ключам; новые APPROVED добавляются через scheduleForRegistration.
   */
  async scheduleForEvent(
    event: ChainEventSnapshot,
    options: { resurrect?: boolean } = {},
  ): Promise<void> {
    try {
      const version = eventVersion(event.startDate);
      const timezone = resolveEventTimezone(event.timezone);
      const onConflict = options.resurrect ? 'resurrect' : 'keep';
      for (const offset of await this.getOffsets()) {
        const runAt = this.resolveRunAt(event.startDate, offset.minutes);
        if (!runAt) {
          continue;
        }
        await this.dispatcher.schedule({
          catalogId: 'REM-02',
          dedupKey: `reminder:org:${event.id}:${offset.key}:${version}`,
          runAt,
          kind: 'informational',
          priority: 'normal',
          preferenceKey: 'event_reminders',
          eventId: event.id,
          organizationId: event.organizationId,
          timezone,
          context: { offsetKey: offset.key, eventVersion: version },
          onConflict,
        });
      }
      const approved = await this.data.listApprovedRegistrations(event.id);
      for (const registration of approved) {
        await this.scheduleForRegistration(registration.id, event, options);
      }
    } catch (error) {
      this.swallow('scheduleForEvent', event.id, error);
    }
  }

  /**
   * Registration→APPROVED на PUBLISHED-событии: персональные REM-01 (+REM-03
   * для ONLINE/HYBRID). PENDING не планируем (OQ-06).
   */
  async scheduleForRegistration(
    registrationId: string,
    event: ChainEventSnapshot,
    options: { resurrect?: boolean } = {},
  ): Promise<void> {
    try {
      if (event.status !== EventStatus.PUBLISHED) {
        return;
      }
      const version = eventVersion(event.startDate);
      const timezone = resolveEventTimezone(event.timezone);
      const onConflict = options.resurrect ? 'resurrect' : 'keep';

      for (const offset of await this.getOffsets()) {
        const runAt = this.resolveRunAt(event.startDate, offset.minutes);
        if (!runAt) {
          continue; // <2h до старта — билет и так на руках (каталог §5)
        }
        await this.dispatcher.schedule({
          catalogId: 'REM-01',
          dedupKey: `reminder:${registrationId}:${offset.key}:${version}`,
          runAt,
          kind: 'informational',
          priority: 'normal',
          preferenceKey: 'event_reminders',
          eventId: event.id,
          registrationId,
          timezone,
          context: { offsetKey: offset.key, eventVersion: version },
          onConflict,
        });
      }

      if (
        event.format === EventFormat.ONLINE ||
        event.format === EventFormat.HYBRID
      ) {
        const runAt = new Date(event.startDate.getTime() - ONLINE_OFFSET_MS);
        if (runAt.getTime() > Date.now()) {
          await this.dispatcher.schedule({
            catalogId: 'REM-03',
            dedupKey: `reminder:${registrationId}:online:${version}`,
            runAt,
            kind: 'informational',
            priority: 'high',
            preferenceKey: 'event_reminders',
            eventId: event.id,
            registrationId,
            timezone,
            context: { eventVersion: version },
            onConflict,
          });
        }
      }
    } catch (error) {
      this.swallow('scheduleForRegistration', registrationId, error);
    }
  }

  /**
   * Правило каталога §5: T−offset в прошлом, но до старта ≥2h → немедленно;
   * <2h → не планируем вовсе (null).
   */
  private resolveRunAt(startDate: Date, offsetMinutes: number): Date | null {
    const runAt = new Date(startDate.getTime() - offsetMinutes * 60_000);
    const now = Date.now();
    if (runAt.getTime() > now) {
      return runAt;
    }
    return startDate.getTime() - now >= LATE_RULE_MS ? new Date(now) : null;
  }

  private async materializeAttendeeReminder(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    const guard = this.guardCommon(row, refs);
    if (guard) {
      return guard;
    }
    if (refs.registration?.status !== RegistrationStatus.APPROVED) {
      return { action: 'skip', reason: 'registration_not_approved' };
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    const registration = await this.data.getRegistration(
      row.registrationId as string,
    );
    if (!event || !registration) {
      return { action: 'skip', reason: 'refs_gone' };
    }
    const recipient = await this.audience.resolveRegistrationParticipant(
      registration.id,
    );
    if (!recipient) {
      return { action: 'skip', reason: 'recipient_gone' };
    }
    const timezone = resolveEventTimezone(event.timezone);
    const publicUrl =
      this.configService.get<string>('frontend.publicUrl') ?? '';
    return {
      action: 'dispatch',
      intent: {
        catalogId: 'REM-01',
        dedupKey: row.dedupKey,
        eventId: event.id,
        registrationId: registration.id,
        recipients: [recipient],
        push: {
          params: {
            eventTitle: event.title,
            startTime: formatTimeInZone(event.startDate, timezone),
          },
          routeParams: { id: registration.id },
          payload: {},
        },
        // Email-fallback без активного токена (OQ-17): шаблон event-reminder.
        email: {
          subject: `Напоминание: «${event.title}»`,
          template: 'event-reminder',
          context: {
            eventTitle: event.title,
            startsAt: event.startDate.toISOString(),
            timezone,
            venue: event.venue ?? '',
            address: event.address ?? '',
            isOnline: event.format !== EventFormat.OFFLINE,
            ticketNumber: registration.ticketNumber ?? '',
            // /profile/tickets/[eventId] — маршрут ищет билет по СОБЫТИЮ,
            // не по регистрации (см. TicketViewService.getMyTicketViewModel).
            ticketUrl: publicUrl
              ? `${publicUrl}/profile/tickets/${event.id}`
              : '',
          },
        },
      },
    };
  }

  private async materializeOrganizerReminder(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    const guard = this.guardCommon(row, refs);
    if (guard) {
      return guard;
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    if (!event) {
      return { action: 'skip', reason: 'refs_gone' };
    }
    const organizers = await this.audience.resolveOrganizerAudience(
      event.id,
      PERMISSIONS.EVENTS_UPDATE,
    );
    if (organizers.length === 0) {
      return { action: 'skip', reason: 'no_recipients' };
    }
    const timezone = resolveEventTimezone(event.timezone);
    return {
      action: 'dispatch',
      intent: {
        catalogId: 'REM-02',
        dedupKey: row.dedupKey,
        eventId: event.id,
        organizationId: event.organizationId,
        recipients: organizers,
        push: {
          params: {
            eventTitle: event.title,
            startTime: formatTimeInZone(event.startDate, timezone),
          },
          routeParams: { id: event.id },
          payload: {},
        },
      },
    };
  }

  private async materializeOnlineStart(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    const guard = this.guardCommon(row, refs);
    if (guard) {
      return guard;
    }
    if (refs.registration?.status !== RegistrationStatus.APPROVED) {
      return { action: 'skip', reason: 'registration_not_approved' };
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    if (!event) {
      return { action: 'skip', reason: 'refs_gone' };
    }
    if (
      event.format !== EventFormat.ONLINE &&
      event.format !== EventFormat.HYBRID
    ) {
      return { action: 'skip', reason: 'not_online' };
    }
    const recipient = await this.audience.resolveRegistrationParticipant(
      row.registrationId as string,
    );
    if (!recipient) {
      return { action: 'skip', reason: 'recipient_gone' };
    }
    return {
      action: 'dispatch',
      intent: {
        catalogId: 'REM-03',
        dedupKey: row.dedupKey,
        eventId: event.id,
        registrationId: row.registrationId ?? undefined,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: event.id },
          payload: { onlineUrl: event.onlineUrl ?? '' },
        },
      },
    };
  }

  /**
   * Общие guard'ы REM (STATE_MACHINES §3): событие PUBLISHED, дата не
   * перенесена (eventVersion строки совпадает с текущим startDate), старт
   * ещё впереди.
   */
  private guardCommon(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): MaterializeResult | null {
    if (!refs.event) {
      return { action: 'skip', reason: 'event_gone' };
    }
    if (refs.event.status !== EventStatus.PUBLISHED) {
      return { action: 'skip', reason: 'event_not_published' };
    }
    const version = row.context?.eventVersion;
    if (
      typeof version === 'number' &&
      version !== eventVersion(refs.event.startDate)
    ) {
      // Перенос даты: строка старого eventVersion (reconcile её погасит).
      return { action: 'skip', reason: 'stale_event_version' };
    }
    if (refs.event.startDate.getTime() <= Date.now()) {
      return { action: 'skip', reason: 'event_started' };
    }
    return null;
  }

  private async getOffsets(): Promise<ReminderOffset[]> {
    try {
      const raw = await this.data.getPlatformSetting(OFFSETS_SETTING_KEY);
      if (!raw) {
        return DEFAULT_OFFSETS;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return DEFAULT_OFFSETS;
      }
      const offsets = parsed.filter(
        (o): o is ReminderOffset =>
          typeof o === 'object' &&
          o !== null &&
          typeof (o as ReminderOffset).key === 'string' &&
          typeof (o as ReminderOffset).minutes === 'number' &&
          (o as ReminderOffset).minutes > 0,
      );
      return offsets.length > 0 ? offsets : DEFAULT_OFFSETS;
    } catch {
      return DEFAULT_OFFSETS;
    }
  }

  private swallow(method: string, id: string, error: unknown): void {
    this.logger.error(
      `Цепочка напоминаний: ${method}(${id}) не выполнена`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
