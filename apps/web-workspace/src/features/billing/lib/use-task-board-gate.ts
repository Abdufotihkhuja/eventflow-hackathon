/**
 * C-10: клиентская подсказка гейта Task Board (CR-12 read-only семантика).
 *
 * Источник — GET /billing/entitlements (требует billing:view): без права хук
 * честно возвращает locked=false, UI не гейтится, а записи всё равно режет
 * сервер (403 BILLING_FEATURE_GATED → перехват C-11). enforcementEnabled=false
 * (S-19 OFF) → никакого гейтинга.
 */

import { useBillingEntitlementsQuery } from '../api'
import { useBillingAccess } from './use-billing-access'

export type TaskBoardGate = {
  /** true, пока не знаем ответа (право есть, данные ещё едут). */
  isLoading: boolean
  /** Task Board не входит в тариф при включённом S-19 → read-only UX. */
  locked: boolean
}

export function useTaskBoardGate(): TaskBoardGate {
  const { canView } = useBillingAccess()
  const entitlementsQuery = useBillingEntitlementsQuery(canView)
  const ent = entitlementsQuery.data

  return {
    isLoading: canView && entitlementsQuery.isLoading,
    locked: Boolean(canView && ent && ent.enforcementEnabled && !ent.taskBoardEnabled),
  }
}
