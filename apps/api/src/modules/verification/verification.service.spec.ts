import { UserType, VerificationCodeType } from '@prisma/client';
import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  const orgId = 'org-id';
  const actorId = 'user-id';
  const email = 'shared@example.com';

  const createPrismaMock = () => ({
    $transaction: jest.fn(async (operations: any[]) => Promise.all(operations)),
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    organizationMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  });

  const createRepositoryMock = () => ({
    invalidateCodes: jest.fn(),
    createCode: jest.fn(),
    findActiveCode: jest.fn(),
    findLatestCode: jest.fn(),
    findByCode: jest.fn(),
    markAsUsed: jest.fn(),
    incrementAttempts: jest.fn(),
  });

  it('binds email verification code to organization when explicit organization id is provided', async () => {
    const prisma = createPrismaMock();
    const repository = createRepositoryMock();

    prisma.user.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === orgId) {
        return null;
      }
      if (where.email === email) {
        return { id: actorId, email };
      }
      return null;
    });
    prisma.organization.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === orgId) {
        return { id: orgId, email };
      }
      if (where.email === email) {
        return { id: orgId, email };
      }
      return null;
    });
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    repository.createCode.mockResolvedValue({});
    repository.invalidateCodes.mockResolvedValue({});

    const service = new VerificationService(
      prisma as any,
      repository as any,
      {
        resolveSessionContextForLogin: jest
          .fn()
          .mockResolvedValue({ accountId: 'account-id' }),
      } as any,
    );

    await service.sendVerificationCode(
      email,
      VerificationCodeType.EMAIL_VERIFICATION,
      orgId,
    );

    expect(repository.createCode).toHaveBeenCalledWith(
      expect.objectContaining({
        email,
        type: VerificationCodeType.EMAIL_VERIFICATION,
        actorType: UserType.ORGANIZATION,
        actorId: orgId,
      }),
    );
  });

  it('preserves original organization binding on resend', async () => {
    const prisma = createPrismaMock();
    const repository = createRepositoryMock();

    prisma.user.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === orgId || where.email === email) {
        return null;
      }
      return null;
    });
    prisma.organization.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === orgId || where.email === email) {
        return { id: orgId, email };
      }
      return null;
    });
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    repository.findActiveCode.mockResolvedValue(null);
    repository.findLatestCode.mockResolvedValue({
      email,
      type: VerificationCodeType.EMAIL_VERIFICATION,
      actorId: orgId,
      actorType: UserType.ORGANIZATION,
      createdAt: new Date(Date.now() - 120000),
    });
    repository.invalidateCodes.mockResolvedValue({});
    repository.createCode.mockResolvedValue({});

    const service = new VerificationService(
      prisma as any,
      repository as any,
      {
        resolveSessionContextForLogin: jest
          .fn()
          .mockResolvedValue({ accountId: 'account-id' }),
      } as any,
    );

    await service.resendCode(email, VerificationCodeType.EMAIL_VERIFICATION);

    expect(repository.createCode).toHaveBeenCalledWith(
      expect.objectContaining({
        email,
        type: VerificationCodeType.EMAIL_VERIFICATION,
        actorType: UserType.ORGANIZATION,
        actorId: orgId,
      }),
    );
  });

  it('syncs organization email verification even when code was bound to user with same email', async () => {
    const prisma = createPrismaMock();
    const repository = createRepositoryMock();

    repository.findActiveCode.mockResolvedValue({
      id: 'code-id',
      email,
      code: '123456',
      type: VerificationCodeType.EMAIL_VERIFICATION,
      actorId,
      actorType: UserType.USER,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60000),
    });
    repository.findByCode.mockResolvedValue({
      id: 'code-id',
      email,
      code: '123456',
      type: VerificationCodeType.EMAIL_VERIFICATION,
      actorId,
      actorType: UserType.USER,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60000),
    });
    repository.markAsUsed.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.organization.updateMany.mockResolvedValue({ count: 1 });

    const service = new VerificationService(
      prisma as any,
      repository as any,
      {
        resolveSessionContextForLogin: jest
          .fn()
          .mockResolvedValue({ accountId: 'account-id' }),
      } as any,
    );

    await service.verifyEmail(email, '123456');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: actorId },
      data: { isEmailVerified: true },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { email, deletedAt: null },
      data: { isEmailVerified: true },
    });
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: { email, deletedAt: null },
      data: { isEmailVerified: true },
    });
  });
});
