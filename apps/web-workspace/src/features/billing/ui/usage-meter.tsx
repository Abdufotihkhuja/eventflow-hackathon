import type { ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

type UsageMeterBarProps = {
  /** Уже переведённая подпись метрики. */
  label: string
  used: number
  /** null → безлимит/не метерится: бар не рисуем, только значение. */
  limit: number | null
  /** Подпись окна («в этом месяце» / «за период пакета») — опционально. */
  windowLabel?: string
  /** Правый верхний слот: значение/статус (уже переведённые). */
  valueText: string
  /** Слот под баром — например, at-limit подсказка с апгрейд-ссылкой. */
  footer?: ReactNode
  className?: string
}

/**
 * Доступный прогресс-метр квоты (C-2/C-4). Тон честный и спокойный:
 * графит до 80%, warning-токен ближе к лимиту, ember (акцент, не тревога)
 * на 100% — там же появляется upgrade-подсказка через `footer`.
 */
export function UsageMeterBar({
  label,
  used,
  limit,
  windowLabel,
  valueText,
  footer,
  className,
}: UsageMeterBarProps) {
  const hasLimit = limit !== null && limit > 0
  const ratio = hasLimit ? Math.min(1, used / limit) : 0
  const atLimit = hasLimit && used >= limit
  const nearLimit = hasLimit && !atLimit && ratio >= 0.8

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[13px] font-medium text-foreground">
          {label}
          {windowLabel && (
            <span className="ml-1.5 font-normal text-muted-foreground">· {windowLabel}</span>
          )}
        </span>
        <span
          className={cn(
            'font-mono text-[12px] tabular-nums',
            atLimit ? 'font-semibold text-primary' : 'text-muted-foreground'
          )}
        >
          {valueText}
        </span>
      </div>

      {hasLimit && (
        <div
          role="progressbar"
          aria-label={windowLabel ? `${label} · ${windowLabel}` : label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(used, limit)}
          aria-valuetext={valueText}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width]',
              atLimit ? 'bg-primary' : nearLimit ? 'bg-warning' : 'bg-foreground'
            )}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      )}

      {footer}
    </div>
  )
}
