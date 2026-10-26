import { RegistrationChainService } from './registration-chain.service';
import type { ScheduledMaterializer } from '../dispatch/notification.types';

const BASE_EVENT = {
  id: 'e1',
  slug: 'conf',
  title: 'Conf',
  status: 'PUBLISHED',
  startDate: new Date('2026-09-01T10:00:00Z'),
  endDate: new Date('2026-09-01T18:00:00Z'),
  registrationDeadline: null,
  timezone: null,
  format: 'OFFLINE',
  onlineUrl: null,
  venue: null,
  address: null,
  type: 'FREE',
  price: null,
  maxParticipants: null,
  registrationOpen: true,
  viewsCount: 10,
  organizationId: 'org-1',
  organizationName: 'Acme',
  rejectionReason: null,
};

const PARTICIPANT = {
  accountId: 'acc-p',
  email: 'p@x.uz',
  locale: 'ru',
  devices: [
    { id: 'd1', expoPushToken: 'ExponentPushToken[x]', platform: 'ios', locale: 'ru' },
  ],
  registrationId: 'reg-1',
};

const ORGANIZER = {
  accountId: 'acc-o',
  email: 'o@x.uz',
  locale: 'ru',
  devices: [],
};

function build(overrides: {
  event?: Partial<typeof BASE_EVENT>;
  totalEver?: number;
  activeCount?: number;
} = {}) {
  const materializers = new Map<string, ScheduledMaterializer>();
  const dispatcher = {
    dispatch: jest.fn().mockResolvedValue({
      created: [],
      deduplicated: 0,
      suppressed: 0,
      enqueue: jest.fn(),
    }),
    dispatchNow: jest.fn().mockResolvedValue({
      created: [],
      deduplicated: 0,
      suppressed: 0,
      enqueue: jest.fn(),
    }),
    schedule: jest.fn().mockResolvedValue({ created: true, runAt: new Date() }),
    cancelBy: jest.fn().mockResolvedValue({ scheduled: 0, deliveries: 0 }),
    registerMaterializer: jest.fn(
      (id: string, materializer: ScheduledMaterializer) => {
        materializers.set(id, materializer);
      },
    ),
  };
  const event = { ...BASE_EVENT, ...(overrides.event ?? {}) };
  const audience = {
    resolveRegistrationParticipant: jest.fn().mockResolvedValue(PARTICIPANT),
    resolveOrganizerAudience: jest.fn().mockResolvedValue([ORGANIZER]),
    resolveActiveRegistrations: jest.fn().mockResolvedValue([PARTICIPANT]),
  };
  const data = {
    getEventSnapshot: jest.fn().mockResolvedValue(event),
    getRegistration: jest.fn().mockResolvedValue({
      id: 'reg-1',
      status: 'APPROVED',
      eventId: 'e1',
      userId: 'u1',
      ticketNumber: 'EVF-260901-ABC123',
      user: { firstName: 'Ali', lastName: 'V', email: 'p@x.uz' },
    }),
    countAllRegistrations: jest.fn().mockResolvedValue(overrides.totalEver ?? 5),
    countRegistrations: jest
      .fn()
      .mockResolvedValue(overrides.activeCount ?? 5),
    getPaidOrderForRegistration: jest.fn().mockResolvedValue(null),
    getOrder: jest.fn(),
    expireOrderIfDue: jest.fn().mockResolvedValue(true),
  };
  const reminderChain = {
    scheduleForRegistration: jest.fn().mockResolvedValue(undefined),
  };
  const closingChain = {
    onSeatsChanged: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'frontend.publicUrl' ? 'https://eventflow.uz' : undefined,
    ),
  };
  const service = new RegistrationChainService(
    dispatcher as never,
    audience as never,
    data as never,
    reminderChain as never,
    closingChain as never,
    config as never,
  );
  service.onModuleInit();
  return {
    service,
    dispatcher,
    audience,
    data,
    materializers,
    reminderChain,
    closingChain,
  };
}

describe('RegistrationChainService (цепочка 2, REG-*)', () => {
  it('free-регистрация: REG-01 push+инбокс, ключ с квантом (ре-регистрация не глохнет)', async () => {
    const { service, dispatcher } = build({ totalEver: 5 });
    await service.onRegistrationCreated({
      registrationId: 'reg-1',
      eventId: 'e1',
      status: 'APPROVED' as never,
    });
    const reg01 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-01');
    expect(reg01.channels).toEqual(['push', 'in_app']);
    expect(reg01.push.key).toBe('push.reg.created');
    expect(reg01.push.route).toBe('/ticket/[id]');
    expect(reg01.dedupKey).toMatch(/^reg:created:reg-1:\d+$/);
    expect(reg01.inApp.type).toBe('REGISTRATION_CREATED');
  });

  it('REQUEST-заявка (PENDING): вариантный ключ pending и route события', async () => {
    const { service, dispatcher } = build();
    await service.onRegistrationCreated({
      registrationId: 'reg-1',
      eventId: 'e1',
      status: 'PENDING' as never,
    });
    const reg01 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-01');
    expect(reg01.push.key).toBe('push.reg.pending');
    expect(reg01.push.route).toBe('/event/[id]');
  });

  it('OQ-21: платный флоу сливает REG-01+REG-02 — пуш создания не шлётся', async () => {
    const { service, dispatcher } = build({
      event: { type: 'PAID', price: '150000' as never },
    });
    await service.onRegistrationCreated({
      registrationId: 'reg-1',
      eventId: 'e1',
      status: 'PENDING' as never,
    });
    const reg01 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-01');
    // Только тихий инбокс; push отдан чекауту (REG-02 «оплатите до HH:mm»).
    expect(reg01.channels).toEqual(['in_app']);
  });

  it('REG-20: первая регистрация — push организатору, in-app не дублируется (EXIST-N-01)', async () => {
    const { service, dispatcher } = build({ totalEver: 1, activeCount: 1 });
    await service.onRegistrationCreated({
      registrationId: 'reg-1',
      eventId: 'e1',
      status: 'APPROVED' as never,
    });
    const reg20 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-20');
    expect(reg20.dedupKey).toBe('reg:first:e1');
    expect(reg20.channels).toEqual(['push']);
  });

  it('REG-21: пересечение порога 80% — push+in-app; ключ порога без времени (антифлаппинг)', async () => {
    const { service, dispatcher } = build({
      event: { maxParticipants: 10 },
      activeCount: 8, // prev=7 <80%; new=8 = 80%
    });
    await service.onRegistrationCreated({
      registrationId: 'reg-1',
      eventId: 'e1',
      status: 'APPROVED' as never,
    });
    const reg21 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .filter((i) => i.catalogId === 'REG-21');
    expect(reg21).toHaveLength(1);
    expect(reg21[0].dedupKey).toBe('reg:capacity:e1:80');
    expect(reg21[0].channels).toEqual(['push', 'in_app']);
    expect(reg21[0].push.key).toBe('push.org.capacity80');
  });

  it('REG-21: порог 50% — только in-app (спам-бюджет E-(б), BL-29)', async () => {
    const { service, dispatcher } = build({
      event: { maxParticipants: 10 },
      activeCount: 5,
    });
    await service.onRegistrationCreated({
      registrationId: 'reg-1',
      eventId: 'e1',
      status: 'APPROVED' as never,
    });
    const reg21 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-21');
    expect(reg21.channels).toEqual(['in_app']);
  });

  it('REG-21: без пересечения порога вверх пуша нет', async () => {
    const { service, dispatcher } = build({
      event: { maxParticipants: 10 },
      activeCount: 7, // prev=6, порог 50 пройден раньше, 80 не достигнут
    });
    await service.onRegistrationCreated({
      registrationId: 'reg-1',
      eventId: 'e1',
      status: 'APPROVED' as never,
    });
    const reg21 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-21');
    expect(reg21).toBeUndefined();
  });

  it('approve: REG-06 (оживший email registration-approved) + план REM', async () => {
    const { service, dispatcher, reminderChain } = build();
    await service.onRegistrationApproved('reg-1');
    const reg06 = dispatcher.dispatch.mock.calls[0][0];
    expect(reg06.catalogId).toBe('REG-06');
    expect(reg06.dedupKey).toMatch(/^reg:approved:reg-1:\d+$/);
    expect(reg06.email.template).toBe('registration-approved');
    expect(reg06.email.context.ticketNumber).toBe('EVF-260901-ABC123');
    expect(reg06.inApp.type).toBe('REGISTRATION_APPROVED');
    expect(reminderChain.scheduleForRegistration).toHaveBeenCalled();
  });

  it('reject: REG-07 (оживший email registration-rejected) + снятие плана', async () => {
    const { service, dispatcher } = build();
    await service.onRegistrationRejected('reg-1', 'Мест нет');
    const reg07 = dispatcher.dispatch.mock.calls[0][0];
    expect(reg07.catalogId).toBe('REG-07');
    expect(reg07.email.template).toBe('registration-rejected');
    expect(reg07.email.context.reason).toBe('Мест нет');
    expect(dispatcher.cancelBy).toHaveBeenCalledWith({
      registrationId: 'reg-1',
      reason: 'registration_rejected',
    });
  });

  it('отмена события: cancelBy(eventId) + REG-10 per-registration ключами', async () => {
    const { service, dispatcher } = build();
    await service.onEventCancelled('e1');
    expect(dispatcher.cancelBy).toHaveBeenCalledWith({
      eventId: 'e1',
      reason: 'event_cancelled',
    });
    const reg10 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-10');
    expect(reg10.dedupKey).toBe('reg:cancelled:reg-1');
    expect(reg10.inApp.type).toBe('EVENT_CANCELLED');
  });

  it('чекаут: слитый REG-02 в tx + план REG-03 (T+10м) и REG-04 (hold)', async () => {
    const { service, dispatcher } = build();
    const tx = { marker: 'tx' } as never;
    const holdExpiresAt = new Date(Date.now() + 15 * 60_000);
    const enqueue = await service.onCheckoutCreated(
      {
        id: 'ord-1',
        registrationId: 'reg-1',
        eventId: 'e1',
        holdExpiresAt,
      },
      tx,
    );
    expect(typeof enqueue).toBe('function');

    // Delivery-строки — в транзакции домена (BL-06).
    expect(dispatcher.dispatchNow).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogId: 'REG-02',
        dedupKey: 'reg:payhold:ord-1',
      }),
      tx,
    );
    const scheduleCalls = dispatcher.schedule.mock.calls;
    expect(scheduleCalls[0][0]).toMatchObject({
      catalogId: 'REG-03',
      dedupKey: 'reg:payremind:ord-1',
    });
    expect(scheduleCalls[0][1]).toBe(tx);
    expect(scheduleCalls[1][0]).toMatchObject({
      catalogId: 'REG-04',
      dedupKey: 'reg:payexpired:ord-1',
      runAt: holdExpiresAt,
    });
  });

  it('оплата: cancelBy(orderId) + REG-06', async () => {
    const { service, dispatcher } = build();
    await service.onTicketPaid({ id: 'ord-1', registrationId: 'reg-1' });
    expect(dispatcher.cancelBy).toHaveBeenCalledWith({
      orderId: 'ord-1',
      reason: 'order_paid',
    });
    const reg06 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REG-06');
    expect(reg06).toBeDefined();
  });

  it('REG-05: только живой PENDING_PAYMENT-заказ kind=TICKET_SALE (B-05)', async () => {
    const { service, dispatcher, data } = build();
    data.getOrder.mockResolvedValue({
      id: 'ord-1',
      status: 'PAID',
      kind: 'TICKET_SALE',
      registrationId: 'reg-1',
      eventId: 'e1',
    });
    await service.onPaymentFailed('ord-1', 'txn-1');
    expect(dispatcher.dispatch).not.toHaveBeenCalled();

    data.getOrder.mockResolvedValue({
      id: 'ord-1',
      status: 'PENDING_PAYMENT',
      kind: 'TICKET_SALE',
      registrationId: 'reg-1',
      eventId: 'e1',
    });
    await service.onPaymentFailed('ord-1', 'txn-1');
    const reg05 = dispatcher.dispatch.mock.calls[0][0];
    expect(reg05.catalogId).toBe('REG-05');
    expect(reg05.dedupKey).toBe('reg:payfailed:ord-1:txn-1');
  });

  describe('материализаторы платёжного плеча', () => {
    const row = {
      id: 's1',
      catalogId: 'REG-04',
      dedupKey: 'reg:payexpired:ord-1',
      runAt: new Date(),
      eventId: 'e1',
      registrationId: 'reg-1',
      orderId: 'ord-1',
      accountId: null,
      organizationId: null,
      context: null,
    };

    it('REG-03: guard — заказ уже решён → skip', async () => {
      const { materializers } = build();
      const materialize = materializers.get('REG-03')!;
      const result = await materialize(
        { ...row, catalogId: 'REG-03', dedupKey: 'reg:payremind:ord-1' },
        {
          order: { id: 'ord-1', status: 'PAID', kind: 'TICKET_SALE' },
          registration: {
            id: 'reg-1',
            status: 'PENDING',
            eventId: 'e1',
            userId: 'u1',
          },
          event: { id: 'e1', status: 'PUBLISHED' } as never,
        },
      );
      expect(result).toEqual({ action: 'skip', reason: 'order_settled' });
    });

    it('REG-04: job — триггер экспирации; оплата успела → тихий skip', async () => {
      const { materializers, data } = build();
      const materialize = materializers.get('REG-04')!;
      const settled = await materialize(row, {
        order: { id: 'ord-1', status: 'PAID', kind: 'TICKET_SALE' },
      });
      expect(settled).toEqual({ action: 'skip', reason: 'order_settled' });
      expect(data.expireOrderIfDue).not.toHaveBeenCalled();
    });

    it('REG-04: истёкший hold → EXPIRED + пуш участнику + REG-23 in-app организатору', async () => {
      const { materializers, data, dispatcher } = build();
      data.getOrder.mockResolvedValue({
        id: 'ord-1',
        status: 'PENDING_PAYMENT',
        kind: 'TICKET_SALE',
        registrationId: 'reg-1',
        eventId: 'e1',
        holdExpiresAt: new Date(Date.now() - 60_000),
      });
      const materialize = materializers.get('REG-04')!;
      const result = await materialize(row, {
        order: { id: 'ord-1', status: 'PENDING_PAYMENT', kind: 'TICKET_SALE' },
      });
      expect(data.expireOrderIfDue).toHaveBeenCalledWith(
        'ord-1',
        expect.any(Date),
      );
      // REG-23 (EXPIRED-ветка: только in-app) — параллельная эмиссия.
      const reg23 = dispatcher.dispatch.mock.calls
        .map(([i]: [any]) => i)
        .find((i) => i.catalogId === 'REG-23');
      expect(reg23.dedupKey).toBe('reg:orgrefund:ord-1');
      expect(reg23.channels).toEqual(['in_app']);
      expect(result.action).toBe('dispatch');
      if (result.action === 'dispatch') {
        expect(result.intent.catalogId).toBe('REG-04');
        expect(result.intent.inApp?.type).toBe('HOLD_EXPIRED');
      }
    });
  });
});
