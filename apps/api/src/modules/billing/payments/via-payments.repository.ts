import { Injectable, Logger } from '@nestjs/common';
import {
  Order,
  OrderKind,
  OrderStatus,
  PaymentProvider,
  PaymentTransaction,
  PaymentTxStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Персистентный слой VIA-платежей (M-5). Все обращения к tenant-моделям
 * Order/PaymentTransaction — только отсюда (0.4 safety net): скоуп заказа —
 * владение покупателя (registration.userId), идемпотентность — unique
 * (provider, providerTxnId).
 */
@Injectable()
export class ViaPaymentsRepository {
  private readonly logger = new Logger(ViaPaymentsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Живая CREATED-транзакция VIA заказа (переиспользование инвойса). */
  findLiveCreatedTxn(orderId: string): Promise<PaymentTransaction | null> {
    return this.prisma.paymentTransaction.findFirst({
      where: {
        orderId,
        provider: PaymentProvider.VIA,
        status: PaymentTxStatus.CREATED,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Последняя VIA-транзакция заказа (для сверки статуса). */
  findLatestTxnForOrder(orderId: string): Promise<PaymentTransaction | null> {
    return this.prisma.paymentTransaction.findFirst({
      where: { orderId, provider: PaymentProvider.VIA },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Последний TICKET_SALE-заказ регистрации СВОЕГО покупателя (ownership-скоуп). */
  findBuyerTicketOrder(
    registrationId: string,
    userId: string,
  ): Promise<Order | null> {
    return this.prisma.order.findFirst({
      where: {
        registrationId,
        kind: OrderKind.TICKET_SALE,
        registration: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getOrderStatus(orderId: string): Promise<{ status: OrderStatus } | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
  }

  /** Транзакция по инвойсу VIA вместе с заказом (для webhook-триггера). */
  findTxnWithOrderByInvoiceId(
    invoiceId: string,
  ): Promise<
    | (PaymentTransaction & {
        order: { id: string; amountMinor: bigint; status: OrderStatus };
      })
    | null
  > {
    return this.prisma.paymentTransaction.findFirst({
      where: { provider: PaymentProvider.VIA, providerTxnId: invoiceId },
      include: {
        order: { select: { id: true, amountMinor: true, status: true } },
      },
    });
  }

  /** Заказ для сверки по externalId из уведомления (externalId = наш orderId). */
  getOrderForSettle(
    orderId: string,
  ): Promise<{ id: string; amountMinor: bigint; status: OrderStatus } | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, amountMinor: true, status: true },
    });
  }

  /** «Зависшие» CREATED-транзакции VIA с ещё ожидающими оплату заказами. */
  findStalePendingTxns(
    createdBefore: Date,
    batch: number,
  ): Promise<Array<PaymentTransaction & { order: { id: string; amountMinor: bigint } }>> {
    return this.prisma.paymentTransaction.findMany({
      where: {
        provider: PaymentProvider.VIA,
        status: PaymentTxStatus.CREATED,
        createdAt: { lte: createdBefore },
        order: { status: OrderStatus.PENDING_PAYMENT },
      },
      orderBy: { createdAt: 'asc' },
      take: batch,
      include: { order: { select: { id: true, amountMinor: true } } },
    });
  }

  /**
   * Идемпотентная фиксация созданного инвойса: гонка двойного клика гасится
   * unique (provider, providerTxnId) — повтор P2002 = no-op.
   */
  async createTxnIdempotent(data: {
    orderId: string;
    providerTxnId: string;
    amountMinor: bigint;
    payloadScrubbed: Record<string, string | number | boolean | null>;
  }): Promise<void> {
    try {
      await this.prisma.paymentTransaction.create({
        data: {
          orderId: data.orderId,
          provider: PaymentProvider.VIA,
          providerTxnId: data.providerTxnId,
          status: PaymentTxStatus.CREATED,
          amountMinor: data.amountMinor,
          payloadScrubbed: data.payloadScrubbed,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          `VIA: повторная фиксация инвойса ${data.providerTxnId} — идемпотентный no-op`,
        );
        return;
      }
      throw error;
    }
  }

  /** CREATED → CONFIRMED (или FAILED); guarded update — идемпотентно по статусу. */
  async settleTxn(
    txnId: string,
    status: typeof PaymentTxStatus.CONFIRMED | typeof PaymentTxStatus.FAILED,
    payloadScrubbed: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    await this.prisma.paymentTransaction.updateMany({
      where: { id: txnId, status: PaymentTxStatus.CREATED },
      data: {
        status,
        confirmedAt: status === PaymentTxStatus.CONFIRMED ? new Date() : null,
        payloadScrubbed,
      },
    });
  }
}
