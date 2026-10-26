import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  Event,
  EventStatus,
  EventAccessType,
  OrganizationVerificationStatus,
  RegistrationStatus,
} from '@prisma/client';
import { EventQueryDto, EventLifecycle, EventSortBy, SortOrder } from './dto';
import { buildEventCityWhere } from '../../common/geo';

export interface IPaginatedEvents {
  data: Event[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Стадия жизни → условие выборки.
 *
 * Разбиение PUBLISHED по датам полное и без пересечений: событие с датой начала
 * в будущем — PUBLISHED, идущее сейчас — LIVE, с истёкшей датой окончания —
 * PAST. `endDate` в схеме обязательна, поэтому проверки на null не нужны.
 */
function buildLifecycleWhere(
  lifecycle?: EventLifecycle,
): Prisma.EventWhereInput | null {
  if (!lifecycle) return null;
  const now = new Date();

  switch (lifecycle) {
    case EventLifecycle.DRAFT:
      return { status: EventStatus.DRAFT };
    case EventLifecycle.PENDING:
      return { status: EventStatus.PENDING_REVIEW };
    case EventLifecycle.CANCELLED:
      return { status: EventStatus.CANCELLED };
    case EventLifecycle.PUBLISHED:
      return { status: EventStatus.PUBLISHED, startDate: { gt: now } };
    case EventLifecycle.LIVE:
      return {
        status: EventStatus.PUBLISHED,
        startDate: { lte: now },
        endDate: { gte: now },
      };
    case EventLifecycle.PAST:
      return {
        OR: [
          { status: EventStatus.COMPLETED },
          { status: EventStatus.PUBLISHED, endDate: { lt: now } },
        ],
      };
  }
}

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EventCreateInput): Promise<Event> {
    return this.prisma.event.create({
      data,
      include: {
        organization: {
          select: { id: true, companyName: true, logoUrl: true },
        },
        rentalPlace: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            organization: {
              select: { id: true, companyName: true, logoUrl: true },
            },
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, companyName: true, logoUrl: true },
        },
        rentalPlace: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            organization: {
              select: { id: true, companyName: true, logoUrl: true },
            },
          },
        },
        categories: true,
        speakers: { orderBy: { sortOrder: 'asc' } },
        agendaItems: {
          orderBy: { sortOrder: 'asc' },
          include: { speakers: true },
        },
        registrationQuestions: { orderBy: { sortOrder: 'asc' } },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });
  }

  /**
   * Находит событие по slug
   */
  async findBySlug(slug: string): Promise<Event | null> {
    return this.prisma.event.findUnique({
      where: { slug },
      include: {
        organization: {
          select: { id: true, companyName: true, logoUrl: true },
        },
        rentalPlace: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            organization: {
              select: { id: true, companyName: true, logoUrl: true },
            },
          },
        },
        categories: true,
        speakers: { orderBy: { sortOrder: 'asc' } },
        agendaItems: {
          orderBy: { sortOrder: 'asc' },
          include: { speakers: true },
        },
        registrationQuestions: { orderBy: { sortOrder: 'asc' } },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });
  }

  /**
   * Проверяет существование slug
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!event) return false;
    if (excludeId && event.id === excludeId) return false;
    return true;
  }

  async findByOrganization(
    organizationId: string,
    query: EventQueryDto,
  ): Promise<IPaginatedEvents> {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      accessType,
      format,
      search,
      city,
      dateFrom,
      dateTo,
      tags,
      categoryId,
      categorySlug,
      lifecycle,
      sortBy = EventSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;
    const skip = (page - 1) * limit;

    const tagSlugs = tags ? tags.split(',').map((t) => t.trim()) : [];

    // Стадия и `search` оба хотят собственный OR — держим их в AND, иначе
    // второй затрёт первый и фильтр молча перестанет фильтровать.
    const and: Prisma.EventWhereInput[] = [];
    const lifecycleWhere = buildLifecycleWhere(lifecycle);
    if (lifecycleWhere) and.push(lifecycleWhere);

    // Город тоже разворачивается в собственный OR (алиасы + фолбэк на адрес),
    // поэтому живёт в AND рядом со стадией и `search`.
    const cityWhere = buildEventCityWhere(city);
    if (cityWhere) and.push(cityWhere);

    const where: Prisma.EventWhereInput = {
      organizationId,
      // Стадия выражает статус точнее (см. EventLifecycle), поэтому при её
      // наличии сырой `status` не применяем — иначе два условия по одному
      // полю дают вечно пустую выборку (например LIVE + status=DRAFT).
      ...(status && !lifecycle && { status }),
      ...(and.length > 0 && { AND: and }),
      ...(type && { type }),
      ...(accessType && { accessType }),
      ...(format && { format }),
      ...(dateFrom && { startDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { endDate: { lte: new Date(dateTo) } }),
      ...(categoryId && { categories: { some: { id: categoryId } } }),
      ...(categorySlug && { categories: { some: { slug: categorySlug } } }),
      ...(tagSlugs.length > 0 && {
        tags: {
          some: {
            tag: {
              slug: { in: tagSlugs },
            },
          },
        },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        // Вторичный ключ по id: без него страницы с одинаковым sortBy (события,
        // созданные одной пачкой) могут переставляться между запросами, и при
        // постраничной загрузке строка либо задвоится, либо потеряется.
        orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
        include: {
          rentalPlace: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
              organization: {
                select: { id: true, companyName: true, logoUrl: true },
              },
            },
          },
          categories: true,
          tags: {
            include: {
              tag: true,
            },
          },
          _count: { select: { registrations: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublished(query: EventQueryDto): Promise<IPaginatedEvents> {
    const {
      page = 1,
      limit = 10,
      type,
      accessType,
      format,
      search,
      city,
      dateFrom,
      dateTo,
      organizationId,
      tags,
      categoryId,
      categorySlug,
      collectionId,
    } = query;
    const skip = (page - 1) * limit;

    const tagSlugs = tags ? tags.split(',').map((t) => t.trim()) : [];

    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      endDate: { gte: new Date() }, // События, которые ещё не завершились
      ...(type && { type }),
      ...(accessType && { accessType }),
      ...(format && { format }),
      ...(dateFrom && { startDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { endDate: { lte: new Date(dateTo) } }),
      ...(organizationId && { organizationId }),
      ...(categoryId && { categories: { some: { id: categoryId } } }),
      ...(categorySlug && { categories: { some: { slug: categorySlug } } }),
      ...(collectionId && {
        collections: { some: { collectionId } },
      }),
      ...(tagSlugs.length > 0 && {
        tags: {
          some: {
            tag: {
              slug: { in: tagSlugs },
            },
          },
        },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Город разворачивается в собственный OR (алиасы + фолбэк на адрес),
    // поэтому уходит в AND — иначе он затёр бы OR поискового запроса выше.
    const cityWhere = buildEventCityWhere(city);
    if (cityWhere) where.AND = [cityWhere];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'asc' },
        include: {
          organization: {
            select: { id: true, companyName: true, logoUrl: true },
          },
          rentalPlace: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
              organization: {
                select: { id: true, companyName: true, logoUrl: true },
              },
            },
          },
          categories: true,
          tags: {
            include: {
              tag: true,
            },
          },
          _count: { select: { registrations: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        organization: {
          select: { id: true, companyName: true, logoUrl: true },
        },
        rentalPlace: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            organization: {
              select: { id: true, companyName: true, logoUrl: true },
            },
          },
        },
        speakers: { orderBy: { sortOrder: 'asc' } },
        agendaItems: {
          orderBy: { sortOrder: 'asc' },
          include: { speakers: true },
        },
        registrationQuestions: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  /**
   * Обновляет событие только если прочитанная сервисом версия всё ещё актуальна.
   * Это не даёт долгой форме редактирования затереть параллельный lifecycle-переход.
   */
  async updateIfCurrent(
    id: string,
    expectedStatus: EventStatus,
    expectedUpdatedAt: Date,
    data: Prisma.EventUpdateInput,
  ): Promise<Event | null> {
    try {
      return await this.prisma.event.update({
        where: { id, status: expectedStatus, updatedAt: expectedUpdatedAt },
        data,
        include: {
          organization: {
            select: { id: true, companyName: true, logoUrl: true },
          },
          rentalPlace: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
              organization: {
                select: { id: true, companyName: true, logoUrl: true },
              },
            },
          },
          speakers: { orderBy: { sortOrder: 'asc' } },
          agendaItems: {
            orderBy: { sortOrder: 'asc' },
            include: { speakers: true },
          },
          registrationQuestions: { orderBy: { sortOrder: 'asc' } },
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return null;
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.event.delete({ where: { id } });
  }

  async updateStatus(id: string, status: EventStatus): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data: { status },
    });
  }

  async getRegistrationsCount(eventId: string): Promise<number> {
    return this.prisma.registration.count({
      where: {
        eventId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
  }

  /**
   * Получить публичные события организатора
   */
  async findPublicByOrganization(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    isUpcoming?: boolean,
  ): Promise<IPaginatedEvents> {
    const skip = (page - 1) * limit;
    const now = new Date();

    // Finished events transition PUBLISHED → COMPLETED but remain publicly
    // visible (memory: completed-events-visibility / `getOrganizationEventsStats`
    // above already accepts both for the same reason). Filtering to
    // PUBLISHED-only here meant the "Past" tab on the public organizer
    // profile silently dropped every finished event — orgs like AI Alliance
    // NGO with several finished hackathons rendered "No past events".
    // For the "Upcoming" branch this is a no-op: COMPLETED events have
    // endDate < now and are excluded by the time filter regardless.
    const where: Prisma.EventWhereInput = {
      organizationId,
      deletedAt: null,
      status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
      accessType: {
        notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
      },
      organization: {
        verificationStatus: OrganizationVerificationStatus.APPROVED,
        deletedAt: null,
      },
    };

    // Фильтр по времени
    if (isUpcoming !== undefined) {
      if (isUpcoming) {
        // Предстоящие/текущие события: показываем, пока событие не завершилось
        where.endDate = { gte: now };
      } else {
        // Прошедшие события: endDate < now
        where.endDate = { lt: now };
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: isUpcoming
          ? { startDate: 'asc' } // Предстоящие: сначала ближайшие
          : { startDate: 'desc' }, // Прошедшие: сначала недавние
        include: {
          organization: {
            select: { id: true, companyName: true, logoUrl: true },
          },
          categories: { select: { slug: true } },
          rentalPlace: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
              organization: {
                select: { id: true, companyName: true, logoUrl: true },
              },
            },
          },
          _count: {
            select: {
              registrations: {
                where: { status: RegistrationStatus.APPROVED },
              },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Количество регистраций события в заданных статусах (E-16/B-1). */
  countRegistrations(
    eventId: string,
    statuses: RegistrationStatus[],
  ): Promise<number> {
    return this.prisma.registration.count({
      where: { eventId, status: { in: statuses } },
    });
  }
}
