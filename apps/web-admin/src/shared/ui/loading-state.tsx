import { Loader2 } from 'lucide-react'

import { cn } from '@shared/lib/cn'

type LoadingStateProps = {
  label?: string
  className?: string
  /** Compact spinner without padded container. */
  inline?: boolean
}

/**
 * Consistent neutral loader for admin pages.
 */
export function LoadingState({ label, className, inline = false }: LoadingStateProps) {
  if (inline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {label && <span>{label}</span>}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground',
        className
      )}
    >
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  )
}
