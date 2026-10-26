import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VerificationCodeType } from '@prisma/client';

import { VerificationController } from './verification.controller';

describe('VerificationController', () => {
  const verificationService = {
    sendVerificationCode: jest.fn(),
    resendCode: jest.fn(),
  };
  const mailService = {
    sendEmailVerificationCode: jest.fn(),
    sendPasswordResetCode: jest.fn(),
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    organization: { findUnique: jest.fn().mockResolvedValue(null) },
    organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
  };

  const controller = new VerificationController(
    verificationService as never,
    mailService as never,
    prisma as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a uniform success response when send-code cannot find an account', async () => {
    verificationService.sendVerificationCode.mockRejectedValue(
      new NotFoundException('Account not found'),
    );

    await expect(
      controller.sendCode({
        email: 'missing@example.com',
        type: VerificationCodeType.PASSWORD_RESET,
      }),
    ).resolves.toEqual({
      message: 'Если аккаунт существует, код отправлен на email',
    });

    expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('returns a uniform success response when resend-code is throttled internally', async () => {
    verificationService.resendCode.mockRejectedValue(
      new BadRequestException('Retry later'),
    );

    await expect(
      controller.resendCode({
        email: 'existing@example.com',
        type: VerificationCodeType.EMAIL_VERIFICATION,
      }),
    ).resolves.toEqual({
      message: 'Если аккаунт существует, код отправлен на email',
    });

    expect(mailService.sendEmailVerificationCode).not.toHaveBeenCalled();
  });
});
