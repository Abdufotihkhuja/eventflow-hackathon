import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberStatus, MembershipKind, UserType } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationalMetricsService } from '../platform/observability/operational-metrics.service';
import {
  OrganizationScopeV2Dto,
  PersonalScopeV2Dto,
  ResolvedScopeV2ResponseDto,
  ScopeAvailabilityDto,
  SessionV2ResponseDto,
} from './dto/session-v2.dto';
import type { ScopeSelector } from './scope-selector';

const ALL_CAPABILITIES = Object.values(PERMISSIONS);

@Injectable()
export class ScopeResolverService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly metrics?: OperationalMetricsService,
  ) {}

  async getSession(accountId: string): Promise<SessionV2ResponseDto> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        displayName: true,
        deletedAt: true,
      },
    });
    if (!account || account.deletedAt) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Аккаунт недоступен',
      });
    }

    const [personalScope, memberships] = await Promise.all([
      this.resolvePersonalScope(account.id),
      this.loadMemberships(account.id),
    ]);

    const counts = new Map<string, number>();
    for (const membership of memberships) {
      counts.set(
        membership.organizationId,
        (counts.get(membership.organizationId) ?? 0) + 1,
      );
    }

    const organizationScopes = memberships
      .map((membership) =>
        this.mapOrganizationScope(
          membership,
          (counts.get(membership.organizationId) ?? 0) > 1,
        ),
      )
      .filter((scope): scope is OrganizationScopeV2Dto => scope !== null);
    this.metrics?.recordScopeResolution(personalScope.availability);
    organizationScopes.forEach((scope) =>
      this.metrics?.recordScopeResolution(scope.availability),
    );

    return {
      account: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
      },
      personalScope,
      organizationScopes,
    };
  }

  private loadMemberships(accountId: string) {
    return this.prisma.membership.findMany({
      where: { accountId },
      orderBy: [{ organizationId: 'asc' }, { id: 'asc' }],
      include: {
        role: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            permissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
            suspendedAt: true,
            accessOverrides: {
              select: { permissionCode: true },
            },
            roles: {
              where: { name: 'Владелец', isSystem: true },
              take: 1,
              select: { id: true, name: true },
            },
          },
        },
        organizationMember: {
          select: {
            id: true,
            organizationId: true,
            deletedAt: true,
            status: true,
            role: {
              select: {
                id: true,
                name: true,
                organizationId: true,
                permissions: {
                  select: { permission: { select: { code: true } } },
                },
              },
            },
            permissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    });
  }

  async resolve(
    accountId: string,
    selector: ScopeSelector,
  ): Promise<ResolvedScopeV2ResponseDto> {
    const session = await this.getSession(accountId);
    if (selector.kind === 'PERSONAL') {
      if (session.personalScope.availability !== ScopeAvailabilityDto.ACTIVE) {
        throw unavailableScope(session.personalScope.availability);
      }
      return {
        kind: 'PERSONAL',
        accountId,
        userId: session.personalScope.userId,
        organizationId: null,
        membershipId: null,
        capabilities: [],
      };
    }

    const scopes = session.organizationScopes.filter(
      (scope) => scope.organizationId === selector.organizationId,
    );
    if (scopes.length !== 1) {
      throw unavailableScope(
        scopes.length > 1
          ? ScopeAvailabilityDto.RECONCILIATION_REQUIRED
          : ScopeAvailabilityDto.REVOKED,
      );
    }
    const scope = scopes[0];
    if (scope.availability !== ScopeAvailabilityDto.ACTIVE) {
      throw unavailableScope(scope.availability);
    }
    return {
      kind: 'ORGANIZATION',
      accountId,
      userId: null,
      organizationId: scope.organizationId,
      membershipId: scope.membershipId,
      capabilities: scope.capabilities,
    };
  }

  async hideFormerScope(
    accountId: string,
    membershipId: string,
  ): Promise<void> {
    const result = await this.prisma.membership.updateMany({
      where: {
        id: membershipId,
        accountId,
        OR: [
          { organization: { deletedAt: { not: null } } },
          { organizationMember: { deletedAt: { not: null } } },
          { organizationMember: { status: { not: MemberStatus.ACTIVE } } },
        ],
      },
      data: { hiddenAt: new Date() },
    });
    if (result.count !== 1) {
      throw new NotFoundException({
        code: 'FORMER_SCOPE_NOT_FOUND',
        message: 'Бывший контекст не найден',
      });
    }
  }

  private async resolvePersonalScope(
    accountId: string,
  ): Promise<PersonalScopeV2Dto> {
    const identities = await this.prisma.identity.findMany({
      where: { accountId, actorType: UserType.USER },
      orderBy: { id: 'asc' },
      take: 2,
      select: { actorId: true },
    });
    if (identities.length === 0) {
      return {
        kind: 'PERSONAL',
        availability: ScopeAvailabilityDto.DISABLED,
        userId: null,
      };
    }
    if (identities.length > 1) {
      return {
        kind: 'PERSONAL',
        availability: ScopeAvailabilityDto.RECONCILIATION_REQUIRED,
        userId: null,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: identities[0].actorId },
      select: { id: true, deletedAt: true },
    });
    return {
      kind: 'PERSONAL',
      availability:
        user && !user.deletedAt
          ? ScopeAvailabilityDto.ACTIVE
          : ScopeAvailabilityDto.REVOKED,
      userId: user?.id ?? null,
    };
  }

  private mapOrganizationScope(
    membership: Awaited<
      ReturnType<ScopeResolverService['loadMemberships']>
    >[number],
    duplicate: boolean,
  ): OrganizationScopeV2Dto | null {
    if (membership.hiddenAt) return null;
    const organization = membership.organization;
    const member = membership.organizationMember;
    let availability = ScopeAvailabilityDto.ACTIVE;

    if (duplicate) {
      availability = ScopeAvailabilityDto.RECONCILIATION_REQUIRED;
    } else if (organization.deletedAt) {
      availability = ScopeAvailabilityDto.ARCHIVED;
    } else if (organization.suspendedAt) {
      availability = ScopeAvailabilityDto.SUSPENDED;
    } else if (membership.kind === MembershipKind.MEMBER) {
      if (
        !member ||
        member.deletedAt ||
        member.organizationId !== membership.organizationId
      ) {
        availability = ScopeAvailabilityDto.REVOKED;
      } else if (member.role.organizationId !== membership.organizationId) {
        availability = ScopeAvailabilityDto.RECONCILIATION_REQUIRED;
      } else if (member.status === MemberStatus.SUSPENDED) {
        availability = ScopeAvailabilityDto.SUSPENDED;
      } else if (member.status !== MemberStatus.ACTIVE) {
        availability = ScopeAvailabilityDto.REVOKED;
      }
    } else if (membership.organizationMemberId || member) {
      availability = ScopeAvailabilityDto.RECONCILIATION_REQUIRED;
    } else if (
      membership.roleId &&
      (!membership.role ||
        membership.role.organizationId !== membership.organizationId)
    ) {
      availability = ScopeAvailabilityDto.RECONCILIATION_REQUIRED;
    }

    const denied = new Set(
      organization.accessOverrides.map((item) => item.permissionCode),
    );
    const granted =
      membership.kind === MembershipKind.OWNER
        ? ALL_CAPABILITIES
        : [
            ...(membership.role
              ? membership.role.permissions.map((item) => item.permission.code)
              : (member?.role.permissions.map((item) => item.permission.code) ??
                [])),
            ...(member?.permissions.map((item) => item.permission.code) ?? []),
          ];
    if (
      membership.kind === MembershipKind.MEMBER &&
      !sameStringSet(membership.permissions, granted)
    ) {
      this.metrics?.recordScopeProjectionMismatch('MEMBER_PERMISSIONS');
    }
    const capabilities =
      availability === ScopeAvailabilityDto.ACTIVE
        ? [...new Set(granted)].filter((code) => !denied.has(code)).sort()
        : [];
    const ownerRole = organization.roles[0] ?? null;
    const tombstoneSource =
      availability === ScopeAvailabilityDto.ARCHIVED
        ? organization.deletedAt
        : availability === ScopeAvailabilityDto.REVOKED
          ? (member?.deletedAt ?? membership.updatedAt)
          : null;
    const tombstoneUntil = tombstoneSource
      ? new Date(tombstoneSource.getTime() + 90 * 24 * 60 * 60 * 1000)
      : null;
    if (tombstoneUntil && tombstoneUntil.getTime() <= Date.now()) return null;

    return {
      kind: 'ORGANIZATION',
      organizationId: membership.organizationId,
      organizationName: organization.name,
      membershipId: membership.id,
      availability,
      roleId:
        membership.role?.id ??
        (membership.kind === MembershipKind.OWNER
          ? (ownerRole?.id ?? null)
          : (member?.role.id ?? null)),
      roleLabel:
        membership.role?.name ??
        (membership.kind === MembershipKind.OWNER
          ? (ownerRole?.name ?? 'Владелец')
          : (member?.role.name ?? membership.roleName)),
      capabilities,
      tombstoneUntil: tombstoneUntil?.toISOString() ?? null,
    };
  }
}

function sameStringSet(left: string[], right: string[]): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((value) => rightSet.has(value))
  );
}

function unavailableScope(
  availability: ScopeAvailabilityDto,
): ForbiddenException {
  return new ForbiddenException({
    code: 'SCOPE_UNAVAILABLE',
    message: 'Выбранный контекст недоступен',
    availability,
  });
}
