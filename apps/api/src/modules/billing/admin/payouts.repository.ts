import { Injectable } from '@nestjs/common';
import {
  Currency,
  OrderKind,
  OrderStatus,
  Payout,
  PayoutStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface OwedRow {
  organizationId: string;
  /** Тело проданных билетов минус комиссия платформы (тийины). */
  grossMinor: bigint;
  commissionMinor: bigint;
  paidOutMinor: bigint;
  owedMinor: bigint;
}

/** Персистентная механика выплат (M-7). Repository-слой. */
@Injectable()
export class PayoutsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Сводка задолженности по организациям: PAID-билеты − комиссия − выплаты. */
  async owedByOrganization(): Promise<OwedRow[]> {
    const [sales, payouts] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['organizationId'],
        where: { kind: OrderKind.TICKET_SALE, status: OrderStatus.PAID },
        _sum: { amountMinor: true, commissionAmountMinor: true },
      }),
      this.prisma.payout.groupBy({
        by: ['organizationId'],
        _sum: { amountMinor: true },
      }),
    ]);
    const paidOut = new Map(
      payouts.map((p) => [p.organizationId, p._sum.amountMinor ?? 0n]),
    );
    return sales.map((s) => {
      const gross = s._sum.amountMinor ?? 0n;
      const commission = s._sum.commissionAmountMinor ?? 0n;
      const out = paidOut.get(s.organizationId) ?? 0n;
      return {
        organizationId: s.organizationId,
        grossMinor: gross,
        commissionMinor: commission,
        paidOutMinor: out,
        owedMinor: gross - commission - out,
      };
    });
  }

  listByOrganization(organizationId: string): Promise<Payout[]> {
    return this.prisma.payout.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createPaid(args: {
    organizationId: string;
    amountMinor: bigint;
    currency: Currency;
    externalRef: string;
    markedPaidById: string;
  }): Promise<Payout> {
    return this.prisma.payout.create({
      data: {
        organizationId: args.organizationId,
        amountMinor: args.amountMinor,
        currency: args.currency,
        status: PayoutStatus.PAID,
        externalRef: args.externalRef,
        markedPaidById: args.markedPaidById,
        markedPaidAt: new Date(),
      },
    });
  }
}
