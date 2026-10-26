import { NotificationDispatcherService } from './notification-dispatcher.service';
import type { NotificationIntent, NotificationRecipient } from './notification.types';

const DEVICE = {
  id: 'dev-1',
  expoPushToken: 'ExponentPushToken[x]',
  platform: 'ios',
  locale: 'ru',
};

function recipient(
  overrides: Partial<NotificationRecipient> = {},
): NotificationRecipient {
  return {
    accountId: 'acc-1',
    email: 'user@example.com',
    locale: 'ru',
    devices: [DEVICE],
    ...overrides,
  };
}

function baseIntent(
  overrides: Partial<NotificationIntent> = {},
): NotificationIntent {
  return {
    catalogId: 'REG-06',
    dedupKey: 'reg:approved:reg-1',
    kind: 'transactional',
    priority: 'high',
    channels: ['email'],
    email: { subject: 'S', template: 'registration-approved', context: {} },
    recipients: [recipient()],
    ...overrides,
  };
}

function buildDispatcher() {
  let seq = 0;
  const existing = new Set<string>();
  // Имитация composite unique (dedupKey, accountId, channel): повторный INSERT
  // того же ключа → P2002-путь репозитория → null.
  const repository = {
    createDelivery: jest.fn().mockImplementation((plan: any) => {
      const key = `${plan.dedupKey}|${plan.accountId ?? plan.organizationId}|${plan.channel}`;
      if (existing.has(key)) {
        return Promise.resolve(null);
      }
      existing.add(key);
      seq += 1;
      return Promise.resolve({
        id: `d-${seq}`,
        ...plan,
        error: plan.error ?? null,
      });
    }),
    upsertScheduled: jest.fn().mockResolvedValue({ created: true }),
    cancelScheduledBy: jest.fn().mockResolvedValue(2),
    cancelDeliveriesBy: jest.fn().mockResolvedValue(1),
    anonymizeDeliveriesForAccount: jest.fn().mockResolvedValue(3),
  };
  const rateLimiter = {
    tryConsumeInformationalPush: jest.fn().mockResolvedValue(true),
  };
  // Матрица преференсов (BL-23): по умолчанию строк-отклонений нет — всё
  // включено. Тесты enforcement подкладывают свои строки через mockResolvedValue.
  const preferences = {
    resolveForAccounts: jest.fn().mockResolvedValue(new Map()),
  };
  const inAppSender = { channel: 'in_app', dispatchDelivery: jest.fn() };
  const emailSender = { channel: 'email', dispatchDelivery: jest.fn() };
  const pushSender = { channel: 'push', dispatchDelivery: jest.fn() };

  const dispatcher = new NotificationDispatcherService(
    repository as never,
    rateLimiter as never,
    preferences as never,
    inAppSender as never,
    emailSender as never,
    pushSender as never,
  );
  return {
    dispatcher,
    repository,
    rateLimiter,
    preferences,
    inAppSender,
    emailSender,
    pushSender,
  };
}

/** Карта resolveForAccounts: accountId → (key → строка матрицы). */
function preferenceMap(
  accountId: string,
  key: string,
  channels: { push: boolean; email: boolean },
) {
  return new Map([[accountId, new Map([[key, channels]])]]);
}

describe('NotificationDispatcherService (BL-10/BL-06/BL-22)', () => {
  describe('идемпотентность dispatchNow (инвариант №1)', () => {
    it('повторный dispatchNow того же интента → P2002-noop, канал не дёргается', async () => {
      const { dispatcher, emailSender } = buildDispatcher();
      const intent = baseIntent();

      const first = await dispatcher.dispatch(intent);
      expect(first.created).toHaveLength(1);
      expect(first.deduplicated).toBe(0);
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);

      const second = await dispatcher.dispatch(intent);
      expect(second.created).toHaveLength(0);
      expect(second.deduplicated).toBe(1);
      // Дубликат НЕ ставит второй канальный job.
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);
    });

    it('fan-out: N получателей = N строк с ОДНИМ dedupKey (никто не подавлен)', async () => {
      const { dispatcher, repository } = buildDispatcher();
      const intent = baseIntent({
        recipients: [
          recipient({ accountId: 'acc-1', email: 'a@x.uz' }),
          recipient({ accountId: 'acc-2', email: 'b@x.uz' }),
          recipient({ accountId: 'acc-3', email: 'c@x.uz' }),
        ],
      });

      const result = await dispatcher.dispatchNow(intent);
      expect(result.created).toHaveLength(3);
      expect(result.deduplicated).toBe(0);
      const keys = repository.createDelivery.mock.calls.map(
        ([plan]: [any]) => plan.dedupKey,
      );
      expect(new Set(keys)).toEqual(new Set(['reg:approved:reg-1']));
    });
  });

  describe('транзакционная семантика (BL-06/OQ-27)', () => {
    it('dispatchNow с tx создаёт строки в tx, а каналы ставит только enqueue()', async () => {
      const { dispatcher, repository, emailSender } = buildDispatcher();
      const tx = { marker: 'tx' } as never;

      const result = await dispatcher.dispatchNow(baseIntent(), tx);
      expect(repository.createDelivery).toHaveBeenCalledWith(
        expect.anything(),
        tx,
      );
      // До вызова enqueue() канальных job'ов нет.
      expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();

      await result.enqueue();
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);
    });
  });

  describe('ветки получателей (BL-04/OQ-25/D-03б)', () => {
    it('получатель без Account → только email по User.email, in-app не пишется', async () => {
      const { dispatcher } = buildDispatcher();
      const intent = baseIntent({
        channels: ['push', 'in_app', 'email'],
        inApp: { type: 'REGISTRATION_APPROVED' },
        recipients: [
          recipient({ accountId: null, devices: [], email: 'legacy@x.uz' }),
        ],
      });

      const result = await dispatcher.dispatchNow(intent);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].channel).toBe('email');
      expect(result.created[0].accountId).toBeNull();
    });

    it('push→email fallback per-account: нет активных устройств → email-строка', async () => {
      const { dispatcher } = buildDispatcher();
      const intent = baseIntent({
        channels: ['push'],
        emailFallback: true,
        recipients: [recipient({ devices: [] })],
      });

      const result = await dispatcher.dispatchNow(intent);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].channel).toBe('email');
    });

    it('живое устройство есть → fallback-email НЕ создаётся', async () => {
      const { dispatcher } = buildDispatcher();
      const intent = baseIntent({
        channels: ['push'],
        emailFallback: true,
        recipients: [recipient()],
      });

      const result = await dispatcher.dispatchNow(intent);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].channel).toBe('push');
    });
  });

  describe('rate limiter (BL-22, инвариант №4)', () => {
    it('превышение бюджета → строка suppressed_rate_limit, канал не ставится', async () => {
      const { dispatcher, rateLimiter } = buildDispatcher();
      rateLimiter.tryConsumeInformationalPush.mockResolvedValue(false);
      const intent = baseIntent({
        catalogId: 'CLS-01',
        dedupKey: 'cls:interest:e1:123',
        kind: 'informational',
        priority: 'normal',
        preferenceKey: 'saved_event_alerts',
        channels: ['push'],
      });

      const result = await dispatcher.dispatchNow(intent);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].status).toBe('suppressed_rate_limit');
      expect(result.suppressed).toBe(1);
      expect(rateLimiter.tryConsumeInformationalPush).toHaveBeenCalledWith(
        'acc-1',
        'saved_event_alerts',
      );
    });

    it('transactional идёт мимо лимитера', async () => {
      const { dispatcher, rateLimiter } = buildDispatcher();
      const intent = baseIntent({ channels: ['push'] });
      await dispatcher.dispatchNow(intent);
      expect(rateLimiter.tryConsumeInformationalPush).not.toHaveBeenCalled();
    });
  });

  describe('enforcement преференсов (BL-23)', () => {
    const informational = (overrides: Partial<NotificationIntent> = {}) =>
      baseIntent({
        catalogId: 'REM-01',
        dedupKey: 'reminder:r1:24h:1',
        kind: 'informational',
        priority: 'normal',
        preferenceKey: 'event_reminders',
        channels: ['push'],
        push: { payload: {} },
        ...overrides,
      });

    it('push выключен в матрице → suppressed_preference, канал не ставится', async () => {
      const { dispatcher, preferences, pushSender } = buildDispatcher();
      preferences.resolveForAccounts.mockResolvedValue(
        preferenceMap('acc-1', 'event_reminders', { push: false, email: true }),
      );

      const result = await dispatcher.dispatch(informational());
      expect(result.created).toHaveLength(1);
      expect(result.created[0].status).toBe('suppressed_preference');
      expect(result.suppressed).toBe(1);
      expect(pushSender.dispatchDelivery).not.toHaveBeenCalled();
      expect(preferences.resolveForAccounts).toHaveBeenCalledWith(
        ['acc-1'],
        'event_reminders',
      );
    });

    it('подавленный преференсом пуш НЕ потребляет спам-бюджет лимитера', async () => {
      const { dispatcher, preferences, rateLimiter } = buildDispatcher();
      preferences.resolveForAccounts.mockResolvedValue(
        preferenceMap('acc-1', 'event_reminders', { push: false, email: true }),
      );

      await dispatcher.dispatchNow(informational());
      expect(rateLimiter.tryConsumeInformationalPush).not.toHaveBeenCalled();
    });

    it('email выключен в матрице → email-строка suppressed_preference', async () => {
      const { dispatcher, preferences, emailSender } = buildDispatcher();
      preferences.resolveForAccounts.mockResolvedValue(
        preferenceMap('acc-1', 'summary', { push: true, email: false }),
      );
      const intent = informational({
        catalogId: 'SUM-02',
        dedupKey: 'summary:e1:org',
        preferenceKey: 'summary',
        channels: ['email'],
        email: { subject: 'S', template: 'event-summary-organizer', context: {} },
      });

      const result = await dispatcher.dispatch(intent);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].channel).toBe('email');
      expect(result.created[0].status).toBe('suppressed_preference');
      expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();
    });

    it('выключенный email-канал гасит и fallback-снапшот push-строки', async () => {
      const { dispatcher, preferences, repository } = buildDispatcher();
      preferences.resolveForAccounts.mockResolvedValue(
        preferenceMap('acc-1', 'event_reminders', { push: true, email: false }),
      );
      const intent = informational({
        emailFallback: true,
        email: { subject: 'S', template: 'event-reminder', context: {} },
      });

      const result = await dispatcher.dispatchNow(intent);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].status).toBe('enqueued');
      const [plan] = repository.createDelivery.mock.calls[0] as [any];
      expect(plan.payload.fallbackEmail).toBeUndefined();
    });

    it('transactional-интент матрицу не читает и не подавляется', async () => {
      const { dispatcher, preferences } = buildDispatcher();
      const intent = baseIntent({ channels: ['push'], push: { payload: {} } });

      const result = await dispatcher.dispatchNow(intent);
      expect(result.created[0].status).toBe('enqueued');
      expect(preferences.resolveForAccounts).not.toHaveBeenCalled();
    });

    it('строки в матрице нет → дефолт «включено», доставка идёт', async () => {
      const { dispatcher, preferences } = buildDispatcher();
      preferences.resolveForAccounts.mockResolvedValue(new Map());

      const result = await dispatcher.dispatchNow(informational());
      expect(result.created[0].status).toBe('enqueued');
      expect(result.suppressed).toBe(0);
    });

    // Совместная семантика с EmailUnsubscribe (BL-23): матрица гасит email-плечо
    // здесь, one-click отписка — вторым рубежом в MailDispatchService при send
    // (mail-dispatch.suppression.spec.ts). Любой из двух opt-out'ов подавляет:
    // включённый в матрице email всё равно уходит в MailDispatchService, где
    // отписанный получатель получает suppressed_unsubscribe.
    it('включённый в матрице email ставит канальный job (unsubscribe решается при send)', async () => {
      const { dispatcher, preferences, emailSender } = buildDispatcher();
      preferences.resolveForAccounts.mockResolvedValue(
        preferenceMap('acc-1', 'summary', { push: true, email: true }),
      );
      const intent = informational({
        catalogId: 'SUM-02',
        dedupKey: 'summary:e2:org',
        preferenceKey: 'summary',
        channels: ['email'],
        email: { subject: 'S', template: 'event-summary-organizer', context: {} },
      });

      await dispatcher.dispatch(intent);
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);
    });
  });

  describe('schedule: quiet hours (OQ-12)', () => {
    it('informational-runAt из тихого окна сдвигается на 08:00 Ташкента', async () => {
      const { dispatcher, repository } = buildDispatcher();
      // 23:30 Ташкент 1 августа.
      const { runAt } = await dispatcher.schedule({
        catalogId: 'REM-01',
        dedupKey: 'reminder:r1:24h:1',
        runAt: new Date('2026-08-01T18:30:00Z'),
        kind: 'informational',
        priority: 'normal',
      });
      expect(runAt).toEqual(new Date('2026-08-02T03:00:00Z'));
      expect(repository.upsertScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ runAt: new Date('2026-08-02T03:00:00Z') }),
        'keep',
        undefined,
      );
    });

    it('transactional не сдвигается', async () => {
      const { dispatcher } = buildDispatcher();
      const at = new Date('2026-08-01T18:30:00Z');
      const { runAt } = await dispatcher.schedule({
        catalogId: 'REG-03',
        dedupKey: 'reg:payremind:o1',
        runAt: at,
        kind: 'transactional',
        priority: 'high',
      });
      expect(runAt).toEqual(at);
    });
  });

  describe('cancelBy (инвариант №3)', () => {
    it('прокидывает гранулярность types и tx в оба updateMany', async () => {
      const { dispatcher, repository } = buildDispatcher();
      const tx = { marker: 'tx' } as never;
      const input = {
        eventId: 'e1',
        types: ['REM', 'SUM'],
        reason: 'event_dates_changed',
        tx,
      };
      const result = await dispatcher.cancelBy(input);
      expect(result).toEqual({ scheduled: 2, deliveries: 1 });
      expect(repository.cancelScheduledBy).toHaveBeenCalledWith(input);
      expect(repository.cancelDeliveriesBy).toHaveBeenCalledWith(input);
    });
  });
});
