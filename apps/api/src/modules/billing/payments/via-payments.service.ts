import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EntitlementKey,
  OrderStatus,
  PaymentTxStatus,
  RevenueChannel,
} from '@prisma/client';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { RegistrationChainService } from '../../notifications/chains/registration-chain.service';
import { TicketingService } from '../ticketing/ticketing.service';
import { scrubProviderPayload } from './payment-provider.adapter';
import { ViaAdapter, type ViaInvoice } from './via.adapter';
import { ViaConfigService } from './via-config.service';
import { ViaPaymentsRepository } from './via-payments.repository';
import type { ICurrentUser } from '../../../common/interfaces';

/** Локали публичного сайта для страницы возврата. */
const SUPPORTED_LOCALES = new Set(['en', 'ru', 'uz']);

/** UUID нашего orderId (externalId в уведомлениях VIA). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Реконсиляция: не трогаем транзакции моложе 2 минут (покупатель ещё платит). */
const RECONCILE_MIN_AGE_MS = 2 * 60_000;
/** Батч реконсиляции за один свип — ограничиваем нагрузку на VIA API. */
const RECONCILE_BATCH = 50;

export interface ViaPaymentStart {
  orderId: string;
  invoiceId: string;
  paymentUrl: string;
  holdExpiresAt: string | null;
}

export interface ViaPaymentConfirmation {
  orderId: string;
  eventId: string | null;
  orderStatus: OrderStatus;
  invoiceStatus: ViaInvoice['status'] | 'UNKNOWN';
  paid: boolean;
}

/**
 * VIA-платежи поверх тикетинга (M-5): создание hosted-инвойса для живого
 * PENDING_PAYMENT-заказа и серверное подтверждение оплаты.
 *
 * Инварианты безопасности:
 *  1. Факт оплаты устанавливается ТОЛЬКО ответом GET /partner/invoice
 *     (у VIA нет подписанных вебхуков; браузерному возврату не доверяем).
 *  2. Перед подтверждением сверяются сумма в тийинах, валюта UZS и — если VIA
 *     вернул наш orderId (accounts/note) — сам заказ; несовпадение НЕ
 *     подтверждает оплату и логируется. Инвойс привязан к заказу нашим
 *     providerTxnId, поэтому отсутствие orderRef сверку не ломает.
 *  3. Идемпотентность: unique (provider, providerTxnId) в БД + переиспользование
 *     живой CREATED-транзакции вместо повторного создания инвойса.
 *  4. payloadScrubbed — только вайтлист полей, без PII (CR-16, инвариант №7).
 *
 * Доступность (тумблеры): per-org оверрайд VIA_PAYMENTS (valueBool) имеет
 * приоритет над глобальным platform_config.via_payments — это даёт и пилот
 * для избранных организаций при выключенном проде, и точечное отключение
 * при включённом.
 */
@Injectable()
export class ViaPaymentsService {
  private readonly logger = new Logger(ViaPaymentsService.name);

  constructor(
    private readonly repository: ViaPaymentsRepository,
    private readonly viaAdapter: ViaAdapter,
    private readonly viaConfig: ViaConfigService,
    private readonly entitlementsRepository: EntitlementsRepository,
    private readonly ticketingService: TicketingService,
    private readonly configService: ConfigService,
    private readonly registrationChain: RegistrationChainService,
  ) {}

  /** Эффективная доступность VIA для организации: оверрайд → глобальный тумблер. */
  async isAvailableForOrg(organizationId: string): Promise<boolean> {
    if (!this.viaAdapter.isConfigured()) return false;
    const overrides = await this.entitlementsRepository.findActiveOverrides(
      organizationId,
      new Date(),
    );
    const override = overrides.find(
      (o) => o.key === EntitlementKey.VIA_PAYMENTS,
    );
    if (override && override.valueBool !== null) {
      return override.valueBool;
    }
    return this.viaConfig.isGloballyEnabled();
  }

  /**
   * Создать (или переиспользовать) VIA-инвойс для заказа билета покупателя.
   * Заказ берётся идемпотентным чекаутом тикетинга — бронь всегда живая.
   */
  async startPayment(
    registrationId: string,
    user: ICurrentUser,
    localeInput?: string,
  ): Promise<ViaPaymentStart> {
    const order = await this.ticketingService.checkout(registrationId, user);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException({
        message: 'Заказ не ожидает оплату',
        code: 'ORDER_NOT_PAYABLE',
        details: { orderId: order.id, status: order.status },
      });
    }

    const available = await this.isAvailableForOrg(order.organizationId);
    if (!available) {
      throw new ForbiddenException({
        message: 'Оплата через VIA недоступна для этого события',
        code: 'VIA_UNAVAILABLE',
        details: {},
      });
    }

    // Переиспользуем живой инвойс: не плодим дубликаты на каждый клик.
    const existing = await this.repository.findLiveCreatedTxn(order.id);
    if (existing) {
      const storedUrl = (existing.payloadScrubbed as { paymentUrl?: unknown })
        ?.paymentUrl;
      if (typeof storedUrl === 'string' && storedUrl) {
        return {
          orderId: order.id,
          invoiceId: existing.providerTxnId,
          paymentUrl: storedUrl,
          holdExpiresAt: order.holdExpiresAt?.toISOString() ?? null,
        };
      }
    }

    const locale =
      localeInput && SUPPORTED_LOCALES.has(localeInput) ? localeInput : 'ru';
    const publicUrl = (
      this.configService.get<string>('FRONTEND_PUBLIC_URL') || 'http://localhost'
    ).replace(/\/+$/, '');
    const callbackUrl = `${publicUrl}/${locale}/payment/via/return?registrationId=${registrationId}`;

    const invoice = await this.viaAdapter.createInvoice({
      orderId: order.id,
      amountMinor: order.amountMinor,
      note: `EventFlow ticket ${order.id}`,
      callbackUrl,
    });
    if (!invoice.paymentUrl) {
      this.logger.warn(
        `VIA: инвойс ${invoice.invoiceId} без paymentUrl (order=${order.id})`,
      );
      throw new ConflictException({
        message: 'VIA не вернул платёжную ссылку',
        code: 'VIA_NO_PAYMENT_URL',
        details: {},
      });
    }

    await this.repository.createTxnIdempotent({
      orderId: order.id,
      providerTxnId: invoice.invoiceId,
      amountMinor: order.amountMinor,
      payloadScrubbed: this.scrub(invoice),
    });

    return {
      orderId: order.id,
      invoiceId: invoice.invoiceId,
      paymentUrl: invoice.paymentUrl,
      holdExpiresAt: order.holdExpiresAt?.toISOString() ?? null,
    };
  }

  /**
   * Серверное подтверждение после возврата покупателя (или по кнопке
   * «Обновить статус»). Идемпотентно; браузерный редирект — только триггер.
   */
  async confirmPayment(
    registrationId: string,
    user: ICurrentUser,
  ): Promise<ViaPaymentConfirmation> {
    // Владение регистрацией — скоуп запроса заказа (registration.userId).
    const order = await this.repository.findBuyerTicketOrder(
      registrationId,
      user.sub,
    );
    if (!order) {
      throw new ConflictException({
        message: 'Заказ не найден',
        code: 'ORDER_NOT_FOUND',
        details: {},
      });
    }
    if (order.status === OrderStatus.PAID) {
      return {
        orderId: order.id,
        eventId: order.eventId,
        orderStatus: order.status,
        invoiceStatus: 'PAID',
        paid: true,
      };
    }

    const txn = await this.repository.findLatestTxnForOrder(order.id);
    if (!txn) {
      return {
        orderId: order.id,
        eventId: order.eventId,
        orderStatus: order.status,
        invoiceStatus: 'UNKNOWN',
        paid: false,
      };
    }

    const settled = await this.settleTransaction(
      txn.id,
      txn.providerTxnId,
      order.id,
      order.amountMinor,
    );
    const refreshed = await this.repository.getOrderStatus(order.id);
    return {
      orderId: order.id,
      eventId: order.eventId,
      orderStatus: refreshed?.status ?? order.status,
      invoiceStatus: settled,
      paid: settled === 'PAID',
    };
  }

  /**
   * Server-to-server уведомление VIA об успешной оплате (наш endpoint,
   * переданный VIA при онбординге). Уведомление НЕ подписано, поэтому это
   * ТОЛЬКО ТРИГГЕР: из тела извлекаются кандидаты invoiceId/externalId,
   * а факт оплаты, как и всюду, устанавливается опросом GET /partner/invoice
   * со сверкой суммы/заказа (инварианты №1–2). Ответ всегда 200-совместимый —
   * содержимое не раскрываем.
   */
  async handleWebhookNotification(
    body: unknown,
  ): Promise<'NOT_CONFIGURED' | 'OK'> {
    if (!this.viaAdapter.isConfigured()) return 'NOT_CONFIGURED';

    const { invoiceId, externalId } = this.extractNotificationIds(body);

    let txnId: string | null = null;
    let invoiceRef: string | null = null;
    let order: { id: string; amountMinor: bigint; status: OrderStatus } | null =
      null;

    if (invoiceId) {
      const txn = await this.repository.findTxnWithOrderByInvoiceId(invoiceId);
      if (txn) {
        txnId = txn.id;
        invoiceRef = txn.providerTxnId;
        order = txn.order;
      }
    }
    if (!txnId && externalId) {
      const found = await this.repository.getOrderForSettle(externalId);
      const txn = found
        ? await this.repository.findLatestTxnForOrder(found.id)
        : null;
      if (found && txn) {
        txnId = txn.id;
        invoiceRef = txn.providerTxnId;
        order = found;
      }
    }

    if (!txnId || !invoiceRef || !order) {
      // Неизвестное уведомление: не раскрываем, что именно не нашли.
      this.logger.warn('VIA: webhook-уведомление без распознанного инвойса/заказа');
      return 'OK';
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return 'OK'; // уже подтверждён/закрыт — идемпотентный no-op
    }

    await this.settleTransaction(txnId, invoiceRef, order.id, order.amountMinor);
    return 'OK';
  }

  /**
   * Кандидаты идентификаторов из неподписанного тела уведомления (data не
   * доверяем). Наш orderId ищем в `accounts` (мы кладём его туда при
   * создании) и в `externalId` — последнее осталось для инвойсов, созданных
   * до отказа от этого поля по просьбе VIA.
   */
  private extractNotificationIds(body: unknown): {
    invoiceId: string | null;
    externalId: string | null;
  } {
    const root = (body ?? {}) as Record<string, unknown>;
    const data =
      typeof root.data === 'object' && root.data !== null
        ? (root.data as Record<string, unknown>)
        : root;

    const pick = (keys: string[]): string | null => {
      for (const key of keys) {
        const value = data[key] ?? root[key];
        if (typeof value === 'string' && value.length > 0 && value.length <= 128) {
          return value;
        }
      }
      return null;
    };

    const invoiceCandidate = pick(['invoiceId', 'invoice_id', 'id']);
    const externalCandidate =
      pick(['externalId', 'external_id', 'orderId', 'order_id']) ??
      this.pickOrderIdFromAccounts(data.accounts ?? root.accounts);
    return {
      // Инвойсы VIA имеют префикс inv_ — прочее не считаем инвойсом.
      invoiceId: invoiceCandidate?.startsWith('inv_') ? invoiceCandidate : null,
      externalId: UUID_RE.test(externalCandidate ?? '') ? externalCandidate : null,
    };
  }

  /** Наш orderId из эха `accounts` (ключ поля услуги задаёт VIA_ACCOUNT_FIELD). */
  private pickOrderIdFromAccounts(accounts: unknown): string | null {
    if (!accounts || typeof accounts !== 'object') return null;
    for (const value of Object.values(accounts as Record<string, unknown>)) {
      if (typeof value === 'string' && UUID_RE.test(value)) return value;
    }
    return null;
  }

  /**
   * Реконсиляция «зависших» VIA-инвойсов (гигиенический свип E-11b):
   * покупатель мог оплатить и закрыть вкладку до возврата — оплату
   * подбираем опросом, просроченные инвойсы помечаем FAILED.
   */
  async reconcilePending(now: Date): Promise<{ confirmed: number; failed: number }> {
    if (!this.viaAdapter.isConfigured()) return { confirmed: 0, failed: 0 };

    const stale = await this.repository.findStalePendingTxns(
      new Date(now.getTime() - RECONCILE_MIN_AGE_MS),
      RECONCILE_BATCH,
    );

    let confirmed = 0;
    let failed = 0;
    for (const txn of stale) {
      try {
        const status = await this.settleTransaction(
          txn.id,
          txn.providerTxnId,
          txn.order.id,
          txn.order.amountMinor,
        );
        if (status === 'PAID') confirmed += 1;
        if (status === 'EXPIRED' || status === 'CANCEL') failed += 1;
      } catch {
        // Единичный сбой VIA не должен ронять весь свип — доберём в следующем.
      }
    }
    if (confirmed > 0 || failed > 0) {
      this.logger.log(
        `VIA-реконсиляция: подтверждено=${confirmed}, закрыто=${failed}`,
      );
    }
    return { confirmed, failed };
  }

  /**
   * Опрос инвойса и фиксация исхода. Подтверждение — только при полном
   * совпадении externalId/суммы/валюты (инвариант №2).
   */
  private async settleTransaction(
    txnId: string,
    invoiceId: string,
    orderId: string,
    orderAmountMinor: bigint,
  ): Promise<ViaInvoice['status'] | 'UNKNOWN'> {
    const invoice = await this.viaAdapter.getInvoice(invoiceId);

    if (invoice.status === 'PAID') {
      const matches =
        (invoice.orderRef === null || invoice.orderRef === orderId) &&
        invoice.amountMinor === orderAmountMinor &&
        invoice.currency === 'UZS';
      if (!matches) {
        // Аномалия провайдера: оплату НЕ подтверждаем, оставляем CREATED
        // для расследования оператором. Лог без PII.
        this.logger.error(
          `VIA: несовпадение инвойса ${invoiceId} и заказа ${orderId} ` +
            `(amount=${invoice.amountMinor}/${orderAmountMinor}, currency=${invoice.currency})`,
        );
        return 'UNKNOWN';
      }

      await this.repository.settleTxn(
        txnId,
        PaymentTxStatus.CONFIRMED,
        this.scrub(invoice),
      );
      await this.ticketingService.confirmTicketPaid(
        orderId,
        RevenueChannel.VIA,
      );
      this.logger.log(
        `VIA: заказ ${orderId} подтверждён (invoice=${invoiceId})`,
      );
      return 'PAID';
    }

    if (invoice.status === 'EXPIRED' || invoice.status === 'CANCEL') {
      await this.repository.settleTxn(
        txnId,
        PaymentTxStatus.FAILED,
        this.scrub(invoice),
      );
      // REG-05: платёж отклонён провайдером при живом заказе. Цепочка сама
      // фильтрует kind=TICKET_SALE и статус PENDING_PAYMENT (B-05) и не
      // бросает наружу.
      await this.registrationChain.onPaymentFailed(orderId, txnId);
      return invoice.status;
    }

    return invoice.status;
  }

  /** Вайтлист-пейлоад инвойса для payloadScrubbed (без PII/карточных данных). */
  private scrub(invoice: ViaInvoice): Record<string, string | number | boolean | null> {
    return scrubProviderPayload(
      {
        invoiceId: invoice.invoiceId,
        status: invoice.status,
        amount: invoice.amountMinor.toString(10),
        currency: invoice.currency,
        orderRef: invoice.orderRef,
        paymentUrl: invoice.paymentUrl,
        providerTrxId: invoice.providerTrxId,
      },
      [
        'invoiceId',
        'status',
        'amount',
        'currency',
        'orderRef',
        'paymentUrl',
        'providerTrxId',
      ],
    );
  }
}
