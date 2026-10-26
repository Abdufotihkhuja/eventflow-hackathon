import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ActorKind,
  AuthProvider,
  MemberStatus,
  MembershipKind,
  PlatformRole,
  Prisma,
  UserType,
  type Membership,
  type Organization,
  type OrganizationMember,
  type SuperAdmin,
  type User,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ORGANIZATION_DEACTIVATED_MESSAGE,
  USER_DEACTIVATED_MESSAGE,
} from '../../common/constants/account-status.constant';
import type {
  ICurrentSessionAccount,
  ICurrentSessionMembership,
  ICurrentSessionWorkspace,
  ICurrentUser,
} from '../../common/interfaces';
import {
  ACCOUNT_RESOLUTION_CODES,
  accountResolutionError,
} from '../../common/constants/account-resolution.constant';

type MemberActor = OrganizationMember & {
  organization: Organization;
  role: {
    name: string;
    permissions: Array<{ permission: { code: string } }>;
  };
  permissions: Array<{ permission: { code: string } }>;
};

type ActorRecord =
  | { type: 'USER'; actor: User }
  | { type: 'ORGANIZATION'; actor: Organization }
  | { type: 'MEMBER'; actor: MemberActor }
  | { type: 'SUPER_ADMIN'; actor: SuperAdmin };

export interface ActorSessionContext {
  accountId: string;
  actorKind: ActorKind;
  platformRole?: PlatformRole;
  activeWorkspaceId?: string;
  currentAccount: ICurrentSessionAccount;
  activeWorkspace: ICurrentSessionWorkspace | null;
  memberships: ICurrentSessionMembership[];
}

export interface AccountOrganizationSummary {
  membershipId: string;
  organizationId: string;
  organizationMemberId: string | null;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
  inn: string | null;
  verificationStatus: string;
  kind: MembershipKind;
  isOwner: boolean;
  roleName: string | null;
  permissions: string[];
}

@Injectable()
export class IamService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveSessionContext(
    params: Pick<ICurrentUser, 'sub' | 'type'>,
  ): Promise<ActorSessionContext> {
    const actor = await this.getActorRecord(params.type, params.sub);
    return this.resolveSessionContextForActor(actor);
  }

  async resolveSessionContextForLogin(params: {
    actorId: string;
    actorType: UserType;
  }): Promise<ActorSessionContext> {
    const actor = await this.getActorRecord(params.actorType, params.actorId);

    return this.resolveSessionContextForActor(actor);
  }

  async resolveActorIdentityForAccount(params: {
    accountId: string;
    actorType: UserType;
  }): Promise<ActorRecord> {
    const identities = await this.prisma.identity.findMany({
      where: {
        accountId: params.accountId,
        actorType: params.actorType,
      },
      orderBy: { id: 'asc' },
      take: 2,
    });

    if (identities.length === 0) {
      throw new UnauthorizedException(
        accountResolutionError(ACCOUNT_RESOLUTION_CODES.IDENTITY_NOT_FOUND),
      );
    }
    if (identities.length > 1) {
      throw new UnauthorizedException(
        accountResolutionError(
          ACCOUNT_RESOLUTION_CODES.RECONCILIATION_REQUIRED,
        ),
      );
    }

    try {
      return await this.getActorRecord(params.actorType, identities[0].actorId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(
          accountResolutionError(ACCOUNT_RESOLUTION_CODES.IDENTITY_ORPHANED),
        );
      }
      throw error;
    }
  }

  private async resolveSessionContextForActor(
    actor: ActorRecord,
  ): Promise<ActorSessionContext> {
    switch (actor.type) {
      case UserType.USER:
        return this.resolveUserContext(actor.actor as User);
      case UserType.ORGANIZATION:
        return this.resolveOrganizationContext(actor.actor as Organization);
      case UserType.MEMBER:
        return this.resolveMemberContext(actor.actor as MemberActor);
      case UserType.SUPER_ADMIN:
        return this.resolveSuperAdminContext(actor.actor as SuperAdmin);
      default:
        throw new UnauthorizedException('Неизвестный тип аккаунта');
    }
  }

  private async resolveUserContext(user: User): Promise<ActorSessionContext> {
    if (user.deletedAt) {
      throw new UnauthorizedException(USER_DEACTIVATED_MESSAGE);
    }

    const account = await this.ensureAccountIdentity({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      provider: user.authProvider,
      providerId: user.providerId,
      passwordHash: user.passwordHash,
      actorType: UserType.USER,
      actorId: user.id,
    });

    await this.assertSinglePersonalIdentity(account.id, user.id);

    const memberships = await this.getMembershipsForAccount(account.id);

    return {
      accountId: account.id,
      actorKind: ActorKind.USER,
      currentAccount: this.mapAccount(account),
      activeWorkspace: null,
      memberships,
    };
  }

  private async resolveOrganizationContext(
    organization: Organization,
  ): Promise<ActorSessionContext> {
    if (organization.deletedAt) {
      throw new UnauthorizedException(ORGANIZATION_DEACTIVATED_MESSAGE);
    }

    const account = await this.ensureAccountIdentity({
      email: organization.email,
      displayName: organization.name,
      avatarUrl: organization.logoUrl,
      phone: organization.phone,
      provider: organization.authProvider,
      providerId: organization.providerId,
      passwordHash: organization.passwordHash,
      actorType: UserType.ORGANIZATION,
      actorId: organization.id,
    });

    await this.prisma.membership.upsert({
      where: {
        accountId_organizationId_kind: {
          accountId: account.id,
          organizationId: organization.id,
          kind: MembershipKind.OWNER,
        },
      },
      update: {
        roleName: 'OWNER',
      },
      create: {
        accountId: account.id,
        organizationId: organization.id,
        kind: MembershipKind.OWNER,
        roleName: 'OWNER',
      },
    });

    const memberships = await this.getMembershipsForAccount(account.id);
    const activeWorkspace = this.mapWorkspace(organization);

    return {
      accountId: account.id,
      actorKind: ActorKind.ORGANIZATION,
      activeWorkspaceId: organization.id,
      currentAccount: this.mapAccount(account),
      activeWorkspace,
      memberships,
    };
  }

  private async resolveMemberContext(
    member: MemberActor,
  ): Promise<ActorSessionContext> {
    if (member.deletedAt) {
      throw new UnauthorizedException('Сотрудник не найден');
    }
    // Архивированная организация блокирует вход всех своих сотрудников,
    // не удаляя их записи.
    if (member.organization.deletedAt) {
      throw new UnauthorizedException(ORGANIZATION_DEACTIVATED_MESSAGE);
    }

    const account = await this.ensureAccountIdentity({
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      displayName:
        [member.firstName, member.lastName].filter(Boolean).join(' ') ||
        member.email,
      avatarUrl: member.avatarUrl,
      phone: member.phone,
      provider: AuthProvider.EMAIL,
      passwordHash: member.passwordHash,
      actorType: UserType.MEMBER,
      actorId: member.id,
    });

    const permissions = [
      ...new Set([
        ...member.role.permissions.map(
          (item: { permission: { code: string } }) => item.permission.code,
        ),
        ...member.permissions.map(
          (item: { permission: { code: string } }) => item.permission.code,
        ),
      ]),
    ];

    await this.prisma.membership.upsert({
      where: {
        organizationMemberId: member.id,
      },
      update: {
        roleId: member.roleId,
        accountId: account.id,
        organizationId: member.organizationId,
        kind: MembershipKind.MEMBER,
        roleName: member.role.name,
        permissions,
      },
      create: {
        accountId: account.id,
        organizationId: member.organizationId,
        organizationMemberId: member.id,
        roleId: member.roleId,
        kind: MembershipKind.MEMBER,
        roleName: member.role.name,
        permissions,
      },
    });

    const memberships = await this.getMembershipsForAccount(account.id);
    const activeWorkspace = this.mapWorkspace(member.organization);

    return {
      accountId: account.id,
      actorKind: ActorKind.MEMBER,
      activeWorkspaceId: member.organizationId,
      currentAccount: this.mapAccount(account),
      activeWorkspace,
      memberships,
    };
  }

  private async resolveSuperAdminContext(
    admin: SuperAdmin,
  ): Promise<ActorSessionContext> {
    if (admin.deletedAt) {
      throw new UnauthorizedException('Администратор не найден');
    }

    const account = await this.ensureAccountIdentity({
      email: admin.email,
      displayName: admin.name,
      provider: AuthProvider.EMAIL,
      passwordHash: admin.passwordHash,
      actorType: UserType.SUPER_ADMIN,
      actorId: admin.id,
    });

    await this.prisma.platformAdminGrant.upsert({
      where: {
        accountId_superAdminId: {
          accountId: account.id,
          superAdminId: admin.id,
        },
      },
      update: {
        role: PlatformRole.SUPER_ADMIN,
      },
      create: {
        accountId: account.id,
        superAdminId: admin.id,
        role: PlatformRole.SUPER_ADMIN,
      },
    });

    const memberships = await this.getMembershipsForAccount(account.id);

    return {
      accountId: account.id,
      actorKind: ActorKind.SUPER_ADMIN,
      platformRole: PlatformRole.SUPER_ADMIN,
      currentAccount: this.mapAccount(account),
      activeWorkspace: null,
      memberships,
    };
  }

  private async ensureAccountIdentity(
    params: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      displayName?: string | null;
      avatarUrl?: string | null;
      phone?: string | null;
      provider: AuthProvider;
      providerId?: string | null;
      passwordHash?: string | null;
      actorType: UserType;
      actorId: string;
    },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const existingIdentity = await db.identity.findUnique({
      where: {
        actorType_actorId: {
          actorType: params.actorType,
          actorId: params.actorId,
        },
      },
      include: {
        account: true,
      },
    });

    if (existingIdentity) {
      if (existingIdentity.account.deletedAt) {
        throw new UnauthorizedException(
          accountResolutionError(ACCOUNT_RESOLUTION_CODES.ACCOUNT_DEACTIVATED),
        );
      }
      const account = await db.account.update({
        where: { id: existingIdentity.accountId },
        data: {
          email: params.email,
          firstName: params.firstName ?? undefined,
          lastName: params.lastName ?? undefined,
          displayName: params.displayName ?? undefined,
          avatarUrl: params.avatarUrl ?? undefined,
          phone: params.phone ?? undefined,
        },
      });

      await db.identity.update({
        where: { id: existingIdentity.id },
        data: {
          email: params.email,
          provider: params.provider,
          providerId: params.providerId ?? undefined,
          passwordHash: params.passwordHash ?? undefined,
        },
      });

      return account;
    }

    return db.account.create({
      data: {
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        displayName: params.displayName,
        avatarUrl: params.avatarUrl,
        phone: params.phone,
        identities: {
          create: {
            email: params.email,
            provider: params.provider,
            providerId: params.providerId,
            passwordHash: params.passwordHash,
            actorType: params.actorType,
            actorId: params.actorId,
          },
        },
      },
    });
  }

  private async assertSinglePersonalIdentity(
    accountId: string,
    expectedActorId: string,
  ): Promise<void> {
    const identities = await this.prisma.identity.findMany({
      where: { accountId, actorType: UserType.USER },
      select: { actorId: true },
      orderBy: { id: 'asc' },
      take: 2,
    });

    if (identities.length !== 1 || identities[0].actorId !== expectedActorId) {
      throw new UnauthorizedException(
        accountResolutionError(
          ACCOUNT_RESOLUTION_CODES.RECONCILIATION_REQUIRED,
        ),
      );
    }
  }

  private async getMembershipsForAccount(
    accountId: string,
  ): Promise<ICurrentSessionMembership[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { accountId },
      include: {
        organization: true,
        organizationMember: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships
      .filter((membership) => this.isMembershipActive(membership))
      .map((membership) => ({
        id: membership.id,
        kind: membership.kind,
        roleName: membership.roleName,
        permissions: membership.permissions,
        organizationMemberId: membership.organizationMemberId,
        workspace: this.mapWorkspace(membership.organization),
      }));
  }

  /**
   * A membership grants access only while its backing staff record is ACTIVE.
   * OWNER memberships have no OrganizationMember (the organization account is
   * the owner) and are always active. MEMBER memberships whose staff record is
   * suspended, soft-deleted, or missing must NOT appear in the session — this
   * is the per-request enforcement the JWT-time check alone did not provide.
   */
  private isMembershipActive(membership: {
    kind: MembershipKind;
    organization: Pick<Organization, 'deletedAt' | 'suspendedAt'>;
    organizationMember: OrganizationMember | null;
  }): boolean {
    if (
      membership.organization.deletedAt ||
      membership.organization.suspendedAt
    ) {
      return false;
    }
    if (membership.kind === MembershipKind.OWNER) {
      return true;
    }
    const member = membership.organizationMember;
    return (
      !!member &&
      member.status === MemberStatus.ACTIVE &&
      member.deletedAt === null
    );
  }

  private mapAccount(account: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  }): ICurrentSessionAccount {
    return {
      id: account.id,
      email: account.email,
      firstName: account.firstName ?? null,
      lastName: account.lastName ?? null,
      displayName: account.displayName ?? null,
      avatarUrl: account.avatarUrl ?? null,
      phone: account.phone ?? null,
    };
  }

  private mapWorkspace(organization: Organization): ICurrentSessionWorkspace {
    return {
      id: organization.id,
      name: organization.name,
      companyName: organization.companyName,
      email: organization.email,
      logoUrl: organization.logoUrl,
      verificationStatus: organization.verificationStatus,
    };
  }

  // ==================== ACCOUNT-CENTRIC HELPERS ====================

  /**
   * Ensures the given public {@link User} has a backing Account + USER identity
   * and returns the accountId. Used by the invite-accept flow so a participant
   * who joins an organization keeps a single unified account.
   */
  async ensureAccountForUser(
    user: User,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const account = await this.ensureAccountIdentity(
      {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName:
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        provider: user.authProvider,
        providerId: user.providerId,
        passwordHash: user.passwordHash,
        actorType: UserType.USER,
        actorId: user.id,
      },
      db,
    );
    return account.id;
  }

  /**
   * Links a freshly created {@link OrganizationMember} (staff profile) to an
   * existing account so the same person gains organization membership without a
   * separate account or a second password. Creates the MEMBER identity (no
   * password — auth happens through the owning account) and the Membership row.
   *
   * Idempotent: re-linking the same member updates the existing identity and
   * membership rather than throwing on the unique constraints.
   */
  async linkMemberToAccount(
    params: {
      accountId: string;
      member: OrganizationMember;
      roleName: string;
      permissions: string[];
    },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    const { accountId, member, roleName, permissions } = params;

    await db.identity.upsert({
      where: {
        actorType_actorId: {
          actorType: UserType.MEMBER,
          actorId: member.id,
        },
      },
      update: { accountId, email: member.email, provider: AuthProvider.EMAIL },
      create: {
        accountId,
        email: member.email,
        provider: AuthProvider.EMAIL,
        actorType: UserType.MEMBER,
        actorId: member.id,
      },
    });

    await db.membership.upsert({
      where: { organizationMemberId: member.id },
      update: {
        roleId: member.roleId,
        accountId,
        organizationId: member.organizationId,
        kind: MembershipKind.MEMBER,
        roleName,
        permissions,
      },
      create: {
        accountId,
        organizationId: member.organizationId,
        organizationMemberId: member.id,
        roleId: member.roleId,
        kind: MembershipKind.MEMBER,
        roleName,
        permissions,
      },
    });
  }

  /**
   * Active organizations for an account — only memberships whose backing staff
   * record is ACTIVE (OWNER memberships always count). Backs
   * `GET /me/organizations` and the org switcher.
   */
  async listAccountOrganizations(
    accountId: string,
  ): Promise<AccountOrganizationSummary[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { accountId },
      include: { organization: true, organizationMember: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships
      .filter((membership) => this.isMembershipActive(membership))
      .map((membership) => ({
        membershipId: membership.id,
        organizationId: membership.organizationId,
        organizationMemberId: membership.organizationMemberId,
        name: membership.organization.name,
        companyName: membership.organization.companyName,
        logoUrl: membership.organization.logoUrl,
        inn: membership.organization.inn,
        verificationStatus: membership.organization.verificationStatus,
        kind: membership.kind,
        isOwner: membership.kind === MembershipKind.OWNER,
        roleName: membership.roleName,
        permissions: membership.permissions,
      }));
  }

  /**
   * Resolves the ACTIVE membership + staff record connecting an account to an
   * organization, so the caller can mint a workspace-scoped (MEMBER) session.
   * Returns null when the account is not an active member of that org.
   */
  async resolveMembershipForWorkspace(params: {
    accountId: string;
    organizationId: string;
  }): Promise<{ membership: Membership; member: OrganizationMember } | null> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        accountId: params.accountId,
        organizationId: params.organizationId,
        kind: MembershipKind.MEMBER,
      },
      include: { organizationMember: true, organization: true },
    });

    if (
      !membership ||
      !membership.organizationMember ||
      membership.organizationMember.status !== MemberStatus.ACTIVE ||
      membership.organizationMember.deletedAt !== null ||
      membership.organization.deletedAt !== null ||
      membership.organization.suspendedAt !== null
    ) {
      return null;
    }

    return { membership, member: membership.organizationMember };
  }

  private async getActorRecord(
    actorType: UserType,
    actorId: string,
  ): Promise<ActorRecord> {
    switch (actorType) {
      case UserType.USER: {
        const actor = await this.prisma.user.findUnique({
          where: { id: actorId },
        });
        if (!actor) {
          throw new NotFoundException('Пользователь не найден');
        }
        return { type: UserType.USER, actor };
      }
      case UserType.ORGANIZATION: {
        const actor = await this.prisma.organization.findUnique({
          where: { id: actorId },
        });
        if (!actor) {
          throw new NotFoundException('Организация не найдена');
        }
        return { type: UserType.ORGANIZATION, actor };
      }
      case UserType.MEMBER: {
        const actor = await this.prisma.organizationMember.findUnique({
          where: { id: actorId },
          include: {
            organization: true,
            role: {
              include: { permissions: { include: { permission: true } } },
            },
            permissions: { include: { permission: true } },
          },
        });
        if (!actor) {
          throw new NotFoundException('Сотрудник не найден');
        }
        return { type: UserType.MEMBER, actor };
      }
      case UserType.SUPER_ADMIN: {
        const actor = await this.prisma.superAdmin.findUnique({
          where: { id: actorId },
        });
        if (!actor) {
          throw new NotFoundException('Супер-админ не найден');
        }
        return { type: UserType.SUPER_ADMIN, actor };
      }
      default:
        throw new NotFoundException('Actor не найден');
    }
  }
}
