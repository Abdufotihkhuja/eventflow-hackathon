/**
 * Операторский биллинг (S-2/S-3/S-4/S-19) поверх adminSdk.billing.
 *
 * Локальные строковые юнионы (billing.types.ts) кастуются на границе SDK:
 * сгенерированные контрактами типы используют declare enum'ы, которые
 * неэргономичны в UI-коде. Формы данных совпадают 1:1 с DTO бэкенда.
 */

import { adminSdk } from '@api/adminSdk'
import { workspaceSdk } from '@api/sdk'

import type {
  ActivatePlanRequest,
  ActivePlanPurchase,
  AdjustCreditsRequest,
  AdminOrgBilling,
  BillingOverride,
  CompGrantRequest,
  EntitlementKey,
  RevokeOverrideRequest,
  SetOverrideRequest,
  SuspendOrgRequest,
  BillingAuditPage,
  BillingAuditQuery,
  BillingCatalog,
  BillingOrder,
  CatalogAddonSku,
  CatalogPlan,
  ExpirePlanRequest,
  ExtendPlanRequest,
  MonetizationOverview,
  PaymentTransaction,
  PlanKey,
  RevenuePeriodQuery,
  RevenueSummary,
  RecordPaymentRequest,
  ReversePaymentRequest,
  SetEnforcementResult,
  EnforcementState,
  SetViaResult,
  ViaState,
  PayoutOwedRow,
  PayoutRecord,
  RecordPayoutRequest,
  UpdatePricingRequest,
} from './billing.types'

type SdkBilling = typeof adminSdk.billing

export const billingAdminService = {
  /** Биллинг-панель организации (S-2). */
  getOrgBilling: (orgId: string) =>
    adminSdk.billing.getOrgBilling(orgId) as unknown as Promise<AdminOrgBilling>,

  /** Активация/смена тарифа (creditMode обязателен при смене — §2.4). */
  activatePlan: (orgId: string, data: ActivatePlanRequest) =>
    adminSdk.billing.activatePlan(
      orgId,
      data as unknown as Parameters<SdkBilling['activatePlan']>[1]
    ) as unknown as Promise<ActivePlanPurchase>,

  /** S-3: продлить период пакета на N дней. */
  extendPlan: (orgId: string, data: ExtendPlanRequest) =>
    adminSdk.billing.extendPlan(
      orgId,
      data as unknown as Parameters<SdkBilling['extendPlan']>[1]
    ) as unknown as Promise<ActivePlanPurchase>,

  /** S-3: принудительно истечь пакет (немедленный START). */
  expirePlan: (orgId: string, data: ExpirePlanRequest) =>
    adminSdk.billing.expirePlan(
      orgId,
      data as unknown as Parameters<SdkBilling['expirePlan']>[1]
    ) as unknown as Promise<ActivePlanPurchase>,

  /** S-3: корректировка кредитов (append-only). */
  adjustCredits: (orgId: string, data: AdjustCreditsRequest) =>
    adminSdk.billing.adjustCredits(
      orgId,
      data as unknown as Parameters<SdkBilling['adjustCredits']>[1]
    ) as unknown as Promise<ActivePlanPurchase>,

  /** S-4: записать ручной платёж (externalRef обязателен, D-5). */
  recordPayment: (orgId: string, data: RecordPaymentRequest) =>
    adminSdk.billing.recordPayment(
      orgId,
      data as unknown as Parameters<SdkBilling['recordPayment']>[1]
    ) as unknown as Promise<PaymentTransaction>,

  /** S-4: реверсировать платёж (исправления только реверсом). */
  reversePayment: (transactionId: string, data: ReversePaymentRequest) =>
    adminSdk.billing.reversePayment(
      transactionId,
      data as unknown as Parameters<SdkBilling['reversePayment']>[1]
    ) as unknown as Promise<PaymentTransaction>,

  /** S-5/S-6: установить per-org оверрайд (одна активная строка на ключ). */
  setOverride: (orgId: string, data: SetOverrideRequest) =>
    adminSdk.billing.setOverride(
      orgId,
      data as unknown as Parameters<SdkBilling['setOverride']>[1]
    ) as unknown as Promise<BillingOverride>,

  /** S-5/S-6: снять оверрайд (причина обязательна). */
  revokeOverride: (orgId: string, key: EntitlementKey, data: RevokeOverrideRequest) =>
    adminSdk.billing.revokeOverride(
      orgId,
      key,
      data as unknown as Parameters<SdkBilling['revokeOverride']>[2]
    ) as unknown as Promise<void>,

  /** S-7: comp-грант монет (goodwill; переживает смену тарифа). */
  compGrant: (orgId: string, data: CompGrantRequest) =>
    adminSdk.billing.compGrant(
      orgId,
      data as unknown as Parameters<SdkBilling['compGrant']>[1]
    ) as unknown as Promise<void>,

  /** S-8: приостановить организацию (E-17: запись в кабинете блокируется). */
  suspendOrganization: (orgId: string, data: SuspendOrgRequest) =>
    adminSdk.billing.suspendOrganization(
      orgId,
      data as unknown as Parameters<SdkBilling['suspendOrganization']>[1]
    ) as unknown as Promise<void>,

  /** S-8: снять приостановку. */
  reactivateOrganization: (orgId: string) =>
    adminSdk.billing.reactivateOrganization(orgId) as unknown as Promise<void>,

  /** Очередь REQUESTED-заявок managed-фазы. */
  listRequests: () =>
    adminSdk.billing.listRequests() as unknown as Promise<BillingOrder[]>,

  /** M-7/S-18: сводка «к выплате» по организациям. */
  payoutsOwed: () =>
    adminSdk.billing.payoutsOwed() as unknown as Promise<PayoutOwedRow[]>,

  /** M-7/S-18: зафиксировать выплату (референс платёжки обязателен). */
  recordPayout: (orgId: string, data: RecordPayoutRequest) =>
    adminSdk.billing.recordPayout(
      orgId,
      data as unknown as Parameters<SdkBilling['recordPayout']>[1]
    ) as unknown as Promise<PayoutRecord>,

  /** S-9: обзор монетизации платформы (распределение тарифов, истечения). */
  overview: () =>
    adminSdk.billing.overview() as unknown as Promise<MonetizationOverview>,

  /** S-10: сводка выручки за период (агрегаты по типу и каналу, тийины строками). */
  revenueSummary: (params?: RevenuePeriodQuery) =>
    adminSdk.billing.revenueSummary(params) as unknown as Promise<RevenueSummary>,

  /** S-13: лента аудита операторских действий (фильтры action/targetId). */
  listAudit: (params?: BillingAuditQuery) =>
    adminSdk.billing.listAudit(params) as unknown as Promise<BillingAuditPage>,

  /**
   * S-16: чтение каталога — кабинетный GET /billing/plans (ВЕСЬ каталог с
   * флагами isActive/isPurchasable). У adminSdk нет чтения каталога; супер-админ
   * проходит PermissionsGuard без org-контекста (user.type === SUPER_ADMIN).
   */
  getCatalog: () =>
    workspaceSdk.billing.getPlans() as unknown as Promise<BillingCatalog>,

  /** S-16: правка цены/активации тарифа (аудит PRICE_SET; снапшоты не трогаются). */
  updatePlanPricing: (key: PlanKey, data: UpdatePricingRequest) =>
    adminSdk.billing.updatePlanPricing(
      key,
      data as unknown as Parameters<SdkBilling['updatePlanPricing']>[1]
    ) as unknown as Promise<CatalogPlan>,

  /** S-16: правка цены/активации add-on SKU (аудит SKU_SET). */
  updateSkuPricing: (code: string, data: UpdatePricingRequest) =>
    adminSdk.billing.updateSkuPricing(
      code,
      data as unknown as Parameters<SdkBilling['updateSkuPricing']>[1]
    ) as unknown as Promise<CatalogAddonSku>,

  /** S-19: текущее состояние тумблера (выделенный GET). */
  getEnforcement: () =>
    adminSdk.billing.getEnforcement() as unknown as Promise<EnforcementState>,

  /** S-19: мастер-переключатель тарифной системы. */
  setEnforcement: (enabled: boolean) =>
    adminSdk.billing.setEnforcement({
      enabled,
    }) as unknown as Promise<SetEnforcementResult>,

  /** VIA: состояние глобального тумблера + пилотные организации. */
  getViaState: () =>
    adminSdk.billing.getViaState() as unknown as Promise<ViaState>,

  /** VIA: глобальный тумблер провайдера (прод-активация, аудит VIA_SWITCH_TOGGLE). */
  setVia: (enabled: boolean) =>
    adminSdk.billing.setVia({
      enabled,
    }) as unknown as Promise<SetViaResult>,
} as const
