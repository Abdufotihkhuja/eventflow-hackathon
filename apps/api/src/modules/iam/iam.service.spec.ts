import {
  ActorKind,
  AuthProvider,
  MembershipKind,
  OrganizationVerificationStatus,
  PlatformRole,
  UserType,
} from '@prisma/client';

import { IamService } from './iam.service';
import { ACCOUNT_RESOLUTION_CODES } from '../../common/constants/account-resolution.constant';

describe('IamService', () => {
  const createPrismaMock = () => ({
    user: {
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
    },
    superAdmin: {
      findUnique: jest.fn(),
    },
    identity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    account: {
      create: jest.fn(),
      update: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    platformAdminGrant: {
      upsert: jest.fn(),
    },
  });

  it('builds account-centric session context for organizations', async () => {
    const prisma = createPrismaMock();
    const organization = {
      id: 'org-1',
      email: 'org@example.com',
      name: 'EventFlow Org',
      companyName: 'EventFlow LLC',
      logoUrl: '/uploads/logo.png',
      phone: '+998900000000',
      authProvider: AuthProvider.EMAIL,
      providerId: null,
      passwordHash: 'hash',
      verificationStatus: OrganizationVerificationStatus.APPROVED,
      deletedAt: null,
    };
    const account = {
      id: 'acc-1',
      email: organization.email,
      firstName: null,
      lastName: null,
      displayName: organization.name,
      avatarUrl: organization.logoUrl,
      phone: organization.phone,
    };

    prisma.organization.findUnique.mockResolvedValue(organization);
    prisma.identity.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue(account);
    prisma.membership.upsert.mockResolvedValue({});
    prisma.membership.findMany.mockResolvedValue([
      {
        id: 'membership-1',
        kind: MembershipKind.OWNER,
        roleName: 'OWNER',
        permissions: [],
        organizationMemberId: null,
        createdAt: new Date(),
        organization,
      },
    ]);

    const service = new IamService(prisma as never);
    const context = await service.resolveSessionContextForLogin({
      actorId: organization.id,
      actorType: UserType.ORGANIZATION,
    });

    expect(context.accountId).toBe(account.id);
    expect(context.actorKind).toBe(ActorKind.ORGANIZATION);
    expect(context.activeWorkspaceId).toBe(organization.id);
    expect(context.activeWorkspace).toEqual({
      id: organization.id,
      name: organization.name,
      companyName: organization.companyName,
      email: organization.email,
      logoUrl: organization.logoUrl,
      verificationStatus: organization.verificationStatus,
    });
    expect(context.memberships).toHaveLength(1);
    expect(prisma.membership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          accountId: account.id,
          organizationId: organization.id,
          kind: MembershipKind.OWNER,
        }),
      }),
    );
  });

  it('builds platform-admin session context for super admins', async () => {
    const prisma = createPrismaMock();
    const admin = {
      id: 'sa-1',
      email: 'admin@example.com',
      name: 'Platform Admin',
      passwordHash: 'hash',
      deletedAt: null,
    };
    const account = {
      id: 'acc-2',
      email: admin.email,
      firstName: null,
      lastName: null,
      displayName: admin.name,
      avatarUrl: null,
      phone: null,
    };

    prisma.superAdmin.findUnique.mockResolvedValue(admin);
    prisma.identity.findUnique.mockResolvedValue(null);
    prisma.account.create.mockResolvedValue(account);
    prisma.platformAdminGrant.upsert.mockResolvedValue({});
    prisma.membership.findMany.mockResolvedValue([]);

    const service = new IamService(prisma as never);
    const context = await service.resolveSessionContextForLogin({
      actorId: admin.id,
      actorType: UserType.SUPER_ADMIN,
    });

    expect(context.accountId).toBe(account.id);
    expect(context.actorKind).toBe(ActorKind.SUPER_ADMIN);
    expect(context.platformRole).toBe(PlatformRole.SUPER_ADMIN);
    expect(context.activeWorkspace).toBeNull();
    expect(context.memberships).toEqual([]);
    expect(prisma.platformAdminGrant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          accountId: account.id,
          superAdminId: admin.id,
          role: PlatformRole.SUPER_ADMIN,
        }),
      }),
    );
  });

  it('resolves actor identity from an account-owned session', async () => {
    const prisma = createPrismaMock();
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      firstName: 'Event',
      lastName: 'Flow',
      avatarUrl: null,
      phone: null,
      location: null,
      bio: null,
      authProvider: AuthProvider.EMAIL,
      providerId: null,
      isEmailVerified: true,
      isPublicProfile: true,
      showEmail: false,
      showPhone: false,
      isOnboardingCompleted: false,
      gender: null,
      dateOfBirth: null,
      region: null,
      languages: [],
      profileStatus: null,
      workOrStudyPlace: null,
      skills: [],
      specialization: null,
      shortBio: null,
      profileInfoCompleted: false,
      linkedinUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      websiteUrl: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.identity.findMany.mockResolvedValue([
      {
        id: 'identity-1',
        accountId: 'acc-1',
        actorType: UserType.USER,
        actorId: user.id,
      },
    ]);
    prisma.user.findUnique.mockResolvedValue(user);

    const service = new IamService(prisma as never);
    const actor = await service.resolveActorIdentityForAccount({
      accountId: 'acc-1',
      actorType: UserType.USER,
    });

    expect(prisma.identity.findMany).toHaveBeenCalledWith({
      where: {
        accountId: 'acc-1',
        actorType: UserType.USER,
      },
      orderBy: { id: 'asc' },
      take: 2,
    });
    expect(actor).toEqual({ type: UserType.USER, actor: user });
  });

  it('fails closed when an account has no identity for the requested actor type', async () => {
    const prisma = createPrismaMock();
    prisma.identity.findMany.mockResolvedValue([]);
    const service = new IamService(prisma as never);

    await expect(
      service.resolveActorIdentityForAccount({
        accountId: 'acc-1',
        actorType: UserType.USER,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ACCOUNT_RESOLUTION_CODES.IDENTITY_NOT_FOUND,
      }),
    });
  });

  it('fails closed instead of choosing an arbitrary identity', async () => {
    const prisma = createPrismaMock();
    prisma.identity.findMany.mockResolvedValue([
      { id: 'identity-1', actorId: 'user-1' },
      { id: 'identity-2', actorId: 'user-2' },
    ]);
    const service = new IamService(prisma as never);

    await expect(
      service.resolveActorIdentityForAccount({
        accountId: 'acc-1',
        actorType: UserType.USER,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ACCOUNT_RESOLUTION_CODES.RECONCILIATION_REQUIRED,
      }),
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('fails closed when Identity points to a missing legacy actor', async () => {
    const prisma = createPrismaMock();
    prisma.identity.findMany.mockResolvedValue([
      { id: 'identity-1', actorId: 'missing-user' },
    ]);
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new IamService(prisma as never);

    await expect(
      service.resolveActorIdentityForAccount({
        accountId: 'acc-1',
        actorType: UserType.USER,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ACCOUNT_RESOLUTION_CODES.IDENTITY_ORPHANED,
      }),
    });
  });
});
