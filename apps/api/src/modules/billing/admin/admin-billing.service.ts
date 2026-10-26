import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlanKey,
  CoinMetric,
  Currency,
  EntitlementKey,
  PaymentProvider,
  PaymentTxStatus,
  Prisma,
  RevenueChannel,
  UserType,
} from '@prisma/client';
import { parseMinorAmount } from '../../../common/money/money';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService, PLATFORM_TARGET_ID } from '../../platform/admin-audit/admin-audit.service';
import { BillingConfigService } from '../billing-config.service';
import { EntitlementsRepository } from '../entitlements/entitlements.repository';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PlanLifecycleService } from '../plan-state/plan-lifecycle.service';
import { PlanStateService } from '../plan-state/plan-state.service';
import { QuotaService } from '../quota/quota.service';
import { OrdersRepository } from '../orders/orders.repository';
import { CatalogRepository } from '../catalog/catalog.repository';
import { CatalogService } from '../catalog/catalog.service';
import { AddonSkuDto, PlanDto } from '../dto/catalog.dto';
import { PayoutsRepository } from './payouts.repository';
import { AdminDashboardsRepository } from './admin-dashboards.repository';
import { CoinLedgerService } from '../coins/coin-ledger.service';
import { TicketingService } from '../ticketing/ticketing.service';
import { ViaConfigService } from '../payments/via-config.service';
import { ActivatePlanDto, AdminOrgBillingDto } from './admin-billing.dto';
import { ActivePlanPurchaseDto } from '../dto/billing-status.dto';
import { BillingOrderDto } from '../dto/billing-request.dto';
import type { ICurrentUser } from '../../../common/interfaces';

/** Оркестрация операторского биллинга (S-1). Домены — в сервисах Волны 2. */
@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planState: PlanStateService,
    private readonly planLifecycle: PlanLifecycleService,
    private readonly entitlements: EntitlementsService,
    private readonly entitlementsRepository: EntitlementsRepository,
    private readonly quota: QuotaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly billingConfig: BillingConfigService,
    private readonly viaConfig: ViaConfigService,
    private readonly adminAudit: AdminAuditService,
    private readonly ticketing: TicketingService,
    private readonly payoutsRepository: PayoutsRepository,
    private readonly coinLedger: CoinLedgerService,
    private readonly catalogRepository: CatalogRepository,
    private readonly catalogService: CatalogService,
    private readonly dashboardsRepository: AdminDashboardsRepository,
  ) {}

  async getOrgBilling(organizationId: string): Promise<AdminOrgBillingDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) throw new NotFoundException('Организация не найдена');

    const now = new Date();
    const [state, ent, generations, aiSeconds, overrides, orders] =
      await Promise.all([
        this.planState.getPlanState(organizationId),
        this.entitlements.getEffectiveEntitlements(organizationId),
        this.quota.preview(organizationId, CoinMetric.GENERATION_UNITS),
        this.quota.preview(organizationId, CoinMetric.AI_SECONDS),
        this.entitlementsRepository.findActiveOverrides(organizationId, now),
        this.ordersRepository.listByOrganization(organizationId),
      ]);

    return {
      status: {
        tierKey: state.tierKey,
        source: state.source,
        activePurchase: state.activePurchase
          ? ActivePlanPurchaseDto.fromModel(state.activePurchase)
          : null,
      },
      entitlements: {
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
      },
      overrides: overrides.map((o) => ({
        key: o.key,
        valueInt: o.valueInt,
        valueBool: o.valueBool,
        valueString: o.valueString,
        reason: o.reason,
        expiresAt: o.expiresAt?.toISOString() ?? null,
      })),
      orders: orders.map((o) => BillingOrderDto.fromModel(o)),
    };
  }

  async activatePlan(
    organizationId: string,
    dto: ActivatePlanDto,
    admin: ICurrentUser,
  ) {
    const purchase = await this.planLifecycle.activatePack({
      organizationId,
      planKey: dto.planKey,
      orderId: dto.orderId ?? null,
      creditMode: dto.creditMode,
      actor: { id: admin.sub, email: admin.email },
    });
    return ActivePlanPurchaseDto.fromModel(purchase);
  }

  async extendPlan(
    organizationId: string,
    dto: { days: number; reason?: string },
    admin: ICurrentUser,
  ) {
    const purchase = await this.planLifecycle.extendActivePack({
      organizationId,
      days: dto.days,
      reason: dto.reason ?? null,
      actor: { id: admin.sub, email: admin.email },
    });
    return ActivePlanPurchaseDto.fromModel(purchase);
  }

  async expirePlan(
    organizationId: string,
    dto: { reason: string },
    admin: ICurrentUser,
  ) {
    const purchase = await this.planLifecycle.expireActivePack({
      organizationId,
      reason: dto.reason,
      actor: { id: admin.sub, email: admin.email },
    });
    return ActivePlanPurchaseDto.fromModel(purchase);
  }

  async adjustCredits(
    organizationId: string,
    dto: { delta: number; reason: string },
    admin: ICurrentUser,
  ) {
    const purchase = await this.planLifecycle.adjustCredits({
      organizationId,
      delta: dto.delta,
      reason: dto.reason,
      actor: { id: admin.sub, email: admin.email },
    });
    return ActivePlanPurchaseDto.fromModel(purchase);
  }

  /** MANUAL-подтверждение билета (M-5): транзакция + PAID/APPROVED + COMMISSION-выручка + аудит. */
  async confirmTicketOrder(
    orderId: string,
    externalRef: string,
    admin: ICurrentUser,
  ) {
    const order = await this.ticketing.confirmTicketPaid(
      orderId,
      RevenueChannel.MANUAL,
    );
    if (!order) {
      throw new ConflictException({
        message: 'Заказ уже подтверждён или не ожидает оплаты',
        code: 'TICKET_ORDER_NOT_PENDING',
        details: { orderId },
      });
    }
    await this.prisma.paymentTransaction
      .create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.MANUAL,
          providerTxnId: externalRef,
          status: PaymentTxStatus.CONFIRMED,
          amountMinor: order.amountMinor,
          currency: order.currency,
          confirmedAt: new Date(),
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException({
            message: 'Платёж с таким внешним референсом уже записан',
            code: 'PAYMENT_DUPLICATE_REF',
            details: { externalRef },
          });
        }
        throw error;
      });
    await this.adminAudit.record({
      action: 'PAYMENT_RECORD',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORDER',
      targetId: order.id,
      after: {
        kind: 'TICKET_SALE',
        amountMinor: order.amountMinor.toString(10),
        externalRef,
      },
    });
    return BillingOrderDto.fromModel(order);
  }

  /** S-13: лента аудита операторских действий. */
  async listAudit(args: {
    action?: string;
    targetId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = args.page && args.page > 0 ? args.page : 1;
    const limit = args.limit && args.limit > 0 && args.limit <= 100 ? args.limit : 25;
    const { data, total } = await this.dashboardsRepository.listAudit({
      action: args.action,
      targetId: args.targetId,
      page,
      limit,
    });
    return {
      data: data.map((row) => ({
        id: row.id,
        action: row.action,
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        targetType: row.targetType,
        targetId: row.targetId,
        targetLabel: row.targetLabel,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /** S-10: сводка выручки за период (managed-фаза: канал MANUAL). */
  async revenueSummary(fromIso?: string, toIso?: string) {
    const to = toIso ? new Date(toIso) : new Date();
    const from = fromIso
      ? new Date(fromIso)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { byType, byChannel, total } =
      await this.dashboardsRepository.revenueSummary(from, to);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalMinor: (total._sum.amountMinor ?? 0n).toString(10),
      entries: total._count,
      byType: byType.map((r) => ({
        type: r.type,
        amountMinor: (r._sum.amountMinor ?? 0n).toString(10),
        entries: r._count,
      })),
      byChannel: byChannel.map((r) => ({
        channel: r.channel,
        amountMinor: (r._sum.amountMinor ?? 0n).toString(10),
        entries: r._count,
      })),
    };
  }

  /** S-9: обзор монетизации платформы. */
  async monetizationOverview() {
    const now = new Date();
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [distribution, expiring, pendingRequests, enforcement] =
      await Promise.all([
        this.dashboardsRepository.planDistribution(),
        this.dashboardsRepository.expiringPacks(now, horizon),
        this.dashboardsRepository.pendingRequestsCount(),
        this.getEnforcement(),
      ]);
    const activeByPlan = Object.fromEntries(
      distribution.byPlan.map((r) => [r.planKeySnapshot, r._count]),
    );
    const paidActive = distribution.byPlan.reduce((sum, r) => sum + r._count, 0);
    return {
      enforcement,
      totalOrganizations: distribution.totalOrgs,
      suspendedOrganizations: distribution.suspended,
      planDistribution: {
        START: distribution.totalOrgs - paidActive,
        PRO: activeByPlan.PRO ?? 0,
        EXCLUSIVE: activeByPlan.EXCLUSIVE ?? 0,
      },
      pendingRequests,
      expiringSoon: expiring.map((r) => ({
        organizationId: r.organizationId,
        planKey: r.planKeySnapshot,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        eventCreditsRemaining: r.eventCreditsRemaining,
      })),
    };
  }

  /** S-16: правка цены/активации тарифа (внешний гейт 4 закрывается отсюда). */
  async updatePlanPricing(
    key: PlanKey,
    dto: {
      priceAmountMinor?: string;
      usdAnchorCents?: number;
      isActive?: boolean;
      isPurchasable?: boolean;
    },
    admin: ICurrentUser,
  ) {
    const before = await this.catalogService.requirePlan(key);
    const updated = await this.catalogRepository.updatePlan(key, {
      ...(dto.priceAmountMinor !== undefined
        ? { priceAmountMinor: parseMinorAmount(dto.priceAmountMinor) }
        : {}),
      ...(dto.usdAnchorCents !== undefined
        ? { usdAnchorCents: dto.usdAnchorCents }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.isPurchasable !== undefined
        ? { isPurchasable: dto.isPurchasable }
        : {}),
    });
    await this.adminAudit.record({
      action: 'PRICE_SET',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'PLAN',
      targetId: before.id,
      targetLabel: key,
      before: {
        priceAmountMinor: before.priceAmountMinor?.toString(10) ?? null,
        usdAnchorCents: before.usdAnchorCents,
        isActive: before.isActive,
        isPurchasable: before.isPurchasable,
      },
      after: {
        priceAmountMinor: updated.priceAmountMinor?.toString(10) ?? null,
        usdAnchorCents: updated.usdAnchorCents,
        isActive: updated.isActive,
        isPurchasable: updated.isPurchasable,
      },
    });
    // Правки каталога НЕ трогают проданные пакеты — снапшоты (CR-1).
    return PlanDto.fromModel(updated);
  }

  /** S-16: правка цены/активации add-on SKU. */
  async updateSkuPricing(
    code: string,
    dto: {
      priceAmountMinor?: string;
      usdAnchorCents?: number;
      isActive?: boolean;
    },
    admin: ICurrentUser,
  ) {
    const before = await this.catalogRepository.findAddonSkuByCode(code);
    if (!before) throw new NotFoundException(`SKU ${code} не найден`);
    const updated = await this.catalogRepository.updateAddonSku(code, {
      ...(dto.priceAmountMinor !== undefined
        ? { priceAmountMinor: parseMinorAmount(dto.priceAmountMinor) }
        : {}),
      ...(dto.usdAnchorCents !== undefined
        ? { usdAnchorCents: dto.usdAnchorCents }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    await this.adminAudit.record({
      action: 'SKU_SET',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'SKU',
      targetId: before.id,
      targetLabel: code,
      before: {
        priceAmountMinor: before.priceAmountMinor?.toString(10) ?? null,
        usdAnchorCents: before.usdAnchorCents,
        isActive: before.isActive,
      },
      after: {
        priceAmountMinor: updated.priceAmountMinor?.toString(10) ?? null,
        usdAnchorCents: updated.usdAnchorCents,
        isActive: updated.isActive,
      },
    });
    return AddonSkuDto.fromModel(updated);
  }

  /** S-5/S-6: установить per-org оверрайд (комиссия — в границах [0,1200] bps, CR-8). */
  async setOverride(
    organizationId: string,
    dto: {
      key: EntitlementKey;
      valueInt?: number;
      valueBool?: boolean;
      valueString?: string;
      reason: string;
      expiresAt?: string;
    },
    admin: ICurrentUser,
  ) {
    if (dto.key === EntitlementKey.COMMISSION_BPS) {
      if (
        dto.valueInt === undefined ||
        dto.valueInt < 0 ||
        dto.valueInt > 1200
      ) {
        throw new BadRequestException(
          'Комиссия-оверрайд должна быть в границах [0, 1200] bps — публичная страница обещает максимум 12% (CR-8)',
        );
      }
    }
    if (
      dto.key === EntitlementKey.VIA_PAYMENTS &&
      dto.valueBool === undefined
    ) {
      throw new BadRequestException(
        'Оверрайд VIA_PAYMENTS — булев флаг: передайте valueBool (true — пилот, false — точечное отключение)',
      );
    }
    const { before, after } = await this.entitlementsRepository.upsertOverride({
      organizationId,
      key: dto.key,
      valueInt: dto.valueInt ?? null,
      valueBool: dto.valueBool ?? null,
      valueString: dto.valueString ?? null,
      reason: dto.reason,
      createdByAdminId: admin.sub,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    await this.adminAudit.record({
      action:
        dto.key === EntitlementKey.COMMISSION_BPS
          ? 'COMMISSION_OVERRIDE_SET'
          : 'CAP_OVERRIDE_SET',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORGANIZATION',
      targetId: organizationId,
      reason: dto.reason,
      before: before
        ? {
            key: before.key,
            valueInt: before.valueInt,
            valueBool: before.valueBool,
            valueString: before.valueString,
          }
        : undefined,
      after: {
        key: after.key,
        valueInt: after.valueInt,
        valueBool: after.valueBool,
        valueString: after.valueString,
        expiresAt: after.expiresAt?.toISOString() ?? null,
      },
    });
    return {
      key: after.key,
      valueInt: after.valueInt,
      valueBool: after.valueBool,
      valueString: after.valueString,
      reason: after.reason,
      expiresAt: after.expiresAt?.toISOString() ?? null,
    };
  }

  /** S-5/S-6: снять оверрайд (обязательная причина; история — в аудите). */
  async revokeOverride(
    organizationId: string,
    key: EntitlementKey,
    reason: string,
    admin: ICurrentUser,
  ) {
    const removed = await this.entitlementsRepository.removeOverride(
      organizationId,
      key,
    );
    if (!removed) {
      throw new NotFoundException('Оверрайд не найден');
    }
    await this.adminAudit.record({
      action:
        key === EntitlementKey.COMMISSION_BPS
          ? 'COMMISSION_OVERRIDE_REVOKE'
          : 'CAP_OVERRIDE_REVOKE',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORGANIZATION',
      targetId: organizationId,
      reason,
      before: {
        key: removed.key,
        valueInt: removed.valueInt,
        valueBool: removed.valueBool,
        valueString: removed.valueString,
      },
    });
    return { removed: true, key };
  }

  /** S-7: comp-грант монет (goodwill) — леджер COMP_GRANT; переживает смену тарифа (OQ-5). */
  async compGrant(
    organizationId: string,
    dto: { metric: CoinMetric; quantity: number; reason: string },
    admin: ICurrentUser,
  ) {
    const entry = await this.coinLedger.credit({
      organizationId,
      metric: dto.metric,
      quantity: dto.quantity,
      kind: 'COMP_GRANT',
      createdByAdminId: admin.sub,
      reason: dto.reason,
    });
    await this.adminAudit.record({
      action: 'COMP_GRANT',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORGANIZATION',
      targetId: organizationId,
      reason: dto.reason,
      after: {
        metric: dto.metric,
        quantity: dto.quantity,
        balanceAfter: entry.balanceAfter,
      },
    });
    return {
      id: entry.id,
      metric: entry.metric,
      delta: entry.delta,
      balanceAfter: entry.balanceAfter,
    };
  }

  /** S-8: приостановка (пакет решений D-1 группы D; энфорсмент — E-17). */
  async suspendOrganization(
    organizationId: string,
    reason: string,
    admin: ICurrentUser,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, suspendedAt: true },
    });
    if (!org) throw new NotFoundException('Организация не найдена');
    if (org.suspendedAt) {
      throw new ConflictException('Организация уже приостановлена');
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        suspendedAt: new Date(),
        suspendedById: admin.sub,
        suspendedReason: reason,
      },
    });
    await this.adminAudit.record({
      action: 'ORG_SUSPEND',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORGANIZATION',
      targetId: organizationId,
      targetLabel: org.name,
      reason,
    });
    return { suspended: true };
  }

  async reactivateOrganization(
    organizationId: string,
    admin: ICurrentUser,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, suspendedAt: true },
    });
    if (!org) throw new NotFoundException('Организация не найдена');
    if (!org.suspendedAt) {
      throw new ConflictException('Организация не приостановлена');
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { suspendedAt: null, suspendedById: null, suspendedReason: null },
    });
    await this.adminAudit.record({
      action: 'ORG_REACTIVATE',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORGANIZATION',
      targetId: organizationId,
      targetLabel: org.name,
    });
    return { suspended: false };
  }

  /** M-7: сводка «к выплате» по организациям (тело билетов − комиссия − выплачено). */
  async payoutsOwed() {
    const rows = await this.payoutsRepository.owedByOrganization();
    return rows.map((r) => ({
      organizationId: r.organizationId,
      grossMinor: r.grossMinor.toString(10),
      commissionMinor: r.commissionMinor.toString(10),
      paidOutMinor: r.paidOutMinor.toString(10),
      owedMinor: r.owedMinor.toString(10),
    }));
  }

  /** M-7: зафиксировать выплату (деньги уже переведены по runbook). */
  async recordPayout(
    organizationId: string,
    dto: { amountMinor: string; currency?: Currency; externalRef: string },
    admin: ICurrentUser,
  ) {
    const amountMinor = parseMinorAmount(dto.amountMinor);
    if (amountMinor <= 0n) {
      throw new ConflictException('Сумма выплаты должна быть больше нуля');
    }
    const payout = await this.payoutsRepository.createPaid({
      organizationId,
      amountMinor,
      currency: dto.currency ?? Currency.UZS,
      externalRef: dto.externalRef,
      markedPaidById: admin.sub,
    });
    await this.adminAudit.record({
      action: 'PAYOUT_RECORD',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'ORGANIZATION',
      targetId: organizationId,
      after: {
        amountMinor: amountMinor.toString(10),
        externalRef: dto.externalRef,
      },
    });
    return {
      id: payout.id,
      amountMinor: payout.amountMinor.toString(10),
      currency: payout.currency,
      status: payout.status,
      externalRef: payout.externalRef,
      createdAt: payout.createdAt.toISOString(),
    };
  }

  async listPendingRequests(): Promise<BillingOrderDto[]> {
    const orders = await this.ordersRepository.listPendingAll();
    return orders.map((o) => BillingOrderDto.fromModel(o));
  }

  /** S-19: текущее состояние тумблера (для /admin/billing UI). */
  async getEnforcement() {
    const [enabled, enabledAt] = await Promise.all([
      this.billingConfig.isEnforcementEnabled(),
      this.billingConfig.getEnabledAt(),
    ]);
    return { enabled, enabledAt: enabledAt?.toISOString() ?? null };
  }

  async setEnforcement(enabled: boolean, admin: ICurrentUser) {
    const before = await this.billingConfig.isEnforcementEnabled();
    const result = await this.billingConfig.setEnforcementEnabled(
      enabled,
      admin.sub,
    );
    await this.adminAudit.record({
      action: 'BILLING_SWITCH_TOGGLE',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'PLATFORM',
      targetId: PLATFORM_TARGET_ID,
      before: { enabled: before },
      after: {
        enabled,
        enabledAt: result.enabledAt?.toISOString() ?? null,
        grandfathersStamped: result.grandfathersStamped,
      },
    });
    return {
      enabled,
      enabledAt: result.enabledAt?.toISOString() ?? null,
      grandfathersStamped: result.grandfathersStamped,
    };
  }

  /** Состояние тумблера VIA-платежей + число пилотных организаций (для /admin/billing UI). */
  async getViaState() {
    const now = new Date();
    const [enabled, enabledAt, pilotOrgCount] = await Promise.all([
      this.viaConfig.isGloballyEnabled(),
      this.viaConfig.getEnabledAt(),
      this.entitlementsRepository.countActiveViaPilotOrgs(now),
    ]);
    return {
      enabled,
      enabledAt: enabledAt?.toISOString() ?? null,
      pilotOrgCount,
    };
  }

  /**
   * Глобальный тумблер VIA-платежей (прод-активация). ВЫКЛ — VIA доступен
   * только пилотным организациям с оверрайдом VIA_PAYMENTS=true.
   * Аудит VIA_SWITCH_TOGGLE.
   */
  async setViaEnabled(enabled: boolean, admin: ICurrentUser) {
    const before = await this.viaConfig.isGloballyEnabled();
    const result = await this.viaConfig.setGloballyEnabled(enabled, admin.sub);
    await this.adminAudit.record({
      action: 'VIA_SWITCH_TOGGLE',
      actorId: admin.sub,
      actorEmail: admin.email,
      targetType: 'PLATFORM',
      targetId: PLATFORM_TARGET_ID,
      before: { enabled: before },
      after: {
        enabled,
        enabledAt: result.enabledAt?.toISOString() ?? null,
      },
    });
    return {
      enabled,
      enabledAt: result.enabledAt?.toISOString() ?? null,
    };
  }

  /** Тип-страж: используется только супер-админом (RolesGuard), проверка UserType — на защите маршрута. */
  static readonly requiredRole = UserType.SUPER_ADMIN;
}
