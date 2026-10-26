import { useT } from '@eventflow/i18n/react'

import type { AnalyticsOverview } from '@api/services'
import { cn } from '@shared/lib'

type Props = {
  overview: AnalyticsOverview
  testsAvailable: boolean
}

/**
 * Overview band for the analytics tab. Designed for the editorial bone-and-ink chrome:
 *
 *   - ONE hero card with the headline number ("total registrations"). All status breakdown lives
 *     inside it as a quiet horizontal ledger, not five separate boxes with rainbow numbers.
 *   - A thin row of rate KPIs underneath, each with a slim proportional meter — readable at a
 *     glance without the page turning into a Christmas tree.
 *
 * Colour is reserved for accent — ember on the hero number, success/destructive only as small
 * dot indicators next to the status labels. Big numbers stay default ink so they don't compete.
 */
export function AnalyticsOverviewCards({ overview, testsAvailable }: Props) {
  const t = useT()
  const unavailable = t('events.analytics.overview.unavailable')
  const fmt = (v: number) => v.toLocaleString()
  const fmtPct = (v: number | null) => (v === null ? unavailable : `${v}%`)

  const statusLedger: Array<{
    key: string
    label: string
    count: number
    dot: 'accent' | 'pending' | 'rejected' | 'cancelled' | 'attended'
  }> = [
    {
      key: 'approved',
      label: t('events.analytics.overview.approved'),
      count: overview.approved,
      dot: 'accent',
    },
    {
      key: 'pending',
      label: t('events.analytics.overview.pending'),
      count: overview.pending,
      dot: 'pending',
    },
    {
      key: 'rejected',
      label: t('events.analytics.overview.rejected'),
      count: overview.rejected,
      dot: 'rejected',
    },
    {
      key: 'cancelled',
      label: t('events.analytics.overview.cancelled'),
      count: overview.cancelled,
      dot: 'cancelled',
    },
    {
      key: 'attended',
      label: t('events.analytics.overview.attended'),
      count: overview.attended,
      dot: 'attended',
    },
  ]

  const rates: Array<{ key: string; label: string; value: number | null }> = [
    {
      key: 'approval',
      label: t('events.analytics.overview.approvalRate'),
      value: overview.approvalRate,
    },
    {
      key: 'attendance',
      label: t('events.analytics.overview.attendanceRate'),
      value: overview.attendanceRate,
    },
    {
      key: 'conversion',
      label: t('events.analytics.overview.endToEndConversion'),
      value: overview.endToEndConversion,
    },
    ...(testsAvailable
      ? [
          {
            key: 'avgScore',
            label: t('events.analytics.overview.averageTestScore'),
            value: overview.averageTestScore,
          },
          {
            key: 'testCompletion',
            label: t('events.analytics.overview.testCompletionRate'),
            value: overview.testCompletionRate,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {/* Hero card: single headline + inline status ledger */}
      <section className="rounded-xl border border-border bg-card px-6 py-5 shadow-soft">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('events.analytics.overview.totalRegistrations')}
            </p>
            <p className="mt-2 text-5xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {fmt(overview.totalRegistrations)}
            </p>
          </div>

          {/* Inline status ledger — single line on desktop, wraps on narrow viewports */}
          <ul className="flex flex-wrap items-end gap-x-6 gap-y-3 md:justify-end">
            {statusLedger.map(item => (
              <li
                key={item.key}
                className="flex flex-col items-start gap-1 md:items-end"
              >
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', DOT_TONE[item.dot])}
                  />
                  {item.label}
                </span>
                <span
                  className={cn(
                    'font-mono text-lg font-medium tabular-nums',
                    item.count === 0 ? 'text-muted-foreground/60' : 'text-foreground',
                  )}
                >
                  {fmt(item.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* KPI strip — slim cells with proportional meter; no icons, no colored numbers */}
      <section
        className={cn(
          'grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border/60',
          rates.length === 3
            ? 'sm:grid-cols-3'
            : 'sm:grid-cols-2 lg:grid-cols-5',
        )}
      >
        {rates.map(rate => (
          <RateCell key={rate.key} label={rate.label} value={rate.value} render={fmtPct} />
        ))}
      </section>
    </div>
  )
}

const DOT_TONE: Record<string, string> = {
  accent: 'bg-success',
  pending: 'bg-muted-foreground/60',
  rejected: 'bg-destructive/80',
  cancelled: 'bg-muted-foreground/40',
  attended: 'bg-primary',
}

function RateCell({
  label,
  value,
  render,
}: {
  label: string
  value: number | null
  render: (v: number | null) => string
}) {
  const meterPct = value === null ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div className="flex flex-col justify-between gap-3 bg-card px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="space-y-2">
        <p className="font-mono text-2xl font-medium leading-none tabular-nums text-foreground">
          {render(value)}
        </p>
        <div
          aria-hidden="true"
          className={cn(
            'h-[3px] w-full overflow-hidden rounded-full bg-muted',
            value === null && 'opacity-40',
          )}
        >
          <div
            className="h-full rounded-full bg-foreground/70 transition-[width]"
            style={{ width: `${meterPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
