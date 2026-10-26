import {
  EntitlementKey,
  GenerationWindow,
  PlanKey,
  PlanPurchaseStatus,
  QrCheckInMode,
  StatsTier,
} from '@prisma/client';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsRepository } from './entitlements.repository';
import { PlanStateService } from '../plan-state/plan-state.service';
import { CatalogService } from '../catalog/catalog.service';
import { BillingConfigService } from '../billing-config.service';

const ORG_ID = 'org-1';

const START_PLAN = {
  key: PlanKey.START,
  commissionBps: 1200,
  staffSeats: 1,
  maxParticipantsPerEvent: 50,
  generationCredits: 50,
  generationWindow: GenerationWindow.CALENDAR_MONTH,
  aiMinutesMonthly: 0,
  taskBoardEnabled: false,
  statsTier: StatsTier.BASIC,
  qrMode: QrCheckInMode.ARRIVAL_ONLY,
};

const PRO_PURCHASE = {
  id: 'pp-1',
  status: PlanPurchaseStatus.ACTIVE,
  planKeySnapshot: PlanKey.PRO,
  commissionBpsSnapshot: 800,
  staffSeatsSnapshot: 3,
  maxParticipantsSnapshot: 400,
  generationCreditsSnapshot: 200,
  generationWindowSnapshot: GenerationWindow.PACK_PERIOD,
  aiMinutesMonthlySnapshot: 150,
  taskBoardEnabledSnapshot: true,
  statsTierSnapshot: StatsTier.BASIC,
  qrModeSnapshot: QrCheckInMode.ARRIVAL_ONLY,
  eventCreditsGranted: 5,
  eventCreditsRemaining: 2,
};

function build(opts: {
  enforcement?: boolean;
  suspended?: boolean;
  purchase?: typeof PRO_PURCHASE | null;
  overrides?: Array<Record<string, unknown>>;
}) {
  const planState = {
    getPlanState: jest.fn().mockResolvedValue(
      opts.purchase
        ? { tierKey: opts.purchase.planKeySnapshot, source: 'PURCHASE', activePurchase: opts.purchase }
        : { tierKey: PlanKey.START, source: 'DEFAULT', activePurchase: null },
    ),
  };
  const catalog = { requirePlan: jest.fn().mockResolvedValue(START_PLAN) };
  const config = {
    isEnforcementEnabled: jest.fn().mockResolvedValue(opts.enforcement ?? true),
  };
  const repo = {
    findActiveOverrides: jest.fn().mockResolvedValue(opts.overrides ?? []),
    isSuspended: jest.fn().mockResolvedValue(opts.suspended ?? false),
  };
  return new EntitlementsService(
    planState as unknown as PlanStateService,
    catalog as unknown as CatalogService,
    config as unknown as BillingConfigService,
    repo as unknown as EntitlementsRepository,
  );
}

describe('EntitlementsService (E-1 — единственный владелец приоритетов)', () => {
  it('START-дефолты без пакета (null-object, D-14)', async () => {
    const service = build({ purchase: null });
    const e = await service.getEffectiveEntitlements(ORG_ID);
    expect(e.tierKey).toBe(PlanKey.START);
    expect(e.commissionBps).toBe(1200);
    expect(e.staffSeats).toBe(1);
    expect(e.maxParticipantsPerEvent).toBe(50);
    expect(e.taskBoardEnabled).toBe(false);
    expect(e.eventCredits).toBeNull();
  });

  it('живой пакет: значения из снапшотов, кредиты видны', async () => {
    const service = build({ purchase: PRO_PURCHASE });
    const e = await service.getEffectiveEntitlements(ORG_ID);
    expect(e.tierKey).toBe(PlanKey.PRO);
    expect(e.commissionBps).toBe(800);
    expect(e.staffSeats).toBe(3);
    expect(e.eventCredits).toEqual({ granted: 5, remaining: 2 });
    expect(e.activePurchaseId).toBe('pp-1');
  });

  it('оверрайд бьёт снапшот (OQ-7) и попадает в overridesApplied', async () => {
    const service = build({
      purchase: PRO_PURCHASE,
      overrides: [
        {
          key: EntitlementKey.COMMISSION_BPS,
          valueInt: 300,
          valueBool: null,
          valueString: null,
        },
        {
          key: EntitlementKey.STAFF_SEATS,
          valueInt: 25,
          valueBool: null,
          valueString: null,
        },
      ],
    });
    const e = await service.getEffectiveEntitlements(ORG_ID);
    expect(e.commissionBps).toBe(300);
    expect(e.staffSeats).toBe(25);
    expect(e.overridesApplied).toEqual(
      expect.arrayContaining([
        EntitlementKey.COMMISSION_BPS,
        EntitlementKey.STAFF_SEATS,
      ]),
    );
  });

  it('булев и строковый оверрайды читаются из своих колонок', async () => {
    const service = build({
      purchase: null,
      overrides: [
        {
          key: EntitlementKey.TASK_BOARD_ENABLED,
          valueInt: null,
          valueBool: true,
          valueString: null,
        },
        {
          key: EntitlementKey.QR_MODE,
          valueInt: null,
          valueBool: null,
          valueString: QrCheckInMode.EXTENDED,
        },
      ],
    });
    const e = await service.getEffectiveEntitlements(ORG_ID);
    expect(e.taskBoardEnabled).toBe(true);
    expect(e.qrMode).toBe(QrCheckInMode.EXTENDED);
  });

  it('S-19 ВЫКЛ: безлимит и открытый Task Board, комиссия информационная', async () => {
    const service = build({ enforcement: false, purchase: PRO_PURCHASE });
    const e = await service.getEffectiveEntitlements(ORG_ID);
    expect(e.enforcementEnabled).toBe(false);
    expect(e.staffSeats).toBeNull();
    expect(e.maxParticipantsPerEvent).toBeNull();
    expect(e.generationCredits).toBeNull();
    expect(e.aiMinutesMonthly).toBeNull();
    expect(e.taskBoardEnabled).toBe(true);
    expect(e.eventCredits).toBeNull();
    expect(e.commissionBps).toBe(800); // информационно
  });

  it('приостановка отражается флагом (энфорсмент блокировок — E-17)', async () => {
    const service = build({ suspended: true, purchase: null });
    const e = await service.getEffectiveEntitlements(ORG_ID);
    expect(e.suspended).toBe(true);
  });
});
