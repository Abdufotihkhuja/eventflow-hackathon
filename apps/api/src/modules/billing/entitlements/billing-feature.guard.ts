import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementKey, UserType } from '@prisma/client';
import type { ICurrentUser } from '../../../common/interfaces';
import {
  FeatureGatedException,
  OrgSuspendedException,
} from '../errors/billing-errors';
import { EntitlementsService } from './entitlements.service';

export const BILLING_FEATURE_KEY = 'billing:feature';

/** Гейтируемые фичи тарифа (E-2). STATS_TIER/QR_MODE зарезервированы (E-8/E-9). */
export type BillingFeature = Extract<
  EntitlementKey,
  'TASK_BOARD_ENABLED' | 'STATS_TIER' | 'QR_MODE'
>;

/**
 * Декоратор гейта фичи (E-2): вешается на контроллер/метод ПОСЛЕ JwtAuthGuard.
 * Серверно-авторитетный: решение принимает ТОЛЬКО E-1-резолвер; SDK-стороне
 * остаётся UX-подсказка (E-14). Пример: @RequireBillingFeature('TASK_BOARD_ENABLED').
 */
export const RequireBillingFeature = (feature: BillingFeature) =>
  SetMetadata(BILLING_FEATURE_KEY, feature);

@Injectable()
export class BillingFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<BillingFeature | undefined>(
      BILLING_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: ICurrentUser }>();
    const user = request.user;
    if (!user) return true; // аутентификацию обеспечивает JwtAuthGuard до нас

    // Супер-админ и не-организационные акторы гейтом тарифа не ограничиваются.
    const organizationId =
      user.type === UserType.ORGANIZATION
        ? user.sub
        : user.type === UserType.MEMBER && user.organizationId
          ? user.organizationId
          : null;
    if (!organizationId) return true;

    const ent = await this.entitlements.getEffectiveEntitlements(organizationId);

    // S-19 ВЫКЛ: резолвер уже вернул «всё открыто», но короткое замыкание
    // здесь делает намерение явным и дешёвым.
    if (!ent.enforcementEnabled) return true;

    if (ent.suspended) {
      throw new OrgSuspendedException({
        suspendedAt: new Date().toISOString(),
      });
    }

    if (feature === EntitlementKey.TASK_BOARD_ENABLED && !ent.taskBoardEnabled) {
      throw new FeatureGatedException({
        feature,
        tierKey: ent.tierKey,
        upgrade: true,
      });
    }
    // STATS_TIER / QR_MODE: гейты зарезервированы (E-8/E-9, P2) — сейчас
    // пропускают: базовая статистика и arrival-only не гейтируются намеренно.
    return true;
  }
}
