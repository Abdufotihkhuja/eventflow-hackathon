import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@shared/lib/cn'

// Компоненты Chart от shadcn/ui
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config?: Record<string, { label: string; color?: string }>
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
  }
>(({ className, config, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = 'ChartContainer'

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & React.ComponentProps<typeof RechartsPrimitive.Tooltip>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-background p-2 shadow-md', className)}
      {...props}
    />
  )
})
ChartTooltipContent.displayName = 'ChartTooltipContent'

export { ChartContainer, ChartTooltip, ChartTooltipContent }
