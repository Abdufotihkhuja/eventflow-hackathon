import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  EventAccessType,
  UserType,
  RegistrationStatus,
} from '@prisma/client';
import { PublicRepository } from './public.repository';
import { CapacityClampService } from '../billing/entitlements/capacity-clamp.service';
import { RegistrationsRepository } from '../registrations/registrations.repository';
import type { ICurrentUser } from '../../common/interfaces';
import {
  PlatformStatsDto,
  OrganizationPublicStatsDto,
  PublicEventsListDto,
  PublicEventsQueryDto,
  PublicEventItemDto,
} from './dto';
import {
  availableLocalesFromTranslations,
  resolveLocalizedBusinessField,
} from '../translations/localized-business-field.util';
import { resolveLocalizedRichText } from '../translations/localized-rich-text.util';

/**
 * id зрителя-участника для запросов видимости события. Только UserType.USER:
 * регистрации есть лишь у пользователей, организация видит свои события через
 * рабочее пространство.
 */
function participantUserId(user?: ICurrentUser): string | undefined {
  return user?.type === UserType.USER ? user.sub : undefined;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly publicRepository: PublicRepository,
    private readonly registrationsRepository: RegistrationsRepository,
    private readonly capacityClamp: CapacityClampService,
  ) {}

  /**
   * Получить общую статистику платформы для landing page
   */
  async getPlatformStats(): Promise<PlatformStatsDto> {
    const now = new Date();

    // Периоды для расчётов
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const previousMonthEnd = currentMonthStart;

    // Получаем все данные параллельно
    const [
      activeEventsCount,
      newEventsThisWeek,
      participantsStats,
      conversionStats,
      totalOrganizations,
      totalEvents,
    ] = await Promise.all([
      this.publicRepository.getActiveEventsCount(),
      this.publicRepository.getNewEventsInPeriod(weekAgo, now),
      this.publicRepository.getParticipantsStats(
        currentMonthStart,
        previousMonthStart,
        previousMonthEnd,
      ),
      this.publicRepository.getRegistrationConversion(),
      this.publicRepository.getTotalOrganizations(),
      this.publicRepository.getTotalEvents(),
    ]);

    // Вычисляем MoM изменение участников
    const momChangePercent = this.calculateChangePercent(
      participantsStats.newCount,
      participantsStats.previousCount,
    );

    // Конверсия регистрации
    const conversionRate =
      conversionStats.totalRegistrations > 0
        ? Math.round(
            (conversionStats.approvedRegistrations /
              conversionStats.totalRegistrations) *
              100,
          )
        : 0;

    return {
      activeEvents: {
        value: activeEventsCount,
        change: newEventsThisWeek,
        period: 'за неделю',
      },
      newParticipants: {
        value: participantsStats.newCount,
        changePercent: momChangePercent,
        changeType: 'MoM',
      },
      registrationConversion: {
        value: conversionRate,
        description: 'по всем событиям',
      },
      totalOrganizations,
      totalParticipants: participantsStats.total,
      totalEvents,
    };
  }

  /**
   * Paginated list of every public organization (APPROVED, not deleted)
   * with event counts. Powers the public `/organizers/all` directory.
   * Localizes `name` / `description` per `locale`; logoUrl/url pass through.
   * Even orgs with zero events are surfaced — keeping verified profiles
   * discoverable.
   */
  async getPublicOrganizations(query: {
    page?: number;
    limit?: number;
    locale?: string;
  }) {
    const { page = 1, limit = 50, locale } = query;
    const result = await this.publicRepository.getPublicOrganizations({
      page,
      limit,
    });
    return {
      ...result,
      organizations: result.organizations.map((org) =>
        this.localizePublicOrganization(org, locale),
      ),
    };
  }

  /**
   * Получить публичную статистику организации
   */
  async getOrganizationStats(
    organizationId: string,
    locale?: string,
  ): Promise<OrganizationPublicStatsDto> {
    const organization =
      await this.publicRepository.getOrganizationById(organizationId);

    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const previousMonthEnd = currentMonthStart;

    const [eventsStats, participantsStats, conversionStats] = await Promise.all(
      [
        this.publicRepository.getOrganizationEventsStats(
          organizationId,
          weekAgo,
        ),
        this.publicRepository.getOrganizationParticipantsStats(
          organizationId,
          currentMonthStart,
          previousMonthStart,
          previousMonthEnd,
        ),
        this.publicRepository.getOrganizationConversion(organizationId),
      ],
    );

    const momChangePercent = this.calculateChangePercent(
      participantsStats.newCount,
      participantsStats.previousCount,
    );

    const conversionRate =
      conversionStats.totalRegistrations > 0
        ? Math.round(
            (conversionStats.approvedRegistrations /
              conversionStats.totalRegistrations) *
              100,
          )
        : 0;

    return {
      id: organization.id,
      name: resolveLocalizedBusinessField(
        organization.translations,
        'name',
        locale,
        organization.name,
      ),
      logoUrl: organization.logoUrl ?? undefined,
      activeEvents: {
        value: eventsStats.activeCount,
        change: eventsStats.newThisWeek,
        period: 'за неделю',
      },
      newParticipants: {
        value: participantsStats.newCount,
        changePercent: momChangePercent,
        changeType: 'MoM',
      },
      registrationConversion: {
        value: conversionRate,
        description: 'по всем событиям',
      },
      totalEvents: eventsStats.totalCount,
      totalParticipants: participantsStats.total,
    };
  }

  /**
   * Получить список публичных событий
   */
  async getPublicEvents(
    query: PublicEventsQueryDto,
  ): Promise<PublicEventsListDto> {
    const result = await this.publicRepository.getPublicEvents(query);

    const items: PublicEventItemDto[] = result.events.map((event) => {
      const organization = this.localizePublicOrganization(
        event.organization,
        query.locale,
      );

      return {
        id: event.id,
        slug: event.slug,
        title: resolveLocalizedBusinessField(
          event.translations,
          'title',
          query.locale,
          event.title,
        ),
        shortDescription:
          resolveLocalizedBusinessField(
            event.translations,
            'shortDescription',
            query.locale,
            event.shortDescription,
          ) || undefined,
        coverImage: event.coverImage ?? undefined,
        startDate: event.startDate,
        endDate: event.endDate,
        format: event.format,
        type: event.type,
        status: event.status,
        city: event.city ?? undefined,
        categories: (event.categories ?? []).map((category) => ({
          slug: category.slug,
          name: resolveLocalizedBusinessField(
            category.translations,
            'name',
            query.locale,
            category.name,
          ),
        })),
        maxParticipants: event.maxParticipants ?? undefined,
        registrationsCount: event.registrationsCount,
        isFeatured: event.isFeatured,
        venue: event.venue ?? undefined,
        price: event.price != null ? Number(event.price) : undefined,
        currency: event.currency,
        latitude: event.latitude != null ? Number(event.latitude) : undefined,
        longitude:
          event.longitude != null ? Number(event.longitude) : undefined,
        organization: {
          id: organization.id,
          name: organization.name,
          logoUrl: organization.logoUrl ?? undefined,
        },
      };
    });

    return {
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Получить событие по ID (публичное).
   * При переданном user (USER) добавляется myRegistration, если пользователь зарегистрирован.
   */
  async getPublicEventById(id: string, user?: ICurrentUser, locale?: string) {
    const deletedCheck =
      await this.publicRepository.getEventByIdForDeletedCheck(id);
    if (deletedCheck?.deletedAt) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          deleted: true,
          deletionReason: deletedCheck.deletionReason ?? undefined,
          deletedAt: deletedCheck.deletedAt.toISOString(),
        },
        HttpStatus.GONE,
      );
    }

    const event = await this.publicRepository.getPublicEventById(
      id,
      participantUserId(user),
    );

    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    const myRegistration = await this.getMyRegistrationForEvent(event.id, user);

    const localizedEvent = this.localizePublicEvent(event, locale);

    return {
      ...localizedEvent,
      ...this.gatedOnlineUrl(event, myRegistration),
      registrationsCount: event._count.registrations,
      _count: undefined,
      myRegistration,
    };
  }

  /**
   * Получить событие по slug (публичное, для SEO-friendly URL).
   * При переданном user (USER) добавляется myRegistration, если пользователь зарегистрирован.
   * Возвращает 410 Gone если событие удалено супер-админом.
   */
  async getPublicEventBySlug(
    slug: string,
    user?: ICurrentUser,
    locale?: string,
    inviteCode?: string,
  ) {
    const deletedCheck =
      await this.publicRepository.getEventBySlugForDeletedCheck(slug);
    if (deletedCheck?.deletedAt) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          deleted: true,
          deletionReason: deletedCheck.deletionReason ?? undefined,
          deletedAt: deletedCheck.deletedAt.toISOString(),
        },
        HttpStatus.GONE,
      );
    }

    const event = await this.publicRepository.getPublicEventBySlug(
      slug,
      inviteCode,
      participantUserId(user),
    );

    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    // Count one public view, but never inflate on the owning organization's own
    // preview. Fire-and-forget: a counter failure must not break page rendering.
    const viewerOrgId =
      user?.type === UserType.ORGANIZATION ? user.sub : user?.organizationId;
    if (viewerOrgId !== event.organizationId) {
      void this.publicRepository
        .incrementEventViews(event.id)
        .catch(() => undefined);
    }

    const myRegistration = await this.getMyRegistrationForEvent(event.id, user);

    const localizedEvent = this.localizePublicEvent(event, locale);

    return {
      ...localizedEvent,
      ...this.gatedOnlineUrl(event, myRegistration),
      registrationsCount: event._count.registrations,
      _count: undefined,
      myRegistration,
    };
  }

  /**
   * Возвращает регистрацию текущего пользователя на событие или null.
   * Учитываются только пользователи типа USER.
   */
  /**
   * Возвращает { onlineUrl } только если пользователь — одобренный (APPROVED)
   * регистрант события; иначе { onlineUrl: null }. localizePublicEvent уже
   * вырезал сырое поле, так что для анонима/непричастного ссылки нет.
   */
  private gatedOnlineUrl(
    event: unknown,
    myRegistration: { status: string } | null,
  ): { onlineUrl: string | null } {
    const approved = myRegistration?.status === RegistrationStatus.APPROVED;
    const url = (event as { onlineUrl?: string | null }).onlineUrl ?? null;
    return { onlineUrl: approved ? url : null };
  }

  private async getMyRegistrationForEvent(
    eventId: string,
    user?: ICurrentUser,
  ): Promise<{ id: string; status: string; eventId: string } | null> {
    if (!user || user.type !== UserType.USER) {
      return null;
    }

    const registration = await this.registrationsRepository.findByEventAndUser(
      eventId,
      user.sub,
    );

    if (!registration) {
      return null;
    }

    return {
      id: registration.id,
      status: registration.status,
      eventId: registration.eventId,
    };
  }

  /**
   * Проверить возможность регистрации на событие
   */
  async canRegister(
    eventId: string,
    inviteCode?: string,
  ): Promise<{
    canRegister: boolean;
    reason?: string;
    /** Stable code so the frontend can localize without parsing the message. */
    reasonCode?:
      | 'PRIVATE'
      | 'NOT_PUBLISHED'
      | 'DEADLINE_PASSED'
      | 'CAPACITY_FULL'
      | 'MANUALLY_CLOSED';
    accessType: EventAccessType;
    requiresInviteCode: boolean;
  }> {
    const event =
      await this.publicRepository.getEventForRegistrationCheck(eventId);

    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    const baseResult = {
      accessType: event.accessType,
      requiresInviteCode: event.accessType === EventAccessType.INVITE_ONLY,
    };

    // PRIVATE opens only to a personal invitation token (passed as inviteCode).
    if (
      event.accessType === EventAccessType.PRIVATE &&
      !(
        inviteCode &&
        (await this.publicRepository.hasPendingEventInvitation(
          eventId,
          inviteCode,
        ))
      )
    ) {
      return {
        ...baseResult,
        canRegister: false,
        reasonCode: 'PRIVATE',
        reason: 'Регистрация на приватное мероприятие недоступна',
      };
    }

    if (event.status !== EventStatus.PUBLISHED) {
      return {
        ...baseResult,
        canRegister: false,
        reasonCode: 'NOT_PUBLISHED',
        reason: 'Мероприятие недоступно для регистрации',
      };
    }

    // Ручной переключатель организатора имеет приоритет над автологикой ниже
    if (event.registrationOpen === false) {
      return {
        ...baseResult,
        canRegister: false,
        reasonCode: 'MANUALLY_CLOSED',
        reason: 'Регистрация закрыта организатором',
      };
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return {
        ...baseResult,
        canRegister: false,
        reasonCode: 'DEADLINE_PASSED',
        reason: 'Регистрация закрыта',
      };
    }

    // E-3: min(организаторский, тарифный) кап; pre-cutover события — без тарифного.
    const capInfo = await this.capacityClamp.effectiveEventCap(
      event.organizationId,
      { createdAt: event.createdAt, maxParticipants: event.maxParticipants },
    );
    if (capInfo.cap !== null) {
      const count = event._count.registrations;
      if (count >= capInfo.cap) {
        return {
          ...baseResult,
          canRegister: false,
          reasonCode: 'CAPACITY_FULL',
          reason: 'Достигнут лимит участников',
        };
      }
    }

    return { ...baseResult, canRegister: true };
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

  private localizePublicEvent<T extends object>(event: T, locale?: string): T {
    const {
      translations,
      title,
      shortDescription,
      description,
      richTranslations,
      organization,
      venue,
      address,
      city,
      agendaItems,
      speakers,
      registrationQuestions,
      categories,
      ...rest
    } = event as Record<string, unknown>;
    delete (rest as Record<string, unknown>).translationMeta;
    delete (rest as Record<string, unknown>).richTranslationMeta;
    // onlineUrl (ссылка на онлайн-встречу) НЕ отдаётся анонимам/непричастным.
    // Возвращается вызывающими методами только одобренным (APPROVED)
    // регистрантам события. Иначе любой мог бы зайти на закрытую онлайн-встречу.
    delete (rest as Record<string, unknown>).onlineUrl;

    return {
      ...rest,
      // Locales that have a real `title` translation. Empty → only scalar
      // content exists (locale-unknown), so the public web app should not
      // claim to be the canonical version in any specific locale's index.
      availableLocales: availableLocalesFromTranslations(translations, 'title'),
      title: resolveLocalizedBusinessField(
        translations,
        'title',
        locale,
        typeof title === 'string' ? title : '',
      ),
      shortDescription:
        resolveLocalizedBusinessField(
          translations,
          'shortDescription',
          locale,
          typeof shortDescription === 'string' ? shortDescription : null,
        ) || null,
      venue:
        resolveLocalizedBusinessField(
          translations,
          'venue',
          locale,
          typeof venue === 'string' ? venue : null,
        ) || null,
      address:
        resolveLocalizedBusinessField(
          translations,
          'address',
          locale,
          typeof address === 'string' ? address : null,
        ) || null,
      city:
        resolveLocalizedBusinessField(
          translations,
          'city',
          locale,
          typeof city === 'string' ? city : null,
        ) || null,
      description:
        resolveLocalizedRichText({
          richTranslations,
          fieldKey: 'description',
          requestedLocale: locale,
          fallbackDocument: description,
        }) ?? description,
      organization:
        organization && typeof organization === 'object'
          ? this.localizePublicOrganization(
              organization as Record<string, unknown>,
              locale,
            )
          : organization,
      agendaItems: Array.isArray(agendaItems)
        ? agendaItems.map((item) =>
            this.localizePublicAgendaItem(
              item as Record<string, unknown>,
              locale,
            ),
          )
        : agendaItems,
      rooms: Array.isArray((rest as Record<string, unknown>).rooms)
        ? ((rest as Record<string, unknown>).rooms as Array<Record<string, unknown>>).map(
            (room) => ({
              id: room.id,
              sortOrder: room.sortOrder,
              name:
                resolveLocalizedBusinessField(
                  room.translations,
                  'name',
                  locale,
                  typeof room.name === 'string' ? room.name : '',
                ) || room.name,
            }),
          )
        : (rest as Record<string, unknown>).rooms,
      speakers: Array.isArray(speakers)
        ? speakers.map((sp) =>
            this.localizePublicSpeaker(sp as Record<string, unknown>, locale),
          )
        : speakers,
      registrationQuestions: Array.isArray(registrationQuestions)
        ? registrationQuestions.map((q) =>
            this.localizePublicQuestion(q as Record<string, unknown>, locale),
          )
        : registrationQuestions,
      categories: Array.isArray(categories)
        ? categories.map((category) => {
            const c = category as Record<string, unknown>;
            return {
              slug: c.slug,
              name:
                resolveLocalizedBusinessField(
                  c.translations,
                  'name',
                  locale,
                  typeof c.name === 'string' ? c.name : '',
                ) || c.name,
            };
          })
        : [],
    } as unknown as T;
  }

  private localizePublicQuestion(
    question: Record<string, unknown>,
    locale?: string,
  ): Record<string, unknown> {
    const {
      translations,
      optionsTranslations,
      question: questionText,
      informationalText,
      options,
      ...rest
    } = question;

    const localizedQuestion = resolveLocalizedBusinessField(
      translations,
      'question',
      locale,
      typeof questionText === 'string' ? questionText : '',
    );
    const localizedInfo = resolveLocalizedBusinessField(
      translations,
      'informationalText',
      locale,
      typeof informationalText === 'string' ? informationalText : null,
    );

    // Resolve options array per locale: ui-locale → ru → uz → en → scalar.
    const optsObj =
      optionsTranslations &&
      typeof optionsTranslations === 'object' &&
      !Array.isArray(optionsTranslations)
        ? (optionsTranslations as Record<string, unknown>)
        : null;
    const orderedLocales: Array<'ru' | 'uz' | 'en'> = ['ru', 'uz', 'en'];
    const tryLocale = (l: string): string[] | null => {
      if (!optsObj) return null;
      const arr = optsObj[l];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((v) => (typeof v === 'string' ? v : ''));
      }
      return null;
    };
    let localizedOptions: string[] = Array.isArray(options) ? (options as string[]) : [];
    if (locale && (locale === 'ru' || locale === 'uz' || locale === 'en')) {
      localizedOptions = tryLocale(locale) ?? localizedOptions;
    }
    if (
      (!localizedOptions || localizedOptions.length === 0) &&
      optsObj
    ) {
      for (const l of orderedLocales) {
        const v = tryLocale(l);
        if (v) {
          localizedOptions = v;
          break;
        }
      }
    }

    return {
      ...rest,
      question: localizedQuestion,
      informationalText: localizedInfo || null,
      options: localizedOptions,
      // Также отдаём scalar options как `optionValues` чтобы фронт мог
      // сабмитить ответ с serverim значением (sale-evaluation matches scalar).
      optionValues: Array.isArray(options) ? (options as string[]) : [],
    };
  }

  private localizePublicAgendaItem(
    item: Record<string, unknown>,
    locale?: string,
  ): Record<string, unknown> {
    const { translations, title, description, location, materialLabels, room, ...rest } = item;
    delete (rest as Record<string, unknown>).translationMeta;

    const localizedTitle = resolveLocalizedBusinessField(
      translations,
      'title',
      locale,
      typeof title === 'string' ? title : '',
    );
    const localizedDescription = resolveLocalizedBusinessField(
      translations,
      'description',
      locale,
      typeof description === 'string' ? description : null,
    );
    const localizedLocation = resolveLocalizedBusinessField(
      translations,
      'location',
      locale,
      typeof location === 'string' ? location : null,
    );

    // Сворачиваем materialLabels[url][locale] в плоский map url → string,
    // чтобы фронт мог подставить правильную подпись без лишней логики.
    const labelsObject =
      materialLabels && typeof materialLabels === 'object' && !Array.isArray(materialLabels)
        ? (materialLabels as Record<string, unknown>)
        : null;
    const flattenedMaterialLabels: Record<string, string> = {};
    if (labelsObject) {
      for (const [url, raw] of Object.entries(labelsObject)) {
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const resolved = resolveLocalizedBusinessField(
            { tmp: raw as Record<string, string> },
            'tmp',
            locale,
            null,
          );
          if (resolved) flattenedMaterialLabels[url] = resolved;
        }
      }
    }

    // Локализуем room.name через room.translations.name (если зал есть).
    // Сам room в ответе оставляем как { id, name } — этого достаточно для
    // фильтра-табов и подписи на карточке. Полный список залов события
    // отдаётся отдельно в event.rooms.
    let localizedRoom: { id: string; name: string } | null = null;
    if (room && typeof room === 'object' && !Array.isArray(room)) {
      const r = room as Record<string, unknown>;
      const rid = typeof r.id === 'string' ? r.id : null;
      const rname = typeof r.name === 'string' ? r.name : '';
      if (rid) {
        localizedRoom = {
          id: rid,
          name:
            resolveLocalizedBusinessField(r.translations, 'name', locale, rname) ||
            rname,
        };
      }
    }

    return {
      ...rest,
      title: localizedTitle,
      description: localizedDescription || null,
      // Для legacy-клиентов и текстовых снапшотов — если есть зал,
      // отдаём его локализованное имя как location, иначе старый text-fallback.
      location: localizedRoom?.name || localizedLocation || null,
      materialLabels: flattenedMaterialLabels,
      room: localizedRoom,
    };
  }

  private localizePublicSpeaker(
    speaker: Record<string, unknown>,
    locale?: string,
  ): Record<string, unknown> {
    const { translations, position, company, bio, ...rest } = speaker;
    delete (rest as Record<string, unknown>).translationMeta;

    return {
      ...rest,
      position: resolveLocalizedBusinessField(
        translations,
        'position',
        locale,
        typeof position === 'string' ? position : '',
      ),
      company:
        resolveLocalizedBusinessField(
          translations,
          'company',
          locale,
          typeof company === 'string' ? company : null,
        ) || null,
      bio:
        resolveLocalizedBusinessField(
          translations,
          'bio',
          locale,
          typeof bio === 'string' ? bio : null,
        ) || null,
    };
  }

  private localizePublicOrganization<T extends object>(
    organization: T,
    locale?: string,
  ): T {
    const { translations, name, companyName, description, ...rest } =
      organization as Record<string, unknown>;
    delete (rest as Record<string, unknown>).translationMeta;

    const localizedCompanyName = resolveLocalizedBusinessField(
      translations,
      'companyName',
      locale,
      typeof companyName === 'string' ? companyName : null,
    );

    return {
      ...rest,
      name: resolveLocalizedBusinessField(
        translations,
        'name',
        locale,
        typeof name === 'string' ? name : localizedCompanyName,
      ),
      companyName: localizedCompanyName,
      ...(description !== undefined && {
        description:
          resolveLocalizedBusinessField(
            translations,
            'description',
            locale,
            typeof description === 'string' ? description : null,
          ) || null,
      }),
    } as unknown as T;
  }
}
