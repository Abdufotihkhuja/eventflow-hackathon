import { Injectable } from '@nestjs/common';
import {
  Currency,
  Prisma,
  RevenueChannel,
  RevenueEntry,
  RevenueType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface RecordRevenueArgs {
  /** FK-less ссылка на организацию (переживает hard-delete, D-16). */
  organizationRef: string;
  organizationLabel?: string | null;
  type: RevenueType;
  channel: RevenueChannel;
  /** Знаковые минорные единицы: REFUND < 0, остальное > 0 (ADJUSTMENT — любой знак). */
  amountMinor: bigint;
  currency?: Currency;
  /** orderId / providerTxnId / planPurchaseId. */
  sourceRef?: string | null;
  occurredAt?: Date;
}

/**
 * Запись выручки платформы (M-15): КАЖДОЕ денежное событие — плановый платёж,
 * комиссия, пакет монет, реклама, возврат — порождает ровно одну строку
 * RevenueEntry. Пишется В ТОЙ ЖЕ транзакции, что и денежная мутация
 * (передавайте tx). Читатели: S-10 (админ-дашборды выручки), delete-preview.
 */
@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    args: RecordRevenueArgs,
    tx?: Prisma.TransactionClient,
  ): Promise<RevenueEntry> {
    this.assertSign(args.type, args.amountMinor);
    const db = tx ?? this.prisma;
    return db.revenueEntry.create({
      data: {
        organizationRef: args.organizationRef,
        organizationLabel: args.organizationLabel ?? null,
        type: args.type,
        channel: args.channel,
        amountMinor: args.amountMinor,
        currency: args.currency ?? Currency.UZS,
        sourceRef: args.sourceRef ?? null,
        ...(args.occurredAt ? { occurredAt: args.occurredAt } : {}),
      },
    });
  }

  /** Ограждение знаков: REFUND строго отрицателен, доходы строго положительны. */
  private assertSign(type: RevenueType, amountMinor: bigint): void {
    if (type === RevenueType.ADJUSTMENT) return;
    if (type === RevenueType.REFUND) {
      if (amountMinor >= 0n) {
        throw new Error('RevenueEntry REFUND должен быть отрицательным (M-15)');
      }
      return;
    }
    if (amountMinor <= 0n) {
      throw new Error(`RevenueEntry ${type} должен быть положительным (M-15)`);
    }
  }
}
