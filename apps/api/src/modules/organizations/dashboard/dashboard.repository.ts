import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventStatus, RegistrationStatus } from '@prisma/client';

interface EventsCountResult {
  active: number;
  total: number;
  drafts: number;
  completed: number;
}

interface TicketsCountResult {
  open: number;
  total: number;
  completed: number;
}

interface RegistrationActivity {
  id: string;
  eventTitle: string;
  eventId: string;
  createdAt: Date;
}

interface EventActivity {
  id: string;
  title: string;
  status: EventStatus;
  createdAt: Date;
}

interface TaskActivity {
  id: string;
  title: string;
  boardName: string;
  boardId: string;
  isCompleted: boolean;
  createdAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить количество событий организации по статусам
   */
  async getEventsCount(organizationId: string): Promise<EventsCountResult> {
    const [active, total, drafts, completed] = await Promise.all([
      this.prisma.event.count({
        where: {
          organizationId,
          status: EventStatus.PUBLISHED,
          endDate: { gte: new Date() },
        },
      }),
      this.prisma.event.count({
        where: { organizationId },
      }),
      this.prisma.event.count({
        where: { organizationId, status: EventStatus.DRAFT },
      }),
      this.prisma.event.count({
        where: { organizationId, status: EventStatus.COMPLETED },
      }),
    ]);

    return { active, total, drafts, completed };
  }

  /**
   * Получить количество активных событий за период
   */
  async getActiveEventsInPeriod(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.prisma.event.count({
      where: {
        organizationId,
        status: EventStatus.PUBLISHED,
        createdAt: { gte: startDate, lte: endDate },
      },
    });
  }

  /**
   * Получить количество задач организации
   */
  async getTicketsCount(organizationId: string): Promise<TicketsCountResult> {
    const [open, total, completed] = await Promise.all([
      this.prisma.boardTask.count({
        where: {
          board: { organizationId },
          isCompleted: false,
        },
      }),
      this.prisma.boardTask.count({
        where: { board: { organizationId } },
      }),
      this.prisma.boardTask.count({
        where: {
          board: { organizationId },
          isCompleted: true,
        },
      }),
    ]);

    return { open, total, completed };
  }

  /**
   * Получить количество открытых задач за период
   */
  async getOpenTicketsInPeriod(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.prisma.boardTask.count({
      where: {
        board: { organizationId },
        isCompleted: false,
        createdAt: { gte: startDate, lte: endDate },
      },
    });
  }

  /**
   * Получить статистику участников
   */
  async getParticipantsStats(
    organizationId: string,
    currentMonthStart: Date,
    previousMonthStart: Date,
    previousMonthEnd: Date,
  ): Promise<{ newCount: number; previousCount: number; total: number }> {
    const [newCount, previousCount, total] = await Promise.all([
      // Новые участники за текущий месяц
      this.prisma.registration.count({
        where: {
          event: { organizationId },
          status: RegistrationStatus.APPROVED,
          createdAt: { gte: currentMonthStart },
        },
      }),
      // Участники за предыдущий месяц
      this.prisma.registration.count({
        where: {
          event: { organizationId },
          status: RegistrationStatus.APPROVED,
          createdAt: { gte: previousMonthStart, lt: previousMonthEnd },
        },
      }),
      // Всего уникальных участников
      this.prisma.registration.count({
        where: {
          event: { organizationId },
          status: RegistrationStatus.APPROVED,
        },
      }),
    ]);

    return { newCount, previousCount, total };
  }

  /**
   * Получить статистику конверсии
   */
  async getConversionStats(organizationId: string): Promise<{
    totalRegistrations: number;
    approvedRegistrations: number;
    totalAttendances: number;
  }> {
    const [totalRegistrations, approvedRegistrations, totalAttendances] =
      await Promise.all([
        this.prisma.registration.count({
          where: { event: { organizationId } },
        }),
        this.prisma.registration.count({
          where: {
            event: { organizationId },
            status: RegistrationStatus.APPROVED,
          },
        }),
        this.prisma.attendance.count({
          where: { registration: { event: { organizationId } } },
        }),
      ]);

    return { totalRegistrations, approvedRegistrations, totalAttendances };
  }

  /**
   * Получить последние регистрации за период
   */
  async getRecentRegistrations(
    organizationId: string,
    since: Date,
    limit: number = 10,
  ): Promise<RegistrationActivity[]> {
    const registrations = await this.prisma.registration.findMany({
      where: {
        event: { organizationId },
        createdAt: { gte: since },
      },
      select: {
        id: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return registrations.map((r) => ({
      id: r.id,
      eventTitle: r.event.title,
      eventId: r.event.id,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Получить последние события за период
   */
  async getRecentEvents(
    organizationId: string,
    since: Date,
    limit: number = 10,
  ): Promise<EventActivity[]> {
    return this.prisma.event.findMany({
      where: {
        organizationId,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Получить последние задачи за период
   */
  async getRecentTasks(
    organizationId: string,
    since: Date,
    limit: number = 10,
  ): Promise<TaskActivity[]> {
    const tasks = await this.prisma.boardTask.findMany({
      where: {
        board: { organizationId },
        OR: [{ createdAt: { gte: since } }, { completedAt: { gte: since } }],
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        createdAt: true,
        completedAt: true,
        board: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      boardName: t.board.name,
      boardId: t.board.id,
      isCompleted: t.isCompleted,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));
  }
}
