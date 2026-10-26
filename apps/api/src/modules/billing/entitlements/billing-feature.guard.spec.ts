import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementKey, PlanKey, UserType } from '@prisma/client';
import { BillingFeatureGuard } from './billing-feature.guard';
import { EntitlementsService } from './entitlements.service';
import {
  FeatureGatedException,
  OrgSuspendedException,
} from '../errors/billing-errors';

function context(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function build(opts: {
  feature?: EntitlementKey | undefined;
  ent?: Record<string, unknown>;
}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(opts.feature),
  } as unknown as Reflector;
  const entitlements = {
    getEffectiveEntitlements: jest.fn().mockResolvedValue({
      tierKey: PlanKey.START,
      enforcementEnabled: true,
      suspended: false,
      taskBoardEnabled: false,
      ...opts.ent,
    }),
  };
  return {
    guard: new BillingFeatureGuard(
      reflector,
      entitlements as unknown as EntitlementsService,
    ),
    entitlements,
  };
}

const ORG_USER = { sub: 'org-1', type: UserType.ORGANIZATION };

describe('BillingFeatureGuard (E-2)', () => {
  it('без метадаты фичи — пропускает', async () => {
    const { guard, entitlements } = build({ feature: undefined });
    await expect(guard.canActivate(context(ORG_USER))).resolves.toBe(true);
    expect(entitlements.getEffectiveEntitlements).not.toHaveBeenCalled();
  });

  it('START + Task Board → 403 FeatureGated с тарифом и upgrade', async () => {
    const { guard } = build({ feature: EntitlementKey.TASK_BOARD_ENABLED });
    await expect(guard.canActivate(context(ORG_USER))).rejects.toBeInstanceOf(
      FeatureGatedException,
    );
  });

  it('тариф с доской — пропускает', async () => {
    const { guard } = build({
      feature: EntitlementKey.TASK_BOARD_ENABLED,
      ent: { taskBoardEnabled: true, tierKey: PlanKey.PRO },
    });
    await expect(guard.canActivate(context(ORG_USER))).resolves.toBe(true);
  });

  it('S-19 ВЫКЛ — пропускает даже START', async () => {
    const { guard } = build({
      feature: EntitlementKey.TASK_BOARD_ENABLED,
      ent: { enforcementEnabled: false, taskBoardEnabled: false },
    });
    await expect(guard.canActivate(context(ORG_USER))).resolves.toBe(true);
  });

  it('приостановленная организация → 403 ORG_SUSPENDED', async () => {
    const { guard } = build({
      feature: EntitlementKey.TASK_BOARD_ENABLED,
      ent: { suspended: true, taskBoardEnabled: true },
    });
    await expect(guard.canActivate(context(ORG_USER))).rejects.toBeInstanceOf(
      OrgSuspendedException,
    );
  });

  it('MEMBER скоупится через organizationId', async () => {
    const { guard, entitlements } = build({
      feature: EntitlementKey.TASK_BOARD_ENABLED,
      ent: { taskBoardEnabled: true },
    });
    await guard.canActivate(
      context({ sub: 'm-1', type: UserType.MEMBER, organizationId: 'org-9' }),
    );
    expect(entitlements.getEffectiveEntitlements).toHaveBeenCalledWith('org-9');
  });

  it('не-организационный актор (участник) гейтом не ограничивается', async () => {
    const { guard, entitlements } = build({
      feature: EntitlementKey.TASK_BOARD_ENABLED,
    });
    await expect(
      guard.canActivate(context({ sub: 'u-1', type: UserType.USER })),
    ).resolves.toBe(true);
    expect(entitlements.getEffectiveEntitlements).not.toHaveBeenCalled();
  });
});
