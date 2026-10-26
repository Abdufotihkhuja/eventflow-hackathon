import { ForbiddenException } from '@nestjs/common';
import { PlanKey, PlanPurchaseStatus, UserType } from '@prisma/client';
import { PlanStateService } from './plan-state.service';
import { PlanStateRepository } from './plan-state.repository';
import type { ICurrentUser } from '../../../common/interfaces';

const ORG_ID = 'org-1';

function purchase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pp-1',
    organizationId: ORG_ID,
    status: PlanPurchaseStatus.ACTIVE,
    planKeySnapshot: PlanKey.PRO,
    eventCreditsGranted: 5,
    eventCreditsRemaining: 3,
    commissionBpsSnapshot: 800,
    activatedAt: new Date('2026-07-01T00:00:00Z'),
    expiresAt: new Date('2026-09-29T00:00:00Z'), // активация + 90 дней (§2.1)
    ...overrides,
  };
}

function build(active: unknown) {
  const repo = {
    findActivePurchase: jest.fn().mockResolvedValue(active),
    markExpiredIfDue: jest.fn().mockResolvedValue(1),
  };
  return {
    service: new PlanStateService(repo as unknown as PlanStateRepository),
    repo,
  };
}

describe('PlanStateService.getPlanState', () => {
  it('без пакета → START как null-object (D-14)', async () => {
    const { service, repo } = build(null);
    const state = await service.getPlanState(ORG_ID);
    expect(state).toEqual({
      tierKey: PlanKey.START,
      source: 'DEFAULT',
      activePurchase: null,
    });
    expect(repo.markExpiredIfDue).not.toHaveBeenCalled();
  });

  it('живой пакет → тариф из снапшота', async () => {
    const p = purchase({ expiresAt: new Date(Date.now() + 86_400_000) });
    const { service } = build(p);
    const state = await service.getPlanState(ORG_ID);
    expect(state.tierKey).toBe(PlanKey.PRO);
    expect(state.source).toBe('PURCHASE');
    expect(state.activePurchase).toBe(p);
  });

  it('истёкший пакет → ленивый EXPIRED + немедленный START (§2.1, без grace)', async () => {
    const p = purchase({ expiresAt: new Date(Date.now() - 1000) });
    const { service, repo } = build(p);
    const state = await service.getPlanState(ORG_ID);
    expect(repo.markExpiredIfDue).toHaveBeenCalledWith('pp-1', expect.any(Date));
    expect(state.tierKey).toBe(PlanKey.START);
    expect(state.source).toBe('DEFAULT');
    expect(state.activePurchase).toBeNull();
  });
});

describe('PlanStateService.resolveOrganizationId', () => {
  const { service } = build(null);

  it('ORGANIZATION → sub', () => {
    expect(
      service.resolveOrganizationId({
        sub: ORG_ID,
        type: UserType.ORGANIZATION,
      } as ICurrentUser),
    ).toBe(ORG_ID);
  });

  it('MEMBER → organizationId', () => {
    expect(
      service.resolveOrganizationId({
        sub: 'member-1',
        type: UserType.MEMBER,
        organizationId: ORG_ID,
      } as ICurrentUser),
    ).toBe(ORG_ID);
  });

  it('USER → 403', () => {
    expect(() =>
      service.resolveOrganizationId({
        sub: 'user-1',
        type: UserType.USER,
      } as ICurrentUser),
    ).toThrow(ForbiddenException);
  });
});
