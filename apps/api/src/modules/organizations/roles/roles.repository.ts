import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrganizationRole } from '@prisma/client';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    name: string,
    permissionIds: string[],
  ): Promise<OrganizationRole> {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.organizationRole.create({
        data: {
          organizationId,
          name,
        },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      return tx.organizationRole.findUnique({
        where: { id: role.id },
        include: { permissions: { include: { permission: true } } },
      }) as Promise<OrganizationRole>;
    });
  }

  async findById(id: string): Promise<OrganizationRole | null> {
    return this.prisma.organizationRole.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationRole[]> {
    return this.prisma.organizationRole.findMany({
      where: { organizationId },
      include: { permissions: { include: { permission: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByOrgAndName(
    organizationId: string,
    name: string,
  ): Promise<OrganizationRole | null> {
    return this.prisma.organizationRole.findUnique({
      where: { organizationId_name: { organizationId, name } },
    });
  }

  async update(
    id: string,
    name?: string,
    permissionIds?: string[],
  ): Promise<OrganizationRole> {
    return this.prisma.$transaction(async (tx) => {
      if (name) {
        await tx.organizationRole.update({
          where: { id },
          data: { name },
        });
      }

      if (permissionIds !== undefined) {
        // Удаляем старые права
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        // Добавляем новые
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }

      return tx.organizationRole.findUnique({
        where: { id },
        include: { permissions: { include: { permission: true } } },
      }) as Promise<OrganizationRole>;
    });
  }

  async delete(id: string): Promise<OrganizationRole> {
    return this.prisma.organizationRole.delete({ where: { id } });
  }

  async hasMembers(roleId: string): Promise<boolean> {
    const count = await this.prisma.organizationMember.count({
      where: { roleId },
    });
    return count > 0;
  }
}
