import { useMemo } from 'react'
import { Clock3 } from 'lucide-react'
import { toIntlLocale } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { BillingOrder, BillingPlanKey } from '@api/services'
import { formatDate } from '@shared/lib/format'
import { ErrorState, Skeleton } from '@shared/ui'

import { useBillingCatalogQuery, useBillingStatusQuery } from '../api'
import { useBillingAccess } from '../lib/use-billing-access'
import { ManagedNotice } from './managed-notice'
import { PlanCard } from './plan-card'

type PlansSectionProps = {
  /** Открыть заявку на тариф (C-5). Без обработчика CTA не рендерятся. */
  onRequestPlan?: (planKey: BillingPlanKey) => void
  /**
   * Необработанная заявка на тариф (Order REQUESTED, C-5). Заказ не хранит
   * planKey на чтение, поэтому бейдж — на уровне вида заявки, не карточки.
   */
  pendingPlanOrder?: BillingOrder
}

/**
 * Тарифы из живого каталога GET /billing/plans (C-3). Текущий тариф — из
 * /billing/status. Неактивные строки рендерятся честно: без CTA, с пометкой
 * «активация через команду EventFlow».
 */
export function PlansSection({ onRequestPlan, pendingPlanOrder }: PlansSectionProps) {
  const t = useT()
  const locale = useLocale()
  const { canManage } = useBillingAccess()

  const catalogQuery = useBillingCatalogQuery()
  const statusQuery = useBillingStatusQuery()

  const plans = useMemo(
    () => [...(catalogQuery.data?.plans ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [catalogQuery.data]
  )

  if (catalogQuery.isLoading || statusQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[420px] rounded-xl" />
        ))}
      </div>
    )
  }

  if (catalogQuery.isError || statusQuery.isError || !catalogQuery.data || !statusQuery.data) {
    return (
      <ErrorState
        title={t('billing.common.loadErrorTitle')}
        description={t('billing.common.loadErrorBody')}
        retryLabel={t('billing.common.retry')}
        onRetry={() => {
          void catalogQuery.refetch()
          void statusQuery.refetch()
        }}
      />
    )
  }

  const currentTier = statusQuery.data.tierKey

  return (
    <div className="space-y-5">
      <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
        {t('billing.plans.intro')}
      </p>

      {/* Необработанная заявка: дубликаты режутся серверно, CTA гасим честно. */}
      {pendingPlanOrder && (
        <div className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {t('billing.plans.pendingNotice', {
              date: formatDate(pendingPlanOrder.createdAt, toIntlLocale(locale)),
            })}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map(plan => (
          <PlanCard
            key={plan.key}
            plan={plan}
            isCurrent={plan.key === currentTier}
            hasPendingRequest={Boolean(pendingPlanOrder)}
            onRequest={onRequestPlan}
            canManage={canManage}
          />
        ))}
      </div>

      <ManagedNotice />
    </div>
  )
}
