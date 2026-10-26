import { DeviceTokensService } from './device-tokens.service';
import type { RegisterDeviceDto } from './dto/register-device.dto';

/**
 * Гигиена токенов на общем устройстве (BL-08, D-09): logout мог не дойти до
 * сервера — PUT-upsert нового аккаунта обязан деактивировать активные строки
 * ДРУГИХ аккаунтов с тем же expoPushToken/installationId (superseded), иначе
 * пуши аккаунта A приходят на устройство пользователя B.
 */

const DTO: RegisterDeviceDto = {
  expoPushToken: 'ExponentPushToken[shared-device]',
  platform: 'ios',
  locale: 'ru',
  appVersion: '1.4.0',
  osVersion: '18.1',
};

function buildService() {
  const tx = {
    deviceToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    account: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      (fn: (client: typeof tx) => Promise<void>) => fn(tx),
    ),
    deviceToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const service = new DeviceTokensService(prisma as never);
  return { service, prisma, tx };
}

describe('DeviceTokensService (BL-08)', () => {
  it('D-09: upsert деактивирует чужие активные строки с тем же токеном/установкой (superseded)', async () => {
    const { service, tx } = buildService();

    await service.upsertDevice('acc-B', 'inst-1', DTO);

    // Шаг 1: гашение строк ДРУГИХ аккаунтов — до upsert'а, в той же транзакции.
    expect(tx.deviceToken.updateMany).toHaveBeenCalledWith({
      where: {
        disabledAt: null,
        accountId: { not: 'acc-B' },
        OR: [
          { expoPushToken: DTO.expoPushToken },
          { installationId: 'inst-1' },
        ],
      },
      data: {
        disabledAt: expect.any(Date),
        disabledReason: 'superseded',
      },
    });
    expect(tx.deviceToken.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.deviceToken.upsert.mock.invocationCallOrder[0],
    );
  });

  it('upsert по (accountId, installationId): create/update + реактивация строки', async () => {
    const { service, tx } = buildService();

    await service.upsertDevice('acc-B', 'inst-1', DTO);

    expect(tx.deviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          accountId_installationId: {
            accountId: 'acc-B',
            installationId: 'inst-1',
          },
        },
        update: expect.objectContaining({
          expoPushToken: DTO.expoPushToken,
          locale: 'ru',
          lastSeenAt: expect.any(Date),
          // Повторный login реактивирует ранее погашенную строку.
          disabledAt: null,
          disabledReason: null,
        }),
      }),
    );
  });

  it('BL-37: upsert синхронизирует локаль устройства в Account.locale (идемпотентно)', async () => {
    const { service, tx } = buildService();

    await service.upsertDevice('acc-B', 'inst-1', { ...DTO, locale: 'uz' });

    expect(tx.account.updateMany).toHaveBeenCalledWith({
      where: { id: 'acc-B', NOT: { locale: 'uz' } },
      data: { locale: 'uz' },
    });
  });

  it('removeDevice (logout): деактивация только своей активной строки, идемпотентно', async () => {
    const { service, prisma } = buildService();

    await service.removeDevice('acc-B', 'inst-1');
    await service.removeDevice('acc-B', 'inst-1'); // нет строки → noop, без ошибок

    expect(prisma.deviceToken.updateMany).toHaveBeenCalledWith({
      where: { accountId: 'acc-B', installationId: 'inst-1', disabledAt: null },
      data: { disabledAt: expect.any(Date), disabledReason: 'logout' },
    });
    expect(prisma.deviceToken.updateMany).toHaveBeenCalledTimes(2);
  });
});
