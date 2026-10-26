import { Injectable } from '@nestjs/common';
import {
  EntitlementKey,
  EntitlementOverride,
  GenerationWindow,
  Plan,
  PlanKey,
  QrCheckInMode,
  StatsTier,
} from '@prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import { PlanStateService } from '../plan-state/plan-state.service';
import { BillingConfigService } from '../billing-config.service';
import { EntitlementsRepository } from './entitlements.repository';

/**
 * Эффективные энтайтлменты организации (E-1) — ЕДИНСТВЕННЫЙ владелец
 * приоритетов (CR-9): оверрайд (D-6) → снапшот живого пакета (M-3) →
 * START-дефолты из каталога → флаг приостановки → мастер-переключатель S-19.
 * M-6/энфорсмент читают эффективную комиссию/лимиты ТОЛЬКО отсюда.
 *
 * enforcementEnabled=false (S-19 ВЫКЛ) — «легаси-режим»: числовые лимиты
 * null (безлимит), Task Board открыт, кредиты событий не требуются;
 * commissionBps остаётся информационным. E-2/квоты обязаны короткозамыкаться.
 */
export interface EffectiveEntitlements {
  organizationId: string;
  tierKey: PlanKey;
  source: 'PURCHASE' | 'DEFAULT';
  enforcementEnabled: boolean;
  suspended: boolean;

  commissionBps: number;
  staffSeats: number | null;
  maxParticipantsPerEvent: number | null;
  /** Override-only лимит на общее число созданных событий; null = безлимит. */
  maxEvents: number | null;
  generationCredits: number | null;
  generationWindow: GenerationWindow;
  aiMinutesMonthly: number | null;
  taskBoardEnabled: boolean;
  statsTier: StatsTier;
  qrMode: QrCheckInMode;

  /** null — кредиты не требуются (START-семантика или энфорсмент ВЫКЛ). */
  eventCredits: { granted: number; remaining: number } | null;
  activePurchaseId: string | null;
  /** Дата активации живого пакета — якорь месячных AI-окон (E-11a). */
  activePurchaseActivatedAt: Date | null;
  /** Какие ключи пришли из per-org оверрайдов (для C-2/S-2 прозрачности). */
  overridesApplied: EntitlementKey[];
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly planStateService: PlanStateService,
    private readonly catalogService: CatalogService,
    private readonly billingConfig: BillingConfigService,
    private readonly entitlementsRepository: EntitlementsRepository,
  ) {}

  async getEffectiveEntitlements(
    organizationId: string,
  ): Promise<EffectiveEntitlements> {
    const now = new Date();
    const [enforcementEnabled, suspended, planState, startPlan, overrides] =
      await Promise.all([
        this.billingConfig.isEnforcementEnabled(),
        this.entitlementsRepository.isSuspended(organizationId),
        this.planStateService.getPlanState(organizationId),
        this.catalogService.requirePlan(PlanKey.START),
        this.entitlementsRepository.findActiveOverrides(organizationId, now),
      ]);

    // База: снапшот живого пакета либо START-дефолты каталога.
    const base = this.baseValues(planState.activePurchase, startPlan);

    // Оверрайды поверх базы (D-6): типизированное чтение value*-полей по ключу.
    const byKey = new Map(overrides.map((o) => [o.key, o]));
    const applied: EntitlementKey[] = [];
    const pick = <T>(key: EntitlementKey, fromBase: T, read: (o: EntitlementOverride) => T | null): T => {
      const override = byKey.get(key);
      if (!override) return fromBase;
      const value = read(override);
      if (value === null) return fromBase;
      applied.push(key);
      return value;
    };

    const commissionBps = pick(
      EntitlementKey.COMMISSION_BPS,
      base.commissionBps,
      (o) => o.valueInt,
    );
    const staffSeats = pick(
      EntitlementKey.STAFF_SEATS,
      base.staffSeats,
      (o) => o.valueInt,
    );
    const maxParticipants = pick(
      EntitlementKey.MAX_PARTICIPANTS_PER_EVENT,
      base.maxParticipantsPerEvent,
      (o) => o.valueInt,
    );
    // MAX_EVENTS — чисто override-лимит: тарифного дефолта нет, база всегда null.
    const maxEvents = pick(
      EntitlementKey.MAX_EVENTS,
      null as number | null,
      (o) => o.valueInt,
    );
    const generationCredits = pick(
      EntitlementKey.GENERATION_CREDITS,
      base.generationCredits,
      (o) => o.valueInt,
    );
    const aiMinutes = pick(
      EntitlementKey.AI_MINUTES_MONTHLY,
      base.aiMinutesMonthly,
      (o) => o.valueInt,
    );
    const taskBoardEnabled = pick(
      EntitlementKey.TASK_BOARD_ENABLED,
      base.taskBoardEnabled,
      (o) => o.valueBool,
    );
    const statsTier = pick(
      EntitlementKey.STATS_TIER,
      base.statsTier,
      (o) => (o.valueString as StatsTier | null),
    );
    const qrMode = pick(
      EntitlementKey.QR_MODE,
      base.qrMode,
      (o) => (o.valueString as QrCheckInMode | null),
    );

    if (!enforcementEnabled) {
      // S-19 ВЫКЛ: поведение платформы до монетизации — безлимит, всё открыто.
      return {
        organizationId,
        tierKey: planState.tierKey,
        source: planState.source,
        enforcementEnabled: false,
        suspended,
        commissionBps,
        staffSeats: null,
        maxParticipantsPerEvent: null,
        maxEvents: null,
        generationCredits: null,
        generationWindow: base.generationWindow,
        aiMinutesMonthly: null,
        taskBoardEnabled: true,
        statsTier,
        qrMode,
        eventCredits: null,
        activePurchaseId: planState.activePurchase?.id ?? null,
        activePurchaseActivatedAt: planState.activePurchase?.activatedAt ?? null,
        overridesApplied: applied,
      };
    }

    return {
      organizationId,
      tierKey: planState.tierKey,
      source: planState.source,
      enforcementEnabled: true,
      suspended,
      commissionBps,
      staffSeats,
      maxParticipantsPerEvent: maxParticipants,
      maxEvents,
      generationCredits,
      generationWindow: base.generationWindow,
      aiMinutesMonthly: aiMinutes,
      taskBoardEnabled,
      statsTier,
      qrMode,
      eventCredits: planState.activePurchase
        ? {
            granted: planState.activePurchase.eventCreditsGranted,
            remaining: planState.activePurchase.eventCreditsRemaining,
          }
        : null,
      activePurchaseId: planState.activePurchase?.id ?? null,
      activePurchaseActivatedAt: planState.activePurchase?.activatedAt ?? null,
      overridesApplied: applied,
    };
  }

  /** E-17: блок новых регистраций на события приостановленной организации. */
  isOrgSuspended(organizationId: string): Promise<boolean> {
    return this.entitlementsRepository.isSuspended(organizationId);
  }

  private baseValues(
    purchase: {
      commissionBpsSnapshot: number;
      staffSeatsSnapshot: number;
      maxParticipantsSnapshot: number | null;
      generationCreditsSnapshot: number;
      generationWindowSnapshot: GenerationWindow;
      aiMinutesMonthlySnapshot: number;
      taskBoardEnabledSnapshot: boolean;
      statsTierSnapshot: StatsTier;
      qrModeSnapshot: QrCheckInMode;
    } | null,
    startPlan: Plan,
  ) {
    if (purchase) {
      return {
        commissionBps: purchase.commissionBpsSnapshot,
        staffSeats: purchase.staffSeatsSnapshot as number | null,
        maxParticipantsPerEvent: purchase.maxParticipantsSnapshot,
        generationCredits: purchase.generationCreditsSnapshot as number | null,
        generationWindow: purchase.generationWindowSnapshot,
        aiMinutesMonthly: purchase.aiMinutesMonthlySnapshot as number | null,
        taskBoardEnabled: purchase.taskBoardEnabledSnapshot,
        statsTier: purchase.statsTierSnapshot,
        qrMode: purchase.qrModeSnapshot,
      };
    }
    return {
      commissionBps: startPlan.commissionBps,
      staffSeats: startPlan.staffSeats as number | null,
      maxParticipantsPerEvent: startPlan.maxParticipantsPerEvent,
      generationCredits: startPlan.generationCredits as number | null,
      generationWindow: startPlan.generationWindow,
      aiMinutesMonthly: startPlan.aiMinutesMonthly as number | null,
      taskBoardEnabled: startPlan.taskBoardEnabled,
      statsTier: startPlan.statsTier,
      qrMode: startPlan.qrMode,
    };
  }
}
