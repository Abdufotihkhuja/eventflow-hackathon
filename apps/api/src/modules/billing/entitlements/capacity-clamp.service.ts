import { Injectable } from '@nestjs/common';
import { PlanKey } from '@prisma/client';
import { BillingConfigService } from '../billing-config.service';
import { EntitlementsService } from './entitlements.service';

export interface EffectiveEventCap {
  /** null — капа нет вовсе (ни организаторского, ни тарифного). */
  cap: number | null;
  /** Чей лимит оказался связывающим. */
  source: 'ORGANIZER' | 'TIER' | 'NONE';
  /** Тарифная составляющая (для текста ошибки E-13). */
  tierCap: number | null;
  /** Тариф организации на момент проверки (для payload E-13). */
  tierKey: PlanKey;
}

/**
 * Эффективный кап участников события (E-3, OQ-6 — жёсткий блок):
 * min(организаторский maxParticipants, тарифный maxParticipantsPerEvent).
 *
 * Пер-событийный грандфазеринг НАВСЕГДА (B-3 п.3): события, созданные ДО
 * первого включения энфорсмента (billing_enforcement.enabledAt), тарифным
 * капом не ограничиваются — живому событию нельзя менять вместимость на лету.
 */
@Injectable()
export class CapacityClampService {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly billingConfig: BillingConfigService,
  ) {}

  async effectiveEventCap(
    organizationId: string,
    event: { createdAt: Date; maxParticipants: number | null },
  ): Promise<EffectiveEventCap> {
    const organizerCap = event.maxParticipants ?? null;

    const ent = await this.entitlements.getEffectiveEntitlements(organizationId);
    let tierCap = ent.enforcementEnabled ? ent.maxParticipantsPerEvent : null;

    if (tierCap !== null) {
      const enabledAt = await this.billingConfig.getEnabledAt();
      if (enabledAt && event.createdAt < enabledAt) {
        tierCap = null; // постоянный грандфазеринг pre-cutover событий
      }
    }

    if (organizerCap === null && tierCap === null) {
      return { cap: null, source: 'NONE', tierCap: null, tierKey: ent.tierKey };
    }
    if (tierCap === null || (organizerCap !== null && organizerCap <= tierCap)) {
      return { cap: organizerCap, source: 'ORGANIZER', tierCap, tierKey: ent.tierKey };
    }
    return { cap: tierCap, source: 'TIER', tierCap, tierKey: ent.tierKey };
  }
}
