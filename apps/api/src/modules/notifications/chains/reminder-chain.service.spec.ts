import { ReminderChainService } from './reminder-chain.service';
import type {
  ScheduledMaterializer,
} from '../dispatch/notification.types';
import type { ReplanHandler } from '../dispatch/notification-replan.service';

function eventAt(startIso: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    slug: 'conf',
    title: 'Conf',
    status: 'PUBLISHED',
    startDate: new Date(startIso),
    endDate: new Date(new Date(startIso).getTime() + 4 * 3600_000),
    registrationDeadline: null,
    timezone: null,
    format: 'OFFLINE',
    onlineUrl: null,
    venue: 'IT Park',
    address: 'Tashkent',
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

function build() {
  const materializers = new Map<string, ScheduledMaterializer>();
  const replanHandlers = new Map<string, ReplanHandler>();
  const dispatcher = {
    dispatch: jest.fn(),
    schedule: jest.fn().mockResolvedValue({ created: true, runAt: new Date() }),
    cancelBy: jest.fn(),
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
    resolveRegistrationParticipant: jest.fn().mockResolvedValue({
      accountId: 'acc-p',
      email: 'p@x.uz',
      locale: 'ru',
      devices: [],
      registrationId: 'reg-1',
    }),
    resolveOrganizerAudience: jest.fn().mockResolvedValue([
      { accountId: 'acc-o', email: 'o@x.uz', locale: 'ru', devices: [] },
    ]),
  };
  const data = {
    getEventSnapshot: jest.fn(),
    getRegistration: jest.fn().mockResolvedValue({
      id: 'reg-1',
      status: 'APPROVED',
      eventId: 'e1',
      userId: 'u1',
      ticketNumber: 'EVF-1',
      user: { firstName: 'A', lastName: 'B', email: 'p@x.uz' },
    }),
    listApprovedRegistrations: jest.fn().mockResolvedValue([{ id: 'reg-1' }]),
    getPlatformSetting: jest.fn().mockResolvedValue(null),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'frontend.publicUrl' ? 'https://eventflow.uz' : undefined,
    ),
  };
  const service = new ReminderChainService(
    dispatcher as never,
    audience as never,
    data as never,
    replan as never,
    config as never,
  );
  service.onModuleInit();
  return { service, dispatcher, data, materializers, replanHandlers, audience };
}

describe('ReminderChainService (цепочка 3, REM-*)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-02T09:00:00Z').getTime());
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('REM-01: T_start−24h в ключе — eventVersion = epoch(startDate)', async () => {
    const { service, dispatcher } = build();
    const event = eventAt('2026-08-10T10:00:00Z');
    await service.scheduleForRegistration('reg-1', event);

    const version = Math.floor(
      new Date('2026-08-10T10:00:00Z').getTime() / 1000,
    );
    const rem01 = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REM-01');
    expect(rem01.dedupKey).toBe(`reminder:reg-1:24h:${version}`);
    expect(rem01.runAt).toEqual(new Date('2026-08-09T10:00:00Z'));
    expect(rem01.preferenceKey).toBe('event_reminders');
  });

  it('позднее правило (<24h до старта): ≥2h — немедленно, <2h — skip', async () => {
    const { service, dispatcher } = build();

    // Старт через 3 часа: T−24h в прошлом, до старта ≥2h → runAt = now.
    await service.scheduleForRegistration(
      'reg-1',
      eventAt('2026-08-02T12:00:00Z'),
    );
    const immediate = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REM-01');
    expect(immediate.runAt).toEqual(new Date('2026-08-02T09:00:00Z'));

    dispatcher.schedule.mockClear();
    // Старт через 1 час: <2h → строка не создаётся вовсе.
    await service.scheduleForRegistration(
      'reg-1',
      eventAt('2026-08-02T10:00:00Z'),
    );
    const skipped = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REM-01');
    expect(skipped).toBeUndefined();
  });

  it('ONLINE-событие: дополнительный REM-03 за 10 минут до старта', async () => {
    const { service, dispatcher } = build();
    await service.scheduleForRegistration(
      'reg-1',
      eventAt('2026-08-10T10:00:00Z', { format: 'ONLINE' }),
    );
    const rem03 = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REM-03');
    expect(rem03.runAt).toEqual(new Date('2026-08-10T09:50:00Z'));
    expect(rem03.dedupKey).toMatch(/^reminder:reg-1:online:\d+$/);
  });

  it('перенос даты: новый eventVersion → новые dedup-ключи (replan-хендлер зарегистрирован)', async () => {
    const { service, dispatcher, data, replanHandlers } = build();
    expect(replanHandlers.has('REM')).toBe(true);

    await service.scheduleForRegistration(
      'reg-1',
      eventAt('2026-08-10T10:00:00Z'),
    );
    const keyBefore = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REM-01').dedupKey;

    dispatcher.schedule.mockClear();
    // Перенос: replan-хендлер пересоздаёт по свежему снапшоту (resurrect).
    const moved = eventAt('2026-08-12T10:00:00Z');
    data.getEventSnapshot.mockResolvedValue(moved);
    await replanHandlers.get('REM')!(moved as never);

    const rem01 = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'REM-01');
    expect(rem01.dedupKey).not.toBe(keyBefore);
    expect(rem01.onConflict).toBe('resurrect');
    expect(rem01.runAt).toEqual(new Date('2026-08-11T10:00:00Z'));
  });

  it('publish: REM-02 организатору + персональные строки всех APPROVED', async () => {
    const { service, dispatcher } = build();
    await service.scheduleForEvent(eventAt('2026-08-10T10:00:00Z'));
    const ids = dispatcher.schedule.mock.calls.map(
      ([i]: [any]) => i.catalogId,
    );
    expect(ids).toContain('REM-02');
    expect(ids).toContain('REM-01');
  });

  describe('материализатор REM-01 (guard-перечитка)', () => {
    const row = {
      id: 's1',
      catalogId: 'REM-01',
      dedupKey: 'reminder:reg-1:24h:100',
      runAt: new Date(),
      eventId: 'e1',
      registrationId: 'reg-1',
      orderId: null,
      accountId: null,
      organizationId: null,
      context: { offsetKey: '24h', eventVersion: 100 },
    };

    it('регистрация больше не APPROVED → skip', async () => {
      const { materializers } = build();
      const start = new Date('2026-08-03T10:00:00Z');
      const result = await materializers.get('REM-01')!(
        { ...row, context: { eventVersion: Math.floor(start.getTime() / 1000) } },
        {
          event: {
            id: 'e1',
            status: 'PUBLISHED',
            startDate: start,
            endDate: start,
          },
          registration: {
            id: 'reg-1',
            status: 'CANCELLED',
            eventId: 'e1',
            userId: 'u1',
          },
        },
      );
      expect(result).toEqual({
        action: 'skip',
        reason: 'registration_not_approved',
      });
    });

    it('устаревший eventVersion (дата перенесена) → skip', async () => {
      const { materializers } = build();
      const result = await materializers.get('REM-01')!(row, {
        event: {
          id: 'e1',
          status: 'PUBLISHED',
          startDate: new Date('2026-08-03T10:00:00Z'), // epoch ≠ 100
          endDate: new Date('2026-08-03T12:00:00Z'),
        },
        registration: {
          id: 'reg-1',
          status: 'APPROVED',
          eventId: 'e1',
          userId: 'u1',
        },
      });
      expect(result).toEqual({ action: 'skip', reason: 'stale_event_version' });
    });

    it('guard-проверки пройдены → интент с push и email-fallback (event-reminder)', async () => {
      const { materializers, data } = build();
      const start = new Date('2026-08-03T10:00:00Z');
      data.getEventSnapshot.mockResolvedValue(eventAt(start.toISOString()));
      const result = await materializers.get('REM-01')!(
        {
          ...row,
          context: { eventVersion: Math.floor(start.getTime() / 1000) },
        },
        {
          event: {
            id: 'e1',
            status: 'PUBLISHED',
            startDate: start,
            endDate: start,
          },
          registration: {
            id: 'reg-1',
            status: 'APPROVED',
            eventId: 'e1',
            userId: 'u1',
          },
        },
      );
      expect(result.action).toBe('dispatch');
      if (result.action === 'dispatch') {
        expect(result.intent.email?.template).toBe('event-reminder');
        // 10:00 UTC = 15:00 Asia/Tashkent (TZ события, дефолт платформы).
        expect(result.intent.push?.params?.startTime).toBe('15:00');
      }
    });
  });
});
