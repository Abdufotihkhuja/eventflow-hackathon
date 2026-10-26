import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EntitlementKey,
  OrderStatus,
  PaymentTxStatus,
  RevenueChannel,
} from '@prisma/client';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { TicketingService } from '../ticketing/ticketing.service';
import { ViaAdapter, type ViaInvoice } from './via.adapter';
import { ViaConfigService } from './via-config.service';
import { ViaPaymentsRepository } from './via-payments.repository';
import { ViaPaymentsService } from './via-payments.service';
import type { ICurrentUser } from '../../../common/interfaces';

const USER = { sub: 'user-1', email: 'u@e.uz' } as ICurrentUser;

const ORDER = {
  id: 'order-1',
  organizationId: 'org-1',
  eventId: 'event-1',
  status: OrderStatus.PENDING_PAYMENT,
  amountMinor: 5_000_000n,
  holdExpiresAt: new Date('2026-07-24T12:00:00Z'),
};

function invoice(partial: Partial<ViaInvoice> = {}): ViaInvoice {
  return {
    invoiceId: 'inv_1',
    status: 'OPEN',
    amountMinor: 5_000_000n,
    currency: 'UZS',
    orderRef: 'order-1',
    paymentUrl: 'https://business.via.uz/invoice/inv_1',
    providerTrxId: null,
    ...partial,
  };
}

function build(opts: {
  configured?: boolean;
  globallyEnabled?: boolean;
  overrides?: Array<{ key: EntitlementKey; valueBool: boolean | null }>;
  liveTxn?: unknown;
  latestTxn?: unknown;
  createInvoiceResult?: ViaInvoice;
  getInvoiceResult?: ViaInvoice;
  order?: unknown;
} = {}) {
  const repository = {
    findLiveCreatedTxn: jest.fn().mockResolvedValue(opts.liveTxn ?? null),
    findLatestTxnForOrder: jest
      .fn()
      .mockResolvedValue(opts.latestTxn ?? null),
    findBuyerTicketOrder: jest.fn().mockResolvedValue(opts.order ?? ORDER),
    getOrderStatus: jest.fn().mockResolvedValue({ status: OrderStatus.PAID }),
    findTxnWithOrderByInvoiceId: jest.fn().mockResolvedValue(null),
    getOrderForSettle: jest.fn().mockResolvedValue(null),
    findStalePendingTxns: jest.fn().mockResolvedValue([]),
    createTxnIdempotent: jest.fn().mockResolvedValue(undefined),
    settleTxn: jest.fn().mockResolvedValue(undefined),
  };
  const adapter = {
    isConfigured: jest.fn().mockReturnValue(opts.configured ?? true),
    createInvoice: jest
      .fn()
      .mockResolvedValue(opts.createInvoiceResult ?? invoice()),
    getInvoice: jest
      .fn()
      .mockResolvedValue(opts.getInvoiceResult ?? invoice()),
  };
  const viaConfig = {
    isGloballyEnabled: jest
      .fn()
      .mockResolvedValue(opts.globallyEnabled ?? false),
  };
  const entitlementsRepository = {
    findActiveOverrides: jest.fn().mockResolvedValue(opts.overrides ?? []),
  };
  const ticketing = {
    checkout: jest.fn().mockResolvedValue(ORDER),
    confirmTicketPaid: jest.fn().mockResolvedValue(ORDER),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'FRONTEND_PUBLIC_URL' ? 'https://eventflow.uz' : undefined,
    ),
  };

  // REG-05 (Батч 6б): цепочка сама фильтрует kind/статус — тут заглушка.
  const registrationChain = {
    onPaymentFailed: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ViaPaymentsService(
    repository as unknown as ViaPaymentsRepository,
    adapter as unknown as ViaAdapter,
    viaConfig as unknown as ViaConfigService,
    entitlementsRepository as unknown as EntitlementsRepository,
    ticketing as unknown as TicketingService,
    config as unknown as ConfigService,
    registrationChain as never,
  );
  return {
    service,
    repository,
    adapter,
    viaConfig,
    entitlementsRepository,
    ticketing,
    registrationChain,
  };
}

describe('ViaPaymentsService: доступность (тумблеры)', () => {
  it('без кред провайдер недоступен независимо от тумблеров', async () => {
    const { service } = build({ configured: false, globallyEnabled: true });
    await expect(service.isAvailableForOrg('org-1')).resolves.toBe(false);
  });

  it('глобально ВЫКЛ + пилотный оверрайд true → доступен (тест для избранных)', async () => {
    const { service } = build({
      globallyEnabled: false,
      overrides: [{ key: EntitlementKey.VIA_PAYMENTS, valueBool: true }],
    });
    await expect(service.isAvailableForOrg('org-1')).resolves.toBe(true);
  });

  it('глобально ВКЛ + точечный оверрайд false → недоступен (оверрайд приоритетнее)', async () => {
    const { service } = build({
      globallyEnabled: true,
      overrides: [{ key: EntitlementKey.VIA_PAYMENTS, valueBool: false }],
    });
    await expect(service.isAvailableForOrg('org-1')).resolves.toBe(false);
  });

  it('без оверрайда действует глобальный тумблер', async () => {
    const { service } = build({ globallyEnabled: true });
    await expect(service.isAvailableForOrg('org-1')).resolves.toBe(true);
  });
});

describe('ViaPaymentsService.startPayment', () => {
  it('недоступный провайдер → 403 VIA_UNAVAILABLE, инвойс не создаётся', async () => {
    const { service, adapter } = build({ globallyEnabled: false });
    await expect(service.startPayment('reg-1', USER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(adapter.createInvoice).not.toHaveBeenCalled();
  });

  it('создаёт инвойс: сумма заказа, callbackUrl с локалью; фиксирует CREATED-транзакцию', async () => {
    const { service, adapter, repository } = build({ globallyEnabled: true });
    const result = await service.startPayment('reg-1', USER, 'uz');

    const call = adapter.createInvoice.mock.calls[0][0];
    expect(call.orderId).toBe('order-1');
    expect(call.amountMinor).toBe(5_000_000n);
    expect(call.callbackUrl).toBe(
      'https://eventflow.uz/uz/payment/via/return?registrationId=reg-1',
    );

    const created = repository.createTxnIdempotent.mock.calls[0][0];
    expect(created.orderId).toBe('order-1');
    expect(created.providerTxnId).toBe('inv_1');
    // В payloadScrubbed — только вайтлист, без PII/карточных данных.
    expect(Object.keys(created.payloadScrubbed).sort()).toEqual(
      [
        'amount',
        'currency',
        'invoiceId',
        'orderRef',
        'paymentUrl',
        'providerTrxId',
        'status',
      ].sort(),
    );
    expect(result.paymentUrl).toBe('https://business.via.uz/invoice/inv_1');
  });

  it('некорректная локаль откатывается на ru (не попадает в callbackUrl)', async () => {
    const { service, adapter } = build({ globallyEnabled: true });
    await service.startPayment('reg-1', USER, '../evil');
    const call = adapter.createInvoice.mock.calls[0][0];
    expect(call.callbackUrl).toContain('/ru/payment/via/return');
  });

  it('живой CREATED-инвойс переиспользуется — второй инвойс не создаётся', async () => {
    const { service, adapter } = build({
      globallyEnabled: true,
      liveTxn: {
        providerTxnId: 'inv_old',
        payloadScrubbed: { paymentUrl: 'https://business.via.uz/invoice/inv_old' },
      },
    });
    const result = await service.startPayment('reg-1', USER);
    expect(adapter.createInvoice).not.toHaveBeenCalled();
    expect(result.invoiceId).toBe('inv_old');
  });
});

describe('ViaPaymentsService.confirmPayment (серверная сверка)', () => {
  it('PAID + полное совпадение → транзакция CONFIRMED и заказ подтверждён каналом VIA', async () => {
    const { service, repository, ticketing } = build({
      order: ORDER,
      latestTxn: { id: 'txn-1', providerTxnId: 'inv_1' },
      getInvoiceResult: invoice({ status: 'PAID' }),
    });
    const result = await service.confirmPayment('reg-1', USER);

    expect(result.paid).toBe(true);
    expect(result.eventId).toBe('event-1');
    expect(repository.settleTxn).toHaveBeenCalledWith(
      'txn-1',
      PaymentTxStatus.CONFIRMED,
      expect.any(Object),
    );
    expect(ticketing.confirmTicketPaid).toHaveBeenCalledWith(
      'order-1',
      RevenueChannel.VIA,
    );
  });

  it('PAID, но сумма НЕ совпадает → оплата НЕ подтверждается (аномалия провайдера)', async () => {
    const { service, repository, ticketing } = build({
      order: ORDER,
      latestTxn: { id: 'txn-1', providerTxnId: 'inv_1' },
      getInvoiceResult: invoice({ status: 'PAID', amountMinor: 1n }),
    });
    const result = await service.confirmPayment('reg-1', USER);

    expect(result.paid).toBe(false);
    expect(repository.settleTxn).not.toHaveBeenCalled();
    expect(ticketing.confirmTicketPaid).not.toHaveBeenCalled();
  });

  it('PAID, но инвойс указывает на чужой заказ → оплата НЕ подтверждается', async () => {
    const { service, ticketing } = build({
      order: ORDER,
      latestTxn: { id: 'txn-1', providerTxnId: 'inv_1' },
      getInvoiceResult: invoice({ status: 'PAID', orderRef: 'other-order' }),
    });
    const result = await service.confirmPayment('reg-1', USER);
    expect(result.paid).toBe(false);
    expect(ticketing.confirmTicketPaid).not.toHaveBeenCalled();
  });

  it('EXPIRED-инвойс → транзакция FAILED, заказ не трогаем', async () => {
    const { service, repository, ticketing } = build({
      order: ORDER,
      latestTxn: { id: 'txn-1', providerTxnId: 'inv_1' },
      getInvoiceResult: invoice({ status: 'EXPIRED' }),
    });
    const result = await service.confirmPayment('reg-1', USER);

    expect(result.paid).toBe(false);
    expect(repository.settleTxn).toHaveBeenCalledWith(
      'txn-1',
      PaymentTxStatus.FAILED,
      expect.any(Object),
    );
    expect(ticketing.confirmTicketPaid).not.toHaveBeenCalled();
  });

  it('уже PAID-заказ → идемпотентный успех без запроса к VIA', async () => {
    const { service, adapter } = build({
      order: { ...ORDER, status: OrderStatus.PAID },
    });
    const result = await service.confirmPayment('reg-1', USER);
    expect(result.paid).toBe(true);
    expect(adapter.getInvoice).not.toHaveBeenCalled();
  });
});

describe('ViaPaymentsService.handleWebhookNotification (неподписанный колбэк = только триггер)', () => {
  it('без кред → NOT_CONFIGURED (контроллер отдаст 503)', async () => {
    const { service } = build({ configured: false });
    await expect(
      service.handleWebhookNotification({ id: 'inv_1' }),
    ).resolves.toBe('NOT_CONFIGURED');
  });

  it('уведомление с invoiceId: оплата подтверждается ТОЛЬКО после опроса VIA со сверкой', async () => {
    const { service, repository, adapter, ticketing } = build({
      getInvoiceResult: invoice({ status: 'PAID' }),
    });
    repository.findTxnWithOrderByInvoiceId.mockResolvedValue({
      id: 'txn-1',
      providerTxnId: 'inv_1',
      order: {
        id: 'order-1',
        amountMinor: 5_000_000n,
        status: OrderStatus.PENDING_PAYMENT,
      },
    });

    await expect(
      service.handleWebhookNotification({ data: { id: 'inv_1', status: 'PAID' } }),
    ).resolves.toBe('OK');
    // Статус из тела уведомления сам по себе ничего не подтверждает.
    expect(adapter.getInvoice).toHaveBeenCalledWith('inv_1');
    expect(ticketing.confirmTicketPaid).toHaveBeenCalledWith(
      'order-1',
      RevenueChannel.VIA,
    );
  });

  it('тело говорит PAID, но VIA отвечает OPEN → заказ НЕ подтверждается', async () => {
    const { service, repository, ticketing } = build({
      getInvoiceResult: invoice({ status: 'OPEN' }),
    });
    repository.findTxnWithOrderByInvoiceId.mockResolvedValue({
      id: 'txn-1',
      providerTxnId: 'inv_1',
      order: {
        id: 'order-1',
        amountMinor: 5_000_000n,
        status: OrderStatus.PENDING_PAYMENT,
      },
    });

    await service.handleWebhookNotification({ id: 'inv_1', status: 'PAID' });
    expect(ticketing.confirmTicketPaid).not.toHaveBeenCalled();
  });

  it('распознаётся по externalId (наш orderId), мусорные значения отбрасываются', async () => {
    const { service, repository, adapter } = build({
      getInvoiceResult: invoice({
        status: 'PAID',
        orderRef: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      }),
    });
    repository.getOrderForSettle.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      amountMinor: 5_000_000n,
      status: OrderStatus.PENDING_PAYMENT,
    });
    repository.findLatestTxnForOrder.mockResolvedValue({
      id: 'txn-1',
      providerTxnId: 'inv_1',
    });

    await service.handleWebhookNotification({
      externalId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      id: 'not-an-invoice',
    });
    expect(adapter.getInvoice).toHaveBeenCalledWith('inv_1');
  });

  it('без externalId заказ распознаётся по эху accounts (мы кладём туда orderId)', async () => {
    const { service, repository, adapter } = build({
      getInvoiceResult: invoice({
        status: 'PAID',
        orderRef: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      }),
    });
    repository.getOrderForSettle.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      amountMinor: 5_000_000n,
      status: OrderStatus.PENDING_PAYMENT,
    });
    repository.findLatestTxnForOrder.mockResolvedValue({
      id: 'txn-1',
      providerTxnId: 'inv_1',
    });

    await service.handleWebhookNotification({
      data: {
        id: 'not-an-invoice',
        accounts: { order_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      },
    });
    expect(adapter.getInvoice).toHaveBeenCalledWith('inv_1');
  });

  it('реальный формат VIA (eventKey TRANSACTION_SUCCESS, data-обёртка) распознаётся', async () => {
    // Образец стандартного тела, присланный VIA 2026-07-24.
    const viaStandardBody = {
      eventId: 'cll_3DbvIrJAYvZOMURRAdyrSUAQVDI',
      eventKey: 'TRANSACTION_SUCCESS',
      createdAt: 1778581506995,
      data: {
        id: 'trx_3DbvGxbfYyrQK0B02Swv7NH2Cmf',
        transactionId: 'trx_3DbvGxbfYyrQK0B02Swv7NH2Cmf',
        invoiceId: 'inv_3DbvD0gmgxaUK3MLhr8ymR8mNIU',
        merchantId: 'mrt_2VbfXaVZYzcZrJuqGh6Z12333',
        amount: 1000,
        status: 'SUCCESS',
        currency: 'UZS',
        externalId: '7c6d7301-a0c6-4d84-b8c6-f29013bd647e',
        accounts: { invoice: '1234657890123' },
      },
    };
    const { service, repository, adapter, ticketing } = build({
      getInvoiceResult: invoice({
        invoiceId: 'inv_3DbvD0gmgxaUK3MLhr8ymR8mNIU',
        status: 'PAID',
      }),
    });
    repository.findTxnWithOrderByInvoiceId.mockResolvedValue({
      id: 'txn-1',
      providerTxnId: 'inv_3DbvD0gmgxaUK3MLhr8ymR8mNIU',
      order: {
        id: 'order-1',
        amountMinor: 5_000_000n,
        status: OrderStatus.PENDING_PAYMENT,
      },
    });

    await expect(
      service.handleWebhookNotification(viaStandardBody),
    ).resolves.toBe('OK');
    expect(repository.findTxnWithOrderByInvoiceId).toHaveBeenCalledWith(
      'inv_3DbvD0gmgxaUK3MLhr8ymR8mNIU',
    );
    // Как всегда: SUCCESS из тела не подтверждает — подтверждает опрос VIA.
    expect(adapter.getInvoice).toHaveBeenCalledWith(
      'inv_3DbvD0gmgxaUK3MLhr8ymR8mNIU',
    );
    expect(ticketing.confirmTicketPaid).toHaveBeenCalled();
  });

  it('нераспознанное/мусорное тело → тихий OK без обращений к VIA', async () => {
    const { service, adapter } = build();
    await expect(
      service.handleWebhookNotification({ foo: 'bar', id: 'DROP TABLE' }),
    ).resolves.toBe('OK');
    expect(adapter.getInvoice).not.toHaveBeenCalled();
  });

  it('заказ уже PAID → идемпотентный no-op без опроса VIA', async () => {
    const { service, repository, adapter } = build();
    repository.findTxnWithOrderByInvoiceId.mockResolvedValue({
      id: 'txn-1',
      providerTxnId: 'inv_1',
      order: { id: 'order-1', amountMinor: 5_000_000n, status: OrderStatus.PAID },
    });
    await service.handleWebhookNotification({ id: 'inv_1' });
    expect(adapter.getInvoice).not.toHaveBeenCalled();
  });
});

describe('ViaPaymentsService.reconcilePending (свип)', () => {
  it('без кред — тихий no-op', async () => {
    const { service, repository } = build({ configured: false });
    await expect(service.reconcilePending(new Date())).resolves.toEqual({
      confirmed: 0,
      failed: 0,
    });
    expect(repository.findStalePendingTxns).not.toHaveBeenCalled();
  });

  it('оплаченный «зависший» инвойс добирается опросом', async () => {
    const { service, repository, ticketing } = build({
      getInvoiceResult: invoice({ status: 'PAID' }),
    });
    repository.findStalePendingTxns.mockResolvedValue([
      {
        id: 'txn-1',
        providerTxnId: 'inv_1',
        order: { id: 'order-1', amountMinor: 5_000_000n },
      },
    ]);
    const result = await service.reconcilePending(new Date());
    expect(result.confirmed).toBe(1);
    expect(ticketing.confirmTicketPaid).toHaveBeenCalledWith(
      'order-1',
      RevenueChannel.VIA,
    );
  });

  it('сбой VIA на одном инвойсе не роняет весь свип', async () => {
    const { service, repository, adapter } = build();
    repository.findStalePendingTxns.mockResolvedValue([
      {
        id: 'txn-1',
        providerTxnId: 'inv_1',
        order: { id: 'order-1', amountMinor: 5_000_000n },
      },
      {
        id: 'txn-2',
        providerTxnId: 'inv_2',
        order: { id: 'order-2', amountMinor: 100n },
      },
    ]);
    adapter.getInvoice
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(
        invoice({
          invoiceId: 'inv_2',
          status: 'EXPIRED',
          orderRef: 'order-2',
          amountMinor: 100n,
        }),
      );
    const result = await service.reconcilePending(new Date());
    expect(result.failed).toBe(1);
  });
});
