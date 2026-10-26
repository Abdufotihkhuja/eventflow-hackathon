import { Injectable } from '@nestjs/common';
import { PlanPurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/** Персистентная механика свипа (E-11b). Кросс-тенантные запросы — repository-слой. */
@Injectable()
export class BillingSweepRepository {
  constructor(private readonly prisma: PrismaService) {}

  async expireDue(now: Date): Promise<number> {
    const result = await this.prisma.planPurchase.updateMany({
      where: {
        status: PlanPurchaseStatus.ACTIVE,
        expiresAt: { not: null, lte: now },
      },
      data: { status: PlanPurchaseStatus.EXPIRED },
    });
    return result.count;
  }

  findExpiringWithin(now: Date, horizon: Date) {
    return this.prisma.planPurchase.findMany({
      where: {
        status: PlanPurchaseStatus.ACTIVE,
        expiresAt: { not: null, gt: now, lte: horizon },
      },
      select: {
        id: true,
        planKeySnapshot: true,
        expiresAt: true,
        organization: { select: { email: true } },
      },
    });
  }
}
