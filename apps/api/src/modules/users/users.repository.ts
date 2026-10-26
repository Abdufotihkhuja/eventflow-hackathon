import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  User,
  ParticipantRole,
  RegistrationStatus,
  UserCertificate,
  SavedArticle,
  UserType,
} from '@prisma/client';
import { UserEventFilter, UserEventsQueryDto } from './dto';

export interface IPaginatedUserEvents {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IUserEventsStats {
  totalEvents: number;
  approvedEvents: number;
  pendingEvents: number;
  attendedEvents: number;
  cancelledEvents: number;
  certificatesCount: number;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  /**
   * Получить пользователя со всеми связанными данными для экспорта
   */
  async findUserWithRelations(id: string): Promise<any | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        registrations: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                format: true,
              },
            },
            answers: {
              include: {
                question: true,
              },
            },
            attendances: true,
            certificate: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const identity = await this.prisma.identity.findUnique({
      where: {
        actorType_actorId: {
          actorType: UserType.USER,
          actorId: id,
        },
      },
      include: {
        account: {
          select: {
            refreshTokens: {
              select: {
                id: true,
                userAgent: true,
                ipAddress: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return {
      ...user,
      refreshTokens: identity?.account.refreshTokens ?? [],
    };
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  /**
   * Soft delete — помечает пользователя как удалённого
   */
  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Hard delete — полное удаление (только для супер-админа)
   */
  async hardDelete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  /**
   * Восстановление удалённого пользователя (только для супер-админа)
   */
  async restore(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Получить всех удалённых пользователей (только для супер-админа)
   */
  async findDeleted(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Получить регистрации пользователя для календаря (на месяц)
   */
  async findRegistrationsForCalendar(
    userId: string,
    startDate: Date,
    endDate: Date,
    role?: ParticipantRole,
  ): Promise<any[]> {
    return this.prisma.registration.findMany({
      where: {
        userId,
        status: RegistrationStatus.APPROVED,
        ...(role && { role }),
        event: {
          OR: [
            // События, проходящие в этом месяце
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
          ],
        },
      },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            format: true,
            startDate: true,
            endDate: true,
            venue: true,
            city: true,
            translations: true,
            organization: {
              select: {
                name: true,
                companyName: true,
                translations: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    });
  }

  /**
   * Получить регистрации пользователя на конкретную дату
   */
  async findRegistrationsForDate(
    userId: string,
    date: Date,
    role?: ParticipantRole,
  ): Promise<any[]> {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.registration.findMany({
      where: {
        userId,
        status: RegistrationStatus.APPROVED,
        ...(role && { role }),
        OR: [
          // Событие проходит в этот день
          {
            event: {
              startDate: { lte: nextDay },
              endDate: { gte: date },
            },
          },
          // День перелёта
          {
            travelStartDate: { lte: date },
            travelEndDate: { gte: date },
          },
          // День подготовки (за N дней до события)
          {
            preparationDays: { gt: 0 },
            event: {
              startDate: {
                gte: date,
              },
            },
          },
        ],
      },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            format: true,
            startDate: true,
            endDate: true,
            venue: true,
            city: true,
            translations: true,
            organization: {
              select: {
                name: true,
                companyName: true,
                translations: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    });
  }

  // ==================== USER EVENTS (Мои события) ====================

  /**
   * Получить события пользователя с фильтрацией и пагинацией
   */
  async findUserEvents(
    userId: string,
    query: UserEventsQueryDto,
  ): Promise<IPaginatedUserEvents> {
    const {
      page = 1,
      limit = 10,
      filter = UserEventFilter.ALL,
      search,
    } = query;
    const skip = (page - 1) * limit;

    // Базовый where
    let where: Prisma.RegistrationWhereInput = { userId };

    // Применяем фильтр
    switch (filter) {
      case UserEventFilter.APPROVED:
        where.status = RegistrationStatus.APPROVED;
        break;
      case UserEventFilter.PENDING:
        where.status = RegistrationStatus.PENDING;
        break;
      case UserEventFilter.CANCELLED:
        where.status = {
          in: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED],
        };
        break;
      case UserEventFilter.ATTENDED:
        // Посещённые - есть хотя бы один check-in в attendance
        where = {
          ...where,
          status: RegistrationStatus.APPROVED,
          attendances: { some: {} },
        };
        break;
      case UserEventFilter.ALL:
      default:
        // Без фильтра по статусу
        break;
    }

    // Поиск по названию события
    if (search) {
      where.event = {
        title: { contains: search, mode: 'insensitive' },
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.registration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverImage: true,
              shortDescription: true,
              startDate: true,
              endDate: true,
              format: true,
              venue: true,
              city: true,
              status: true,
              translations: true,
              organization: {
                select: {
                  name: true,
                  companyName: true,
                  translations: true,
                },
              },
            },
          },
          attendances: {
            select: {
              id: true,
              checkInAt: true,
              checkInDate: true,
            },
            orderBy: { checkInDate: 'asc' },
          },
          certificate: {
            select: {
              id: true,
              certificateUrl: true,
              generatedAt: true,
            },
          },
        },
      }),
      this.prisma.registration.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить статистику событий пользователя
   */
  async getUserEventsStats(userId: string): Promise<IUserEventsStats> {
    const [
      totalEvents,
      approvedEvents,
      pendingEvents,
      attendedEvents,
      cancelledEvents,
      certificatesCount,
    ] = await this.prisma.$transaction([
      // Общее количество регистраций
      this.prisma.registration.count({ where: { userId } }),
      // Подтверждённые
      this.prisma.registration.count({
        where: { userId, status: RegistrationStatus.APPROVED },
      }),
      // Ожидающие
      this.prisma.registration.count({
        where: { userId, status: RegistrationStatus.PENDING },
      }),
      // Посещённые (есть хотя бы один attendance)
      this.prisma.registration.count({
        where: {
          userId,
          status: RegistrationStatus.APPROVED,
          attendances: { some: {} },
        },
      }),
      // Отменённые (CANCELLED + REJECTED)
      this.prisma.registration.count({
        where: {
          userId,
          status: {
            in: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED],
          },
        },
      }),
      // Количество сертификатов пользователя
      this.prisma.userCertificate.count({ where: { userId } }),
    ]);

    return {
      totalEvents,
      approvedEvents,
      pendingEvents,
      attendedEvents,
      cancelledEvents,
      certificatesCount,
    };
  }

  // ==================== USER CERTIFICATES ====================

  /**
   * Создать сертификат пользователя
   */
  async createCertificate(
    data: Prisma.UserCertificateCreateInput,
  ): Promise<UserCertificate> {
    return this.prisma.userCertificate.create({ data });
  }

  /**
   * Получить сертификат по ID
   */
  async findCertificateById(id: string): Promise<UserCertificate | null> {
    return this.prisma.userCertificate.findUnique({ where: { id } });
  }

  /**
   * Получить все сертификаты пользователя
   */
  async findCertificatesByUserId(
    userId: string,
    options?: {
      search?: string;
      isVerified?: boolean;
    },
  ): Promise<UserCertificate[]> {
    const where: Prisma.UserCertificateWhereInput = {
      userId,
      ...(options?.isVerified !== undefined && {
        isVerified: options.isVerified,
      }),
      ...(options?.search && {
        OR: [
          { title: { contains: options.search, mode: 'insensitive' } },
          { provider: { contains: options.search, mode: 'insensitive' } },
          { credentialId: { contains: options.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.userCertificate.findMany({
      where,
      orderBy: { issueDate: 'desc' },
    });
  }

  /**
   * Получить сертификаты с мероприятий по userId (через регистрации)
   */
  async findEventCertificatesByUserId(userId: string): Promise<any[]> {
    const list = await this.prisma.certificate.findMany({
      where: { registration: { userId } },
      select: {
        id: true,
        registrationId: true,
        eventName: true,
        eventDate: true,
        certificateUrl: true,
        generatedAt: true,
        verificationCode: true,
        registration: {
          select: {
            event: {
              select: {
                title: true,
                translations: true,
              },
            },
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });
    return list;
  }

  /**
   * Получить статистику сертификатов пользователя.
   * Учитываются: профильные сертификаты (UserCertificate) и сертификаты с мероприятий (Certificate по регистрациям).
   */
  async getCertificatesStats(userId: string): Promise<{
    totalCertificates: number;
    verifiedCertificates: number;
    totalTrainingHours: number;
  }> {
    const [userCertTotal, userCertVerified, userCertHours, eventCertCount] =
      await this.prisma.$transaction([
        this.prisma.userCertificate.count({ where: { userId } }),
        this.prisma.userCertificate.count({
          where: { userId, isVerified: true },
        }),
        this.prisma.userCertificate.aggregate({
          where: { userId },
          _sum: { trainingHours: true },
        }),
        this.prisma.certificate.count({
          where: { registration: { userId } },
        }),
      ]);

    return {
      totalCertificates: userCertTotal + eventCertCount,
      verifiedCertificates: userCertVerified + eventCertCount,
      totalTrainingHours: userCertHours._sum.trainingHours ?? 0,
    };
  }

  /**
   * Обновить сертификат
   */
  async updateCertificate(
    id: string,
    data: Prisma.UserCertificateUpdateInput,
  ): Promise<UserCertificate> {
    return this.prisma.userCertificate.update({ where: { id }, data });
  }

  /**
   * Удалить сертификат
   */
  async deleteCertificate(id: string): Promise<void> {
    await this.prisma.userCertificate.delete({ where: { id } });
  }

  // ==================== SAVED ARTICLES ====================

  /**
   * Сохранить статью в избранное
   */
  async saveArticle(
    data: Prisma.SavedArticleCreateInput,
  ): Promise<SavedArticle> {
    return this.prisma.savedArticle.create({ data });
  }

  /**
   * Получить сохранённую статью по ID
   */
  async findSavedArticleById(id: string): Promise<SavedArticle | null> {
    return this.prisma.savedArticle.findUnique({ where: { id } });
  }

  /**
   * Проверить, сохранена ли статья
   */
  async findSavedArticleByUrl(
    userId: string,
    articleUrl: string,
  ): Promise<SavedArticle | null> {
    return this.prisma.savedArticle.findUnique({
      where: {
        userId_articleUrl: { userId, articleUrl },
      },
    });
  }

  /**
   * Получить сохранённые статьи пользователя с пагинацией.
   * Фильтры search/category применяются только при непустых значениях.
   */
  async findSavedArticlesByUserId(
    userId: string,
    options?: {
      search?: string;
      category?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: SavedArticle[]; total: number }> {
    const category = options?.category?.trim();
    const search = options?.search?.trim();
    const where: Prisma.SavedArticleWhereInput = {
      userId,
      ...(category !== undefined && category !== '' && { category }),
      ...(search !== undefined &&
        search !== '' && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { excerpt: { contains: search, mode: 'insensitive' } },
          ],
        }),
    };

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 12));
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.savedArticle.findMany({
        where,
        orderBy: { savedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.savedArticle.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Получить все URL сохранённых статей пользователя (для проверки saved по slug/id в блоге).
   */
  async getSavedArticleUrls(userId: string): Promise<string[]> {
    const rows = await this.prisma.savedArticle.findMany({
      where: { userId },
      select: { articleUrl: true },
    });
    return rows.map((r) => r.articleUrl);
  }

  /**
   * Подсчитать количество сохранённых статей
   */
  async countSavedArticles(userId: string): Promise<number> {
    return this.prisma.savedArticle.count({ where: { userId } });
  }

  /**
   * Удалить статью из избранного
   */
  async deleteSavedArticle(id: string): Promise<void> {
    await this.prisma.savedArticle.delete({ where: { id } });
  }

  /**
   * Удалить статью из избранного по URL
   */
  async deleteSavedArticleByUrl(
    userId: string,
    articleUrl: string,
  ): Promise<void> {
    await this.prisma.savedArticle.delete({
      where: {
        userId_articleUrl: { userId, articleUrl },
      },
    });
  }
}
