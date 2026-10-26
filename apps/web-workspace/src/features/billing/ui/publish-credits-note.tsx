import { Coins } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { cn } from '@shared/lib/cn'

import { useBillingEntitlementsQuery } from '../api'
import { useBillingAccess } from '../lib/use-billing-access'

/**
 * C-12: видимость кредитов при отправке события на публикацию.
 *
 * Правила (E-16): кредит списывается при ПЕРВОЙ публикации; повторная
 * публикация того же события бесплатна (статусной истории на клиенте нет,
 * поэтому строка сформулирована обобщённо). eventCredits === null (START)
 * или S-19 OFF → не рендерим ничего. Последний кредит — честное
 * предупреждение о переходе на START-условия после исчерпания (§2.1).
 */
export function PublishCreditsNote({ className }: { className?: string }) {
  const t = useT()
  const { canView } = useBillingAccess()
  const entitlementsQuery = useBillingEntitlementsQuery(canView)

  const ent = entitlementsQuery.data
  if (!ent || !ent.enforcementEnabled || !ent.eventCredits) return null

  const { remaining, granted } = ent.eventCredits
  const isLast = remaining === 1
  const exhausted = remaining <= 0

  return (
    <div
      role="note"
      className={cn(
        'flex gap-3 rounded-xl border p-4',
        isLast || exhausted
          ? 'border-warning-soft bg-warning-soft'
          : 'border-border bg-secondary/40',
        className
      )}
    >
      <Coins
        className={cn(
          'mt-0.5 size-4 shrink-0',
          isLast || exhausted ? 'text-warning' : 'text-muted-foreground'
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="text-[13px] font-medium leading-relaxed text-foreground">
          {exhausted
            ? t('billing.publish.noCredits')
            : t('billing.publish.willConsume', { left: remaining - 1, granted })}
        </p>
        {isLast && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {t('billing.publish.lastCredit')}
          </p>
        )}
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {t('billing.publish.republishFree')}
        </p>
      </div>
    </div>
  )
}
