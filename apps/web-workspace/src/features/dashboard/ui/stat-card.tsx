import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@shared/lib'
import type { StatCardProps } from '../lib/stat-card.types'

/**
 * Studio KPI tile — calm editorial metric card.
 * Label (uppercase, tracked) + mono delta on top, large tight value, hint below.
 * Density comes from typography, not coloured backgrounds.
 */
export function StatCard({
  label,
  value,
  delta,
  trend,
  changePercent,
  animationDelay = 0,
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const deltaColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground'

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 ease-out-expo rounded-[10px] border border-border bg-card p-5"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
      role="article"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        {changePercent !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium tabular-nums',
              deltaColor
            )}
          >
            <TrendIcon className="size-3" />
            {Math.abs(changePercent)}%
          </span>
        )}
      </div>

      <div className="mt-3 text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
        {value}
      </div>

      {delta && <p className="mt-2 text-xs leading-snug text-muted-foreground">{delta}</p>}
    </div>
  )
}
