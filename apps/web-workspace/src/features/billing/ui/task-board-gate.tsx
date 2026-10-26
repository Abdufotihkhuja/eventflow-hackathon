import { Link } from 'react-router-dom'
import { ArrowUpRight, KanbanSquare, Lock } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { cn } from '@shared/lib/cn'
import { Button } from '@shared/ui'

import { BILLING_UPGRADE_PATH } from '../lib/billing-errors'

/**
 * Полный locked-экран Task Board (C-10): досок нет и фича вне тарифа —
 * честно объясняем, что это, в какие тарифы входит, и ведём на Plans tab.
 */
export function TaskBoardLockedState({ className }: { className?: string }) {
  const t = useT()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-14 text-center',
        className
      )}
    >
      <div
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <KanbanSquare className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">
        {t('billing.gate.boardsLockedTitle')}
      </h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t('billing.gate.boardsLockedBody')}
      </p>
      <Button asChild className="mt-5">
        <Link to={BILLING_UPGRADE_PATH}>
          {t('billing.errors.upgradeCta')}
          <ArrowUpRight className="ml-1.5 size-4" aria-hidden />
        </Link>
      </Button>
    </div>
  )
}

/**
 * Read-only баннер для существующих (грандфазер/даунгрейд) досок:
 * экспорт доступен, данные не удаляются, редактирование — после апгрейда.
 */
export function TaskBoardReadOnlyBanner({ className }: { className?: string }) {
  const t = useT()

  return (
    <div
      role="status"
      className={cn('flex gap-3 rounded-xl border border-border bg-secondary/40 p-4', className)}
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {t('billing.gate.boardsReadOnlyTitle')}
        </p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t('billing.gate.boardsReadOnlyBody')}
        </p>
        <Link
          to={BILLING_UPGRADE_PATH}
          className="inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('billing.errors.upgradeCta')}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
