import { RegistrationDigestService } from './registration-digest.service';
import { NotificationChainDataRepository } from './chain-data.repository';
import type { ScheduledMaterializer } from '../dispatch/notification.types';

function build(overrides: {
  stats?: { newCount: number; cancelledCount: number; eventsCount: number };
  organizationIds?: string[];
} = {}) {
  const materializers = new Map<string, ScheduledMaterializer>();
  const dispatcher = {
    dispatch: jest.fn(),
    schedule: jest.fn().mockResolvedValue({ created: true, runAt: new Date() }),
    registerMaterializer: jest.fn(
      (id: string, materializer: ScheduledMaterializer) => {
        materializers.set(id, materializer);
      },
    ),
  };
  const recipient = {
    accountId: 'acc-1',
    email: 'o@x.uz',
    locale: 'ru',
    devices: [],
  };
  const audience = {
    resolveAccountRecipients: jest
      .fn()
      .mockResolvedValue(new Map([['acc-1', recipient]])),
  };
  const data = {
    listDigestAccountIds: jest.fn().mockResolvedValue(['acc-1', 'acc-2']),
    listAccountOrganizationIds: jest
      .fn()
      .mockResolvedValue(overrides.organizationIds ?? ['org-1', 'org-2']),
    getDigestStats: jest.fn().mockResolvedValue(
      overrides.stats ?? { newCount: 4, cancelledCount: 1, eventsCount: 2 },
    ),
    getPlatformSetting: jest.fn().mockResolvedValue(null),
  };
  const service = new RegistrationDigestService(
    dispatcher as never,
    audience as never,
    data as never,
  );
  service.onModuleInit();
  return { service, dispatcher, audience, data, materializers };
}

describe('RegistrationDigestService (REG-22, OQ-23 per-account)', () => {
  beforeEach(() => {
    // 2026-08-02 06:00 Ташкента (01:00 UTC) — до 09:00.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-01T20:00:00Z').getTime());
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('фабрика: по строке на аккаунт, runAt = ближайшие 09:00 Asia/Tashkent', async () => {
    const { service, dispatcher } = build();
    const created = await service.scheduleUpcoming(new Date());
    expect(created).toBe(2);

    const rows = dispatcher.schedule.mock.calls.map(([i]: [any]) => i);
    // 09:00 Ташкента 2 августа = 04:00 UTC.
    expect(rows[0].runAt).toEqual(new Date('2026-08-02T04:00:00Z'));
    expect(rows[0].dedupKey).toBe('reg:digest:acc-1:2026-08-02');
    expect(rows[1].dedupKey).toBe('reg:digest:acc-2:2026-08-02');
    expect(rows[0].accountId).toBe('acc-1');
  });

  it('материализация: ОДИН пуш на аккаунт со сводкой по всем событиям', async () => {
    const { materializers, data } = build();
    const result = await materializers.get('REG-22')!(
      {
        id: 's1',
        catalogId: 'REG-22',
        dedupKey: 'reg:digest:acc-1:2026-08-02',
        runAt: new Date('2026-08-02T04:00:00Z'),
        eventId: null,
        registrationId: null,
        orderId: null,
        accountId: 'acc-1',
        organizationId: null,
        context: { dateKey: '2026-08-02' },
      },
      {},
    );
    // Окно агрегации — 24 часа до runAt, по всем организациям аккаунта.
    expect(data.getDigestStats).toHaveBeenCalledWith(
      ['org-1', 'org-2'],
      new Date('2026-08-01T04:00:00Z'),
      new Date('2026-08-02T04:00:00Z'),
    );
    expect(result.action).toBe('dispatch');
    if (result.action === 'dispatch') {
      // Семантический ключ доставки БЕЗ аккаунта (получатель — в composite).
      expect(result.intent.dedupKey).toBe('reg:digest:2026-08-02');
      expect(result.intent.push?.params).toEqual({
        newCount: 4,
        cancelledCount: 1,
        eventsCount: 2,
      });
      expect(result.intent.recipients[0].accountId).toBe('acc-1');
    }
  });

  it('затишье (0 активности) → skip, но завтрашняя строка запланирована (самоподдержание)', async () => {
    const { materializers, dispatcher } = build({
      stats: { newCount: 0, cancelledCount: 0, eventsCount: 0 },
    });
    const result = await materializers.get('REG-22')!(
      {
        id: 's1',
        catalogId: 'REG-22',
        dedupKey: 'reg:digest:acc-1:2026-08-02',
        runAt: new Date('2026-08-02T04:00:00Z'),
        eventId: null,
        registrationId: null,
        orderId: null,
        accountId: 'acc-1',
        organizationId: null,
        context: { dateKey: '2026-08-02' },
      },
      {},
    );
    expect(result).toEqual({ action: 'skip', reason: 'no_activity' });
    // Рекуррентность BL-19 не обрывается тихим днём.
    expect(dispatcher.schedule).toHaveBeenCalledWith(
      expect.objectContaining({ catalogId: 'REG-22' }),
    );
  });

  it('аккаунт без организаций с правами → skip', async () => {
    const { materializers } = build({ organizationIds: [] });
    const result = await materializers.get('REG-22')!(
      {
        id: 's1',
        catalogId: 'REG-22',
        dedupKey: 'reg:digest:acc-1:2026-08-02',
        runAt: new Date('2026-08-02T04:00:00Z'),
        eventId: null,
        registrationId: null,
        orderId: null,
        accountId: 'acc-1',
        organizationId: null,
        context: null,
      },
      {},
    );
    expect(result).toEqual({ action: 'skip', reason: 'no_organizations' });
  });
});

describe('NotificationChainDataRepository.getDigestStats (агрегат + «не first»)', () => {
  function buildRepo(groupByResults: {
    created: Array<{ eventId: string; _count: { _all: number } }>;
    cancelled: Array<{ eventId: string; _count: { _all: number } }>;
    totals: Array<{ eventId: string; _count: { _all: number } }>;
  }) {
    const groupBy = jest
      .fn()
      .mockResolvedValueOnce(groupByResults.created)
      .mockResolvedValueOnce(groupByResults.cancelled)
      .mockResolvedValueOnce(groupByResults.totals);
    const prisma = { registration: { groupBy } };
    return new NotificationChainDataRepository(prisma as never);
  }

  it('суммирует новые и отмены по событиям организаций аккаунта', async () => {
    const repo = buildRepo({
      created: [
        { eventId: 'e1', _count: { _all: 3 } },
        { eventId: 'e2', _count: { _all: 2 } },
      ],
      cancelled: [{ eventId: 'e3', _count: { _all: 1 } }],
      totals: [
        { eventId: 'e1', _count: { _all: 10 } },
        { eventId: 'e2', _count: { _all: 2 } },
      ],
    });
    const stats = await repo.getDigestStats(
      ['org-1'],
      new Date('2026-08-01T04:00:00Z'),
      new Date('2026-08-02T04:00:00Z'),
    );
    expect(stats).toEqual({ newCount: 5, cancelledCount: 1, eventsCount: 3 });
  });

  it('порог «не first»: единственная свежая регистрация события уже объявлена REG-20', async () => {
    const repo = buildRepo({
      created: [{ eventId: 'e1', _count: { _all: 1 } }],
      cancelled: [],
      totals: [{ eventId: 'e1', _count: { _all: 1 } }],
    });
    const stats = await repo.getDigestStats(
      ['org-1'],
      new Date('2026-08-01T04:00:00Z'),
      new Date('2026-08-02T04:00:00Z'),
    );
    // first-only событие исключено — дайджест не дублирует REG-20.
    expect(stats).toEqual({ newCount: 0, cancelledCount: 0, eventsCount: 0 });
  });
});
