import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AccountNotificationDto,
  AccountNotificationListDto,
  AccountNotificationQueryDto,
} from './dto/account-notification.dto';

/**
 * Чтение участнического инбокса (AccountNotification, CONTRACT_DIFF §3).
 *
 * Запись сюда идёт ТОЛЬКО через in-app канал диспатчера (инвариант №2) —
 * этот сервис ничего не создаёт, он зеркалит читающую часть организаторской
 * ленты (NotificationsService), но со скоупом личного Account вместо
 * организации.
 */
@Injectable()
export class AccountNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Инбокс аккаунта, свежие сверху. */
  async list(
    accountId: string,
    query: AccountNotificationQueryDto,
  ): Promise<AccountNotificationListDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      accountId,
      ...(query.unread ? { readAt: null } : {}),
    };

    const [rows, total, unread] = await this.prisma.$transaction([
      this.prisma.accountNotification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // Вторичный ключ по id: страницы с одинаковой меткой времени
        // (fan-out одной пачки) не должны переставляться между запросами.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.accountNotification.count({ where }),
      this.prisma.accountNotification.count({
        where: { accountId, readAt: null },
      }),
    ]);

    return { data: rows as AccountNotificationDto[], total, unread };
  }

  async unreadCount(accountId: string): Promise<number> {
    return this.prisma.accountNotification.count({
      where: { accountId, readAt: null },
    });
  }

  /** Отметить прочитанным. Пустой список = весь инбокс аккаунта. */
  async markRead(accountId: string, ids?: string[]): Promise<number> {
    const res = await this.prisma.accountNotification.updateMany({
      // accountId в условии ВСЕГДА: без него чужой id из тела запроса пометил
      // бы прочитанным уведомление другого аккаунта (паттерн орг-ленты).
      where: {
        accountId,
        readAt: null,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });
    return res.count;
  }
}
