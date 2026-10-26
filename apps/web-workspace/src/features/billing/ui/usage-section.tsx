import { Link } from 'react-router-dom'
import { ArrowUpRight, Bot, Users } from 'lucide-react'
import { plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { BillingUsageMeter } from '@api/services'
import { Button, ErrorState, Skeleton } from '@shared/ui'

import { useBillingEntitlementsQuery } from '../api'
import { SEATS_PLURAL } from '../lib/billing-plurals'
import { UsageMeterBar } from './usage-meter'

/** YYYY-MM → календарный месяц; иначе окно пакета (E-11a lazy windows). */
function isCalendarMonthKey(periodKey: string | null | undefined): boolean {
  return typeof periodKey === 'string' && /^\d{4}-\d{2}$/.test(periodKey)
}

type UsageSectionProps = {
  /** Действие «Улучшить тариф» для at-limit подсказок (переход на Plans tab). */
  onUpgrade?: () => void
}

/**
 * Дашборд использования (C-4): генерации, AI-минуты, места команды, кредиты
 * событий — из GET /billing/entitlements. Клиент только показывает: энфорсмент
 * серверный. При выключенной тарифной системе (S-19 OFF) секция скрыта —
 * лимиты не применяются, и рисовать их счётчики было бы нечестно.
 */
export function UsageSection({ onUpgrade }: UsageSectionProps) {
  const t = useT()
  const locale = useLocale()

  const entitlementsQuery = useBillingEntitlementsQuery()

  if (entitlementsQuery.isLoading) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-6" aria-hidden>
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    )
  }

  if (entitlementsQuery.isError || !entitlementsQuery.data) {
    return (
      <ErrorState
        title={t('billing.common.loadErrorTitle')}
        description={t('billing.common.loadErrorBody')}
        retryLabel={t('billing.common.retry')}
        onRetry={() => void entitlementsQuery.refetch()}
      />
    )
  }

  const ent = entitlementsQuery.data
  if (!ent.enforcementEnabled) return null

  const isPaidTier = ent.tierKey !== 'START'
  const aiMetered = ent.aiSeconds.limit !== null && ent.aiSeconds.limit > 0

  return (
    <section
      aria-label={t('billing.usage.title')}
      className="rounded-xl border border-border bg-card p-6"
    >
      <p className="text-sm font-semibold text-foreground">{t('billing.usage.title')}</p>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{t('billing.usage.subtitle')}</p>

      <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {/* Кредиты событий (только при живом пакете; START — не рендерим). */}
        {ent.eventCredits && (
          <QuotaMeter
            label={t('billing.overview.creditsLabel')}
            meter={{
              used: ent.eventCredits.granted - ent.eventCredits.remaining,
              limit: ent.eventCredits.granted,
              periodKey: null,
            }}
            valueText={t('billing.overview.creditsValue', {
              remaining: ent.eventCredits.remaining,
              granted: ent.eventCredits.granted,
            })}
            onUpgrade={onUpgrade}
          />
        )}

        {/* Генерации (сертификаты + бейджи, E-6). */}
        <QuotaMeter
          label={t('billing.usage.generationsLabel')}
          meter={ent.generations}
          windowLabel={
            isCalendarMonthKey(ent.generations.periodKey) ||
            ent.generationWindow === 'CALENDAR_MONTH'
              ? t('billing.usage.windowMonth')
              : t('billing.usage.windowPack')
          }
          onUpgrade={onUpgrade}
        />

        {/* AI-минуты: метерится в секундах (CR-26), делим на 60. Пока лимита
            нет: платным тарифам — честная карточка «скоро», START — ничего. */}
        {aiMetered ? (
          <QuotaMeter
            label={t('billing.usage.aiMinutesLabel')}
            meter={{
              used: Math.round(ent.aiSeconds.used / 60),
              limit: Math.round((ent.aiSeconds.limit ?? 0) / 60),
              periodKey: ent.aiSeconds.periodKey ?? null,
            }}
            windowLabel={t('billing.usage.windowMonth')}
            onUpgrade={onUpgrade}
          />
        ) : isPaidTier ? (
          <div className="flex items-start gap-3 rounded-lg bg-secondary/40 p-3.5">
            <Bot className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-foreground">
                {t('billing.usage.aiComingSoonTitle')}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {t('billing.usage.aiComingSoonBody')}
              </p>
            </div>
          </div>
        ) : null}

        {/* Места команды: занятость на клиенте не известна — честно показываем
            лимит тарифа и ведём в «Команду» (счётчик мест — на /users, C-9). */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-[13px] font-medium text-foreground">
              {t('billing.usage.seatsLabel')}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
              {ent.staffSeats === null || ent.staffSeats === undefined
                ? t('billing.usage.unlimited')
                : plural(locale, ent.staffSeats, SEATS_PLURAL)}
            </span>
          </div>
          <Link
            to="/users"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Users className="size-3.5" aria-hidden />
            {t('billing.usage.manageTeam')}
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}

function QuotaMeter({
  label,
  meter,
  windowLabel,
  valueText,
  onUpgrade,
}: {
  label: string
  meter: Pick<BillingUsageMeter, 'used'> & { limit: number | null; periodKey?: string | null }
  windowLabel?: string
  valueText?: string
  onUpgrade?: () => void
}) {
  const t = useT()

  const limit = meter.limit ?? null
  const atLimit = limit !== null && limit > 0 && meter.used >= limit

  return (
    <UsageMeterBar
      label={label}
      used={meter.used}
      limit={limit}
      windowLabel={windowLabel}
      valueText={
        valueText ??
        (limit === null
          ? t('billing.usage.unlimited')
          : t('billing.usage.valueOf', { used: meter.used, limit }))
      }
      footer={
        atLimit ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <p className="text-[12px] font-medium text-primary">{t('billing.usage.atLimit')}</p>
            {onUpgrade && (
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-[12px]" onClick={onUpgrade}>
                {t('billing.usage.upgradeCta')}
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  )
}
