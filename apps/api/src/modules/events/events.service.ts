import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventsRepository, IPaginatedEvents } from './events.repository';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  OrganizationEventsQueryDto,
  OrganizationEventsStatus,
  SendEventInvitationDto,
} from './dto';
import {
  Event,
  EventStatus,
  EventAccessType,
  EventFormat,
  UserType,
  Prisma,
  RegistrationStatus,
} from '@prisma/client';
import { ICurrentUser } from '../../common/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { BlockNoteUtil } from '../../common/utils/blocknote.util';
import { generateSlug } from '../../common/utils/slug.util';
import { MailService } from '../mail/mail.service';
import { NotificationReplanService } from '../notifications/dispatch/notification-replan.service';
import { ModerationChainService } from '../notifications/chains/moderation-chain.service';
import { RegistrationChainService } from '../notifications/chains/registration-chain.service';
import { ClosingChainService } from '../notifications/chains/closing-chain.service';
import { PlacesService } from '../places/places.service';
import { EventCreditsService } from '../billing/plan-state/event-credits.service';
import { CapacityClampService } from '../billing/entitlements/capacity-clamp.service';
import { MaxEventsService } from '../billing/entitlements/max-events.service';
import { PlaceSuggestionsQueryDto } from '../places/dto';
import { pickFallbackTranslation } from '../translations/dto/business-translation.dto';
import { normalizeRichTranslations } from '../translations/dto/rich-translation.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly placesService: PlacesService,
    private readonly eventCredits: EventCreditsService,
    private readonly capacityClamp: CapacityClampService,
    private readonly maxEvents: MaxEventsService,
    private readonly notificationReplan: NotificationReplanService,
    private readonly moderationChain: ModerationChainService,
    private readonly registrationChain: RegistrationChainService,
    private readonly closingChain: ClosingChainService,
  ) {}

  /**
   * Создаёт новое событие
   * @throws ForbiddenException если пользователь не организатор
   * @throws BadRequestException если структура BlockNote документа невалидна
   */
  async create(dto: CreateEventDto, user: ICurrentUser): Promise<Event> {
    const organizationId = this.getOrganizationId(user);
    // MAX_EVENTS: override-лимит на общее число событий (по умолчанию безлимит).
    await this.maxEvents.assertCanCreateEvent(organizationId);
    this.validateRentalPlaceUsage(dto.format, dto.rentalPlaceId);
    const title = pickFallbackTranslation(dto.translations, 'title', dto.title);
    const shortDescription = pickFallbackTranslation(
      dto.translations,
      'shortDescription',
      dto.shortDescription,
    );

    // Нормализация и валидация description если указан
    let normalizedDescription: Prisma.InputJsonValue | undefined;
    if (dto.description) {
      normalizedDescription = this.normalizeEventDescription(dto.description);
    }

    // Валидация дат
    this.validateEventDates(dto);

    // Генерируем inviteCode для событий только по приглашению
    const inviteCode =
      dto.accessType === EventAccessType.INVITE_ONLY
        ? this.generateInviteCode()
        : null;

    // Slug: переданный в DTO (проверка уникальности) или генерация из заголовка
    const slug = dto.slug
      ? await this.ensureUniqueSlug(dto.slug)
      : await this.generateUniqueSlug(title);

    // Scalar venue/address — fallback на первую непустую локаль если
    // фронт прислал только translations. city — это select-код, не текст,
    // локализация на клиенте через city-catalog.
    const venueScalar = pickFallbackTranslation(
      dto.translations,
      'venue',
      dto.venue,
    );
    const addressScalar = pickFallbackTranslation(
      dto.translations,
      'address',
      dto.address,
    );

    const placeData = await this.placesService.applyPlaceToEventInput(
      dto.rentalPlaceId,
      {
        venue: venueScalar || dto.venue,
        address: addressScalar || dto.address,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        placeId: dto.placeId,
      },
    );

    return this.eventsRepository.create({
      slug,
      title,
      description: normalizedDescription,
      shortDescription: shortDescription || undefined,
      translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (dto.translationMeta ?? {}) as Prisma.InputJsonValue,
      richTranslations: (normalizeRichTranslations(dto.richTranslations) ??
        {}) as Prisma.InputJsonValue,
      richTranslationMeta: (dto.richTranslationMeta ??
        {}) as Prisma.InputJsonValue,
      coverImage: dto.coverImage,
      type: dto.type,
      accessType: dto.accessType,
      format: dto.format,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      registrationDeadline: dto.registrationDeadline
        ? new Date(dto.registrationDeadline)
        : null,
      venue: placeData.venue ?? venueScalar ?? dto.venue,
      address: placeData.address ?? addressScalar ?? dto.address,
      city: placeData.city ?? dto.city,
      latitude: dto.latitude,
      longitude: dto.longitude,
      placeId: dto.placeId,
      onlineUrl: dto.onlineUrl,
      price: dto.price,
      currency: dto.currency,
      maxParticipants: dto.maxParticipants,
      inviteCode,
      registrationMode: dto.registrationMode,
      testEvaluationType: dto.testEvaluationType,
      minTestScore: dto.minTestScore,
      commentsEnabled: dto.commentsEnabled,
      registrationOpen: dto.registrationOpen,
      categories: dto.categoryIds?.length
        ? { connect: dto.categoryIds.map((id) => ({ id })) }
        : undefined,
      ...placeData,
      organization: { connect: { id: organizationId } },
    });
  }

  /**
   * Генерирует уникальный код приглашения
   */
  private generateInviteCode(): string {
    // Формат: EVT-XXXXX (короткий читаемый код)
    return `EVT-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Делает slug уникальным (добавляет -1, -2, … при коллизии).
   * Для уже нормализованного slug из DTO.
   */
  private async ensureUniqueSlug(slug: string): Promise<string> {
    let result = slug;
    let counter = 1;
    while (await this.eventsRepository.slugExists(result)) {
      result = `${slug}-${counter}`;
      counter++;
    }
    return result;
  }

  /**
   * Генерирует уникальный slug из названия события
   */
  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = generateSlug(title);
    let counter = 1;

    while (await this.eventsRepository.slugExists(slug, excludeId)) {
      slug = `${generateSlug(title)}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Получает событие по ID
   * @throws NotFoundException если событие не найдено
   */
  async findById(id: string): Promise<Event> {
    const event = await this.eventsRepository.findById(id);
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    return event;
  }

  /**
   * Получает событие и проверяет доступ
   */
  async findByIdWithAccess(id: string, user: ICurrentUser): Promise<Event> {
    const event = await this.findById(id);
    this.checkEventAccess(event, user);
    return event;
  }

  /**
   * Получает список событий организации
   */
  async findByOrganization(
    query: EventQueryDto,
    user: ICurrentUser,
  ): Promise<IPaginatedEvents> {
    const organizationId = this.getOrganizationId(user);
    return this.eventsRepository.findByOrganization(organizationId, query);
  }

  /**
   * Получает публичный каталог событий
   */
  async findPublished(query: EventQueryDto): Promise<IPaginatedEvents> {
    const result = await this.eventsRepository.findPublished(query);
    return {
      ...result,
      data: result.data.map((event) => this.stripPublicTranslationMeta(event)),
    };
  }

  /**
   * Получает публичное событие по ID
   */
  async findPublicById(id: string): Promise<Event> {
    const event = await this.findById(id);
    // Завершённые события остаются публично доступными (как в листинге прошедших
    // и в public-модуле), чтобы детали/описание/комментарии не отдавали 404 после
    // окончания.
    if (
      event.status !== EventStatus.PUBLISHED &&
      event.status !== EventStatus.COMPLETED
    ) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    return this.stripPublicTranslationMeta(event);
  }

  /**
   * Получает публичное событие по slug (для SEO-friendly URL).
   * Возвращает 410 Gone если событие удалено супер-админом.
   */
  async findPublicBySlug(slug: string): Promise<Event> {
    const event = await this.eventsRepository.findBySlug(slug);
    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    if (event.deletedAt) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          deleted: true,
          deletionReason: event.deletionReason ?? undefined,
          deletedAt: event.deletedAt.toISOString(),
        },
        HttpStatus.GONE,
      );
    }
    // Завершённые события остаются публично доступными (см. findPublicById).
    if (
      event.status !== EventStatus.PUBLISHED &&
      event.status !== EventStatus.COMPLETED
    ) {
      throw new NotFoundException('Мероприятие не найдено');
    }
    return this.stripPublicTranslationMeta(event);
  }

  /**
   * Проверяет доступность slug (уникальность). Для формы создания/редактирования.
   */
  async checkSlugAvailability(
    slug: string,
    excludeId?: string,
  ): Promise<{ available: boolean }> {
    const exists = await this.eventsRepository.slugExists(slug, excludeId);
    return { available: !exists };
  }

  /**
   * Генерирует уникальный slug из заголовка (та же логика, что при создании).
   * Для подстановки в форму до сохранения.
   */
  async suggestSlug(
    title: string,
    excludeId?: string,
  ): Promise<{ slug: string }> {
    const slug = await this.generateUniqueSlug(title, excludeId);
    return { slug };
  }

  /**
   * Обновляет событие
   * - Нельзя редактировать завершённые/отменённые события
   * - Нельзя редактировать события на модерации
   * - При редактировании опубликованного события — возвращается в DRAFT для повторной модерации
   * @throws ForbiddenException если нет доступа
   * @throws BadRequestException если событие нельзя редактировать
   */
  async update(
    id: string,
    dto: UpdateEventDto,
    user: ICurrentUser,
  ): Promise<Event> {
    const event = await this.findByIdWithAccess(id, user);
    this.validateRentalPlaceUsage(
      dto.format ?? event.format,
      dto.rentalPlaceId,
    );

    // Нельзя редактировать завершённые/отменённые события
    if (
      event.status === EventStatus.COMPLETED ||
      event.status === EventStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Нельзя редактировать завершённое или отменённое мероприятие',
      );
    }

    // Нельзя редактировать события на модерации
    if (event.status === EventStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Нельзя редактировать мероприятие пока оно на модерации. Дождитесь решения модератора.',
      );
    }

    // Валидация дат если они меняются
    if (dto.startDate || dto.endDate) {
      this.validateEventDates({
        startDate: dto.startDate || event.startDate.toISOString(),
        endDate: dto.endDate || event.endDate.toISOString(),
        registrationDeadline:
          dto.registrationDeadline || event.registrationDeadline?.toISOString(),
      });
    }

    // Нормализация description если указан
    let normalizedDescription: Prisma.InputJsonValue | undefined;
    if (dto.description) {
      normalizedDescription = this.normalizeEventDescription(dto.description);
    }

    // Подготовка данных для обновления
    const updateData: Prisma.EventUpdateInput = {};
    const title =
      dto.title !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'title',
            dto.title ?? event.title,
          )
        : undefined;
    const shortDescription =
      dto.shortDescription !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'shortDescription',
            dto.shortDescription ?? event.shortDescription,
          )
        : undefined;

    if (title !== undefined) updateData.title = title;
    if (shortDescription !== undefined) {
      updateData.shortDescription = shortDescription || null;
    }
    if (dto.translations !== undefined) {
      updateData.translations = dto.translations as Prisma.InputJsonValue;
    }
    if (dto.translationMeta !== undefined) {
      updateData.translationMeta = dto.translationMeta as Prisma.InputJsonValue;
    }
    if (dto.richTranslations !== undefined) {
      updateData.richTranslations = normalizeRichTranslations(
        dto.richTranslations,
      ) as Prisma.InputJsonValue;
    }
    if (dto.richTranslationMeta !== undefined) {
      updateData.richTranslationMeta =
        dto.richTranslationMeta as Prisma.InputJsonValue;
    }
    if (dto.coverImage !== undefined) updateData.coverImage = dto.coverImage;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.accessType !== undefined) {
      updateData.accessType = dto.accessType;
      // Событие могло стать INVITE_ONLY уже после создания — код приглашения
      // выдаётся в create() только сразу, иначе блок «Приглашения» останется пустым.
      if (dto.accessType === EventAccessType.INVITE_ONLY && !event.inviteCode) {
        updateData.inviteCode = this.generateInviteCode();
      }
    }
    if (dto.format !== undefined) updateData.format = dto.format;
    if (dto.venue !== undefined) updateData.venue = dto.venue;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.placeId !== undefined) updateData.placeId = dto.placeId;
    if (dto.onlineUrl !== undefined) updateData.onlineUrl = dto.onlineUrl;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.maxParticipants !== undefined) {
      updateData.maxParticipants = dto.maxParticipants;
    }
    if (dto.registrationMode !== undefined) {
      updateData.registrationMode = dto.registrationMode;
    }
    if (dto.testEvaluationType !== undefined) {
      updateData.testEvaluationType = dto.testEvaluationType;
    }
    if (dto.minTestScore !== undefined) {
      updateData.minTestScore = dto.minTestScore;
    }
    if (dto.commentsEnabled !== undefined) {
      updateData.commentsEnabled = dto.commentsEnabled;
    }
    if (dto.registrationOpen !== undefined) {
      updateData.registrationOpen = dto.registrationOpen;
    }
    if (dto.categoryIds !== undefined) {
      updateData.categories = {
        set: dto.categoryIds.map((categoryId) => ({ id: categoryId })),
      };
    }

    // Если изменился title - генерируем новый slug
    if (title && title !== event.title) {
      updateData.slug = await this.generateUniqueSlug(title, id);
    }

    // Добавляем нормализованный description если указан
    if (normalizedDescription !== undefined) {
      updateData.description = normalizedDescription;
    }

    // Конвертируем даты
    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }
    // null — явный сброс дедлайна (организатор выключил/сбросил поле в форме);
    // строка — установка/обновление; undefined — поле не трогаем.
    if (dto.registrationDeadline !== undefined) {
      updateData.registrationDeadline = dto.registrationDeadline
        ? new Date(dto.registrationDeadline)
        : null;
    }

    // Update: пересчитать scalar venue/address из новых translations
    // если присланы. city — это code, локализуется на клиенте.
    const updateVenueScalar =
      dto.venue !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'venue',
            dto.venue ?? event.venue ?? null,
          )
        : undefined;
    const updateAddressScalar =
      dto.address !== undefined || dto.translations !== undefined
        ? pickFallbackTranslation(
            dto.translations,
            'address',
            dto.address ?? event.address ?? null,
          )
        : undefined;

    Object.assign(
      updateData,
      await this.placesService.applyPlaceToEventInput(dto.rentalPlaceId, {
        venue:
          updateVenueScalar !== undefined
            ? updateVenueScalar || dto.venue
            : dto.venue,
        address:
          updateAddressScalar !== undefined
            ? updateAddressScalar || dto.address
            : dto.address,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        placeId: dto.placeId,
      }),
    );

    // Поля, изменение которых не требует повторной модерации (операционные тогглы)
    const MODERATION_SAFE_FIELDS = ['registrationOpen'] as const;
    const providedKeys = Object.keys(dto).filter(
      (key) => (dto as Record<string, unknown>)[key] !== undefined,
    );
    const onlyOperationalChanges =
      providedKeys.length > 0 &&
      providedKeys.every((key) =>
        (MODERATION_SAFE_FIELDS as readonly string[]).includes(key),
      );

    // При редактировании опубликованного события — возвращаем в DRAFT для повторной модерации.
    // Операционные тогглы (например, ручной on/off регистрации) контент не меняют, поэтому не отправляют на модерацию.
    //
    // Исключение — событие, которое уже началось: снимать его с эфира поздно
    // (участники уже пришли по публичной ссылке), а возврат в DRAFT загонял его
    // в тупик — завершить нельзя (нужен PUBLISHED), на модерацию нельзя (нужна
    // будущая дата старта). Правка идущего/прошедшего события остаётся
    // опубликованной; ре-модерации она не получает осознанно.
    const alreadyStarted = event.startDate.getTime() <= Date.now();
    if (
      event.status === EventStatus.PUBLISHED &&
      !onlyOperationalChanges &&
      !alreadyStarted
    ) {
      updateData.status = EventStatus.DRAFT;
      updateData.rejectionReason = null;
    }

    // BL-03: смена дат синхронно пере-планирует уведомления, с гранулярностью
    // по типу изменённой даты (startDate → REM, endDate → SUM,
    // registrationDeadline → CLS); reconcile-свип — только страховка (D-05).
    const startDateChanged =
      dto.startDate !== undefined &&
      new Date(dto.startDate).getTime() !== event.startDate.getTime();
    const endDateChanged =
      dto.endDate !== undefined &&
      new Date(dto.endDate).getTime() !== event.endDate.getTime();
    const registrationDeadlineChanged =
      dto.registrationDeadline !== undefined &&
      (dto.registrationDeadline
        ? new Date(dto.registrationDeadline).getTime()
        : null) !==
        (event.registrationDeadline
          ? event.registrationDeadline.getTime()
          : null);

    const updated = await this.eventsRepository.updateIfCurrent(
      id,
      event.status,
      event.updatedAt,
      updateData,
    );

    if (!updated) {
      throw this.eventUpdateConflict();
    }

    if (startDateChanged || endDateChanged || registrationDeadlineChanged) {
      await this.notificationReplan.onEventDatesChanged(id, {
        startDate: startDateChanged,
        endDate: endDateChanged,
        registrationDeadline: registrationDeadlineChanged,
      });
    }

    // CLS (цепочка 4): ручной тумблер приоритетен над авто-логикой дедлайна.
    // Закрытие → немедленный итог CLS-03 ({closeEpoch}-ключ, D-11) + снятие
    // CLS-плана; открытие → пересоздание плана. Метод не бросает наружу.
    if (
      dto.registrationOpen !== undefined &&
      dto.registrationOpen !== event.registrationOpen
    ) {
      await this.closingChain.onRegistrationToggle(id, dto.registrationOpen);
    }

    return updated;
  }

  async getNearbyPlaceSuggestions(query: PlaceSuggestionsQueryDto) {
    return this.placesService.getNearbySuggestions(query);
  }

  /**
   * Удаляет событие
   * @throws ForbiddenException если нет доступа
   */
  async delete(id: string, user: ICurrentUser): Promise<void> {
    await this.findByIdWithAccess(id, user);
    await this.eventsRepository.delete(id);
  }

  /**
   * Отправляет событие на модерацию супер-админу
   * Примечание: Для вызова этого метода организация должна быть верифицирована (VerifiedOrganizationGuard)
   * @throws BadRequestException если событие не в статусе DRAFT
   */
  async submitForReview(id: string, user: ICurrentUser): Promise<Event> {
    const event = await this.findByIdWithAccess(id, user);

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        'Можно отправить на модерацию только черновик мероприятия',
      );
    }

    // Проверяем что дата начала в будущем
    if (new Date(event.startDate) <= new Date()) {
      throw new BadRequestException(
        'Нельзя отправить на модерацию мероприятие с прошедшей датой начала',
      );
    }

    // Причина прошлого отклонения — ДО очистки: resubmit-письмо модератору
    // (MOD-06) обязано её показать.
    const previousRejectionReason = event.rejectionReason;

    const submitted = await this.eventsRepository.updateIfCurrent(
      id,
      event.status,
      event.updatedAt,
      {
        status: EventStatus.PENDING_REVIEW,
        rejectionReason: null,
      },
    );
    if (!submitted) throw this.eventUpdateConflict();

    // Цепочка 1 (MOD-01/02/06 + SLA-таймер MOD-03); не бросает наружу.
    await this.moderationChain.onEventSubmitted(id, previousRejectionReason);

    return submitted;
  }

  /**
   * Отменяет событие
   */
  async cancel(id: string, user: ICurrentUser): Promise<Event> {
    const event = await this.findByIdWithAccess(id, user);

    if (
      event.status === EventStatus.COMPLETED ||
      event.status === EventStatus.CANCELLED
    ) {
      throw new BadRequestException('Мероприятие уже завершено или отменено');
    }

    const cancelled = await this.eventsRepository.updateIfCurrent(
      id,
      event.status,
      event.updatedAt,
      { status: EventStatus.CANCELLED },
    );
    if (!cancelled) throw this.eventUpdateConflict();

    // E-16/B-1: возврат кредита события — ТОЛЬКО если нет ни одной
    // APPROVED-регистрации (ценность сбора заявок не получена).
    const approvedCount = await this.eventsRepository.countRegistrations(id, [
      RegistrationStatus.APPROVED,
    ]);
    await this.eventCredits.refundForCancelledEvent(id, approvedCount);

    // Каскад отмены (инвариант №3 + MOD-08): снять ВСЕ плановые REM/CLS/SUM
    // события и уведомить активных участников (REG-10). Не бросает наружу.
    await this.registrationChain.onEventCancelled(id);

    return cancelled;
  }

  /**
   * Завершает событие
   */
  async complete(id: string, user: ICurrentUser): Promise<Event> {
    const event = await this.findByIdWithAccess(id, user);

    // Обычный путь — завершение опубликованного события.
    // Восстановительный путь — прошедшее событие, которое уже было в эфире
    // (publishedAt), но статуса PUBLISHED лишилось: правка до фикса
    // ре-модерации или отклонение модератором. Без него такое событие
    // застревало в черновике навсегда — на модерацию его тоже не отправить
    // (нужна будущая дата старта). Никогда не публиковавшийся черновик сюда
    // не попадает: COMPLETED публично видим, и это была бы публикация в обход
    // модерации.
    const canCompleteAfterUnpublish =
      event.status === EventStatus.DRAFT &&
      Boolean(event.publishedAt) &&
      event.endDate.getTime() < Date.now();

    if (event.status !== EventStatus.PUBLISHED && !canCompleteAfterUnpublish) {
      throw new BadRequestException(
        'Можно завершить только опубликованное или уже прошедшее опубликованное мероприятие',
      );
    }

    const completed = await this.eventsRepository.updateIfCurrent(
      id,
      event.status,
      event.updatedAt,
      { status: EventStatus.COMPLETED },
    );
    if (!completed) throw this.eventUpdateConflict();
    return completed;
  }

  private eventUpdateConflict(): HttpException {
    return new HttpException(
      {
        code: 'EVENT_UPDATE_CONFLICT',
        message:
          'Мероприятие уже изменилось. Обновите страницу перед повторным действием.',
      },
      HttpStatus.CONFLICT,
    );
  }

  /**
   * Проверяет возможность регистрации на событие
   */
  async canRegister(eventId: string): Promise<{
    canRegister: boolean;
    reason?: string;
    accessType: EventAccessType;
    requiresInviteCode: boolean;
  }> {
    const event = await this.findById(eventId);

    const baseResult = {
      accessType: event.accessType,
      requiresInviteCode: event.accessType === EventAccessType.INVITE_ONLY,
    };

    if (event.accessType === EventAccessType.PRIVATE) {
      return {
        ...baseResult,
        canRegister: false,
        reason: 'Регистрация на приватное мероприятие недоступна',
      };
    }

    if (event.status !== EventStatus.PUBLISHED) {
      return {
        ...baseResult,
        canRegister: false,
        reason: 'Мероприятие недоступно для регистрации',
      };
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return {
        ...baseResult,
        canRegister: false,
        reason: 'Регистрация закрыта',
      };
    }

    // E-3: min(организаторский, тарифный) кап; pre-cutover события — без тарифного.
    const capInfo = await this.capacityClamp.effectiveEventCap(
      event.organizationId,
      { createdAt: event.createdAt, maxParticipants: event.maxParticipants },
    );
    if (capInfo.cap !== null) {
      const count = await this.eventsRepository.getRegistrationsCount(eventId);
      if (count >= capInfo.cap) {
        return {
          ...baseResult,
          canRegister: false,
          reason: 'Достигнут лимит участников',
        };
      }
    }

    return { ...baseResult, canRegister: true };
  }

  /**
   * Регенерирует код приглашения для INVITE_ONLY события
   */
  async regenerateInviteCode(id: string, user: ICurrentUser): Promise<Event> {
    const event = await this.findByIdWithAccess(id, user);

    if (event.accessType !== EventAccessType.INVITE_ONLY) {
      throw new BadRequestException(
        'Код приглашения доступен только для событий по приглашению',
      );
    }

    return this.eventsRepository.update(id, {
      inviteCode: this.generateInviteCode(),
    });
  }

  /**
   * Возвращает ссылку и код приглашения для INVITE_ONLY события.
   * Ссылка ведёт на публичную страницу события с параметром inviteCode для регистрации.
   */
  async getInviteLink(
    id: string,
    user: ICurrentUser,
  ): Promise<{ inviteLink: string; inviteCode: string }> {
    const event = await this.findByIdWithAccess(id, user);

    if (event.accessType !== EventAccessType.INVITE_ONLY) {
      throw new BadRequestException(
        'Ссылка приглашения доступна только для событий по приглашению',
      );
    }

    const inviteCode = await this.ensureInviteCode(event);
    const inviteLink = this.buildPublicInviteLink(event.slug, inviteCode);

    return {
      inviteLink,
      inviteCode,
    };
  }

  /**
   * Возвращает код приглашения события, при необходимости создавая его.
   *
   * Код выдаётся в create() только сразу для INVITE_ONLY, поэтому события,
   * переведённые в INVITE_ONLY позже, остаются без кода — дозаполняем на лету,
   * чтобы блок «Приглашения» не падал на уже сохранённых событиях.
   */
  private async ensureInviteCode(event: Event): Promise<string> {
    if (event.inviteCode) {
      return event.inviteCode;
    }

    const inviteCode = this.generateInviteCode();
    await this.eventsRepository.update(event.id, { inviteCode });

    return inviteCode;
  }

  /**
   * Отправляет приглашение на закрытое мероприятие на указанный email.
   * В письме — ссылка с кодом приглашения для регистрации.
   */
  async sendInvitation(
    id: string,
    dto: SendEventInvitationDto,
    user: ICurrentUser,
  ): Promise<{ message: string }> {
    const event = await this.findByIdWithAccess(id, user);

    if (event.accessType !== EventAccessType.INVITE_ONLY) {
      throw new BadRequestException(
        'Отправка приглашений доступна только для событий по приглашению',
      );
    }

    const inviteCode = await this.ensureInviteCode(event);
    const inviteLink = this.buildPublicInviteLink(event.slug, inviteCode);
    const organizationName =
      (event as Event & { organization?: { companyName?: string } })
        .organization?.companyName ?? 'Организатор';

    await this.mailService.sendEventInvitation({
      eventId: event.id,
      email: dto.email,
      eventTitle: event.title,
      organizationName,
      inviteLink,
      inviteCode,
    });

    return {
      message: `Приглашение отправлено на ${dto.email}`,
    };
  }

  // === Private methods ===

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException(
      'Только организаторы могут управлять мероприятиями',
    );
  }

  /**
   * Public event URL with `?inviteCode=`. The value is the shared INVITE_ONLY
   * code or, for PRIVATE events, a personal invitation token.
   */
  buildPublicInviteLink(slug: string, inviteCode: string): string {
    const publicUrl =
      this.configService.get<string>('frontend.publicUrl') ||
      this.configService.get<string>('FRONTEND_PUBLIC_URL') ||
      'http://localhost';
    const appUrl =
      this.configService.get<string>('frontend.appUrl') ||
      this.configService.get<string>('FRONTEND_APP_URL');
    const normalizedPublicUrl = this.normalizeParticipantBaseUrl(
      publicUrl,
      appUrl,
    );

    return `${normalizedPublicUrl}/events/${encodeURIComponent(slug)}?inviteCode=${encodeURIComponent(inviteCode)}`;
  }

  private normalizeParticipantBaseUrl(
    publicUrl: string,
    appUrl?: string,
  ): string {
    const trimmedPublicUrl = publicUrl.replace(/\/+$/, '');

    try {
      const publicBase = new URL(trimmedPublicUrl);
      const appBase = appUrl ? new URL(appUrl) : null;

      if (
        publicBase.hostname.startsWith('app.') ||
        (appBase && publicBase.origin === appBase.origin)
      ) {
        publicBase.hostname = publicBase.hostname.replace(/^app\./, '');
      }

      return publicBase.toString().replace(/\/+$/, '');
    } catch {
      return trimmedPublicUrl;
    }
  }

  private checkEventAccess(event: Event, user: ICurrentUser): void {
    const organizationId = this.getOrganizationId(user);
    if (
      (event as Event & { organizationId: string }).organizationId !==
      organizationId
    ) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
  }

  private validateEventDates(dto: {
    startDate: string;
    endDate: string;
    registrationDeadline?: string | null;
  }): void {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'Дата окончания должна быть позже даты начала',
      );
    }

    if (dto.registrationDeadline) {
      const deadline = new Date(dto.registrationDeadline);
      if (deadline > startDate) {
        throw new BadRequestException(
          'Дедлайн регистрации должен быть не позже даты начала',
        );
      }
    }
  }

  private validateRentalPlaceUsage(
    format: CreateEventDto['format'],
    rentalPlaceId?: string | null,
  ) {
    if (format === EventFormat.ONLINE && rentalPlaceId) {
      throw new BadRequestException(
        'Для online-мероприятий нельзя указывать арендуемую площадку',
      );
    }
  }

  private normalizeEventDescription(
    description: unknown,
  ): Prisma.InputJsonValue {
    const normalized = BlockNoteUtil.normalizeDocument(description as any[]);
    if (!BlockNoteUtil.isValid(normalized)) {
      throw new BadRequestException('Invalid BlockNote document structure');
    }
    return normalized as unknown as Prisma.InputJsonValue;
  }

  /**
   * Получает публичные события организатора
   */
  async getOrganizationEvents(
    organizationId: string,
    query: OrganizationEventsQueryDto,
  ): Promise<IPaginatedEvents> {
    const isUpcoming =
      query.status === OrganizationEventsStatus.UPCOMING
        ? true
        : query.status === OrganizationEventsStatus.PAST
          ? false
          : undefined;

    const result = await this.eventsRepository.findPublicByOrganization(
      organizationId,
      query.page,
      query.limit,
      isUpcoming,
    );
    return {
      ...result,
      data: result.data.map((event) => {
        const sanitized = this.stripPublicTranslationMeta(event);
        return {
          ...sanitized,
          categories: this.getEventCategorySlugs(event),
        };
      }),
    };
  }

  private getEventCategorySlugs(event: object): string[] {
    const categories = (event as { categories?: Array<{ slug?: unknown }> })
      .categories;
    if (!Array.isArray(categories)) return [];
    return categories
      .map((c) => c?.slug)
      .filter((slug): slug is string => typeof slug === 'string');
  }

  // Поля события, которые НИКОГДА не должны попадать в публичный ответ:
  // приватный код приглашения и внутренние модерационные поля.
  private static readonly PUBLIC_EVENT_OMIT = [
    'inviteCode',
    'rejectionReason',
    'deletionReason',
    'deletedBySuperAdminId',
    // Ссылка на онлайн-встречу не отдаётся через этот публичный путь. Гейтинг
    // по APPROVED-регистрации реализован в public-модуле (детальная страница).
    'onlineUrl',
  ] as const;
  // Приватные поля спикера (система приглашений): токен-секрет, email
  // приглашённого, внутренняя заметка об отказе, привязка к пользователю.
  private static readonly PUBLIC_SPEAKER_OMIT = [
    'invitationToken',
    'invitedEmail',
    'tokenExpiresAt',
    'invitationStatus',
    'rejectionReason',
    'userId',
  ] as const;
  // Правильные ответы теста регистрации — раскрытие даёт обход AUTO_REJECT.
  private static readonly PUBLIC_QUESTION_OMIT = [
    'correctAnswer',
    'correctOptions',
  ] as const;

  private stripPublicSpeaker(
    speaker: Record<string, unknown>,
  ): Record<string, unknown> {
    const clone = { ...speaker };
    for (const key of EventsService.PUBLIC_SPEAKER_OMIT) delete clone[key];
    return clone;
  }

  /**
   * Санитайзер публичных ответов события. Помимо translation-меты убирает
   * секреты/PII, которые репозиторий тянет через `include` (общий с
   * организаторским путём, где эти поля нужны): токены/email приглашённых
   * спикеров, правильные ответы теста, приватный inviteCode и внутренние
   * модерационные поля. Применяется ко ВСЕМ публичным сериализациям события.
   */
  private stripPublicTranslationMeta<T extends object>(event: T): T {
    const rest = { ...(event as Record<string, unknown>) };
    delete rest.translationMeta;
    delete rest.richTranslationMeta;

    for (const key of EventsService.PUBLIC_EVENT_OMIT) delete rest[key];

    if (Array.isArray(rest.speakers)) {
      rest.speakers = (rest.speakers as Record<string, unknown>[]).map((s) =>
        this.stripPublicSpeaker(s),
      );
    }

    if (Array.isArray(rest.agendaItems)) {
      rest.agendaItems = (rest.agendaItems as Record<string, unknown>[]).map(
        (item) => {
          const nested = (item as Record<string, unknown>)?.speakers;
          if (Array.isArray(nested)) {
            return {
              ...item,
              speakers: (nested as Record<string, unknown>[]).map((s) =>
                this.stripPublicSpeaker(s),
              ),
            };
          }
          return item;
        },
      );
    }

    if (Array.isArray(rest.registrationQuestions)) {
      rest.registrationQuestions = (
        rest.registrationQuestions as Record<string, unknown>[]
      ).map((q) => {
        const clone = { ...q };
        for (const key of EventsService.PUBLIC_QUESTION_OMIT) delete clone[key];
        return clone;
      });
    }

    return rest as unknown as T;
  }
}
