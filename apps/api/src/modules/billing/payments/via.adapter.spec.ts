import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ViaAdapter } from './via.adapter';

function buildAdapter(env: Record<string, string | undefined>) {
  const config = {
    get: jest.fn((key: string) => env[key]),
  };
  return new ViaAdapter(config as unknown as ConfigService);
}

/** orderId у нас — UUID; по нему распознаём заказ в accounts/note ответа. */
const ORDER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const FULL_ENV = {
  VIA_CLIENT_ID: 'client-id',
  VIA_CLIENT_SECRET: 'client-secret',
  VIA_MERCHANT_ID: 'mrt_test',
  VIA_API_BASE_URL: 'https://api.viasandbox.uz',
};

function mockFetchOnce(status: number, body: unknown) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
  const fetchMock = jest.fn().mockResolvedValue(response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('ViaAdapter (M-5, hosted-invoice)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('isConfigured: false без любой из трёх кред', () => {
    expect(buildAdapter({}).isConfigured()).toBe(false);
    expect(
      buildAdapter({ ...FULL_ENV, VIA_CLIENT_SECRET: undefined }).isConfigured(),
    ).toBe(false);
    expect(
      buildAdapter({ ...FULL_ENV, VIA_MERCHANT_ID: '  ' }).isConfigured(),
    ).toBe(false);
    expect(buildAdapter(FULL_ENV).isConfigured()).toBe(true);
  });

  it('createInvoice: корректный запрос (тийины, headers, БЕЗ externalId) и маппинг ответа', async () => {
    const fetchMock = mockFetchOnce(200, {
      data: {
        id: 'inv_1',
        status: 'OPEN',
        amount: 5_000_000,
        currency: 'UZS',
        redirectUrl: 'https://business.via.uz/invoice/inv_1',
      },
    });
    const adapter = buildAdapter(FULL_ENV);

    const invoice = await adapter.createInvoice({
      orderId: ORDER_ID,
      amountMinor: 5_000_000n,
      note: `EventFlow ticket ${ORDER_ID}`,
      callbackUrl: 'https://eventflow.uz/ru/payment/via/return?registrationId=r1',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.viasandbox.uz/partner/invoice');
    const headers = init.headers as Record<string, string>;
    expect(headers['client-id']).toBe('client-id');
    expect(headers['client-secret']).toBe('client-secret');
    const body = JSON.parse(init.body as string);
    expect(body.amount).toBe(5_000_000);
    expect(body.currency).toBe('UZS');
    expect(body.merchantId).toBe('mrt_test');
    // По просьбе VIA поле не передаётся: их externalId глобально уникален и
    // ломал повторную оплату того же заказа («External id already exists»).
    expect(body).not.toHaveProperty('externalId');
    // Дефолтный ключ поля услуги мерчанта — order_id (настраивается VIA_ACCOUNT_FIELD).
    expect(body.accounts).toEqual({ order_id: ORDER_ID });

    expect(invoice.invoiceId).toBe('inv_1');
    expect(invoice.status).toBe('OPEN');
    expect(invoice.amountMinor).toBe(5_000_000n);
    expect(invoice.paymentUrl).toBe('https://business.via.uz/invoice/inv_1');
    // Ответ без externalId — заказ известен из входа (fallback).
    expect(invoice.orderRef).toBe(ORDER_ID);
  });

  it('getInvoice: orderId распознаётся из accounts, а без него — из note', async () => {
    mockFetchOnce(200, {
      data: {
        id: 'inv_acc',
        status: 'PAID',
        amount: 100,
        currency: 'UZS',
        accounts: { order_id: ORDER_ID },
      },
    });
    const adapter = buildAdapter(FULL_ENV);
    await expect(
      adapter.getInvoice('inv_acc').then((i) => i.orderRef),
    ).resolves.toBe(ORDER_ID);

    mockFetchOnce(200, {
      data: {
        id: 'inv_note',
        status: 'PAID',
        amount: 100,
        currency: 'UZS',
        note: `EventFlow ticket ${ORDER_ID}`,
      },
    });
    await expect(
      buildAdapter(FULL_ENV)
        .getInvoice('inv_note')
        .then((i) => i.orderRef),
    ).resolves.toBe(ORDER_ID);
  });

  it('getInvoice: без accounts/note/externalId orderRef = null (сверка идёт по invoiceId+сумме)', async () => {
    mockFetchOnce(200, {
      data: { id: 'inv_bare', status: 'PAID', amount: 100, currency: 'UZS' },
    });
    const invoice = await buildAdapter(FULL_ENV).getInvoice('inv_bare');
    expect(invoice.orderRef).toBeNull();
  });

  it('getInvoice: PAID-инвойс с transactionInfo маппится с providerTrxId', async () => {
    mockFetchOnce(200, {
      data: {
        id: 'inv_2',
        status: 'PAID',
        amount: 100,
        currency: 'UZS',
        externalId: ORDER_ID,
        redirectUrl: null,
        transactionInfo: { id: 'trx_9' },
      },
    });
    const adapter = buildAdapter(FULL_ENV);

    const invoice = await adapter.getInvoice('inv_2');
    expect(invoice.status).toBe('PAID');
    // Старые инвойсы (созданные до отказа от поля) всё ещё возвращают externalId.
    expect(invoice.orderRef).toBe(ORDER_ID);
    expect(invoice.providerTrxId).toBe('trx_9');
  });

  it('HTTP-ошибка провайдера → ServiceUnavailableException (без утечки деталей)', async () => {
    mockFetchOnce(500, {});
    const adapter = buildAdapter(FULL_ENV);
    await expect(adapter.getInvoice('inv_3')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('ответ без data/id/status → ServiceUnavailableException', async () => {
    mockFetchOnce(200, { data: { id: 'inv_4' } });
    const adapter = buildAdapter(FULL_ENV);
    await expect(adapter.getInvoice('inv_4')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('неизвестный статус инвойса не пролезает (нормализация enum)', async () => {
    mockFetchOnce(200, {
      data: { id: 'inv_5', status: 'HACKED', amount: 1 },
    });
    const adapter = buildAdapter(FULL_ENV);
    await expect(adapter.getInvoice('inv_5')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
