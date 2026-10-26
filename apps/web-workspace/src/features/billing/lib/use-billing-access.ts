/**
 * billing:view vs billing:manage (C-13).
 *
 * - `canView` гейтит сами биллинг-запросы (все GET-эндпоинты требуют billing:view),
 *   поэтому экраны вне /settings/billing передают его в `enabled` query-хуков.
 * - `canManage` гейтит мутирующие CTA (заявки на тариф/дополнения): для
 *   view-only пользователей кнопки рендерятся disabled с тултипом-объяснением.
 *
 * Организация (owner-сессия) имеет оба права имплицитно — как везде в кабинете.
 */

import { usePermissions } from '@features/profile'

import { PERMISSION } from '@shared/lib/permissions'

export type BillingAccess = {
  isLoading: boolean
  canView: boolean
  canManage: boolean
}

export function useBillingAccess(): BillingAccess {
  const { hasPermission, isLoading } = usePermissions()

  return {
    isLoading,
    canView: hasPermission(PERMISSION.BILLING_VIEW),
    canManage: hasPermission(PERMISSION.BILLING_MANAGE),
  }
}
