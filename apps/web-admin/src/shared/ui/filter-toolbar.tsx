import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@shared/lib/cn'

import { Button } from './shadcn/button'
import { Card } from './shadcn/card'
import { Input } from './shadcn/input'

type FilterToolbarProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  searchAriaLabel?: string
  /** Filter controls (Selects, FilterChips, Switches) rendered inline. */
  filters?: ReactNode
  /** Whether any filter / search is active — controls reset button visibility. */
  hasFilters?: boolean
  onReset?: () => void
  resetLabel?: string
  /** Right-aligned actions (e.g. "Create" button). */
  actions?: ReactNode
  /** Footer line, typically the result count. */
  footer?: ReactNode
  className?: string
}

/**
 * Single-source filter toolbar for admin listing pages. Replaces the
 * slightly-different filter Cards each page used to render.
 *
 * Layout: search (flex-1) + filters cluster + reset + actions, with an
 * optional footer for the result count.
 */
export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filters,
  hasFilters,
  onReset,
  resetLabel = 'Reset',
  actions,
  footer,
  className,
}: FilterToolbarProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:min-w-[240px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={searchValue}
            onChange={event => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel ?? searchPlaceholder}
            className="pl-9"
          />
        </div>

        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}

        {(hasFilters && onReset) || actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            {hasFilters && onReset && (
              <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
                <X className="size-3.5" aria-hidden="true" />
                {resetLabel}
              </Button>
            )}
            {actions}
          </div>
        ) : null}
      </div>

      {footer && (
        <p className="mt-3 text-xs text-muted-foreground">{footer}</p>
      )}
    </Card>
  )
}
