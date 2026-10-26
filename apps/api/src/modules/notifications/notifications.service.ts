import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppChannelSender } from './channels/in-app-channel.sender';
import {
  NotificationDto,
  NotificationListDto,
  NotificationQueryDto,
} from './dto/notification.dto';

/** Что кладём в уведомление при создании. */
export interface EmitNotification {
  organizationId: string;
  type: NotificationType;
  /** null/undefined = уведомление всей организации. */
  memberId?: string | null;
  entityType?: string;
  entityId?: string;
  /** Подстановки для локализованной строки на клиенте. */
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppSender: InAppChannelSender,
  ) {}

  /**
   * Создать уведомление.
   *
   * НИКОГДА не бросает наружу: уведомление — побочный эффект чужого действия.
   * Если запись не удалась, регистрация всё равно должна быть одобрена, а
   * событие опубликовано; иначе падение вспомогательной таблицы отменяет
   * основную работу пользователя. Ошибка уходит в лог.
   *
   * Запись идёт СКВОЗЬ in-app канал диспатчера (инвариант №2: единая точка
   * записи ленты); поведение ленты не меняется — тот же create, без дедупа
   * и журнала (legacy-путь, новые цепочки идут через dispatchNow).
   */
  async emit(input: EmitNotification): Promise<void> {
    try {
      await this.inAppSender.createOrgNotification({
        organizationId: input.organizationId,
        memberId: input.memberId ?? null,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload,
      });
    } catch (error) {
      this.logger.error(
        `Не удалось записать уведомление ${input.type} для организации ${input.organizationId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Лента организации, свежие сверху. */
  async list(
    organizationId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationListDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { organizationId };

    const [rows, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // Вторичный ключ по id: без него страницы с одинаковой меткой времени
        // (уведомления одной пачки) переставляются между запросами.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);

    return { data: rows as NotificationDto[], total, unread };
  }

  async unreadCount(organizationId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { organizationId, readAt: null },
    });
  }

  /** Отметить прочитанным. Пустой список = вся лента организации. */
  async markRead(organizationId: string, ids?: string[]): Promise<number> {
    const res = await this.prisma.notification.updateMany({
      // organizationId в условии ВСЕГДА: без него чужой id из тела запроса
      // пометил бы прочитанным уведомление другой организации.
      where: {
        organizationId,
        readAt: null,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });
    return res.count;
  }
}
