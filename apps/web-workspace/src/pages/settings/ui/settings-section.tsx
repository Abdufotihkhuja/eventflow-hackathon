import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

type SettingsSectionProps = {
  /** Anchor id — matches a SettingsNav item so the subnav can scroll to it. */
  id: string
  title: ReactNode
  description?: ReactNode
  /** Trailing slot on the section header (e.g. a status pill or small action). */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * A single settings panel: titled card with optional sub-text and a trailing
 * action slot. `scroll-mt` keeps the anchored heading clear of the sticky topbar
 * when navigated to from the left subnav.
 */
export function SettingsSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20 rounded-xl border border-border bg-card p-6 sm:p-7',
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
          {description && (
            <p className="max-w-[520px] text-[13.5px] leading-[1.55] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}
