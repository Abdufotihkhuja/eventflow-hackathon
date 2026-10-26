import { BillingConfigService } from './billing-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsRepository } from './entitlements/entitlements.repository';

function build(configRow: { value: unknown } | null) {
  const prisma = {
    platformConfig: {
      findUnique: jest.fn().mockResolvedValue(configRow),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
  const repo = { stampGrandfatherExpiry: jest.fn().mockResolvedValue(7) };
  const service = new BillingConfigService(
    prisma as unknown as PrismaService,
    repo as unknown as EntitlementsRepository,
  );
  return { service, prisma, repo };
}

describe('BillingConfigService (S-19 + E-15)', () => {
  it('выключенный сид → энфорсмент выключен', async () => {
    const { service } = build({ value: { enabled: false } });
    await expect(service.isEnforcementEnabled()).resolves.toBe(false);
  });

  it('первое включение: фиксирует enabledAt и штампует GRANDFATHER-окно +90 дней', async () => {
    const { service, prisma, repo } = build({ value: { enabled: false } });
    const result = await service.setEnforcementEnabled(true, 'admin-1');

    expect(result.enabledAt).toBeInstanceOf(Date);
    expect(result.grandfathersStamped).toBe(7);
    const stampArg = repo.stampGrandfatherExpiry.mock.calls[0][0] as Date;
    const diffDays =
      (stampArg.getTime() - result.enabledAt!.getTime()) / 86_400_000;
    expect(diffDays).toBeCloseTo(90, 5);
    const upsert = prisma.platformConfig.upsert.mock.calls[0][0];
    expect(upsert.update.value.enabled).toBe(true);
    expect(typeof upsert.update.value.enabledAt).toBe('string');
  });

  it('повторное включение: enabledAt сохраняется, окно не перештамповывается', async () => {
    const enabledAt = '2026-07-01T00:00:00.000Z';
    const { service, repo } = build({
      value: { enabled: false, enabledAt },
    });
    const result = await service.setEnforcementEnabled(true, 'admin-1');
    expect(result.enabledAt?.toISOString()).toBe(enabledAt);
    expect(result.grandfathersStamped).toBe(0);
    expect(repo.stampGrandfatherExpiry).not.toHaveBeenCalled();
  });

  it('выключение (откат S-19): enabledAt-метка не теряется', async () => {
    const enabledAt = '2026-07-01T00:00:00.000Z';
    const { service, prisma } = build({ value: { enabled: true, enabledAt } });
    await service.setEnforcementEnabled(false, 'admin-1');
    const upsert = prisma.platformConfig.upsert.mock.calls[0][0];
    expect(upsert.update.value).toEqual({ enabled: false, enabledAt });
  });
});
