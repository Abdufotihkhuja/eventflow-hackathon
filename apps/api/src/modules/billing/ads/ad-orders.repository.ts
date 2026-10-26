import { Injectable } from '@nestjs/common';
import { AdOrder, AdOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Персистентная механика рекламных размещений (D-10/M-11/S-11). */
@Injectable()
export class AdOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Событие организации (tenant-скоуп параметром). */
  findOrgEvent(organizationId: string, eventId: string) {
    return this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
      select: { id: true, title: true },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.AdOrderUncheckedCreateInput,
  ): Promise<AdOrder> {
    return tx.adOrder.create({ data });
  }

  /** Featured-флаг события — существующий публичный механизм витрины. */
  async setEventFeatured(
    tx: Prisma.TransactionClient,
    eventId: string,
    featured: boolean,
  ): Promise<void> {
    await tx.event.updateMany({
      where: { id: eventId },
      data: { isFeatured: featured },
    });
  }

  listAll(take = 200): Promise<AdOrder[]> {
    return this.prisma.adOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /** Свип (S-11-auto): просроченные ACTIVE-размещения с событием. */
  findExpiredActive(now: Date): Promise<AdOrder[]> {
    return this.prisma.adOrder.findMany({
      where: {
        status: AdOrderStatus.ACTIVE,
        placementEnd: { not: null, lte: now },
      },
      take: 200,
    });
  }

  async markExpired(
    tx: Prisma.TransactionClient,
    adOrderId: string,
  ): Promise<void> {
    await tx.adOrder.updateMany({
      where: { id: adOrderId, status: AdOrderStatus.ACTIVE },
      data: { status: AdOrderStatus.EXPIRED },
    });
  }

  /** Есть ли другое живое размещение на это событие (не снимать featured зря). */
  async hasOtherActivePlacement(
    tx: Prisma.TransactionClient,
    eventId: string,
    exceptAdOrderId: string,
  ): Promise<boolean> {
    const count = await tx.adOrder.count({
      where: {
        eventId,
        status: AdOrderStatus.ACTIVE,
        id: { not: exceptAdOrderId },
      },
    });
    return count > 0;
  }
}
