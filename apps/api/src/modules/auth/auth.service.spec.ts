import {
  ActorKind,
  AuthProvider,
  MembershipKind,
  Prisma,
  UserType,
} from '@prisma/client';

import { AuthService } from './auth.service';
describe('AuthService', () => {
  const createPrismaMock = () => {
    const prisma = {
      $transaction: jest.fn(),
      refreshToken: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'org-1',
            ...data,
            deletedAt: null,
          }),
        ),
        update: jest.fn(),
      },
      account: {
        create: jest.fn().mockResolvedValue({ id: 'account-org-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      permission: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'permission-1', code: 'events.read' }]),
      },
      organizationRole: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: `role-${data.name}`, ...data }),
          ),
      },
      rolePermission: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      membership: {
        create: jest.fn().mockResolvedValue({ id: 'membership-owner-1' }),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    return prisma;
  };

  const createService = (prisma = createPrismaMock()) => {
    const jwtService = {
      sign: jest.fn().mockReturnValue('access-token'),
    };
    const configService = {
      get: jest.fn().mockReturnValue('7d'),
    };
    const verificationService = {
      sendVerificationCode: jest.fn(),
    };
    const mailService = {
      sendEmailVerificationCode: jest.fn(),
    };
    const iamService = {
      resolveSessionContextForLogin: jest.fn().mockResolvedValue({
        accountId: 'acc-1',
        actorKind: ActorKind.USER,
        currentAccount: {
          id: 'acc-1',
          email: 'user@example.com',
        },
        activeWorkspace: null,
        memberships: [],
      }),
      resolveActorIdentityForAccount: jest.fn(),
    };

    return {
      prisma,
      iamService,
      verificationService,
      mailService,
      service: new AuthService(
        prisma as never,
        jwtService as never,
        configService as never,
        verificationService as never,
        mailService as never,
        iamService as never,
      ),
    };
  };

  it('registers an organization as ORGANIZATION identity + OWNER without creating a User', async () => {
    const prisma = createPrismaMock();
    const { service, verificationService, mailService } = createService(prisma);
    verificationService.sendVerificationCode.mockResolvedValue('123456');

    await expect(
      service.registerOrganization({
        email: ' OWNER@example.com ',
        password: 'Secure-password1!',
        passwordConfirm: 'Secure-password1!',
        organizationName: 'Acme Events',
      }),
    ).resolves.toEqual({
      message: expect.stringContaining('Регистрация прошла успешно'),
      emailVerificationRequired: true,
    });

    expect(prisma.organization.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@example.com',
        name: 'Acme Events',
        authProvider: AuthProvider.EMAIL,
      }),
    });
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@example.com',
        identities: {
          create: expect.objectContaining({
            actorType: UserType.ORGANIZATION,
            actorId: 'org-1',
          }),
        },
      }),
    });
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: 'account-org-1',
        organizationId: 'org-1',
        kind: MembershipKind.OWNER,
        roleName: 'OWNER',
      }),
    });
    expect(prisma.user).not.toHaveProperty('create');
    expect(verificationService.sendVerificationCode).toHaveBeenCalledWith(
      'owner@example.com',
      expect.any(String),
      'org-1',
    );
    expect(mailService.sendEmailVerificationCode).toHaveBeenCalled();
  });

  it.each([
    ['Google', 'handleGoogleOrgAuth', AuthProvider.GOOGLE],
    ['LinkedIn', 'handleLinkedInOrgAuth', AuthProvider.LINKEDIN],
  ] as const)(
    'creates a separate %s organization owner without a personal identity',
    async (_provider, method, authProvider) => {
      const prisma = createPrismaMock();
      const { service, iamService } = createService(prisma);
      iamService.resolveSessionContextForLogin.mockResolvedValue({
        accountId: 'account-org-1',
        actorKind: ActorKind.ORGANIZATION,
        currentAccount: { id: 'account-org-1', email: 'owner@example.com' },
        activeWorkspace: { id: 'org-1' },
        memberships: [],
      });

      await service[method]({
        email: 'owner@example.com',
        name: 'Acme Events',
        providerId: 'provider-id',
      });

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ authProvider }),
      });
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identities: {
            create: expect.objectContaining({
              actorType: UserType.ORGANIZATION,
            }),
          },
        }),
      });
    },
  );

  it('loads sessions by account ownership', async () => {
    const prisma = createPrismaMock();
    prisma.refreshToken.findMany.mockResolvedValue([]);

    const { service } = createService(prisma);

    await service.getSessions({
      sub: 'user-1',
      type: UserType.USER,
      email: 'user@example.com',
      accountId: 'acc-1',
    });

    expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
      where: {
        accountId: 'acc-1',
        expiresAt: { gt: expect.any(Date) },
        consumedAt: null,
        revokedAt: null,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  });

  it('refreshes tokens from account-owned session records', async () => {
    const prisma = createPrismaMock();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token: 'refresh-token',
      actorType: UserType.USER,
      accountId: 'acc-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.delete.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const { service, iamService } = createService(prisma);
    iamService.resolveActorIdentityForAccount.mockResolvedValue({
      type: UserType.USER,
      actor: {
        id: 'user-1',
        email: 'user@example.com',
        deletedAt: null,
      },
    });

    const result = await service.refreshTokens('refresh-token', {
      userAgent: 'Chrome',
      ipAddress: '127.0.0.1',
    });

    expect(iamService.resolveActorIdentityForAccount).toHaveBeenCalledWith({
      accountId: 'acc-1',
      actorType: UserType.USER,
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token: expect.any(String),
        actorType: UserType.USER,
        accountId: 'acc-1',
        familyId: 'family-1',
        userAgent: 'Chrome',
        ipAddress: '127.0.0.1',
        expiresAt: expect.any(Date),
      }),
    });
    expect(prisma.refreshToken.create.mock.calls[0][0].data).not.toHaveProperty(
      'userId',
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: expect.any(String),
    });
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { replacedByTokenHash: expect.any(String) },
    });
  });

  it('revokes the whole family when a consumed refresh token is reused', async () => {
    const prisma = createPrismaMock();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-used',
      actorType: UserType.USER,
      accountId: 'acc-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.refreshToken.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 2 });
    const { service, iamService } = createService(prisma);
    iamService.resolveActorIdentityForAccount.mockResolvedValue({
      type: UserType.USER,
      actor: { id: 'user-1', email: 'user@example.com', deletedAt: null },
    });

    await expect(service.refreshTokens('reused-token')).rejects.toMatchObject({
      response: { code: 'REFRESH_TOKEN_REUSE_DETECTED' },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenLastCalledWith({
      where: { familyId: 'family-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('has one winner when the same refresh token rotates concurrently', async () => {
    const prisma = createPrismaMock();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-race',
      actorType: UserType.USER,
      accountId: 'acc-1',
      familyId: 'family-race',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.refreshToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 2 });
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.refreshToken.update.mockResolvedValue({});
    const { service, iamService } = createService(prisma);
    iamService.resolveActorIdentityForAccount.mockResolvedValue({
      type: UserType.USER,
      actor: { id: 'user-1', email: 'user@example.com', deletedAt: null },
    });

    const outcomes = await Promise.allSettled([
      service.refreshTokens('same-token'),
      service.refreshTokens('same-token'),
    ]);

    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(
      1,
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  // Regression: parallel refreshes of one browser made Postgres abort the losing
  // Serializable transaction (Prisma P2034). It surfaced as 500 "Ошибка базы
  // данных" on POST /auth/web/refresh and dropped users to the login page.
  it('maps a lost rotation race (P2034) to 409 without revoking the token family', async () => {
    const prisma = createPrismaMock();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-race',
      actorType: UserType.USER,
      accountId: 'acc-1',
      familyId: 'family-race',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Transaction failed due to a write conflict or a deadlock',
        { code: 'P2034', clientVersion: 'test' },
      ),
    );
    const { service, iamService } = createService(prisma);
    iamService.resolveActorIdentityForAccount.mockResolvedValue({
      type: UserType.USER,
      actor: { id: 'user-1', email: 'user@example.com', deletedAt: null },
    });

    await expect(service.refreshTokens('same-token')).rejects.toMatchObject({
      status: 409,
      response: { code: 'REFRESH_TOKEN_ROTATION_RACE' },
    });
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rethrows unrelated database errors from the rotation unchanged', async () => {
    const prisma = createPrismaMock();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      actorType: UserType.USER,
      accountId: 'acc-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const failure = new Error('connection lost');
    prisma.$transaction.mockRejectedValue(failure);
    const { service, iamService } = createService(prisma);
    iamService.resolveActorIdentityForAccount.mockResolvedValue({
      type: UserType.USER,
      actor: { id: 'user-1', email: 'user@example.com', deletedAt: null },
    });

    await expect(service.refreshTokens('refresh-token')).rejects.toBe(failure);
  });

  describe('Account.locale при login/refresh (BL-37)', () => {
    const refreshRecord = {
      id: 'rt-1',
      token: 'refresh-token',
      actorType: UserType.USER,
      accountId: 'acc-1',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 60_000),
    };

    const setupRefresh = () => {
      const prisma = createPrismaMock();
      prisma.refreshToken.findUnique.mockResolvedValue(refreshRecord);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});
      const built = createService(prisma);
      built.iamService.resolveActorIdentityForAccount.mockResolvedValue({
        type: UserType.USER,
        actor: { id: 'user-1', email: 'user@example.com', deletedAt: null },
      });
      return { ...built, prisma };
    };

    it('валидный сигнал языка сохраняется в Account.locale (идемпотентно)', async () => {
      const { service, prisma } = setupRefresh();

      await service.refreshTokens('refresh-token', { locale: 'uz' });

      expect(prisma.account.updateMany).toHaveBeenCalledWith({
        where: { id: 'acc-1', NOT: { locale: 'uz' } },
        data: { locale: 'uz' },
      });
    });

    it('без сигнала языка локаль аккаунта не трогается', async () => {
      const { service, prisma } = setupRefresh();

      await service.refreshTokens('refresh-token', { userAgent: 'Chrome' });

      expect(prisma.account.updateMany).not.toHaveBeenCalled();
    });

    it('невалидная локаль игнорируется, сбой записи не роняет вход', async () => {
      const { service, prisma } = setupRefresh();

      await service.refreshTokens('refresh-token', { locale: 'xx' });
      expect(prisma.account.updateMany).not.toHaveBeenCalled();

      prisma.account.updateMany.mockRejectedValueOnce(new Error('db down'));
      prisma.refreshToken.findUnique.mockResolvedValue(refreshRecord);
      await expect(
        service.refreshTokens('refresh-token', { locale: 'en' }),
      ).resolves.toEqual({
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
    });
  });

  describe('ensurePublicEmailIsAvailable — no account enumeration (Stage 2 / §6)', () => {
    const GENERIC = 'Этот email недоступен для регистрации';
    type EmailGuard = {
      ensurePublicEmailIsAvailable(
        email: string,
        actorType: UserType,
      ): Promise<void>;
    };

    const conflictCases: Array<{
      name: string;
      actor: UserType;
      existingUser: unknown;
      existingOrg: unknown;
    }> = [
      {
        name: 'USER email taken by a user',
        actor: UserType.USER,
        existingUser: { id: 'u' },
        existingOrg: null,
      },
      {
        name: 'ORG email taken by an organization',
        actor: UserType.ORGANIZATION,
        existingUser: null,
        existingOrg: { id: 'o' },
      },
      {
        name: 'USER email taken by an organization',
        actor: UserType.USER,
        existingUser: null,
        existingOrg: { id: 'o' },
      },
      {
        name: 'ORG email taken by a user',
        actor: UserType.ORGANIZATION,
        existingUser: { id: 'u' },
        existingOrg: null,
      },
    ];

    it.each(conflictCases)(
      'throws one generic, non-discriminating conflict: $name',
      async ({ actor, existingUser, existingOrg }) => {
        const prisma = createPrismaMock();
        prisma.user.findFirst.mockResolvedValue(existingUser);
        prisma.organization.findFirst.mockResolvedValue(existingOrg);
        const { service } = createService(prisma);

        await expect(
          (service as unknown as EmailGuard).ensurePublicEmailIsAvailable(
            'taken@example.com',
            actor,
          ),
        ).rejects.toThrow(GENERIC);
      },
    );

    it('uses an identical message across all conflict shapes (no type leak)', async () => {
      const messages = await Promise.all(
        conflictCases.map(async ({ actor, existingUser, existingOrg }) => {
          const prisma = createPrismaMock();
          prisma.user.findFirst.mockResolvedValue(existingUser);
          prisma.organization.findFirst.mockResolvedValue(existingOrg);
          const { service } = createService(prisma);
          try {
            await (
              service as unknown as EmailGuard
            ).ensurePublicEmailIsAvailable('taken@example.com', actor);
            return null;
          } catch (e) {
            return (e as Error).message;
          }
        }),
      );
      expect(new Set(messages)).toEqual(new Set([GENERIC]));
    });

    it('resolves when the email is free', async () => {
      const prisma = createPrismaMock();
      const { service } = createService(prisma);
      await expect(
        (service as unknown as EmailGuard).ensurePublicEmailIsAvailable(
          'free@example.com',
          UserType.USER,
        ),
      ).resolves.toBeUndefined();
    });

    it('normalizes email and checks both actor tables case-insensitively', async () => {
      const prisma = createPrismaMock();
      const { service } = createService(prisma);

      await (service as unknown as EmailGuard).ensurePublicEmailIsAvailable(
        '  Mixed@Example.COM ',
        UserType.USER,
      );

      const expectedWhere = {
        email: { equals: 'mixed@example.com', mode: 'insensitive' },
      };
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(prisma.organization.findFirst).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });
  });
});
