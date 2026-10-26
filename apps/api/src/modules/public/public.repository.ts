import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EventStatus,
  EventAccessType,
  InviteStatus,
  RegistrationStatus,
  OrganizationVerificationStatus,
  Prisma,
} from '@prisma/client';
import { EventTimeFilter, PublicEventsQueryDto } from './dto';
import { buildEventCitiesWhere, buildEventCityWhere } from '../../common/geo';
import {
  PUBLIC_EVENT_VISIBILITY_WHERE,
  hashEventInvitationToken,
} from '../../common/events';

// Публичный whitelist полей спикера. НЕ включает системные/приватные поля
// приглашений: invitationToken, invitedEmail, tokenExpiresAt, invitationStatus,
// rejectionReason, userId — их утечка на публичной странице = сбор PII и секретов
// приглашений анонимом.
const publicSpeakerSelect = Prisma.validator<Prisma.SpeakerSelect>()({
  id: true,
  firstName: true,
  lastName: true,
  position: true,
  company: true,
  bio: true,
  avatarUrl: true,
  linkedinUrl: true,
  instagramUrl: true,
  facebookUrl: true,
  websiteUrl: true,
  sortOrder: true,
  // Локализация: scalar-поля выше — fallback; localizePublicSpeaker резолвит по locale.
  translations: true,
});

/**
 * Ветка OR, открывающая закрытое (INVITE_ONLY / PRIVATE) событие его же
 * участнику. Приглашённый заходит по ссылке с inviteCode один раз, а дальше
 * возвращается из «Моих событий», из письма-напоминания или из календаря — уже
 * без кода. Без этой ветки страница отдавала 404 подтверждённому участнику.
 *
 * Отменённые и отклонённые регистрации доступ не дают: связь с событием
 * прекращена, закрытое событие снова становится невидимым.
 */
function buildViewerRegistrationVisibility(
  viewerUserId?: string,
): Prisma.EventWhereInput[] {
  if (!viewerUserId) return [];
  return [
    {
      registrations: {
        some: {
          userId: viewerUserId,
          status: {
            in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
          },
        },
      },
    },
  ];
}

const publicAgendaItemSelect = Prisma.validator<Prisma.AgendaItemSelect>()({
  id: true,
  eventId: true,
  title: true,
  description: true,
  type: true,
  date: true,
  startTime: true,
  duration: true,
  location: true,
  materials: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  speakers: { select: publicSpeakerSelect },
  // Локализация: scalar поля (title/description/location) выше — fallback;
  // localizePublicAgendaItem в сервисе резолвит итоговое значение по locale.
  translations: true,
  translationMeta: true,
  materialLabels: true,
  // FK на per-event зал. Public-страница использует room.id для табов-фильтра
  // и room.translations/room.name для локализованного отображения.
  roomId: true,
  room: {
    select: {
      id: true,
      name: true,
      translations: true,
      sortOrder: true,
    },
  },
});

@Injectable()
export class PublicRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== PLATFORM STATS ====================

  /**
   * Количество активных событий на платформе
   */
  async getActiveEventsCount(): Promise<number> {
    return this.prisma.event.count({
      where: {
        status: EventStatus.PUBLISHED,
        accessType: {
          notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
        },
        endDate: { gte: new Date() },
        organization: {
          verificationStatus: OrganizationVerificationStatus.APPROVED,
          deletedAt: null,
        },
      },
    });
  }

  /**
   * Количество новых событий за период
   */
  async getNewEventsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    return this.prisma.event.count({
      where: {
        status: EventStatus.PUBLISHED,
        accessType: {
          notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
        },
        createdAt: { gte: startDate, lte: endDate },
        organization: {
          verificationStatus: OrganizationVerificationStatus.APPROVED,
          deletedAt: null,
        },
      },
    });
  }

  /**
   * Статистика участников платформы
   */
  async getParticipantsStats(
    currentMonthStart: Date,
    previousMonthStart: Date,
    previousMonthEnd: Date,
  ): Promise<{ newCount: number; previousCount: number; total: number }> {
    const [newCount, previousCount, total] = await Promise.all([
      this.prisma.registration.count({
        where: {
          status: RegistrationStatus.APPROVED,
          createdAt: { gte: currentMonthStart },
          event: {
            organization: {
              verificationStatus: OrganizationVerificationStatus.APPROVED,
              deletedAt: null,
            },
          },
        },
      }),
      this.prisma.registration.count({
        where: {
          status: RegistrationStatus.APPROVED,
          createdAt: { gte: previousMonthStart, lt: previousMonthEnd },
          event: {
            organization: {
              verificationStatus: OrganizationVerificationStatus.APPROVED,
              deletedAt: null,
            },
          },
        },
      }),
      this.prisma.registration.count({
        where: {
          status: RegistrationStatus.APPROVED,
          event: {
            organization: {
              verificationStatus: OrganizationVerificationStatus.APPROVED,
              deletedAt: null,
            },
          },
        },
      }),
    ]);

    return { newCount, previousCount, total };
  }

  /**
   * Конверсия регистрации на платформе
   */
  async getRegistrationConversion(): Promise<{
    totalRegistrations: number;
    approvedRegistrations: number;
  }> {
    const [totalRegistrations, approvedRegistrations] = await Promise.all([
      this.prisma.registration.count({
        where: {
          event: {
            organization: {
              verificationStatus: OrganizationVerificationStatus.APPROVED,
              deletedAt: null,
            },
          },
        },
      }),
      this.prisma.registration.count({
        where: {
          status: RegistrationStatus.APPROVED,
          event: {
            organization: {
              verificationStatus: OrganizationVerificationStatus.APPROVED,
              deletedAt: null,
            },
          },
        },
      }),
    ]);

    return { totalRegistrations, approvedRegistrations };
  }

  /**
   * Общее количество организаций
   */
  async getTotalOrganizations(): Promise<number> {
    return this.prisma.organization.count({
      where: {
        verificationStatus: OrganizationVerificationStatus.APPROVED,
        deletedAt: null,
      },
    });
  }

  /**
   * Общее количество событий
   */
  async getTotalEvents(): Promise<number> {
    return this.prisma.event.count({
      where: {
        status: EventStatus.PUBLISHED,
        accessType: {
          notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
        },
        organization: {
          verificationStatus: OrganizationVerificationStatus.APPROVED,
          deletedAt: null,
        },
      },
    });
  }

  // ==================== ORGANIZATION STATS ====================

  /**
   * Paginated list of every public (APPROVED, not deleted) organization
   * together with its event counts. Powers the public `/organizers/all`
   * directory — every verified organization gets a discoverable URL, even
   * if they haven't published an event yet. Orgs are surfaced server-side
   * to keep the data fresh for SSR and the sitemap.
   *
   * Counts are gathered via a single `groupBy` so we don't N+1 across the
   * page — works even when most orgs have zero events.
   */
  async getPublicOrganizations(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const now = new Date();
    const baseWhere = {
      verificationStatus: OrganizationVerificationStatus.APPROVED,
      deletedAt: null,
    } as const;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          name: true,
          companyName: true,
          translations: true,
          logoUrl: true,
          description: true,
        },
      }),
      this.prisma.organization.count({ where: baseWhere }),
    ]);

    if (organizations.length === 0) {
      return {
        organizations: [] as Array<
          (typeof organizations)[number] & {
            eventCount: number;
            upcomingCount: number;
          }
        >,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const orgIds = organizations.map((o) => o.id);
    // Public-facing event base: any event the public can see in catalog /
    // detail. Past events transition PUBLISHED → COMPLETED in the API but
    // remain publicly visible — counting only `status=PUBLISHED` here
    // dropped every completed past event from organizer event totals and
    // made an active organizer with one upcoming + one finished event
    // read as "1 event total" instead of 2. Keep upcoming gated to
    // PUBLISHED + future endDate.
    const publicEventBaseWhere: Prisma.EventWhereInput = {
      deletedAt: null,
      status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
      accessType: {
        notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
      },
      organizationId: { in: orgIds },
    };

    const [totals, upcoming] = await Promise.all([
      this.prisma.event.groupBy({
        by: ['organizationId'],
        where: publicEventBaseWhere,
        _count: { _all: true },
      }),
      this.prisma.event.groupBy({
        by: ['organizationId'],
        where: {
          ...publicEventBaseWhere,
          status: EventStatus.PUBLISHED,
          endDate: { gte: now },
        },
        _count: { _all: true },
      }),
    ]);
    const totalsById = new Map(
      totals.map((row) => [row.organizationId, row._count._all]),
    );
    const upcomingById = new Map(
      upcoming.map((row) => [row.organizationId, row._count._all]),
    );

    const enriched = organizations
      .map((org) => ({
        ...org,
        eventCount: totalsById.get(org.id) ?? 0,
        upcomingCount: upcomingById.get(org.id) ?? 0,
      }))
      // Surface most-active organizers first; alphabetical fallback keeps
      // the order stable when many orgs share the same zero counts.
      .sort(
        (a, b) =>
          b.upcomingCount - a.upcomingCount ||
          b.eventCount - a.eventCount ||
          a.name.localeCompare(b.name),
      );

    return {
      organizations: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить организацию по ID (публичная)
   */
  async getOrganizationById(id: string) {
    return this.prisma.organization.findFirst({
      where: {
        id,
        verificationStatus: OrganizationVerificationStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        translations: true,
        logoUrl: true,
        description: true,
      },
    });
  }

  /**
   * Статистика событий организации
   */
  async getOrganizationEventsStats(
    organizationId: string,
    weekAgo: Date,
  ): Promise<{
    activeCount: number;
    totalCount: number;
    newThisWeek: number;
  }> {
    // `totalCount` powers "EVENTS HOSTED" on the public organizer profile.
    // Finished events transition PUBLISHED → COMPLETED but stay publicly
    // visible (memory: completed-events-visibility); counting only
    // PUBLISHED here under-reported the badge — an organizer with one
    // finished + one upcoming event would read "1" instead of "2".
    // `activeCount` (= "Active events" stat) keeps gated to PUBLISHED in
    // the future only — completed events are not "active".
    const baseWhere: Prisma.EventWhereInput = {
      organizationId,
      status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
      accessType: {
        notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
      },
    };
    const [activeCount, totalCount, newThisWeek] = await Promise.all([
      this.prisma.event.count({
        where: {
          ...baseWhere,
          status: EventStatus.PUBLISHED,
          endDate: { gte: new Date() },
        },
      }),
      this.prisma.event.count({ where: baseWhere }),
      this.prisma.event.count({
        where: { ...baseWhere, createdAt: { gte: weekAgo } },
      }),
    ]);

    return { activeCount, totalCount, newThisWeek };
  }

  /**
   * Статистика участников организации
   */
  async getOrganizationParticipantsStats(
    organizationId: string,
    currentMonthStart: Date,
    previousMonthStart: Date,
    previousMonthEnd: Date,
  ): Promise<{ newCount: number; previousCount: number; total: number }> {
    const [newCount, previousCount, total] = await Promise.all([
      this.prisma.registration.count({
        where: {
          event: { organizationId },
          status: RegistrationStatus.APPROVED,
          createdAt: { gte: currentMonthStart },
        },
      }),
      this.prisma.registration.count({
        where: {
          event: { organizationId },
          status: RegistrationStatus.APPROVED,
          createdAt: { gte: previousMonthStart, lt: previousMonthEnd },
        },
      }),
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
   * Конверсия регистрации организации
   */
  async getOrganizationConversion(organizationId: string): Promise<{
    totalRegistrations: number;
    approvedRegistrations: number;
  }> {
    const [totalRegistrations, approvedRegistrations] = await Promise.all([
      this.prisma.registration.count({
        where: { event: { organizationId } },
      }),
      this.prisma.registration.count({
        where: {
          event: { organizationId },
          status: RegistrationStatus.APPROVED,
        },
      }),
    ]);

    return { totalRegistrations, approvedRegistrations };
  }

  // ==================== PUBLIC EVENTS ====================

  /**
   * Получить публичные события с пагинацией
   */
  async getPublicEvents(query: PublicEventsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      cities,
      format,
      type,
      filter,
      featured,
      category,
    } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    // Multi-city filter: comma-separated list of alternative spellings
    // (e.g. "tashkent,Ташкент,Toshkent"). Used by city landing pages so a
    // single canonical city slug picks up events stored under any variant.
    // Empty strings are dropped; if no usable variants remain we skip the
    // filter entirely rather than emit an empty `OR` (which Prisma rejects).
    // Каждое написание разворачивается в алиасы города и фолбэк на адрес
    // (см. buildEventCityWhere): мобильное приложение шлёт латиницу, а в базе
    // город бывает по-русски или пуст — тогда его ищем в `address`.
    const cityClause: Prisma.EventWhereInput | undefined =
      buildEventCitiesWhere(cities) ?? buildEventCityWhere(city);

    // Для прошедших событий включаем и COMPLETED статус
    const statusFilter =
      filter === EventTimeFilter.PAST
        ? { status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] } }
        : { status: EventStatus.PUBLISHED };

    const where: Prisma.EventWhereInput = {
      // Общие правила видимости — те же, по которым считаются счётчики
      // категорий, иначе витрина и лендинг категории расходятся.
      ...PUBLIC_EVENT_VISIBILITY_WHERE,
      ...statusFilter,
      ...(filter === EventTimeFilter.UPCOMING && { endDate: { gte: now } }),
      ...(filter === EventTimeFilter.PAST && { endDate: { lt: now } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
      // Город — в AND: он сам разворачивается в OR (алиасы + фолбэк на адрес)
      // и спредом затёр бы OR поискового запроса выше.
      ...(cityClause && { AND: [cityClause] }),
      ...(format && { format }),
      ...(type && { type }),
      ...(featured !== undefined && { isFeatured: featured }),
      ...(category && {
        categories: { some: { slug: category, isActive: true } },
      }),
    };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isFeatured: 'desc' }, // Топовые события первыми
          {
            startDate: filter === EventTimeFilter.PAST ? 'desc' : 'asc',
          },
        ],
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          translations: true,
          coverImage: true,
          startDate: true,
          endDate: true,
          format: true,
          type: true,
          status: true,
          city: true,
          venue: true,
          latitude: true,
          longitude: true,
          price: true,
          currency: true,
          categories: {
            select: { slug: true, name: true, translations: true },
          },
          maxParticipants: true,
          isFeatured: true,
          organization: {
            select: {
              id: true,
              name: true,
              companyName: true,
              translations: true,
              logoUrl: true,
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
      events: events.map((e) => ({
        ...e,
        registrationsCount: e._count.registrations,
        _count: undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Проверить событие по ID на удаление (для ответа 410)
   */
  async getEventByIdForDeletedCheck(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, deletionReason: true },
    });
  }

  /**
   * Получить событие по ID (публичное)
   */
  async getPublicEventById(id: string, viewerUserId?: string) {
    return this.prisma.event.findFirst({
      where: {
        id,
        deletedAt: null,
        // Завершённые события остаются публичными (как в листинге прошедших),
        // чтобы страница события не отдавала 404 после окончания.
        status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        OR: [
          {
            accessType: {
              notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
            },
          },
          ...buildViewerRegistrationVisibility(viewerUserId),
        ],
        organization: {
          verificationStatus: OrganizationVerificationStatus.APPROVED,
          deletedAt: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            translations: true,
            logoUrl: true,
            description: true,
          },
        },
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, slug: true, name: true, translations: true },
        },
        rentalPlace: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
            organization: {
              select: {
                id: true,
                companyName: true,
                translations: true,
                logoUrl: true,
              },
            },
          },
        },
        speakers: {
          orderBy: { sortOrder: 'asc' },
          select: publicSpeakerSelect,
        },
        agendaItems: {
          orderBy: { sortOrder: 'asc' },
          select: publicAgendaItemSelect,
        },
        rooms: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            translations: true,
            sortOrder: true,
          },
        },
        registrationQuestions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            question: true,
            type: true,
            isRequired: true,
            options: true,
            sortOrder: true,
            category: true,
            points: true,
            informationalText: true,
            // Локализация: scalar поля выше — fallback;
            // localizePublicQuestion в сервисе резолвит итог по locale.
            translations: true,
            optionsTranslations: true,
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
    });
  }

  /**
   * Проверить slug на удаление (для ответа 410)
   */
  async getEventBySlugForDeletedCheck(slug: string) {
    return this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, deletedAt: true, deletionReason: true },
    });
  }

  /**
   * Инкрементирует счётчик публичных просмотров события.
   * Вызывается при открытии публичной страницы по slug.
   */
  async incrementEventViews(id: string): Promise<void> {
    await this.prisma.event.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });
  }

  /**
   * Получить событие по slug (публичное, для SEO-friendly URL)
   */
  async getPublicEventBySlug(
    slug: string,
    inviteCode?: string,
    viewerUserId?: string,
  ) {
    return this.prisma.event.findFirst({
      where: {
        slug,
        deletedAt: null,
        // Завершённые события остаются публичными (как в листинге прошедших),
        // чтобы страница события не отдавала 404 после окончания.
        status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        OR: [
          {
            accessType: {
              notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
            },
          },
          ...(inviteCode
            ? [
                {
                  accessType: EventAccessType.INVITE_ONLY,
                  inviteCode,
                },
                // PRIVATE: `inviteCode` carries a personal invitation token.
                {
                  accessType: EventAccessType.PRIVATE,
                  invitations: {
                    some: {
                      tokenHash: hashEventInvitationToken(inviteCode),
                      status: InviteStatus.PENDING,
                    },
                  },
                },
              ]
            : []),
          ...buildViewerRegistrationVisibility(viewerUserId),
        ],
        organization: {
          verificationStatus: OrganizationVerificationStatus.APPROVED,
          deletedAt: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            translations: true,
            logoUrl: true,
            description: true,
          },
        },
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, slug: true, name: true, translations: true },
        },
        rentalPlace: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
            organization: {
              select: {
                id: true,
                companyName: true,
                translations: true,
                logoUrl: true,
              },
            },
          },
        },
        speakers: {
          orderBy: { sortOrder: 'asc' },
          select: publicSpeakerSelect,
        },
        agendaItems: {
          orderBy: { sortOrder: 'asc' },
          select: publicAgendaItemSelect,
        },
        rooms: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            translations: true,
            sortOrder: true,
          },
        },
        registrationQuestions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            question: true,
            type: true,
            isRequired: true,
            options: true,
            sortOrder: true,
            category: true,
            points: true,
            informationalText: true,
            // Локализация: scalar поля выше — fallback;
            // localizePublicQuestion в сервисе резолвит итог по locale.
            translations: true,
            optionsTranslations: true,
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
    });
  }

  /**
   * Получить событие для проверки возможности регистрации
   */
  /** True when `rawToken` is a PENDING personal invitation to this event. */
  async hasPendingEventInvitation(
    eventId: string,
    rawToken: string,
  ): Promise<boolean> {
    const count = await this.prisma.eventInvitation.count({
      where: {
        eventId,
        tokenHash: hashEventInvitationToken(rawToken),
        status: InviteStatus.PENDING,
      },
    });
    return count > 0;
  }

  async getEventForRegistrationCheck(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        accessType: true,
        registrationDeadline: true,
        registrationOpen: true,
        maxParticipants: true,
        // E-3: тарифный клэмп участников
        organizationId: true,
        createdAt: true,
        _count: {
          select: {
            registrations: {
              where: {
                status: {
                  in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
                },
              },
            },
          },
        },
      },
    });
  }
}
