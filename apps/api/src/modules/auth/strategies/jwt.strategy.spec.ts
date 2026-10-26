import { ConfigService } from '@nestjs/config';
import { MemberStatus, UserType } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import { AccessMaskService } from '../../access-mask/access-mask.service';
import { IamService } from '../../iam/iam.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy v1 live authorization adapter', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    organizationMember: { findUnique: jest.fn() },
    superAdmin: { findUnique: jest.fn() },
  };
  const iam = { resolveSessionContext: jest.fn() };
  const accessMask = { getDeniedCodes: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('unit-test-secret') };
  const strategy = new JwtStrategy(
    config as unknown as ConfigService,
    prisma as unknown as PrismaService,
    iam as unknown as IamService,
    accessMask as unknown as AccessMaskService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    iam.resolveSessionContext.mockResolvedValue({
      accountId: 'account-id',
      actorKind: 'ORGANIZATION',
      activeWorkspaceId: 'org-id',
      platformRole: null,
      currentAccount: {},
      activeWorkspace: {},
      memberships: [],
    });
    accessMask.getDeniedCodes.mockResolvedValue(new Set());
  });

  it('rejects an archived organization for an old v1 token', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-id',
      deletedAt: new Date(),
      suspendedAt: null,
    });

    await expect(
      strategy.validate({
        sub: 'org-id',
        type: UserType.ORGANIZATION,
        email: 'owner@example.com',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a suspended member even with a spoofed client version claim', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      id: 'member-id',
      organizationId: 'org-id',
      deletedAt: null,
      status: MemberStatus.SUSPENDED,
      organization: { deletedAt: null, suspendedAt: null },
      role: { permissions: [] },
      permissions: [],
    });

    await expect(
      strategy.validate({
        sub: 'member-id',
        type: UserType.MEMBER,
        email: 'member@example.com',
        clientVersion: 'v0-bypass-attempt',
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(iam.resolveSessionContext).not.toHaveBeenCalled();
  });

  it('rechecks an active member and applies the live deny mask', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      id: 'member-id',
      organizationId: 'org-id',
      deletedAt: null,
      status: MemberStatus.ACTIVE,
      organization: { deletedAt: null, suspendedAt: null },
      role: {
        permissions: [
          { permission: { code: 'events.read' } },
          { permission: { code: 'events.create' } },
        ],
      },
      permissions: [],
    });
    accessMask.getDeniedCodes.mockResolvedValue(new Set(['events.create']));

    await expect(
      strategy.validate({
        sub: 'member-id',
        type: UserType.MEMBER,
        email: 'member@example.com',
      }),
    ).resolves.toMatchObject({
      permissions: ['events.read'],
      accessDeniedPermissions: ['events.create'],
    });
  });
});
