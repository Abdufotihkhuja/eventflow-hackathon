import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, OrganizationMember } from '@prisma/client';

/**
 * Field WHITELIST for every member row that leaves this repository towards a
 * controller response. Credentials/invite secrets (`passwordHash`,
 * `invitationToken`, `tokenExpiresAt`) are deliberately ABSENT — the previous
 * `include`-only query serialized them to every MEMBERS_READ client.
 * Auth flows that need those columns query prisma directly (auth.service) or
 * use `findByInvitationToken` below, which never reaches a response body.
 */
export const memberSafeSelect = {
  id: true,
  organizationId: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  position: true,
  department: true,
  avatarUrl: true,
  roleId: true,
  status: true,
  invitationSent: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  role: {
    include: {
      permissions: { include: { permission: true } },
    },
  },
  permissions: { include: { permission: true } },
} satisfies Prisma.OrganizationMemberSelect;

export type OrganizationMemberWithAccess = Prisma.OrganizationMemberGetPayload<{
  select: typeof memberSafeSelect;
}>;

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.OrganizationMemberCreateInput,
  ): Promise<OrganizationMemberWithAccess> {
    return this.prisma.organizationMember.create({
      data,
      select: memberSafeSelect,
    });
  }

  async findById(id: string): Promise<OrganizationMemberWithAccess | null> {
    return this.prisma.organizationMember.findFirst({
      where: { id, deletedAt: null },
      select: memberSafeSelect,
    });
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMemberWithAccess[]> {
    return this.prisma.organizationMember.findMany({
      where: { organizationId, deletedAt: null },
      select: memberSafeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrgAndEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findFirst({
      where: { organizationId, email, deletedAt: null },
    });
  }

  async findByInvitationToken(
    token: string,
  ): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findFirst({
      where: { invitationToken: token, deletedAt: null },
      include: { organization: true, role: true },
    });
  }

  async update(
    id: string,
    data: Prisma.OrganizationMemberUpdateInput,
  ): Promise<OrganizationMemberWithAccess> {
    return this.prisma.organizationMember.update({
      where: { id },
      data,
      select: memberSafeSelect,
    });
  }

  /**
   * Soft delete — помечает сотрудника как удалённого
   */
  async softDelete(id: string): Promise<OrganizationMemberWithAccess> {
    return this.prisma.organizationMember.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: memberSafeSelect,
    });
  }

  /**
   * Hard delete — полное удаление
   */
  async hardDelete(id: string): Promise<OrganizationMember> {
    return this.prisma.organizationMember.delete({ where: { id } });
  }

  /**
   * Восстановление удалённого сотрудника
   */
  async restore(id: string): Promise<OrganizationMemberWithAccess> {
    return this.prisma.organizationMember.update({
      where: { id },
      data: { deletedAt: null },
      select: memberSafeSelect,
    });
  }

  /**
   * Получить всех удалённых сотрудников организации
   */
  async findDeleted(
    organizationId: string,
  ): Promise<OrganizationMemberWithAccess[]> {
    return this.prisma.organizationMember.findMany({
      where: { organizationId, deletedAt: { not: null } },
      select: memberSafeSelect,
      orderBy: { deletedAt: 'desc' },
    });
  }

  async updatePermissions(
    memberId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.memberPermission.deleteMany({ where: { memberId } });

      if (permissionIds.length > 0) {
        await tx.memberPermission.createMany({
          data: permissionIds.map((permissionId) => ({
            memberId,
            permissionId,
          })),
        });
      }
    });
  }

  /**
   * Получить полный профиль сотрудника с организацией
   */
  async findByIdWithOrganization(id: string) {
    return this.prisma.organizationMember.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        permissions: { include: { permission: true } },
        organization: {
          select: {
            id: true,
            name: true,
            companyName: true,
            logoUrl: true,
          },
        },
      },
    });
  }
}
