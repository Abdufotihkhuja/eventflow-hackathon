import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { Lightbulb, ListChecks } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { AnalyticsTests } from '@api/services'
import { cn } from '@shared/lib'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  EmptyState,
} from '@shared/ui'

type Props = {
  tests: AnalyticsTests
}

/**
 * Test analytics — visible only when the event has a test. Renders a calm summary row + a
 * score-distribution bar chart + a single contextual insight (no toxic "weakest performer" callouts).
 */
export function TestAnalyticsSection({ tests }: Props) {
  const t = useT()

  if (!tests.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('events.analytics.tests.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ListChecks}
            title={t('events.analytics.tests.noTestsTitle')}
            description={t('events.analytics.tests.noTestsDescription')}
          />
        </CardContent>
      </Card>
    )
  }

  const fmt = (v: number | null) => (v === null ? '—' : v.toLocaleString())
  const fmtPct = (v: number | null) => (v === null ? '—' : `${v}%`)

  const insight = computeInsight(tests, t)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('events.analytics.tests.title')}</CardTitle>
        <CardDescription>{t('events.analytics.tests.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCell label={t('events.analytics.tests.started')} value={fmt(tests.started)} />
          <SummaryCell label={t('events.analytics.tests.completed')} value={fmt(tests.completed)} />
          <SummaryCell label={t('events.analytics.tests.passed')} value={fmt(tests.passed)} tone="positive" />
          <SummaryCell
            label={t('events.analytics.tests.failed')}
            value={fmt(tests.failed)}
            tone={tests.failed > 0 ? 'destructive' : 'default'}
          />
          <SummaryCell label={t('events.analytics.tests.averageScore')} value={fmtPct(tests.averageScore)} />
          <SummaryCell label={t('events.analytics.tests.minScore')} value={fmtPct(tests.minScore)} />
          <SummaryCell label={t('events.analytics.tests.maxScore')} value={fmtPct(tests.maxScore)} />
          <SummaryCell label={t('events.analytics.tests.passRate')} value={fmtPct(tests.passRate)} />
        </div>

        {/* Distribution */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('events.analytics.tests.distributionTitle')}
          </p>
          <div className="h-[200px] w-full">
            <ChartContainer className="h-full w-full">
              <BarChart
                data={tests.scoreDistribution}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={l =>
                    `${t('events.analytics.tests.distributionXLabel')}: ${l}`
                  }
                  formatter={v =>
                    [v, t('events.analytics.tests.distributionYLabel')] as [number, string]
                  }
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Insight */}
        {insight && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              insight.tone === 'positive'
                ? 'border-success/30 bg-success/5'
                : 'border-warning/30 bg-warning/5',
            )}
          >
            <Lightbulb
              className={cn(
                'mt-0.5 size-4 shrink-0',
                insight.tone === 'positive' ? 'text-success' : 'text-warning',
              )}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{insight.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{insight.description}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryCell({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'destructive'
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 font-mono text-base font-semibold tabular-nums',
          tone === 'positive' && 'text-success',
          tone === 'destructive' && 'text-destructive',
          tone === 'default' && 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  )
}

type InsightTone = 'positive' | 'warning'

function computeInsight(
  tests: AnalyticsTests,
  t: ReturnType<typeof useT>,
): { title: string; description: string; tone: InsightTone } | null {
  if (tests.completed < 5) return null // not enough data to comment meaningfully

  if (tests.passRate !== null && tests.passRate >= 70) {
    return {
      title: t('events.analytics.tests.insightStrong'),
      description: t('events.analytics.tests.insightStrongDescription'),
      tone: 'positive',
    }
  }
  if (tests.passRate !== null && tests.passRate <= 30) {
    return {
      title: t('events.analytics.tests.insightReview'),
      description: t('events.analytics.tests.insightReviewDescription'),
      tone: 'warning',
    }
  }
  return null
}
