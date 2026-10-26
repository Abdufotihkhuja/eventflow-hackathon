import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStatus } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { NotificationAudienceRepository } from '../dispatch/notification-audience.repository';
import { NotificationDispatcherService } from '../dispatch/notification-dispatcher.service';
import {
  MaterializeResult,
  NotificationIntent,
  NotificationRecipient,
  ScheduledRefs,
  ScheduledRowLike,
} from '../dispatch/notification.types';
import { NotificationChainDataRepository } from './chain-data.repository';
import { epochSeconds, moderationWindow } from './chain-shared';
import { ClosingChainService } from './closing-chain.service';
import { ReminderChainService } from './reminder-chain.service';
import { SummaryChainService } from './summary-chain.service';

export type ModerationRejectKind = 'rejected' | 'changes_requested';

/** SLA модерации по умолчанию (OQ-14); оверрайд — PlatformSetting. */
const DEFAULT_SLA_HOURS = 24;
const SLA_SETTING_KEY = 'notifications.moderation_sla_hours';
/** Адресат модераторских писем (OQ-31): оверрайд поверх mail.supportEmail. */
const MODERATION_EMAIL_SETTING_KEY = 'notifications.moderation_email';

/**
 * Цепочка 1 — модерация события (MOD-01..06, NOTIFICATIONS_CATALOG §3).
 *
 * Точки эмиссии: submitForReview (events.service) и approve/reject
 * (super-admin.service). Все публичные on*-методы НИКОГДА не бросают наружу —
 * уведомление есть побочный эффект чужого действия (философия
 * NotificationsService.emit).
 */
@Injectable()
export class ModerationChainService implements OnModuleInit {
  private readonly logger = new Logger(ModerationChainService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly audience: NotificationAudienceRepository,
    private readonly data: NotificationChainDataRepository,
    private readonly configService: ConfigService,
    private readonly reminderChain: ReminderChainService,
    private readonly closingChain: ClosingChainService,
    private readonly summaryChain: SummaryChainService,
  ) {}

  onModuleInit(): void {
    this.dispatcher.registerMaterializer(
      'MOD-03',
      this.materializeSlaOverdue.bind(this),
    );
  }

  /**
   * DRAFT→PENDING_REVIEW: MOD-01 организатору (in-app орг + push),
   * MOD-02/MOD-06 модератору (email на операторский ящик, submitSeq по D-12),
   * план MOD-03 (SLA-таймер).
   *
   * `previousRejectionReason` — причина ДО подачи (submitForReview её
   * обнуляет): resubmit-письмо MOD-06 обязано её показать.
   */
  async onEventSubmitted(
    eventId: string,
    previousRejectionReason: string | null,
  ): Promise<void> {
    try {
      const event = await this.data.getEventSnapshot(eventId);
      if (!event) {
        return;
      }
      const submittedAt = new Date();
      const window = moderationWindow(submittedAt);

      // MOD-01 — организаторам с events:update (владелец всегда в аудитории).
      const organizers = await this.audience.resolveOrganizerAudience(
        eventId,
        PERMISSIONS.EVENTS_UPDATE,
      );
      await this.dispatcher.dispatch({
        catalogId: 'MOD-01',
        dedupKey: `mod:submitted:${eventId}:${window}`,
        eventId,
        organizationId: event.organizationId,
        recipients: organizers,
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: eventId },
          payload: {},
        },
        orgInApp: {
          organizationId: event.organizationId,
          type: 'EVENT_SUBMITTED',
          entityType: 'event',
          entityId: eventId,
          payload: { eventTitle: event.title },
        },
      });

      // MOD-02 (submitSeq=0) / MOD-06 (resubmit) — email операторам (OQ-31).
      const submitSeq = await this.data.countPriorSubmissions(eventId);
      const catalogId = submitSeq === 0 ? 'MOD-02' : 'MOD-06';
      const pendingCount = await this.data.countPendingReviewEvents();
      await this.dispatcher.dispatch({
        catalogId,
        dedupKey: `mod:queue:${eventId}:${submitSeq}:${window}`,
        eventId,
        recipients: [await this.moderatorRecipient()],
        email: {
          subject: `Модерация: «${event.title}»`,
          template:
            catalogId === 'MOD-02'
              ? 'moderation-queue-new'
              : 'moderation-queue-resubmit',
          context: {
            locale: 'ru',
            eventTitle: event.title,
            organizationName: event.organizationName,
            submittedAt: submittedAt.toISOString(),
            pendingCount,
            previousReason: previousRejectionReason ?? '',
            queueUrl: this.moderationQueueUrl(),
          },
        },
      });

      // MOD-03 — SLA-таймер на состоянии PENDING_REVIEW; повторная подача
      // создаёт новый ключ (submitEpoch), старый гасится в onDecision.
      const slaHours = await this.getSlaHours();
      await this.dispatcher.schedule({
        catalogId: 'MOD-03',
        dedupKey: `mod:sla:${eventId}:${epochSeconds(submittedAt)}`,
        runAt: new Date(submittedAt.getTime() + slaHours * 60 * 60 * 1000),
        kind: 'informational',
        priority: 'normal',
        eventId,
        context: {
          submitEpoch: epochSeconds(submittedAt),
          slaHours,
        },
      });
    } catch (error) {
      this.swallow('onEventSubmitted', eventId, error);
    }
  }

  /**
   * approve → PUBLISHED: MOD-05 (in-app + push; email остаётся существующим
   * sendEventApproved — EXIST-E-17), cancel SLA, планирование REM/CLS/SUM.
   */
  async onEventApproved(eventId: string): Promise<void> {
    try {
      const event = await this.data.getEventSnapshot(eventId);
      if (!event) {
        return;
      }
      await this.dispatcher.cancelBy({
        eventId,
        types: ['MOD-03'],
        reason: 'moderation_decided',
      });

      const organizers = await this.audience.resolveOrganizerAudience(
        eventId,
        PERMISSIONS.EVENTS_UPDATE,
      );
      await this.dispatcher.dispatch({
        catalogId: 'MOD-05',
        dedupKey: `mod:published:${eventId}:${epochSeconds(new Date())}`,
        // email-плечо уже уходит существующим sendEventApproved (на ящик
        // организации) — здесь только in-app + push, без дубля письма.
        channels: ['in_app', 'push'],
        eventId,
        organizationId: event.organizationId,
        recipients: organizers,
        push: {
          params: { eventTitle: event.title },
          routeParams: { id: eventId },
          payload: {},
        },
        orgInApp: {
          organizationId: event.organizationId,
          type: 'EVENT_PUBLISHED',
          entityType: 'event',
          entityId: eventId,
          payload: { eventTitle: event.title },
        },
      });

      // Публикация открывает жизненный цикл — плановые цепочки 3/4/5.
      await this.reminderChain.scheduleForEvent(event);
      await this.closingChain.scheduleForEvent(event);
      await this.summaryChain.scheduleForEvent(event);
    } catch (error) {
      this.swallow('onEventApproved', eventId, error);
    }
  }

  /**
   * reject → DRAFT: MOD-04. «Отклонено» и «запрошены правки» — один переход,
   * различие в kind (payload + вариантный push-ключ). Email-плечо остаётся
   * существующим sendEventRejected.
   */
  async onEventRejected(
    eventId: string,
    reason: string | null,
    kind: ModerationRejectKind,
  ): Promise<void> {
    try {
      const event = await this.data.getEventSnapshot(eventId);
      if (!event) {
        return;
      }
      await this.dispatcher.cancelBy({
        eventId,
        types: ['MOD-03'],
        reason: 'moderation_decided',
      });

      const organizers = await this.audience.resolveOrganizerAudience(
        eventId,
        PERMISSIONS.EVENTS_UPDATE,
      );
      await this.dispatcher.dispatch({
        catalogId: 'MOD-04',
        dedupKey: `mod:rejected:${eventId}:${epochSeconds(new Date())}`,
        channels: ['in_app', 'push'],
        eventId,
        organizationId: event.organizationId,
        recipients: organizers,
        push: {
          key:
            kind === 'changes_requested'
              ? 'push.mod.changesRequested'
              : 'push.mod.rejected',
          params: { eventTitle: event.title },
          routeParams: { id: eventId },
          payload: {},
        },
        orgInApp: {
          organizationId: event.organizationId,
          type:
            kind === 'changes_requested'
              ? 'EVENT_CHANGES_REQUESTED'
              : 'EVENT_REJECTED',
          entityType: 'event',
          entityId: eventId,
          // kind — аддитивное поле payload (каталог §2, EXIST-N-03).
          payload: { eventTitle: event.title, reason: reason ?? null, kind },
        },
      });
    } catch (error) {
      this.swallow('onEventRejected', eventId, error);
    }
  }

  /** MOD-03: guard «всё ещё ждёт модерации» при исполнении. */
  private async materializeSlaOverdue(
    row: ScheduledRowLike,
    refs: ScheduledRefs,
  ): Promise<MaterializeResult> {
    if (!refs.event || refs.event.status !== EventStatus.PENDING_REVIEW) {
      return { action: 'skip', reason: 'not_pending_review' };
    }
    const event = row.eventId
      ? await this.data.getEventSnapshot(row.eventId)
      : null;
    if (!event) {
      return { action: 'skip', reason: 'event_gone' };
    }
    const submitEpoch =
      typeof row.context?.submitEpoch === 'number'
        ? row.context.submitEpoch
        : null;
    const hoursPending = submitEpoch
      ? Math.floor((epochSeconds(new Date()) - submitEpoch) / 3600)
      : null;
    const intent: NotificationIntent = {
      catalogId: 'MOD-03',
      dedupKey: row.dedupKey,
      eventId: event.id,
      recipients: [await this.moderatorRecipient()],
      email: {
        subject: `SLA модерации: «${event.title}»`,
        template: 'moderation-sla-overdue',
        context: {
          locale: 'ru',
          eventTitle: event.title,
          organizationName: event.organizationName,
          submittedAt: submitEpoch
            ? new Date(submitEpoch * 1000).toISOString()
            : '',
          hoursPending: hoursPending ?? '',
          queueUrl: this.moderationQueueUrl(),
        },
      },
    };
    return { action: 'dispatch', intent };
  }

  /** Модератор = операторский ящик (OQ-31), не персональная рассылка. */
  private async moderatorRecipient(): Promise<NotificationRecipient> {
    const override = await this.data.getPlatformSetting(
      MODERATION_EMAIL_SETTING_KEY,
    );
    const email =
      override ??
      this.configService.get<string>('mail.supportEmail') ??
      'support@eventflow.uz';
    return { accountId: null, email, locale: 'ru', devices: [] };
  }

  private moderationQueueUrl(): string {
    const adminUrl =
      this.configService.get<string>('FRONTEND_ADMIN_URL') ??
      'https://admin.eventflow.uz';
    return `${adminUrl.replace(/\/+$/, '')}/events?status=PENDING_REVIEW`;
  }

  private async getSlaHours(): Promise<number> {
    const raw = await this.data.getPlatformSetting(SLA_SETTING_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SLA_HOURS;
  }

  private swallow(method: string, eventId: string, error: unknown): void {
    this.logger.error(
      `Цепочка модерации: ${method}(${eventId}) не выполнена`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
