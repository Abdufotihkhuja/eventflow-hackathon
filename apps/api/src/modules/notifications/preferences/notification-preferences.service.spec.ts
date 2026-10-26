import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PREFERENCE_KEYS } from '../catalog';
import {
  PREFERENCE_KEY_VALUES,
  TRANSACTIONAL_MATRIX_KEY,
  UpdateNotificationPreferencesDto,
} from './dto/notification-preferences.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

interface PrismaMock {
  notificationPreference: {
    findMany: jest.Mock;
    upsert: jest.Mock;
  };
  $transaction: jest.Mock;
}

function buildService(rows: Array<Record<string, unknown>> = []) {
  const prisma: PrismaMock = {
    notificationPreference: {
      findMany: jest.fn().mockResolvedValue(rows),
      upsert: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  };
  // Реальный prisma передаёт tx-клиент; для тестов достаточно самого мока.
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<void>) =>
    fn(prisma),
  );
  const service = new NotificationPreferencesService(prisma as never);
  return { service, prisma };
}

describe('NotificationPreferencesService (BL-23)', () => {
  describe('getMatrix — полная матрица с дефолтами', () => {
    it('без строк в БД: все ключи каталога включены + locked transactional-строка', async () => {
      const { service } = buildService();
      const matrix = await service.getMatrix('acc-1');

      // Полнота: transactional + каждый ключ каталога ровно один раз.
      expect(matrix.preferences.map((p) => p.key)).toEqual([
        TRANSACTIONAL_MATRIX_KEY,
        ...PREFERENCE_KEY_VALUES,
      ]);

      const transactional = matrix.preferences[0];
      expect(transactional).toEqual({
        key: TRANSACTIONAL_MATRIX_KEY,
        push: true,
        email: true,
        locked: true,
      });

      for (const row of matrix.preferences.slice(1)) {
        expect(row).toEqual(
          expect.objectContaining({ push: true, email: true, locked: false }),
        );
      }
    });

    it('строка БД побеждает дефолт только для своего ключа', async () => {
      const { service } = buildService([
        {
          accountId: 'acc-1',
          key: PREFERENCE_KEYS.EVENT_REMINDERS,
          push: false,
          email: true,
        },
      ]);
      const matrix = await service.getMatrix('acc-1');

      const reminders = matrix.preferences.find(
        (p) => p.key === PREFERENCE_KEYS.EVENT_REMINDERS,
      );
      expect(reminders).toEqual({
        key: PREFERENCE_KEYS.EVENT_REMINDERS,
        push: false,
        email: true,
        locked: false,
      });

      const summary = matrix.preferences.find(
        (p) => p.key === PREFERENCE_KEYS.SUMMARY,
      );
      expect(summary?.push).toBe(true);
    });
  });

  describe('applyChanges — частичный upsert', () => {
    it('upsert строки: create с дефолтами прочих каналов, update — только изменённый', async () => {
      const { service, prisma } = buildService();
      await service.applyChanges('acc-1', [
        {
          key: PREFERENCE_KEYS.EVENT_REMINDERS,
          channel: 'push',
          enabled: false,
        },
      ]);

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: {
          accountId_key: {
            accountId: 'acc-1',
            key: PREFERENCE_KEYS.EVENT_REMINDERS,
          },
        },
        create: {
          accountId: 'acc-1',
          key: PREFERENCE_KEYS.EVENT_REMINDERS,
          push: false,
          email: true,
        },
        update: { push: false },
      });
    });

    it('дубли одного ключа схлопываются: последний change побеждает', async () => {
      const { service, prisma } = buildService();
      await service.applyChanges('acc-1', [
        { key: PREFERENCE_KEYS.SUMMARY, channel: 'push', enabled: false },
        { key: PREFERENCE_KEYS.SUMMARY, channel: 'email', enabled: false },
        { key: PREFERENCE_KEYS.SUMMARY, channel: 'push', enabled: true },
      ]);

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { push: true, email: false },
        }),
      );
    });
  });

  describe('resolveForAccounts — пакетная выборка для диспатчера', () => {
    it('пустой список аккаунтов → пустая карта без запроса к БД', async () => {
      const { service, prisma } = buildService();
      const map = await service.resolveForAccounts([]);
      expect(map.size).toBe(0);
      expect(prisma.notificationPreference.findMany).not.toHaveBeenCalled();
    });

    it('фильтрует по ключу и группирует по аккаунту', async () => {
      const { service, prisma } = buildService([
        { accountId: 'acc-1', key: 'summary', push: false, email: true },
      ]);
      const map = await service.resolveForAccounts(['acc-1', 'acc-2'], 'summary');

      expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { accountId: { in: ['acc-1', 'acc-2'] }, key: 'summary' },
        select: { accountId: true, key: true, push: true, email: true },
      });
      expect(map.get('acc-1')?.get('summary')).toEqual({
        push: false,
        email: true,
      });
      expect(map.has('acc-2')).toBe(false);
    });
  });
});

describe('UpdateNotificationPreferencesDto — валидация PATCH', () => {
  async function validateChanges(changes: unknown) {
    const dto = plainToInstance(UpdateNotificationPreferencesDto, { changes });
    return validate(dto);
  }

  it('валидный change проходит', async () => {
    const errors = await validateChanges([
      { key: 'event_reminders', channel: 'push', enabled: false },
    ]);
    expect(errors).toHaveLength(0);
  });

  it('неизвестный ключ → ошибка валидации (400)', async () => {
    const errors = await validateChanges([
      { key: 'totally_unknown', channel: 'push', enabled: false },
    ]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('transactional-строку менять нельзя → ошибка валидации (400)', async () => {
    const errors = await validateChanges([
      { key: TRANSACTIONAL_MATRIX_KEY, channel: 'push', enabled: false },
    ]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('неизвестный канал → ошибка валидации (400)', async () => {
    const errors = await validateChanges([
      { key: 'event_reminders', channel: 'in_app', enabled: false },
    ]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('пустой список changes → ошибка валидации (400)', async () => {
    const errors = await validateChanges([]);
    expect(errors.length).toBeGreaterThan(0);
  });
});
