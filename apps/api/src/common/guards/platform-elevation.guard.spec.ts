import { PlatformElevationMode, PlatformRole, UserType } from '@prisma/client';
import { PlatformElevationGuard } from './platform-elevation.guard';

describe('PlatformElevationGuard', () => {
  const prisma = { platformElevation: { findUnique: jest.fn() } };
  const guard = new PlatformElevationGuard(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('requires elevation for platform-admin operations', async () => {
    await expect(
      guard.canActivate(context(adminRequest({ headers: {} }))),
    ).rejects.toMatchObject({
      response: { code: 'PLATFORM_ELEVATION_REQUIRED' },
    });
  });

  it('accepts a live READ elevation only for safe methods', async () => {
    prisma.platformElevation.findUnique.mockResolvedValue(elevation());

    await expect(
      guard.canActivate(context(adminRequest({ method: 'GET' }))),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(context(adminRequest({ method: 'POST' }))),
    ).rejects.toMatchObject({
      response: { code: 'PLATFORM_WRITE_ELEVATION_REQUIRED' },
    });
  });

  it('lets a self-requested WRITE elevation through without second approval', async () => {
    prisma.platformElevation.findUnique.mockResolvedValue(
      elevation({ mode: PlatformElevationMode.WRITE }),
    );

    await expect(
      guard.canActivate(context(adminRequest({ method: 'PATCH' }))),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(context(adminRequest({ method: 'DELETE' }))),
    ).resolves.toBe(true);
  });

  it('still rejects an expired or revoked WRITE elevation', async () => {
    prisma.platformElevation.findUnique.mockResolvedValue(
      elevation({
        mode: PlatformElevationMode.WRITE,
        expiresAt: new Date(Date.now() - 1_000),
      }),
    );

    await expect(
      guard.canActivate(context(adminRequest({ method: 'PATCH' }))),
    ).rejects.toMatchObject({
      response: { code: 'PLATFORM_ELEVATION_INVALID' },
    });
  });
});

function elevation(overrides: Record<string, unknown> = {}) {
  return {
    accountId: 'account-1',
    organizationId: null,
    mode: PlatformElevationMode.READ,
    requestedByAdminId: 'admin-1',
    approvedByAdminId: null,
    approvedAt: null,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

function adminRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/v1/super-admin/organizations',
    url: '/api/v1/super-admin/organizations',
    headers: { 'x-eventflow-elevation': 'opaque-token' },
    params: {},
    user: {
      sub: 'admin-1',
      type: UserType.SUPER_ADMIN,
      email: 'admin@example.com',
      accountId: 'account-1',
      platformRole: PlatformRole.SUPER_ADMIN,
    },
    ...overrides,
  };
}

function context(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}
