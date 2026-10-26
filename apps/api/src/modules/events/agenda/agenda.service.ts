import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateAgendaItemDto, UpdateAgendaItemDto } from './dto';
import { AgendaItem, Prisma, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import { AgendaRepository } from './agenda.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { pickFallbackTranslation } from '../../translations/dto/business-translation.dto';

const MAX_PARALLEL_SESSIONS = 3;
const MINUTES_PER_DAY = 24 * 60;

interface ConflictResolution {
  date: Date;
  startMin: number;
  endMin: number;
  /** Legacy text-match fallback when roomId is null. */
  location: string | null;
  /** Preferred FK-based conflict check. */
  roomId: string | null;
}

@Injectable()
export class AgendaService {
  constructor(
    private readonly agendaRepository: AgendaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    eventId: string,
    dto: CreateAgendaItemDto,
    user: ICurrentUser,
  ): Promise<AgendaItem> {
    const event = await this.checkEventAccess(eventId, user);

    const {
      speakerIds,
      startTime,
      date,
      location,
      roomId,
      translations,
      translationMeta,
      ...data
    } = dto;

    this.validateDate(date, event.startDate, event.endDate);

    // Title/description/location могут прийти как scalar и/или внутри translations.
    // Скаляры — обязательный fallback; если их нет, тянем первую непустую локаль.
    const resolvedTitle = pickFallbackTranslation(translations, 'title', data.title) || data.title;
    const resolvedDescription = pickFallbackTranslation(
      translations,
      'description',
      data.description,
    );

    // Если передан roomId — резолвим зал и используем room.name как scalar
    // location (для писем/PDF/поиска); FK-based валидация конфликтов
    // приоритетна над text-match.
    const room = roomId ? await this.resolveRoomForEvent(eventId, roomId) : null;
    const resolvedLocation = room
      ? room.name
      : pickFallbackTranslation(translations, 'location', location);
    const trimmedLocation = resolvedLocation?.trim() || null;
    const dateOnly = this.parseDate(date);

    await this.validateNoConflict(eventId, {
      date: dateOnly,
      startMin: this.parseTimeToMinutes(startTime),
      endMin: this.parseTimeToMinutes(startTime) + dto.duration,
      location: trimmedLocation,
      roomId: room?.id ?? null,
    });

    const nextSortOrder = await this.agendaRepository.getNextSortOrder(eventId);
    const startTimeDate = this.parseTime(startTime);

    return this.agendaRepository.create({
      ...data,
      title: resolvedTitle,
      ...(resolvedDescription && { description: resolvedDescription }),
      ...(trimmedLocation !== null && { location: trimmedLocation }),
      date: dateOnly,
      startTime: startTimeDate,
      sortOrder: dto.sortOrder ?? nextSortOrder,
      translations: (translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (translationMeta ?? {}) as Prisma.InputJsonValue,
      event: { connect: { id: eventId } },
      ...(room && { room: { connect: { id: room.id } } }),
      ...(speakerIds?.length && {
        speakers: {
          connect: speakerIds.map((id) => ({ id })),
        },
      }),
    });
  }

  async findByEvent(eventId: string): Promise<AgendaItem[]> {
    return this.agendaRepository.findByEvent(eventId);
  }

  async findById(id: string): Promise<AgendaItem> {
    const item = await this.agendaRepository.findById(id);

    if (!item) {
      throw new NotFoundException({
        code: 'AGENDA_ITEM_NOT_FOUND',
        message: 'Пункт программы не найден',
      });
    }

    return item;
  }

  async update(
    eventId: string,
    itemId: string,
    dto: UpdateAgendaItemDto,
    user: ICurrentUser,
  ): Promise<AgendaItem> {
    const event = await this.checkEventAccess(eventId, user);

    const item = await this.findById(itemId);
    if (item.eventId !== eventId) {
      throw new NotFoundException({
        code: 'AGENDA_ITEM_NOT_FOUND',
        message: 'Пункт программы не найден в этом событии',
      });
    }

    const {
      speakerIds,
      startTime,
      date,
      location,
      roomId,
      translations,
      translationMeta,
      ...data
    } = dto;

    if (date) {
      this.validateDate(date, event.startDate, event.endDate);
    }

    // Если пришли translations, пересчитываем scalar fallback для согласованности
    // (mail, search, legacy clients зависят от scalar полей).
    const updatedTitle =
      translations !== undefined && data.title === undefined
        ? pickFallbackTranslation(translations, 'title', item.title) || item.title
        : data.title;
    const updatedDescription =
      translations !== undefined && data.description === undefined
        ? pickFallbackTranslation(translations, 'description', item.description ?? undefined)
        : data.description;

    // Резолвим room: если roomId явно передан (включая null для отвязки) —
    // используем его; иначе оставляем существующий item.roomId.
    const roomChanges = roomId !== undefined;
    const effectiveRoomId = roomChanges ? roomId : item.roomId;
    const room = effectiveRoomId
      ? await this.resolveRoomForEvent(eventId, effectiveRoomId)
      : null;

    // Scalar location: room.name приоритетнее; иначе обычная цепочка fallback'ов.
    const resolvedLocation = room
      ? room.name
      : translations !== undefined && location === undefined
        ? pickFallbackTranslation(translations, 'location', item.location ?? undefined)
        : location;

    const touchesScheduling =
      date !== undefined ||
      startTime !== undefined ||
      dto.duration !== undefined ||
      resolvedLocation !== undefined ||
      roomChanges;

    let trimmedLocation: string | null | undefined;
    if (resolvedLocation !== undefined) {
      trimmedLocation = resolvedLocation?.trim() || null;
    }

    if (touchesScheduling) {
      const effectiveDate = date ? this.parseDate(date) : item.date;
      const effectiveStartMin = this.parseTimeToMinutes(
        startTime ?? this.formatTime(item.startTime),
      );
      const effectiveDuration = dto.duration ?? item.duration;
      const effectiveLocation =
        resolvedLocation !== undefined ? trimmedLocation ?? null : item.location;

      await this.validateNoConflict(
        eventId,
        {
          date: effectiveDate,
          startMin: effectiveStartMin,
          endMin: effectiveStartMin + effectiveDuration,
          location: effectiveLocation,
          roomId: room?.id ?? null,
        },
        itemId,
      );
    }

    return this.agendaRepository.update(itemId, {
      ...data,
      ...(updatedTitle !== undefined && { title: updatedTitle }),
      ...(updatedDescription !== undefined && { description: updatedDescription }),
      ...(date && { date: this.parseDate(date) }),
      ...(startTime && { startTime: this.parseTime(startTime) }),
      ...(resolvedLocation !== undefined && { location: trimmedLocation }),
      ...(roomChanges && {
        room: room ? { connect: { id: room.id } } : { disconnect: true },
      }),
      ...(translations !== undefined && {
        translations: translations as Prisma.InputJsonValue,
      }),
      ...(translationMeta !== undefined && {
        translationMeta: translationMeta as Prisma.InputJsonValue,
      }),
      ...(speakerIds !== undefined && {
        speakers: {
          set: speakerIds.map((id) => ({ id })),
        },
      }),
    });
  }

  async delete(
    eventId: string,
    itemId: string,
    user: ICurrentUser,
  ): Promise<void> {
    await this.checkEventAccessSimple(eventId, user);

    const item = await this.findById(itemId);
    if (item.eventId !== eventId) {
      throw new NotFoundException({
        code: 'AGENDA_ITEM_NOT_FOUND',
        message: 'Пункт программы не найден в этом событии',
      });
    }

    await this.agendaRepository.delete(itemId);
  }

  async reorder(
    eventId: string,
    itemIds: string[],
    user: ICurrentUser,
  ): Promise<AgendaItem[]> {
    await this.checkEventAccessSimple(eventId, user);

    await this.agendaRepository.reorder(itemIds);

    return this.findByEvent(eventId);
  }

  // === Private methods ===

  private async validateNoConflict(
    eventId: string,
    target: ConflictResolution,
    excludeId?: string,
  ): Promise<void> {
    const { date, startMin, endMin, location, roomId } = target;

    if (endMin <= startMin) {
      throw new BadRequestException({
        code: 'AGENDA_TIME_INVALID',
        message: 'Длительность должна быть положительной',
        details: { field: 'duration', startMin, endMin },
      });
    }
    if (endMin > MINUTES_PER_DAY) {
      throw new BadRequestException({
        code: 'AGENDA_TIME_INVALID',
        message: 'Пункт программы выходит за пределы суток',
        details: { field: 'duration', startMin, endMin },
      });
    }

    const candidates = await this.agendaRepository.findOverlapCandidates(
      eventId,
      date,
      excludeId,
    );

    const overlapping = candidates.filter((c) => {
      const cStart = this.timeToMinutes(c.startTime);
      const cEnd = cStart + c.duration;
      return startMin < cEnd && cStart < endMin;
    });

    if (overlapping.length === 0) {
      return;
    }

    if (overlapping.length >= MAX_PARALLEL_SESSIONS) {
      throw new ConflictException({
        code: 'AGENDA_PARALLEL_LIMIT_EXCEEDED',
        message:
          'В один временной слот допускается не более 3 параллельных сессий',
        details: {
          limit: MAX_PARALLEL_SESSIONS,
          existing: overlapping
            .slice(0, MAX_PARALLEL_SESSIONS)
            .map((c) => ({
              id: c.id,
              title: c.title,
              location: c.location,
              roomId: c.roomId,
              startMin: this.timeToMinutes(c.startTime),
              endMin: this.timeToMinutes(c.startTime) + c.duration,
            })),
        },
      });
    }

    // FK-based: если новый item привязан к роому — ищем коллизию по roomId.
    // Если в overlap есть items без roomId, подстраховываемся text-match
    // на их location, чтобы legacy-данные не вытесняли валидацию.
    if (roomId) {
      const clash = overlapping.find((c) => {
        if (c.roomId) return c.roomId === roomId;
        return false;
      });
      if (clash) {
        throw new ConflictException({
          code: 'AGENDA_ROOM_TIME_CONFLICT',
          message: 'Этот зал уже занят в выбранное время',
          details: {
            field: 'roomId',
            conflictItemId: clash.id,
            conflictTitle: clash.title,
            conflictLocation: clash.location,
            conflictRoomId: clash.roomId,
            startMin: this.timeToMinutes(clash.startTime),
            endMin: this.timeToMinutes(clash.startTime) + clash.duration,
          },
        });
      }
      return;
    }

    // Legacy text-match: roomId не передан, но есть location.
    const myLoc = this.normalizeLocation(location);
    if (!myLoc) {
      throw new BadRequestException({
        code: 'AGENDA_ROOM_REQUIRED_FOR_PARALLEL',
        message: 'Укажите зал — в это время уже идут параллельные сессии',
        details: { field: 'roomId' },
      });
    }

    const clash = overlapping.find(
      (c) => !c.roomId && this.normalizeLocation(c.location) === myLoc,
    );
    if (clash) {
      throw new ConflictException({
        code: 'AGENDA_ROOM_TIME_CONFLICT',
        message: 'Этот зал уже занят в выбранное время',
        details: {
          field: 'location',
          conflictItemId: clash.id,
          conflictTitle: clash.title,
          conflictLocation: clash.location,
          startMin: this.timeToMinutes(clash.startTime),
          endMin: this.timeToMinutes(clash.startTime) + clash.duration,
        },
      });
    }
  }

  private async resolveRoomForEvent(
    eventId: string,
    roomId: string,
  ): Promise<{ id: string; name: string }> {
    const room = await this.prisma.eventRoom.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, eventId: true, isActive: true },
    });
    if (!room || room.eventId !== eventId) {
      throw new BadRequestException({
        code: 'AGENDA_ROOM_NOT_FOUND',
        message: 'Выбранный зал не найден в этом событии',
        details: { field: 'roomId', roomId },
      });
    }
    if (!room.isActive) {
      throw new BadRequestException({
        code: 'AGENDA_ROOM_INACTIVE',
        message: 'Выбранный зал отключён. Включите его или выберите другой.',
        details: { field: 'roomId', roomId },
      });
    }
    return { id: room.id, name: room.name };
  }

  private normalizeLocation(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private timeToMinutes(time: Date): number {
    return time.getHours() * 60 + time.getMinutes();
  }

  private formatTime(time: Date): string {
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private parseTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private parseDate(dateStr: string): Date {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    return date;
  }

  private validateDate(
    dateStr: string,
    eventStartDate: Date,
    eventEndDate: Date,
  ): void {
    const date = new Date(dateStr);
    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (date < start || date > end) {
      const startStr = eventStartDate.toISOString().split('T')[0];
      const endStr = eventEndDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `Дата должна быть в пределах дат мероприятия: ${startStr} - ${endStr}`,
      );
    }
  }

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<{ organizationId: string; startDate: Date; endDate: Date }> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.agendaRepository.findEventAccess(eventId);

    if (!event) {
      throw new NotFoundException({
        code: 'AGENDA_EVENT_NOT_FOUND',
        message: 'Мероприятие не найдено',
      });
    }

    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }

    return event;
  }

  private async checkEventAccessSimple(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.agendaRepository.findEventOrganizationAccess(eventId);

    if (!event) {
      throw new NotFoundException({
        code: 'AGENDA_EVENT_NOT_FOUND',
        message: 'Мероприятие не найдено',
      });
    }

    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException(
      'Только организаторы могут управлять программой',
    );
  }
}
