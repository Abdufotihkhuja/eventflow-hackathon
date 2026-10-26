import { NotificationReconcileService } from './notification-reconcile.service';

function build() {
  const dispatcher = {
    cancelBy: jest.fn().mockResolvedValue({ scheduled: 3, deliveries: 0 }),
  };
  const publishedEvent = {
    id: 'e-live',
    status: 'PUBLISHED',
  };
  const data = {
    listEventsForReconcile: jest
      .fn()
      .mockResolvedValue([{ id: 'e-live' }, { id: 'e-completed' }]),
    getEventSnapshot: jest.fn((id: string) =>
      Promise.resolve(
        id === 'e-live'
          ? publishedEvent
          : { id: 'e-completed', status: 'COMPLETED' },
      ),
    ),
    listScheduledEventIds: jest
      .fn()
      .mockResolvedValue(['e-live', 'e-cancelled', 'e-gone']),
    getEventStates: jest.fn().mockResolvedValue(
      new Map([
        ['e-live', { status: 'PUBLISHED', deletedAt: null }],
        ['e-cancelled', { status: 'CANCELLED', deletedAt: null }],
        // e-gone отсутствует в карте — событие удалено физически.
      ]),
    ),
  };
  const reminderChain = { scheduleForEvent: jest.fn() };
  const closingChain = { scheduleForEvent: jest.fn() };
  const summaryChain = { scheduleForEvent: jest.fn() };
  const digest = { scheduleUpcoming: jest.fn().mockResolvedValue(2) };

  const service = new NotificationReconcileService(
    dispatcher as never,
    data as never,
    reminderChain as never,
    closingChain as never,
    summaryChain as never,
    digest as never,
  );
  return {
    service,
    dispatcher,
    data,
    reminderChain,
    closingChain,
    summaryChain,
    digest,
  };
}

describe('NotificationReconcileService (суточный свип, страховка инварианта №3)', () => {
  it('досоздаёт недостающие строки живых событий (REM/CLS — PUBLISHED, SUM — и COMPLETED)', async () => {
    const { service, reminderChain, closingChain, summaryChain } = build();
    const result = await service.run(new Date('2026-08-02T09:00:00Z'));

    expect(result.eventsExamined).toBe(2);
    // REM/CLS — только для PUBLISHED.
    expect(reminderChain.scheduleForEvent).toHaveBeenCalledTimes(1);
    expect(closingChain.scheduleForEvent).toHaveBeenCalledTimes(1);
    // SUM — и для COMPLETED (T_end+24h ещё впереди).
    expect(summaryChain.scheduleForEvent).toHaveBeenCalledTimes(2);
    // Идемпотентность: resurrect-режим оживляет ошибочно отменённые строки.
    expect(reminderChain.scheduleForEvent).toHaveBeenCalledWith(
      expect.anything(),
      { resurrect: true },
    );
  });

  it('гасит осиротевшие строки: событие CANCELLED или физически исчезло', async () => {
    const { service, dispatcher } = build();
    const result = await service.run(new Date());

    const cancelledFor = dispatcher.cancelBy.mock.calls.map(
      ([i]: [any]) => i.eventId,
    );
    expect(cancelledFor).toEqual(['e-cancelled', 'e-gone']);
    expect(result.orphanedCancelled).toBe(6); // 3 + 3 из мока
  });

  it('служит фабрикой digest-строк следующего дня (BL-19)', async () => {
    const { service, digest } = build();
    const result = await service.run(new Date());
    expect(digest.scheduleUpcoming).toHaveBeenCalled();
    expect(result.digestScheduled).toBe(2);
  });

  it('идемпотентен: повторный прогон не порождает ошибок и повторных отмен живых событий', async () => {
    const { service, dispatcher } = build();
    await service.run(new Date());
    await service.run(new Date());
    // e-live ни разу не попал под cancelBy.
    const cancelledFor = dispatcher.cancelBy.mock.calls.map(
      ([i]: [any]) => i.eventId,
    );
    expect(cancelledFor).not.toContain('e-live');
  });
});
