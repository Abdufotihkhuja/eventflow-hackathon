import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CoinMetric } from '@prisma/client';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { CatalogService } from './catalog/catalog.service';
import { PlanStateService } from './plan-state/plan-state.service';
import { BillingCatalogDto } from './dto/catalog.dto';
import {
  ActivePlanPurchaseDto,
  BillingStatusDto,
} from './dto/billing-status.dto';
import { EntitlementsDto } from './dto/entitlements.dto';
import {
  BillingOrderDto,
  CreateBillingRequestDto,
} from './dto/billing-request.dto';
import { BillingRequestsService } from './orders/billing-requests.service';
import { CoinLedgerService } from './coins/coin-ledger.service';
import { EntitlementsService } from './entitlements/entitlements.service';
import { QuotaService } from './quota/quota.service';

/**
 * Кабинетный биллинг (префикс по D-11: /api/v1/billing). Гейт — существующие
 * seeded-права billing:view / billing:manage, до сих пор бывшие «сиротами».
 */
@ApiTags('billing')
@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkspaceBillingController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly planStateService: PlanStateService,
    private readonly entitlementsService: EntitlementsService,
    private readonly quotaService: QuotaService,
    private readonly billingRequests: BillingRequestsService,
    private readonly coinLedger: CoinLedgerService,
  ) {}

  @Get('plans')
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  @ApiOperation({
    summary: 'Каталог тарифов для кабинета организации',
    description:
      'Полный каталог (включая неактивные строки) с флагами isActive/isPurchasable — ' +
      'кабинет сам решает, что рендерить (plans-tab + managed-notice до активации цен).',
  })
  @ApiOkResponse({ type: BillingCatalogDto })
  getPlans(): Promise<BillingCatalogDto> {
    return this.catalogService.getWorkspaceCatalog();
  }

  @Get('status')
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  @ApiOperation({
    summary: 'Статус тарифа организации',
    description:
      'Текущий тариф по пакету (ленивое истечение фиксируется при чтении, CR-6) ' +
      'и живой пакет со снапшот-значениями. Эффективные значения с учётом ' +
      'оверрайдов — GET /billing/entitlements (E-14).',
  })
  @ApiOkResponse({ type: BillingStatusDto })
  async getStatus(@CurrentUser() user: ICurrentUser): Promise<BillingStatusDto> {
    const organizationId = this.planStateService.resolveOrganizationId(user);
    const state = await this.planStateService.getPlanState(organizationId);
    return {
      tierKey: state.tierKey,
      source: state.source,
      activePurchase: state.activePurchase
        ? ActivePlanPurchaseDto.fromModel(state.activePurchase)
        : null,
    };
  }

  @Get('entitlements')
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  @ApiOperation({
    summary: 'Эффективные энтайтлменты и счётчики использования',
    description:
      'Единственный источник UX-подсказок для кабинета (E-14): эффективные ' +
      'лимиты (оверрайд → снапшот пакета → START), счётчики окон генераций и ' +
      'AI-секунд. Клиент НИКОГДА не принимает решения — энфорсмент серверный.',
  })
  @ApiOkResponse({ type: EntitlementsDto })
  async getEntitlements(
    @CurrentUser() user: ICurrentUser,
  ): Promise<EntitlementsDto> {
    const organizationId = this.planStateService.resolveOrganizationId(user);
    const [ent, generations, aiSeconds] = await Promise.all([
      this.entitlementsService.getEffectiveEntitlements(organizationId),
      this.quotaService.preview(organizationId, CoinMetric.GENERATION_UNITS),
      this.quotaService.preview(organizationId, CoinMetric.AI_SECONDS),
    ]);
    return {
      tierKey: ent.tierKey,
      source: ent.source,
      enforcementEnabled: ent.enforcementEnabled,
      suspended: ent.suspended,
      commissionBps: ent.commissionBps,
      staffSeats: ent.staffSeats,
      maxParticipantsPerEvent: ent.maxParticipantsPerEvent,
      maxEvents: ent.maxEvents,
      taskBoardEnabled: ent.taskBoardEnabled,
      statsTier: ent.statsTier,
      qrMode: ent.qrMode,
      generationWindow: ent.generationWindow,
      eventCredits: ent.eventCredits,
      generations,
      aiSeconds,
      overridesApplied: ent.overridesApplied,
    };
  }

  @Get('wallet')
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  @ApiOperation({
    summary: 'Кошелёк монет: балансы и история (C-6)',
    description:
      'Балансы по метрикам (AI — секунды, CR-26) и последние проводки леджера. ' +
      'Монеты бессрочны и тратятся ПОСЛЕ квоты тарифа (OQ-5/E-12).',
  })
  async getWallet(@CurrentUser() user: ICurrentUser) {
    const organizationId = this.planStateService.resolveOrganizationId(user);
    const [balances, entries] = await Promise.all([
      this.coinLedger.balances(organizationId),
      this.coinLedger.listEntries(organizationId, 50),
    ]);
    return {
      balances: {
        aiSeconds: balances.AI_SECONDS,
        generationUnits: balances.GENERATION_UNITS,
      },
      entries: entries.map((e) => ({
        id: e.id,
        metric: e.metric,
        delta: e.delta,
        balanceAfter: e.balanceAfter,
        kind: e.kind,
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  @Post('requests')
  @RequirePermissions(PERMISSIONS.BILLING_MANAGE)
  @ApiOperation({
    summary: 'Заявка managed-фазы: тариф / пакет монет / реклама',
    description:
      'Создаёт Order(REQUESTED) (M-13/CR-23). Дубликаты по виду режутся ' +
      'серверно (409 BILLING_REQUEST_DUPLICATE). Операторы уведомляются; ' +
      'SLA — 2 рабочих дня (10-decisions D-4).',
  })
  @ApiOkResponse({ type: BillingOrderDto })
  async createRequest(
    @Body() dto: CreateBillingRequestDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<BillingOrderDto> {
    const organizationId = this.planStateService.resolveOrganizationId(user);
    const order = await this.billingRequests.createRequest({
      organizationId,
      kind: dto.kind,
      planKey: dto.planKey,
      skuCode: dto.skuCode,
    });
    return BillingOrderDto.fromModel(order);
  }

  @Get('requests')
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  @ApiOperation({
    summary: 'Заказы/заявки организации',
    description: 'История биллинг-заказов организации (для C-5/C-8).',
  })
  @ApiOkResponse({ type: [BillingOrderDto] })
  async listRequests(
    @CurrentUser() user: ICurrentUser,
  ): Promise<BillingOrderDto[]> {
    const organizationId = this.planStateService.resolveOrganizationId(user);
    const orders = await this.billingRequests.listRequests(organizationId);
    return orders.map((o) => BillingOrderDto.fromModel(o));
  }
}
