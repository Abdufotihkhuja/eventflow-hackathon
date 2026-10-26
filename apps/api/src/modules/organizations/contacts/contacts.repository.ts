import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ContactRequestStatus,
  ContactRequestType,
  Prisma,
  RentalType,
} from '@prisma/client';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const contactRequestInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
  requesterOrganization: {
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
    },
  },
  rentalPlace: {
    select: {
      id: true,
      title: true,
      slug: true,
      images: {
        orderBy: { sortOrder: 'asc' as const },
        take: 1,
        select: { url: true },
      },
    },
  },
} satisfies Prisma.ContactRequestInclude;

export type ContactRequestWithUser = Prisma.ContactRequestGetPayload<{
  include: typeof contactRequestInclude;
}>;

@Injectable()
export class ContactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создать заявку на связь
   */
  async create(
    userId: string,
    organizationId: string,
    phone: string,
    message?: string,
  ) {
    return this.prisma.contactRequest.create({
      data: {
        userId,
        organizationId,
        phone,
        message,
        type: ContactRequestType.GENERAL,
        status: ContactRequestStatus.NEW,
      },
    });
  }

  async createPlaceRentalRequest(
    requesterOrganizationId: string,
    organizationId: string,
    rentalPlaceId: string,
    phone: string,
    rentalType: RentalType,
    message?: string,
  ) {
    return this.prisma.contactRequest.create({
      data: {
        requesterOrganizationId,
        organizationId,
        rentalPlaceId,
        phone,
        message,
        rentalType,
        type: ContactRequestType.PLACE_RENTAL,
        status: ContactRequestStatus.NEW,
      },
    });
  }

  /**
   * Получить заявку по ID
   */
  async findById(
    organizationId: string,
    requestId: string,
  ): Promise<ContactRequestWithUser | null> {
    return this.prisma.contactRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
      },
      include: contactRequestInclude,
    });
  }

  /**
   * Получить список заявок организации
   */
  async findAll(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    status?: ContactRequestStatus,
    search?: string,
  ): Promise<PaginatedResult<ContactRequestWithUser>> {
    const skip = (page - 1) * limit;

    const where: Prisma.ContactRequestWhereInput = {
      organizationId,
      OR: [{ userId: null }, { user: { deletedAt: null } }],
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { phone: { contains: search } },
        {
          requesterOrganization: {
            companyName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          rentalPlace: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contactRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: contactRequestInclude,
      }),
      this.prisma.contactRequest.count({ where }),
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
   * Обновить статус заявки
   */
  async updateStatus(
    organizationId: string,
    requestId: string,
    status: ContactRequestStatus,
  ) {
    return this.prisma.contactRequest.update({
      where: {
        id: requestId,
        organizationId,
      },
      data: {
        status,
      },
    });
  }

  /**
   * Получить статистику заявок
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    new: number;
    inProgress: number;
    closed: number;
  }> {
    const [total, newCount, inProgressCount, closedCount] =
      await this.prisma.$transaction([
        this.prisma.contactRequest.count({
          where: { organizationId },
        }),
        this.prisma.contactRequest.count({
          where: { organizationId, status: ContactRequestStatus.NEW },
        }),
        this.prisma.contactRequest.count({
          where: { organizationId, status: ContactRequestStatus.IN_PROGRESS },
        }),
        this.prisma.contactRequest.count({
          where: { organizationId, status: ContactRequestStatus.CLOSED },
        }),
      ]);

    return {
      total,
      new: newCount,
      inProgress: inProgressCount,
      closed: closedCount,
    };
  }
}
