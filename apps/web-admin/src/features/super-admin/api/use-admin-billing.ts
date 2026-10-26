/**
 * Хуки операторского биллинга (Super Admin, S-2).
 * Endpoints: GET/POST /api/v1/super-admin/billing/*
 *
 * Мутации НЕ тостят ошибку: диалоги показывают её инлайн (критик B-11),
 * поэтому onError здесь пуст, а успех — toast + инвалидация панели.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { billingAdminService } from '@api/services'
import type {
  ActivatePlanRequest,
  AdjustCreditsRequest,
  CompGrantRequest,
  EntitlementKey,
  ExpirePlanRequest,
  ExtendPlanRequest,
  PlanKey,
  RecordPaymentRequest,
  BillingAuditQuery,
  RecordPayoutRequest,
  RevenuePeriodQuery,
  SetOverrideRequest,
  UpdatePricingRequest,
} from '@api/services'

export const ORG_BILLING_QUERY_KEY = ['super-admin', 'billing', 'organization'] as const
export const BILLING_REQUESTS_QUERY_KEY = ['super-admin', 'billing', 'requests'] as const
export const BILLING_PAYOUTS_QUERY_KEY = ['super-admin', 'billing', 'payouts'] as const
export const BILLING_ENFORCEMENT_QUERY_KEY = ['super-admin', 'billing', 'enforcement'] as const
export const BILLING_VIA_QUERY_KEY = ['super-admin', 'billing', 'via'] as const
export const BILLING_OVERVIEW_QUERY_KEY = ['super-admin', 'billing', 'overview'] as const
export const BILLING_REVENUE_QUERY_KEY = ['super-admin', 'billing', 'revenue'] as const
export const BILLING_AUDIT_QUERY_KEY = ['super-admin', 'billing', 'audit'] as const
export const BILLING_CATALOG_QUERY_KEY = ['super-admin', 'billing', 'catalog'] as const

// ================================
// Query: биллинг-панель организации
// ================================

export function useOrgBilling(orgId: string | null) {
  return useQuery({
    queryKey: [...ORG_BILLING_QUERY_KEY, orgId],
    queryFn: () => billingAdminService.getOrgBilling(orgId!),
    enabled: !!orgId,
    staleTime: 15 * 1000,
  })
}

// ================================
// Mutation: активировать/сменить тариф (§2.4)
// ================================

export function useActivatePlan(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ActivatePlanRequest) =>
      billingAdminService.activatePlan(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.assignDialog.success'))
    },
  })
}

// ================================
// Mutation: продлить период пакета (S-3)
// ================================

export function useExtendPlan(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ExtendPlanRequest) => billingAdminService.extendPlan(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.extendDialog.success'))
    },
  })
}

// ================================
// Mutation: принудительно истечь пакет (S-3)
// ================================

export function useExpirePlan(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ExpirePlanRequest) => billingAdminService.expirePlan(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.expireDialog.success'))
    },
  })
}

// ================================
// Mutation: корректировка кредитов (S-3)
// ================================

export function useAdjustCredits(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AdjustCreditsRequest) =>
      billingAdminService.adjustCredits(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.adjustDialog.success'))
    },
  })
}

// ================================
// Mutation: записать ручной платёж (S-4)
// ================================

export function useRecordPayment(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RecordPaymentRequest) =>
      billingAdminService.recordPayment(orgId, data),
    onSuccess: () => {
      // Заказ-основание переходит REQUESTED → PAID: рефетчим панель (историю заказов).
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.paymentDialog.success'))
    },
  })
}

// ================================
// Mutation: реверсировать платёж (S-4, исправления только реверсом)
// ================================

export function useReversePayment(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      billingAdminService.reversePayment(transactionId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.reverseDialog.success'))
    },
  })
}

// ================================
// Mutation: установить per-org оверрайд (S-5/S-6)
// ================================

export function useSetOverride(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SetOverrideRequest) =>
      billingAdminService.setOverride(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.overrideDialog.success'))
    },
  })
}

// ================================
// Mutation: снять оверрайд (S-5/S-6)
// ================================

export function useRevokeOverride(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, reason }: { key: EntitlementKey; reason: string }) =>
      billingAdminService.revokeOverride(orgId, key, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.revokeOverrideDialog.success'))
    },
  })
}

// ================================
// Mutation: comp-грант монет (S-7)
// ================================

export function useCompGrant(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CompGrantRequest) => billingAdminService.compGrant(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.compDialog.success'))
    },
  })
}

// ================================
// Mutation: приостановка / реактивация организации (S-8)
// ================================

export function useSuspendOrg(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reason: string) =>
      billingAdminService.suspendOrganization(orgId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.suspendDialog.success'))
    },
  })
}

export function useReactivateOrg(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => billingAdminService.reactivateOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORG_BILLING_QUERY_KEY, orgId] })
      toast.success(t('admin.billing.suspendDialog.reactivateSuccess'))
    },
  })
}

// ================================
// Query: очередь REQUESTED-заявок managed-фазы
// ================================

export function useBillingRequests() {
  return useQuery({
    queryKey: BILLING_REQUESTS_QUERY_KEY,
    queryFn: () => billingAdminService.listRequests(),
    staleTime: 15 * 1000,
  })
}

// ================================
// M-7/S-18: выплаты организаторам
// ================================

export function usePayoutsOwed() {
  return useQuery({
    queryKey: BILLING_PAYOUTS_QUERY_KEY,
    queryFn: () => billingAdminService.payoutsOwed(),
    staleTime: 15 * 1000,
  })
}

export function useRecordPayout(orgId: string) {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RecordPayoutRequest) =>
      billingAdminService.recordPayout(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_PAYOUTS_QUERY_KEY })
      toast.success(t('admin.billing.payouts.successToast'))
    },
  })
}

// ================================
// S-9: обзор монетизации платформы
// ================================

export function useBillingOverview() {
  return useQuery({
    queryKey: BILLING_OVERVIEW_QUERY_KEY,
    queryFn: () => billingAdminService.overview(),
    staleTime: 30 * 1000,
  })
}

// ================================
// S-10: сводка выручки за период
// ================================

export function useRevenueSummary(period: RevenuePeriodQuery) {
  return useQuery({
    // Границы периода — часть ключа: пресеты/кастомные даты кэшируются раздельно.
    queryKey: [...BILLING_REVENUE_QUERY_KEY, period.from ?? null, period.to ?? null],
    queryFn: () => billingAdminService.revenueSummary(period),
    staleTime: 30 * 1000,
  })
}

// ================================
// S-13: лента аудита операторских действий
// ================================

export function useBillingAudit(query: BillingAuditQuery) {
  return useQuery({
    queryKey: [
      ...BILLING_AUDIT_QUERY_KEY,
      query.action ?? null,
      query.targetId ?? null,
      query.page ?? 1,
      query.limit ?? 25,
    ],
    queryFn: () => billingAdminService.listAudit(query),
    // Перелистывание без мигания на скелетон: предыдущая страница остаётся
    // на экране, пока грузится следующая.
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  })
}

// ================================
// S-16: каталог цен (тарифы + SKU) и его правка
// ================================

export function useBillingCatalog() {
  return useQuery({
    queryKey: BILLING_CATALOG_QUERY_KEY,
    queryFn: () => billingAdminService.getCatalog(),
    staleTime: 30 * 1000,
  })
}

export function useUpdatePlanPricing() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, data }: { key: PlanKey; data: UpdatePricingRequest }) =>
      billingAdminService.updatePlanPricing(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_CATALOG_QUERY_KEY })
      toast.success(t('admin.billing.pricing.dialog.success'))
    },
  })
}

export function useUpdateSkuPricing() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: UpdatePricingRequest }) =>
      billingAdminService.updateSkuPricing(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_CATALOG_QUERY_KEY })
      toast.success(t('admin.billing.pricing.dialog.success'))
    },
  })
}

// ================================
// S-19: состояние тумблера (выделенный GET)
// ================================

export function useEnforcement() {
  return useQuery({
    queryKey: BILLING_ENFORCEMENT_QUERY_KEY,
    queryFn: () => billingAdminService.getEnforcement(),
    staleTime: 10 * 1000,
  })
}

// ================================
// Mutation: S-19 мастер-переключатель тарифной системы
// ================================

export function useSetEnforcement() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (enabled: boolean) => billingAdminService.setEnforcement(enabled),
    onSuccess: result => {
      // Флаг платформенный: инвалидируем ВСЕ биллинг-панели организаций.
      queryClient.invalidateQueries({ queryKey: ORG_BILLING_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: BILLING_ENFORCEMENT_QUERY_KEY })
      toast.success(
        result.enabled
          ? t('admin.billing.enforcement.successOn')
          : t('admin.billing.enforcement.successOff'),
        result.grandfathersStamped > 0
          ? {
              description: t('admin.billing.enforcement.grandfathersStamped', {
                count: result.grandfathersStamped,
              }),
            }
          : undefined
      )
    },
  })
}

// ================================
// VIA: глобальный тумблер провайдера
// ================================

export function useViaState() {
  return useQuery({
    queryKey: BILLING_VIA_QUERY_KEY,
    queryFn: () => billingAdminService.getViaState(),
    staleTime: 10 * 1000,
  })
}

export function useSetVia() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (enabled: boolean) => billingAdminService.setVia(enabled),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: BILLING_VIA_QUERY_KEY })
      toast.success(
        result.enabled
          ? t('admin.billing.via.successOn')
          : t('admin.billing.via.successOff')
      )
    },
  })
}
