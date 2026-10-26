import { AlertCircle } from 'lucide-react'

import { cn } from '@shared/lib/cn'

import { Button } from './shadcn/button'

type ErrorStateProps = {
  title: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/**
 * Calm, recoverable error block for admin pages. Communicates state through
 * icon + copy, not colour alone.
 */
export function ErrorState({ title, description, onRetry, retryLabel, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <AlertCircle className="size-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel ?? 'Retry'}
        </Button>
      )}
    </div>
  )
}
