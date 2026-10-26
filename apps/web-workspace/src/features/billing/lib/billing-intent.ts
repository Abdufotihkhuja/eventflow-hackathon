/**
 * Разбор `?intent=PLAN_<key>` на /settings/billing (P-7).
 *
 * Контракт с web-public: CTA прайсинга ведут на
 * `/signup?plan=PRO|EXCLUSIVE`, а сайнап-флоу редиректит в кабинет на
 * `/settings/billing?tab=plans&intent=PLAN_<key>` (см.
 * apps/web-public/src/shared/lib/billing-intent.ts). Страница биллинга
 * одноразово открывает диалог заявки C-5 с преселектом тарифа и срезает
 * параметр из URL. START не интентится — он и так дефолт.
 */

import type { BillingPlanKey } from '@api/services'

/** `PLAN_PRO` → `PRO`; всё остальное (включая PLAN_START) — null. */
export function parseBillingPlanIntent(intent: string | null): BillingPlanKey | null {
  if (intent === 'PLAN_PRO') return 'PRO'
  if (intent === 'PLAN_EXCLUSIVE') return 'EXCLUSIVE'
  return null
}
