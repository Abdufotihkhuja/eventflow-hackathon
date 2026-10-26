import { Injectable, NotFoundException } from '@nestjs/common';
import { Plan, PlanKey } from '@prisma/client';
import { CatalogRepository } from './catalog.repository';
import { AddonSkuDto, BillingCatalogDto, PlanDto } from '../dto/catalog.dto';

/**
 * Каталог монетизации (M-1): тарифы §1 как данные.
 *
 * Публичная выборка — только активные строки (честная витрина: пока владелец
 * не установил цены в S-16, платные тарифы неактивны и наружу не отдаются;
 * публичная страница живёт на статическом снапшоте P-3a).
 * Кабинетная выборка — весь каталог с флагами: UI сам решает, что показать
 * (plans-tab + ManagedNotice до активации).
 */
@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async getPublicCatalog(): Promise<BillingCatalogDto> {
    const [plans, addons] = await Promise.all([
      this.catalogRepository.findPlans(),
      this.catalogRepository.findAddonSkus(),
    ]);
    return {
      plans: plans.filter((p) => p.isActive).map((p) => PlanDto.fromModel(p)),
      addons: addons.filter((a) => a.isActive).map((a) => AddonSkuDto.fromModel(a)),
    };
  }

  async getWorkspaceCatalog(): Promise<BillingCatalogDto> {
    const [plans, addons] = await Promise.all([
      this.catalogRepository.findPlans(),
      this.catalogRepository.findAddonSkus(),
    ]);
    return {
      plans: plans.map((p) => PlanDto.fromModel(p)),
      addons: addons.map((a) => AddonSkuDto.fromModel(a)),
    };
  }

  /** Строка каталога для покупки/активации; бросает 404, если тариф не заведён. */
  async requirePlan(key: PlanKey): Promise<Plan> {
    const plan = await this.catalogRepository.findPlanByKey(key);
    if (!plan) {
      throw new NotFoundException(`Тариф ${key} не найден в каталоге`);
    }
    return plan;
  }
}
