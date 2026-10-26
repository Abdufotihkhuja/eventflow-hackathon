import { Injectable } from '@nestjs/common';
import { AddonSku, Plan, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Каталог тарифов и add-on SKU (M-1). Глобальные (не tenant) модели —
 * organizationId-скоупинг не применяется.
 */
@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  findPlanByKey(key: Plan['key']): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { key } });
  }

  findAddonSkus(): Promise<AddonSku[]> {
    return this.prisma.addonSku.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  /** S-16: правка каталожной строки тарифа (цены/активация). */
  updatePlan(key: Plan['key'], data: Prisma.PlanUpdateInput): Promise<Plan> {
    return this.prisma.plan.update({ where: { key }, data });
  }

  findAddonSkuByCode(code: string): Promise<AddonSku | null> {
    return this.prisma.addonSku.findUnique({ where: { code } });
  }

  /** S-16: правка add-on SKU. */
  updateAddonSku(code: string, data: Prisma.AddonSkuUpdateInput): Promise<AddonSku> {
    return this.prisma.addonSku.update({ where: { code }, data });
  }
}
