import { ClosingChainService } from './closing-chain.service';
import type { ScheduledMaterializer } from '../dispatch/notification.types';
import type { ReplanHandler } from '../dispatch/notification-replan.service';

const DEADLINE = new Date('2026-08-20T18:00:00Z');
const DEADLINE_EPOCH = Math.floor(DEADLINE.getTime() / 1000);

function eventWith(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    slug: 'conf',
    title: 'Conf',
    status: 'PUBLISHED',
    startDate: new Date('2026-08-21T10:00:00Z'),
    endDate: new Date('2026-08-21T18:00:00Z'),
    registrationDeadline: DEADLINE,
    timezone: null,
    format: 'OFFLINE',
    onlineUrl: null,
    venue: null,
    address: null,
    type: 'FREE',
    price: null,
    maxParticipants: null,
    registrationOpen: true,
    viewsCount: 0,
    organizationId: 'org-1',
    organizationName: 'Acme',
    rejectionReason: null,
    ...overrides,
  } as never;
}

const SAVED_USER = {
  accountId: 'acc-s',
  email: 's@x.uz',
  locale: 'ru',
  devices: [],
};

function build() {
  const materializers = new Map<string, ScheduledMaterializer>();
  const replanHandlers = new Map<string, ReplanHandler>();
  const dispatcher = {
    dispatch: jest.fn().mockResolvedValue({
      created: [],
      deduplicated: 0,
      suppressed: 0,
      enqueue: jest.fn(),
    }),
    schedule: jest.fn().mockResolvedValue({ created: true, runAt: new Date() }),
    cancelBy: jest.fn().mockResolvedValue({ scheduled: 1, deliveries: 0 }),
    registerMaterializer: jest.fn(
      (id: string, materializer: ScheduledMaterializer) => {
        materializers.set(id, materializer);
      },
    ),
  };
  const replan = {
    registerReplanHandler: jest.fn((prefix: string, handler: ReplanHandler) => {
      replanHandlers.set(prefix, handler);
    }),
  };
  const audience = {
    resolveSavedEventAudience: jest.fn().mockResolvedValue([SAVED_USER]),
    resolveOrganizerAudience: jest.fn().mockResolvedValue([
      { accountId: 'acc-o', email: 'o@x.uz', locale: 'ru', devices: [] },
    ]),
  };
  const data = {
    getEventSnapshot: jest.fn().mockResolvedValue(eventWith()),
    countRegistrations: jest.fn().mockResolvedValue(7),
    getPaidTicketStats: jest.fn().mockResolvedValue({
      paidCount: 2,
      revenueMinor: 30_000_000n,
      commissionMinor: 2_400_000n,
    }),
    getCls01SaturatedAccounts: jest.fn().mockResolvedValue(new Set()),
  };
  const service = new ClosingChainService(
    dispatcher as never,
    audience as never,
    data as never,
    replan as never,
  );
  service.onModuleInit();
  return { service, dispatcher, audience, data, materializers, replanHandlers };
}

describe('ClosingChainService (цепочка 4, CLS-*)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-02T09:00:00Z').getTime());
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('план от дедлайна: CLS-01 (T−24h) и CLS-03 (T+5м) с deadlineEpoch в ключах', async () => {
    const { service, dispatcher } = build();
    await service.scheduleForEvent(eventWith());

    const calls = dispatcher.schedule.mock.calls.map(([i]: [any]) => i);
    const cls01 = calls.find((i) => i.catalogId === 'CLS-01');
    expect(cls01.dedupKey).toBe(`cls:interest:e1:${DEADLINE_EPOCH}`);
    expect(cls01.runAt).toEqual(new Date(DEADLINE.getTime() - 24 * 3600_000));
    expect(cls01.preferenceKey).toBe('saved_event_alerts');

    const cls03 = calls.find((i) => i.catalogId === 'CLS-03');
    expect(cls03.dedupKey).toBe(`cls:orgsummary:e1:${DEADLINE_EPOCH}`);
    expect(cls03.runAt).toEqual(new Date(DEADLINE.getTime() + 5 * 60_000));
  });

  it('без дедлайна плановые CLS не активируются', async () => {
    const { service, dispatcher } = build();
    await service.scheduleForEvent(eventWith({ registrationDeadline: null }));
    expect(dispatcher.schedule).not.toHaveBeenCalled();
  });

  it('ручное закрытие: cancel CLS-плана + немедленный CLS-03 с closeEpoch-ключом (D-11)', async () => {
    const { service, dispatcher, data } = build();
    data.getEventSnapshot.mockResolvedValue(
      eventWith({ registrationDeadline: null, registrationOpen: false }),
    );
    await service.onRegistrationToggle('e1', false);

    expect(dispatcher.cancelBy).toHaveBeenCalledWith({
      eventId: 'e1',
      types: ['CLS'],
      reason: 'registration_closed_manually',
    });
    const cls03 = dispatcher.dispatch.mock.calls[0][0];
    expect(cls03.catalogId).toBe('CLS-03');
    // closeEpoch (момент закрытия), а не deadlineEpoch: работает и без
    // дедлайна, «закрыл→открыл→закрыл» даёт новый ключ.
    expect(cls03.dedupKey).toBe(
      `cls:orgsummary:e1:${Math.floor(Date.now() / 1000)}`,
    );
    expect(cls03.orgInApp.type).toBe('REGISTRATION_CLOSED');
    expect(cls03.push.params).toMatchObject({ totalCount: 7, pendingCount: 7 });
  });

  it('переоткрытие: план пересоздаётся с resurrect (отменённые строки оживают)', async () => {
    const { service, dispatcher } = build();
    await service.onRegistrationToggle('e1', true);
    const cls01 = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'CLS-01');
    expect(cls01.onConflict).toBe('resurrect');
  });

  it('CLS-02: порог max(3, 10%) — единый ключ на событие (антифлаппинг composite unique)', async () => {
    const { service, dispatcher, data } = build();
    data.countRegistrations.mockResolvedValue(18); // 20 мест, осталось 2 ≤ 3
    await service.onSeatsChanged(eventWith({ maxParticipants: 20 }));

    const cls02 = dispatcher.dispatch.mock.calls[0][0];
    expect(cls02.catalogId).toBe('CLS-02');
    expect(cls02.dedupKey).toBe('cls:seats:e1'); // без порога и времени
    expect(cls02.push.params.seatsLeft).toBe(2);
  });

  it('CLS-02: остаток выше порога — тишина; 0 мест — cancel CLS-01/02', async () => {
    const { service, dispatcher, data } = build();
    data.countRegistrations.mockResolvedValue(10);
    await service.onSeatsChanged(eventWith({ maxParticipants: 20 }));
    expect(dispatcher.dispatch).not.toHaveBeenCalled();

    data.countRegistrations.mockResolvedValue(20);
    await service.onSeatsChanged(eventWith({ maxParticipants: 20 }));
    expect(dispatcher.cancelBy).toHaveBeenCalledWith({
      eventId: 'e1',
      types: ['CLS-01', 'CLS-02'],
      reason: 'capacity_full',
    });
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  describe('материализатор CLS-01 (BL-18 guard-ы)', () => {
    const row = {
      id: 's1',
      catalogId: 'CLS-01',
      dedupKey: `cls:interest:e1:${DEADLINE_EPOCH}`,
      runAt: new Date(),
      eventId: 'e1',
      registrationId: null,
      orderId: null,
      accountId: null,
      organizationId: null,
      context: { deadlineEpoch: DEADLINE_EPOCH },
    };
    const refs = {
      event: {
        id: 'e1',
        status: 'PUBLISHED',
        startDate: new Date('2026-08-21T10:00:00Z'),
        endDate: new Date('2026-08-21T18:00:00Z'),
      },
    } as never;

    it('регистрация закрыта тумблером → skip', async () => {
      const { materializers, data } = build();
      data.getEventSnapshot.mockResolvedValue(
        eventWith({ registrationOpen: false }),
      );
      const result = await materializers.get('CLS-01')!(row, refs);
      expect(result).toEqual({ action: 'skip', reason: 'registration_closed' });
    });

    it('дедлайн перенесён (stale epoch) → skip', async () => {
      const { materializers, data } = build();
      data.getEventSnapshot.mockResolvedValue(
        eventWith({
          registrationDeadline: new Date('2026-08-25T18:00:00Z'),
        }),
      );
      const result = await materializers.get('CLS-01')!(row, refs);
      expect(result).toEqual({ action: 'skip', reason: 'stale_deadline' });
    });

    it('аудитория перечитывается при отправке; насыщенные (D-10 cap 2) отсеяны', async () => {
      const { materializers, data, audience } = build();
      data.getCls01SaturatedAccounts.mockResolvedValue(new Set(['acc-s']));
      const saturated = await materializers.get('CLS-01')!(row, refs);
      // Единственный получатель уже получил 2 CLS-01 → некому слать.
      expect(saturated).toEqual({ action: 'skip', reason: 'no_recipients' });

      data.getCls01SaturatedAccounts.mockResolvedValue(new Set());
      const ok = await materializers.get('CLS-01')!(row, refs);
      expect(ok.action).toBe('dispatch');
      expect(audience.resolveSavedEventAudience).toHaveBeenCalledWith('e1');
    });
  });

  it('материализатор CLS-03: дедлайн прошёл → итог с pending-блоком', async () => {
    const { materializers, data } = build();
    jest.setSystemTime(new Date('2026-08-20T18:06:00Z').getTime()); // после дедлайна
    data.countRegistrations
      .mockResolvedValueOnce(21) // PENDING+APPROVED
      .mockResolvedValueOnce(3); // PENDING
    const result = await materializers.get('CLS-03')!(
      {
        id: 's2',
        catalogId: 'CLS-03',
        dedupKey: `cls:orgsummary:e1:${DEADLINE_EPOCH}`,
        runAt: new Date(),
        eventId: 'e1',
        registrationId: null,
        orderId: null,
        accountId: null,
        organizationId: 'org-1',
        context: { deadlineEpoch: DEADLINE_EPOCH },
      },
      {
        event: {
          id: 'e1',
          status: 'PUBLISHED',
          startDate: new Date('2026-08-21T10:00:00Z'),
          endDate: new Date('2026-08-21T18:00:00Z'),
        },
      },
    );
    expect(result.action).toBe('dispatch');
    if (result.action === 'dispatch') {
      expect(result.intent.push?.params).toMatchObject({
        totalCount: 21,
        pendingCount: 3,
      });
      expect(result.intent.orgInApp?.payload).toMatchObject({
        revenueMinor: '30000000',
      });
    }
  });
});
