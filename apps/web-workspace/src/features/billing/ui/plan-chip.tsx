import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { useBillingStatusQuery } from '../api'
import { daysUntil } from '../lib/format'
import { useBillingAccess } from '../lib/use-billing-access'

/** Порог warning-подсветки — как у PackExpiry в обзоре биллинга. */
const EXPIRY_WARNING_DAYS = 14

/**
 * Компактный чип текущего тарифа для шапки дашборда (C-15b): имя тарифа,
 * остаток кредитов при активном пакете и warning «истекает через N дн.»
 * (≤ 14 дней). Ведёт на /settings/billing. Сам гейтится по billing:view и
 * молча не рендерится, пока статус грузится или недоступен — шапку дашборда
 * ошибками биллинга не шумим.
 */
export function BillingPlanChip() {
  const t = useT()
  const { canView } = useBillingAccess()
  const statusQuery = useBillingStatusQuery(canView)

  if (!canView || !statusQuery.data) return null

  const status = statusQuery.data
  const purchase = status.source === 'PURCHASE' ? (status.activePurchase ?? null) : null
  const daysLeft = purchase?.expiresAt ? daysUntil(purchase.expiresAt) : null
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= EXPIRY_WARNING_DAYS

  return (
    <Link
      to="/settings/billing"
      aria-label={t('billing.chip.aria')}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
    >
      <CreditCard className="size-3.5 shrink-0" aria-hidden />
      <span className="font-semibold text-foreground">
        {t(`billing.tiers.${status.tierKey}`)}
      </span>
      {purchase && (
        <>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span className="whitespace-nowrap tabular-nums">
            {t('billing.chip.credits', {
              remaining: purchase.eventCreditsRemaining,
              granted: purchase.eventCreditsGranted,
            })}
          </span>
        </>
      )}
      {expiringSoon && (
        <>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span className="whitespace-nowrap font-medium text-warning">
            {t('billing.chip.expiresIn', { days: daysLeft })}
          </span>
        </>
      )}
    </Link>
  )
}
