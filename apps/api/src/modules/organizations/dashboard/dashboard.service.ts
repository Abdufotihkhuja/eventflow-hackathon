import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import {
  DashboardStatsDto,
  DashboardActivityDto,
  ActivityItemDto,
  TeamActivityType,
} from './dto';
import { EventStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  /**
   * Получить полную статистику Dashboard для организации
   */
  async getStats(organizationId: string): Promise<DashboardStatsDto> {
    const now = new Date();

    // Периоды для сравнения
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Начало текущего и предыдущего месяца
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const previousMonthEnd = currentMonthStart;

    // Получаем все данные параллельно
    const [
      eventsCount,
      activeEventsLast30Days,
      activeEventsPrev30Days,
      ticketsCount,
      openTicketsLastWeek,
      openTicketsPrevWeek,
      participantsStats,
      conversionStats,
    ] = await Promise.all([
      this.dashboardRepository.getEventsCount(organizationId),
      this.dashboardRepository.getActiveEventsInPeriod(
        organizationId,
        thirtyDaysAgo,
        now,
      ),
      this.dashboardRepository.getActiveEventsInPeriod(
        organizationId,
        sixtyDaysAgo,
        thirtyDaysAgo,
      ),
      this.dashboardRepository.getTicketsCount(organizationId),
      this.dashboardRepository.getOpenTicketsInPeriod(
        organizationId,
        sevenDaysAgo,
        now,
      ),
      this.dashboardRepository.getOpenTicketsInPeriod(
        organizationId,
        fourteenDaysAgo,
        sevenDaysAgo,
      ),
      this.dashboardRepository.getParticipantsStats(
        organizationId,
        currentMonthStart,
        previousMonthStart,
        previousMonthEnd,
      ),
      this.dashboardRepository.getConversionStats(organizationId),
    ]);

    // Вычисляем проценты изменений
    const eventsChangePercent = this.calculateChangePercent(
      activeEventsLast30Days,
      activeEventsPrev30Days,
    );
    const ticketsChangePercent = this.calculateChangePercent(
      openTicketsLastWeek,
      openTicketsPrevWeek,
    );
    const momChangePercent = this.calculateChangePercent(
      participantsStats.newCount,
      participantsStats.previousCount,
    );

    // Конверсия регистрации
    const registrationRate =
      conversionStats.totalRegistrations > 0
        ? Math.round(
            (conversionStats.approvedRegistrations /
              conversionStats.totalRegistrations) *
              100,
          )
        : 0;

    // Процент посещаемости
    const attendanceRate =
      conversionStats.approvedRegistrations > 0
        ? Math.round(
            (conversionStats.totalAttendances /
              conversionStats.approvedRegistrations) *
              100,
          )
        : 0;

    return {
      events: {
        active: {
          value: eventsCount.active,
          changePercent: eventsChangePercent,
          changeAbsolute: activeEventsLast30Days - activeEventsPrev30Days,
          period: '30 дней',
        },
        total: eventsCount.total,
        drafts: eventsCount.drafts,
        completed: eventsCount.completed,
      },
      tickets: {
        open: {
          value: ticketsCount.open,
          changePercent: ticketsChangePercent,
          changeAbsolute: openTicketsLastWeek - openTicketsPrevWeek,
          period: 'неделю',
        },
        total: ticketsCount.total,
        completed: ticketsCount.completed,
      },
      participants: {
        newCount: participantsStats.newCount,
        momChangePercent,
        total: participantsStats.total,
      },
      conversion: {
        registrationRate,
        attendanceRate,
        totalRegistrations: conversionStats.totalRegistrations,
        approvedRegistrations: conversionStats.approvedRegistrations,
      },
    };
  }

  /**
   * Получить командную активность за последние 24 часа
   */
  async getActivity(
    organizationId: string,
    limit: number = 20,
  ): Promise<DashboardActivityDto> {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Получаем все активности параллельно
    const [registrations, events, tasks] = await Promise.all([
      this.dashboardRepository.getRecentRegistrations(
        organizationId,
        since,
        limit,
      ),
      this.dashboardRepository.getRecentEvents(organizationId, since, limit),
      this.dashboardRepository.getRecentTasks(organizationId, since, limit),
    ]);

    // Формируем список активностей
    const items: ActivityItemDto[] = [];

    // Добавляем регистрации
    for (const reg of registrations) {
      items.push({
        id: reg.id,
        type: TeamActivityType.REGISTRATION,
        description: `+1 регистрация на ${reg.eventTitle}`,
        entityName: reg.eventTitle,
        entityId: reg.eventId,
        createdAt: reg.createdAt,
        timeAgo: this.getTimeAgo(reg.createdAt),
      });
    }

    // Добавляем события
    for (const event of events) {
      const type =
        event.status === EventStatus.PUBLISHED
          ? TeamActivityType.EVENT_PUBLISHED
          : TeamActivityType.EVENT_CREATED;
      const action =
        event.status === EventStatus.PUBLISHED
          ? 'Опубликовано событие'
          : 'Создано новое событие';

      items.push({
        id: event.id,
        type,
        description: `${action} «${event.title}»`,
        entityName: event.title,
        entityId: event.id,
        createdAt: event.createdAt,
        timeAgo: this.getTimeAgo(event.createdAt),
      });
    }

    // Добавляем задачи
    for (const task of tasks) {
      const isNew = task.createdAt >= since;
      const isCompleted =
        task.isCompleted && task.completedAt && task.completedAt >= since;

      if (isNew) {
        items.push({
          id: `${task.id}-created`,
          type: TeamActivityType.TASK_CREATED,
          description: `Создана задача «${task.title}» в ${task.boardName}`,
          entityName: task.title,
          entityId: task.id,
          createdAt: task.createdAt,
          timeAgo: this.getTimeAgo(task.createdAt),
        });
      }

      if (isCompleted && task.completedAt) {
        items.push({
          id: `${task.id}-completed`,
          type: TeamActivityType.TASK_COMPLETED,
          description: `Завершена задача «${task.title}»`,
          entityName: task.title,
          entityId: task.id,
          createdAt: task.completedAt,
          timeAgo: this.getTimeAgo(task.completedAt),
        });
      }
    }

    // Сортируем по времени (новые сначала) и ограничиваем
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limitedItems = items.slice(0, limit);

    return {
      items: limitedItems,
      totalCount: items.length,
      periodStart: since,
      periodEnd: now,
    };
  }

  /**
   * Вычисляет процент изменения
   */
  private calculateChangePercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Преобразует дату в человекочитаемый формат "X минут назад"
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) {
      return 'только что';
    } else if (diffMins < 60) {
      return `${diffMins} мин назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч назад`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} дн назад`;
    }
  }
}
