import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, EventTag, TagCategory } from '@prisma/client';

export interface ITagWithEvents extends EventTag {
  _count?: {
    events: number;
  };
}

@Injectable()
export class TagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт новый тег
   */
  async create(data: Prisma.EventTagCreateInput): Promise<EventTag> {
    return this.prisma.eventTag.create({ data });
  }

  /**
   * Находит тег по ID
   */
  async findById(id: string): Promise<EventTag | null> {
    return this.prisma.eventTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });
  }

  /**
   * Находит тег по slug и organizationId
   */
  async findBySlugAndOrg(
    slug: string,
    organizationId: string | null,
  ): Promise<EventTag | null> {
    return this.prisma.eventTag.findFirst({
      where: {
        slug,
        organizationId,
      },
    });
  }

  /**
   * Получает все доступные теги (системные + теги организации)
   */
  async findAvailableTags(
    organizationId?: string,
    category?: TagCategory,
  ): Promise<ITagWithEvents[]> {
    const where: Prisma.EventTagWhereInput = {
      OR: [
        { isSystem: true }, // Системные теги
        ...(organizationId ? [{ organizationId }] : []), // Теги организации
      ],
      ...(category && { category }),
    };

    return this.prisma.eventTag.findMany({
      where,
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Получает теги организации
   */
  async findByOrganization(organizationId: string): Promise<EventTag[]> {
    return this.prisma.eventTag.findMany({
      where: {
        organizationId,
        isSystem: false,
      },
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Получает теги мероприятия
   */
  async findByEventId(eventId: string): Promise<EventTag[]> {
    const assignments = await this.prisma.eventTagAssignment.findMany({
      where: { eventId },
      include: {
        tag: true,
      },
    });

    return assignments.map((a) => a.tag);
  }

  /**
   * Назначает теги мероприятию (заменяет существующие)
   */
  async assignToEvent(eventId: string, tagIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      // Удаляем старые связи
      this.prisma.eventTagAssignment.deleteMany({
        where: { eventId },
      }),
      // Создаём новые
      this.prisma.eventTagAssignment.createMany({
        data: tagIds.map((tagId) => ({ eventId, tagId })),
      }),
    ]);
  }

  /**
   * Удаляет тег
   */
  async delete(id: string): Promise<void> {
    await this.prisma.eventTag.delete({ where: { id } });
  }

  /**
   * Проверяет существование тегов по массиву ID
   */
  async checkTagsExist(tagIds: string[]): Promise<boolean> {
    const count = await this.prisma.eventTag.count({
      where: {
        id: { in: tagIds },
      },
    });

    return count === tagIds.length;
  }

  /**
   * Проверяет доступность тегов для организации
   * Возвращает true если все теги либо системные, либо принадлежат организации
   */
  async checkTagsAccessible(
    tagIds: string[],
    organizationId: string,
  ): Promise<boolean> {
    const tags = await this.prisma.eventTag.findMany({
      where: {
        id: { in: tagIds },
      },
      select: {
        isSystem: true,
        organizationId: true,
      },
    });

    return tags.every(
      (tag) => tag.isSystem || tag.organizationId === organizationId,
    );
  }

  /**
   * Получает количество мероприятий с тегом
   */
  async getEventCount(tagId: string): Promise<number> {
    return this.prisma.eventTagAssignment.count({
      where: { tagId },
    });
  }
}
