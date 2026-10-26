/**
 * S-9: обзор монетизации платформы (/admin/billing → таб «Обзор»).
 *
 * Одна выборка GET /super-admin/billing/overview: карточки-STAT (организации,
 * распределение START/PRO/EXCLUSIVE, приостановки, очередь заявок) + таблица
 * живых пакетов с истечением ≤14 дней (сигнал предложить продление) с
 * deep-link'ом в биллинг-панель организации.
 */

import { Building2, CalendarClock, Inbox, PauseCircle } from 'lucide-react'
import { formatDate, plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { ExpiringPack } from '@api/services'
import { useBillingOverview, getApiErrorMessage } from '@features/super-admin'
import { CREDITS_PLURAL, DAYS_PLURAL } from '@shared/lib'
import { Card, EmptyState, ErrorState, Skeleton, StatTile, StatusPill } from '@shared/ui'

/** Целые дни до истечения (потолком, не ниже 0) — display-only. */
function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

export function OverviewSection() {
  const t = useT()
  const overview = useBillingOverview()

  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Card>
          <Skeleton className="mb-4 h-5 w-56" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      </div>
    )
  }

  if (overview.isError) {
    return (
      <ErrorState
        title={t('admin.billing.monetization.loadError')}
        description={getApiErrorMessage(overview.error, t('admin.billing.panel.loadErrorHint'))}
        onRetry={() => void overview.refetch()}
        retryLabel={t('admin.toasts.retryAgain')}
      />
    )
  }

  const data = overview.data
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={data.enforcement.enabled ? 'live' : 'neutral'}>
          {data.enforcement.enabled
            ? t('admin.billing.flags.enforcementOn')
            : t('admin.billing.flags.enforcementOff')}
        </StatusPill>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label={t('admin.billing.monetization.stats.totalOrgs')}
          value={data.totalOrganizations}
          icon={Building2}
        />
        <StatTile
          label={t('admin.billing.monetization.stats.start')}
          value={data.planDistribution.START}
          hint={t('admin.billing.monetization.stats.startHint')}
        />
        <StatTile
          label={t('admin.billing.monetization.stats.pro')}
          value={data.planDistribution.PRO}
          hint={t('admin.billing.monetization.stats.proHint')}
        />
        <StatTile
          label={t('admin.billing.monetization.stats.exclusive')}
          value={data.planDistribution.EXCLUSIVE}
          hint={t('admin.billing.monetization.stats.exclusiveHint')}
        />
        <StatTile
          label={t('admin.billing.monetization.stats.suspended')}
          value={data.suspendedOrganizations}
          icon={PauseCircle}
          tone={data.suspendedOrganizations > 0 ? 'destructive' : 'default'}
        />
        <StatTile
          label={t('admin.billing.monetization.stats.pendingRequests')}
          value={data.pendingRequests}
          icon={Inbox}
          highlight={data.pendingRequests > 0}
        />
      </div>

      <ExpiringPacksCard packs={data.expiringSoon} />
    </div>
  )
}

/** Таблица «истекают ≤14 дней»: org-id → deep-link в биллинг-панель. */
function ExpiringPacksCard({ packs }: { packs: ExpiringPack[] }) {
  const t = useT()
  const locale = useLocale()

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t('admin.billing.monetization.expiring.title')}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('admin.billing.monetization.expiring.description')}
      </p>

      {packs.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t('admin.billing.monetization.expiring.empty')}
          description={t('admin.billing.monetization.expiring.emptyHint')}
          className="py-8"
        />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">
                  {t('admin.billing.monetization.expiring.colOrg')}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t('admin.billing.monetization.expiring.colPlan')}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t('admin.billing.monetization.expiring.colExpires')}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t('admin.billing.monetization.expiring.colCredits')}
                </th>
                <th className="py-2 font-medium">
                  {t('admin.billing.monetization.expiring.colDaysLeft')}
                </th>
              </tr>
            </thead>
            <tbody>
              {packs.map(pack => {
                const days = pack.expiresAt ? daysUntil(pack.expiresAt) : null
                return (
                  <tr key={pack.organizationId} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <a
                        className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                        href={`/admin/organizations/${pack.organizationId}/billing`}
                      >
                        {pack.organizationId.slice(0, 8)}…
                      </a>
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {t(`admin.billing.tiers.${pack.planKey}`)}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {pack.expiresAt ? formatDate(pack.expiresAt, locale) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {plural(locale, pack.eventCreditsRemaining, CREDITS_PLURAL)}
                    </td>
                    <td
                      className={`py-2.5 font-medium tabular-nums ${
                        days !== null && days <= 3 ? 'text-warning' : 'text-foreground'
                      }`}
                    >
                      {days !== null ? plural(locale, days, DAYS_PLURAL) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
