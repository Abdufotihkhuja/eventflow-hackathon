import type { ReactNode } from 'react'

/**
 * Shared header for every event-detail tab so the command center reads as one
 * system: optional event-name kicker, title, short description, optional
 * right-aligned actions.
 */
export function EventTabHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {kicker && (
          <p className="mb-1 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {kicker}
          </p>
        )}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
