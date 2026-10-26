import { Injectable } from '@nestjs/common';
import {
  EventCreditConsumption,
  PlanCreditAdjustmentKind,
  PlanPurchase,
  PlanPurchaseStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const P2002 = 'P2002';

/** Персистентная механика кредитов событий (E-16). */
@Injectable()
export class EventCreditsRepository {
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

  /**
   * Guarded-декремент остатка: проходит только при remaining >= 1 (гонка на
   * последнем кредите решается БД). true — кредит списан.
   */
  async decrementRemainingGuarded(
    tx: Prisma.TransactionClient,
    purchaseId: string,
  ): Promise<boolean> {
    const updated = await tx.planPurchase.updateMany({
      where: { id: purchaseId, eventCreditsRemaining: { gte: 1 } },
      data: { eventCreditsRemaining: { decrement: 1 } },
    });
    return updated.count > 0;
  }

  /** Если после списания остаток 0 — пакет исчерпан (тариф падает к START, M-3). */
  async markExhaustedIfEmpty(
    tx: Prisma.TransactionClient,
    purchaseId: string,
  ): Promise<void> {
    await tx.planPurchase.updateMany({
      where: {
        id: purchaseId,
        status: PlanPurchaseStatus.ACTIVE,
        eventCreditsRemaining: 0,
      },
      data: { status: PlanPurchaseStatus.EXHAUSTED },
    });
  }

  /** Идемпотентная запись потребления: null при повторе (unique(eventId)). */
  async createConsumptionIfAbsent(
    tx: Prisma.TransactionClient,
    args: { organizationId: string; planPurchaseId: string; eventId: string },
  ): Promise<{ id: string } | null> {
    try {
      return await tx.eventCreditConsumption.create({
        data: args,
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === P2002
      ) {
        return null;
      }
      throw error;
    }
  }

  findConsumptionByEvent(
    tx: Prisma.TransactionClient,
    eventId: string,
  ): Promise<EventCreditConsumption | null> {
    return tx.eventCreditConsumption.findUnique({ where: { eventId } });
  }

  /** Возврат кредита (B-1): помечает refundedAt, возвращает остаток, оживляет EXHAUSTED-пакет. */
  async refund(
    tx: Prisma.TransactionClient,
    consumption: EventCreditConsumption,
    now: Date,
  ): Promise<void> {
    await tx.eventCreditConsumption.update({
      where: { id: consumption.id },
      data: { refundedAt: now },
    });
    await tx.planPurchase.update({
      where: { id: consumption.planPurchaseId },
      data: { eventCreditsRemaining: { increment: 1 } },
    });
    await tx.planCreditAdjustment.create({
      data: {
        organizationId: consumption.organizationId,
        planPurchaseId: consumption.planPurchaseId,
        delta: 1,
        kind: PlanCreditAdjustmentKind.REFUND,
        createdByAdminId: null,
      },
    });
    // EXHAUSTED → ACTIVE, если пакет не истёк по времени.
    await tx.planPurchase.updateMany({
      where: {
        id: consumption.planPurchaseId,
        status: PlanPurchaseStatus.EXHAUSTED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { status: PlanPurchaseStatus.ACTIVE },
    });
  }
}
