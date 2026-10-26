import { EventCreditsService } from './event-credits.service';
import { EventCreditsRepository } from './event-credits.repository';
import { BillingConfigService } from '../billing-config.service';

const ORG_ID = 'org-1';
const EVENT_ID = 'ev-1';

function build(opts: {
  enforcement?: boolean;
  purchase?: Record<string, unknown> | null;
  consumption?: Record<string, unknown> | null;
}) {
  const tx = {};
  const repo = {
    runInTransaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    findActivePurchase: jest.fn().mockResolvedValue(opts.purchase ?? null),
    createConsumptionIfAbsent: jest.fn().mockResolvedValue({ id: 'cc-1' }),
    decrementRemainingGuarded: jest.fn().mockResolvedValue(true),
    markExhaustedIfEmpty: jest.fn().mockResolvedValue(undefined),
    findConsumptionByEvent: jest.fn().mockResolvedValue(opts.consumption ?? null),
    refund: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    isEnforcementEnabled: jest.fn().mockResolvedValue(opts.enforcement ?? true),
  };
  const service = new EventCreditsService(
    repo as unknown as EventCreditsRepository,
    config as unknown as BillingConfigService,
  );
  return { service, repo };
}

describe('EventCreditsService.consumeForEvent (E-16)', () => {
  it('S-19 ВЫКЛ → no-op (естественный грандфазеринг E-15)', async () => {
    const { service, repo } = build({ enforcement: false });
    const result = await service.consumeForEvent(ORG_ID, EVENT_ID);
    expect(result).toEqual({ consumed: false, exhausted: false });
    expect(repo.runInTransaction).not.toHaveBeenCalled();
  });

  it('START (нет пакета) → публикация бесплатна', async () => {
    const { service, repo } = build({ purchase: null });
    const result = await service.consumeForEvent(ORG_ID, EVENT_ID);
    expect(result.consumed).toBe(false);
    expect(repo.createConsumptionIfAbsent).not.toHaveBeenCalled();
  });

  it('живой пакет → списание + запись потребления', async () => {
    const { service, repo } = build({
      purchase: { id: 'pp-1', eventCreditsRemaining: 5 },
    });
    const result = await service.consumeForEvent(ORG_ID, EVENT_ID);
    expect(result.consumed).toBe(true);
    expect(result.exhausted).toBe(false);
    expect(repo.decrementRemainingGuarded).toHaveBeenCalledWith(
      expect.anything(),
      'pp-1',
    );
  });

  it('последний кредит → exhausted=true (тариф падёт к START через M-3)', async () => {
    const { service } = build({
      purchase: { id: 'pp-1', eventCreditsRemaining: 1 },
    });
    const result = await service.consumeForEvent(ORG_ID, EVENT_ID);
    expect(result).toEqual({ consumed: true, exhausted: true });
  });

  it('повторная публикация (unique eventId) → бесплатно, декремента нет (PC-10)', async () => {
    const { service, repo } = build({
      purchase: { id: 'pp-1', eventCreditsRemaining: 5 },
    });
    repo.createConsumptionIfAbsent.mockResolvedValue(null);
    const result = await service.consumeForEvent(ORG_ID, EVENT_ID);
    expect(result.consumed).toBe(false);
    expect(repo.decrementRemainingGuarded).not.toHaveBeenCalled();
  });
});

describe('EventCreditsService.refundForCancelledEvent (B-1)', () => {
  it('есть APPROVED-регистрации → возврата нет', async () => {
    const { service, repo } = build({});
    const result = await service.refundForCancelledEvent(EVENT_ID, 3);
    expect(result.refunded).toBe(false);
    expect(repo.runInTransaction).not.toHaveBeenCalled();
  });

  it('0 APPROVED + неснятое потребление → возврат', async () => {
    const { service, repo } = build({
      consumption: {
        id: 'cc-1',
        organizationId: ORG_ID,
        planPurchaseId: 'pp-1',
        refundedAt: null,
      },
    });
    const result = await service.refundForCancelledEvent(EVENT_ID, 0);
    expect(result.refunded).toBe(true);
    expect(repo.refund).toHaveBeenCalled();
  });

  it('уже возвращено → идемпотентный no-op', async () => {
    const { service, repo } = build({
      consumption: { id: 'cc-1', refundedAt: new Date() },
    });
    const result = await service.refundForCancelledEvent(EVENT_ID, 0);
    expect(result.refunded).toBe(false);
    expect(repo.refund).not.toHaveBeenCalled();
  });

  it('потребления не было (START-событие) → no-op', async () => {
    const { service } = build({ consumption: null });
    const result = await service.refundForCancelledEvent(EVENT_ID, 0);
    expect(result.refunded).toBe(false);
  });
});
