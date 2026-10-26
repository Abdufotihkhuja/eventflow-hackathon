import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Organization, EventStatus } from '@prisma/client';

export interface PublicOrganizationProfileSnapshot {
  organization: {
    id: string;
    name: string;
    companyName: string;
    translations: Prisma.JsonValue;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    address: string | null;
    verificationStatus: Organization['verificationStatus'];
    verifiedAt: Date | null;
  };
  followersCount: number;
  eventsCount: number;
  isFollowing: boolean;
}

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<Organization | null> {
    return this.prisma.organization.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async update(
    id: string,
    data: Prisma.OrganizationUpdateInput,
  ): Promise<Organization> {
    return this.prisma.organization.update({ where: { id }, data });
  }

  /**
   * Soft delete — помечает организацию как удалённую
   */
  async softDelete(id: string): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Восстановление удалённой организации (только для супер-админа)
   */
  async restore(id: string): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Получить все удалённые организации (только для супер-админа)
   */
  async findDeleted(): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findPublicProfileSnapshot(
    organizationId: string,
    currentUserId?: string,
  ): Promise<PublicOrganizationProfileSnapshot | null> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        companyName: true,
        translations: true,
        description: true,
        logoUrl: true,
        website: true,
        address: true,
        verificationStatus: true,
        verifiedAt: true,
      },
    });

    if (!organization) {
      return null;
    }

    const [followersCount, eventsCount] = await this.prisma.$transaction([
      this.prisma.userFollowing.count({
        where: {
          organizationId,
          user: { deletedAt: null },
        },
      }),
      // Завершённые события уходят в COMPLETED, но остаются публично видимыми
      // (см. public.repository) — иначе счётчик расходится со списком событий
      // организации на её публичной странице.
      this.prisma.event.count({
        where: {
          organizationId,
          status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
          deletedAt: null,
        },
      }),
    ]);

    const following = currentUserId
      ? await this.prisma.userFollowing.findFirst({
          where: {
            userId: currentUserId,
            organizationId,
          },
          select: { id: true },
        })
      : null;

    return {
      organization,
      followersCount,
      eventsCount,
      isFollowing: !!following,
    };
  }
}
