import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';

/**
 * VIA (via.uz) partner API — hosted-invoice чекаут (M-5, провайдер VIA).
 *
 * Протокол: POST /partner/invoice создаёт инвойс и возвращает redirectUrl
 * (платёжная страница VIA, UZCARD/HUMO); статус подтверждается ТОЛЬКО
 * серверным GET /partner/invoice/{id} — у VIA НЕТ подписанных вебхуков,
 * callbackUrl — это браузерный возврат клиента и доказательством оплаты
 * не является (инвариант безопасности этой интеграции).
 *
 * Аутентификация: заголовки client-id / client-secret (env-креды).
 * Суммы VIA тийин-нативны (1/100 UZS) — совпадают с amountMinor (D-3).
 * Карточные данные НЕ проходят через наш бэкенд (hosted-страница = вне PCI).
 *
 * 🔒 ВНЕШНИЙ ГЕЙТ: без кред (VIA_CLIENT_ID/VIA_CLIENT_SECRET/VIA_MERCHANT_ID)
 * isConfigured()=false и провайдер невидим для покупателей. Sandbox —
 * через VIA_API_BASE_URL=https://api.viasandbox.uz.
 */

/** Статусы инвойса VIA (по докам partner API). */
export type ViaInvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'EXPIRED' | 'CANCEL';

export interface ViaInvoice {
  invoiceId: string;
  status: ViaInvoiceStatus;
  /** Сумма инвойса в тийинах. */
  amountMinor: bigint;
  currency: string;
  /**
   * Наш orderId, распознанный в ответе VIA: `accounts.<VIA_ACCOUNT_FIELD>` →
   * `note` → `externalId` (последнее — только если VIA его вернёт: сами мы
   * поле больше не шлём). Используется как доп. сверка на подтверждении;
   * `null` = VIA заказ не вернул, привязка остаётся по invoiceId.
   */
  orderRef: string | null;
  /** Платёжная страница VIA для редиректа покупателя. */
  paymentUrl: string | null;
  /** Идентификатор транзакции VIA (появляется после оплаты). */
  providerTrxId: string | null;
}

const DEFAULT_BASE_URL = 'https://api.via.uz';
const REQUEST_TIMEOUT_MS = 12_000;

/** UUID нашего orderId — ищем его в accounts/note/externalId ответа VIA. */
const ORDER_ID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

interface ViaInvoicePayload {
  id?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
  externalId?: unknown;
  note?: unknown;
  accounts?: unknown;
  redirectUrl?: unknown;
  transactionInfo?: { id?: unknown } | null;
}

@Injectable()
export class ViaAdapter {
  readonly provider = PaymentProvider.VIA;

  private readonly logger = new Logger(ViaAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('VIA_CLIENT_ID')?.trim() &&
        this.configService.get<string>('VIA_CLIENT_SECRET')?.trim() &&
        this.configService.get<string>('VIA_MERCHANT_ID')?.trim(),
    );
  }

  /**
   * Создание инвойса. Запрос НЕ ретраится (защита от двойного инвойса);
   * идемпотентность на нашей стороне — переиспользование живой
   * CREATED-транзакции в ViaPaymentsService.
   *
   * ⚠️ Поле `externalId` НЕ передаётся — по прямой просьбе VIA (поле
   * опциональное). У них externalId глобально уникален, поэтому вторая
   * попытка оплаты того же заказа (бронь живёт 15 минут, orderId тот же)
   * упиралась в «External id already exists» и оплата становилась
   * невозможной до конца брони. Привязка к заказу сохраняется:
   * `accounts.<VIA_ACCOUNT_FIELD>` и `note` несут наш orderId, а первичный
   * ключ — invoiceId, который мы храним в providerTxnId.
   */
  async createInvoice(input: {
    orderId: string;
    amountMinor: bigint;
    note: string;
    callbackUrl: string;
  }): Promise<ViaInvoice> {
    const merchantId = this.requireConfig('VIA_MERCHANT_ID');
    // Ключ поля услуги мерчанта настраивается на стороне VIA при онбординге.
    const accountField =
      this.configService.get<string>('VIA_ACCOUNT_FIELD')?.trim() || 'order_id';

    const payload = await this.request('POST', '/partner/invoice', {
      amount: Number(input.amountMinor),
      currency: 'UZS',
      merchantId,
      note: input.note,
      callbackUrl: input.callbackUrl,
      accounts: { [accountField]: input.orderId },
    });
    return this.mapInvoice(payload, input.orderId);
  }

  /** Статус инвойса — единственный доверенный источник факта оплаты. */
  async getInvoice(invoiceId: string): Promise<ViaInvoice> {
    const payload = await this.request(
      'GET',
      `/partner/invoice/${encodeURIComponent(invoiceId)}`,
    );
    return this.mapInvoice(payload, null);
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ViaInvoicePayload> {
    const baseUrl =
      this.configService.get<string>('VIA_API_BASE_URL')?.trim() ||
      DEFAULT_BASE_URL;
    const clientId = this.requireConfig('VIA_CLIENT_ID');
    const clientSecret = this.requireConfig('VIA_CLIENT_SECRET');

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          // Схема аутентификации VIA partner API.
          'client-id': clientId,
          'client-secret': clientSecret,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      // Логи без URL-параметров и тела — только тип сбоя (инвариант №7).
      this.logger.warn(
        `VIA: сетевой сбой ${method} ${path.split('/').slice(0, 3).join('/')} — ${
          error instanceof Error ? error.name : 'unknown'
        }`,
      );
      throw new ServiceUnavailableException('VIA временно недоступен');
    }

    if (!response.ok) {
      this.logger.warn(`VIA: HTTP ${response.status} на ${method} ${path.split('?')[0]}`);
      throw new ServiceUnavailableException('VIA временно недоступен');
    }

    const json = (await response.json().catch(() => null)) as
      | { data?: ViaInvoicePayload }
      | null;
    if (!json?.data || typeof json.data !== 'object') {
      this.logger.warn(`VIA: некорректный ответ на ${method} ${path.split('?')[0]}`);
      throw new ServiceUnavailableException('VIA временно недоступен');
    }
    return json.data;
  }

  private mapInvoice(
    payload: ViaInvoicePayload,
    fallbackOrderId: string | null,
  ): ViaInvoice {
    const invoiceId = typeof payload.id === 'string' ? payload.id : '';
    const status = this.normalizeStatus(payload.status);
    if (!invoiceId || !status) {
      this.logger.warn('VIA: инвойс без id/status в ответе провайдера');
      throw new ServiceUnavailableException('VIA временно недоступен');
    }
    const amountRaw = payload.amount;
    const amountMinor =
      typeof amountRaw === 'number' && Number.isSafeInteger(amountRaw)
        ? BigInt(amountRaw)
        : typeof amountRaw === 'string' && /^\d+$/.test(amountRaw)
          ? BigInt(amountRaw)
          : 0n;
    const trxId = payload.transactionInfo?.id;
    return {
      invoiceId,
      status,
      amountMinor,
      currency: typeof payload.currency === 'string' ? payload.currency : 'UZS',
      orderRef: this.extractOrderRef(payload) ?? fallbackOrderId,
      paymentUrl:
        typeof payload.redirectUrl === 'string' && payload.redirectUrl
          ? payload.redirectUrl
          : null,
      providerTrxId: typeof trxId === 'string' && trxId ? trxId : null,
    };
  }

  /**
   * Наш orderId в ответе VIA. Ищем там, куда сами его кладём при создании:
   * значения `accounts` → `note` → `externalId` (на случай, если VIA всё же
   * вернёт его по старым инвойсам). Ничего не нашли — null, и сверка
   * опирается на invoiceId + сумму + валюту.
   */
  private extractOrderRef(payload: ViaInvoicePayload): string | null {
    const accounts = payload.accounts;
    if (accounts && typeof accounts === 'object') {
      for (const value of Object.values(accounts as Record<string, unknown>)) {
        if (typeof value === 'string') {
          const match = ORDER_ID_RE.exec(value);
          if (match) return match[0];
        }
      }
    }
    for (const raw of [payload.note, payload.externalId]) {
      if (typeof raw === 'string') {
        const match = ORDER_ID_RE.exec(raw);
        if (match) return match[0];
      }
    }
    return null;
  }

  private normalizeStatus(raw: unknown): ViaInvoiceStatus | null {
    return raw === 'DRAFT' ||
      raw === 'OPEN' ||
      raw === 'PAID' ||
      raw === 'EXPIRED' ||
      raw === 'CANCEL'
      ? raw
      : null;
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new ServiceUnavailableException('VIA не подключён');
    }
    return value;
  }
}
