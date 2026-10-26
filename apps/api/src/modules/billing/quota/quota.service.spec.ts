import { CoinMetric, GenerationWindow, PlanKey } from '@prisma/client';
import { QuotaService } from './quota.service';
import { QuotaRepository } from './quota.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { QuotaExceededException } from '../errors/billing-errors';

const ORG_ID = 'org-1';

function entitlements(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: ORG_ID,
    tierKey: PlanKey.START,
    source: 'DEFAULT',
    enforcementEnabled: true,
    suspended: false,
    commissionBps: 1200,
    staffSeats: 1,
    maxParticipantsPerEvent: 50,
    generationCredits: 50,
    generationWindow: GenerationWindow.CALENDAR_MONTH,
    aiMinutesMonthly: 0,
    taskBoardEnabled: false,
    statsTier: 'BASIC',
    qrMode: 'ARRIVAL_ONLY',
    eventCredits: null,
    activePurchaseId: null,
    activePurchaseActivatedAt: null,
    overridesApplied: [],
    ...overrides,
  };
}

function build(ent: Record<string, unknown>) {
  const tx = {}; // маркер транзакционного клиента
  const repo = {
    runInTransaction: jest.fn(
      (fn: (t: unknown) => Promise<unknown>) => fn(tx),
    ),
    createUsageEventIfAbsent: jest.fn().mockResolvedValue({ id: 'ue-1' }),
    incrementCounterGuarded: jest.fn().mockResolvedValue(true),
    markEventCoinDrained: jest.fn().mockResolvedValue(undefined),
    getUsed: jest.fn().mockResolvedValue(50),
  };
  const entService = {
    getEffectiveEntitlements: jest.fn().mockResolvedValue(ent),
  };
  const coins = {
    tryDebitInTx: jest.fn().mockResolvedValue(false),
  };
  const service = new QuotaService(
    entService as unknown as EntitlementsService,
    repo as unknown as QuotaRepository,
    coins as unknown as import('../coins/coin-ledger.service').CoinLedgerService,
  );
  return { service, repo, coins };
}

describe('QuotaService.consume (E-10)', () => {
  it('S-19 ВЫКЛ → пропуск без метеринга', async () => {
    const { service, repo } = build(entitlements({ enforcementEnabled: false }));
    const result = await service.consume({
      organizationId: ORG_ID,
      metric: CoinMetric.GENERATION_UNITS,
      quantity: 1,
      idempotencyKey: 'cert:c-1',
    });
    expect(result).toEqual({
      allowed: true,
      deduped: false,
      periodKey: null,
      drainSource: 'NONE',
    });
    expect(repo.runInTransaction).not.toHaveBeenCalled();
  });

  it('счастливый путь: событие + guarded-инкремент в одной транзакции', async () => {
    const { service, repo } = build(entitlements());
    const result = await service.consume({
      organizationId: ORG_ID,
      metric: CoinMetric.GENERATION_UNITS,
      quantity: 1,
      idempotencyKey: 'cert:c-1',
      eventId: 'ev-1',
    });
    expect(result.deduped).toBe(false);
    expect(result.periodKey).toMatch(/^\d{4}-\d{2}$/); // календарный месяц START
    expect(repo.createUsageEventIfAbsent).toHaveBeenCalledTimes(1);
    expect(repo.incrementCounterGuarded).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 50, quantity: 1 }),
    );
  });

  it('повторный idempotencyKey → deduped, счётчик не трогаем (OQ-A2-3)', async () => {
    const { service, repo } = build(entitlements());
    repo.createUsageEventIfAbsent.mockResolvedValue(null);
    const result = await service.consume({
      organizationId: ORG_ID,
      metric: CoinMetric.GENERATION_UNITS,
      quantity: 1,
      idempotencyKey: 'cert:c-1',
    });
    expect(result.deduped).toBe(true);
    expect(repo.incrementCounterGuarded).not.toHaveBeenCalled();
  });

  it('лимит исчерпан → QuotaExceededException (E-13) с okном и тарифом', async () => {
    const { service, repo } = build(entitlements());
    repo.incrementCounterGuarded.mockResolvedValue(false);
    await expect(
      service.consume({
        organizationId: ORG_ID,
        metric: CoinMetric.GENERATION_UNITS,
        quantity: 1,
        idempotencyKey: 'cert:c-2',
      }),
    ).rejects.toBeInstanceOf(QuotaExceededException);
  });

  it('AI на START: лимит 0 секунд → отказ сразу', async () => {
    const { service, repo } = build(entitlements());
    repo.incrementCounterGuarded.mockResolvedValue(false);
    repo.getUsed.mockResolvedValue(0);
    await expect(
      service.consume({
        organizationId: ORG_ID,
        metric: CoinMetric.AI_SECONDS,
        quantity: 60,
        idempotencyKey: 'ai:call-1',
      }),
    ).rejects.toBeInstanceOf(QuotaExceededException);
    expect(repo.incrementCounterGuarded).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 0 }),
    );
  });

  it('PACK_PERIOD-генерации у пакета используют pack:<id>', async () => {
    const { service, repo } = build(
      entitlements({
        tierKey: PlanKey.PRO,
        generationCredits: 200,
        generationWindow: GenerationWindow.PACK_PERIOD,
        activePurchaseId: 'pp-1',
        activePurchaseActivatedAt: new Date('2026-07-01T00:00:00Z'),
      }),
    );
    const result = await service.consume({
      organizationId: ORG_ID,
      metric: CoinMetric.GENERATION_UNITS,
      quantity: 2,
      idempotencyKey: 'badge:e1:r1:t1',
    });
    expect(result.periodKey).toBe('pack:pp-1');
  });

  it('AI-минуты пакета: окно pack:<id>:m<N> в секундах', async () => {
    const { service, repo } = build(
      entitlements({
        tierKey: PlanKey.PRO,
        aiMinutesMonthly: 150,
        activePurchaseId: 'pp-1',
        activePurchaseActivatedAt: new Date('2026-06-01T00:00:00Z'),
      }),
    );
    const result = await service.consume({
      organizationId: ORG_ID,
      metric: CoinMetric.AI_SECONDS,
      quantity: 90,
      idempotencyKey: 'ai:call-2',
    });
    expect(result.periodKey).toMatch(/^pack:pp-1:m\d+$/);
    expect(repo.incrementCounterGuarded).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 9000 }), // 150 мин × 60
    );
  });
});

describe('QuotaService — дренаж монет (E-12, OQ-5: квота → монеты)', () => {
  it('квота пуста, монеты есть → списание из монет, drainSource=COIN', async () => {
    const { service, repo, coins } = build(entitlements());
    repo.incrementCounterGuarded.mockResolvedValue(false);
    coins.tryDebitInTx.mockResolvedValue(true);
    const result = await service.consume({
      organizationId: ORG_ID,
      metric: CoinMetric.GENERATION_UNITS,
      quantity: 1,
      idempotencyKey: 'cert:c-9',
    });
    expect(result.drainSource).toBe('COIN');
    expect(repo.markEventCoinDrained).toHaveBeenCalled();
  });

  it('пусто и в квоте, и в монетах → QuotaExceededException', async () => {
    const { service, repo, coins } = build(entitlements());
    repo.incrementCounterGuarded.mockResolvedValue(false);
    coins.tryDebitInTx.mockResolvedValue(false);
    await expect(
      service.consume({
        organizationId: ORG_ID,
        metric: CoinMetric.GENERATION_UNITS,
        quantity: 1,
        idempotencyKey: 'cert:c-10',
      }),
    ).rejects.toBeInstanceOf(QuotaExceededException);
  });
});

describe('QuotaService.preview', () => {
  it('возвращает лимит/использовано без списания', async () => {
    const { service, repo } = build(entitlements());
    repo.getUsed.mockResolvedValue(12);
    const preview = await service.preview(ORG_ID, CoinMetric.GENERATION_UNITS);
    expect(preview.limit).toBe(50);
    expect(preview.used).toBe(12);
    expect(repo.createUsageEventIfAbsent).not.toHaveBeenCalled();
  });
});
