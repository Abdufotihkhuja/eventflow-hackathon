import { AlertCircle, ArrowRight, CalendarClock, CreditCard, Info, RefreshCw } from 'lucide-react'
import { plural, toIntlLocale } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { BillingPlanKey } from '@api/services'
import { formatDate } from '@shared/lib/format'
import { Button, ErrorState, Skeleton, StatusPill } from '@shared/ui'

import { useBillingEntitlementsQuery, useBillingStatusQuery } from '../api'
import { DAYS_LEFT_PLURAL } from '../lib/billing-plurals'
import { daysUntil, formatBpsPercent } from '../lib/format'
import { useBillingAccess } from '../lib/use-billing-access'
import { BillingManageGate } from './manage-gate'
import { ManagedNotice } from './managed-notice'
import { UsageMeterBar } from './usage-meter'
import { UsageSection } from './usage-section'

const EXPIRY_WARNING_DAYS = 14

type OverviewSectionProps = {
  /** Switch the page to the Plans tab. */
  onComparePlans: () => void
  /** Открыть заявку на продление того же тарифа (C-5). Fallback — Plans tab. */
  onRenew?: (planKey: BillingPlanKey) => void
}

export function OverviewSection({ onComparePlans, onRenew }: OverviewSectionProps) {
  const t = useT()
  const locale = useLocale()
  const { canManage } = useBillingAccess()

  const statusQuery = useBillingStatusQuery()
  const entitlementsQuery = useBillingEntitlementsQuery()

  if (statusQuery.isLoading || entitlementsQuery.isLoading) {
    return <OverviewSkeleton />
  }

  if (statusQuery.isError || entitlementsQuery.isError || !statusQuery.data || !entitlementsQuery.data) {
    return (
      <ErrorState
        title={t('billing.common.loadErrorTitle')}
        description={t('billing.common.loadErrorBody')}
        retryLabel={t('billing.common.retry')}
        onRetry={() => {
          void statusQuery.refetch()
          void entitlementsQuery.refetch()
        }}
      />
    )
  }

  const status = statusQuery.data
  const entitlements = entitlementsQuery.data
  const purchase = status.activePurchase ?? null
  const isPaidPack = status.source === 'PURCHASE' && purchase !== null
  const tierName = t(`billing.tiers.${status.tierKey}`)
  const commissionPercent = formatBpsPercent(entitlements.commissionBps)
  const commissionOverridden = entitlements.overridesApplied.includes('COMMISSION_BPS')

  const intlLocale = toIntlLocale(locale)

  return (
    <div className="space-y-5">
      {/* S-19 выключен: тарифная система ещё не применяется — говорим честно. */}
      {!entitlements.enforcementEnabled && (
        <div className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t('billing.notEnabled.title')}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t('billing.notEnabled.body')}
            </p>
          </div>
        </div>
      )}

      {/* Приостановка (E-17): read-only режим воркспейса. */}
      {entitlements.suspended && (
        <div className="flex gap-3 rounded-xl border border-warning-soft bg-warning-soft p-4" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t('billing.suspended.title')}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t('billing.suspended.body')}
            </p>
          </div>
        </div>
      )}

      {/* Текущий тариф — живые данные /billing/status + /billing/entitlements. */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t('billing.overview.currentPlan')}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold tracking-[-0.02em] text-foreground">{tierName}</span>
          <StatusPill tone="brand" size="sm" dot={false}>
            {t('billing.overview.currentBadge')}
          </StatusPill>
          <StatusPill tone={isPaidPack ? 'live' : 'neutral'} size="sm" dot={false}>
            {isPaidPack ? t('billing.overview.sourcePurchase') : t('billing.overview.sourceDefault')}
          </StatusPill>
          {status.tierKey === 'START' && (
            <StatusPill tone="neutral" size="sm" dot={false}>
              {t('billing.overview.freeBadge')}
            </StatusPill>
          )}
        </div>

        <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-muted-foreground">
          {isPaidPack ? t('billing.overview.packSummary') : t('billing.overview.startSummary')}
        </p>

        {/* Эффективная комиссия (bps/100) + честная оговорка про билеты. */}
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-muted-foreground">
              {t('billing.overview.commissionLabel')}:
            </span>
            <span className="text-sm font-semibold text-foreground">
              {t('billing.overview.commissionValue', { percent: commissionPercent })}
            </span>
            {commissionOverridden && (
              <StatusPill tone="info" size="sm" dot={false}>
                {t('billing.overview.commissionOverrideHint')}
              </StatusPill>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t('billing.overview.commissionTicketsNote')}
          </p>
        </div>

        <div className="mt-6">
          <Button variant="outline" size="sm" onClick={onComparePlans}>
            {t('billing.overview.comparePlans')}
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Пакет (90 дней, §2.1): кредиты, активация, счётчик до конца периода. */}
      {isPaidPack && purchase && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
                <CalendarClock className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('billing.overview.packTitle')}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {purchase.activatedAt
                    ? t('billing.overview.activatedOn', {
                        date: formatDate(purchase.activatedAt, intlLocale),
                      })
                    : t('billing.overview.awaitingActivation')}
                </p>
              </div>
            </div>
            <PackExpiry expiresAt={purchase.expiresAt ?? null} locale={locale} intlLocale={intlLocale} />
          </div>

          <div className="mt-5">
            <UsageMeterBar
              label={t('billing.overview.creditsLabel')}
              used={purchase.eventCreditsGranted - purchase.eventCreditsRemaining}
              limit={purchase.eventCreditsGranted}
              valueText={t('billing.overview.creditsValue', {
                remaining: purchase.eventCreditsRemaining,
                granted: purchase.eventCreditsGranted,
              })}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[480px] text-[13px] leading-relaxed text-muted-foreground">
              {t('billing.overview.renewResetNote')}
            </p>
            <BillingManageGate canManage={canManage}>
              <Button
                size="sm"
                disabled={!canManage}
                onClick={() => (onRenew ? onRenew(purchase.planKey) : onComparePlans())}
              >
                <RefreshCw className="mr-1.5 size-4" aria-hidden />
                {t('billing.overview.renewCta')}
              </Button>
            </BillingManageGate>
          </div>
        </div>
      )}

      {/* Использование квот (C-4) — рендерится только при включённом S-19. */}
      <UsageSection onUpgrade={onComparePlans} />

      {/* Payment method — honest: no payment provider is connected. */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
              <CreditCard className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t('billing.overview.paymentTitle')}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {t('billing.overview.paymentNotEnabled')}
              </p>
            </div>
          </div>
          <StatusPill tone="neutral" size="sm" dot={false}>
            {t('billing.addons.unavailable')}
          </StatusPill>
        </div>
        <p className="mt-3 max-w-[640px] text-[13px] leading-relaxed text-muted-foreground">
          {t('billing.overview.paymentNotEnabledBody')}
        </p>
      </div>

      <ManagedNotice />
    </div>
  )
}

/** Счётчик до конца периода: warning-тон ближе к концу (< 14 дней). */
function PackExpiry({
  expiresAt,
  locale,
  intlLocale,
}: {
  expiresAt: string | null
  locale: string
  intlLocale: string
}) {
  const t = useT()

  if (!expiresAt) {
    return (
      <StatusPill tone="neutral" size="md" dot={false}>
        {t('billing.overview.noExpiry')}
      </StatusPill>
    )
  }

  const daysLeft = daysUntil(expiresAt)
  const expired = daysLeft < 0
  const expiringSoon = !expired && daysLeft < EXPIRY_WARNING_DAYS

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <StatusPill tone={expired ? 'cancelled' : expiringSoon ? 'warning' : 'neutral'} size="md">
        {expired ? t('billing.overview.expired') : plural(locale, daysLeft, DAYS_LEFT_PLURAL)}
      </StatusPill>
      <span className="text-[12px] text-muted-foreground">
        {t('billing.overview.expiresOn', { date: formatDate(expiresAt, intlLocale) })}
      </span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-[520px]" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  )
}
