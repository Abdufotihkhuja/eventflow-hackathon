import { Info } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

/**
 * Honest banner explaining that paid plans aren't self-serve and online
 * payments aren't enabled — shown on both the Overview and Plans tabs so no CTA
 * implies an automatic charge.
 */
export function ManagedNotice() {
  const t = useT()

  return (
    <div className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{t('billing.managedNotice.title')}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t('billing.managedNotice.body')}
        </p>
      </div>
    </div>
  )
}
