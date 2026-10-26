import { Injectable } from '@nestjs/common';
import {
  CoinLedgerEntry,
  CoinLedgerEntryKind,
  CoinMetric,
  Prisma,
} from '@prisma/client';
import { CoinLedgerRepository } from './coin-ledger.repository';

export interface CoinCreditArgs {
  organizationId: string;
  metric: CoinMetric;
  quantity: number;
  kind: Extract<CoinLedgerEntryKind, 'PURCHASE' | 'COMP_GRANT' | 'REVERSAL'>;
  orderId?: string | null;
  createdByAdminId?: string | null;
  reason?: string | null;
}

/**
 * Леджер монет (M-9, CR-14): append-only цепочка с balanceAfter под
 * advisory-lock'ом; SUM(delta) == последний balanceAfter — инвариант сверки.
 * Монеты бессрочны и переживают смену/истечение тарифа (OQ-5).
 * credit — пополнение (покупка пакета M-10, comp-грант S-7);
 * tryDebit — списание (переполнение квоты, E-12): либо целиком, либо отказ.
 */
@Injectable()
export class CoinLedgerService {
  constructor(private readonly ledgerRepository: CoinLedgerRepository) {}

  async credit(args: CoinCreditArgs): Promise<CoinLedgerEntry> {
    if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
      throw new Error('credit: quantity должен быть положительным целым');
    }
    return this.ledgerRepository.runInTransaction(async (tx) => {
      await this.ledgerRepository.lockChain(tx, args.organizationId, args.metric);
      const balance = await this.ledgerRepository.lastBalance(
        tx,
        args.organizationId,
        args.metric,
      );
      return this.ledgerRepository.appendEntry(tx, {
        organizationId: args.organizationId,
        metric: args.metric,
        delta: args.quantity,
        balanceAfter: balance + args.quantity,
        kind: args.kind,
        orderId: args.orderId ?? null,
        createdByAdminId: args.createdByAdminId ?? null,
        reason: args.reason ?? null,
      });
    });
  }

  /** Пополнение в рамках УЖЕ открытой транзакции (M-10: оплата и начисление атомарны). */
  async creditInTx(
    tx: Prisma.TransactionClient,
    args: CoinCreditArgs,
  ): Promise<CoinLedgerEntry> {
    if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
      throw new Error('creditInTx: quantity должен быть положительным целым');
    }
    await this.ledgerRepository.lockChain(tx, args.organizationId, args.metric);
    const balance = await this.ledgerRepository.lastBalance(
      tx,
      args.organizationId,
      args.metric,
    );
    return this.ledgerRepository.appendEntry(tx, {
      organizationId: args.organizationId,
      metric: args.metric,
      delta: args.quantity,
      balanceAfter: balance + args.quantity,
      kind: args.kind,
      orderId: args.orderId ?? null,
      createdByAdminId: args.createdByAdminId ?? null,
      reason: args.reason ?? null,
    });
  }

  /**
   * Списание в рамках УЖЕ открытой транзакции метеринга (E-12: usage-событие
   * и проводка монет атомарны). Возвращает false, если баланса не хватает.
   */
  async tryDebitInTx(
    tx: Prisma.TransactionClient,
    args: {
      organizationId: string;
      metric: CoinMetric;
      quantity: number;
      usageEventId: string;
    },
  ): Promise<boolean> {
    await this.ledgerRepository.lockChain(tx, args.organizationId, args.metric);
    const balance = await this.ledgerRepository.lastBalance(
      tx,
      args.organizationId,
      args.metric,
    );
    if (balance < args.quantity) return false;
    await this.ledgerRepository.appendEntry(tx, {
      organizationId: args.organizationId,
      metric: args.metric,
      delta: -args.quantity,
      balanceAfter: balance - args.quantity,
      kind: CoinLedgerEntryKind.CONSUMPTION,
      usageEventId: args.usageEventId,
    });
    return true;
  }

  balances(organizationId: string) {
    return this.ledgerRepository.balances(organizationId);
  }

  listEntries(organizationId: string, take?: number) {
    return this.ledgerRepository.listEntries(organizationId, take);
  }
}
