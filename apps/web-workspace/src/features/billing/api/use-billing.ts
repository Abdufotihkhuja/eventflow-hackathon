/**
 * Биллинг-хуки кабинета (C-1): каталог, статус, энтайтлменты, заявки.
 *
 * Все эндпоинты защищены правом `billing:view` (заявки — `billing:manage`),
 * поэтому query-хуки принимают `enabled` — вызывающие экраны вне /settings/billing
 * (доски, /users, формы событий) включают запрос только когда право есть.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { billingService } from '@api/services'
import type { CreateBillingRequestInput } from '@api/services'

// ================================
// Query keys
// ================================

export const billingKeys = {
  all: ['billing'] as const,
  catalog: () => [...billingKeys.all, 'catalog'] as const,
  status: () => [...billingKeys.all, 'status'] as const,
  entitlements: () => [...billingKeys.all, 'entitlements'] as const,
  requests: () => [...billingKeys.all, 'requests'] as const,
  wallet: () => [...billingKeys.all, 'wallet'] as const,
}

// ================================
// Queries
// ================================

/** Полный каталог тарифов и SKU (isActive/isPurchasable решает рендер). */
export function useBillingCatalogQuery(enabled = true) {
  return useQuery({
    queryKey: billingKeys.catalog(),
    queryFn: () => billingService.getPlans(),
    enabled,
    staleTime: 5 * 60_000, // каталог меняется только оператором
  })
}

/** Статус тарифа: живой пакет + снапшоты. */
export function useBillingStatusQuery(enabled = true) {
  return useQuery({
    queryKey: billingKeys.status(),
    queryFn: () => billingService.getStatus(),
    enabled,
  })
}

/** Эффективные энтайтлменты + счётчики окон (единственный источник UX-подсказок). */
export function useBillingEntitlementsQuery(enabled = true) {
  return useQuery({
    queryKey: billingKeys.entitlements(),
    queryFn: () => billingService.getEntitlements(),
    enabled,
  })
}

/** История заявок/заказов организации. */
export function useBillingRequestsQuery(enabled = true) {
  return useQuery({
    queryKey: billingKeys.requests(),
    queryFn: () => billingService.listRequests(),
    enabled,
  })
}

/** Кошелёк монет: балансы + последние проводки леджера (C-6). */
export function useBillingWalletQuery(enabled = true) {
  return useQuery({
    queryKey: billingKeys.wallet(),
    queryFn: () => billingService.getWallet(),
    enabled,
  })
}

// ================================
// Mutations
// ================================

/**
 * Заявка managed-фазы. Ошибки (409 BILLING_REQUEST_DUPLICATE и т.п.)
 * обрабатываются на стороне вызывающего кода — здесь без тостов.
 * `retry: false`: POST не должен повторяться автоматически.
 */
export function useCreateBillingRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateBillingRequestInput) => billingService.createRequest(body),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.requests() })
    },
    meta: { skipToast: true },
  })
}
