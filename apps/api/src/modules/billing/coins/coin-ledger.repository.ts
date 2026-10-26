import { Injectable } from '@nestjs/common';
import {
  CoinLedgerEntry,
  CoinLedgerEntryKind,
  CoinMetric,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Персистентная механика леджера монет (M-9/D-8, CR-14).
 *
 * Цепочка balanceAfter требует сериализации на (организация, метрика):
 * два конкурентных списания, прочитавших один баланс, породили бы
 * рассинхрон SUM(delta) ≠ balanceAfter. Транзакционный advisory-lock
 * Postgres (pg_advisory_xact_lock) сериализует запись цепочки дешевле
 * SERIALIZABLE-изоляции; CHECK(balance_after >= 0) — страховка БД.
 */
@Injectable()
export class CoinLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Сериализация цепочки: взять advisory-lock на (org, metric) до конца tx. */
  async lockChain(
    tx: Prisma.TransactionClient,
    organizationId: string,
    metric: CoinMetric,
  ): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':' || ${metric}))`;
  }

  async lastBalance(
    tx: Prisma.TransactionClient,
    organizationId: string,
    metric: CoinMetric,
  ): Promise<number> {
    const last = await tx.coinLedgerEntry.findFirst({
      where: { organizationId, metric },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    return last?.balanceAfter ?? 0;
  }

  appendEntry(
    tx: Prisma.TransactionClient,
    data: {
      organizationId: string;
      metric: CoinMetric;
      delta: number;
      balanceAfter: number;
      kind: CoinLedgerEntryKind;
      orderId?: string | null;
      usageEventId?: string | null;
      createdByAdminId?: string | null;
      reason?: string | null;
    },
  ): Promise<CoinLedgerEntry> {
    return tx.coinLedgerEntry.create({ data });
  }

  /** Балансы кошелька (по последней записи каждой метрики). */
  async balances(
    organizationId: string,
  ): Promise<Record<CoinMetric, number>> {
    const [ai, gen] = await Promise.all([
      this.prisma.coinLedgerEntry.findFirst({
        where: { organizationId, metric: CoinMetric.AI_SECONDS },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      }),
      this.prisma.coinLedgerEntry.findFirst({
        where: { organizationId, metric: CoinMetric.GENERATION_UNITS },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      }),
    ]);
    return {
      [CoinMetric.AI_SECONDS]: ai?.balanceAfter ?? 0,
      [CoinMetric.GENERATION_UNITS]: gen?.balanceAfter ?? 0,
    };
  }

  listEntries(
    organizationId: string,
    take = 100,
  ): Promise<CoinLedgerEntry[]> {
    return this.prisma.coinLedgerEntry.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
