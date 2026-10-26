import { Injectable } from '@nestjs/common';
import { Order, OrderKind, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Заказы биллинга (D-9/M-13). Tenant-скоуп — organizationId параметром. */
@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPendingRequest(
    organizationId: string,
    kind: OrderKind,
  ): Promise<Order | null> {
    return this.prisma.order.findFirst({
      where: { organizationId, kind, status: OrderStatus.REQUESTED },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: Prisma.OrderUncheckedCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  /** Кросс-тенантная очередь заявок для оператора (S-1/S-9). */
  listPendingAll(take = 200) {
    return this.prisma.order.findMany({
      where: { status: OrderStatus.REQUESTED },
      orderBy: { createdAt: 'asc' },
      take,
      include: {
        plan: { select: { key: true } },
        addonSku: { select: { code: true } },
      },
    });
  }

  listByOrganization(organizationId: string, take = 50) {
    return this.prisma.order.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        plan: { select: { key: true } },
        addonSku: { select: { code: true } },
      },
    });
  }
}
