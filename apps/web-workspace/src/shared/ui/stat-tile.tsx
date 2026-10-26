import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react'

import { cn } from '@shared/lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from './shadcn/tooltip'

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
  /** Short plain-language explanation shown via an ℹ️ tooltip next to the label. */
  info?: string
  icon?: LucideIcon
  tone?: StatTileTone
  delta?: StatTileDelta
  className?: string
}

const VALUE_TONE: Record<StatTileTone, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  warning: 'text-warning',
  info: 'text-primary',
  destructive: 'text-destructive',
}

const ICON_TONE: Record<StatTileTone, string> = {
  default: 'bg-muted text-muted-foreground',
  positive: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
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
 * A restrained metric tile for use in summary rows above tables/lists.
 *
 * Density comes from typography hierarchy and a small icon affordance —
 * not from coloured backgrounds, gradients or shadows.
 */
export function StatTile({
  label,
  value,
  hint,
  info,
  icon: Icon,
  tone = 'default',
  delta,
  className,
}: StatTileProps) {
  const TrendIcon = delta?.trend ? TREND_ICON[delta.trend] : null

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-soft',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {info && (
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label={info}
                className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {info}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {Icon && (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md',
              ICON_TONE[tone]
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            'text-3xl font-semibold leading-none tracking-tight tabular-nums',
            VALUE_TONE[tone]
          )}
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
