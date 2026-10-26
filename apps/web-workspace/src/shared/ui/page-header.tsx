import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

type PageHeaderProps = {
  title: ReactNode
  /**
   * Optional single inflected phrase appended to the title, set in the display
   * font and ember. The design system allows exactly one per headline — use it
   * sparingly (e.g. "Today" → italic-free Space Grotesk accent). No trailing
   * punctuation handling; pass it as you want it shown.
   */
  titleAccent?: ReactNode
  description?: ReactNode
  /** Small eyebrow text rendered above the title (e.g. section name). */
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  /**
   * Full-width content rendered below the title row — typically a status tab bar
   * (with counts) or a filter strip. When present, the divider role moves to this
   * row so the header reads as: title row → tabs → page content.
   */
  bottom?: ReactNode
  className?: string
}

/**
 * Calm, enterprise-style page header. Replaces hero blocks, gradients and
 * decorative banners. Use it as the first element of every workspace page.
 *
 * Hierarchy: optional eyebrow / meta → title → description → trailing actions,
 * with an optional full-width `bottom` row (status tabs / filters). The bottom
 * border separates the header from page content for clearer rhythm.
 */
export function PageHeader({
  title,
  titleAccent,
  description,
  eyebrow,
  actions,
  meta,
  bottom,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('space-y-5', !bottom && 'border-b border-border pb-6', className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </div>
          )}
          {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
          <h1 className="text-2xl font-bold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[28px]">
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
            <p className="max-w-[640px] text-[14.5px] leading-[1.55] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{actions}</div>
        )}
      </div>
      {bottom}
    </header>
  )
}
