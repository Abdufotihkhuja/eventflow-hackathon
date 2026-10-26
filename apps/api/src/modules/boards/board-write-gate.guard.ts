import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { EntitlementKey, UserType } from '@prisma/client';
import type { ICurrentUser } from '../../common/interfaces';
import { EntitlementsService } from '../billing/entitlements/entitlements.service';
import {
  FeatureGatedException,
  OrgSuspendedException,
} from '../billing/errors/billing-errors';

/**
 * Гейт записи Task Board (E-5, CR-12): ЧТЕНИЕ доступно всегда (read-only
 * режим для грандфазернутых/даунгрейднутых организаций — доски никогда не
 * прячутся и не удаляются), ЗАПИСЬ требует TASK_BOARD_ENABLED по тарифу.
 * Вешается классом на все контроллеры модуля досок.
 */
@Injectable()
export class BoardWriteGateGuard implements CanActivate {
  constructor(private readonly entitlements: EntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; user?: ICurrentUser }>();

    if (request.method === 'GET' || request.method === 'HEAD') return true;

    const user = request.user;
    if (!user) return true; // аутентификация — зона JwtAuthGuard

    const organizationId =
      user.type === UserType.ORGANIZATION
        ? user.sub
        : user.type === UserType.MEMBER && user.organizationId
          ? user.organizationId
          : null;
    if (!organizationId) return true;

    const ent = await this.entitlements.getEffectiveEntitlements(organizationId);
    if (!ent.enforcementEnabled) return true;

    if (ent.suspended) {
      throw new OrgSuspendedException({ suspendedAt: new Date().toISOString() });
    }
    if (!ent.taskBoardEnabled) {
      throw new FeatureGatedException({
        feature: EntitlementKey.TASK_BOARD_ENABLED,
        tierKey: ent.tierKey,
        upgrade: true,
      });
    }
    return true;
  }
}
