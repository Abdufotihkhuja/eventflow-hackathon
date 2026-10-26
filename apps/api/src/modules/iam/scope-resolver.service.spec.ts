import { ForbiddenException } from '@nestjs/common';
import { MemberStatus, MembershipKind } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeAvailabilityDto } from './dto/session-v2.dto';
import { ScopeResolverService } from './scope-resolver.service';

const ACCOUNT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORGANIZATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('ScopeResolverService', () => {
  const prisma = {
    account: { findUnique: jest.fn() },
    identity: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    membership: { findMany: jest.fn(), updateMany: jest.fn() },
  };
  const service = new ScopeResolverService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.account.findUnique.mockResolvedValue({
      id: ACCOUNT_ID,
      email: 'owner@example.com',
      displayName: 'Owner',
      deletedAt: null,
    });
    prisma.identity.findMany.mockResolvedValue([
      { actorId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
    ]);
    prisma.user.findUnique.mockResolvedValue({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      deletedAt: null,
    });
    prisma.membership.findMany.mockResolvedValue([]);
  });

  it('returns live personal scope and does not derive it from email', async () => {
    const session = await service.getSession(ACCOUNT_ID);

    expect(session.personalScope).toEqual({
      kind: 'PERSONAL',
      availability: ScopeAvailabilityDto.ACTIVE,
      userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    });
    expect(prisma.identity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: ACCOUNT_ID, actorType: 'USER' },
      }),
    );
  });

  it('keeps both personal and organization scopes for an invited USER member', async () => {
    prisma.membership.findMany.mockResolvedValue([membership()]);

    const session = await service.getSession(ACCOUNT_ID);

    expect(session.personalScope.availability).toBe(
      ScopeAvailabilityDto.ACTIVE,
    );
    expect(session.organizationScopes).toEqual([
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        availability: ScopeAvailabilityDto.ACTIVE,
      }),
    ]);
  });

  it('applies organization deny-mask to owner capabilities', async () => {
    prisma.membership.findMany.mockResolvedValue([
      membership({
        kind: MembershipKind.OWNER,
        organizationMemberId: null,
        organizationMember: null,
        organization: organization({
          accessOverrides: [{ permissionCode: PERMISSIONS.EVENTS_CREATE }],
        }),
      }),
    ]);

    const context = await service.resolve(ACCOUNT_ID, {
      kind: 'ORGANIZATION',
      organizationId: ORGANIZATION_ID,
    });

    expect(context.capabilities).not.toContain(PERMISSIONS.EVENTS_CREATE);
    expect(context.capabilities).toContain(PERMISSIONS.EVENTS_READ);
  });

  it('gives an organization-only OWNER no personal participant scope', async () => {
    prisma.identity.findMany.mockResolvedValue([]);
    prisma.membership.findMany.mockResolvedValue([
      membership({
        kind: MembershipKind.OWNER,
        organizationMemberId: null,
        organizationMember: null,
      }),
    ]);

    const session = await service.getSession(ACCOUNT_ID);

    expect(session.personalScope).toEqual({
      kind: 'PERSONAL',
      availability: ScopeAvailabilityDto.DISABLED,
      userId: null,
    });
    expect(session.organizationScopes).toEqual([
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        availability: ScopeAvailabilityDto.ACTIVE,
      }),
    ]);
  });

  it('fails closed when a member role belongs to another organization', async () => {
    prisma.membership.findMany.mockResolvedValue([
      membership({
        organizationMember: member({
          role: {
            id: 'role-id',
            name: 'Editor',
            organizationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            permissions: [],
          },
        }),
      }),
    ]);

    await expect(
      service.resolve(ACCOUNT_ID, {
        kind: 'ORGANIZATION',
        organizationId: ORGANIZATION_ID,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SCOPE_UNAVAILABLE',
        availability: ScopeAvailabilityDto.RECONCILIATION_REQUIRED,
      }),
    });
  });

  it('fails closed when the account has duplicate memberships in one scope', async () => {
    prisma.membership.findMany.mockResolvedValue([
      membership({ id: 'membership-1' }),
      membership({ id: 'membership-2' }),
    ]);

    await expect(
      service.resolve(ACCOUNT_ID, {
        kind: 'ORGANIZATION',
        organizationId: ORGANIZATION_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('shows an archived scope only during the 90-day tombstone window', async () => {
    const archivedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    prisma.membership.findMany.mockResolvedValue([
      membership({
        organization: organization({ deletedAt: archivedAt }),
      }),
    ]);

    const session = await service.getSession(ACCOUNT_ID);
    expect(session.organizationScopes[0]).toMatchObject({
      availability: ScopeAvailabilityDto.ARCHIVED,
      capabilities: [],
      tombstoneUntil: expect.any(String),
    });

    prisma.membership.findMany.mockResolvedValue([
      membership({
        organization: organization({
          deletedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
        }),
      }),
    ]);
    await expect(service.getSession(ACCOUNT_ID)).resolves.toMatchObject({
      organizationScopes: [],
    });
  });

  it('keeps personal history scope active after staff revoke and organization archive', async () => {
    prisma.membership.findMany.mockResolvedValue([
      membership({
        updatedAt: new Date(),
        organizationMember: member({ deletedAt: new Date() }),
        organization: organization({ deletedAt: new Date() }),
      }),
    ]);

    const session = await service.getSession(ACCOUNT_ID);

    expect(session.personalScope).toMatchObject({
      availability: ScopeAvailabilityDto.ACTIVE,
      userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    });
    expect(session.organizationScopes[0]).toMatchObject({
      availability: ScopeAvailabilityDto.ARCHIVED,
      capabilities: [],
    });
  });

  it('lets the owning account hide a former scope without deleting it', async () => {
    prisma.membership.updateMany.mockResolvedValue({ count: 1 });

    await service.hideFormerScope(ACCOUNT_ID, 'membership-id');

    expect(prisma.membership.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'membership-id',
        accountId: ACCOUNT_ID,
      }),
      data: { hiddenAt: expect.any(Date) },
    });
  });
});

function organization(overrides: Record<string, unknown> = {}) {
  return {
    id: ORGANIZATION_ID,
    name: 'EventFlow Org',
    deletedAt: null,
    suspendedAt: null,
    accessOverrides: [],
    roles: [{ id: 'owner-role-id', name: 'Владелец' }],
    ...overrides,
  };
}

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-id',
    organizationId: ORGANIZATION_ID,
    deletedAt: null,
    status: MemberStatus.ACTIVE,
    role: {
      id: 'role-id',
      name: 'Editor',
      organizationId: ORGANIZATION_ID,
      permissions: [{ permission: { code: PERMISSIONS.EVENTS_READ } }],
    },
    permissions: [],
    hiddenAt: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-id',
    accountId: ACCOUNT_ID,
    organizationId: ORGANIZATION_ID,
    organizationMemberId: 'member-id',
    kind: MembershipKind.MEMBER,
    roleName: 'Editor',
    permissions: [],
    organization: organization(),
    organizationMember: member(),
    ...overrides,
  };
}
