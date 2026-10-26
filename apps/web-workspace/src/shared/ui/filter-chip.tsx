import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  children: ReactNode
}

/**
 * A subdued, accessible toggle chip used for inline filters. Replaces the
 * various ad-hoc `FilterButton` re-implementations across pages.
 */
export function FilterChip({ active = false, className, children, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
