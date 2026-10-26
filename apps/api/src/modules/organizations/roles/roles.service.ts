import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { OrganizationRole, Permission, UserType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateRoleDto,
    actor?: ICurrentUser,
  ): Promise<OrganizationRole> {
    // Проверяем уникальность названия
    const existingRole = await this.rolesRepository.findByOrgAndName(
      organizationId,
      dto.name,
    );
    if (existingRole) {
      throw new ConflictException('Роль с таким названием уже существует');
    }

    // Проверяем существование прав
    if (dto.permissionIds.length > 0) {
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
      });
      if (permissions.length !== dto.permissionIds.length) {
        throw new NotFoundException('Некоторые права не найдены');
      }
      // Потолок прав: MEMBER не может вложить в роль права, которых нет у него
      // самого (иначе через ROLES_MANAGE можно эскалироваться до владельца орг).
      this.assertActorCanGrantPermissions(actor, permissions);
    }

    return this.rolesRepository.create(
      organizationId,
      dto.name,
      dto.permissionIds,
    );
  }

  async findAll(organizationId: string): Promise<OrganizationRole[]> {
    return this.rolesRepository.findByOrganizationId(organizationId);
  }

  async findById(
    organizationId: string,
    roleId: string,
  ): Promise<OrganizationRole> {
    const role = await this.rolesRepository.findById(roleId);
    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundException('Роль не найдена');
    }
    return role;
  }

  async update(
    organizationId: string,
    roleId: string,
    dto: UpdateRoleDto,
    actor?: ICurrentUser,
  ): Promise<OrganizationRole> {
    const role = await this.findById(organizationId, roleId);

    // Системные роли нельзя редактировать
    if (role.isSystem) {
      throw new ForbiddenException('Системные роли нельзя редактировать');
    }

    // Проверяем уникальность нового названия
    if (dto.name && dto.name !== role.name) {
      const existingRole = await this.rolesRepository.findByOrgAndName(
        organizationId,
        dto.name,
      );
      if (existingRole) {
        throw new ConflictException('Роль с таким названием уже существует');
      }
    }

    // Проверяем существование прав
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
      });
      if (permissions.length !== dto.permissionIds.length) {
        throw new NotFoundException('Некоторые права не найдены');
      }
      // Потолок прав (см. create): MEMBER не может добавить в роль права,
      // которых у него нет.
      this.assertActorCanGrantPermissions(actor, permissions);
    }

    return this.rolesRepository.update(roleId, dto.name, dto.permissionIds);
  }

  /**
   * Потолок прав: MEMBER-актор не может выдать права, которых нет у него самого.
   * ORGANIZATION/SUPER_ADMIN держат полный набор — для них ограничения нет.
   * Зеркалит members.service.assertActorCanGrantPermissions.
   */
  private assertActorCanGrantPermissions(
    actor: ICurrentUser | undefined,
    permissions: Permission[],
  ): void {
    if (!actor || actor.type !== UserType.MEMBER) {
      return;
    }

    const actorPermissions = new Set(actor.permissions ?? []);
    const forbidden = permissions.filter(
      (permission) => !actorPermissions.has(permission.code),
    );

    if (forbidden.length > 0) {
      throw new ForbiddenException(
        'Нельзя назначить права, которых нет у текущего пользователя',
      );
    }
  }

  async delete(organizationId: string, roleId: string): Promise<void> {
    const role = await this.findById(organizationId, roleId);

    // Системные роли нельзя удалять
    if (role.isSystem) {
      throw new ForbiddenException('Системные роли нельзя удалять');
    }

    // Проверяем, есть ли сотрудники с этой ролью
    const hasMembers = await this.rolesRepository.hasMembers(roleId);
    if (hasMembers) {
      throw new BadRequestException(
        'Нельзя удалить роль, назначенную сотрудникам',
      );
    }

    await this.rolesRepository.delete(roleId);
  }
}
