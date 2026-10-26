import { useMemo, useState } from 'react'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useT } from '@eventflow/i18n/react'

import type { AnalyticsBucket } from '@api/services'
import { cn } from '@shared/lib'

type Props = {
  buckets: AnalyticsBucket[]
  /** Optional headline override; defaults to "Total" beneath the centre figure. */
  centreLabel?: string
}

const SLICE_COLORS: Record<string, string> = {
  MALE: 'hsl(210 72% 52%)', // calm blue — not the brand ember (which is reserved for accents)
  FEMALE: 'hsl(340 70% 58%)', // dusty rose
  UNKNOWN: 'hsl(0 0% 62%)', // neutral grey
}

/**
 * Donut chart for the gender breakdown.
 *
 * The donut shape lets us put the headline number (total) in the centre so the eye reads the
 * pie as "share of N" instead of "another small thing on a busy page". Hovering a slice swaps
 * the centre number to that slice's count + %, no separate tooltip — keeps the visual quiet.
 */
export function GenderDonut({ buckets, centreLabel }: Props) {
  const t = useT()
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const total = buckets.reduce((s, b) => s + b.count, 0)

  // Localise canonical labels coming from the backend.
  const data = useMemo(
    () =>
      buckets
        .filter(b => b.count > 0)
        .map(b => ({
          key: b.key,
          name: localiseLabel(b.key, t),
          value: b.count,
        })),
    [buckets, t],
  )

  if (total === 0 || data.length === 0) {
    return null // parent renders the empty state; we just bail out of the chart layer.
  }

  const active = activeKey ? data.find(d => d.key === activeKey) : null
  const centreCount = active ? active.value : total
  const centreCaption = active
    ? `${active.name} · ${Math.round((active.value / total) * 100)}%`
    : (centreLabel ?? t('events.analytics.overview.totalRegistrations'))

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative h-[200px] w-full max-w-[260px]"
        onMouseLeave={() => setActiveKey(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={92}
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              onMouseEnter={(_, idx) => setActiveKey(data[idx]?.key ?? null)}
              isAnimationActive={false}
            >
              {data.map(d => (
                <Cell
                  key={d.key}
                  fill={SLICE_COLORS[d.key] ?? SLICE_COLORS.UNKNOWN}
                  opacity={activeKey && activeKey !== d.key ? 0.35 : 1}
                  className="transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={() => null} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label — absolute-positioned over the donut hole. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-semibold leading-none tabular-nums text-foreground">
            {centreCount.toLocaleString()}
          </span>
          <span className="mt-1 max-w-[140px] truncate text-[11px] uppercase tracking-wider text-muted-foreground">
            {centreCaption}
          </span>
        </div>
      </div>

      {/* Legend underneath — small swatches with counts + %. */}
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
        {data.map(d => {
          const pct = Math.round((d.value / total) * 100)
          const isActive = activeKey === d.key
          return (
            <li
              key={d.key}
              className={cn(
                'inline-flex cursor-default items-baseline gap-1.5 transition-opacity',
                activeKey && !isActive && 'opacity-50',
              )}
              onMouseEnter={() => setActiveKey(d.key)}
              onMouseLeave={() => setActiveKey(null)}
            >
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-full"
                style={{ background: SLICE_COLORS[d.key] ?? SLICE_COLORS.UNKNOWN }}
              />
              <span className="text-foreground">{d.name}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {d.value.toLocaleString()}{' '}
                <span className="text-muted-foreground/70">· {pct}%</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function localiseLabel(key: string, t: ReturnType<typeof useT>): string {
  switch (key) {
    case 'MALE':
      return t('events.analytics.demographics.genderMale')
    case 'FEMALE':
      return t('events.analytics.demographics.genderFemale')
    case 'UNKNOWN':
      return t('events.analytics.demographics.bucketUnknown')
    default:
      return key
  }
}
