import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { localizeEventBusinessFields } from '../translations/localized-event-fields.util';
import { UsersRepository } from './users.repository';
import {
  UpdateUserProfileDto,
  UpdatePrivacySettingsDto,
  CalendarQueryDto,
  CalendarEventsQueryDto,
  CalendarMonthResponseDto,
  CalendarEventsResponseDto,
  CalendarDayDto,
  CalendarEventItemDto,
  CalendarDayType,
  CreateUserCertificateDto,
  UpdateUserCertificateDto,
  CertificatesListResponseDto,
  CertificatesStatsDto,
  SaveArticleDto,
  SavedArticlesListDto,
  UserEventsQueryDto,
  UserEventsWithStatsResponseDto,
  UserEventsStatsDto,
  UserEventItemDto,
} from './dto';
import {
  User,
  ParticipantRole,
  UserCertificate,
  SavedArticle,
  Gender,
  UserProfileStatus,
  Specialization,
} from '@prisma/client';
import { UploadsService } from '../uploads/uploads.service';
import {
  USER_PROFILE_SKILLS,
  UZBEKISTAN_REGIONS,
  USER_PROFILE_LANGUAGES,
} from '../../common/constants/user-profile.constants';
import * as path from 'path';

// Тип для публичного профиля без чувствительных данных
export type UserProfile = Omit<User, 'passwordHash'> & {
  needsProfileInfo: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly uploadsService: UploadsService,
  ) {}

  /**
   * Получает профиль пользователя по ID
   * @throws NotFoundException если пользователь не найден или удалён
   */
  async findById(id: string): Promise<UserProfile> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return this.excludeSensitiveFields(user);
  }

  /**
   * Обновляет профиль пользователя
   */
  async updateProfile(
    id: string,
    dto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    await this.findById(id); // Проверяем существование
    const { dateOfBirth, ...rest } = dto;
    const updateData: Parameters<UsersRepository['update']>[1] = { ...rest };
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(dateOfBirth);
    }
    const user = await this.usersRepository.update(id, updateData);
    return this.excludeSensitiveFields(user);
  }

  /**
   * Загружает аватар пользователя
   */
  async uploadAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<UserProfile> {
    const user = await this.findById(id);

    // Удаляем старый аватар если есть
    if (user.avatarUrl) {
      await this.deleteAvatarFile(user.avatarUrl);
    }

    const uploaded = await this.uploadsService.uploadImage(file);
    const updatedUser = await this.usersRepository.update(id, {
      avatarUrl: uploaded.url,
    });

    return this.excludeSensitiveFields(updatedUser);
  }

  /**
   * Удаляет аватар пользователя
   */
  async deleteAvatar(id: string): Promise<UserProfile> {
    const user = await this.findById(id);

    if (!user.avatarUrl) {
      return user;
    }

    await this.deleteAvatarFile(user.avatarUrl);
    const updatedUser = await this.usersRepository.update(id, {
      avatarUrl: null,
    });

    return this.excludeSensitiveFields(updatedUser);
  }

  /**
   * Обновляет настройки приватности пользователя
   */
  async updatePrivacySettings(
    id: string,
    dto: UpdatePrivacySettingsDto,
  ): Promise<UserProfile> {
    await this.findById(id); // Проверяем существование
    const user = await this.usersRepository.update(id, dto);
    return this.excludeSensitiveFields(user);
  }

  /**
   * Завершает онбординг пользователя
   */
  async completeOnboarding(id: string): Promise<UserProfile> {
    await this.findById(id); // Проверяем существование
    const user = await this.usersRepository.update(id, {
      isOnboardingCompleted: true,
    });
    return this.excludeSensitiveFields(user);
  }

  /**
   * Отмечает, что пользователь заполнил доп. поля профиля (popup больше не показывать).
   */
  async completeProfileInfo(id: string): Promise<UserProfile> {
    await this.findById(id);
    const user = await this.usersRepository.update(id, {
      profileInfoCompleted: true,
    });
    return this.excludeSensitiveFields(user);
  }

  /**
   * Возвращает справочники для формы доп. полей профиля (навыки, регионы, языки и т.д.).
   */
  getProfileOptions(): {
    skills: { code: string; label: string }[];
    regions: readonly string[];
    languages: { code: string; label: string }[];
    specializations: { value: string; label: string }[];
    profileStatuses: { value: string; label: string }[];
    genders: { value: string; label: string }[];
  } {
    return {
      skills: [...USER_PROFILE_SKILLS],
      regions: UZBEKISTAN_REGIONS,
      languages: [...USER_PROFILE_LANGUAGES],
      specializations: [
        { value: Specialization.LAWYER, label: 'Юрист' },
        { value: Specialization.PROGRAMMER, label: 'Программист' },
        { value: Specialization.DESIGNER, label: 'Дизайнер' },
        { value: Specialization.PHOTOGRAPHER, label: 'Фотограф' },
        { value: Specialization.PROJECT_MANAGER, label: 'Проджект-менеджер' },
        { value: Specialization.PRODUCT_MANAGER, label: 'Продукт-менеджер' },
      ],
      profileStatuses: [
        { value: UserProfileStatus.WORKER, label: 'Работник' },
        { value: UserProfileStatus.SCHOOLBOY, label: 'Школьник' },
        { value: UserProfileStatus.STUDENT, label: 'Студент' },
      ],
      genders: [
        { value: Gender.MALE, label: 'Мужской' },
        { value: Gender.FEMALE, label: 'Женский' },
      ],
    };
  }

  /**
   * Экспортирует все данные пользователя в формате JSON
   * Включает профиль, регистрации на события и настройки
   */
  async exportUserData(id: string): Promise<Record<string, any>> {
    const user = await this.usersRepository.findUserWithRelations(id);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Исключаем чувствительные данные (пароль)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userData } = user;

    return {
      exportedAt: new Date().toISOString(),
      data: userData,
    };
  }

  /**
   * Soft delete — помечает аккаунт как удалённый
   * Сессии будут автоматически недействительны т.к. deletedAt != null
   */
  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.usersRepository.softDelete(id);
  }

  // ==================== USER EVENTS (Мои события) ====================

  /**
   * Получает список событий пользователя с пагинацией и статистикой
   * Используется на странице /profile/events
   */
  async getUserEvents(
    userId: string,
    query: UserEventsQueryDto,
  ): Promise<UserEventsWithStatsResponseDto> {
    const [eventsResult, stats] = await Promise.all([
      this.usersRepository.findUserEvents(userId, query),
      this.usersRepository.getUserEventsStats(userId),
    ]);

    const now = new Date();
    const locale = query.locale;

    const data: UserEventItemDto[] = eventsResult.data.map((reg: any) => {
      const event = reg.event ?? {};
      const localized = localizeEventBusinessFields(event, locale);

      return {
        id: reg.id,
        status: reg.status,
        role: reg.role,
        qrCode: reg.qrCode,
        rejectionReason: reg.rejectionReason,
        createdAt: reg.createdAt,
        event: {
          id: event.id,
          slug: event.slug,
          title: localized.title,
          coverImage: event.coverImage,
          shortDescription: localized.shortDescription || undefined,
          startDate: event.startDate,
          endDate: event.endDate,
          format: event.format,
          venue: localized.venue || undefined,
          city: localized.city || undefined,
          status: event.status,
          organizationName: localized.organizationName,
        },
        attendances: reg.attendances || [],
        certificate: reg.certificate || undefined,
        isAttended: (reg.attendances?.length || 0) > 0,
        isPastEvent: new Date(event.endDate) < now,
      };
    });

    return {
      data,
      total: eventsResult.total,
      page: eventsResult.page,
      limit: eventsResult.limit,
      totalPages: eventsResult.totalPages,
      stats,
    };
  }

  /**
   * Получает статистику событий пользователя
   */
  async getUserEventsStats(userId: string): Promise<UserEventsStatsDto> {
    return this.usersRepository.getUserEventsStats(userId);
  }

  // ==================== CERTIFICATES ====================

  /**
   * Получает список сертификатов пользователя со статистикой
   */
  async getCertificates(
    userId: string,
    options?: {
      search?: string;
      filter?: 'all' | 'verified' | 'unverified';
      locale?: string;
    },
  ): Promise<CertificatesListResponseDto> {
    const isVerified =
      options?.filter === 'verified'
        ? true
        : options?.filter === 'unverified'
          ? false
          : undefined;
    const locale = options?.locale;

    const [stats, certificates, eventCertificates] = await Promise.all([
      this.usersRepository.getCertificatesStats(userId),
      this.usersRepository.findCertificatesByUserId(userId, {
        search: options?.search,
        isVerified,
      }),
      this.usersRepository.findEventCertificatesByUserId(userId),
    ]);

    // Локализуем eventName в сертификатах за события — берём актуальный
    // перевод заголовка события, если он есть; иначе остаётся снапшот.
    const localizedEventCertificates = eventCertificates.map((cert: any) => {
      const event = cert.registration?.event;
      const localizedTitle = event
        ? localizeEventBusinessFields(event, locale).title
        : null;
      const { registration: _registration, ...rest } = cert;
      return {
        ...rest,
        eventName: localizedTitle || cert.eventName || null,
      };
    });

    return {
      stats,
      certificates,
      eventCertificates: localizedEventCertificates,
    };
  }

  /**
   * Получает статистику сертификатов пользователя
   */
  async getCertificatesStats(userId: string): Promise<CertificatesStatsDto> {
    return this.usersRepository.getCertificatesStats(userId);
  }

  /**
   * Получает сертификат по ID
   * @throws NotFoundException если сертификат не найден
   * @throws ForbiddenException если сертификат не принадлежит пользователю
   */
  async getCertificateById(
    userId: string,
    certificateId: string,
  ): Promise<UserCertificate> {
    const certificate =
      await this.usersRepository.findCertificateById(certificateId);

    if (!certificate) {
      throw new NotFoundException('Сертификат не найден');
    }

    if (certificate.userId !== userId) {
      throw new NotFoundException('Сертификат не найден');
    }

    return certificate;
  }

  /**
   * Создаёт новый сертификат пользователя
   */
  async createCertificate(
    userId: string,
    dto: CreateUserCertificateDto,
  ): Promise<UserCertificate> {
    await this.findById(userId); // Проверяем существование пользователя

    return this.usersRepository.createCertificate({
      user: { connect: { id: userId } },
      title: dto.title,
      provider: dto.provider,
      description: dto.description,
      issueDate: new Date(dto.issueDate),
      ...(dto.expiryDate && { expiryDate: new Date(dto.expiryDate) }),
      trainingHours: dto.trainingHours || 0,
      credentialId: dto.credentialId,
      credentialUrl: dto.credentialUrl,
      certificateUrl: dto.certificateUrl,
      skills: dto.skills || [],
      color: dto.color,
    });
  }

  /**
   * Обновляет сертификат пользователя
   */
  async updateCertificate(
    userId: string,
    certificateId: string,
    dto: UpdateUserCertificateDto,
  ): Promise<UserCertificate> {
    // Проверяем, что сертификат принадлежит пользователю
    await this.getCertificateById(userId, certificateId);

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.provider !== undefined) updateData.provider = dto.provider;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.issueDate !== undefined)
      updateData.issueDate = new Date(dto.issueDate);
    if (dto.expiryDate !== undefined)
      updateData.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (dto.trainingHours !== undefined)
      updateData.trainingHours = dto.trainingHours;
    if (dto.credentialId !== undefined)
      updateData.credentialId = dto.credentialId;
    if (dto.credentialUrl !== undefined)
      updateData.credentialUrl = dto.credentialUrl;
    if (dto.certificateUrl !== undefined)
      updateData.certificateUrl = dto.certificateUrl;
    if (dto.skills !== undefined) updateData.skills = dto.skills;
    if (dto.color !== undefined) updateData.color = dto.color;

    return this.usersRepository.updateCertificate(certificateId, updateData);
  }

  /**
   * Удаляет сертификат пользователя
   */
  async deleteCertificate(
    userId: string,
    certificateId: string,
  ): Promise<void> {
    // Проверяем, что сертификат принадлежит пользователю
    await this.getCertificateById(userId, certificateId);

    await this.usersRepository.deleteCertificate(certificateId);
  }

  // ==================== CALENDAR ====================

  /**
   * Получает календарь активности пользователя на месяц
   */
  async getCalendar(
    userId: string,
    query: CalendarQueryDto,
  ): Promise<CalendarMonthResponseDto> {
    const { year, month, role, locale } = query;

    // Определяем границы месяца
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Получаем регистрации
    const registrations =
      await this.usersRepository.findRegistrationsForCalendar(
        userId,
        startDate,
        endDate,
        role,
      );

    // Формируем карту дней
    const daysMap = new Map<string, CalendarDayDto>();
    const daysInMonth = endDate.getDate();

    // Инициализируем все дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(year, month, day);
      daysMap.set(dateStr, {
        date: dateStr,
        day,
        activities: [],
        hasSpeakerEvents: false,
        hasParticipantEvents: false,
        hasMentorEvents: false,
        hasTravel: false,
        hasPreparation: false,
      });
    }

    let eventsCount = 0;
    let travelsCount = 0;

    // Обрабатываем каждую регистрацию
    for (const reg of registrations) {
      const event = reg.event;
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      eventsCount++;

      // Добавляем дни события
      this.addEventDays(
        daysMap,
        reg,
        eventStart,
        eventEnd,
        year,
        month,
        CalendarDayType.EVENT,
        locale,
      );

      // Добавляем дни перелёта
      if (reg.travelStartDate && reg.travelEndDate) {
        travelsCount++;
        this.addEventDays(
          daysMap,
          reg,
          new Date(reg.travelStartDate),
          new Date(reg.travelEndDate),
          year,
          month,
          CalendarDayType.TRAVEL,
        );
      }

      // Добавляем дни подготовки
      if (reg.preparationDays > 0) {
        const prepStart = new Date(eventStart);
        prepStart.setDate(prepStart.getDate() - reg.preparationDays);
        const prepEnd = new Date(eventStart);
        prepEnd.setDate(prepEnd.getDate() - 1);
        this.addEventDays(
          daysMap,
          reg,
          prepStart,
          prepEnd,
          year,
          month,
          CalendarDayType.PREPARATION,
        );
      }
    }

    // Собираем только дни с активностями
    const days = Array.from(daysMap.values()).filter(
      (day) => day.activities.length > 0,
    );

    return {
      year,
      month,
      eventsCount,
      travelsCount,
      days,
    };
  }

  /**
   * Получает список событий на конкретную дату
   */
  async getCalendarEvents(
    userId: string,
    query: CalendarEventsQueryDto,
  ): Promise<CalendarEventsResponseDto> {
    const { date, role, locale } = query;
    const targetDate = new Date(date);

    const registrations = await this.usersRepository.findRegistrationsForDate(
      userId,
      targetDate,
      role,
    );

    const events: CalendarEventItemDto[] = [];

    for (const reg of registrations) {
      const event = reg.event;
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      // Определяем тип активности на эту дату
      let dayType = CalendarDayType.EVENT;

      // Проверяем, является ли это днём перелёта
      if (reg.travelStartDate && reg.travelEndDate) {
        const travelStart = new Date(reg.travelStartDate);
        const travelEnd = new Date(reg.travelEndDate);
        if (targetDate >= travelStart && targetDate <= travelEnd) {
          dayType = CalendarDayType.TRAVEL;
        }
      }

      // Проверяем, является ли это днём подготовки
      if (reg.preparationDays > 0) {
        const prepStart = new Date(eventStart);
        prepStart.setDate(prepStart.getDate() - reg.preparationDays);
        if (targetDate >= prepStart && targetDate < eventStart) {
          dayType = CalendarDayType.PREPARATION;
        }
      }

      // Если это день события
      if (targetDate >= eventStart && targetDate <= eventEnd) {
        dayType = CalendarDayType.EVENT;
      }

      const localized = localizeEventBusinessFields(event, locale);
      events.push({
        registrationId: reg.id,
        eventId: event.id,
        eventSlug: event.slug,
        title: localized.title,
        shortDescription: localized.shortDescription,
        role: reg.role,
        dayType,
        format: event.format,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: localized.venue,
        city: localized.city,
        organizationName: localized.organizationName,
      });
    }

    return {
      date,
      count: events.length,
      events,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Добавляет дни в карту календаря
   */
  private addEventDays(
    daysMap: Map<string, CalendarDayDto>,
    registration: any,
    startDate: Date,
    endDate: Date,
    year: number,
    month: number,
    dayType: CalendarDayType,
    locale?: string,
  ): void {
    const event = registration.event;
    const localizedTitle = localizeEventBusinessFields(event, locale).title;
    const current = new Date(startDate);

    while (current <= endDate) {
      // Проверяем, что день в нужном месяце
      if (current.getFullYear() === year && current.getMonth() + 1 === month) {
        const dateStr = this.formatDate(year, month, current.getDate());
        const dayData = daysMap.get(dateStr);

        if (dayData) {
          // Добавляем активность
          dayData.activities.push({
            registrationId: registration.id,
            eventId: event.id,
            eventSlug: event.slug,
            eventTitle: localizedTitle,
            role: registration.role,
            dayType,
          });

          // Обновляем флаги
          if (dayType === CalendarDayType.EVENT) {
            if (registration.role === ParticipantRole.SPEAKER) {
              dayData.hasSpeakerEvents = true;
            } else if (registration.role === ParticipantRole.PARTICIPANT) {
              dayData.hasParticipantEvents = true;
            } else if (registration.role === ParticipantRole.MENTOR) {
              dayData.hasMentorEvents = true;
            }
          } else if (dayType === CalendarDayType.TRAVEL) {
            dayData.hasTravel = true;
          } else if (dayType === CalendarDayType.PREPARATION) {
            dayData.hasPreparation = true;
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }
  }

  /**
   * Форматирует дату в YYYY-MM-DD
   */
  private formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // ==================== SAVED ARTICLES ====================

  /**
   * Получить избранные статьи пользователя с пагинацией
   */
  async getSavedArticles(
    userId: string,
    options?: {
      search?: string;
      category?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<SavedArticlesListDto> {
    const { data, total } =
      await this.usersRepository.findSavedArticlesByUserId(userId, options);

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 12));

    const articlesWithSlug = data.map((a) => ({
      ...a,
      slug: this.getSlugFromArticleUrl(a.articleUrl),
    }));

    return {
      total,
      page,
      limit,
      articles: articlesWithSlug,
    };
  }

  /**
   * Извлекает slug из URL статьи (последний сегмент пути)
   */
  private getSlugFromArticleUrl(articleUrl: string): string {
    try {
      const pathname = new URL(articleUrl).pathname.replace(/^\/+|\/+$/g, '');
      return pathname.split('/').pop() || '';
    } catch {
      return '';
    }
  }

  /**
   * Сохранить статью в избранное
   * @throws ConflictException если статья уже сохранена
   */
  async saveArticle(
    userId: string,
    dto: SaveArticleDto,
  ): Promise<SavedArticle> {
    await this.findById(userId); // Проверяем существование пользователя

    // Проверяем, не сохранена ли уже
    const existing = await this.usersRepository.findSavedArticleByUrl(
      userId,
      dto.articleUrl,
    );

    if (existing) {
      throw new ConflictException('Статья уже добавлена в избранное');
    }

    return this.usersRepository.saveArticle({
      user: { connect: { id: userId } },
      articleUrl: dto.articleUrl,
      title: dto.title,
      excerpt: dto.excerpt,
      coverImage: dto.coverImage,
      category: dto.category,
      ...(dto.publishedAt && { publishedAt: new Date(dto.publishedAt) }),
      readingTime: dto.readingTime,
      authorName: dto.authorName,
    });
  }

  /**
   * Проверить, сохранена ли статья
   */
  async isArticleSaved(userId: string, articleUrl: string): Promise<boolean> {
    const article = await this.usersRepository.findSavedArticleByUrl(
      userId,
      articleUrl,
    );
    return !!article;
  }

  /**
   * URL сохранённых статей пользователя (me/articles).
   * Используется в блоге для отображения saved при сохранении по URL.
   */
  async getSavedArticleUrls(userId: string): Promise<string[]> {
    return this.usersRepository.getSavedArticleUrls(userId);
  }

  /**
   * Удалить статью из избранного по ID
   * @throws NotFoundException если статья не найдена
   */
  async removeSavedArticle(userId: string, articleId: string): Promise<void> {
    const article = await this.usersRepository.findSavedArticleById(articleId);

    if (!article || article.userId !== userId) {
      throw new NotFoundException('Статья не найдена в избранном');
    }

    await this.usersRepository.deleteSavedArticle(articleId);
  }

  /**
   * Удалить статью из избранного по URL
   */
  async removeSavedArticleByUrl(
    userId: string,
    articleUrl: string,
  ): Promise<void> {
    const article = await this.usersRepository.findSavedArticleByUrl(
      userId,
      articleUrl,
    );

    if (!article) {
      throw new NotFoundException('Статья не найдена в избранном');
    }

    await this.usersRepository.deleteSavedArticleByUrl(userId, articleUrl);
  }

  // ==================== PRIVATE HELPERS ====================

  private excludeSensitiveFields(user: User): UserProfile {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = user;
    return {
      ...profile,
      needsProfileInfo: !user.profileInfoCompleted,
    };
  }

  private async deleteAvatarFile(avatarUrl: string): Promise<void> {
    try {
      const filename = path.basename(avatarUrl);
      await this.uploadsService.deleteFile(filename);
    } catch {
      // Игнорируем ошибку если файл уже удалён
    }
  }
}
