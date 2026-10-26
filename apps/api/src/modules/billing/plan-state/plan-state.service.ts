import { ForbiddenException, Injectable } from '@nestjs/common';
import { PlanKey, PlanPurchase, UserType } from '@prisma/client';
import type { ICurrentUser } from '../../../common/interfaces';
import { PlanStateRepository } from './plan-state.repository';

/**
 * Состояние тарифа организации (M-3, граница по CR-9): отвечает РОВНО на
 * вопрос «что купила организация и живо ли это». Слияние приоритетов
 * (оверрайды → снапшот → START-дефолты → приостановка → мастер-переключатель)
 * живёт ТОЛЬКО в E-1 (EntitlementsService); дублировать его здесь запрещено.
 */
export interface PlanState {
  /** Эффективный ключ тарифа ПО ПАКЕТУ (без оверрайдов E-1). */
  tierKey: PlanKey;
  /** PURCHASE — живой пакет; DEFAULT — START как null-object (D-14). */
  source: 'PURCHASE' | 'DEFAULT';
  /** Живой пакет (ACTIVE, не истёкший), если есть. */
  activePurchase: PlanPurchase | null;
}

@Injectable()
export class PlanStateService {
  constructor(private readonly planStateRepository: PlanStateRepository) {}

  /**
   * Ленивое разрешение (CR-6): читает ACTIVE-пакет; если срок вышел —
   * фиксирует EXPIRED guarded-апдейтом и отвечает START. Переход в EXHAUSTED
   * происходит в пути потребления кредита (E-16), не здесь.
   */
  async getPlanState(organizationId: string): Promise<PlanState> {
    const purchase =
      await this.planStateRepository.findActivePurchase(organizationId);
    if (!purchase) {
      return { tierKey: PlanKey.START, source: 'DEFAULT', activePurchase: null };
    }

    const now = new Date();
    if (purchase.expiresAt && purchase.expiresAt <= now) {
      await this.planStateRepository.markExpiredIfDue(purchase.id, now);
      // §2.1: непродлённый пакет = немедленный возврат на START, без grace.
      return { tierKey: PlanKey.START, source: 'DEFAULT', activePurchase: null };
    }

    return {
      tierKey: purchase.planKeySnapshot,
      source: 'PURCHASE',
      activePurchase: purchase,
    };
  }

  /**
   * Тенант-идентичность вызывающего (паттерн events.service.ts#getOrganizationId):
   * ORGANIZATION — сам субъект; MEMBER — его организация.
   */
  resolveOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) return user.sub;
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException('Биллинг доступен только организациям');
  }
}
