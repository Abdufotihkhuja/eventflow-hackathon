import { SummaryChainService } from './summary-chain.service';
import type { ScheduledMaterializer } from '../dispatch/notification.types';
import type { ReplanHandler } from '../dispatch/notification-replan.service';

const END = new Date('2026-08-10T18:00:00Z');
const END_VERSION = Math.floor(END.getTime() / 1000);

function eventWith(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    slug: 'conf',
    title: 'Conf',
    status: 'COMPLETED',
    startDate: new Date('2026-08-10T10:00:00Z'),
    endDate: END,
    registrationDeadline: null,
    timezone: null,
    format: 'OFFLINE',
    onlineUrl: null,
    venue: null,
    address: null,
    type: 'PAID',
    price: '150000',
    maxParticipants: null,
    registrationOpen: false,
    viewsCount: 200,
    organizationId: 'org-1',
    organizationName: 'Acme',
    rejectionReason: null,
    ...overrides,
  } as never;
}

const ATTENDEE = {
  accountId: 'acc-p',
  email: 'p@x.uz',
  locale: 'ru',
  devices: [],
  registrationId: 'reg-1',
};

function build() {
  const materializers = new Map<string, ScheduledMaterializer>();
  const replanHandlers = new Map<string, ReplanHandler>();
  const dispatcher = {
    dispatch: jest.fn(),
    schedule: jest.fn().mockResolvedValue({ created: true, runAt: new Date() }),
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
    resolveAttendedAudience: jest.fn().mockResolvedValue([ATTENDEE]),
    resolveOrganizerAudience: jest.fn().mockResolvedValue([
      { accountId: 'acc-o', email: 'o@x.uz', locale: 'ru', devices: [] },
    ]),
  };
  const data = {
    getEventSnapshot: jest.fn().mockResolvedValue(eventWith()),
    countAttendedRegistrations: jest.fn().mockResolvedValue(15),
    countRegistrations: jest.fn().mockResolvedValue(20),
    getPaidTicketStats: jest.fn().mockResolvedValue({
      paidCount: 20,
      revenueMinor: 300_000_000n,
      commissionMinor: 24_000_000n,
    }),
    getCertificateForRegistration: jest.fn().mockResolvedValue(null),
    getNextPublishedEvent: jest.fn().mockResolvedValue(null),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'frontend.publicUrl'
        ? 'https://eventflow.uz'
        : key === 'frontend.appUrl'
          ? 'https://app.eventflow.uz'
          : undefined,
    ),
  };
  const service = new SummaryChainService(
    dispatcher as never,
    audience as never,
    data as never,
    replan as never,
    config as never,
  );
  service.onModuleInit();
  return { service, dispatcher, audience, data, materializers, replanHandlers };
}

const SUM01_ROW = {
  id: 's1',
  catalogId: 'SUM-01',
  dedupKey: `sum:attendee:e1:${END_VERSION}`,
  runAt: new Date(),
  eventId: 'e1',
  registrationId: null,
  orderId: null,
  accountId: null,
  organizationId: null,
  context: { eventVersion: END_VERSION },
};

const OK_REFS = {
  event: {
    id: 'e1',
    status: 'COMPLETED',
    startDate: new Date('2026-08-10T10:00:00Z'),
    endDate: END,
  },
} as never;

describe('SummaryChainService (цепочка 5, SUM-*)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-11T09:00:00Z').getTime());
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('план от endDate: SUM-01 (T+2h) и SUM-02 (T+24h); повтор — те же ключи (единственность)', async () => {
    const { service, dispatcher } = build();
    await service.scheduleForEvent(eventWith());
    await service.scheduleForEvent(eventWith()); // рестарт/повторный publish

    const calls = dispatcher.schedule.mock.calls.map(([i]: [any]) => i);
    const sum01 = calls.filter((i) => i.catalogId === 'SUM-01');
    const sum02 = calls.filter((i) => i.catalogId === 'SUM-02');
    expect(sum01[0].dedupKey).toBe(`sum:attendee:e1:${END_VERSION}`);
    expect(sum01[0].runAt).toEqual(new Date(END.getTime() + 2 * 3600_000));
    expect(sum02[0].dedupKey).toBe(`sum:org:e1:${END_VERSION}`);
    expect(sum02[0].runAt).toEqual(new Date(END.getTime() + 24 * 3600_000));
    // Идемпотентность планировщика: повторный вызов — те же самые ключи,
    // upsert по dedupKey превращает его в noop (композит ядра держит доставку).
    expect(sum01[1].dedupKey).toBe(sum01[0].dedupKey);
    expect(sum02[1].dedupKey).toBe(sum02[0].dedupKey);
  });

  it('SUM-01: только пришедшим (OQ-11) — нет Attendance → skip', async () => {
    const { materializers, audience } = build();
    audience.resolveAttendedAudience.mockResolvedValue([]);
    const result = await materializers.get('SUM-01')!(SUM01_ROW, OK_REFS);
    expect(result).toEqual({ action: 'skip', reason: 'no_attendance' });
  });

  it('SUM-01: событие CANCELLED → подавление', async () => {
    const { materializers } = build();
    const result = await materializers.get('SUM-01')!(SUM01_ROW, {
      event: { ...((OK_REFS as any).event), status: 'CANCELLED' },
    } as never);
    expect(result).toEqual({ action: 'skip', reason: 'event_cancelled' });
  });

  it('SUM-01: fan-out per-registration ключами; сертификат меняет deep link', async () => {
    const { materializers, data, audience } = build();
    audience.resolveAttendedAudience.mockResolvedValue([
      ATTENDEE,
      { ...ATTENDEE, accountId: 'acc-2', registrationId: 'reg-2' },
    ]);
    data.getCertificateForRegistration.mockImplementation(
      (registrationId: string) =>
        registrationId === 'reg-2'
          ? Promise.resolve({ id: 'cert-2', certificateUrl: 'https://x/c.pdf' })
          : Promise.resolve(null),
    );
    const result = await materializers.get('SUM-01')!(SUM01_ROW, OK_REFS);
    expect(result.action).toBe('dispatchMany');
    if (result.action === 'dispatchMany') {
      expect(result.intents.map((i) => i.dedupKey)).toEqual([
        `sum:attendee:reg-1:${END_VERSION}`,
        `sum:attendee:reg-2:${END_VERSION}`,
      ]);
      expect(result.intents[0].push?.route).toBe('/event/[id]');
      expect(result.intents[1].push?.route).toBe('/certificate/[id]');
      expect(result.intents[1].push?.routeParams).toEqual({ id: 'cert-2' });
      expect(result.intents[1].email?.context.certificateUrl).toBe(
        'https://x/c.pdf',
      );
    }
  });

  it('SUM-01: перенос endDate (stale eventVersion) → skip', async () => {
    const { materializers } = build();
    const result = await materializers.get('SUM-01')!(
      { ...SUM01_ROW, context: { eventVersion: 1 } },
      OK_REFS,
    );
    expect(result).toEqual({ action: 'skip', reason: 'stale_event_version' });
  });

  it('SUM-02: посещаемость/конверсия/выручка в письме и in-app', async () => {
    const { materializers } = build();
    const result = await materializers.get('SUM-02')!(
      { ...SUM01_ROW, catalogId: 'SUM-02', dedupKey: `sum:org:e1:${END_VERSION}` },
      OK_REFS,
    );
    expect(result.action).toBe('dispatch');
    if (result.action === 'dispatch') {
      expect(result.intent.email?.context).toMatchObject({
        checkedInCount: 15,
        approvedCount: 20,
        attendancePercent: 75,
        conversionPercent: 10, // 20 из 200 просмотров
        revenueFormatted: '3 000 000',
      });
      expect(result.intent.orgInApp?.type).toBe('EVENT_SUMMARY');
      expect(result.intent.channels).toBeUndefined(); // каналы каталога
    }
  });

  it('SUM-02: нулевая посещаемость — email подавлен, push с нейтральной формулировкой остаётся', async () => {
    const { materializers, data } = build();
    data.countAttendedRegistrations.mockResolvedValue(0);
    const result = await materializers.get('SUM-02')!(
      { ...SUM01_ROW, catalogId: 'SUM-02', dedupKey: `sum:org:e1:${END_VERSION}` },
      OK_REFS,
    );
    expect(result.action).toBe('dispatch');
    if (result.action === 'dispatch') {
      expect(result.intent.channels).toEqual(['push', 'in_app']);
    }
  });

  it('перенос endDate: replan-хендлер SUM пересоздаёт строки новым eventVersion', async () => {
    const { dispatcher, data, replanHandlers } = build();
    const movedEnd = new Date('2026-08-12T18:00:00Z');
    const moved = eventWith({ endDate: movedEnd, status: 'PUBLISHED' });
    data.getEventSnapshot.mockResolvedValue(moved);
    await replanHandlers.get('SUM')!(moved as never);

    const sum01 = dispatcher.schedule.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'SUM-01');
    expect(sum01.dedupKey).toBe(
      `sum:attendee:e1:${Math.floor(movedEnd.getTime() / 1000)}`,
    );
    expect(sum01.onConflict).toBe('resurrect');
  });
});
