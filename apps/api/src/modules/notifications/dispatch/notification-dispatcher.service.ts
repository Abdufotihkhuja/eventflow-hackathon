import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ChannelSender, DeliveryRowForSend } from '../channels/channel-sender';
import { EmailChannelSender } from '../channels/email-channel.sender';
import { InAppChannelSender } from '../channels/in-app-channel.sender';
import { PushChannelSender } from '../channels/push-channel.sender';
import { getCatalogEntry } from '../catalog';
import {
  NotificationPreferencesService,
  PreferenceChannels,
} from '../preferences/notification-preferences.service';
import {
  NotificationDispatchRepository,
  CreateDeliveryData,
} from './notification-dispatch.repository';
import { NotificationRateLimiterService } from './notification-rate-limiter.service';
import {
  CancelByInput,
  CreatedDelivery,
  DELIVERY_STATUS,
  DeliveryPayloadSnapshot,
  DispatchResult,
  NOTIFICATION_CHANNELS,
  NotificationChannel,
  NotificationIntent,
  NotificationKind,
  NotificationPriority,
  NotificationRecipient,
  ScheduleInput,
  ScheduledMaterializer,
  catalogPrefix,
} from './notification.types';
import { PLATFORM_TIMEZONE, shiftOutOfQuietHours } from './quiet-hours';

/** Отсутствие строки матрицы = дефолт: всё включено (DATA_MODEL_DELTA §2). */
const DEFAULT_PREFERENCE_CHANNELS: PreferenceChannels = {
  push: true,
  email: true,
};

/** Политика интента после мёржа с каталогом (BL-16): явное поле побеждает. */
interface ResolvedIntentPolicy {
  kind: NotificationKind;
  priority: NotificationPriority;
  preferenceKey?: string;
  channels: NotificationChannel[];
  emailFallback: boolean;
}

/**
 * NotificationDispatcherService — единая точка всех уведомлений (BL-10,
 * кросс-цепочный инвариант №2). Всё канальное (push/email/in-app) и всё
 * плановое идёт сквозь него; прямые вызовы каналов из фич запрещены
 * ESLint-правилом + ratchet `scripts/check-notification-dispatch.mjs`.
 *
 * Транзакционная семантика (BL-06/OQ-27):
 * - `dispatchNow(intent, tx)` создаёт NotificationDelivery-строки В ПЕРЕДАННОЙ
 *   транзакции домена и возвращает enqueue-замыкание;
 * - канальные job'ы ставит ТОЛЬКО это замыкание — вызывающий обязан вызвать
 *   его ПОСЛЕ commit (иначе job может исполниться до commit / пережить
 *   rollback);
 * - для не-транзакционных путей есть `dispatch(intent)` — оба шага сразу.
 * Строки, у которых замыкание так и не было вызвано (краш между commit и
 * enqueue), подбирает reaper по статусу enqueued (D-01).
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);
  private readonly senders = new Map<NotificationChannel, ChannelSender>();
  /** Материализаторы плановых строк: catalogId ('REM-01') или префикс ('REM'). */
  private readonly materializers = new Map<string, ScheduledMaterializer>();

  constructor(
    private readonly repository: NotificationDispatchRepository,
    private readonly rateLimiter: NotificationRateLimiterService,
    private readonly preferences: NotificationPreferencesService,
    inAppSender: InAppChannelSender,
    emailSender: EmailChannelSender,
    pushSender: PushChannelSender,
  ) {
    this.registerChannelSender(inAppSender);
    this.registerChannelSender(emailSender);
    this.registerChannelSender(pushSender);
  }

  registerChannelSender(sender: ChannelSender): void {
    this.senders.set(sender.channel, sender);
  }

  getChannelSender(channel: string): ChannelSender | undefined {
    return this.senders.get(channel as NotificationChannel);
  }

  /** Регистрация цепочками (Батч 6) guard+builder'а плановых строк. */
  registerMaterializer(
    catalogIdOrPrefix: string,
    materializer: ScheduledMaterializer,
  ): void {
    this.materializers.set(catalogIdOrPrefix, materializer);
  }

  resolveMaterializer(catalogId: string): ScheduledMaterializer | undefined {
    return (
      this.materializers.get(catalogId) ??
      this.materializers.get(catalogPrefix(catalogId))
    );
  }

  /**
   * Немедленная отправка. Создаёт delivery-строки per (получатель×канал)
   * идемпотентно (P2002 → noop) и возвращает enqueue-замыкание.
   * `tx` — транзакция домен-события; enqueue() вызывать ПОСЛЕ её commit.
   */
  async dispatchNow(
    intent: NotificationIntent,
    tx?: Prisma.TransactionClient,
  ): Promise<DispatchResult> {
    const plans = await this.buildDeliveryPlan(intent);
    const created: CreatedDelivery[] = [];
    const toEnqueue: DeliveryRowForSend[] = [];
    let deduplicated = 0;
    let suppressed = 0;

    for (const plan of plans) {
      const row = await this.repository.createDelivery(plan, tx);
      if (!row) {
        deduplicated += 1;
        continue;
      }
      const createdDelivery: CreatedDelivery = {
        id: row.id,
        dedupKey: row.dedupKey,
        catalogId: row.catalogId,
        channel: row.channel as NotificationChannel,
        accountId: row.accountId,
        organizationId: row.organizationId,
        status: row.status as CreatedDelivery['status'],
        payload: (row.payload ?? {}) as DeliveryPayloadSnapshot,
      };
      created.push(createdDelivery);
      if (row.status === DELIVERY_STATUS.ENQUEUED) {
        toEnqueue.push({
          id: row.id,
          dedupKey: row.dedupKey,
          catalogId: row.catalogId,
          channel: row.channel,
          accountId: row.accountId,
          organizationId: row.organizationId,
          payload: row.payload,
          error: row.error,
        });
      } else {
        suppressed += 1;
      }
    }

    const enqueue = async (): Promise<void> => {
      for (const row of toEnqueue) {
        const sender = this.getChannelSender(row.channel);
        if (!sender) {
          // Канал без исполнителя (push до Батча 3): строка остаётся
          // enqueued, дальше её судьбу решает reaper.
          this.logger.warn(
            `Нет канального sender'а для '${row.channel}' ` +
              `(delivery ${row.id}, ${row.catalogId})`,
          );
          continue;
        }
        try {
          await sender.dispatchDelivery(row);
        } catch (error) {
          // Постановка не должна ронять доменный вызов: строка уже в журнале,
          // застрявший enqueued подберёт reaper (BL-06).
          this.logger.error(
            `Постановка доставки ${row.id} (${row.catalogId}/${row.channel}) не удалась`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    };

    return { created, deduplicated, suppressed, enqueue };
  }

  /** Хелпер для не-транзакционных путей: dispatchNow + enqueue сразу. */
  async dispatch(intent: NotificationIntent): Promise<DispatchResult> {
    const result = await this.dispatchNow(intent);
    await result.enqueue();
    return result;
  }

  /**
   * Плановое уведомление → строка ScheduledNotification (источник истины — БД).
   * Идемпотентно по unique(dedupKey); конфликт: 'keep' (дефолт) — noop,
   * 'updateRunAt' — подвинуть runAt ещё-не-исполненной строки.
   * Quiet hours (OQ-12): informational-runAt из окна 22:00–08:00 сдвигается
   * на 08:00 (transactional не сдвигаются).
   */
  async schedule(
    input: ScheduleInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ created: boolean; runAt: Date }> {
    const timezone = input.timezone ?? PLATFORM_TIMEZONE;
    const runAt =
      input.kind === 'informational'
        ? shiftOutOfQuietHours(input.runAt, timezone)
        : input.runAt;

    const context: Record<string, unknown> = {
      ...(input.context ?? {}),
      kind: input.kind,
      priority: input.priority,
      timezone,
      ...(input.preferenceKey ? { preferenceKey: input.preferenceKey } : {}),
    };

    const { created } = await this.repository.upsertScheduled(
      {
        catalogId: input.catalogId,
        dedupKey: input.dedupKey,
        runAt,
        eventId: input.eventId ?? null,
        registrationId: input.registrationId ?? null,
        orderId: input.orderId ?? null,
        accountId: input.accountId ?? null,
        organizationId: input.organizationId ?? null,
        context: context as Prisma.InputJsonValue,
      },
      input.onConflict ?? 'keep',
      tx,
    );
    return { created, runAt };
  }

  /**
   * Каскадная инвалидация (инвариант №3): снятие pending
   * ScheduledNotification + пометка cancelled ещё-не-отправленных Delivery.
   * Гранулярность — `types` (префиксы catalogId); `tx` — транзакция домена.
   */
  async cancelBy(
    input: CancelByInput,
  ): Promise<{ scheduled: number; deliveries: number }> {
    const scheduled = await this.repository.cancelScheduledBy(input);
    const deliveries = await this.repository.cancelDeliveriesBy(input);
    if (scheduled > 0 || deliveries > 0) {
      this.logger.log(
        JSON.stringify({
          type: 'notification.cancelled_by',
          reason: input.reason,
          types: input.types ?? null,
          scheduled,
          deliveries,
        }),
      );
    }
    return { scheduled, deliveries };
  }

  /**
   * Hard-delete аккаунта (BL-07/OQ-22): анонимизация payload в журнале.
   * Строки НЕ удаляются (журнал), персоналии стираются. Вызывается в той же
   * транзакции, что и hardDeleteUser.
   */
  async anonymizeAccountJournal(
    accountId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return this.repository.anonymizeDeliveriesForAccount(accountId, tx);
  }

  /**
   * План строк доставки: per (получатель×канал), с ветками OQ-25
   * (нет Account → email-only), D-03б (push→email fallback per-account при
   * нуле активных устройств) и rate-limit'ом informational-пушей (BL-22).
   */
  private async buildDeliveryPlan(
    intent: NotificationIntent,
  ): Promise<CreateDeliveryData[]> {
    if (!intent.dedupKey || !intent.catalogId) {
      throw new Error('NotificationIntent: dedupKey и catalogId обязательны');
    }
    const policy = this.resolvePolicy(intent);
    const preferenceByAccount = await this.loadPreferenceOverrides(
      intent,
      policy,
    );
    const plans: CreateDeliveryData[] = [];

    for (const recipient of intent.recipients) {
      const channels = this.channelsForRecipient(intent, policy, recipient);
      const preference = recipient.accountId
        ? (preferenceByAccount?.get(recipient.accountId) ??
          DEFAULT_PREFERENCE_CHANNELS)
        : DEFAULT_PREFERENCE_CHANNELS;
      for (const channel of channels) {
        const plan = await this.planForChannel(
          intent,
          policy,
          recipient,
          channel,
          preference,
        );
        if (plan) {
          plans.push(plan);
        }
      }
    }

    // Организационная in-app строка (accountId=null, адрес — организация);
    // уникальность держит partial unique (dedup_key, organization_id, channel).
    if (intent.orgInApp) {
      plans.push({
        dedupKey: intent.dedupKey,
        catalogId: intent.catalogId,
        channel: NOTIFICATION_CHANNELS.IN_APP,
        accountId: null,
        organizationId: intent.orgInApp.organizationId,
        eventId: intent.eventId ?? null,
        registrationId: intent.registrationId ?? null,
        orderId: intent.orderId ?? null,
        status: DELIVERY_STATUS.ENQUEUED,
        payload: {
          orgInApp: intent.orgInApp,
        } as unknown as Prisma.InputJsonValue,
      });
    }

    return plans;
  }

  /**
   * Enforcement преференсов (BL-23): для informational-интентов с preferenceKey
   * читаем матрицу ОДНИМ запросом на всех получателей. Transactional и строки
   * без ключа матрицей не управляются (их нельзя отключить) — null, т.е.
   * везде дефолт «включено».
   */
  private async loadPreferenceOverrides(
    intent: NotificationIntent,
    policy: ResolvedIntentPolicy,
  ): Promise<Map<string, PreferenceChannels> | null> {
    if (policy.kind !== 'informational' || !policy.preferenceKey) {
      return null;
    }
    const accountIds = [
      ...new Set(
        intent.recipients
          .map((recipient) => recipient.accountId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const byAccount = await this.preferences.resolveForAccounts(
      accountIds,
      policy.preferenceKey,
    );
    const flattened = new Map<string, PreferenceChannels>();
    for (const [accountId, byKey] of byAccount) {
      const channels = byKey.get(policy.preferenceKey);
      if (channels) {
        flattened.set(accountId, channels);
      }
    }
    return flattened;
  }

  /**
   * Политика интента: недостающие поля читаются из машинного каталога по
   * catalogId (BL-16, единый источник фактов); явные значения интента
   * побеждают.
   */
  private resolvePolicy(intent: NotificationIntent): ResolvedIntentPolicy {
    const entry = getCatalogEntry(intent.catalogId);
    return {
      kind: intent.kind ?? entry?.kind ?? 'transactional',
      priority: intent.priority ?? entry?.priority ?? 'normal',
      preferenceKey: intent.preferenceKey ?? entry?.preferenceKey,
      channels: intent.channels ?? entry?.channels ?? [],
      emailFallback: intent.emailFallback ?? entry?.emailFallback ?? false,
    };
  }

  private channelsForRecipient(
    intent: NotificationIntent,
    policy: ResolvedIntentPolicy,
    recipient: NotificationRecipient,
  ): NotificationChannel[] {
    // OQ-25: Account отсутствует — email-only по User.email; AccountNotification
    // не пишем, push слать некуда.
    if (recipient.accountId === null) {
      const wantsEmail =
        policy.channels.includes(NOTIFICATION_CHANNELS.EMAIL) ||
        (policy.emailFallback &&
          policy.channels.includes(NOTIFICATION_CHANNELS.PUSH));
      return wantsEmail && intent.email && recipient.email
        ? [NOTIFICATION_CHANNELS.EMAIL]
        : [];
    }

    const channels = [...policy.channels];
    if (
      channels.includes(NOTIFICATION_CHANNELS.PUSH) &&
      recipient.devices.length === 0
    ) {
      // D-03б: fallback per-account — email только когда у аккаунта НЕТ ни
      // одного активного DeviceToken.
      const withoutPush = channels.filter(
        (c) => c !== NOTIFICATION_CHANNELS.PUSH,
      );
      if (
        policy.emailFallback &&
        intent.email &&
        recipient.email &&
        !withoutPush.includes(NOTIFICATION_CHANNELS.EMAIL)
      ) {
        withoutPush.push(NOTIFICATION_CHANNELS.EMAIL);
      }
      return withoutPush;
    }
    return channels;
  }

  private async planForChannel(
    intent: NotificationIntent,
    policy: ResolvedIntentPolicy,
    recipient: NotificationRecipient,
    channel: NotificationChannel,
    // Эффективная строка матрицы получателя (BL-23). Для transactional и
    // интентов без preferenceKey всегда дефолт «включено» — loadPreferenceOverrides
    // возвращает null, и подавления не происходит по построению.
    preference: PreferenceChannels,
  ): Promise<CreateDeliveryData | null> {
    const base = {
      dedupKey: intent.dedupKey,
      catalogId: intent.catalogId,
      accountId: recipient.accountId,
      organizationId: intent.organizationId ?? null,
      eventId: intent.eventId ?? null,
      registrationId: recipient.registrationId ?? intent.registrationId ?? null,
      orderId: intent.orderId ?? null,
    };

    switch (channel) {
      case NOTIFICATION_CHANNELS.EMAIL: {
        if (!intent.email || !recipient.email) {
          return null;
        }
        // BL-23: email-плечо informational-строки гасится матрицей ЗДЕСЬ, а
        // EmailUnsubscribe — вторым рубежом в MailDispatchService при send
        // (suppressed_unsubscribe): любой из двух opt-out'ов подавляет.
        const status = preference.email
          ? DELIVERY_STATUS.ENQUEUED
          : DELIVERY_STATUS.SUPPRESSED_PREFERENCE;
        return {
          ...base,
          channel,
          status,
          error: preference.email ? null : 'preference_disabled',
          payload: {
            to: recipient.email,
            locale: recipient.locale,
            mail: intent.email,
          } as unknown as Prisma.InputJsonValue,
        };
      }
      case NOTIFICATION_CHANNELS.IN_APP: {
        if (!intent.inApp || !recipient.accountId) {
          return null;
        }
        return {
          ...base,
          channel,
          status: DELIVERY_STATUS.ENQUEUED,
          payload: {
            locale: recipient.locale,
            inApp: intent.inApp,
          } as unknown as Prisma.InputJsonValue,
        };
      }
      case NOTIFICATION_CHANNELS.PUSH: {
        if (!recipient.accountId || recipient.devices.length === 0) {
          return null;
        }
        let status: string = DELIVERY_STATUS.ENQUEUED;
        let error: string | null = null;
        if (!preference.push) {
          // BL-23: opt-out матрицы терминален и проверяется ДО лимитера —
          // подавленный пуш не потребляет спам-бюджет получателя.
          status = DELIVERY_STATUS.SUPPRESSED_PREFERENCE;
          error = 'preference_disabled';
        } else if (
          policy.kind === 'informational' &&
          policy.priority === 'normal'
        ) {
          // BL-22: только informational normal лимитируется; transactional и
          // critical/high идут мимо (инвариант №4).
          const allowed = await this.rateLimiter.tryConsumeInformationalPush(
            recipient.accountId,
            policy.preferenceKey,
          );
          if (!allowed) {
            status = DELIVERY_STATUS.SUPPRESSED_RATE_LIMIT;
            error = 'rate_limit_exceeded';
          }
        }
        // Снапшот email-fallback'а в payload push-строки: по нему сендер при
        // «ни одно устройство не получило» (D-03б) создаёт вторую строку
        // channel='email' с тем же dedupKey — без обращения к исходному интенту.
        // Матрица гасит и его: выключенный email-канал (или opt-out самого
        // пуша) не должен возрождаться fallback-письмом.
        const fallbackEmail =
          policy.emailFallback &&
          intent.email &&
          recipient.email &&
          preference.push &&
          preference.email
            ? { to: recipient.email, mail: intent.email }
            : undefined;
        return {
          ...base,
          channel,
          status,
          error,
          payload: {
            locale: recipient.locale,
            push: intent.push ?? { payload: {} },
            ...(fallbackEmail ? { fallbackEmail } : {}),
          } as unknown as Prisma.InputJsonValue,
        };
      }
      default:
        return null;
    }
  }
}
