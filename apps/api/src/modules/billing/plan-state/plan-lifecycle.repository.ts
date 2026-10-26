import { Injectable } from '@nestjs/common';
import {
  Plan,
  PlanCreditAdjustmentKind,
  PlanPurchase,
  PlanPurchaseStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Персистентная механика жизненного цикла пакетов (M-2). */
@Injectable()
export class PlanLifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findActivePurchase(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<PlanPurchase | null> {
    return tx.planPurchase.findFirst({
      where: { organizationId, status: PlanPurchaseStatus.ACTIVE },
      orderBy: { activatedAt: 'desc' },
    });
  }

  createActivePurchase(
    tx: Prisma.TransactionClient,
    args: {
      organizationId: string;
      plan: Plan;
      orderId: string | null;
      activatedAt: Date;
      expiresAt: Date | null;
      initialCredits: number;
    },
  ): Promise<PlanPurchase> {
    const { plan } = args;
    return tx.planPurchase.create({
      data: {
        organizationId: args.organizationId,
        planId: plan.id,
        orderId: args.orderId,
        status: PlanPurchaseStatus.ACTIVE,
        planKeySnapshot: plan.key,
        priceAmountMinorSnapshot: plan.priceAmountMinor,
        commissionBpsSnapshot: plan.commissionBps,
        eventCreditsGranted: plan.eventCredits,
        eventCreditsRemaining: args.initialCredits,
        aiMinutesMonthlySnapshot: plan.aiMinutesMonthly,
        generationCreditsSnapshot: plan.generationCredits,
        generationWindowSnapshot: plan.generationWindow,
        staffSeatsSnapshot: plan.staffSeats,
        maxParticipantsSnapshot: plan.maxParticipantsPerEvent,
        taskBoardEnabledSnapshot: plan.taskBoardEnabled,
        statsTierSnapshot: plan.statsTier,
        qrModeSnapshot: plan.qrMode,
        validityDaysSnapshot: plan.validityDays,
        activatedAt: args.activatedAt,
        expiresAt: args.expiresAt,
      },
    });
  }

  supersede(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    supersededById: string,
    at: Date,
  ): Promise<PlanPurchase> {
    return tx.planPurchase.update({
      where: { id: purchaseId },
      data: {
        status: PlanPurchaseStatus.SUPERSEDED,
        supersededAt: at,
        supersededById,
      },
    });
  }

  /** S-3: сдвиг конца периода ACTIVE-пакета. */
  extendExpiry(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    newExpiresAt: Date,
  ): Promise<PlanPurchase> {
    return tx.planPurchase.update({
      where: { id: purchaseId },
      data: { expiresAt: newExpiresAt },
    });
  }

  /** S-3: принудительное истечение (возврат организации на START немедленно). */
  forceExpire(
    tx: Prisma.TransactionClient,
    purchaseId: string,
  ): Promise<PlanPurchase> {
    return tx.planPurchase.update({
      where: { id: purchaseId },
      data: { status: PlanPurchaseStatus.EXPIRED },
    });
  }

  /** S-3: корректировка остатка кредитов (guarded — не ниже нуля). */
  async adjustRemainingGuarded(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    delta: number,
  ): Promise<boolean> {
    const updated = await tx.planPurchase.updateMany({
      where: {
        id: purchaseId,
        ...(delta < 0 ? { eventCreditsRemaining: { gte: -delta } } : {}),
      },
      data: { eventCreditsRemaining: { increment: delta } },
    });
    return updated.count > 0;
  }

  /** Оживление EXHAUSTED-пакета после положительной корректировки (не истёкшего). */
  async reviveIfExhausted(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    now: Date,
  ): Promise<void> {
    await tx.planPurchase.updateMany({
      where: {
        id: purchaseId,
        status: PlanPurchaseStatus.EXHAUSTED,
        eventCreditsRemaining: { gte: 1 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { status: PlanPurchaseStatus.ACTIVE },
    });
  }

  addCreditAdjustment(
    tx: Prisma.TransactionClient,
    args: {
      organizationId: string;
      planPurchaseId: string;
      delta: number;
      kind: PlanCreditAdjustmentKind;
      createdByAdminId: string | null;
    },
  ): Promise<void> {
    return tx.planCreditAdjustment
      .create({ data: args })
      .then(() => undefined);
  }
}
