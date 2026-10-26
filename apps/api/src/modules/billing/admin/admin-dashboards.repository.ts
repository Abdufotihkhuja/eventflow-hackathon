import { Injectable } from '@nestjs/common';
import {
  AdminAuditLog,
  OrderStatus,
  PlanPurchaseStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Данные админ-дашбордов (S-9/S-10/S-13). Кросс-тенантные и платформенные
 * выборки — repository-слой; adminAuditLog/revenueEntry — платформенные
 * данные (документированные исключения tenant-guard).
 */
@Injectable()
export class AdminDashboardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** S-13: лента аудита с фильтрами. */
  async listAudit(args: {
    action?: string;
    targetId?: string;
    page: number;
    limit: number;
  }): Promise<{ data: AdminAuditLog[]; total: number }> {
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(args.action ? { action: args.action } : {}),
      ...(args.targetId ? { targetId: args.targetId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (args.page - 1) * args.limit,
        take: args.limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return { data, total };
  }

  /** S-10: агрегаты выручки по типу и каналу за период. */
  async revenueSummary(from: Date, to: Date) {
    const where = { occurredAt: { gte: from, lte: to } };
    const [byType, byChannel, total] = await Promise.all([
      this.prisma.revenueEntry.groupBy({
        by: ['type'],
        where,
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.revenueEntry.groupBy({
        by: ['channel'],
        where,
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.revenueEntry.aggregate({
        where,
        _sum: { amountMinor: true },
        _count: true,
      }),
    ]);
    return { byType, byChannel, total };
  }

  /** S-9: распределение живых пакетов по тарифам + всего организаций. */
  async planDistribution() {
    const [byPlan, totalOrgs, suspended] = await Promise.all([
      this.prisma.planPurchase.groupBy({
        by: ['planKeySnapshot'],
        where: { status: PlanPurchaseStatus.ACTIVE },
        _count: true,
      }),
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.organization.count({
        where: { deletedAt: null, suspendedAt: { not: null } },
      }),
    ]);
    return { byPlan, totalOrgs, suspended };
  }

  /** S-9: пакеты, истекающие в ближайшие N дней. */
  expiringPacks(now: Date, horizon: Date) {
    return this.prisma.planPurchase.findMany({
      where: {
        status: PlanPurchaseStatus.ACTIVE,
        expiresAt: { not: null, gt: now, lte: horizon },
      },
      select: {
        organizationId: true,
        planKeySnapshot: true,
        expiresAt: true,
        eventCreditsRemaining: true,
      },
      orderBy: { expiresAt: 'asc' },
      take: 100,
    });
  }

  /** S-9: количество необработанных заявок. */
  pendingRequestsCount(): Promise<number> {
    return this.prisma.order.count({
      where: { status: OrderStatus.REQUESTED },
    });
  }
}
