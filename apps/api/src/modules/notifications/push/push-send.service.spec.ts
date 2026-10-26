import type { ExpoPushMessage } from 'expo-server-sdk';
import { PushSendService } from './push-send.service';

/**
 * Push-канал backend (BL-14/BL-02):
 * - чанкование ≤100, ошибка чанка не роняет батч;
 * - providerRef (ticket id'ы) фиксируется ДО перевода в sent;
 * - DeviceNotRegistered → деактивация токена + email-fallback per-account
 *   (только когда НИ ОДНО устройство не получило push);
 * - деградация выключенного канала (без кредов BL-12).
 */

const FALLBACK_MAIL = {
  subject: 'S',
  template: 'registration-approved',
  context: {},
};

function deliveryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'del-1',
    dedupKey: 'reg:approved:reg-1',
    catalogId: 'REG-06',
    channel: 'push',
    accountId: 'acc-1',
    organizationId: null,
    eventId: 'evt-1',
    registrationId: 'reg-1',
    orderId: null,
    status: 'enqueued',
    providerRef: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    payload: {
      locale: 'ru',
      push: {
        params: { eventTitle: 'Tech Meetup' },
        routeParams: { id: 'reg-1' },
        payload: {},
      },
      fallbackEmail: { to: 'user@x.uz', mail: FALLBACK_MAIL },
    },
    ...overrides,
  };
}

function devices(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `dev-${i + 1}`,
    expoPushToken: `ExponentPushToken[tok-${i + 1}]`,
    locale: 'ru',
  }));
}

function buildService({
  enabled = true,
  deviceCount = 1,
  delivery = deliveryRow(),
}: {
  enabled?: boolean;
  deviceCount?: number;
  delivery?: ReturnType<typeof deliveryRow>;
} = {}) {
  const prisma = {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: 'org-1' }),
    },
    notificationDelivery: {
      findUnique: jest.fn().mockResolvedValue(delivery),
    },
    deviceToken: {
      findMany: jest.fn().mockResolvedValue(devices(deviceCount)),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    accountNotification: {
      count: jest.fn().mockResolvedValue(2),
    },
  };
  const queueService = {
    enqueuePushSend: jest.fn().mockResolvedValue({ jobId: 'j-1' }),
    enqueuePushReceipts: jest.fn().mockResolvedValue({ jobId: 'j-2' }),
  };
  const expoClient = {
    enabled,
    isExpoPushToken: jest.fn().mockReturnValue(true),
    chunkMessages: jest.fn((messages: ExpoPushMessage[]) => {
      const chunks: ExpoPushMessage[][] = [];
      for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
      }
      return chunks;
    }),
    sendChunk: jest.fn(),
    chunkReceiptIds: jest.fn((ids: string[]) => [ids]),
    getReceipts: jest.fn(),
  };
  const createdFallbacks: unknown[] = [];
  const repository = {
    getDelivery: jest.fn().mockResolvedValue(delivery),
    updateDelivery: jest.fn().mockResolvedValue(undefined),
    createDelivery: jest.fn().mockImplementation((plan: unknown) => {
      createdFallbacks.push(plan);
      return Promise.resolve({
        id: 'del-fallback',
        ...(plan as Record<string, unknown>),
      });
    }),
  };
  const emailSender = { dispatchDelivery: jest.fn() };

  const service = new PushSendService(
    prisma as never,
    queueService as never,
    expoClient as never,
    repository as never,
    emailSender as never,
  );
  return {
    service,
    prisma,
    queueService,
    expoClient,
    repository,
    emailSender,
    createdFallbacks,
  };
}

const JOB = {
  jobId: 'push:del-1',
  type: 'push.send' as const,
  entityId: 'del-1',
  deliveryId: 'del-1',
};

describe('PushSendService (BL-14/BL-02)', () => {
  describe('чанкование ≤100 (BL-02)', () => {
    it('101 устройство → 2 чанка; ошибка первого не мешает второму', async () => {
      const { service, expoClient, repository, queueService, emailSender } =
        buildService({ deviceCount: 101 });
      expoClient.sendChunk
        .mockRejectedValueOnce(new Error('Expo 502'))
        .mockImplementationOnce((chunk: ExpoPushMessage[]) =>
          Promise.resolve(
            chunk.map((_, i) => ({ status: 'ok', id: `ticket-${i}` })),
          ),
        );

      const result = await service.processSendJob(JOB);

      expect(expoClient.sendChunk).toHaveBeenCalledTimes(2);
      expect(expoClient.sendChunk.mock.calls[0][0]).toHaveLength(100);
      expect(expoClient.sendChunk.mock.calls[1][0]).toHaveLength(1);
      // Второй чанк дошёл: доставка sent, receipts-опрос запланирован.
      expect(result).toEqual({ status: 'sent', tickets: 1 });
      expect(queueService.enqueuePushReceipts).toHaveBeenCalledTimes(1);
      // Fallback не срабатывает: хотя бы одно устройство получило push.
      expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();

      // BL-06: providerRef зафиксирован отдельным апдейтом ДО status=sent.
      const updates = repository.updateDelivery.mock.calls;
      const providerRefUpdate = updates.findIndex(
        ([, data]: [string, { providerRef?: string }]) =>
          data.providerRef === 'ticket-0',
      );
      const sentUpdate = updates.findIndex(
        ([, data]: [string, { status?: string }]) => data.status === 'sent',
      );
      expect(providerRefUpdate).toBeGreaterThanOrEqual(0);
      expect(sentUpdate).toBeGreaterThan(providerRefUpdate);
    });

    it('все чанки упали → throw (ретраи BullMQ), строка остаётся enqueued', async () => {
      const { service, expoClient, repository } = buildService({
        deviceCount: 101,
      });
      expoClient.sendChunk.mockRejectedValue(new Error('network down'));

      await expect(service.processSendJob(JOB)).rejects.toThrow(
        'не отправлены',
      );
      // Терминальных статусов не выставлено — судьбу решают ретраи/reaper.
      const statuses = repository.updateDelivery.mock.calls
        .map(([, data]: [string, { status?: string }]) => data.status)
        .filter(Boolean);
      expect(statuses).toEqual([]);
    });
  });

  describe('DeviceNotRegistered → деактивация + fallback per-account', () => {
    it('все ticket-ошибки DNR: токены деактивированы, delivery failed, email-fallback создан', async () => {
      const { service, expoClient, prisma, repository, emailSender } =
        buildService({ deviceCount: 2 });
      expoClient.sendChunk.mockResolvedValue([
        {
          status: 'error',
          message: 'x',
          details: { error: 'DeviceNotRegistered' },
        },
        {
          status: 'error',
          message: 'x',
          details: { error: 'DeviceNotRegistered' },
        },
      ]);

      const result = await service.processSendJob(JOB);
      expect(result.status).toBe('failed');

      // Оба токена деактивированы с причиной device_not_registered.
      const disables = prisma.deviceToken.updateMany.mock.calls.filter(
        ([args]: [{ data: { disabledReason?: string } }]) =>
          args.data.disabledReason === 'device_not_registered',
      );
      expect(disables).toHaveLength(2);

      // Fallback: вторая строка с тем же dedupKey, channel=email.
      expect(repository.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          dedupKey: 'reg:approved:reg-1',
          channel: 'email',
          accountId: 'acc-1',
        }),
      );
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);
    });

    it('receipts: DNR-receipt деактивирует токен; все receipts — ошибки → fallback', async () => {
      const sentDelivery = deliveryRow({
        status: 'sent',
        providerRef: 'ticket-1,ticket-2',
        payload: {
          ...deliveryRow().payload,
          pushTickets: [
            { deviceId: 'dev-1', ticketId: 'ticket-1' },
            { deviceId: 'dev-2', ticketId: 'ticket-2' },
          ],
        },
      });
      const { service, expoClient, prisma, repository, emailSender } =
        buildService({ delivery: sentDelivery });
      expoClient.getReceipts.mockResolvedValue({
        'ticket-1': {
          status: 'error',
          message: 'gone',
          details: { error: 'DeviceNotRegistered' },
        },
        'ticket-2': {
          status: 'error',
          message: 'gone',
          details: { error: 'DeviceNotRegistered' },
        },
      });

      const result = await service.processReceiptsJob({
        jobId: 'push-receipts:del-1',
        type: 'push.receipts',
        entityId: 'del-1',
        deliveryId: 'del-1',
      });

      expect(result).toEqual({ status: 'failed', deactivated: 2 });
      expect(prisma.deviceToken.updateMany).toHaveBeenCalledTimes(2);
      expect(repository.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'email' }),
      );
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);
    });

    it('receipts: хотя бы один ok → delivered, fallback НЕ создаётся (per-account)', async () => {
      const sentDelivery = deliveryRow({
        status: 'sent',
        providerRef: 'ticket-1,ticket-2',
        payload: {
          ...deliveryRow().payload,
          pushTickets: [
            { deviceId: 'dev-1', ticketId: 'ticket-1' },
            { deviceId: 'dev-2', ticketId: 'ticket-2' },
          ],
        },
      });
      const { service, expoClient, repository, emailSender } = buildService({
        delivery: sentDelivery,
      });
      expoClient.getReceipts.mockResolvedValue({
        'ticket-1': { status: 'ok' },
        'ticket-2': {
          status: 'error',
          message: 'gone',
          details: { error: 'DeviceNotRegistered' },
        },
      });

      const result = await service.processReceiptsJob({
        jobId: 'push-receipts:del-1',
        type: 'push.receipts',
        entityId: 'del-1',
        deliveryId: 'del-1',
      });

      expect(result.status).toBe('delivered');
      expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
        status: 'delivered',
      });
      // Мёртвый токен при живом втором устройстве email-дубля не порождает (D-03б).
      expect(emailSender.dispatchDelivery).not.toHaveBeenCalled();
    });
  });

  describe('деградация без кредов (EXPO_PUSH_ENABLED=false)', () => {
    it('processSendJob: delivery failed push_channel_disabled + email-fallback', async () => {
      const { service, repository, emailSender, queueService } = buildService({
        enabled: false,
      });

      const result = await service.processSendJob(JOB);

      expect(result.status).toBe('disabled');
      expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
        status: 'failed',
        error: 'push_channel_disabled',
      });
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);
      expect(queueService.enqueuePushReceipts).not.toHaveBeenCalled();
    });

    it('enqueueDelivery: выключенный канал не ставит job, деградирует сразу', async () => {
      const { service, queueService, emailSender } = buildService({
        enabled: false,
      });

      await service.enqueueDelivery({
        id: 'del-1',
        dedupKey: 'reg:approved:reg-1',
        catalogId: 'REG-06',
        channel: 'push',
        accountId: 'acc-1',
        organizationId: null,
        payload: deliveryRow().payload,
      });

      expect(queueService.enqueuePushSend).not.toHaveBeenCalled();
      expect(emailSender.dispatchDelivery).toHaveBeenCalledTimes(1);
    });
  });

  describe('содержимое сообщения', () => {
    it('архивированный tenant не доходит до Expo и терминально skipped', async () => {
      const archivedDelivery = deliveryRow({ organizationId: 'org-1' });
      const { service, prisma, expoClient, repository } = buildService({
        delivery: archivedDelivery,
      });
      prisma.organization.findFirst.mockResolvedValue(null);

      const result = await service.processSendJob(JOB);

      expect(result).toEqual({ status: 'skipped' });
      expect(expoClient.sendChunk).not.toHaveBeenCalled();
      expect(repository.updateDelivery).toHaveBeenCalledWith('del-1', {
        status: 'skipped',
        error: 'organization_unavailable',
      });
    });

    it('локаль устройства, deep link из каталога, канал важности и контент-лимиты', async () => {
      const { service, expoClient } = buildService({ deviceCount: 1 });
      expoClient.sendChunk.mockResolvedValue([{ status: 'ok', id: 't-1' }]);

      await service.processSendJob(JOB);

      const [chunk] = expoClient.sendChunk.mock.calls[0] as [ExpoPushMessage[]];
      const message = chunk[0];
      expect(message.title).toBe('Заявка одобрена');
      expect(message.body).toContain('Tech Meetup');
      // REG-06: route из каталога, params из снапшота, контракт {route, params, channel}.
      expect(message.data).toEqual(
        expect.objectContaining({
          route: '/ticket/[id]',
          params: { id: 'reg-1' },
          channel: 'transactional',
        }),
      );
      expect(message.channelId).toBe('transactional');
      expect(message.priority).toBe('high');
      // Участнический пуш несёт badge = unread инбокса (OQ-28).
      expect(message.badge).toBe(2);
    });

    it('повторный запуск job по уже sent-строке → deduplicated-noop', async () => {
      const { service, expoClient } = buildService({
        delivery: deliveryRow({ status: 'sent' }),
      });
      const result = await service.processSendJob(JOB);
      expect(result).toEqual({ status: 'deduplicated' });
      expect(expoClient.sendChunk).not.toHaveBeenCalled();
    });
  });
});
