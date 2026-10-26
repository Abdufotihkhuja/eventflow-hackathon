import { PaymentProvider } from '@prisma/client';

/**
 * Граница платёжных провайдеров (M-5). Адаптер изолирует протокол провайдера
 * от денежного ядра: ядро оперирует ТОЛЬКО Order/PaymentTransaction (D-9),
 * идемпотентность вебхуков — уникальность (provider, providerTxnId) в БД.
 *
 * ВНЕШНИЙ ГЕЙТ (10-decisions §3): мерчант-онбординг и креды Payme/Click
 * отсутствуют — адаптеры отвечают isConfigured()=false и вебхуки отдают
 * provider-корректный отказ до появления кредов. Очерёдность: Payme → Click
 * (решение C-3); Stripe — M-18 (гейт: зарубежное юрлицо).
 *
 * PII: в payloadScrubbed сохраняется ТОЛЬКО вайтлист полей (CR-16) —
 * никаких телефонов/карточных данных, ни в БД, ни в логах (инвариант №7).
 */
export interface WebhookVerdict {
  /** Идентификатор транзакции у провайдера. */
  providerTxnId: string;
  /** Наш orderId, если провайдер его вернул (account.order_id и т.п.). */
  orderId: string | null;
  /** Подтверждена ли оплата этим колбэком. */
  confirmed: boolean;
  /** Сумма провайдера в тийинах (для сверки с заказом). */
  amountMinor: bigint | null;
  /** Вайтлист-очищенный пейлоад для payloadScrubbed. */
  scrubbed: Record<string, string | number | boolean | null>;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  /** Есть ли креды (env). Без кредов вебхук отвечает отказом провайдера. */
  isConfigured(): boolean;
  /**
   * Разбор и проверка колбэка (подпись/авторизация — по протоколу провайдера).
   * Бросает UnauthorizedException при неверной подписи.
   */
  parseWebhook(headers: Record<string, string | string[] | undefined>, body: unknown): WebhookVerdict;
}

/** Вайтлист-фильтр пейлоада провайдера (CR-16). */
export function scrubProviderPayload(
  raw: Record<string, unknown>,
  allowedKeys: string[],
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of allowedKeys) {
    const value = raw[key];
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = value as string | number | boolean | null;
    }
  }
  return out;
}
