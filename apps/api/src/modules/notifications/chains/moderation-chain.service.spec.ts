import { ModerationChainService } from './moderation-chain.service';
import type { ScheduledMaterializer } from '../dispatch/notification.types';

const EVENT = {
  id: 'e1',
  slug: 'tech-summit',
  title: 'Tech Summit',
  status: 'PENDING_REVIEW',
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
  viewsCount: 0,
  organizationId: 'org-1',
  organizationName: 'Acme',
  rejectionReason: null,
};

const ORGANIZER = {
  accountId: 'acc-1',
  email: 'owner@x.uz',
  locale: 'ru',
  devices: [],
};

function build(overrides: { priorSubmissions?: number } = {}) {
  const materializers = new Map<string, ScheduledMaterializer>();
  const dispatcher = {
    dispatch: jest.fn().mockResolvedValue({
      created: [],
      deduplicated: 0,
      suppressed: 0,
      enqueue: jest.fn(),
    }),
    schedule: jest
      .fn()
      .mockResolvedValue({ created: true, runAt: new Date() }),
    cancelBy: jest.fn().mockResolvedValue({ scheduled: 1, deliveries: 0 }),
    registerMaterializer: jest.fn(
      (id: string, materializer: ScheduledMaterializer) => {
        materializers.set(id, materializer);
      },
    ),
  };
  const audience = {
    resolveOrganizerAudience: jest.fn().mockResolvedValue([ORGANIZER]),
  };
  const data = {
    getEventSnapshot: jest.fn().mockResolvedValue(EVENT),
    countPriorSubmissions: jest
      .fn()
      .mockResolvedValue(overrides.priorSubmissions ?? 0),
    countPendingReviewEvents: jest.fn().mockResolvedValue(3),
    getPlatformSetting: jest.fn().mockResolvedValue(null),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'mail.supportEmail' ? 'support@eventflow.uz' : undefined,
    ),
  };
  const reminderChain = { scheduleForEvent: jest.fn() };
  const closingChain = { scheduleForEvent: jest.fn() };
  const summaryChain = { scheduleForEvent: jest.fn() };

  const service = new ModerationChainService(
    dispatcher as never,
    audience as never,
    data as never,
    config as never,
    reminderChain as never,
    closingChain as never,
    summaryChain as never,
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
    summaryChain,
  };
}

describe('ModerationChainService (цепочка 1, MOD-*)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-02T09:00:00Z').getTime());
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('подача: MOD-01 организатору + MOD-02 модератору (submitSeq=0) + план SLA MOD-03', async () => {
    const { service, dispatcher } = build();
    await service.onEventSubmitted('e1', null);

    const window = Math.floor(Date.now() / 1000 / 600);
    const calls = dispatcher.dispatch.mock.calls.map(([i]: [any]) => i);
    const mod01 = calls.find((i) => i.catalogId === 'MOD-01');
    expect(mod01.dedupKey).toBe(`mod:submitted:e1:${window}`);
    expect(mod01.orgInApp.type).toBe('EVENT_SUBMITTED');
    expect(mod01.recipients).toEqual([ORGANIZER]);

    const mod02 = calls.find((i) => i.catalogId === 'MOD-02');
    expect(mod02.dedupKey).toBe(`mod:queue:e1:0:${window}`);
    expect(mod02.email.template).toBe('moderation-queue-new');
    // Модератор — операторский ящик (OQ-31), не Account.
    expect(mod02.recipients[0]).toMatchObject({
      accountId: null,
      email: 'support@eventflow.uz',
    });

    const sla = dispatcher.schedule.mock.calls[0][0];
    expect(sla.catalogId).toBe('MOD-03');
    expect(sla.dedupKey).toBe(
      `mod:sla:e1:${Math.floor(Date.now() / 1000)}`,
    );
    expect(sla.runAt).toEqual(
      new Date(Date.now() + 24 * 60 * 60 * 1000), // OQ-14: SLA 24h
    );
  });

  it('resubmit: MOD-06 с submitSeq в ключе (D-12) и прежней причиной в письме', async () => {
    const { service, dispatcher } = build({ priorSubmissions: 1 });
    await service.onEventSubmitted('e1', 'Обложка нечитаемая');

    const window = Math.floor(Date.now() / 1000 / 600);
    const mod06 = dispatcher.dispatch.mock.calls
      .map(([i]: [any]) => i)
      .find((i) => i.catalogId === 'MOD-06');
    // submitSeq=1 отличает resubmit от исходной подачи в том же 10-мин окне.
    expect(mod06.dedupKey).toBe(`mod:queue:e1:1:${window}`);
    expect(mod06.email.template).toBe('moderation-queue-resubmit');
    expect(mod06.email.context.previousReason).toBe('Обложка нечитаемая');
  });

  it('approve: cancel SLA + MOD-05 + план REM/CLS/SUM', async () => {
    const {
      service,
      dispatcher,
      reminderChain,
      closingChain,
      summaryChain,
    } = build();
    await service.onEventApproved('e1');

    expect(dispatcher.cancelBy).toHaveBeenCalledWith({
      eventId: 'e1',
      types: ['MOD-03'],
      reason: 'moderation_decided',
    });
    const mod05 = dispatcher.dispatch.mock.calls[0][0];
    expect(mod05.catalogId).toBe('MOD-05');
    expect(mod05.orgInApp.type).toBe('EVENT_PUBLISHED');
    // Email-плечо остаётся существующим sendEventApproved — без дубля письма.
    expect(mod05.channels).toEqual(['in_app', 'push']);
    expect(reminderChain.scheduleForEvent).toHaveBeenCalled();
    expect(closingChain.scheduleForEvent).toHaveBeenCalled();
    expect(summaryChain.scheduleForEvent).toHaveBeenCalled();
  });

  it('reject kind=changes_requested: вариантный push-ключ и in-app тип', async () => {
    const { service, dispatcher } = build();
    await service.onEventRejected('e1', 'Поправьте описание', 'changes_requested');

    const mod04 = dispatcher.dispatch.mock.calls[0][0];
    expect(mod04.catalogId).toBe('MOD-04');
    expect(mod04.push.key).toBe('push.mod.changesRequested');
    expect(mod04.orgInApp.type).toBe('EVENT_CHANGES_REQUESTED');
    expect(mod04.orgInApp.payload).toMatchObject({
      kind: 'changes_requested',
      reason: 'Поправьте описание',
    });
    expect(dispatcher.cancelBy).toHaveBeenCalledWith(
      expect.objectContaining({ types: ['MOD-03'] }),
    );
  });

  it('MOD-03 materializer: guard «всё ещё ждёт модерации»', async () => {
    const { materializers } = build();
    const materialize = materializers.get('MOD-03');
    expect(materialize).toBeDefined();

    const row = {
      id: 's1',
      catalogId: 'MOD-03',
      dedupKey: 'mod:sla:e1:123',
      runAt: new Date(),
      eventId: 'e1',
      registrationId: null,
      orderId: null,
      accountId: null,
      organizationId: null,
      context: { submitEpoch: 123 },
    };

    // Событие уже решено → терминальный skip.
    const skipped = await materialize!(row, {
      event: {
        id: 'e1',
        status: 'PUBLISHED',
        startDate: EVENT.startDate,
        endDate: EVENT.endDate,
      },
    });
    expect(skipped).toEqual({ action: 'skip', reason: 'not_pending_review' });

    // Всё ещё PENDING_REVIEW → письмо операторам.
    const dispatched = await materialize!(row, {
      event: {
        id: 'e1',
        status: 'PENDING_REVIEW',
        startDate: EVENT.startDate,
        endDate: EVENT.endDate,
      },
    });
    expect(dispatched.action).toBe('dispatch');
    if (dispatched.action === 'dispatch') {
      expect(dispatched.intent.email?.template).toBe('moderation-sla-overdue');
      expect(dispatched.intent.dedupKey).toBe('mod:sla:e1:123');
    }
  });

  it('сбой подсистемы не бросает наружу (философия emit)', async () => {
    const { service, data } = build();
    data.getEventSnapshot.mockRejectedValue(new Error('db down'));
    await expect(service.onEventSubmitted('e1', null)).resolves.toBeUndefined();
    await expect(service.onEventApproved('e1')).resolves.toBeUndefined();
  });
});
