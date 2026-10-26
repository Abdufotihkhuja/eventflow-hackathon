import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowersRepository } from './followers.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  FollowerEntity,
  FollowingOrganizationEntity,
  FollowersStatsEntity,
} from './entities';
import { FollowersQueryDto } from './dto';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FollowersService {
  constructor(
    private readonly followersRepository: FollowersRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Подписаться на организатора
   */
  async follow(userId: string, organizationId: string): Promise<void> {
    // Проверить существование организации
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
    });

    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    // Проверить, не подписан ли уже
    const exists = await this.followersRepository.exists(
      userId,
      organizationId,
    );

    if (exists) {
      throw new ConflictException('Вы уже подписаны на этого организатора');
    }

    await this.followersRepository.create(userId, organizationId);
  }

  /**
   * Отписаться от организатора
   */
  async unfollow(userId: string, organizationId: string): Promise<void> {
    const exists = await this.followersRepository.exists(
      userId,
      organizationId,
    );

    if (!exists) {
      throw new NotFoundException('Подписка не найдена');
    }

    await this.followersRepository.delete(userId, organizationId);
  }

  /**
   * Проверить, подписан ли пользователь на организатора
   */
  async isFollowing(
    userId: string,
    organizationId: string,
  ): Promise<{ isFollowing: boolean }> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
    });
    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }
    const exists = await this.followersRepository.exists(
      userId,
      organizationId,
    );
    return { isFollowing: exists };
  }

  /**
   * Получить список подписчиков организации
   */
  async getFollowers(
    organizationId: string,
    query: FollowersQueryDto,
  ): Promise<PaginatedResult<FollowerEntity>> {
    const result = await this.followersRepository.findFollowersByOrganization(
      organizationId,
      query.page,
      query.limit,
      query.search,
    );

    const followers = result.data.map(
      (item) =>
        new FollowerEntity({
          id: item.user.id,
          firstName: item.user.firstName,
          lastName: item.user.lastName,
          avatarUrl: item.user.avatarUrl,
          followedAt: item.createdAt,
        }),
    );

    return {
      data: followers,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Получить список подписок пользователя
   */
  async getFollowingOrganizations(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<FollowingOrganizationEntity>> {
    const result = await this.followersRepository.findFollowingByUser(
      userId,
      page,
      limit,
    );

    const organizations = result.data.map(
      (item) =>
        new FollowingOrganizationEntity({
          id: item.organization.id,
          name: item.organization.name,
          companyName: item.organization.companyName,
          logoUrl: item.organization.logoUrl,
          description: item.organization.description,
          website: item.organization.website,
          verificationStatus: item.organization.verificationStatus,
          followedAt: item.createdAt,
        }),
    );

    return {
      data: organizations,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Получить статистику подписчиков
   */
  async getFollowersStats(
    organizationId: string,
  ): Promise<FollowersStatsEntity> {
    const stats =
      await this.followersRepository.getFollowersStats(organizationId);
    return new FollowersStatsEntity(stats);
  }

  /**
   * Получить количество подписчиков организации
   */
  async getFollowersCount(organizationId: string): Promise<number> {
    return this.followersRepository.countFollowers(organizationId);
  }
}
