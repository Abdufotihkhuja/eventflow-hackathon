import type { ReactNode } from 'react'
import { useT } from '@eventflow/i18n/react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/ui'

type BillingManageGateProps = {
  /** true — у пользователя есть billing:manage, ребёнок рендерится как есть. */
  canManage: boolean
  /** Мутирующий CTA. При view-only он должен приходить уже с disabled. */
  children: ReactNode
}

/**
 * Обёртка для мутирующих биллинг-CTA (C-13): view-only пользователи видят
 * кнопку disabled с тултипом-объяснением, а не пропавший контрол. Сама кнопка
 * отключается на стороне вызывающего кода (`disabled={!canManage}`) — обёртка
 * добавляет только доступное объяснение (span фокусируем, у disabled-кнопок
 * нет событий мыши/фокуса).
 */
export function BillingManageGate({ canManage, children }: BillingManageGateProps) {
  const t = useT()

  if (canManage) return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px]">
        {t('billing.manage.viewOnlyTooltip')}
      </TooltipContent>
    </Tooltip>
  )
}
