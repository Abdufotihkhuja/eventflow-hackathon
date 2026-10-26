import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlanCreditAdjustmentKind,
  PlanKey,
  PlanPurchase,
} from '@prisma/client';
import { AdminAuditService } from '../../platform/admin-audit/admin-audit.service';
import { CatalogService } from '../catalog/catalog.service';
import { PlanLifecycleRepository } from './plan-lifecycle.repository';

/** Судьба остатка кредитов при смене тарифа (§2.4 — выбор ОБЯЗАТЕЛЕН). */
export type CreditMode = 'RESET' | 'CARRY_OVER';

export interface ActivatePackArgs {
  organizationId: string;
  planKey: PlanKey;
  /** Заказ-основание (MANUAL-оплата S-4 или будущий чекаут); null для comp-выдачи. */
  orderId?: string | null;
  /**
   * Судьба остатка при живом пакете (§2.4). Обязателен, если ACTIVE-пакет
   * существует; для продления того же тарифа политика §2.1 — всегда RESET.
   */
  creditMode?: CreditMode;
  actor: { id: string; email?: string | null };
  now?: Date;
}

/**
 * Жизненный цикл пакетов (M-2): активация, продление (§2.1 — кредиты
 * СБРАСЫВАЮТСЯ каждый период), смена тарифа (§2.4 — явный выбор
 * RESET | CARRY_OVER, перенос остатка 1:1 отдельной append-only
 * корректировкой). Всё в одной транзакции с аудитом PLAN_ASSIGN /
 * PLAN_SWITCH (S-12, extra.creditMode).
 */
@Injectable()
export class PlanLifecycleService {
  constructor(
    private readonly lifecycleRepository: PlanLifecycleRepository,
    private readonly catalogService: CatalogService,
    private readonly adminAudit: AdminAuditService,
  ) {}

  async activatePack(args: ActivatePackArgs): Promise<PlanPurchase> {
    const now = args.now ?? new Date();
    const plan = await this.catalogService.requirePlan(args.planKey);

    return this.lifecycleRepository.runInTransaction(async (tx) => {
      const current = await this.lifecycleRepository.findActivePurchase(
        tx,
        args.organizationId,
      );

      const isRenewal = current?.planKeySnapshot === args.planKey;
      // §2.1: продление того же тарифа ВСЕГДА сбрасывает кредиты (без переноса).
      // §2.4: смена тарифа требует явного выбора.
      const creditMode: CreditMode = isRenewal
        ? 'RESET'
        : (args.creditMode ?? 'RESET');
      if (current && !isRenewal && !args.creditMode) {
        throw new BadRequestException(
          'PLAN_SWITCH требует явного creditMode (RESET | CARRY_OVER) — §2.4',
        );
      }

      const carried =
        current && creditMode === 'CARRY_OVER'
          ? Math.max(current.eventCreditsRemaining, 0)
          : 0;

      const purchase = await this.lifecycleRepository.createActivePurchase(tx, {
        organizationId: args.organizationId,
        plan,
        orderId: args.orderId ?? null,
        activatedAt: now,
        expiresAt: plan.validityDays
          ? new Date(now.getTime() + plan.validityDays * 24 * 60 * 60 * 1000)
          : null,
        initialCredits: plan.eventCredits + carried,
      });

      if (current) {
        await this.lifecycleRepository.supersede(tx, current.id, purchase.id, now);
        if (carried > 0) {
          await this.lifecycleRepository.addCreditAdjustment(tx, {
            organizationId: args.organizationId,
            planPurchaseId: purchase.id,
            delta: carried,
            kind: PlanCreditAdjustmentKind.CARRY_OVER,
            createdByAdminId: args.actor.id,
          });
        }
      }

      await this.adminAudit.record(
        {
          action: current ? 'PLAN_SWITCH' : 'PLAN_ASSIGN',
          actorId: args.actor.id,
          actorEmail: args.actor.email,
          targetType: 'ORGANIZATION',
          targetId: args.organizationId,
          before: current
            ? {
                planKey: current.planKeySnapshot,
                eventCreditsRemaining: current.eventCreditsRemaining,
              }
            : undefined,
          after: {
            planKey: plan.key,
            eventCreditsRemaining: purchase.eventCreditsRemaining,
            expiresAt: purchase.expiresAt?.toISOString() ?? null,
          },
          extra: { creditMode, renewal: isRenewal, orderId: args.orderId ?? null },
        },
        tx,
      );

      return purchase;
    });
  }

  /** S-3: продлить период живого пакета на N дней (append-only семантика — только сдвиг expiresAt, аудит PLAN_EXTEND). */
  async extendActivePack(args: {
    organizationId: string;
    days: number;
    reason?: string | null;
    actor: { id: string; email?: string | null };
  }): Promise<PlanPurchase> {
    const now = new Date();
    return this.lifecycleRepository.runInTransaction(async (tx) => {
      const current = await this.lifecycleRepository.findActivePurchase(
        tx,
        args.organizationId,
      );
      if (!current) {
        throw new NotFoundException('У организации нет живого пакета');
      }
      const base = current.expiresAt && current.expiresAt > now ? current.expiresAt : now;
      const newExpiresAt = new Date(base.getTime() + args.days * 24 * 60 * 60 * 1000);
      const updated = await this.lifecycleRepository.extendExpiry(
        tx,
        current.id,
        newExpiresAt,
      );
      await this.adminAudit.record(
        {
          action: 'PLAN_EXTEND',
          actorId: args.actor.id,
          actorEmail: args.actor.email,
          targetType: 'ORGANIZATION',
          targetId: args.organizationId,
          reason: args.reason ?? null,
          before: { expiresAt: current.expiresAt?.toISOString() ?? null },
          after: { expiresAt: newExpiresAt.toISOString(), days: args.days },
        },
        tx,
      );
      return updated;
    });
  }

  /** S-3: принудительно истечь пакет (организация немедленно на START, §2.1-семантика). */
  async expireActivePack(args: {
    organizationId: string;
    reason: string;
    actor: { id: string; email?: string | null };
  }): Promise<PlanPurchase> {
    return this.lifecycleRepository.runInTransaction(async (tx) => {
      const current = await this.lifecycleRepository.findActivePurchase(
        tx,
        args.organizationId,
      );
      if (!current) {
        throw new NotFoundException('У организации нет живого пакета');
      }
      const updated = await this.lifecycleRepository.forceExpire(tx, current.id);
      await this.adminAudit.record(
        {
          action: 'PLAN_EXPIRE',
          actorId: args.actor.id,
          actorEmail: args.actor.email,
          targetType: 'ORGANIZATION',
          targetId: args.organizationId,
          reason: args.reason,
          before: {
            planKey: current.planKeySnapshot,
            expiresAt: current.expiresAt?.toISOString() ?? null,
          },
          after: { status: 'EXPIRED' },
        },
        tx,
      );
      return updated;
    });
  }

  /** S-3: корректировка кредитов (append-only ADMIN_ADJUST; отрицательная — guarded не ниже нуля). */
  async adjustCredits(args: {
    organizationId: string;
    delta: number;
    reason: string;
    actor: { id: string; email?: string | null };
  }): Promise<PlanPurchase> {
    if (args.delta === 0) {
      throw new BadRequestException('delta не может быть 0');
    }
    const now = new Date();
    return this.lifecycleRepository.runInTransaction(async (tx) => {
      const current = await this.lifecycleRepository.findActivePurchase(
        tx,
        args.organizationId,
      );
      if (!current) {
        throw new NotFoundException('У организации нет живого пакета');
      }
      const ok = await this.lifecycleRepository.adjustRemainingGuarded(
        tx,
        current.id,
        args.delta,
      );
      if (!ok) {
        throw new BadRequestException(
          'Отрицательная корректировка больше остатка кредитов',
        );
      }
      await this.lifecycleRepository.addCreditAdjustment(tx, {
        organizationId: args.organizationId,
        planPurchaseId: current.id,
        delta: args.delta,
        kind: PlanCreditAdjustmentKind.ADMIN_ADJUST,
        createdByAdminId: args.actor.id,
      });
      if (args.delta > 0) {
        await this.lifecycleRepository.reviveIfExhausted(tx, current.id, now);
      }
      await this.adminAudit.record(
        {
          action: 'PLAN_CREDIT_ADJUST',
          actorId: args.actor.id,
          actorEmail: args.actor.email,
          targetType: 'ORGANIZATION',
          targetId: args.organizationId,
          reason: args.reason,
          before: { eventCreditsRemaining: current.eventCreditsRemaining },
          after: {
            eventCreditsRemaining: current.eventCreditsRemaining + args.delta,
            delta: args.delta,
          },
        },
        tx,
      );
      const refreshed = await this.lifecycleRepository.findActivePurchase(
        tx,
        args.organizationId,
      );
      return refreshed ?? current;
    });
  }

}
