import { PlatformElevationMode, PlatformRole, UserType } from '@prisma/client';
import { PlatformElevationService } from './platform-elevation.service';

describe('PlatformElevationService', () => {
  const tx = {
    platformElevation: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };
  const prisma = {
    platformElevation: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const audit = { record: jest.fn() };
  const service = new PlatformElevationService(prisma as never, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it('issues an immediate 30-minute token for READ elevation', async () => {
    tx.platformElevation.create.mockImplementation(({ data }) => ({
      id: 'elevation-1',
      ...data,
    }));

    const result = await service.request(actor('admin-1'), {
      mode: PlatformElevationMode.READ,
      reason: 'Investigate tenant incident',
    });

    expect(result.token).toHaveLength(43);
    expect(result.approvalRequired).toBe(false);
    expect(tx.platformElevation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestedByAdminId: 'admin-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('issues a WRITE token immediately, without a second approver', async () => {
    tx.platformElevation.create.mockImplementation(({ data }) => ({
      id: 'elevation-1',
      ...data,
    }));

    const result = await service.request(actor('admin-1'), {
      mode: PlatformElevationMode.WRITE,
      reason: 'Repair tenant state',
    });

    expect(result.token).toHaveLength(43);
    expect(result.approvalRequired).toBe(false);
    expect(tx.platformElevation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mode: PlatformElevationMode.WRITE,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it('rejects self-approval and lets a different admin win approval once', async () => {
    const pending = {
      id: 'elevation-1',
      accountId: 'account-1',
      requestedByAdminId: 'admin-1',
      approvedByAdminId: null,
      organizationId: 'org-1',
      mode: PlatformElevationMode.WRITE,
      approvedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    prisma.platformElevation.findUnique.mockResolvedValue(pending);

    await expect(
      service.approveWrite(actor('admin-1'), pending.id),
    ).rejects.toMatchObject({
      response: { code: 'SECOND_APPROVER_REQUIRED' },
    });

    tx.platformElevation.updateMany.mockResolvedValue({ count: 1 });
    tx.platformElevation.findUniqueOrThrow.mockResolvedValue({
      ...pending,
      approvedByAdminId: 'admin-2',
      approvedAt: new Date(),
    });
    const approved = await service.approveWrite(actor('admin-2'), pending.id);

    expect(approved.token).toHaveLength(43);
    expect(approved.approvalRequired).toBe(false);
    expect(tx.platformElevation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approvedByAdminId: 'admin-2' }),
      }),
    );
  });
});

function actor(sub: string) {
  return {
    sub,
    accountId: `account-${sub}`,
    email: `${sub}@example.com`,
    type: UserType.SUPER_ADMIN,
    platformRole: PlatformRole.SUPER_ADMIN,
  } as never;
}
