import { Injectable } from '@nestjs/common';
import { PlanPurchase, PlanPurchaseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Доступ к состоянию пакетов организации (M-3). Tenant-скоупинг —
 * organizationId обязательным параметром метода (конвенция репозиториев).
 */
@Injectable()
export class PlanStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Текущий ACTIVE-пакет организации (по бизнес-правилу он один — OQ-A1-2/§2.4). */
  findActivePurchase(organizationId: string): Promise<PlanPurchase | null> {
    return this.prisma.planPurchase.findFirst({
      where: { organizationId, status: PlanPurchaseStatus.ACTIVE },
      orderBy: { activatedAt: 'desc' },
    });
  }

  /**
   * Ленивая фиксация истечения (CR-6): переводит ACTIVE→EXPIRED, только если
   * срок действительно вышел (guarded update — гонка двух читателей безопасна).
   * Возвращает количество обновлённых строк.
   */
  async markExpiredIfDue(purchaseId: string, now: Date): Promise<number> {
    const result = await this.prisma.planPurchase.updateMany({
      where: {
        id: purchaseId,
        status: PlanPurchaseStatus.ACTIVE,
        expiresAt: { not: null, lte: now },
      },
      data: { status: PlanPurchaseStatus.EXPIRED },
    });
    return result.count;
  }
}
