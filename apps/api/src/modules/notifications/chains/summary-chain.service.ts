import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import {
  eventVersion,
  formatAmountMajor,
  resolveEventTimezone,
} from './chain-shared';

/** SUM-01 участнику — T_end+2h; SUM-02 организатору — T_end+24h. */
const SUM01_DELAY_MS = 2 * 60 * 60 * 1000;
const SUM02_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Цепочка 5 — финальная сводка (SUM-01/02, NOTIFICATIONS_CATALOG §7).
 *
 * Плановые строки создаются при publish (от endDate); переход в COMPLETED —
 * guard-подтверждение, не триггер (STATE_MACHINES §5). Единственность при
 * рестарте — composite unique ядра; подавления: CANCELLED, no-Attendance
 * (OQ-11), нулевая посещаемость (email SUM-02).
 */
@Injectable()
export class SummaryChainService implements OnModuleInit {
  private readonly logger = new Logger(SummaryChainService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly audience: NotificationAudienceRepository,
    private readonly data: NotificationChainDataRepository,
    private readonly replan: NotificationReplanService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.dispatcher.registerMaterializer(
      'SUM-01',
      this.materializeAttendeeSummary.bind(this),
    );
    this.dispatcher.registerMaterializer(
      'SUM-02',
      this.materializeOrganizerSummary.bind(this),
    );
    // BL-03: перенос endDate → пересоздание SUM-строк (новый eventVersion).
    this.replan.registerReplanHandler('SUM', async (event) => {
      if (
        event.status !== EventStatus.PUBLISHED &&
        event.status !== EventStatus.COMPLETED
      ) {
        return;
      }
      const snapshot = await this.data.getEventSnapshot(event.id);
      if (snapshot) {
        await this.scheduleForEvent(snapshot, { resurrect: true });
      }
    });
  }

  /**
   * Плановые SUM-строки. SUM-01 — ОДНА строка на событие (fan-out на
   * пришедших в момент исполнения; delivery-ключи per-registration по
   * каталогу — см. materializeAttendeeSummary/dispatchMany).
   */
  async scheduleForEvent(
    event: ChainEventSnapshot,
    options: { resurrect?: boolean } = {},
  ): Promise<void> {
    try {
      const version = eventVersion(event.endDate);
      const timezone = resolveEventTimezone(event.timezone);
      const onConflict = options.resurrect ? 'resurrect' : 'keep';
      await this.dispatcher.schedule({
        catalogId: 'SUM-01',
        dedupKey: `sum:attendee:${event.id}:${version}`,
        runAt: new Date(event.endDate.getTime() + SUM01_DELAY_MS),
        kind: 'informational',
        priority: 'normal',
        preferenceKey: 'summary',
        eventId: event.id,
        timezone,
        context: { eventVersion: version },
        onConflict,
      });
      await this.dispatcher.schedule({
        catalogId: 'SUM-02',
        dedupKey: `sum:org:${event.id}:${version}`,
        runAt: new Date(event.endDate.getTime() + SUM02_DELAY_MS),
        kind: 'informational',
        priority: 'normal',
        preferenceKey: 'summary',
        eventId: event.id,
        organizationId: event.organizationId,
        timezone,
        context: { eventVersion: version },
        onConflict,
      });
    } catch (error) {
      this.swallow('scheduleForEvent', event.id, error);
    }
  }

  /**
   * SUM-01: спасибо + сертификат (если выдан) + анонс следующего события.
   * Аудитория — APPROVED с ≥1 Attendance (не пришедшим не шлём, OQ-11).
   * Per-recipient интенты: dedupKey per-registration (каталог) — иначе
   * получатели без Account столкнулись бы в партиальном unique (dedup, channel).
   */
  private async materializeAttendeeSummary(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    const guard = this.guardCommon(row, refs);
    if (guard) {
      return guard;
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    if (!event) {
      return { action: 'skip', reason: 'event_gone' };
    }
    const recipients = await this.audience.resolveAttendedAudience(event.id);
    if (recipients.length === 0) {
      return { action: 'skip', reason: 'no_attendance' };
    }
    const version =
      typeof row.context?.eventVersion === 'number'
        ? row.context.eventVersion
        : eventVersion(event.endDate);
    const nextEvent = await this.data.getNextPublishedEvent(
      event.organizationId,
      event.id,
    );
    const publicUrl =
      this.configService.get<string>('frontend.publicUrl') ?? '';
    const eventUrl = publicUrl
      ? `${publicUrl}/events/${encodeURIComponent(event.slug)}`
      : '';
    const nextEventUrl =
      nextEvent && publicUrl
        ? `${publicUrl}/events/${encodeURIComponent(nextEvent.slug)}`
        : '';

    const intents: NotificationIntent[] = [];
    for (const recipient of recipients) {
      if (!recipient.registrationId) {
        continue;
      }
      const certificate = await this.data.getCertificateForRegistration(
        recipient.registrationId,
      );
      intents.push({
        catalogId: 'SUM-01',
        dedupKey: `sum:attendee:${recipient.registrationId}:${version}`,
        eventId: event.id,
        registrationId: recipient.registrationId,
        recipients: [recipient],
        push: {
          params: { eventTitle: event.title },
          // Вариантный deep link (каталог §7): сертификат есть → на него.
          route: certificate ? '/certificate/[id]' : '/event/[id]',
          routeParams: certificate
            ? { id: certificate.id }
            : { id: event.id },
          payload: {},
        },
        email: {
          subject: `Спасибо за участие: «${event.title}»`,
          template: 'event-summary-attendee',
          context: {
            eventTitle: event.title,
            organizationName: event.organizationName,
            certificateUrl: certificate?.certificateUrl ?? '',
            materialsUrl: '',
            nextEventTitle: nextEvent?.title ?? '',
            nextEventUrl,
            eventUrl,
          },
        },
      });
    }
    if (intents.length === 0) {
      return { action: 'skip', reason: 'no_recipients' };
    }
    return { action: 'dispatchMany', intents };
  }

  /**
   * SUM-02: посещаемость/конверсия/выручка. Нулевая посещаемость → email не
   * шлём, push остаётся с нейтральной формулировкой (каталог §7).
   */
  private async materializeOrganizerSummary(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    const guard = this.guardCommon(row, refs);
    if (guard) {
      return guard;
    }
    const event = await this.data.getEventSnapshot(row.eventId as string);
    if (!event) {
      return { action: 'skip', reason: 'event_gone' };
    }
    const recipients = await this.audience.resolveOrganizerAudience(
      event.id,
      PERMISSIONS.EVENTS_UPDATE,
    );
    if (recipients.length === 0) {
      return { action: 'skip', reason: 'no_recipients' };
    }
    const [checkedIn, approved, paid] = await Promise.all([
      this.data.countAttendedRegistrations(event.id),
      this.data.countRegistrations(event.id, [RegistrationStatus.APPROVED]),
      this.data.getPaidTicketStats(event.id),
    ]);
    const attendancePercent =
      approved > 0 ? Math.round((checkedIn / approved) * 100) : 0;
    const conversionPercent =
      event.viewsCount > 0
        ? Math.round((approved / event.viewsCount) * 100)
        : 0;
    const appUrl = this.configService.get<string>('frontend.appUrl') ?? '';

    const intent: NotificationIntent = {
      catalogId: 'SUM-02',
      dedupKey: row.dedupKey,
      eventId: event.id,
      organizationId: event.organizationId,
      recipients,
      // Нулевая посещаемость: письмо-сводку не шлём (подавление каталога §7).
      channels: checkedIn === 0 ? ['push', 'in_app'] : undefined,
      push: {
        params: { eventTitle: event.title },
        routeParams: { eventId: event.id },
        payload: {},
      },
      email: {
        subject: `Итоги «${event.title}»`,
        template: 'event-summary-organizer',
        context: {
          eventTitle: event.title,
          checkedInCount: checkedIn,
          approvedCount: approved,
          attendancePercent,
          viewsCount: event.viewsCount,
          conversionPercent,
          revenueFormatted:
            paid.revenueMinor > 0n
              ? formatAmountMajor(paid.revenueMinor)
              : '',
          commissionFormatted:
            paid.commissionMinor > 0n
              ? formatAmountMajor(paid.commissionMinor)
              : '',
          analyticsUrl: appUrl
            ? `${appUrl}/events/${event.id}/analytics`
            : '',
          createEventUrl: appUrl ? `${appUrl}/events/new` : '',
        },
      },
      orgInApp: {
        organizationId: event.organizationId,
        type: 'EVENT_SUMMARY',
        entityType: 'event',
        entityId: event.id,
        payload: {
          eventTitle: event.title,
          checkedInCount: checkedIn,
          approvedCount: approved,
          attendancePercent,
          conversionPercent,
          revenueMinor: paid.revenueMinor.toString(10),
        },
      },
    };
    return { action: 'dispatch', intent };
  }

  /**
   * Общие guard'ы SUM: событие не CANCELLED (COMPLETED — норма), endDate не
   * перенесён (eventVersion), конец уже наступил.
   */
  private guardCommon(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): MaterializeResult | null {
    if (!refs.event) {
      return { action: 'skip', reason: 'event_gone' };
    }
    if (refs.event.status === EventStatus.CANCELLED) {
      return { action: 'skip', reason: 'event_cancelled' };
    }
    if (
      refs.event.status !== EventStatus.PUBLISHED &&
      refs.event.status !== EventStatus.COMPLETED
    ) {
      return { action: 'skip', reason: 'event_not_finished_state' };
    }
    const version = row.context?.eventVersion;
    if (
      typeof version === 'number' &&
      version !== eventVersion(refs.event.endDate)
    ) {
      return { action: 'skip', reason: 'stale_event_version' };
    }
    if (refs.event.endDate.getTime() > Date.now()) {
      return { action: 'skip', reason: 'event_not_ended' };
    }
    return null;
  }

  private swallow(method: string, id: string, error: unknown): void {
    this.logger.error(
      `Цепочка финальной сводки: ${method}(${id}) не выполнена`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
