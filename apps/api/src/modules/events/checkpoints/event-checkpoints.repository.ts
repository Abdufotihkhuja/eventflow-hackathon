import { Injectable } from '@nestjs/common';
import {
  Attendance,
  EventCheckpoint,
  Prisma,
  RegistrationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { requireEventTenantWhere } from '../../../common/tenant/tenant-scope';

export interface AttendanceDedupKey {
  registrationId: string;
  /** null → отметка «на день» (активного чекпоинта нет). */
  checkpointId: string | null;
  checkInDate: Date;
}

export interface CheckpointMatrixRegistration {
  id: string;
  status: RegistrationStatus;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

/**
 * Вся работа с БД по чекпоинтам и привязанным к ним отметкам.
 *
 * Чтения по tenant-моделям (registration/attendance) идут через
 * requireEventTenantWhere — organizationId обязателен, иначе выбрасывается
 * MissingTenantScopeError (см. common/tenant/tenant-scope.ts).
 */
@Injectable()
export class EventCheckpointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // === Чекпоинты ===

  listByEvent(eventId: string): Promise<EventCheckpoint[]> {
    return this.prisma.eventCheckpoint.findMany({
      where: { eventId },
      orderBy: [{ startsAt: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string): Promise<EventCheckpoint | null> {
    return this.prisma.eventCheckpoint.findUnique({ where: { id } });
  }

  /**
   * Чекпоинт, активный в момент `now`. Окно полуоткрытое: [startsAt, endsAt).
   * Пересечения запрещены валидацией, поэтому результат всегда однозначен;
   * take(1) — просто страховка от ручных правок в БД.
   */
  async findActive(
    eventId: string,
    now: Date,
  ): Promise<EventCheckpoint | null> {
    const [active] = await this.prisma.eventCheckpoint.findMany({
      where: {
        eventId,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'desc' },
      take: 1,
    });
    return active ?? null;
  }

  /** Чекпоинты события, пересекающиеся с окном [startsAt, endsAt). */
  findOverlapping(
    eventId: string,
    window: { startsAt: Date; endsAt: Date },
    excludeId?: string,
  ): Promise<EventCheckpoint[]> {
    return this.prisma.eventCheckpoint.findMany({
      where: {
        eventId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startsAt: { lt: window.endsAt },
        endsAt: { gt: window.startsAt },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  create(data: {
    eventId: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<EventCheckpoint> {
    return this.prisma.eventCheckpoint.create({ data });
  }

  update(
    id: string,
    data: Prisma.EventCheckpointUpdateInput,
  ): Promise<EventCheckpoint> {
    return this.prisma.eventCheckpoint.update({ where: { id }, data });
  }

  /** Отметки уходят каскадом (FK ON DELETE CASCADE). */
  async delete(id: string): Promise<void> {
    await this.prisma.eventCheckpoint.delete({ where: { id } });
  }

  // === Отметки ===

  /**
   * Существующая отметка по ключу дедупликации. Заменяет findUnique: составной
   * unique теперь частичный (Prisma его не выражает), см. миграцию
   * 20260811120000_add_event_checkpoints.
   */
  findExistingAttendance(key: AttendanceDedupKey) {
    return this.prisma.attendance.findFirst({
      where:
        key.checkpointId === null
          ? {
              registrationId: key.registrationId,
              checkpointId: null,
              checkInDate: key.checkInDate,
            }
          : {
              registrationId: key.registrationId,
              checkpointId: key.checkpointId,
            },
      orderBy: { checkInAt: 'asc' },
    });
  }

  createAttendance(input: {
    registrationId: string;
    checkpointId: string | null;
    checkInAt: Date;
    checkInDate: Date;
  }): Promise<Attendance> {
    return this.prisma.attendance.create({ data: input });
  }

  /** Сколько участников отмечено в каждом чекпоинте события. */
  async countAttendancesByCheckpoint(
    organizationId: string,
    eventId: string,
  ): Promise<Map<string, number>> {
    const grouped = await this.prisma.attendance.groupBy({
      by: ['checkpointId'],
      where: {
        checkpointId: { not: null },
        registration: requireEventTenantWhere(organizationId, { eventId }),
      },
      _count: { _all: true },
    });
    return new Map(
      grouped
        .filter((row): row is typeof row & { checkpointId: string } =>
          Boolean(row.checkpointId),
        )
        .map((row) => [row.checkpointId, row._count._all]),
    );
  }

  /**
   * Участники для матрицы: подтверждённые регистрации плюс все, у кого уже есть
   * отметка на чекпоинте (иначе отменённый после прохода участник исчез бы из
   * отчёта вместе со своей историей).
   */
  listMatrixRegistrations(
    organizationId: string,
    eventId: string,
  ): Promise<CheckpointMatrixRegistration[]> {
    return this.prisma.registration.findMany({
      where: requireEventTenantWhere(organizationId, {
        eventId,
        OR: [
          { status: RegistrationStatus.APPROVED },
          { attendances: { some: { checkpointId: { not: null } } } },
        ],
      }),
      select: {
        id: true,
        status: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [
        { user: { firstName: 'asc' } },
        { user: { lastName: 'asc' } },
        { id: 'asc' },
      ],
    });
  }

  /** Пары (registrationId, checkpointId) для всех отметок на чекпоинтах события. */
  listCheckpointAttendances(
    organizationId: string,
    eventId: string,
  ): Promise<
    { registrationId: string; checkpointId: string | null; checkInAt: Date }[]
  > {
    return this.prisma.attendance.findMany({
      where: {
        checkpointId: { not: null },
        // Attendance скоуплен через registration.event, а не напрямую через event.
        registration: requireEventTenantWhere(organizationId, { eventId }),
      },
      select: { registrationId: true, checkpointId: true, checkInAt: true },
      orderBy: { checkInAt: 'asc' },
    });
  }
}
