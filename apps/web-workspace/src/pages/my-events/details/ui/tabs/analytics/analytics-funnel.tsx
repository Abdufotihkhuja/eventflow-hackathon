import { useT } from '@eventflow/i18n/react'

import type { AnalyticsFunnel as AnalyticsFunnelData } from '@api/services'
import { cn } from '@shared/lib'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui'

type Props = {
  funnel: AnalyticsFunnelData
}

/**
 * Simple horizontal funnel. Each step shows absolute count and percentage of the original
 * `registered` cohort. If a step's data is unavailable (e.g. no tests on the event), it renders
 * as a faded "not tracked" row instead of showing zeros that look like a drop-off.
 */
export function AnalyticsFunnel({ funnel }: Props) {
  const t = useT()

  const total = funnel.registered

  const steps = [
    { key: 'registered', label: t('events.analytics.funnel.stepRegistered'), value: funnel.registered as number | null },
    { key: 'approved', label: t('events.analytics.funnel.stepApproved'), value: funnel.approved as number | null },
    { key: 'checkedIn', label: t('events.analytics.funnel.stepCheckedIn'), value: funnel.checkedIn as number | null },
    {
      key: 'testCompleted',
      label: t('events.analytics.funnel.stepTestCompleted'),
      value: funnel.testCompleted, // null when event has no tests
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('events.analytics.funnel.title')}</CardTitle>
        <CardDescription>{t('events.analytics.funnel.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((step, i) => {
            const unavailable = step.value === null
            const value = step.value ?? 0
            const pct = total > 0 && !unavailable ? Math.round((value / total) * 100) : 0

            return (
              <li key={step.key} className="relative">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-foreground">
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-mono text-muted-foreground">
                      {i + 1}
                    </span>
                    {step.label}
                  </span>
                  {unavailable ? (
                    <span className="font-mono text-[12px] italic text-muted-foreground/70">
                      {t('events.analytics.funnel.stepUnavailable')}
                    </span>
                  ) : (
                    <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                      {value.toLocaleString()}
                      <span className="text-muted-foreground/60"> · {pct}%</span>
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    'mt-1 h-2 w-full overflow-hidden rounded-full bg-muted',
                    unavailable && 'opacity-50',
                  )}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width]',
                      i === 0
                        ? 'bg-primary/70'
                        : i === 1
                          ? 'bg-primary/55'
                          : i === 2
                            ? 'bg-primary/40'
                            : 'bg-primary/25',
                    )}
                    style={{ width: unavailable ? '0%' : `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
