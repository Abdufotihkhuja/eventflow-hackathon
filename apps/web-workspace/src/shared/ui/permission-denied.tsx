import { ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

type PermissionDeniedProps = {
  title: string
  description?: string
  /** Optional recovery action — e.g. "Back to dashboard". */
  action?: ReactNode
  className?: string
}

/**
 * Calm permission-denied / 403 block. Explains the access boundary without
 * leaking internal reasons or scaring the user. Communicates state via icon +
 * copy, not a red banner. Use for role/permission gates inside the shell.
 */
export function PermissionDenied({ title, description, action, className }: PermissionDeniedProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
      >
        <ShieldAlert className="size-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2 flex items-center gap-2">{action}</div>}
    </div>
  )
}
