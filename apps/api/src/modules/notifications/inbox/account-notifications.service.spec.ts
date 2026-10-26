import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountNotificationsService } from './account-notifications.service';
import {
  AccountMarkReadDto,
  AccountNotificationQueryDto,
} from './dto/account-notification.dto';

/**
 * Инбокс участника (CONTRACT_DIFF §3) — зеркало читающей части
 * организаторской ленты, но со скоупом Account. Что обязано держаться:
 *   • accountId ВСЕГДА в where — чужой id из тела/query не читает и не
 *     помечает чужие строки;
 *   • пагинация page/limit как у орг-ленты + unread-фильтр;
 *   • пустой список ids = «прочитать всё», только непрочитанные строки.
 */

interface PrismaMock {
  accountNotification: {
    findMany: jest.Mock;
    count: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

function buildService(rows: Array<Record<string, unknown>> = []) {
  const prisma: PrismaMock = {
    accountNotification: {
      findMany: jest.fn().mockResolvedValue(rows),
      count: jest.fn().mockResolvedValue(rows.length),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(),
  };
  // list() шлёт массив промисов — как реальный prisma.$transaction([...]).
  prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
  const service = new AccountNotificationsService(prisma as never);
  return { service, prisma };
}

describe('AccountNotificationsService (инбокс участника)', () => {
  describe('list', () => {
    it('скоупит выборку по accountId и пагинирует как орг-лента', async () => {
      const { service, prisma } = buildService([{ id: 'n-1' }]);
      const result = await service.list('acc-1', { page: 2, limit: 10 });

      expect(prisma.accountNotification.findMany).toHaveBeenCalledWith({
        where: { accountId: 'acc-1' },
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      expect(result.data).toEqual([{ id: 'n-1' }]);
      expect(result.total).toBe(1);
      expect(result.unread).toBe(1);
    });

    it('unread=true фильтрует список, но total/unread остаются честными', async () => {
      const { service, prisma } = buildService();
      await service.list('acc-1', { page: 1, limit: 20, unread: true });

      expect(prisma.accountNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: 'acc-1', readAt: null },
        }),
      );
      // Третий count — безусловный unread аккаунта (источник badge).
      expect(prisma.accountNotification.count).toHaveBeenLastCalledWith({
        where: { accountId: 'acc-1', readAt: null },
      });
    });

    it('дефолты пагинации: page=1, limit=20', async () => {
      const { service, prisma } = buildService();
      await service.list('acc-1', {});

      expect(prisma.accountNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('unreadCount', () => {
    it('считает только непрочитанные строки СВОЕГО аккаунта', async () => {
      const { service, prisma } = buildService();
      await service.unreadCount('acc-1');

      expect(prisma.accountNotification.count).toHaveBeenCalledWith({
        where: { accountId: 'acc-1', readAt: null },
      });
    });
  });

  describe('markRead', () => {
    it('список id: помечает только свои непрочитанные строки из списка', async () => {
      const { service, prisma } = buildService();
      await service.markRead('acc-1', ['n-1', 'n-2']);

      expect(prisma.accountNotification.updateMany).toHaveBeenCalledWith({
        where: {
          accountId: 'acc-1',
          readAt: null,
          id: { in: ['n-1', 'n-2'] },
        },
        data: { readAt: expect.any(Date) },
      });
    });

    it('пустой список = весь инбокс аккаунта (без условия по id)', async () => {
      const { service, prisma } = buildService();
      await service.markRead('acc-1', []);

      const arg = prisma.accountNotification.updateMany.mock.calls[0][0];
      expect(arg.where).toEqual({ accountId: 'acc-1', readAt: null });
    });

    it('без аргумента — тоже «прочитать всё»', async () => {
      const { service, prisma } = buildService();
      await service.markRead('acc-1');

      const arg = prisma.accountNotification.updateMany.mock.calls[0][0];
      expect(arg.where).toEqual({ accountId: 'acc-1', readAt: null });
    });
  });
});

describe('DTO-валидация инбокса', () => {
  it('query: строковые page/limit/unread из URL приводятся к числам/булю', async () => {
    const dto = plainToInstance(AccountNotificationQueryDto, {
      page: '2',
      limit: '50',
      unread: 'true',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
    expect(dto.unread).toBe(true);
  });

  it('query: limit за потолком 100 → 400', async () => {
    const dto = plainToInstance(AccountNotificationQueryDto, { limit: '500' });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('query: мусорный unread → 400, а не тихий фильтр', async () => {
    const dto = plainToInstance(AccountNotificationQueryDto, {
      unread: 'yes',
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('markRead: не-uuid в ids → 400', async () => {
    const dto = plainToInstance(AccountMarkReadDto, { ids: ['nope'] });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('markRead: пустое тело валидно (= прочитать всё)', async () => {
    const dto = plainToInstance(AccountMarkReadDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });
});
