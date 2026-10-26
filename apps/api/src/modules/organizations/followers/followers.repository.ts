import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserFollowing } from '@prisma/client';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FollowersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создать подписку
   */
  async create(userId: string, organizationId: string): Promise<UserFollowing> {
    return this.prisma.userFollowing.create({
      data: {
        userId,
        organizationId,
      },
    });
  }

  /**
   * Удалить подписку
   */
  async delete(userId: string, organizationId: string): Promise<void> {
    await this.prisma.userFollowing.deleteMany({
      where: {
        userId,
        organizationId,
      },
    });
  }

  /**
   * Проверить существование подписки
   */
  async exists(userId: string, organizationId: string): Promise<boolean> {
    const count = await this.prisma.userFollowing.count({
      where: {
        userId,
        organizationId,
      },
    });
    return count > 0;
  }

  /**
   * Получить список подписчиков организации
   */
  async findFollowersByOrganization(
    organizationId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      user: {
        deletedAt: null,
      },
    };

    // Поиск по имени пользователя
    if (search) {
      where.user.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userFollowing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.userFollowing.count({ where }),
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
   * Получить список подписок пользователя
   */
  async findFollowingByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const where = {
      userId,
      organization: {
        deletedAt: null,
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userFollowing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              companyName: true,
              logoUrl: true,
              description: true,
              website: true,
              verificationStatus: true,
            },
          },
        },
      }),
      this.prisma.userFollowing.count({ where }),
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
   * Получить количество подписчиков организации
   */
  async countFollowers(organizationId: string): Promise<number> {
    return this.prisma.userFollowing.count({
      where: {
        organizationId,
        user: {
          deletedAt: null,
        },
      },
    });
  }

  /**
   * Получить статистику подписчиков
   */
  async getFollowersStats(organizationId: string): Promise<{
    total: number;
    last7Days: number;
    last30Days: number;
  }> {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, last7DaysCount, last30DaysCount] =
      await this.prisma.$transaction([
        this.prisma.userFollowing.count({
          where: {
            organizationId,
            user: { deletedAt: null },
          },
        }),
        this.prisma.userFollowing.count({
          where: {
            organizationId,
            createdAt: { gte: last7Days },
            user: { deletedAt: null },
          },
        }),
        this.prisma.userFollowing.count({
          where: {
            organizationId,
            createdAt: { gte: last30Days },
            user: { deletedAt: null },
          },
        }),
      ]);

    return {
      total,
      last7Days: last7DaysCount,
      last30Days: last30DaysCount,
    };
  }
}
