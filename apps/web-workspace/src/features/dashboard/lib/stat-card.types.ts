export type StatCardProps = {
  label: string
  value: string | number
  delta: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  changePercent: number
  description?: string
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
  animationDelay?: number
}
