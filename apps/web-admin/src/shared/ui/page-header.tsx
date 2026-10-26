import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

type PageHeaderProps = {
  title: ReactNode
  /**
   * Optional single inflected phrase appended to the title, set in the display
   * font and ember. The design system allows exactly one per headline — use it
   * sparingly. Admin keeps headlines restrained; reach for this rarely.
   */
  titleAccent?: ReactNode
  description?: ReactNode
  /** Small eyebrow text rendered above the title (e.g. section name). */
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

/**
 * Calm, enterprise-style admin page header. The first element of every page —
 * gives a stable anchor for title, secondary context and primary actions.
 *
 * Hierarchy: optional eyebrow / meta → title → description → trailing actions.
 * Admin density: title sits one step smaller than the organizer cabinet.
 */
export function PageHeader({
  title,
  titleAccent,
  description,
  eyebrow,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground sm:text-2xl">
          {title}
          {titleAccent && (
            <>
              {' '}
              <span className="font-display font-light tracking-[-0.03em] text-primary">
                {titleAccent}
              </span>
            </>
          )}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{actions}</div>
      )}
    </header>
  )
}
