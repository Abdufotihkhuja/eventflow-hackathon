import { GenerationWindow, PlanKey, QrCheckInMode, StatsTier } from '@prisma/client';
import { PlanLifecycleService } from './plan-lifecycle.service';
import { PlanLifecycleRepository } from './plan-lifecycle.repository';
import { CatalogService } from '../catalog/catalog.service';
import { AdminAuditService } from '../../platform/admin-audit/admin-audit.service';

const ORG_ID = 'org-1';
const ACTOR = { id: 'admin-1', email: 'admin@eventflow.uz' };
const NOW = new Date('2026-07-04T12:00:00Z');

const PRO_PLAN = {
  id: 'plan-pro',
  key: PlanKey.PRO,
  priceAmountMinor: null,
  usdAnchorCents: 59900,
  eventCredits: 5,
  validityDays: 90,
  commissionBps: 800,
  aiMinutesMonthly: 150,
  generationCredits: 200,
  generationWindow: GenerationWindow.PACK_PERIOD,
  staffSeats: 3,
  maxParticipantsPerEvent: 400,
  taskBoardEnabled: true,
  statsTier: StatsTier.BASIC,
  qrMode: QrCheckInMode.ARRIVAL_ONLY,
};

const EXCLUSIVE_PLAN = {
  ...PRO_PLAN,
  id: 'plan-excl',
  key: PlanKey.EXCLUSIVE,
  eventCredits: 10,
  commissionBps: 600,
};

function build(opts: { current?: Record<string, unknown> | null; plan?: unknown }) {
  const tx = {};
  const createdPurchase = { id: 'pp-new', eventCreditsRemaining: 0, expiresAt: null };
  const repo = {
    runInTransaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    findActivePurchase: jest.fn().mockResolvedValue(opts.current ?? null),
    createActivePurchase: jest.fn().mockImplementation((_tx, args) =>
      Promise.resolve({
        ...createdPurchase,
        eventCreditsRemaining: args.initialCredits,
        expiresAt: args.expiresAt,
        planKeySnapshot: args.plan.key,
      }),
    ),
    supersede: jest.fn().mockResolvedValue({}),
    addCreditAdjustment: jest.fn().mockResolvedValue(undefined),
  };
  const catalog = {
    requirePlan: jest.fn().mockResolvedValue(opts.plan ?? PRO_PLAN),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new PlanLifecycleService(
    repo as unknown as PlanLifecycleRepository,
    catalog as unknown as CatalogService,
    audit as unknown as AdminAuditService,
  );
  return { service, repo, audit };
}

describe('PlanLifecycleService.activatePack (M-2)', () => {
  it('первая активация: 90-дневный срок, кредиты из каталога, аудит PLAN_ASSIGN', async () => {
    const { service, repo, audit } = build({ current: null });
    const purchase = await service.activatePack({
      organizationId: ORG_ID,
      planKey: PlanKey.PRO,
      actor: ACTOR,
      now: NOW,
    });
    expect(purchase.eventCreditsRemaining).toBe(5);
    expect(purchase.expiresAt?.toISOString()).toBe('2026-10-02T12:00:00.000Z'); // +90 дней
    expect(repo.supersede).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLAN_ASSIGN' }),
      expect.anything(),
    );
  });

  it('продление того же тарифа: кредиты СБРАСЫВАЮТСЯ (§2.1), creditMode не нужен', async () => {
    const current = {
      id: 'pp-old',
      planKeySnapshot: PlanKey.PRO,
      eventCreditsRemaining: 3,
    };
    const { service, repo, audit } = build({ current });
    const purchase = await service.activatePack({
      organizationId: ORG_ID,
      planKey: PlanKey.PRO,
      actor: ACTOR,
      now: NOW,
    });
    expect(purchase.eventCreditsRemaining).toBe(5); // свежие 5, остаток 3 сгорел
    expect(repo.supersede).toHaveBeenCalledWith(expect.anything(), 'pp-old', 'pp-new', NOW);
    expect(repo.addCreditAdjustment).not.toHaveBeenCalled();
    const entry = audit.record.mock.calls[0][0];
    expect(entry.action).toBe('PLAN_SWITCH');
    expect(entry.extra).toMatchObject({ creditMode: 'RESET', renewal: true });
  });

  it('смена тарифа без creditMode → ошибка (§2.4: выбор обязателен)', async () => {
    const current = {
      id: 'pp-old',
      planKeySnapshot: PlanKey.PRO,
      eventCreditsRemaining: 3,
    };
    const { service } = build({ current, plan: EXCLUSIVE_PLAN });
    await expect(
      service.activatePack({
        organizationId: ORG_ID,
        planKey: PlanKey.EXCLUSIVE,
        actor: ACTOR,
        now: NOW,
      }),
    ).rejects.toThrow('creditMode');
  });

  it('смена с CARRY_OVER: остаток 1:1 отдельной корректировкой', async () => {
    const current = {
      id: 'pp-old',
      planKeySnapshot: PlanKey.PRO,
      eventCreditsRemaining: 3,
    };
    const { service, repo, audit } = build({ current, plan: EXCLUSIVE_PLAN });
    const purchase = await service.activatePack({
      organizationId: ORG_ID,
      planKey: PlanKey.EXCLUSIVE,
      creditMode: 'CARRY_OVER',
      actor: ACTOR,
      now: NOW,
    });
    expect(purchase.eventCreditsRemaining).toBe(13); // 10 новых + 3 перенесённых
    expect(repo.addCreditAdjustment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ delta: 3, kind: 'CARRY_OVER' }),
    );
    expect(audit.record.mock.calls[0][0].extra).toMatchObject({
      creditMode: 'CARRY_OVER',
      renewal: false,
    });
  });

  it('смена с RESET: остаток сгорает, только новые кредиты', async () => {
    const current = {
      id: 'pp-old',
      planKeySnapshot: PlanKey.EXCLUSIVE,
      eventCreditsRemaining: 7,
    };
    const { service, repo } = build({ current, plan: PRO_PLAN });
    const purchase = await service.activatePack({
      organizationId: ORG_ID,
      planKey: PlanKey.PRO,
      creditMode: 'RESET',
      actor: ACTOR,
      now: NOW,
    });
    expect(purchase.eventCreditsRemaining).toBe(5);
    expect(repo.addCreditAdjustment).not.toHaveBeenCalled();
  });
});
