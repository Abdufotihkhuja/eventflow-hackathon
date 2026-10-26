import { NotFoundException } from '@nestjs/common';
import { GenerationWindow, PlanKey, QrCheckInMode, StatsTier } from '@prisma/client';
import { CatalogService } from './catalog.service';
import { CatalogRepository } from './catalog.repository';

const startPlan = {
  id: 'p-start',
  key: PlanKey.START,
  priceAmountMinor: null,
  usdAnchorCents: null,
  isPurchasable: false,
  isActive: true,
  eventCredits: 0,
  validityDays: null,
  commissionBps: 1200,
  aiMinutesMonthly: 0,
  generationCredits: 50,
  generationWindow: GenerationWindow.CALENDAR_MONTH,
  staffSeats: 1,
  maxParticipantsPerEvent: 50,
  taskBoardEnabled: false,
  statsTier: StatsTier.BASIC,
  qrMode: QrCheckInMode.ARRIVAL_ONLY,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const proPlan = {
  ...startPlan,
  id: 'p-pro',
  key: PlanKey.PRO,
  priceAmountMinor: 7_500_000_00n, // 7 500 000 UZS в тийинах
  usdAnchorCents: 59_900,
  isPurchasable: true,
  isActive: false, // цена не активирована владельцем
  eventCredits: 5,
  validityDays: 90,
  commissionBps: 800,
  aiMinutesMonthly: 150,
  generationCredits: 200,
  generationWindow: GenerationWindow.PACK_PERIOD,
  staffSeats: 3,
  maxParticipantsPerEvent: 400,
  taskBoardEnabled: true,
  sortOrder: 1,
};

const coinSku = {
  id: 's-1',
  code: 'COIN_AI_100MIN',
  kind: 'COIN_PACK',
  priceAmountMinor: null,
  usdAnchorCents: 3500,
  isActive: false,
  coinMetric: 'AI_SECONDS',
  coinQuantity: 6000,
  adBillingUnit: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function build() {
  const repo = {
    findPlans: jest.fn().mockResolvedValue([startPlan, proPlan]),
    findAddonSkus: jest.fn().mockResolvedValue([coinSku]),
    findPlanByKey: jest.fn().mockResolvedValue(null),
  };
  return {
    service: new CatalogService(repo as unknown as CatalogRepository),
    repo,
  };
}

describe('CatalogService', () => {
  it('публичный каталог: только активные строки, деньги строками', async () => {
    const { service } = build();
    const catalog = await service.getPublicCatalog();

    expect(catalog.plans.map((p) => p.key)).toEqual([PlanKey.START]);
    expect(catalog.addons).toEqual([]); // монеты неактивны до установки цен
    expect(catalog.plans[0].priceAmountMinor).toBeNull();
  });

  it('кабинетный каталог: весь каталог с флагами, BigInt → строка', async () => {
    const { service } = build();
    const catalog = await service.getWorkspaceCatalog();

    expect(catalog.plans).toHaveLength(2);
    const pro = catalog.plans.find((p) => p.key === PlanKey.PRO)!;
    expect(pro.priceAmountMinor).toBe('750000000');
    expect(typeof pro.priceAmountMinor).toBe('string');
    expect(pro.isActive).toBe(false);
    expect(pro.validityDays).toBe(90);
    expect(catalog.addons[0].coinQuantity).toBe(6000);
  });

  it('requirePlan: 404 для незаведённого тарифа', async () => {
    const { service } = build();
    await expect(service.requirePlan(PlanKey.PRO)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
