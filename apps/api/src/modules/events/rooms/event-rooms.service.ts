import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';
import { pickFallbackTranslation } from '../../translations/dto/business-translation.dto';
import {
  CreateEventRoomDto,
  UpdateEventRoomDto,
} from './dto';

@Injectable()
export class EventRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEvent(eventId: string, user: ICurrentUser) {
    await this.checkEventAccess(eventId, user);
    return this.prisma.eventRoom.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(eventId: string, dto: CreateEventRoomDto, user: ICurrentUser) {
    await this.checkEventAccess(eventId, user);

    // Если фронт прислал translations, scalar name — fallback на первую
    // непустую локаль (или на dto.name, если все пустые).
    const scalarName =
      pickFallbackTranslation(dto.translations, 'name', dto.name) || dto.name;
    const normalizedName = this.normalizeName(scalarName);

    try {
      return await this.prisma.eventRoom.create({
        data: {
          eventId,
          name: normalizedName,
          translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EVENT_ROOM_NAME_TAKEN',
          message: `Зал с названием "${normalizedName}" уже существует в этом событии`,
        });
      }
      throw error;
    }
  }

  async update(
    eventId: string,
    roomId: string,
    dto: UpdateEventRoomDto,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);
    const existing = await this.findRoomForEvent(eventId, roomId);

    const data: Prisma.EventRoomUpdateInput = {};
    if (dto.translations !== undefined) {
      data.translations = dto.translations as Prisma.InputJsonValue;
      if (dto.name === undefined) {
        const fallback = pickFallbackTranslation(
          dto.translations,
          'name',
          existing.name,
        );
        if (fallback) data.name = this.normalizeName(fallback);
      }
    }
    if (dto.name !== undefined) {
      data.name = this.normalizeName(dto.name);
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return existing;
    }

    try {
      const updated = await this.prisma.eventRoom.update({
        where: { id: roomId },
        data,
      });

      // Если scalar name изменился — синхронизируем legacy snapshot
      // agenda_items.location, чтобы письма/PDF/поиск оставались
      // согласованными.
      if (data.name && data.name !== existing.name) {
        await this.prisma.agendaItem.updateMany({
          where: { roomId },
          data: { location: updated.name },
        });
      }

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EVENT_ROOM_NAME_TAKEN',
          message: `Зал с таким названием уже существует в этом событии`,
        });
      }
      throw error;
    }
  }

  async remove(eventId: string, roomId: string, user: ICurrentUser) {
    await this.checkEventAccess(eventId, user);
    await this.findRoomForEvent(eventId, roomId);

    const agendaItemsCount = await this.prisma.agendaItem.count({
      where: { roomId },
    });
    if (agendaItemsCount > 0) {
      throw new BadRequestException({
        code: 'EVENT_ROOM_IN_USE',
        message:
          'Зал привязан к пунктам программы. Уберите его из пунктов или деактивируйте через PATCH (isActive=false).',
        details: { agendaItemsCount },
      });
    }

    await this.prisma.eventRoom.delete({ where: { id: roomId } });
  }

  private async findRoomForEvent(eventId: string, roomId: string) {
    const room = await this.prisma.eventRoom.findUnique({
      where: { id: roomId },
    });
    if (!room || room.eventId !== eventId) {
      throw new NotFoundException({
        code: 'EVENT_ROOM_NOT_FOUND',
        message: 'Зал не найден в этом событии',
      });
    }
    return room;
  }

  private normalizeName(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
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
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException('Доступно только организаторам');
  }
}
