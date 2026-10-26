import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider, InviteStatus, MemberStatus } from '@prisma/client';
import { InvitesService } from './invites.service';
import { INVITE_CODES, InviteNextAction } from './invites.constants';

const ROLE = { id: 'role-1', name: 'Менеджер' };
const ORG = { id: 'org-1', name: 'EventFlow Org', email: 'org@example.com' };

function buildInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invite-1',
    organizationId: ORG.id,
    email: 'jane@example.com',
    userId: null,
    roleId: ROLE.id,
    status: InviteStatus.PENDING,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    firstName: 'Jane',
    lastName: 'Doe',
    position: null,
    department: null,
    acceptedAt: null,
    acceptedByUserId: null,
    acceptedMemberId: null,
    revokedAt: null,
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: ORG,
    role: ROLE,
    ...overrides,
  };
}

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Jane',
    lastName: 'Doe',
    avatarUrl: null,
    phone: null,
    authProvider: AuthProvider.EMAIL,
    providerId: null,
    deletedAt: null,
    ...overrides,
  };
}

function setup() {
  const prisma = {
    $transaction: jest.fn(),
    organizationRole: {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({
        ...ROLE,
        organizationId: ORG.id,
        permissions: [],
      }),
    },
    organization: {
      findUnique: jest.fn(),
      // account-existence / auth-method lookups default to "nothing found"
      findFirst: jest.fn().mockResolvedValue(null),
    },
    organizationMember: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findFirst: jest.fn(), create: jest.fn() },
    account: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    organizationInvite: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue(buildInvite()),
    },
    notificationDelivery: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    identity: { upsert: jest.fn() },
    membership: { upsert: jest.fn() },
  };
  prisma.$transaction.mockImplementation(
    async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );
  const invitesRepository = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    findById: jest.fn(),
    listPendingForEmail: jest.fn().mockResolvedValue([]),
    findPending: jest.fn(),
    listForOrganization: jest.fn(),
    // Default to resolved promises: several paths chain `.catch()` on these.
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    expireStalePending: jest.fn().mockResolvedValue(undefined),
    claimPending: jest.fn(
      (tx: typeof prisma, inviteId: string, acceptedAt: Date) =>
        tx.organizationInvite.updateMany({
          where: {
            id: inviteId,
            status: InviteStatus.PENDING,
            expiresAt: { gt: acceptedAt },
          },
          data: { status: InviteStatus.ACCEPTED },
        }),
    ),
    completeAcceptance: jest.fn(
      (tx: typeof prisma, inviteId: string, data: Record<string, unknown>) =>
        tx.organizationInvite.update({ where: { id: inviteId }, data }),
    ),
  };
  const mailService = {
    sendMemberInviteDeclinedNotification: jest.fn().mockResolvedValue(undefined),
    buildOrganizationInviteMail: jest.fn().mockReturnValue({
      subject: 'Invite',
      template: 'member-invitation',
      context: { activationUrl: 'http://app/invite/accept?token=raw' },
    }),
  };
  const enqueue = jest.fn().mockResolvedValue(undefined);
  const notificationDispatcher = {
    dispatchNow: jest.fn().mockResolvedValue({
      created: [{ id: 'delivery-1' }],
      deduplicated: 0,
      suppressed: 0,
      enqueue,
    }),
  };
  const iamService = {
    ensureAccountForUser: jest.fn().mockResolvedValue('account-1'),
    linkMemberToAccount: jest.fn().mockResolvedValue(undefined),
  };

  const notifications = { emit: jest.fn().mockResolvedValue(undefined) };
  const service = new InvitesService(
    invitesRepository as never,
    prisma as never,
    mailService as never,
    iamService as never,
    { assertSeatAvailable: jest.fn().mockResolvedValue(undefined) } as never, // SeatLimitService (E-4)
    notifications as never, // NotificationsService
    notificationDispatcher as never,
  );
  return {
    service,
    prisma,
    invitesRepository,
    mailService,
    iamService,
    notifications,
    notificationDispatcher,
    enqueue,
  };
}

describe('InvitesService.createInvite', () => {
  it('creates an invite for an existing public user without a password and sends the existing-user email', async () => {
    const {
      service,
      prisma,
      invitesRepository,
      mailService,
      notificationDispatcher,
      enqueue,
    } = setup();
    prisma.organizationRole.findFirst.mockResolvedValue(ROLE);
    prisma.organization.findUnique.mockResolvedValue(ORG);
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    invitesRepository.findPending.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(buildUser());
    invitesRepository.create.mockResolvedValue(buildInvite());

    const result = await service.createInvite(ORG.id, {
      email: 'Jane@Example.com',
      roleId: ROLE.id,
    });

    expect(result.userExists).toBe(true);
    // email normalized
    expect(
      (invitesRepository.create.mock.calls[0][0] as { email: string }).email,
    ).toBe('jane@example.com');
    expect(notificationDispatcher.dispatchNow).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogId: 'ORG-INVITE',
        organizationId: ORG.id,
        channels: ['email'],
        recipients: [
          expect.objectContaining({
            accountId: null,
            email: 'jane@example.com',
          }),
        ],
      }),
      expect.anything(),
    );
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(invitesRepository.create.mock.calls[0][1]).toBe(prisma);
    const rawToken = mailService.buildOrganizationInviteMail.mock.calls[0][0]
      .rawToken as string;
    const outboxIntent = notificationDispatcher.dispatchNow.mock
      .calls[0][0] as {
      dedupKey: string;
    };
    expect(outboxIntent.dedupKey).not.toContain(rawToken);
  });

  it('rolls invite and outbox creation through the same transaction boundary', async () => {
    const {
      service,
      prisma,
      invitesRepository,
      notificationDispatcher,
      enqueue,
    } = setup();
    prisma.organizationRole.findFirst.mockResolvedValue(ROLE);
    prisma.organization.findUnique.mockResolvedValue(ORG);
    invitesRepository.findPending.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(buildUser());
    invitesRepository.create.mockResolvedValue(buildInvite());
    notificationDispatcher.dispatchNow.mockRejectedValue(
      new Error('outbox insert failed'),
    );

    await expect(
      service.createInvite(ORG.id, {
        email: 'jane@example.com',
        roleId: ROLE.id,
      }),
    ).rejects.toThrow('outbox insert failed');

    expect(invitesRepository.create.mock.calls[0][1]).toBe(prisma);
    expect(notificationDispatcher.dispatchNow).toHaveBeenCalledWith(
      expect.objectContaining({ catalogId: 'ORG-INVITE' }),
      prisma,
    );
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('treats an organization-owner email (no User row) as existing — sends the sign-in email', async () => {
    const { service, prisma, invitesRepository, notificationDispatcher } =
      setup();
    prisma.organizationRole.findFirst.mockResolvedValue(ROLE);
    prisma.organization.findUnique.mockResolvedValue(ORG);
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    invitesRepository.findPending.mockResolvedValue(null);
    // No public User, but the email belongs to an organization account.
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.organization.findFirst.mockResolvedValue({
      id: 'org-owner',
      passwordHash: 'h',
      authProvider: 'EMAIL',
    });
    invitesRepository.create.mockResolvedValue(buildInvite());

    const result = await service.createInvite(ORG.id, {
      email: 'jane@example.com',
      roleId: ROLE.id,
    });

    expect(result.userExists).toBe(true);
    expect(notificationDispatcher.dispatchNow).toHaveBeenCalledWith(
      expect.objectContaining({
        email: expect.objectContaining({ template: 'member-invitation' }),
      }),
      expect.anything(),
    );
  });

  it('rejects inviting someone who is already an active member', async () => {
    const { service, prisma } = setup();
    prisma.organizationRole.findFirst.mockResolvedValue(ROLE);
    prisma.organization.findUnique.mockResolvedValue(ORG);
    prisma.organizationMember.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
    });

    await expect(
      service.createInvite(ORG.id, {
        email: 'jane@example.com',
        roleId: ROLE.id,
      }),
    ).rejects.toMatchObject({
      response: { code: INVITE_CODES.USER_ALREADY_ORGANIZATION_MEMBER },
    });
  });

  it('does not create a duplicate pending invite', async () => {
    const { service, prisma, invitesRepository } = setup();
    prisma.organizationRole.findFirst.mockResolvedValue(ROLE);
    prisma.organization.findUnique.mockResolvedValue(ORG);
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    invitesRepository.findPending.mockResolvedValue(buildInvite());

    await expect(
      service.createInvite(ORG.id, {
        email: 'jane@example.com',
        roleId: ROLE.id,
      }),
    ).rejects.toMatchObject({
      response: { code: INVITE_CODES.PENDING_INVITE_ALREADY_EXISTS },
    });
    expect(invitesRepository.create).not.toHaveBeenCalled();
  });
});

describe('InvitesService.inspectInvite', () => {
  it('returns LOGIN_TO_ACCEPT for an unauthenticated existing user', async () => {
    const { service, invitesRepository, prisma } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(buildUser());

    const result = await service.inspectInvite('raw-token');
    expect(result.userExists).toBe(true);
    expect(result.authMethods).toContain('password');
    expect(result.currentUserMatch).toBeNull();
    expect(result.nextAction).toBe(InviteNextAction.LOGIN_TO_ACCEPT);
  });

  it('returns SIGNUP_TO_ACCEPT for an unauthenticated new email', async () => {
    const { service, invitesRepository, prisma } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await service.inspectInvite('raw-token');
    expect(result.userExists).toBe(false);
    expect(result.nextAction).toBe(InviteNextAction.SIGNUP_TO_ACCEPT);
  });

  it('returns WRONG_ACCOUNT when the viewer email differs', async () => {
    const { service, invitesRepository, prisma } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(buildUser());

    const result = await service.inspectInvite('raw-token', {
      email: 'someone-else@example.com',
    });
    expect(result.currentUserMatch).toBe(false);
    expect(result.nextAction).toBe(InviteNextAction.WRONG_ACCOUNT);
  });
});

describe('InvitesService.acceptInvite', () => {
  it('lets an authenticated existing user accept without a password and links membership', async () => {
    const { service, prisma, invitesRepository, iamService } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(buildUser());
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    prisma.organizationMember.create.mockResolvedValue({
      id: 'member-9',
      organizationId: ORG.id,
      email: 'jane@example.com',
    });
    prisma.organizationRole.findUnique.mockResolvedValue({
      ...ROLE,
      permissions: [{ permission: { code: 'MEMBERS_READ' } }],
    });
    invitesRepository.update.mockResolvedValue(buildInvite());

    const result = await service.acceptInvite('raw-token', {
      // Authenticated viewer carries their unified account id.
      viewer: {
        email: 'jane@example.com',
        accountId: 'acc-viewer',
        userId: 'user-1',
      },
    });

    // Existing account → no new User, no ensureAccountForUser; membership links
    // to the viewer's own account.
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(iamService.ensureAccountForUser).not.toHaveBeenCalled();
    expect(iamService.linkMemberToAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'acc-viewer',
        permissions: ['MEMBERS_READ'],
      }),
      expect.anything(),
    );
    expect(result.code).toBe(INVITE_CODES.MEMBERSHIP_CREATED);
    expect(result.requiresLogin).toBe(false);
  });

  it("uses the account's real name for the staff profile, overwriting the invite placeholder", async () => {
    const { service, prisma, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(
      buildInvite({ firstName: 'Placeholder', lastName: 'Typo' }),
    );
    prisma.account.findUnique.mockResolvedValue({
      firstName: 'Realname',
      lastName: 'Surname',
    });
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    prisma.organizationMember.create.mockResolvedValue({
      id: 'member-x',
      organizationId: ORG.id,
      email: 'jane@example.com',
    });
    prisma.organizationRole.findUnique.mockResolvedValue({
      ...ROLE,
      permissions: [],
    });
    invitesRepository.update.mockResolvedValue(buildInvite());

    await service.acceptInvite('raw-token', {
      viewer: {
        email: 'jane@example.com',
        accountId: 'acc-real',
        userId: 'u1',
      },
    });

    const created = prisma.organizationMember.create.mock.calls[0][0] as {
      data: { firstName: string; lastName: string };
    };
    expect(created.data.firstName).toBe('Realname');
    expect(created.data.lastName).toBe('Surname');
  });

  it('joins an authenticated non-User account (e.g. an organization owner) without creating a User', async () => {
    const { service, prisma, invitesRepository, iamService } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    // No public User row for this email — it belongs to an organization owner.
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    prisma.organizationMember.create.mockResolvedValue({
      id: 'member-org',
      organizationId: ORG.id,
      email: 'jane@example.com',
    });
    prisma.organizationRole.findUnique.mockResolvedValue({
      ...ROLE,
      permissions: [],
    });
    invitesRepository.update.mockResolvedValue(buildInvite());

    const result = await service.acceptInvite('raw-token', {
      viewer: { email: 'jane@example.com', accountId: 'org-account' },
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(iamService.linkMemberToAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'org-account' }),
      expect.anything(),
    );
    expect(result.code).toBe(INVITE_CODES.MEMBERSHIP_CREATED);
  });

  it('requires authentication when the existing user is not logged in', async () => {
    const { service, prisma, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(buildUser());

    await expect(service.acceptInvite('raw-token', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('requires a password for a brand-new user', async () => {
    const { service, prisma, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.acceptInvite('raw-token', {})).rejects.toMatchObject({
      response: { code: INVITE_CODES.PASSWORD_REQUIRED_FOR_NEW_ACCOUNT },
    });
  });

  it('creates an account for a new user who provides a password', async () => {
    const { service, prisma, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(buildUser({ id: 'user-new' }));
    prisma.organizationMember.findFirst.mockResolvedValue(null);
    prisma.organizationMember.create.mockResolvedValue({
      id: 'member-new',
      organizationId: ORG.id,
      email: 'jane@example.com',
    });
    prisma.organizationRole.findUnique.mockResolvedValue({
      ...ROLE,
      permissions: [],
    });
    invitesRepository.update.mockResolvedValue(buildInvite());

    const result = await service.acceptInvite('raw-token', {
      password: 'StrongPass1!',
    });

    expect(prisma.user.create).toHaveBeenCalled();
    expect(result.requiresLogin).toBe(true);
    expect(result.code).toBe(INVITE_CODES.MEMBERSHIP_CREATED);
  });

  it('blocks accepting while logged in as a different account', async () => {
    const { service, prisma, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.user.findFirst.mockResolvedValue(buildUser());

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'intruder@example.com' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an expired invite', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(
      buildInvite({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'jane@example.com' },
      }),
    ).rejects.toMatchObject({
      response: { code: INVITE_CODES.INVITE_EXPIRED },
    });
  });

  it('rejects an already-accepted invite', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(
      buildInvite({ status: InviteStatus.ACCEPTED }),
    );

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'jane@example.com' },
      }),
    ).rejects.toMatchObject({
      response: { code: INVITE_CODES.INVITE_ALREADY_ACCEPTED },
    });
  });

  it('rejects a revoked invite', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(
      buildInvite({ status: InviteStatus.REVOKED }),
    );

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'jane@example.com' },
      }),
    ).rejects.toMatchObject({
      response: { code: INVITE_CODES.INVITE_REVOKED },
    });
  });

  it('rejects acceptance while the organization is archived or suspended', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(
      buildInvite({
        organization: { ...ORG, suspendedAt: new Date(), deletedAt: null },
      }),
    );

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'jane@example.com', accountId: 'account-1' },
      }),
    ).rejects.toMatchObject({
      response: { code: 'INVITE_ORGANIZATION_UNAVAILABLE' },
    });
  });

  it('allows only one CAS winner for parallel acceptance', async () => {
    const { service, prisma, invitesRepository, iamService } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.organizationInvite.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'jane@example.com', accountId: 'account-1' },
      }),
    ).rejects.toMatchObject({
      response: { code: INVITE_CODES.INVITE_ALREADY_ACCEPTED },
    });
    expect(iamService.linkMemberToAccount).not.toHaveBeenCalled();
  });

  it('keeps acceptance writes inside one serializable transaction', async () => {
    const { service, prisma, invitesRepository, iamService } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.organizationMember.create.mockResolvedValue({
      id: 'member-transaction',
      organizationId: ORG.id,
      roleId: ROLE.id,
      email: 'jane@example.com',
    });
    iamService.linkMemberToAccount.mockRejectedValue(
      new Error('projection failed'),
    );

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'jane@example.com', accountId: 'account-1' },
      }),
    ).rejects.toThrow('projection failed');
    expect(prisma.organizationInvite.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('maps a same-organization member collision to a stable conflict', async () => {
    const { service, prisma, invitesRepository } = setup();
    invitesRepository.findByTokenHash.mockResolvedValue(buildInvite());
    prisma.organizationMember.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.acceptInvite('raw-token', {
        viewer: { email: 'jane@example.com', accountId: 'account-1' },
      }),
    ).rejects.toMatchObject({
      response: { code: INVITE_CODES.USER_ALREADY_ORGANIZATION_MEMBER },
    });
  });

  it('allows exactly one winner when two different invites target the same account/org tuple', async () => {
    const { service, prisma, invitesRepository, iamService } = setup();
    invitesRepository.findByTokenHash
      .mockResolvedValueOnce(buildInvite({ id: 'invite-a' }))
      .mockResolvedValueOnce(buildInvite({ id: 'invite-b' }));
    prisma.organizationMember.create
      .mockResolvedValueOnce({
        id: 'member-a',
        organizationId: ORG.id,
        email: 'jane@example.com',
      })
      .mockResolvedValueOnce({
        id: 'member-b',
        organizationId: ORG.id,
        email: 'jane@example.com',
      });
    iamService.linkMemberToAccount
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ code: 'P2002' });

    const outcomes = await Promise.allSettled([
      service.acceptInvite('raw-token-a', {
        viewer: { email: 'jane@example.com', accountId: 'same-account' },
      }),
      service.acceptInvite('raw-token-b', {
        viewer: { email: 'jane@example.com', accountId: 'same-account' },
      }),
    ]);

    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = outcomes.find(
      (outcome): outcome is PromiseRejectedResult =>
        outcome.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({
      response: { code: INVITE_CODES.USER_ALREADY_ORGANIZATION_MEMBER },
    });
  });
});


describe('InvitesService: приглашения в кабинете приглашённого', () => {
  const viewer = {
    email: 'Jane@Example.com',
    accountId: 'account-1',
    userId: 'user-1',
  };

  it('отдаёт живые приглашения по email пользователя', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.listPendingForEmail.mockResolvedValue([buildInvite()]);

    const invites = await service.listMyInvites(viewer);

    // Email нормализуется: приглашения хранятся в нижнем регистре.
    expect(invitesRepository.listPendingForEmail).toHaveBeenCalledWith(
      'jane@example.com',
    );
    expect(invites).toEqual([
      expect.objectContaining({
        id: 'invite-1',
        organizationId: ORG.id,
        organizationName: ORG.name,
        role: ROLE,
      }),
    ]);
  });

  it('скрывает приглашения удалённой или приостановленной организации', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.listPendingForEmail.mockResolvedValue([
      buildInvite({ organization: { ...ORG, suspendedAt: new Date() } }),
      buildInvite({
        id: 'invite-2',
        organization: { ...ORG, deletedAt: new Date() },
      }),
    ]);

    await expect(service.listMyInvites(viewer)).resolves.toEqual([]);
  });

  it('не даёт принять приглашение, оформленное на другой email', async () => {
    const { service, invitesRepository, prisma } = setup();
    invitesRepository.findById.mockResolvedValue(
      buildInvite({ email: 'someone-else@example.com' }),
    );

    await expect(service.acceptMyInvite('invite-1', viewer)).rejects.toThrow(
      /Приглашение не найдено/,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('отказ помечает приглашение DECLINED и сохраняет комментарий', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findById.mockResolvedValue(buildInvite());

    await service.declineMyInvite('invite-1', viewer, '  Сейчас не могу  ');

    expect(invitesRepository.update).toHaveBeenCalledWith(
      'invite-1',
      expect.objectContaining({
        status: InviteStatus.DECLINED,
        declineReason: 'Сейчас не могу',
        declinedAt: expect.any(Date),
      }),
    );
  });

  it('уведомляет организацию об отказе и передаёт причину', async () => {
    const { service, invitesRepository, notifications } = setup();
    invitesRepository.findById.mockResolvedValue(buildInvite());

    await service.declineMyInvite('invite-1', viewer, 'Сейчас не могу');

    expect(notifications.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG.id,
        type: 'MEMBER_INVITE_DECLINED',
        entityType: 'invite',
        entityId: 'invite-1',
        payload: expect.objectContaining({
          personName: 'Jane Doe',
          roleName: ROLE.name,
          reason: 'Сейчас не могу',
        }),
      }),
    );
  });

  it('без комментария уведомление уходит без поля reason', async () => {
    const { service, invitesRepository, notifications } = setup();
    invitesRepository.findById.mockResolvedValue(buildInvite());

    await service.declineMyInvite('invite-1', viewer);

    const payload = (
      notifications.emit.mock.calls[0][0] as { payload: Record<string, unknown> }
    ).payload;
    expect(payload).not.toHaveProperty('reason');
  });

  it('шлёт организатору письмо об отказе с причиной', async () => {
    const { service, invitesRepository, mailService } = setup();
    invitesRepository.findById.mockResolvedValue(buildInvite());

    await service.declineMyInvite('invite-1', viewer, 'Сейчас не могу');

    expect(mailService.sendMemberInviteDeclinedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationEmail: ORG.email,
        organizationName: ORG.name,
        inviteId: 'invite-1',
        personName: 'Jane Doe',
        roleName: ROLE.name,
        reason: 'Сейчас не могу',
      }),
    );
  });

  it('падение почты не ломает уже сохранённый отказ', async () => {
    const { service, invitesRepository, mailService } = setup();
    invitesRepository.findById.mockResolvedValue(buildInvite());
    mailService.sendMemberInviteDeclinedNotification.mockRejectedValue(
      new Error('smtp down'),
    );

    await expect(
      service.declineMyInvite('invite-1', viewer),
    ).resolves.toBeUndefined();
    expect(invitesRepository.update).toHaveBeenCalled();
  });

  it('без email организации письмо не отправляется', async () => {
    const { service, invitesRepository, mailService } = setup();
    invitesRepository.findById.mockResolvedValue(
      buildInvite({ organization: { ...ORG, email: null } }),
    );

    await service.declineMyInvite('invite-1', viewer);

    expect(
      mailService.sendMemberInviteDeclinedNotification,
    ).not.toHaveBeenCalled();
  });

  it('пустой комментарий к отказу не сохраняется', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findById.mockResolvedValue(buildInvite());

    await service.declineMyInvite('invite-1', viewer, '   ');

    expect(invitesRepository.update).toHaveBeenCalledWith(
      'invite-1',
      expect.objectContaining({ declineReason: null }),
    );
  });

  it('нельзя отказаться от чужого приглашения', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findById.mockResolvedValue(
      buildInvite({ email: 'someone-else@example.com' }),
    );

    await expect(
      service.declineMyInvite('invite-1', viewer),
    ).rejects.toThrow(/Приглашение не найдено/);
    expect(invitesRepository.update).not.toHaveBeenCalled();
  });

  it('нельзя отказаться от уже принятого приглашения', async () => {
    const { service, invitesRepository } = setup();
    invitesRepository.findById.mockResolvedValue(
      buildInvite({ status: InviteStatus.ACCEPTED }),
    );

    await expect(
      service.declineMyInvite('invite-1', viewer),
    ).rejects.toThrow(/уже недоступно/);
    expect(invitesRepository.update).not.toHaveBeenCalled();
  });

  it('принимает своё приглашение по id и создаёт членство', async () => {
    const { service, invitesRepository, prisma, iamService } = setup();
    invitesRepository.findById.mockResolvedValue(buildInvite());
    prisma.account.findUnique.mockResolvedValue({
      id: 'account-1',
      user: buildUser(),
      organizationMember: null,
    });
    prisma.organizationMember.create.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
    });

    const result = await service.acceptMyInvite('invite-1', viewer);

    expect(result).toEqual(
      expect.objectContaining({
        code: INVITE_CODES.MEMBERSHIP_CREATED,
        organizationId: ORG.id,
        organizationName: ORG.name,
        // Пользователь уже в сессии — повторный вход не нужен.
        requiresLogin: false,
      }),
    );
    expect(iamService.linkMemberToAccount).toHaveBeenCalled();
  });
});
