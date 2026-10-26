import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@shared/ui'
import { cn } from '@shared/lib'
import type { StatCardProps } from '../lib/stat-card.types'

export function StatCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  changePercent,
  description,
  tooltipSide = 'left',
  animationDelay = 0,
}: StatCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus

  const trendColors = {
    up: 'bg-success-soft text-success-soft-foreground',
    down: 'bg-danger-soft text-danger-soft-foreground',
    neutral: 'text-muted-foreground bg-muted',
  }

  const iconColors = {
    up: 'bg-success-soft text-success-soft-foreground',
    down: 'bg-danger-soft text-danger-soft-foreground',
    neutral: 'text-muted-foreground bg-muted',
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition duration-300 hover:shadow-soft-lg',
        'animate-in fade-in slide-in-from-bottom-2 ease-out-expo'
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
      role="article"
      aria-label={`${label}: ${value}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            {description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 cursor-help text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} className="max-w-[180px] text-xs">
                  {description}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className={cn('rounded-lg p-2', iconColors[trend])}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <span className="block text-2xl font-bold tabular-nums tracking-tight">{value}</span>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center gap-0.5 rounded-md px-1.5 py-0.5',
                  trendColors[trend]
                )}
              >
                <TrendIcon className="size-3" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-xs font-medium tabular-nums">
                      {changePercent > 0 ? '+' : ''}
                      {changePercent}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side={tooltipSide} className="text-xs">
                    {delta}
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs text-muted-foreground">vs пред. мес.</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
