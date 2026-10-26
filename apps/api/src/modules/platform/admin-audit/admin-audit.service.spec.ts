import { AdminAuditService, sanitizeSnapshot } from './admin-audit.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('sanitizeSnapshot (PII-вайтлист, инвариант №7)', () => {
  it('пропускает скалярные бизнес-поля', () => {
    expect(
      sanitizeSnapshot({
        planKey: 'PRO',
        commissionBps: 800,
        taskBoardEnabled: true,
        expiresAt: null,
      }),
    ).toEqual({
      planKey: 'PRO',
      commissionBps: 800,
      taskBoardEnabled: true,
      expiresAt: null,
    });
  });

  it('выбрасывает PII/секретные ключи', () => {
    expect(
      sanitizeSnapshot({
        planKey: 'PRO',
        ownerEmail: 'x@y.z',
        contactPhone: '+998...',
        passwordHash: 'h',
        refreshToken: 't',
        apiSecret: 's',
        firstName: 'A',
        organizationName: 'Org',
      }),
    ).toEqual({ planKey: 'PRO' });
  });

  it('выбрасывает не-скалярные значения', () => {
    expect(
      sanitizeSnapshot({
        planKey: 'PRO',
        nested: { a: 1 } as never,
        list: [1, 2] as never,
        fn: (() => 1) as never,
      }),
    ).toEqual({ planKey: 'PRO' });
  });
});

describe('AdminAuditService.record', () => {
  function makeService() {
    const create = jest.fn().mockResolvedValue(undefined);
    const prisma = { adminAuditLog: { create } } as unknown as PrismaService;
    return { service: new AdminAuditService(prisma), create };
  }

  it('пишет запись с санитизированными before/after и reason в metadata', async () => {
    const { service, create } = makeService();
    await service.record({
      action: 'COMMISSION_OVERRIDE_SET',
      actorId: 'admin-1',
      actorEmail: 'admin@eventflow.uz',
      targetType: 'ORGANIZATION',
      targetId: 'org-1',
      targetLabel: 'Acme Events',
      reason: 'enterprise deal',
      before: { commissionBps: 1200, ownerEmail: 'leak@x.y' },
      after: { commissionBps: 600 },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        action: 'COMMISSION_OVERRIDE_SET',
        actorId: 'admin-1',
        actorEmail: 'admin@eventflow.uz',
        targetType: 'ORGANIZATION',
        targetId: 'org-1',
        targetLabel: 'Acme Events',
        metadata: {
          reason: 'enterprise deal',
          before: { commissionBps: 1200 },
          after: { commissionBps: 600 },
        },
      },
    });
  });

  it('использует переданный tx вместо prisma (атомарность с мутацией)', async () => {
    const { service, create } = makeService();
    const txCreate = jest.fn().mockResolvedValue(undefined);
    const tx = { adminAuditLog: { create: txCreate } } as never;
    await service.record(
      {
        action: 'PLAN_SWITCH',
        actorId: 'admin-1',
        targetType: 'ORGANIZATION',
        targetId: 'org-1',
        extra: { creditMode: 'CARRY_OVER' },
      },
      tx,
    );
    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(txCreate.mock.calls[0][0].data.metadata).toEqual({
      creditMode: 'CARRY_OVER',
    });
  });
});
