import { useMemo } from 'react'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import type { AnalyticsTrendPoint } from '@api/services'
import { parseCalendarDate } from '@shared/lib'
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
  trend: AnalyticsTrendPoint[]
}

/**
 * Stacked area of per-day registrations, split by status (approved / pending / rejected).
 *
 * Honest empty state — if the backend returned no points (e.g. no registrations within the
 * filter window), show a non-decorative explanatory card instead of a flat zero line.
 */
export function RegistrationTrendChart({ trend }: Props) {
  const { t, locale } = useI18n()

  const data = useMemo(
    () =>
      trend.map(p => ({
        ...p,
        dateLabel: formatDate(parseCalendarDate(p.date), locale, {
          day: 'numeric',
          month: 'short',
        }),
      })),
    [trend, locale],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('events.analytics.trend.title')}</CardTitle>
        <CardDescription>{t('events.analytics.trend.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title={t('events.analytics.trend.empty')}
            description={t('events.analytics.emptyDescription')}
          />
        ) : (
          <div className="h-[260px] w-full">
            <ChartContainer
              className="h-full w-full"
              config={{
                approved: {
                  label: t('events.analytics.trend.legendApproved'),
                  color: 'hsl(var(--chart-1, 142 71% 45%))',
                },
                pending: {
                  label: t('events.analytics.trend.legendPending'),
                  color: 'hsl(var(--chart-2, 38 92% 50%))',
                },
                rejected: {
                  label: t('events.analytics.trend.legendRejected'),
                  color: 'hsl(var(--chart-3, 0 84% 60%))',
                },
              }}
            >
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="reg-approved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="reg-pending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="reg-rejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
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
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  align="right"
                  verticalAlign="top"
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  name={t('events.analytics.trend.legendApproved')}
                  stackId="1"
                  stroke="hsl(142 71% 45%)"
                  fill="url(#reg-approved)"
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  name={t('events.analytics.trend.legendPending')}
                  stackId="1"
                  stroke="hsl(38 92% 50%)"
                  fill="url(#reg-pending)"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  name={t('events.analytics.trend.legendRejected')}
                  stackId="1"
                  stroke="hsl(0 84% 60%)"
                  fill="url(#reg-rejected)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
