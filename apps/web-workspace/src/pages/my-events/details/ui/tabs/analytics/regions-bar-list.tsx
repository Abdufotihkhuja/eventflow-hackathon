import { useMemo } from 'react'

import { useLocale } from '@eventflow/i18n/react'

import { cn } from '@shared/lib'

import { UZ_REGIONS, matchRegion, type UzRegionKey } from './lib/uz-regions'

type Props = {
  /** Region buckets returned by the API. Keys are free-text user input. */
  buckets: Array<{ key: string; count: number }>
  /** Count for `__unknown__` rows (no region in profile). */
  unknownCount: number
  /** Count for `__other__` rows (non-empty region but didn't match any UZ alias). */
  otherCount: number
}

/**
 * Ranked horizontal bar list of registrations per region.
 *
 * Replaces the earlier schematic SVG "map of Uzbekistan" — the hand-authored polygons didn't
 * actually look like Uzbekistan, so they confused more than they helped. A ranked bar list with
 * proper localised names is honest about the data shape and reads at a glance: "the audience is
 * concentrated in Andijan; everything else is long-tail".
 *
 * If/when we ship a real choropleth with proper TopoJSON, this component can sit next to it as
 * the legend/screen-reader fallback — keep the structure compatible.
 */
export function RegionsBarList({ buckets, unknownCount, otherCount }: Props) {
  const uiLocale = useLocale()

  // Resolve free-text regions to canonical keys + count unresolved tails.
  const { rows, offMapTotal } = useMemo(() => {
    const counts = new Map<UzRegionKey, number>()
    let unresolved = 0
    for (const b of buckets) {
      if (b.key === '__unknown__' || b.key === '__other__') continue
      const k = matchRegion(b.key)
      if (k) counts.set(k, (counts.get(k) ?? 0) + b.count)
      else unresolved += b.count
    }
    const out = Array.from(counts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          labelOf(a.key, uiLocale).localeCompare(labelOf(b.key, uiLocale)),
      )
    const offMap = (otherCount ?? 0) + (unknownCount ?? 0) + unresolved
    return { rows: out, offMapTotal: offMap }
  }, [buckets, unknownCount, otherCount, uiLocale])

  const visible = rows.filter(r => r.count > 0)
  const total = visible.reduce((s, r) => s + r.count, 0) + offMapTotal
  const max = Math.max(...visible.map(r => r.count), offMapTotal, 1)

  if (visible.length === 0 && offMapTotal === 0) return null

  return (
    <ul className="space-y-2">
      {visible.map(r => (
        <RegionRow
          key={r.key}
          label={labelOf(r.key, uiLocale)}
          count={r.count}
          pct={total > 0 ? Math.round((r.count / total) * 100) : 0}
          fillPct={Math.round((r.count / max) * 100)}
        />
      ))}
      {offMapTotal > 0 && (
        <RegionRow
          label={offMapLabel(uiLocale)}
          count={offMapTotal}
          pct={total > 0 ? Math.round((offMapTotal / total) * 100) : 0}
          fillPct={Math.round((offMapTotal / max) * 100)}
          dimmed
        />
      )}
    </ul>
  )
}

function RegionRow({
  label,
  count,
  pct,
  fillPct,
  dimmed,
}: {
  label: string
  count: number
  pct: number
  fillPct: number
  dimmed?: boolean
}) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span
          className={cn(
            'min-w-0 truncate',
            dimmed ? 'italic text-muted-foreground' : 'text-foreground',
          )}
          title={label}
        >
          {label}
        </span>
        <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
          {count.toLocaleString()}{' '}
          <span className="text-muted-foreground/60">· {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            dimmed ? 'bg-muted-foreground/30' : 'bg-primary/70',
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </li>
  )
}

function labelOf(key: UzRegionKey, locale: string): string {
  const r = UZ_REGIONS.find(x => x.key === key)
  if (!r) return key
  if (locale === 'ru') return r.ru
  if (locale === 'uz') return r.uz
  return r.en
}

function offMapLabel(locale: string): string {
  if (locale === 'ru') return 'Другое / не указано'
  if (locale === 'uz') return 'Boshqa / ko‘rsatilmagan'
  return 'Other / unknown'
}
