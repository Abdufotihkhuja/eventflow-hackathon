import { ForbiddenException } from '@nestjs/common';
import { MemberStatus, MembershipKind, UserType } from '@prisma/client';
import { MembersService } from './members.service';
import type { ICurrentUser } from '../../../common/interfaces';
import { POLICY_DENIALS } from '../../../common/constants/policy-denial.constant';

const now = new Date('2026-06-04T00:00:00.000Z');

function permission(id: string, code: string, category = 'events') {
  return {
    id,
    code,
    name: code,
    description: `${code} description`,
    category,
    createdAt: now,
  };
}

const rolePermission = permission('perm-role', 'events:read');
const individualPermission = permission(
  'perm-extra',
  'members:read',
  'members',
);

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    organizationId: 'org-1',
    email: 'member@example.com',
    roleId: 'role-1',
    firstName: 'Jane',
    lastName: 'Doe',
    role: {
      id: 'role-1',
      name: 'Менеджер событий',
      isSystem: true,
      permissions: [
        {
          roleId: 'role-1',
          permissionId: rolePermission.id,
          permission: rolePermission,
        },
      ],
    },
    permissions: [
      {
        memberId: 'member-1',
        permissionId: individualPermission.id,
        permission: individualPermission,
      },
    ],
    organization: {
      id: 'org-1',
      name: 'EventFlow',
      companyName: 'EventFlow LLC',
      logoUrl: null,
    },
    ...overrides,
  };
}

function actor(permissions: string[]): ICurrentUser {
  return {
    sub: 'actor-1',
    type: UserType.MEMBER,
    email: 'actor@example.com',
    organizationId: 'org-1',
    permissions,
  };
}

function setup() {
  const membersRepository = {
    findById: jest.fn().mockResolvedValue(member()),
    create: jest.fn(),
    updatePermissions: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(member()),
    findByIdWithOrganization: jest.fn().mockResolvedValue(member()),
  };
  const invitesService = {
    createInvite: jest.fn().mockResolvedValue({ id: 'invite-1' }),
  };
  const prisma = {
    permission: {
      findMany: jest.fn(
        ({ where }: { where?: { id?: { in?: string[] } } }) => {
          const ids = new Set(where?.id?.in ?? []);
          return Promise.resolve(
            [rolePermission, individualPermission].filter((item) =>
              ids.has(item.id),
            ),
          );
        },
      ),
    },
    organizationMember: {
      findUnique: jest.fn().mockResolvedValue(member()),
    },
    membership: {
      findFirst: jest.fn().mockResolvedValue({ kind: MembershipKind.MEMBER }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const service = new MembersService(
    membersRepository as never,
    prisma as never,
    {} as never,
    invitesService as never,
  );

  return { service, membersRepository, prisma, invitesService };
}

describe('MembersService creation policy', () => {
  const dto = {
    email: 'new-member@example.com',
    firstName: 'New',
    lastName: 'Member',
    roleId: 'role-1',
  };

  it('rejects direct ACTIVE member creation before repository writes', async () => {
    const { service, membersRepository, invitesService } = setup();
    const action = service.create('org-1', {
      ...dto,
      password: 'secure-password',
      sendInvitation: false,
    });

    await expect(action).rejects.toBeInstanceOf(ForbiddenException);
    await expect(action).rejects.toMatchObject({
      response: POLICY_DENIALS.ORGANIZATION_INVITATION_REQUIRED,
    });
    expect(membersRepository.create).not.toHaveBeenCalled();
    expect(invitesService.createInvite).not.toHaveBeenCalled();
  });

  it('keeps the legacy invite flag as an adapter to the invite flow', async () => {
    const { service, invitesService } = setup();

    await expect(
      service.create('org-1', { ...dto, sendInvitation: true }),
    ).resolves.toEqual({ id: 'invite-1' });
    expect(invitesService.createInvite).toHaveBeenCalledWith('org-1', {
      email: dto.email,
      roleId: dto.roleId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      position: undefined,
      department: undefined,
    });
  });
});

describe('MembersService permissions', () => {
  it('stores only individual permissions and syncs effective membership permissions', async () => {
    const { service, membersRepository, prisma } = setup();

    await service.updatePermissions(
      'org-1',
      'member-1',
      { permissionIds: [rolePermission.id, individualPermission.id] },
      actor([rolePermission.code, individualPermission.code]),
    );

    expect(membersRepository.updatePermissions).toHaveBeenCalledWith(
      'member-1',
      [individualPermission.id],
    );
    expect(prisma.membership.updateMany).toHaveBeenCalledWith({
      where: { organizationMemberId: 'member-1' },
      data: {
        roleId: 'role-1',
        roleName: 'Менеджер событий',
        permissions: [rolePermission.code, individualPermission.code],
      },
    });
  });

  it('rejects member actors assigning permissions they do not have', async () => {
    const { service, membersRepository } = setup();

    await expect(
      service.updatePermissions(
        'org-1',
        'member-1',
        { permissionIds: [individualPermission.id] },
        actor([rolePermission.code]),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(membersRepository.updatePermissions).not.toHaveBeenCalled();
  });

  it('returns role, individual, and effective permission catalogs for the current member', async () => {
    const { service } = setup();

    const result = await service.getMyPermissions('member-1');

    expect(result.role).toEqual({ id: 'role-1', name: 'Менеджер событий' });
    expect(result.rolePermissions).toEqual([rolePermission]);
    expect(result.individualPermissions).toEqual([individualPermission]);
    expect(result.allPermissions.map((item) => item.code)).toEqual([
      rolePermission.code,
      individualPermission.code,
    ]);
    expect(result.permissions).toEqual([
      rolePermission.code,
      individualPermission.code,
    ]);
    expect(result.permissionsByCategory).toEqual({
      events: [rolePermission.code],
      members: [individualPermission.code],
    });
  });
});

describe('MembersService protected owner lifecycle', () => {
  it.each([
    ['delete', (service: MembersService) => service.delete('org-1', 'member-1')],
    [
      'suspend',
      (service: MembersService) =>
        service.update('org-1', 'member-1', {
          status: MemberStatus.SUSPENDED,
        }),
    ],
    [
      'permission rewrite',
      (service: MembersService) =>
        service.updatePermissions('org-1', 'member-1', { permissionIds: [] }),
    ],
  ])('denies %s through ordinary member routes', async (_label, action) => {
    const { service, prisma, membersRepository } = setup();
    prisma.membership.findFirst.mockResolvedValue({
      kind: MembershipKind.OWNER,
    });

    await expect(action(service)).rejects.toMatchObject({
      response: POLICY_DENIALS.OWNER_LIFECYCLE_REQUIRES_TRANSFER,
    });
    expect(membersRepository.softDelete).not.toHaveBeenCalled();
    expect(membersRepository.updatePermissions).not.toHaveBeenCalled();
  });
});
