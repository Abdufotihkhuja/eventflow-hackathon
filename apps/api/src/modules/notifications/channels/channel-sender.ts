import type { NotificationChannel } from '../dispatch/notification.types';

/**
 * Строка доставки, достаточная для канальной постановки/ресенда: payload —
 * снапшот аргументов (DeliveryPayloadSnapshot), по нему reaper переотправляет
 * без обращения к исходному интенту.
 */
export interface DeliveryRowForSend {
  id: string;
  dedupKey: string;
  catalogId: string;
  channel: string;
  accountId: string | null;
  organizationId: string | null;
  payload: unknown;
  /** Маркер reaper-повтора ('reaper_requeued') — меняет idempotency-suffix. */
  error?: string | null;
}

/**
 * Канальный исполнитель. Реализации живут ТОЛЬКО в modules/notifications
 * (инвариант №2: единая точка NotificationDispatcher; импорт каналов извне
 * запрещён ESLint-правилом + ratchet check-notification-dispatch.mjs).
 *
 * Контракт: dispatchDelivery вызывается ПОСЛЕ commit доменной транзакции
 * (BL-06/OQ-27); строка к этому моменту уже в БД в статусе enqueued.
 * push-канал появится в Батче 3 (BL-14) как ещё одна реализация.
 */
export interface ChannelSender {
  readonly channel: NotificationChannel;
  dispatchDelivery(delivery: DeliveryRowForSend): Promise<void>;
}

/** Маркер однократного reaper-повтора (BL-06: max 1 re-enqueue, дальше failed). */
export const REAPER_REQUEUED_MARKER = 'reaper_requeued';
