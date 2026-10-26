import { AlertCircle } from 'lucide-react'

import { cn } from '@shared/lib/cn'

/**
 * Инлайн-ошибка для биллинг-диалогов (критик B-11: каждый диалог обязан
 * показывать ошибку на месте, не только тостом).
 */
export function InlineError({ message, className }: { message: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground',
        className
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{message}</span>
    </div>
  )
}
