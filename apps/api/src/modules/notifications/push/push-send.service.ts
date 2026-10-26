import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from '../../platform/queue/queue.service';
import type {
  PushReceiptsJobPayload,
  PushSendJobPayload,
} from '../../platform/queue/queue.types';
import {
  getCatalogEntry,
  resolvePushImportance,
  type NotificationCatalogEntry,
} from '../catalog';
import {
  REAPER_REQUEUED_MARKER,
  type DeliveryRowForSend,
} from '../channels/channel-sender';
import { EmailChannelSender } from '../channels/email-channel.sender';
import { NotificationDispatchRepository } from '../dispatch/notification-dispatch.repository';
import {
  DELIVERY_STATUS,
  DeliveryPayloadSnapshot,
  NOTIFICATION_CHANNELS,
  PushTicketSnapshot,
} from '../dispatch/notification.types';
import { renderPushMessage } from '../i18n/push-messages';
import { buildPushData, sanitizePushContent } from './push-content';
import { ExpoPushClient } from './expo-push.client';

/** Причина деактивации токена по receipt/ticket Expo (STATE_MACHINES §7). */
export const DISABLED_REASON_DEVICE_NOT_REGISTERED = 'device_not_registered';

const DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';

interface ActiveDevice {
  id: string;
  expoPushToken: string;
  locale: string;
}

export interface PushSendResult {
  status: 'sent' | 'failed' | 'disabled' | 'deduplicated' | 'skipped';
  tickets?: number;
}

export interface PushReceiptsResult {
  status: 'delivered' | 'failed' | 'pending' | 'skipped';
  deactivated?: number;
}

/**
 * Push-канал backend (BL-14/BL-02/BL-05/OQ-13): очередь `push.send` по образцу
 * `mail.send` (worker-прокси /internal/jobs/push/*).
 *
 * Семантика (STATE_MACHINES §6):
 * - enqueued → send через Expo SDK; providerRef (ticket id'ы) фиксируется ДО
 *   перевода в sent — краш между апдейтами оставляет enqueued+providerRef, и
 *   reaper НЕ переотправит (sent_unconfirmed), дубля не будет;
 * - чанкование ≤100 сообщений (BL-02): ошибка чанка не роняет батч, полный
 *   провал всех чанков → throw → ретраи BullMQ (backoff), затем reaper;
 * - receipts отложенным job'ом (~15 мин): DeviceNotRegistered → деактивация
 *   токена + email-fallback per-account (легенда §1/D-03б: только если НИ ОДНО
 *   устройство аккаунта не получило push);
 * - канал выключен (BL-12 не выполнен) → delivery сразу failed:
 *   push_channel_disabled, email-fallback срабатывает (warning на старте —
 *   ExpoPushClient).
 */
@Injectable()
export class PushSendService {
  private readonly logger = new Logger(PushSendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly expoClient: ExpoPushClient,
    private readonly repository: NotificationDispatchRepository,
    private readonly emailSender: EmailChannelSender,
  ) {}

  /** Постановка push-доставки (зовёт PushChannelSender после commit домена). */
  async enqueueDelivery(delivery: DeliveryRowForSend): Promise<void> {
    if (!this.expoClient.enabled) {
      // Мягкая деградация выключенного канала: без очереди, сразу failed +
      // email-fallback per-account.
      const row = await this.repository.getDelivery(delivery.id);
      if (row && row.status === DELIVERY_STATUS.ENQUEUED) {
        await this.failWithFallback(row, 'push_channel_disabled');
      }
      return;
    }

    // Reaper-повтор получает другой jobId: BullMQ иначе молча проглотит job с
    // тем же id (паттерн EmailChannelSender).
    const attemptSuffix =
      delivery.error === REAPER_REQUEUED_MARKER ? ':r1' : '';
    const payload: PushSendJobPayload = {
      jobId: `push:${delivery.id}${attemptSuffix}`,
      type: 'push.send',
      entityId: delivery.id,
      deliveryId: delivery.id,
      attempt: 0,
    };
    await this.queueService.enqueuePushSend(payload);
    this.logger.log(
      JSON.stringify({
        type: 'notification.push_enqueued',
        deliveryId: delivery.id,
        catalogId: delivery.catalogId,
      }),
    );
  }

  /** Исполнение батча push (worker → /internal/jobs/push/send). */
  async processSendJob(payload: PushSendJobPayload): Promise<PushSendResult> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: payload.deliveryId },
    });
    if (!delivery || delivery.status !== DELIVERY_STATUS.ENQUEUED) {
      // Отменена cancelBy / уже sent / терминальна — истина в БД (BL-06).
      return { status: 'deduplicated' };
    }

    if (
      delivery.organizationId &&
      !(await this.isOrganizationAvailable(delivery.organizationId))
    ) {
      await this.markDelivery(delivery.id, {
        status: DELIVERY_STATUS.SKIPPED,
        error: 'organization_unavailable',
      });
      return { status: 'skipped' };
    }

    if (!this.expoClient.enabled) {
      await this.failWithFallback(delivery, 'push_channel_disabled');
      return { status: 'disabled' };
    }

    if (!delivery.accountId) {
      await this.markDelivery(delivery.id, {
        status: DELIVERY_STATUS.FAILED,
        error: 'push_account_missing',
      });
      return { status: 'failed' };
    }

    const snapshot = (delivery.payload ?? {}) as DeliveryPayloadSnapshot;
    const devices: ActiveDevice[] = await this.prisma.deviceToken.findMany({
      where: { accountId: delivery.accountId, disabledAt: null },
      select: { id: true, expoPushToken: true, locale: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    if (devices.length === 0) {
      // Токены исчезли между планированием и отправкой (logout/D-09-гигиена):
      // per-account fallback как «нет ни одного активного устройства».
      await this.failWithFallback(delivery, 'no_active_devices');
      return { status: 'failed' };
    }

    const entry = getCatalogEntry(delivery.catalogId);
    const pushContent = snapshot.push ?? { payload: {} };
    const pushKey = pushContent.key ?? entry?.pushKey;
    if (!pushKey) {
      await this.failWithFallback(delivery, 'push_key_missing');
      return { status: 'failed' };
    }

    // Битые токены (не Expo-формат) — деактивируем сразу, как DeviceNotRegistered.
    const invalidDevices = devices.filter(
      (device) => !this.expoClient.isExpoPushToken(device.expoPushToken),
    );
    for (const device of invalidDevices) {
      await this.disableDevice(device.id);
    }
    const validDevices = devices.filter(
      (device) => !invalidDevices.includes(device),
    );
    if (validDevices.length === 0) {
      await this.failWithFallback(
        delivery,
        DISABLED_REASON_DEVICE_NOT_REGISTERED,
      );
      return { status: 'failed' };
    }

    const messages = await this.buildMessages(
      delivery.accountId,
      entry,
      pushKey,
      pushContent,
      snapshot,
      validDevices,
    );

    // BL-02: чанкование ≤100; ошибка чанка не роняет батч.
    const chunks = this.expoClient.chunkMessages(
      messages.map((m) => m.message),
    );
    const tickets: PushTicketSnapshot[] = [];
    let cursor = 0;
    let failedChunks = 0;
    for (const chunk of chunks) {
      const chunkDevices = messages.slice(cursor, cursor + chunk.length);
      cursor += chunk.length;
      try {
        const chunkTickets = await this.expoClient.sendChunk(chunk);
        chunkTickets.forEach((ticket, index) => {
          const device = chunkDevices[index];
          if (!device) {
            return;
          }
          if (ticket.status === 'ok') {
            tickets.push({ deviceId: device.deviceId, ticketId: ticket.id });
          } else {
            tickets.push({
              deviceId: device.deviceId,
              error: ticket.details?.error ?? ticket.message,
            });
          }
        });
      } catch (error) {
        failedChunks += 1;
        this.logger.error(
          `push.send: чанк ${failedChunks} доставки ${delivery.id} не отправлен`,
          error instanceof Error ? error.stack : String(error),
        );
        for (const device of chunkDevices) {
          tickets.push({
            deviceId: device.deviceId,
            error: 'chunk_send_failed',
          });
        }
      }
    }

    // Ticket-level DeviceNotRegistered (мгновенный, без receipts) — деактивация.
    for (const ticket of tickets) {
      if (ticket.error === DEVICE_NOT_REGISTERED) {
        await this.disableDevice(ticket.deviceId);
      }
    }

    const okTickets = tickets.filter((t) => t.ticketId);
    if (okTickets.length === 0) {
      if (failedChunks === chunks.length && chunks.length > 0) {
        // Полный транспортный провал (сеть/Expo 5xx): строка остаётся
        // enqueued — ретраи BullMQ с backoff, затем reaper (BL-06).
        throw new Error(
          `push.send: все ${chunks.length} чанков доставки ${delivery.id} не отправлены`,
        );
      }
      // Все ticket'ы — ошибки провайдера: ни одно устройство не получило push
      // → per-account fallback (легенда §1).
      await this.persistTickets(delivery.id, snapshot, tickets, null);
      const refreshed = await this.repository.getDelivery(delivery.id);
      if (refreshed) {
        await this.failWithFallback(
          refreshed,
          tickets.every((t) => t.error === DEVICE_NOT_REGISTERED)
            ? DISABLED_REASON_DEVICE_NOT_REGISTERED
            : 'push_send_failed',
        );
      }
      return { status: 'failed' };
    }

    // BL-06/OQ-24: providerRef (ticket id'ы) — ДО перевода в sent.
    const providerRef = okTickets.map((t) => t.ticketId).join(',');
    await this.persistTickets(delivery.id, snapshot, tickets, providerRef);
    await this.markDelivery(delivery.id, {
      status: DELIVERY_STATUS.SENT,
      sentAt: new Date(),
    });

    const receiptsPayload: PushReceiptsJobPayload = {
      jobId: `push-receipts:${delivery.id}`,
      type: 'push.receipts',
      entityId: delivery.id,
      deliveryId: delivery.id,
      attempt: 0,
    };
    await this.queueService.enqueuePushReceipts(receiptsPayload);

    this.logger.log(
      JSON.stringify({
        type: 'notification.push_sent',
        deliveryId: delivery.id,
        catalogId: delivery.catalogId,
        devices: messages.length,
        tickets: okTickets.length,
        chunks: chunks.length,
        failedChunks,
      }),
    );
    return { status: 'sent', tickets: okTickets.length };
  }

  /**
   * Опрос Expo receipts (~15 мин после send): подтверждение delivered,
   * DeviceNotRegistered → деактивация токена; push не доставлен НИ НА ОДНО
   * устройство → email-fallback per-account (D-03б).
   */
  async processReceiptsJob(
    payload: PushReceiptsJobPayload,
  ): Promise<PushReceiptsResult> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: payload.deliveryId },
    });
    if (
      !delivery ||
      (delivery.status !== DELIVERY_STATUS.SENT &&
        delivery.status !== DELIVERY_STATUS.SENT_UNCONFIRMED)
    ) {
      return { status: 'skipped' };
    }

    // Do not let a receipt failure create an email fallback after archive.
    if (
      delivery.organizationId &&
      !(await this.isOrganizationAvailable(delivery.organizationId))
    ) {
      return { status: 'skipped' };
    }

    const snapshot = (delivery.payload ?? {}) as DeliveryPayloadSnapshot;
    const tickets = snapshot.pushTickets ?? [];
    const withReceipt = tickets.filter(
      (t): t is PushTicketSnapshot & { ticketId: string } =>
        Boolean(t.ticketId),
    );
    if (withReceipt.length === 0) {
      return { status: 'skipped' };
    }

    const receiptChunks = this.expoClient.chunkReceiptIds(
      withReceipt.map((t) => t.ticketId),
    );
    const receipts: Record<
      string,
      { status: string; details?: { error?: string } }
    > = {};
    for (const chunk of receiptChunks) {
      try {
        Object.assign(receipts, await this.expoClient.getReceipts(chunk));
      } catch (error) {
        this.logger.warn(
          `push.receipts: чанк receipts доставки ${delivery.id} недоступен: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    let okCount = 0;
    let errorCount = 0;
    let deactivated = 0;
    for (const ticket of withReceipt) {
      const receipt = receipts[ticket.ticketId];
      if (!receipt) {
        continue; // receipt ещё не готов — оставляем sent, второго опроса нет
      }
      if (receipt.status === 'ok') {
        okCount += 1;
        continue;
      }
      errorCount += 1;
      if (receipt.details?.error === DEVICE_NOT_REGISTERED) {
        await this.disableDevice(ticket.deviceId);
        deactivated += 1;
      }
    }

    if (okCount > 0) {
      await this.markDelivery(delivery.id, {
        status: DELIVERY_STATUS.DELIVERED,
      });
      return { status: 'delivered', deactivated };
    }

    if (errorCount === withReceipt.length && errorCount > 0) {
      // Ни одно устройство не получило push (все receipts — ошибки) →
      // fallback email per-account (легенда каталога §1).
      await this.failWithFallback(delivery, 'push_receipts_failed');
      return { status: 'failed', deactivated };
    }

    return { status: 'pending', deactivated };
  }

  private async isOrganizationAvailable(
    organizationId: string,
  ): Promise<boolean> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null, suspendedAt: null },
      select: { id: true },
    });
    return Boolean(organization);
  }

  private async buildMessages(
    accountId: string,
    entry: NotificationCatalogEntry | undefined,
    pushKey: string,
    pushContent: NonNullable<DeliveryPayloadSnapshot['push']>,
    snapshot: DeliveryPayloadSnapshot,
    devices: ActiveDevice[],
  ): Promise<Array<{ deviceId: string; message: ExpoPushMessage }>> {
    const importance = entry ? resolvePushImportance(entry) : 'updates';
    const priority = entry?.priority ?? 'normal';
    const route = pushContent.route ?? entry?.routes?.[0];
    const { data } = buildPushData({
      ...(pushContent.payload ?? {}),
      ...(route ? { route } : {}),
      params: pushContent.routeParams ?? {},
      channel: importance,
    });

    // OQ-28: badge несут только участнические пуши (unread инбокса аккаунта);
    // организаторский пуш без badge — iOS сохранит текущее значение.
    const isOrgPush = Boolean(route?.startsWith('/org'));
    const badge = isOrgPush
      ? undefined
      : await this.prisma.accountNotification.count({
          where: { accountId, readAt: null },
        });

    return devices.map((device) => {
      // Локаль killed-push: DeviceToken.locale → локаль получателя из
      // снапшота (Account.locale) → 'ru' (DATA_MODEL_DELTA §6).
      const rendered = renderPushMessage(
        pushKey,
        device.locale || snapshot.locale,
        pushContent.params ?? {},
      ) ?? { title: '', body: '' };
      const { title, body } = sanitizePushContent(
        rendered.title,
        rendered.body,
      );
      const message: ExpoPushMessage = {
        to: device.expoPushToken,
        title,
        body,
        data,
        channelId: importance,
        priority:
          priority === 'critical' || priority === 'high' ? 'high' : 'default',
        // REG-09 и прочие normal — тихие; high/critical — со звуком.
        sound:
          priority === 'critical' || priority === 'high' ? 'default' : null,
        ...(badge === undefined ? {} : { badge }),
      };
      return { deviceId: device.id, message };
    });
  }

  private async persistTickets(
    deliveryId: string,
    snapshot: DeliveryPayloadSnapshot,
    tickets: PushTicketSnapshot[],
    providerRef: string | null,
  ): Promise<void> {
    await this.markDelivery(deliveryId, {
      payload: {
        ...snapshot,
        pushTickets: tickets,
      } as unknown as Prisma.InputJsonValue,
      ...(providerRef ? { providerRef } : {}),
    });
  }

  /**
   * Терминальный failed + email-fallback per-account (D-03б): вторая строка
   * с тем же dedupKey и channel='email' из снапшота fallbackEmail. P2002 —
   * fallback уже создавался (рестарт) → noop.
   */
  private async failWithFallback(
    delivery: {
      id: string;
      dedupKey: string;
      catalogId: string;
      accountId: string | null;
      organizationId: string | null;
      eventId: string | null;
      registrationId: string | null;
      orderId: string | null;
      payload: unknown;
    },
    error: string,
  ): Promise<void> {
    await this.markDelivery(delivery.id, {
      status: DELIVERY_STATUS.FAILED,
      error,
    });

    const snapshot = (delivery.payload ?? {}) as DeliveryPayloadSnapshot;
    const fallback = snapshot.fallbackEmail;
    if (!fallback?.to || !fallback.mail || !delivery.accountId) {
      return;
    }

    const row = await this.repository.createDelivery({
      dedupKey: delivery.dedupKey,
      catalogId: delivery.catalogId,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      accountId: delivery.accountId,
      organizationId: delivery.organizationId,
      eventId: delivery.eventId,
      registrationId: delivery.registrationId,
      orderId: delivery.orderId,
      status: DELIVERY_STATUS.ENQUEUED,
      payload: {
        to: fallback.to,
        locale: snapshot.locale,
        mail: fallback.mail,
      } as unknown as Prisma.InputJsonValue,
    });
    if (!row) {
      return; // P2002: fallback-строка уже существует
    }
    try {
      await this.emailSender.dispatchDelivery({
        id: row.id,
        dedupKey: row.dedupKey,
        catalogId: row.catalogId,
        channel: row.channel,
        accountId: row.accountId,
        organizationId: row.organizationId,
        payload: row.payload,
      });
    } catch (fallbackError) {
      // Строка уже в журнале (enqueued) — застрявшую подберёт reaper (BL-06).
      this.logger.error(
        `push fallback email для доставки ${delivery.id} не поставлен`,
        fallbackError instanceof Error
          ? fallbackError.stack
          : String(fallbackError),
      );
    }
    this.logger.log(
      JSON.stringify({
        type: 'notification.push_fallback_email',
        deliveryId: delivery.id,
        catalogId: delivery.catalogId,
        reason: error,
      }),
    );
  }

  private async disableDevice(deviceId: string): Promise<void> {
    await this.prisma.deviceToken.updateMany({
      where: { id: deviceId, disabledAt: null },
      data: {
        disabledAt: new Date(),
        disabledReason: DISABLED_REASON_DEVICE_NOT_REGISTERED,
      },
    });
  }

  private async markDelivery(
    id: string,
    data: Prisma.NotificationDeliveryUpdateInput,
  ): Promise<void> {
    await this.repository.updateDelivery(id, data);
  }
}
