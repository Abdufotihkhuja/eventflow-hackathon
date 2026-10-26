import { Link } from 'react-router-dom'
import { ArrowUpRight, Lock, X } from 'lucide-react'
import { plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import { cn } from '@shared/lib/cn'
import { Button } from '@shared/ui'

import {
  BILLING_UPGRADE_PATH,
  type BillingLimitError,
} from '../lib/billing-errors'
import { PARTICIPANTS_PLURAL, SEATS_PLURAL } from '../lib/billing-plurals'

type LimitPromptProps = {
  error: BillingLimitError
  /** Показать крестик закрытия (для inline-панелей поверх контента). */
  onClose?: () => void
  /** Переопределить подпись upgrade-ссылки (дефолт — «Открыть тарифы»). */
  upgradeLabel?: string
  className?: string
}

/**
 * Честная at-limit панель (C-11): одно сообщение на каждый код E-13,
 * счётные значения — с RU/UZ плюралами, «Открыть тарифы» — только когда
 * сервер сказал upgrade=true (deep-link C-15a). Тон спокойный: это лимит
 * тарифа, а не ошибка пользователя.
 */
export function LimitPrompt({ error, onClose, upgradeLabel, className }: LimitPromptProps) {
  const t = useT()
  const locale = useLocale()

  const tierName = 'tierKey' in error ? t(`billing.tiers.${error.tierKey}`) : ''

  let title: string
  let body: string

  switch (error.code) {
    case 'BILLING_QUOTA_EXCEEDED': {
      const isCalendarMonth = /^\d{4}-\d{2}$/.test(error.periodKey ?? '')
      const window = isCalendarMonth
        ? t('billing.usage.windowMonth')
        : t('billing.usage.windowPack')
      title = t('billing.errors.quotaTitle')
      body =
        error.metric === 'AI_SECONDS'
          ? t('billing.errors.quotaAiBody', {
              used: Math.round(error.used / 60),
              limit: Math.round(error.limit / 60),
              window,
            })
          : t('billing.errors.quotaGenerationsBody', {
              used: error.used,
              limit: error.limit,
              window,
            })
      break
    }
    case 'BILLING_CAP_EXCEEDED': {
      if (error.cap === 'STAFF_SEATS') {
        title = t('billing.errors.capStaffTitle')
        body = t('billing.errors.capStaffBody', {
          seats: plural(locale, error.limit, SEATS_PLURAL),
          current: error.current,
        })
      } else {
        title = t('billing.errors.capParticipantsTitle')
        body = t('billing.errors.capParticipantsBody', {
          participants: plural(locale, error.limit, PARTICIPANTS_PLURAL),
        })
      }
      break
    }
    case 'BILLING_EVENT_CREDITS_EXHAUSTED': {
      title = t('billing.errors.creditsTitle')
      body = t('billing.errors.creditsBody', { granted: error.granted })
      break
    }
    case 'BILLING_FEATURE_GATED': {
      title = t('billing.errors.featureTitle')
      body =
        error.feature === 'TASK_BOARD_ENABLED'
          ? t('billing.errors.featureTaskBoardBody', { tier: tierName })
          : error.feature === 'STATS_TIER'
            ? t('billing.errors.featureStatsBody', { tier: tierName })
            : t('billing.errors.featureQrBody', { tier: tierName })
      break
    }
    case 'ORG_SUSPENDED': {
      title = t('billing.errors.suspendedTitle')
      body = t('billing.errors.suspendedBody')
      break
    }
  }

  const showUpgrade = 'upgrade' in error && error.upgrade

  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-xl border border-border bg-secondary/40 p-4', className)}
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
        {showUpgrade && (
          <Link
            to={BILLING_UPGRADE_PATH}
            className="inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {upgradeLabel ?? t('billing.errors.upgradeCta')}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={onClose}
          aria-label={t('billing.errors.dismiss')}
        >
          <X className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  )
}
