import { Injectable } from '@nestjs/common';
import {
  Order,
  OrderKind,
  OrderStatus,
  Prisma,
  RegistrationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Персистентная механика продажи билетов (M-4). Repository-слой. */
@Injectable()
export class TicketingRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Регистрация покупателя с событием (для валидации и суммы). */
  findRegistrationForCheckout(tx: Prisma.TransactionClient, registrationId: string, userId: string) {
    return tx.registration.findFirst({
      where: { id: registrationId, userId },
      include: {
        event: {
          select: {
            id: true,
            organizationId: true,
            type: true,
            price: true,
            currency: true,
            status: true,
            title: true,
          },
        },
      },
    });
  }

  /** Живой (не истёкший) заказ на эту регистрацию (partial-unique + hold). */
  findLiveOrderForRegistration(
    tx: Prisma.TransactionClient,
    registrationId: string,
    now: Date,
  ): Promise<Order | null> {
    return tx.order.findFirst({
      where: {
        registrationId,
        kind: OrderKind.TICKET_SALE,
        OR: [
          { status: OrderStatus.PAID },
          {
            status: OrderStatus.PENDING_PAYMENT,
            holdExpiresAt: { gt: now },
          },
        ],
      },
    });
  }

  /** Протухшие PENDING_PAYMENT-заказы регистрации → EXPIRED (снятие брони). */
  async expireStaleOrders(
    tx: Prisma.TransactionClient,
    registrationId: string,
    now: Date,
  ): Promise<void> {
    await tx.order.updateMany({
      where: {
        registrationId,
        kind: OrderKind.TICKET_SALE,
        status: OrderStatus.PENDING_PAYMENT,
        holdExpiresAt: { lte: now },
      },
      data: { status: OrderStatus.EXPIRED, registrationId: null },
    });
  }

  createTicketOrder(
    tx: Prisma.TransactionClient,
    data: Prisma.OrderUncheckedCreateInput,
  ): Promise<Order> {
    return tx.order.create({ data });
  }

  /** Подтверждение оплаты: заказ PAID + регистрация APPROVED (идемпотентно по статусу). */
  async confirmPaid(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<Order | null> {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: OrderStatus.PENDING_PAYMENT },
      data: { status: OrderStatus.PAID },
    });
    if (updated.count === 0) return null;
    const order = await tx.order.findFirst({ where: { id: orderId } });
    if (order?.registrationId) {
      await tx.registration.updateMany({
        where: {
          id: order.registrationId,
          status: RegistrationStatus.PENDING,
        },
        data: { status: RegistrationStatus.APPROVED },
      });
    }
    return order;
  }
}
