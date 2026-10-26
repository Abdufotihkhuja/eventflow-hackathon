import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { cn } from '@shared/lib/cn'

type StatTileTone = 'default' | 'positive' | 'warning' | 'info' | 'destructive'

type StatTileTrend = 'up' | 'down' | 'neutral'

type StatTileDelta = {
  label: string
  trend?: StatTileTrend
}

type StatTileProps = {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: StatTileTone
  delta?: StatTileDelta
  /** Mark the tile as needing attention (e.g. > 0 pending items). */
  highlight?: boolean
  className?: string
}

const VALUE_TONE: Record<StatTileTone, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  destructive: 'text-destructive',
}

const ICON_TONE: Record<StatTileTone, string> = {
  default: 'bg-muted text-muted-foreground',
  positive: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  destructive: 'bg-danger-soft text-danger-soft-foreground',
}

const TREND_TONE: Record<StatTileTrend, string> = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
}

const TREND_ICON: Record<StatTileTrend, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
}

/**
 * Restrained metric tile for admin dashboards & list summaries.
 * Density comes from typography hierarchy and a small icon affordance —
 * not from coloured backgrounds, gradients or shadows.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  delta,
  highlight,
  className,
}: StatTileProps) {
  const TrendIcon = delta?.trend ? TREND_ICON[delta.trend] : null
  const valueClass = highlight ? 'text-warning' : VALUE_TONE[tone]

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-soft',
        highlight && 'ring-1 ring-warning/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md',
              highlight
                ? 'bg-warning-soft text-warning-soft-foreground'
                : ICON_TONE[tone]
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn('text-3xl font-semibold leading-none tracking-tight tabular-nums', valueClass)}
        >
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              TREND_TONE[delta.trend ?? 'neutral']
            )}
          >
            {TrendIcon && <TrendIcon className="size-3" aria-hidden="true" />}
            {delta.label}
          </span>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
