import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PaymentProvider } from '@prisma/client';
import {
  PaymentProviderAdapter,
  WebhookVerdict,
  scrubProviderPayload,
} from './payment-provider.adapter';

/**
 * Payme (Paycom) merchant API — СКЕЛЕТ (M-5, провайдер №1 по решению C-3).
 *
 * 🔒 ВНЕШНИЙ ГЕЙТ: мерчант-креды (PAYME_MERCHANT_ID / PAYME_MERCHANT_KEY)
 * отсутствуют. Протокол JSON-RPC (CheckPerformTransaction / CreateTransaction /
 * PerformTransaction / CancelTransaction) должен быть доведён и прогнан на
 * тестовом мерчанте ПЕРЕД боевым включением — фискализация M-16 гейтит запуск.
 * Payme тийин-нативен: amount приходит уже в тийинах.
 */
@Injectable()
export class PaymeAdapter implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.PAYME;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('PAYME_MERCHANT_ID') &&
        this.configService.get<string>('PAYME_MERCHANT_KEY'),
    );
  }

  parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): WebhookVerdict {
    this.assertAuthorized(headers);

    const rpc = (body ?? {}) as {
      method?: string;
      params?: {
        id?: string;
        amount?: number;
        account?: { order_id?: string };
      };
    };
    const params = rpc.params ?? {};
    const raw = {
      method: rpc.method ?? null,
      paymeTxId: params.id ?? null,
      amount: params.amount ?? null,
      orderId: params.account?.order_id ?? null,
    };

    return {
      providerTxnId: params.id ?? '',
      orderId: params.account?.order_id ?? null,
      // Оплата подтверждается ТОЛЬКО PerformTransaction.
      confirmed: rpc.method === 'PerformTransaction',
      amountMinor: params.amount != null ? BigInt(params.amount) : null,
      scrubbed: scrubProviderPayload(raw, [
        'method',
        'paymeTxId',
        'amount',
        'orderId',
      ]),
    };
  }

  /** Basic-авторизация Paycom: Authorization: Basic base64(Paycom:KEY). */
  private assertAuthorized(
    headers: Record<string, string | string[] | undefined>,
  ): void {
    const key = this.configService.get<string>('PAYME_MERCHANT_KEY');
    const header = headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    if (!key || !value?.startsWith('Basic ')) {
      throw new UnauthorizedException('Payme: неавторизованный колбэк');
    }
    const decoded = Buffer.from(value.slice(6), 'base64').toString('utf8');
    const expected = `Paycom:${key}`;
    // Постоянное по времени сравнение — не даём подбирать merchant key по таймингу.
    const a = Buffer.from(decoded);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Payme: неверный merchant key');
    }
  }
}
