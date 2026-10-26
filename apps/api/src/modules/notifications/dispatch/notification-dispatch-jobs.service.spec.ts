import { NotificationDispatchJobsService } from './notification-dispatch-jobs.service';
import type {
  ScheduledMaterializer,
  ScheduledRefs,
  ScheduledRowLike,
} from './notification.types';

function scheduledRow(
  overrides: Partial<ScheduledRowLike> = {},
): ScheduledRowLike {
  return {
    id: 's-1',
    catalogId: 'REM-01',
    dedupKey: 'reminder:r1:24h:1',
    runAt: new Date('2026-08-01T05:00:00Z'),
    eventId: 'e1',
    registrationId: 'r1',
    orderId: null,
    accountId: null,
    organizationId: null,
    context: { kind: 'transactional', priority: 'high' },
    ...overrides,
  };
}

function buildJobs(opts: {
  rows?: ScheduledRowLike[];
  refs?: ScheduledRefs;
  refsByRowId?: Record<string, ScheduledRefs>;
  materializer?: ScheduledMaterializer | undefined;
  stuck?: any[];
}) {
  const enqueueSpy = jest.fn().mockResolvedValue(undefined);
  const txMarker = { marker: 'tx' };
  const prisma = {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(txMarker),
    ),
  };
  const repository = {
    claimDueScheduled: jest.fn().mockResolvedValue(opts.rows ?? []),
    readScheduledRefs: jest
      .fn()
      .mockImplementation((row: ScheduledRowLike) =>
        Promise.resolve(
          opts.refsByRowId?.[row.id] ?? opts.refs ?? ({} as ScheduledRefs),
        ),
      ),
    markScheduled: jest.fn().mockResolvedValue({}),
    findStuckEnqueued: jest.fn().mockResolvedValue(opts.stuck ?? []),
    updateDelivery: jest.fn().mockResolvedValue({}),
  };
  const emailSender = { channel: 'email', dispatchDelivery: jest.fn() };
  const dispatcher = {
    resolveMaterializer: jest.fn().mockReturnValue(opts.materializer),
    dispatchNow: jest.fn().mockResolvedValue({
      created: [{ id: 'd-1' }],
      deduplicated: 0,
      suppressed: 0,
      enqueue: enqueueSpy,
    }),
    getChannelSender: jest.fn((channel: string) =>
      channel === 'email' ? emailSender : undefined,
    ),
  };
  const service = new NotificationDispatchJobsService(
    prisma as never,
    repository as never,
    dispatcher as never,
  );
  return {
    service,
    prisma,
    repository,
    dispatcher,
    enqueueSpy,
    emailSender,
    txMarker,
  };
}

describe('NotificationDispatchJobsService — тик dispatch-due (BL-10/BL-07)', () => {
  it('guard-перечитка: событие ушло из PUBLISHED → терминальный skipped', async () => {
    // REM-стайл материализатор: перечитывает статус события.
    const materializer: ScheduledMaterializer = (row, refs) =>
      Promise.resolve(
        refs.event?.status === 'PUBLISHED'
          ? { action: 'dispatch', intent: {} as never }
          : { action: 'skip', reason: 'event_not_published' },
      );
    const { service, repository, dispatcher } = buildJobs({
      rows: [scheduledRow()],
      refs: {
        event: {
          id: 'e1',
          status: 'DRAFT', // на модерацию/reject после планирования
          startDate: new Date(),
          endDate: new Date(),
        },
        registration: {
          id: 'r1',
          status: 'APPROVED',
          eventId: 'e1',
          userId: 'u1',
        },
      },
      materializer,
    });

    const result = await service.runDispatchDueTick();
    expect(result).toEqual({
      claimed: 1,
      dispatched: 0,
      skipped: 1,
      rescheduled: 0,
    });
    expect(repository.markScheduled).toHaveBeenCalledWith(
      's-1',
      { status: 'skipped', cancelReason: 'event_not_published' },
      expect.anything(),
    );
    expect(dispatcher.dispatchNow).not.toHaveBeenCalled();
  });

  it('висячая ссылка (registration=null после hard-delete) → skipped recipient_gone без вызова материализатора', async () => {
    const materializer = jest.fn();
    const { service, repository } = buildJobs({
      rows: [scheduledRow()],
      refs: {
        event: {
          id: 'e1',
          status: 'PUBLISHED',
          startDate: new Date(),
          endDate: new Date(),
        },
        registration: null,
      },
      materializer: materializer as never,
    });

    const result = await service.runDispatchDueTick();
    expect(result.skipped).toBe(1);
    expect(repository.markScheduled).toHaveBeenCalledWith(
      's-1',
      { status: 'skipped', cancelReason: 'recipient_gone' },
      expect.anything(),
    );
    expect(materializer).not.toHaveBeenCalled();
  });

  it('архивированная организация → terminal skipped без материализации и enqueue', async () => {
    const materializer = jest.fn();
    const { service, repository, dispatcher } = buildJobs({
      rows: [
        scheduledRow({
          organizationId: 'org-1',
          registrationId: null,
          eventId: null,
        }),
      ],
      refs: { organization: null },
      materializer: materializer as never,
    });

    const result = await service.runDispatchDueTick();
    expect(result.skipped).toBe(1);
    expect(repository.markScheduled).toHaveBeenCalledWith(
      's-1',
      { status: 'skipped', cancelReason: 'organization_unavailable' },
      expect.anything(),
    );
    expect(materializer).not.toHaveBeenCalled();
    expect(dispatcher.dispatchNow).not.toHaveBeenCalled();
  });

  it('строка без материализатора → терминальный skipped no_materializer', async () => {
    const { service, repository } = buildJobs({
      rows: [scheduledRow({ registrationId: null, eventId: null })],
      materializer: undefined,
    });

    const result = await service.runDispatchDueTick();
    expect(result.skipped).toBe(1);
    expect(repository.markScheduled).toHaveBeenCalledWith(
      's-1',
      { status: 'skipped', cancelReason: 'no_materializer' },
      expect.anything(),
    );
  });

  it('успешный путь: dispatchNow в tx тика, enqueue — ПОСЛЕ commit', async () => {
    const materializer: ScheduledMaterializer = () =>
      Promise.resolve({
        action: 'dispatch',
        intent: { catalogId: 'REM-01' } as never,
      });
    const { service, repository, dispatcher, enqueueSpy, txMarker } = buildJobs(
      {
        rows: [scheduledRow({ registrationId: null, eventId: null })],
        materializer,
      },
    );

    const result = await service.runDispatchDueTick();
    expect(result.dispatched).toBe(1);
    expect(dispatcher.dispatchNow).toHaveBeenCalledWith(
      { catalogId: 'REM-01' },
      txMarker,
    );
    expect(repository.markScheduled).toHaveBeenCalledWith(
      's-1',
      expect.objectContaining({ status: 'dispatched' }),
      txMarker,
    );
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
  });

  it('informational в тихом окне на исполнении → перенос runAt, строка остаётся scheduled', async () => {
    jest.useFakeTimers();
    // 23:00 Ташкент 1 августа.
    jest.setSystemTime(new Date('2026-08-01T18:00:00Z').getTime());
    try {
      const { service, repository, dispatcher } = buildJobs({
        rows: [
          scheduledRow({
            registrationId: null,
            eventId: null,
            context: { kind: 'informational', priority: 'normal' },
          }),
        ],
        materializer: jest.fn() as never,
      });

      const result = await service.runDispatchDueTick();
      expect(result.rescheduled).toBe(1);
      expect(repository.markScheduled).toHaveBeenCalledWith(
        's-1',
        { runAt: new Date('2026-08-02T03:00:00Z') },
        expect.anything(),
      );
      expect(dispatcher.dispatchNow).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('NotificationDispatchJobsService — reaper (BL-06/OQ-24/D-01)', () => {
  function stuckRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'del-1',
      dedupKey: 'reg:approved:r1',
      catalogId: 'REG-06',
      channel: 'email',
      accountId: 'acc-1',
      organizationId: null,
      eventId: null,
      registrationId: null,
      orderId: null,
      status: 'enqueued',
      providerRef: null,
      error: null,
      payload: {
        to: 'a@x.uz',
        mail: { subject: 'S', template: 't', context: {} },
      },
      createdAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    };
  }

  it('providerRef есть → sent_unconfirmed, БЕЗ повторной отправки', async () => {
    const { service, repository, emailSender } = buildJobs({
      stuck: [stuckRow({ providerRef: 'smtp-msg-1' })],
      refs: { account: { id: 'acc-1' } },
    });

    const result = await service.runReaperSweep();
    expect(result.sentUnconfirmed).toBe(1);
    expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
      status: 'sent_unconfirmed',
    });
    expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();
  });

  it('providerRef нет → ровно 1 повторная постановка (маркер ставится ДО send)', async () => {
    const { service, repository, emailSender } = buildJobs({
      stuck: [stuckRow()],
      refs: { account: { id: 'acc-1' } },
    });

    const result = await service.runReaperSweep();
    expect(result.requeued).toBe(1);
    expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
      error: 'reaper_requeued',
    });
    expect(emailSender.dispatchDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'del-1', error: 'reaper_requeued' }),
    );
    // Маркер выставлен раньше повторного send (крашеустойчивость OQ-24).
    const markerCallOrder =
      repository.updateDelivery.mock.invocationCallOrder[0];
    const sendCallOrder =
      emailSender.dispatchDelivery.mock.invocationCallOrder[0];
    expect(markerCallOrder).toBeLessThan(sendCallOrder);
  });

  it('второй проход по уже перепоставленной строке → failed, ретраи исчерпаны', async () => {
    const { service, repository, emailSender } = buildJobs({
      stuck: [stuckRow({ error: 'reaper_requeued' })],
      refs: { account: { id: 'acc-1' } },
    });

    const result = await service.runReaperSweep();
    expect(result.failed).toBe(1);
    expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
      status: 'failed',
      error: 'reaper_retry_exhausted',
    });
    expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();
  });

  it('висячий accountId (hard-delete) → терминальный skipped recipient_gone', async () => {
    const { service, repository, emailSender } = buildJobs({
      stuck: [stuckRow()],
      refs: { account: null },
    });

    const result = await service.runReaperSweep();
    expect(result.skipped).toBe(1);
    expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
      status: 'skipped',
      error: 'recipient_gone',
    });
    expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();
  });

  it('reaper не перепоставляет доставку архивированной организации', async () => {
    const { service, repository, emailSender } = buildJobs({
      stuck: [stuckRow({ organizationId: 'org-1' })],
      refs: { account: { id: 'acc-1' }, organization: null },
    });

    const result = await service.runReaperSweep();
    expect(result.skipped).toBe(1);
    expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
      status: 'skipped',
      error: 'organization_unavailable',
    });
    expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();
  });
});
