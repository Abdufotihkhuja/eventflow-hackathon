import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  Registration,
  RegistrationStatus,
  ParticipantRole,
  RegistrationQuestion,
  Event,
} from '@prisma/client';
import {
  RegistrationQueryDto,
  MyRegistrationsQueryDto,
  UserRegistrationFilter,
} from './dto';

export interface IPaginatedRegistrations {
  data: Registration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type RegistrationEventSnapshot = Pick<
  Event,
  | 'id'
  | 'status'
  | 'accessType'
  | 'inviteCode'
  | 'registrationDeadline'
  | 'registrationOpen'
  | 'maxParticipants'
  | 'registrationMode'
  | 'testEvaluationType'
  | 'minTestScore'
  // E-3: тарифный клэмп участников
  | 'organizationId'
  | 'createdAt'
> & {
  registrationQuestions: RegistrationQuestion[];
};

@Injectable()
export class RegistrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.RegistrationCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Registration> {
    return (tx ?? this.prisma).registration.create({
      data,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
        answers: { include: { question: true } },
      },
    });
  }

  async findById(id: string): Promise<Registration | null> {
    return this.prisma.registration.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            organizationId: true,
          },
        },
        answers: { include: { question: true } },
        fileUploads: {
          where: { status: 'ATTACHED' },
          select: {
            id: true,
            questionId: true,
            originalName: true,
            mimeType: true,
            size: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        certificate: true,
      },
    });
  }

  async findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<Registration | null> {
    return this.prisma.registration.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });
  }

  async findByQrCode(qrCode: string): Promise<Registration | null> {
    return this.prisma.registration.findUnique({
      where: { qrCode },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            organizationId: true,
          },
        },
      },
    });
  }

  async findByEvent(
    eventId: string,
    query: RegistrationQueryDto,
  ): Promise<IPaginatedRegistrations> {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RegistrationWhereInput = {
      eventId,
      ...(status && { status }),
      ...(search && {
        user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.registration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
          },
          answers: { include: { question: true } },
          // Файлы-ответы нужны экспорту: имена файлов в ячейках + ZIP-выгрузка.
          fileUploads: {
            where: { status: 'ATTACHED' },
            select: {
              id: true,
              questionId: true,
              originalName: true,
              mimeType: true,
              size: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
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

  async findByUser(
    userId: string,
    query: RegistrationQueryDto,
  ): Promise<IPaginatedRegistrations> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RegistrationWhereInput = {
      userId,
      ...(status && { status }),
    };

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
              title: true,
              coverImage: true,
              startDate: true,
              endDate: true,
              format: true,
              venue: true,
              city: true,
            },
          },
          certificate: true,
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
   * Получает регистрации пользователя для страницы /profile/events
   * Поддерживает фильтры: ALL, APPROVED, PENDING, ATTENDED, CANCELLED
   */
  async findMyRegistrations(
    userId: string,
    query: MyRegistrationsQueryDto,
  ): Promise<IPaginatedRegistrations> {
    const {
      page = 1,
      limit = 10,
      filter = UserRegistrationFilter.ALL,
      search,
    } = query;
    const skip = (page - 1) * limit;

    // Базовый where
    let where: Prisma.RegistrationWhereInput = { userId };

    // Применяем фильтр
    switch (filter) {
      case UserRegistrationFilter.APPROVED:
        where.status = RegistrationStatus.APPROVED;
        break;
      case UserRegistrationFilter.PENDING:
        where.status = RegistrationStatus.PENDING;
        break;
      case UserRegistrationFilter.CANCELLED:
        where.status = {
          in: [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED],
        };
        break;
      case UserRegistrationFilter.ATTENDED:
        // Посещённые - есть хотя бы один check-in в attendance
        where = {
          ...where,
          status: RegistrationStatus.APPROVED,
          attendances: { some: {} },
        };
        break;
      case UserRegistrationFilter.ALL:
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
          certificate: true,
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

  async updateStatus(
    id: string,
    status: RegistrationStatus,
    rejectionReason?: string,
  ): Promise<Registration> {
    return this.prisma.registration.update({
      where: { id },
      data: {
        status,
        ...(rejectionReason && { rejectionReason }),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
        event: { select: { id: true, title: true } },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.RegistrationUpdateInput,
  ): Promise<Registration> {
    return this.prisma.registration.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.registration.delete({ where: { id } });
  }

  async countByEventAndStatus(
    eventId: string,
    statuses: RegistrationStatus[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return (tx ?? this.prisma).registration.count({
      where: {
        eventId,
        status: { in: statuses },
      },
    });
  }

  async findEventRegistrationSnapshot(
    eventId: string,
  ): Promise<RegistrationEventSnapshot | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        accessType: true,
        inviteCode: true,
        registrationDeadline: true,
        registrationOpen: true,
        maxParticipants: true,
        registrationMode: true,
        testEvaluationType: true,
        minTestScore: true,
        registrationQuestions: true,
        // E-3: тарифный клэмп участников
        organizationId: true,
        createdAt: true,
      },
    });
  }

  async findEventOrganizationAccess(
    eventId: string,
  ): Promise<{ organizationId: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
  }

  async findEventWithOrgName(eventId: string): Promise<{
    title: string;
    organizationName: string;
    organizationId: string;
  } | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        organizationId: true,
        organization: { select: { companyName: true } },
      },
    });
    if (!event) return null;
    return {
      title: event.title,
      organizationName: event.organization.companyName,
      organizationId: event.organizationId,
    };
  }

  /**
   * Повторная регистрация: обновляет существующую запись (CANCELLED/REJECTED),
   * сбрасывает ответы и создаёт новые.
   */
  async recreateForReregistration(
    registrationId: string,
    data: {
      status: RegistrationStatus;
      qrCode: string;
      role: ParticipantRole;
      travelStartDate?: Date | null;
      travelEndDate?: Date | null;
      preparationDays?: number;
      testScore?: number | null;
      testMaxScore?: number | null;
      testPassed?: boolean | null;
      testCompletedAt?: Date | null;
      answers?: { questionId: string; answer: string }[];
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Registration> {
    return (tx ?? this.prisma).registration.update({
      where: { id: registrationId },
      data: {
        status: data.status,
        qrCode: data.qrCode,
        role: data.role,
        rejectionReason: null,
        ...(data.travelStartDate !== undefined && {
          travelStartDate: data.travelStartDate,
        }),
        ...(data.travelEndDate !== undefined && {
          travelEndDate: data.travelEndDate,
        }),
        ...(data.preparationDays !== undefined && {
          preparationDays: data.preparationDays,
        }),
        ...(data.testScore !== undefined && { testScore: data.testScore }),
        ...(data.testMaxScore !== undefined && {
          testMaxScore: data.testMaxScore,
        }),
        ...(data.testPassed !== undefined && { testPassed: data.testPassed }),
        ...(data.testCompletedAt !== undefined && {
          testCompletedAt: data.testCompletedAt,
        }),
        answers: {
          deleteMany: {},
          create:
            data.answers?.map((a) => ({
              answer: a.answer,
              question: { connect: { id: a.questionId } },
            })) ?? [],
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true },
        },
        answers: { include: { question: true } },
      },
    });
  }
}
