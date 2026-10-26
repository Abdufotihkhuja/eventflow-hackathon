import { cn } from '@shared/lib/cn'

type BillingMeterProps = {
  label: string
  /** Уже отформатированный текст справа («3 из 5», «Без лимита»). */
  text: string
  value: number
  /** null — безлимит/не метерится: полоса не рисуется. */
  max: number | null
  className?: string
}

/**
 * Компактный метер потребления для биллинг-панели: подпись + значение +
 * тонкая полоса. Тон полосы тихий (primary), у порога — warning/danger,
 * состояние никогда не передаётся только цветом (текст всегда рядом).
 */
export function BillingMeter({ label, text, value, max, className }: BillingMeterProps) {
  const pct =
    max != null && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : null

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{text}</span>
      </div>
      {pct != null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-primary'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
