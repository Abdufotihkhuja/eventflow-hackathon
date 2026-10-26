import { Injectable } from '@nestjs/common';
import { Prisma, EventCollection, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailableEventsQueryDto, CollectionQueryDto } from './dto';

export interface MinimalEventForPicker {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
}

export interface CollectionWithEventCount extends EventCollection {
  _count: {
    events: number;
  };
}

export interface CollectionWithEvents extends EventCollection {
  events: {
    event: {
      id: string;
      title: string;
      shortDescription: string | null;
      translations: Prisma.JsonValue;
      slug: string;
      coverImage: string | null;
      startDate: Date;
      endDate: Date;
      format: string;
      type: string;
      city: string | null;
      status: string;
      organization: {
        id: string;
        name: string;
        translations: Prisma.JsonValue;
        logoUrl: string | null;
      };
    };
    sortOrder: number;
  }[];
  _count: {
    events: number;
  };
}

@Injectable()
export class CollectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.EventCollectionCreateInput,
  ): Promise<EventCollection> {
    return this.prisma.eventCollection.create({ data });
  }

  async findById(id: string): Promise<EventCollection | null> {
    return this.prisma.eventCollection.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<EventCollection | null> {
    return this.prisma.eventCollection.findUnique({ where: { slug } });
  }

  async findByIdWithEvents(id: string): Promise<CollectionWithEvents | null> {
    return this.prisma.eventCollection.findUnique({
      where: { id },
      include: {
        events: {
          where: {
            event: { status: EventStatus.PUBLISHED },
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                shortDescription: true,
                translations: true,
                slug: true,
                coverImage: true,
                startDate: true,
                endDate: true,
                format: true,
                type: true,
                city: true,
                status: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    translations: true,
                    logoUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            events: {
              where: {
                event: { status: EventStatus.PUBLISHED },
              },
            },
          },
        },
      },
    });
  }

  async findBySlugWithEvents(
    slug: string,
  ): Promise<CollectionWithEvents | null> {
    return this.prisma.eventCollection.findUnique({
      where: { slug },
      include: {
        events: {
          where: {
            event: { status: EventStatus.PUBLISHED },
          },
          orderBy: { sortOrder: 'asc' },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                shortDescription: true,
                translations: true,
                slug: true,
                coverImage: true,
                startDate: true,
                endDate: true,
                format: true,
                type: true,
                city: true,
                status: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    translations: true,
                    logoUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            events: {
              where: {
                event: { status: EventStatus.PUBLISHED },
              },
            },
          },
        },
      },
    });
  }

  async findMany(
    query: CollectionQueryDto,
  ): Promise<{ data: CollectionWithEventCount[]; total: number }> {
    const { search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EventCollectionWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.eventCollection.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        include: {
          _count: {
            select: {
              events: {
                where: {
                  event: { status: EventStatus.PUBLISHED },
                },
              },
            },
          },
        },
      }),
      this.prisma.eventCollection.count({ where }),
    ]);

    return { data, total };
  }

  async findAvailableEventsForPicker(query: AvailableEventsQueryDto): Promise<{
    data: MinimalEventForPicker[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
      status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: data as MinimalEventForPicker[],
      total,
      page,
      limit,
    };
  }

  async findAllActive(): Promise<CollectionWithEventCount[]> {
    return this.prisma.eventCollection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        _count: {
          select: {
            events: {
              where: {
                event: { status: EventStatus.PUBLISHED },
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.EventCollectionUpdateInput,
  ): Promise<EventCollection> {
    return this.prisma.eventCollection.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.eventCollection.delete({ where: { id } });
  }

  // ==================== Управление событиями в подборке ====================

  async addEvents(collectionId: string, eventIds: string[]): Promise<void> {
    // Получаем максимальный sortOrder
    const maxSortOrder = await this.prisma.eventCollectionItem.aggregate({
      where: { collectionId },
      _max: { sortOrder: true },
    });

    let currentSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // Добавляем события, которых ещё нет в подборке
    for (const eventId of eventIds) {
      await this.prisma.eventCollectionItem.upsert({
        where: {
          collectionId_eventId: { collectionId, eventId },
        },
        create: {
          collectionId,
          eventId,
          sortOrder: currentSortOrder++,
        },
        update: {}, // Если уже есть - ничего не делаем
      });
    }
  }

  async removeEvents(collectionId: string, eventIds: string[]): Promise<void> {
    await this.prisma.eventCollectionItem.deleteMany({
      where: {
        collectionId,
        eventId: { in: eventIds },
      },
    });
  }

  async reorderEvents(collectionId: string, eventIds: string[]): Promise<void> {
    // Обновляем sortOrder для каждого события
    await this.prisma.$transaction(
      eventIds.map((eventId, index) =>
        this.prisma.eventCollectionItem.update({
          where: {
            collectionId_eventId: { collectionId, eventId },
          },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async getCollectionEvents(collectionId: string) {
    return this.prisma.eventCollectionItem.findMany({
      where: { collectionId },
      orderBy: { sortOrder: 'asc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            shortDescription: true,
            translations: true,
            slug: true,
            coverImage: true,
            startDate: true,
            endDate: true,
            format: true,
            type: true,
            city: true,
            status: true,
            organization: {
              select: {
                id: true,
                name: true,
                translations: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });
  }
}
