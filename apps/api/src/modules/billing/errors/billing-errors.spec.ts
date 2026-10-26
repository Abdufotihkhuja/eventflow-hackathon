import { CoinMetric, EntitlementKey, PlanKey } from '@prisma/client';
import {
  BILLING_ERROR_CODES,
  CapExceededException,
  EventCreditsExhaustedException,
  FeatureGatedException,
  OrgSuspendedException,
  QuotaExceededException,
} from './billing-errors';

describe('Контракт ошибок биллинга (E-13, CR-13)', () => {
  it('квота → 409 с code/details на верхнем уровне response', () => {
    const e = new QuotaExceededException({
      metric: CoinMetric.GENERATION_UNITS,
      limit: 50,
      used: 50,
      requested: 1,
      periodKey: '2026-07',
      tierKey: PlanKey.START,
      upgrade: true,
    });
    expect(e.getStatus()).toBe(409);
    const r = e.getResponse() as Record<string, unknown>;
    expect(r.code).toBe(BILLING_ERROR_CODES.QUOTA_EXCEEDED);
    expect((r.details as Record<string, unknown>).periodKey).toBe('2026-07');
  });

  it('кап → 409, сообщение зависит от вида капа', () => {
    const seats = new CapExceededException({
      cap: EntitlementKey.STAFF_SEATS,
      limit: 1,
      current: 1,
      tierKey: PlanKey.START,
      upgrade: true,
    });
    expect(seats.getStatus()).toBe(409);
    expect((seats.getResponse() as { message: string }).message).toContain(
      'сотрудников',
    );
  });

  it('кредиты событий → 409', () => {
    const e = new EventCreditsExhaustedException({
      granted: 5,
      remaining: 0,
      tierKey: PlanKey.PRO,
      expiresAt: '2026-09-29T00:00:00.000Z',
      upgrade: true,
    });
    expect(e.getStatus()).toBe(409);
    expect(
      (e.getResponse() as { code: string }).code,
    ).toBe(BILLING_ERROR_CODES.EVENT_CREDITS_EXHAUSTED);
  });

  it('гейт фичи → 403', () => {
    const e = new FeatureGatedException({
      feature: EntitlementKey.TASK_BOARD_ENABLED,
      tierKey: PlanKey.START,
      upgrade: true,
    });
    expect(e.getStatus()).toBe(403);
    expect((e.getResponse() as { code: string }).code).toBe(
      BILLING_ERROR_CODES.FEATURE_GATED,
    );
  });

  it('приостановка → 403 ORG_SUSPENDED', () => {
    const e = new OrgSuspendedException({
      suspendedAt: '2026-07-04T00:00:00.000Z',
    });
    expect(e.getStatus()).toBe(403);
    expect((e.getResponse() as { code: string }).code).toBe(
      BILLING_ERROR_CODES.ORG_SUSPENDED,
    );
  });
});
