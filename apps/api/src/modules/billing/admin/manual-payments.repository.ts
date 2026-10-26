import { Injectable } from '@nestjs/common';
import {
  Currency,
  Order,
  OrderKind,
  OrderStatus,
  PaymentProvider,
  PaymentTransaction,
  PaymentTxStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Персистентная механика ручных платежей (S-4). Repository-слой (tenant guard). */
@Injectable()
export class ManualPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findOrgOrder(
    tx: Prisma.TransactionClient,
    organizationId: string,
    orderId: string,
  ): Promise<Order | null> {
    return tx.order.findFirst({ where: { id: orderId, organizationId } });
  }

  markOrderPaid(
    tx: Prisma.TransactionClient,
    orderId: string,
    amountMinor: bigint,
    currency: Currency,
  ): Promise<Order> {
    return tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID, amountMinor, currency },
    });
  }

  createPaidStandaloneOrder(
    tx: Prisma.TransactionClient,
    args: {
      organizationId: string;
      kind: OrderKind;
      amountMinor: bigint;
      currency: Currency;
    },
  ): Promise<{ id: string }> {
    return tx.order.create({
      data: {
        organizationId: args.organizationId,
        kind: args.kind,
        status: OrderStatus.PAID,
        amountMinor: args.amountMinor,
        currency: args.currency,
      },
      select: { id: true },
    });
  }

  findAddonSku(tx: Prisma.TransactionClient, skuId: string) {
    return tx.addonSku.findUnique({
      where: { id: skuId },
      select: { coinMetric: true, coinQuantity: true, kind: true },
    });
  }

  createConfirmedManualTransaction(
    tx: Prisma.TransactionClient,
    args: {
      orderId: string;
      externalRef: string;
      amountMinor: bigint;
      currency: Currency;
    },
  ): Promise<PaymentTransaction> {
    return tx.paymentTransaction.create({
      data: {
        orderId: args.orderId,
        provider: PaymentProvider.MANUAL,
        providerTxnId: args.externalRef,
        status: PaymentTxStatus.CONFIRMED,
        amountMinor: args.amountMinor,
        currency: args.currency,
        confirmedAt: new Date(),
      },
    });
  }

  findTransactionWithOrg(
    tx: Prisma.TransactionClient,
    transactionId: string,
  ): Promise<
    (PaymentTransaction & { order: { organizationId: string } }) | null
  > {
    return tx.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { order: { select: { organizationId: true } } },
    });
  }

  markReversed(
    tx: Prisma.TransactionClient,
    transactionId: string,
  ): Promise<PaymentTransaction> {
    return tx.paymentTransaction.update({
      where: { id: transactionId },
      data: { status: PaymentTxStatus.REVERSED },
    });
  }
}
