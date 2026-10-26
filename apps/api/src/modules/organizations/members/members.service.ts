import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import {
  MembersRepository,
  type OrganizationMemberWithAccess,
} from './members.repository';
import {
  CreateMemberDto,
  UpdateMemberDto,
  UpdateMemberPermissionsDto,
  UpdateMemberProfileDto,
  UpdateMemberPrivacyDto,
  MemberProfileResponseDto,
  MemberPermissionsResponseDto,
  PermissionCatalogItemDto,
} from './dto';
import {
  MemberStatus,
  MembershipKind,
  Permission,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { BCRYPT_SALT_ROUNDS } from '../../../common/constants/security.constant';
import { InvitesService } from '../invites/invites.service';
import { InviteSummaryDto } from '../invites/dto/invite-response.dto';
import type { ICurrentUser } from '../../../common/interfaces';
import { POLICY_DENIALS } from '../../../common/constants/policy-denial.constant';

@Injectable()
export class MembersService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly invitesService: InvitesService,
  ) {}

  /**
   * Creates an organization member.
   *
   * - `sendInvitation: true` (legacy flag) now delegates to the invite flow:
   *   it creates an {@link OrganizationInvite} (no stranded INVITED member, no
   *   raw token) and returns the invite summary. New clients should call
   *   `POST /organizations/invites` directly.
   * - `sendInvitation: false` is retained only for wire compatibility and is
   *   rejected: an organization member must join through an accepted invite.
   */
  async create(
    organizationId: string,
    dto: CreateMemberDto,
  ): Promise<OrganizationMemberWithAccess | InviteSummaryDto> {
    if (!dto.sendInvitation) {
      throw new ForbiddenException(
        POLICY_DENIALS.ORGANIZATION_INVITATION_REQUIRED,
      );
    }
    return this.invitesService.createInvite(organizationId, {
      email: dto.email,
      roleId: dto.roleId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      position: dto.position,
      department: dto.department,
    });
  }

  async findAll(
    organizationId: string,
  ): Promise<OrganizationMemberWithAccess[]> {
    return this.membersRepository.findByOrganizationId(organizationId);
  }

  async findById(
    organizationId: string,
    memberId: string,
  ): Promise<OrganizationMemberWithAccess> {
    const member = await this.membersRepository.findById(memberId);
    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Сотрудник не найден');
    }
    return member;
  }

  async update(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberDto,
    actor?: ICurrentUser,
  ): Promise<OrganizationMemberWithAccess> {
    await this.findById(organizationId, memberId);

    if (dto.roleId || dto.status) {
      await this.assertMemberLifecycleMutable(organizationId, memberId);
    }

    // Если меняем роль, проверяем её принадлежность к организации
    if (dto.roleId) {
      const role = await this.prisma.organizationRole.findFirst({
        where: { id: dto.roleId, organizationId },
        include: { permissions: { include: { permission: true } } },
      });
      if (!role) {
        throw new NotFoundException('Роль не найдена');
      }
      // Потолок прав: нельзя назначить роль, дающую права, которых нет у актора
      // (иначе MEMBER эскалируется, назначив себе/другому «мощную» роль).
      this.assertActorCanGrantPermissions(
        actor,
        role.permissions.map((rp) => rp.permission),
      );
    }

    const updatedMember = await this.membersRepository.update(memberId, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.position !== undefined && { position: dto.position }),
      ...(dto.department !== undefined && { department: dto.department }),
      ...(dto.roleId && { role: { connect: { id: dto.roleId } } }),
      ...(dto.status && { status: dto.status }),
    });

    if (dto.roleId || dto.status) {
      await this.syncMembershipPermissions(memberId);
    }

    return updatedMember;
  }

  /**
   * Soft delete — помечает сотрудника как удалённого
   */
  async delete(organizationId: string, memberId: string): Promise<void> {
    await this.findById(organizationId, memberId);
    await this.assertMemberLifecycleMutable(organizationId, memberId);
    await this.membersRepository.softDelete(memberId);
  }

  async updatePermissions(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberPermissionsDto,
    actor?: ICurrentUser,
  ): Promise<OrganizationMemberWithAccess> {
    const member = await this.findById(organizationId, memberId);
    await this.assertMemberLifecycleMutable(organizationId, memberId);

    // Проверяем, что все права существуют
    let permissions: Permission[] = [];
    if (dto.permissionIds.length > 0) {
      permissions = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
      });
      if (permissions.length !== dto.permissionIds.length) {
        throw new NotFoundException('Некоторые права не найдены');
      }
    }

    this.assertActorCanGrantPermissions(actor, permissions);

    const rolePermissionIds = new Set(
      member.role.permissions.map((item) => item.permissionId),
    );
    const individualPermissionIds = dto.permissionIds.filter(
      (permissionId) => !rolePermissionIds.has(permissionId),
    );

    await this.membersRepository.updatePermissions(
      memberId,
      individualPermissionIds,
    );
    await this.syncMembershipPermissions(memberId);

    const updatedMember = await this.membersRepository.findById(memberId);
    if (!updatedMember) {
      throw new NotFoundException('Сотрудник не найден');
    }

    return updatedMember;
  }

  /**
   * Повторная отправка приглашения.
   *
   * Делегирует в account-centric invite-flow: создаёт/обновляет
   * {@link OrganizationInvite} (правильный existing/new шаблон, ссылка
   * `/invite/accept`, хэшированный токен). Это заменяет устаревший
   * member-invitation путь, который слал письмо «создайте аккаунт» с битой
   * ссылкой `/invite/activate` для уже существующих пользователей.
   *
   * Легаси-сырой `invitationToken` на сотруднике обнуляется, чтобы старая
   * ссылка перестала работать.
   *
   * @throws NotFoundException если сотрудник не найден
   * @throws BadRequestException если сотрудник уже активен
   */
  async resendInvitation(
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    const member = await this.findById(organizationId, memberId);

    if (member.status === MemberStatus.ACTIVE) {
      throw new BadRequestException(
        'Аккаунт сотрудника уже активирован. Повторная отправка приглашения невозможна.',
      );
    }

    await this.invitesService.createOrResend(organizationId, {
      email: member.email,
      roleId: member.roleId,
      firstName: member.firstName,
      lastName: member.lastName,
      position: member.position ?? undefined,
      department: member.department ?? undefined,
    });

    await this.membersRepository.update(memberId, {
      invitationToken: null,
      tokenExpiresAt: null,
      invitationSent: true,
    });
  }

  /**
   * Активация аккаунта сотрудника по токену
   * @throws NotFoundException если токен не найден или устарел
   * @throws BadRequestException если аккаунт уже активирован
   */
  /**
   * Активация аккаунта сотрудника по токену
   * @param token - Токен активации
   * @param password - Новый пароль
   * @throws NotFoundException если токен не найден
   * @throws BadRequestException если аккаунт уже активирован или токен истек
   */
  async activateAccount(
    token: string,
    password: string,
  ): Promise<OrganizationMemberWithAccess> {
    const member = await this.membersRepository.findByInvitationToken(token);

    if (!member) {
      throw new NotFoundException('Неверный токен активации');
    }

    if (member.passwordHash) {
      throw new BadRequestException('Аккаунт уже активирован');
    }

    if (member.tokenExpiresAt && member.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Срок действия токена истек');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    return this.membersRepository.update(member.id, {
      passwordHash,
      invitationToken: null,
      tokenExpiresAt: null,
      status: MemberStatus.ACTIVE,
    });
  }

  // ==================== PROFILE METHODS ====================

  /**
   * Получить профиль текущего сотрудника
   * @throws NotFoundException если сотрудник не найден
   */
  async getMyProfile(memberId: string): Promise<MemberProfileResponseDto> {
    const member =
      await this.membersRepository.findByIdWithOrganization(memberId);

    if (!member) {
      throw new NotFoundException('Сотрудник не найден');
    }

    // Собираем права: от роли + индивидуальные
    const rolePermissions = member.role.permissions.map(
      (rp) => rp.permission.code,
    );
    const memberPermissions = member.permissions.map(
      (mp) => mp.permission.code,
    );
    const allPermissions = [
      ...new Set([...rolePermissions, ...memberPermissions]),
    ];

    return {
      id: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone ?? undefined,
      position: member.position ?? undefined,
      department: member.department ?? undefined,
      avatarUrl: member.avatarUrl ?? undefined,
      bio: member.bio ?? undefined,
      location: member.location ?? undefined,
      status: member.status,
      isPublicProfile: member.isPublicProfile,
      showEmail: member.showEmail,
      showPhone: member.showPhone,
      isOnboardingCompleted: member.isOnboardingCompleted,
      role: {
        id: member.role.id,
        name: member.role.name,
        isSystem: member.role.isSystem,
      },
      organization: {
        id: member.organization.id,
        name: member.organization.name,
        companyName: member.organization.companyName,
        logoUrl: member.organization.logoUrl ?? undefined,
      },
      permissions: allPermissions,
      createdAt: member.createdAt,
    };
  }

  /**
   * Обновить профиль текущего сотрудника
   */
  async updateMyProfile(
    memberId: string,
    dto: UpdateMemberProfileDto,
  ): Promise<MemberProfileResponseDto> {
    await this.getMyProfile(memberId); // Проверяем существование

    await this.membersRepository.update(memberId, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.phone !== undefined && { phone: dto.phone || null }),
      ...(dto.position !== undefined && { position: dto.position || null }),
      ...(dto.department !== undefined && {
        department: dto.department || null,
      }),
      ...(dto.bio !== undefined && { bio: dto.bio || null }),
      ...(dto.location !== undefined && { location: dto.location || null }),
    });

    return this.getMyProfile(memberId);
  }

  /**
   * Завершить онбординг сотрудника
   */
  async completeOnboarding(
    memberId: string,
  ): Promise<MemberProfileResponseDto> {
    await this.getMyProfile(memberId);

    await this.membersRepository.update(memberId, {
      isOnboardingCompleted: true,
    });

    return this.getMyProfile(memberId);
  }

  /**
   * Обновить настройки приватности сотрудника
   */
  async updateMyPrivacy(
    memberId: string,
    dto: UpdateMemberPrivacyDto,
  ): Promise<MemberProfileResponseDto> {
    await this.getMyProfile(memberId);

    await this.membersRepository.update(memberId, {
      ...(dto.isPublicProfile !== undefined && {
        isPublicProfile: dto.isPublicProfile,
      }),
      ...(dto.showEmail !== undefined && { showEmail: dto.showEmail }),
      ...(dto.showPhone !== undefined && { showPhone: dto.showPhone }),
    });

    return this.getMyProfile(memberId);
  }

  /**
   * Загрузить аватар сотрудника
   */
  async uploadMyAvatar(
    memberId: string,
    file: Express.Multer.File,
  ): Promise<MemberProfileResponseDto> {
    const profile = await this.getMyProfile(memberId);

    // Удаляем старый аватар если есть
    if (profile.avatarUrl) {
      await this.deleteAvatarFile(profile.avatarUrl);
    }

    const uploaded = await this.uploadsService.uploadImage(file);
    await this.membersRepository.update(memberId, {
      avatarUrl: uploaded.url,
    });

    return this.getMyProfile(memberId);
  }

  /**
   * Удалить аватар сотрудника
   */
  async deleteMyAvatar(memberId: string): Promise<MemberProfileResponseDto> {
    const profile = await this.getMyProfile(memberId);

    if (!profile.avatarUrl) {
      return profile;
    }

    await this.deleteAvatarFile(profile.avatarUrl);
    await this.membersRepository.update(memberId, {
      avatarUrl: null,
    });

    return this.getMyProfile(memberId);
  }

  /**
   * Получить свои права доступа
   */
  async getMyPermissions(
    memberId: string,
  ): Promise<MemberPermissionsResponseDto> {
    const member =
      await this.membersRepository.findByIdWithOrganization(memberId);

    if (!member) {
      throw new NotFoundException('Сотрудник не найден');
    }

    const rolePermissions = member.role.permissions.map((rp) =>
      this.mapPermission(rp.permission),
    );
    const individualPermissions = member.permissions.map((mp) =>
      this.mapPermission(mp.permission),
    );
    const allPermissionsByCode = new Map<string, PermissionCatalogItemDto>();
    for (const permission of [...rolePermissions, ...individualPermissions]) {
      allPermissionsByCode.set(permission.code, permission);
    }
    const allPermissions = Array.from(allPermissionsByCode.values());
    const permissionCodes = allPermissions.map((permission) => permission.code);

    // Группируем по категориям
    const permissionsByCategory: Record<string, string[]> = {};
    for (const permission of allPermissions) {
      if (!permissionsByCategory[permission.category]) {
        permissionsByCategory[permission.category] = [];
      }
      permissionsByCategory[permission.category].push(permission.code);
    }

    return {
      role: {
        id: member.role.id,
        name: member.role.name,
      },
      rolePermissions,
      individualPermissions,
      allPermissions,
      permissions: permissionCodes,
      permissionsByCategory,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private mapPermission(permission: Permission): PermissionCatalogItemDto {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      createdAt: permission.createdAt,
    };
  }

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

  private async syncMembershipPermissions(memberId: string): Promise<void> {
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        permissions: { include: { permission: true } },
      },
    });

    if (!member) {
      return;
    }

    const permissions = [
      ...new Set([
        ...member.role.permissions.map((item) => item.permission.code),
        ...member.permissions.map((item) => item.permission.code),
      ]),
    ];

    await this.prisma.membership.updateMany({
      where: { organizationMemberId: memberId },
      data: {
        roleId: member.roleId,
        roleName: member.role.name,
        permissions,
      },
    });
  }

  private async assertMemberLifecycleMutable(
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        organizationMemberId: memberId,
      },
      select: { kind: true },
    });

    if (membership?.kind === MembershipKind.OWNER) {
      throw new ForbiddenException(
        POLICY_DENIALS.OWNER_LIFECYCLE_REQUIRES_TRANSFER,
      );
    }
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
