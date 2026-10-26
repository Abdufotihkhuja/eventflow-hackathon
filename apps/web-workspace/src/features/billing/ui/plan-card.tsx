import { ArrowUpRight, Check } from 'lucide-react'
import { plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { BillingPlan, BillingPlanKey } from '@api/services'
import { cn } from '@shared/lib/cn'
import { Button, StatusPill } from '@shared/ui'

import {
  AI_MINUTES_PLURAL,
  DAYS_PLURAL,
  EVENT_CREDITS_PLURAL,
  GENERATIONS_PLURAL,
  PARTICIPANTS_PLURAL,
  SEATS_PLURAL,
} from '../lib/billing-plurals'
import { formatBpsPercent, formatUsdAnchorCents, formatUzsMinor } from '../lib/format'
import { BillingManageGate } from './manage-gate'

type PlanCardProps = {
  plan: BillingPlan
  isCurrent: boolean
  /** Есть необработанная заявка на тариф (Order REQUESTED, C-5). */
  hasPendingRequest?: boolean
  /** Открыть заявку (C-5). Без обработчика CTA не рендерится. */
  onRequest?: (planKey: BillingPlanKey) => void
  canManage?: boolean
}

/**
 * Тарифная карточка из живого каталога (C-3): названия — i18n по PlanKey,
 * фичи собираются из фактических значений строки (комиссия, кредиты, квоты),
 * поэтому копия не может разъехаться с бэкендом. Цена: UZS из каталога, а до
 * установки цен — честный USD-якорь с оговоркой.
 */
export function PlanCard({
  plan,
  isCurrent,
  hasPendingRequest = false,
  onRequest,
  canManage = false,
}: PlanCardProps) {
  const t = useT()
  const locale = useLocale()

  const isFree = plan.key === 'START'
  const requestable = plan.isActive && plan.isPurchasable && !isFree

  const features: string[] = []
  features.push(
    t('billing.plans.featureCommission', { percent: formatBpsPercent(plan.commissionBps) })
  )
  if (plan.eventCredits > 0) {
    features.push(plural(locale, plan.eventCredits, EVENT_CREDITS_PLURAL))
  }
  if (plan.generationCredits > 0) {
    const count = plural(locale, plan.generationCredits, GENERATIONS_PLURAL)
    features.push(
      plan.generationWindow === 'CALENDAR_MONTH'
        ? t('billing.plans.featureGenerationsMonth', { count })
        : t('billing.plans.featureGenerationsPack', { count })
    )
  }
  if (plan.aiMinutesMonthly > 0) {
    features.push(
      t('billing.plans.featureAiMinutes', {
        count: plural(locale, plan.aiMinutesMonthly, AI_MINUTES_PLURAL),
      })
    )
  }
  features.push(plural(locale, plan.staffSeats, SEATS_PLURAL))
  if (plan.maxParticipantsPerEvent !== null && plan.maxParticipantsPerEvent !== undefined) {
    features.push(plural(locale, plan.maxParticipantsPerEvent, PARTICIPANTS_PLURAL))
  }
  if (plan.taskBoardEnabled) {
    features.push(t('billing.plans.featureTaskBoard'))
  }
  features.push(
    plan.qrMode === 'EXTENDED'
      ? t('billing.plans.featureQrExtended')
      : t('billing.plans.featureQrArrival')
  )
  features.push(
    plan.statsTier === 'FORECASTING_SLA'
      ? t('billing.plans.featureStatsSla')
      : plan.statsTier === 'FORECASTING'
        ? t('billing.plans.featureStatsForecast')
        : t('billing.plans.featureStatsBasic')
  )

  const periodSuffix = plan.validityDays
    ? t('billing.plans.pricePeriod', { days: plural(locale, plan.validityDays, DAYS_PLURAL) })
    : null

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-card p-6',
        isCurrent ? 'border-foreground' : 'border-border'
      )}
    >
      {hasPendingRequest && requestable && !isCurrent && (
        <div className="absolute -top-2.5 right-5">
          <StatusPill tone="scheduled" size="sm" dot={false}>
            {t('billing.plans.pendingBadge')}
          </StatusPill>
        </div>
      )}

      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t(`billing.tiers.${plan.key}`)}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        {isFree ? (
          <span className="text-[34px] font-bold leading-none tracking-[-0.03em] text-foreground">
            {t('billing.plans.freePrice')}
          </span>
        ) : plan.priceAmountMinor ? (
          <>
            <span className="text-[28px] font-bold leading-none tracking-[-0.03em] text-foreground">
              {formatUzsMinor(locale, plan.priceAmountMinor)}
            </span>
            {periodSuffix && (
              <span className="text-sm font-medium text-muted-foreground">{periodSuffix}</span>
            )}
          </>
        ) : plan.usdAnchorCents ? (
          <>
            <span className="text-[34px] font-bold leading-none tracking-[-0.03em] text-foreground">
              {formatUsdAnchorCents(plan.usdAnchorCents)}
            </span>
            {periodSuffix && (
              <span className="text-sm font-medium text-muted-foreground">{periodSuffix}</span>
            )}
          </>
        ) : (
          <span className="text-[34px] font-bold leading-none tracking-[-0.03em] text-muted-foreground">
            —
          </span>
        )}
      </div>

      {/* USD-якорь — не оферта: оплата в UZS, цену подтверждает команда. */}
      {!isFree && !plan.priceAmountMinor && (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          {t('billing.plans.usdAnchorNote')}
        </p>
      )}

      <div className="my-5 h-px bg-border" />

      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground"
          >
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={2.4} aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isCurrent ? (
          <Button variant="outline" disabled className="w-full">
            <Check className="mr-1.5 size-4" aria-hidden />
            {t('billing.plans.current')}
          </Button>
        ) : requestable && onRequest ? (
          <BillingManageGate canManage={canManage}>
            <Button
              className="w-full"
              disabled={!canManage || hasPendingRequest}
              onClick={() => onRequest(plan.key)}
              aria-label={t('billing.plans.requestAria', { plan: t(`billing.tiers.${plan.key}`) })}
            >
              <ArrowUpRight className="mr-1.5 size-4" aria-hidden />
              {t('billing.plans.requestCta')}
            </Button>
          </BillingManageGate>
        ) : !isFree ? (
          // Неактивная/непокупаемая строка: активация только через команду.
          <p className="rounded-lg bg-secondary/50 px-3 py-2.5 text-center text-[12px] font-medium text-muted-foreground">
            {t('billing.plans.managedRow')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
