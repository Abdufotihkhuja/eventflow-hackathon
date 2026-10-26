import { Injectable } from '@nestjs/common';
import { CoinMetric, DrainSource, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const P2002 = 'P2002';

/**
 * Персистентная механика метеринга (E-10). Все обращения к tenant-моделям
 * usageEvent/usageCounter живут здесь (repository-слой) и принимают
 * organizationId явным параметром.
 */
@Injectable()
export class QuotaRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Идемпотентная запись потребления: при повторном idempotencyKey возвращает
   * null (уже учтено), не бросая — это штатный ретрай/повторный рендер (PC-8).
   */
  async createUsageEventIfAbsent(
    tx: Prisma.TransactionClient,
    data: {
      organizationId: string;
      metric: CoinMetric;
      quantity: number;
      idempotencyKey: string;
      periodKey: string;
      drainSource: DrainSource;
      planPurchaseId: string | null;
      eventId: string | null;
    },
  ): Promise<{ id: string } | null> {
    try {
      const created = await tx.usageEvent.create({
        data,
        select: { id: true },
      });
      return created;
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

  /**
   * Атомарный guarded-инкремент счётчика окна: инкремент проходит ТОЛЬКО если
   * used + quantity <= limit (условие в WHERE — гонка двух конкурентных
   * потреблений на последней единице разрешается БД). Возвращает true при
   * успехе; false — лимит не позволяет.
   */
  async incrementCounterGuarded(
    tx: Prisma.TransactionClient,
    args: {
      organizationId: string;
      metric: CoinMetric;
      periodKey: string;
      quantity: number;
      limit: number;
    },
  ): Promise<boolean> {
    const { organizationId, metric, periodKey, quantity, limit } = args;

    const updated = await tx.usageCounter.updateMany({
      where: {
        organizationId,
        metric,
        periodKey,
        used: { lte: limit - quantity },
      },
      data: { used: { increment: quantity } },
    });
    if (updated.count > 0) return true;

    // Либо строки окна ещё нет, либо лимит не позволяет.
    const existing = await tx.usageCounter.findFirst({
      where: { organizationId, metric, periodKey },
      select: { id: true },
    });
    if (existing) return false; // строка есть → guarded-инкремент отказал по лимиту

    if (quantity > limit) return false;
    try {
      await tx.usageCounter.create({
        data: { organizationId, metric, periodKey, used: quantity },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === P2002
      ) {
        // Конкурент создал строку между findFirst и create — один ретрай guarded-инкремента.
        const retry = await tx.usageCounter.updateMany({
          where: {
            organizationId,
            metric,
            periodKey,
            used: { lte: limit - quantity },
          },
          data: { used: { increment: quantity } },
        });
        return retry.count > 0;
      }
      throw error;
    }
  }

  /** E-12: пометить только что созданное событие списанием из монет. */
  async markEventCoinDrained(
    tx: Prisma.TransactionClient,
    usageEventId: string,
  ): Promise<void> {
    await tx.usageEvent.updateMany({
      where: { id: usageEventId },
      data: { drainSource: DrainSource.COIN },
    });
  }

  /** Текущее потребление окна (для превью и текста ошибки). */
  async getUsed(
    organizationId: string,
    metric: CoinMetric,
    periodKey: string,
  ): Promise<number> {
    const counter = await this.prisma.usageCounter.findFirst({
      where: { organizationId, metric, periodKey },
      select: { used: true },
    });
    return counter?.used ?? 0;
  }
}
