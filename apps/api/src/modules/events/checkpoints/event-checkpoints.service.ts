import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Attendance, EventCheckpoint, Prisma, UserType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';
import { EventCheckpointsRepository } from './event-checkpoints.repository';
import {
  CreateEventCheckpointDto,
  UpdateEventCheckpointDto,
} from './dto';

/** Максимальная длительность окна — сутки: защита от опечатки в годе/месяце. */
const MAX_CHECKPOINT_DURATION_MS = 24 * 60 * 60 * 1000;

export interface ICheckpointWithStats extends EventCheckpoint {
  /** Сколько участников уже отмечено в этом чекпоинте. */
  checkedInCount: number;
}

export interface ICheckInSlot {
  /** Активный чекпоинт или null, если скан пришёлся мимо всех окон. */
  checkpoint: EventCheckpoint | null;
  checkInDate: Date;
  /** Уже сделанная отметка в этом же слоте — повторный проход. */
  existing: Attendance | null;
}

export interface ICheckpointAttendanceMatrix {
  checkpoints: ICheckpointWithStats[];
  participants: {
    registrationId: string;
    userId: string;
    fullName: string;
    email: string;
    /** id чекпоинтов, в которых участник отмечен. */
    checkpointIds: string[];
    attendedCount: number;
  }[];
  totalCheckpoints: number;
  totalParticipants: number;
}

@Injectable()
export class EventCheckpointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: EventCheckpointsRepository,
  ) {}

  async findByEvent(
    eventId: string,
    user: ICurrentUser,
  ): Promise<ICheckpointWithStats[]> {
    const organizationId = await this.checkEventAccess(eventId, user);
    const [checkpoints, counts] = await Promise.all([
      this.repository.listByEvent(eventId),
      this.repository.countAttendancesByCheckpoint(organizationId, eventId),
    ]);
    return checkpoints.map((checkpoint) => ({
      ...checkpoint,
      checkedInCount: counts.get(checkpoint.id) ?? 0,
    }));
  }

  async create(
    eventId: string,
    dto: CreateEventCheckpointDto,
    user: ICurrentUser,
  ): Promise<ICheckpointWithStats> {
    await this.checkEventAccess(eventId, user);

    const { startsAt, endsAt } = this.parseWindow(dto.startsAt, dto.endsAt);
    await this.assertNoOverlap(eventId, { startsAt, endsAt });

    const created = await this.repository.create({
      eventId,
      name: this.normalizeName(dto.name),
      startsAt,
      endsAt,
    });
    return { ...created, checkedInCount: 0 };
  }

  async update(
    eventId: string,
    checkpointId: string,
    dto: UpdateEventCheckpointDto,
    user: ICurrentUser,
  ): Promise<ICheckpointWithStats> {
    const organizationId = await this.checkEventAccess(eventId, user);
    const existing = await this.findCheckpointForEvent(eventId, checkpointId);

    const { startsAt, endsAt } = this.parseWindow(
      dto.startsAt ?? existing.startsAt.toISOString(),
      dto.endsAt ?? existing.endsAt.toISOString(),
    );

    const windowChanged =
      startsAt.getTime() !== existing.startsAt.getTime() ||
      endsAt.getTime() !== existing.endsAt.getTime();
    if (windowChanged) {
      await this.assertNoOverlap(eventId, { startsAt, endsAt }, checkpointId);
    }

    const updated = await this.repository.update(checkpointId, {
      ...(dto.name !== undefined ? { name: this.normalizeName(dto.name) } : {}),
      ...(windowChanged ? { startsAt, endsAt } : {}),
    });

    const counts = await this.repository.countAttendancesByCheckpoint(
      organizationId,
      eventId,
    );
    return { ...updated, checkedInCount: counts.get(checkpointId) ?? 0 };
  }

  async remove(
    eventId: string,
    checkpointId: string,
    user: ICurrentUser,
  ): Promise<void> {
    await this.checkEventAccess(eventId, user);
    await this.findCheckpointForEvent(eventId, checkpointId);
    // Отметки чекпоинта уходят каскадом — количество показано в UI подтверждения.
    await this.repository.delete(checkpointId);
  }

  // === Check-in: общая точка для всех трёх писателей ===
  // (организаторский скан, self check-in участника, ticket scanner).
  // Авторизацию делают вызывающие — здесь только правила дедупликации.

  /** Ключ дня для группировки — UTC-полночь, историческая конвенция check-in. */
  checkInDateKey(now: Date): Date {
    return new Date(now.toISOString().split('T')[0]);
  }

  /**
   * Активный чекпоинт события в момент `now` (или null, если скан пришёлся
   * мимо всех окон — тогда работает прежнее правило «одна отметка на день»).
   */
  findActiveCheckpoint(
    eventId: string,
    now: Date,
  ): Promise<EventCheckpoint | null> {
    return this.repository.findActive(eventId, now);
  }

  /**
   * Куда попадёт отметка и не сделана ли она уже.
   *
   * Если сейчас идёт чекпоинт — дедуп по нему («в этот промежуток нельзя
   * отметить дважды»). Если активного чекпоинта нет, скан не отвергается:
   * он деградирует в дневную отметку по прежним правилам, иначе на входе
   * образовалась бы очередь из людей, которым оператор ничем не поможет.
   */
  async resolveCheckInSlot(
    eventId: string,
    registrationId: string,
    now: Date,
  ): Promise<ICheckInSlot> {
    const checkpoint = await this.findActiveCheckpoint(eventId, now);
    const checkInDate = this.checkInDateKey(now);
    const existing = await this.repository.findExistingAttendance({
      registrationId,
      checkpointId: checkpoint?.id ?? null,
      checkInDate,
    });
    return { checkpoint, checkInDate, existing };
  }

  /**
   * Пишет отметку. Гонку двух параллельных сканов гасят частичные unique-индексы
   * (см. миграцию 20260811120000_add_event_checkpoints): проигравший получает
   * P2002, перечитывает победившую строку и возвращает `created: false`.
   */
  async recordCheckIn(input: {
    registrationId: string;
    checkpointId: string | null;
    checkInAt: Date;
    checkInDate: Date;
  }): Promise<{ attendance: Attendance; created: boolean }> {
    try {
      const attendance = await this.repository.createAttendance(input);
      return { attendance, created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.repository.findExistingAttendance(input);
        if (winner) return { attendance: winner, created: false };
      }
      throw error;
    }
  }

  /** Матрица «участники × чекпоинты» для таба посещаемости. */
  async getAttendanceMatrix(
    eventId: string,
    user: ICurrentUser,
  ): Promise<ICheckpointAttendanceMatrix> {
    const organizationId = await this.checkEventAccess(eventId, user);

    const [checkpoints, counts, registrations, attendances] = await Promise.all(
      [
        this.repository.listByEvent(eventId),
        this.repository.countAttendancesByCheckpoint(organizationId, eventId),
        this.repository.listMatrixRegistrations(organizationId, eventId),
        this.repository.listCheckpointAttendances(organizationId, eventId),
      ],
    );

    const byRegistration = new Map<string, string[]>();
    for (const attendance of attendances) {
      if (!attendance.checkpointId) continue;
      const list = byRegistration.get(attendance.registrationId);
      if (list) list.push(attendance.checkpointId);
      else byRegistration.set(attendance.registrationId, [
        attendance.checkpointId,
      ]);
    }

    const participants = registrations.map((registration) => {
      const checkpointIds = byRegistration.get(registration.id) ?? [];
      const fullName =
        `${registration.user.firstName ?? ''} ${registration.user.lastName ?? ''}`.trim() ||
        registration.user.email;
      return {
        registrationId: registration.id,
        userId: registration.user.id,
        fullName,
        email: registration.user.email,
        checkpointIds,
        attendedCount: checkpointIds.length,
      };
    });

    return {
      checkpoints: checkpoints.map((checkpoint) => ({
        ...checkpoint,
        checkedInCount: counts.get(checkpoint.id) ?? 0,
      })),
      participants,
      totalCheckpoints: checkpoints.length,
      totalParticipants: participants.length,
    };
  }

  // === Private ===

  private parseWindow(
    startsAtRaw: string,
    endsAtRaw: string,
  ): { startsAt: Date; endsAt: Date } {
    const startsAt = new Date(startsAtRaw);
    const endsAt = new Date(endsAtRaw);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException({
        code: 'EVENT_CHECKPOINT_INVALID_WINDOW',
        message: 'Некорректные дата и время чекпоинта',
      });
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException({
        code: 'EVENT_CHECKPOINT_INVALID_WINDOW',
        message: 'Конец чекпоинта должен быть позже начала',
      });
    }

    if (endsAt.getTime() - startsAt.getTime() > MAX_CHECKPOINT_DURATION_MS) {
      throw new BadRequestException({
        code: 'EVENT_CHECKPOINT_WINDOW_TOO_LONG',
        message: 'Чекпоинт не может длиться дольше 24 часов',
      });
    }

    return { startsAt, endsAt };
  }

  private async assertNoOverlap(
    eventId: string,
    window: { startsAt: Date; endsAt: Date },
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.repository.findOverlapping(
      eventId,
      window,
      excludeId,
    );
    if (overlapping.length === 0) return;

    // Непересекающиеся окна — инвариант: он гарантирует, что в момент скана
    // активен ровно один чекпоинт и check-in не становится неоднозначным.
    throw new ConflictException({
      code: 'EVENT_CHECKPOINT_OVERLAP',
      message: `Окно пересекается с чекпоинтом «${overlapping[0].name}»`,
      details: {
        conflictsWith: overlapping.map((checkpoint) => ({
          id: checkpoint.id,
          name: checkpoint.name,
          startsAt: checkpoint.startsAt.toISOString(),
          endsAt: checkpoint.endsAt.toISOString(),
        })),
      },
    });
  }

  private async findCheckpointForEvent(
    eventId: string,
    checkpointId: string,
  ): Promise<EventCheckpoint> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint || checkpoint.eventId !== eventId) {
      throw new NotFoundException({
        code: 'EVENT_CHECKPOINT_NOT_FOUND',
        message: 'Чекпоинт не найден в этом событии',
      });
    }
    return checkpoint;
  }

  private normalizeName(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  /** Возвращает organizationId вызывающего — он же ключ tenant-скоупа. */
  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<string> {
    const organizationId = this.getOrganizationId(user);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
    return organizationId;
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException(
      'Только организаторы могут управлять чекпоинтами',
    );
  }
}
