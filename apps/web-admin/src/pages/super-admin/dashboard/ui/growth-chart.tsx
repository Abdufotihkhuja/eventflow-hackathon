/**
 * График динамики платформы: новые пользователи, регистрации и события
 * по ISO-неделям (12 недель). Recharts поверх токенов --chart-*.
 */

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useT } from '@eventflow/i18n/react'

import type { SystemStatsGrowthPoint } from '@api/services/superAdmin.types'
import { parseCalendarDate } from '@shared/lib'
import { Card } from '@shared/ui'

type GrowthChartProps = {
  growth: SystemStatsGrowthPoint[]
  locale: string
}

const SERIES = [
  { key: 'registrations', colorVar: '--chart-1' },
  { key: 'users', colorVar: '--chart-3' },
  { key: 'events', colorVar: '--chart-2' },
] as const

export function GrowthChart({ growth, locale }: GrowthChartProps) {
  const t = useT()

  const weekFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale]
  )

  const data = useMemo(
    () =>
      growth.map(point => ({
        ...point,
        weekLabel: weekFormatter.format(parseCalendarDate(point.weekStart)),
      })),
    [growth, weekFormatter]
  )

  const isEmpty = growth.every(
    point => point.users === 0 && point.registrations === 0 && point.events === 0
  )

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t('admin.dashboard.growth.title')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('admin.dashboard.growth.description')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SERIES.map(series => (
            <span
              key={series.key}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: `hsl(var(${series.colorVar}))` }}
              />
              {t(`admin.dashboard.growth.${series.key}`)}
            </span>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">{t('admin.dashboard.growth.empty')}</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                {SERIES.map(series => (
                  <linearGradient
                    key={series.key}
                    id={`growth-${series.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={`hsl(var(${series.colorVar}))`}
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="100%"
                      stopColor={`hsl(var(${series.colorVar}))`}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="weekLabel"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                content={<GrowthTooltip locale={locale} />}
              />
              {SERIES.map(series => (
                <Area
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stroke={`hsl(var(${series.colorVar}))`}
                  strokeWidth={1.75}
                  fill={`url(#growth-${series.key})`}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

type GrowthTooltipProps = {
  locale: string
  active?: boolean
  label?: string
  payload?: Array<{ dataKey?: string | number; value?: number | string; color?: string }>
}

function GrowthTooltip({ active, label, payload }: GrowthTooltipProps) {
  const t = useT()

  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-soft">
      <p className="mb-1 text-xs font-medium text-foreground">
        {t('admin.dashboard.growth.weekOf', { date: String(label ?? '') })}
      </p>
      <dl className="space-y-0.5">
        {payload.map(entry => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <dt className="text-muted-foreground">
              {t(`admin.dashboard.growth.${String(entry.dataKey)}`)}
            </dt>
            <dd className="ml-auto font-medium tabular-nums text-foreground">
              {entry.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
