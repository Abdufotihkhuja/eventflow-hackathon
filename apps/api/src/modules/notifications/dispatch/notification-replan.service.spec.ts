import { NotificationReplanService } from './notification-replan.service';

const EVENT = {
  id: 'e1',
  status: 'PUBLISHED',
  startDate: new Date('2026-09-01T05:00:00Z'),
  endDate: new Date('2026-09-01T10:00:00Z'),
  registrationDeadline: new Date('2026-08-25T10:00:00Z'),
  timezone: null,
  organizationId: 'org-1',
};

function buildService() {
  const dispatcher = {
    cancelBy: jest.fn().mockResolvedValue({ scheduled: 1, deliveries: 0 }),
  };
  const repository = {
    getEventById: jest.fn().mockResolvedValue(EVENT),
  };
  const service = new NotificationReplanService(
    dispatcher as never,
    repository as never,
  );
  return { service, dispatcher, repository };
}

describe('NotificationReplanService (BL-03/D-05)', () => {
  describe('гранулярность cancelBy по типу изменённой даты', () => {
    it('startDate → только REM (CLS/SUM не тронуты)', async () => {
      const { service, dispatcher } = buildService();
      await service.onEventDatesChanged('e1', { startDate: true });
      expect(dispatcher.cancelBy).toHaveBeenCalledWith({
        eventId: 'e1',
        types: ['REM'],
        reason: 'event_dates_changed',
      });
    });

    it('endDate → SUM, registrationDeadline → CLS (вместе, без дублей)', async () => {
      const { service, dispatcher } = buildService();
      await service.onEventDatesChanged('e1', {
        endDate: true,
        registrationDeadline: true,
      });
      expect(dispatcher.cancelBy).toHaveBeenCalledWith({
        eventId: 'e1',
        types: ['SUM', 'CLS'],
        reason: 'event_dates_changed',
      });
    });

    it('ничего не изменилось → cancelBy не вызывается (no-op)', async () => {
      const { service, dispatcher } = buildService();
      await service.onEventDatesChanged('e1', { startDate: false });
      expect(dispatcher.cancelBy).not.toHaveBeenCalled();
    });
  });

  describe('реестр replan-функций (каркас для цепочек Батча 6)', () => {
    it('пустой реестр — no-op пересоздания, но cancelBy выполнен', async () => {
      const { service, dispatcher, repository } = buildService();
      await expect(
        service.onEventDatesChanged('e1', { startDate: true }),
      ).resolves.toBeUndefined();
      expect(dispatcher.cancelBy).toHaveBeenCalledTimes(1);
      expect(repository.getEventById).toHaveBeenCalledWith('e1');
    });

    it('зарегистрированный handler получает свежий снапшот события', async () => {
      const { service } = buildService();
      const remReplan = jest.fn().mockResolvedValue(undefined);
      const clsReplan = jest.fn().mockResolvedValue(undefined);
      service.registerReplanHandler('REM', remReplan);
      service.registerReplanHandler('CLS', clsReplan);

      await service.onEventDatesChanged('e1', { startDate: true });
      expect(remReplan).toHaveBeenCalledWith(EVENT);
      // CLS-handler не дёргается: registrationDeadline не менялся.
      expect(clsReplan).not.toHaveBeenCalled();
    });
  });

  it('сбой подсистемы уведомлений не роняет сохранение события', async () => {
    const { service, dispatcher } = buildService();
    dispatcher.cancelBy.mockRejectedValue(new Error('db down'));
    await expect(
      service.onEventDatesChanged('e1', { startDate: true }),
    ).resolves.toBeUndefined();
  });
});
