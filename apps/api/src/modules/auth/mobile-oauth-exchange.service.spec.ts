import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MobileOAuthExchangeService } from './mobile-oauth-exchange.service';

describe('MobileOAuthExchangeService', () => {
  let stored: Record<string, unknown> | null;
  const prisma = {
    mobileOAuthExchange: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        stored = data;
        return data;
      }),
      delete: jest.fn(async () => {
        if (!stored) {
          throw Object.assign(new Error('exchange missing'), { code: 'P2025' });
        }
        const row = stored;
        stored = null;
        return row;
      }),
    },
    refreshToken: { updateMany: jest.fn() },
  };
  const config = { getOrThrow: jest.fn().mockReturnValue('test-jwt-secret') };
  const service = new MobileOAuthExchangeService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
  );
  const tokens = {
    accessToken: 'access-secret',
    refreshToken: 'refresh-secret',
    isNewUser: true,
    isOnboardingCompleted: false,
  };

  beforeEach(() => {
    stored = null;
    jest.clearAllMocks();
  });

  it('stores encrypted payload and consumes the code exactly once', async () => {
    const code = await service.issue(tokens);

    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(stored)).not.toContain('access-secret');
    expect(JSON.stringify(stored)).not.toContain('refresh-secret');
    await expect(service.consume(code)).resolves.toEqual(tokens);
    await expect(service.consume(code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revokes the unclaimed refresh token when the code expired', async () => {
    const code = await service.issue(tokens);
    if (stored) stored.expiresAt = new Date(0);

    await expect(service.consume(code)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { token: expect.any(String) },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
