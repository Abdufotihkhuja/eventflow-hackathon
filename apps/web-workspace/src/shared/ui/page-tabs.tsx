import { useRef, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

export type PageTabItem<T extends string = string> = {
  id: T
  label: ReactNode
  /** Optional count shown as a mono chip after the label. */
  count?: number
}

type PageTabsProps<T extends string = string> = {
  items: PageTabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}

/**
 * Underline tab bar with optional counts — the design-system pattern for the
 * primary lifecycle filter of a worklist (events by status, registrations by
 * state…). Sits in the PageHeader `bottom` slot. Active underline is graphite,
 * not ember (ember is reserved for primary actions). The row's bottom border
 * doubles as the header/content divider. Implements the roving-tabindex
 * keyboard pattern (arrow keys / Home / End) for the announced `tablist` role.
 */
export function PageTabs<T extends string = string>({
  items,
  active,
  onChange,
  className,
}: PageTabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = items.length
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % count
    else if (event.key === 'ArrowLeft') next = (index - 1 + count) % count
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = count - 1
    else return

    event.preventDefault()
    const nextItem = items[next]
    if (nextItem) {
      onChange(nextItem.id)
      tabRefs.current[next]?.focus()
    }
  }

  return (
    <div
      role="tablist"
      className={cn('-mb-px flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {items.map((item, index) => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            ref={el => {
              tabRefs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={event => handleKeyDown(event, index)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-[3px] px-1.5 py-0.5 font-mono text-[11px] tabular-nums',
                  isActive ? 'bg-muted text-foreground' : 'bg-muted/60 text-muted-foreground'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
