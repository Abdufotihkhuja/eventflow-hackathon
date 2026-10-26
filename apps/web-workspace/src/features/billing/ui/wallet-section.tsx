import { Bot, Coins, ImagePlay } from 'lucide-react'
import { toIntlLocale } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type {
  BillingAddonSku,
  BillingCoinLedgerKind,
  BillingCoinMetric,
  BillingWalletEntry,
} from '@api/services'
import { formatDate } from '@shared/lib/format'
import { Button, EmptyState, ErrorState, Skeleton, StatusPill } from '@shared/ui'
import type { StatusPillTone } from '@shared/ui'

import { useBillingCatalogQuery, useBillingWalletQuery } from '../api'
import { formatCoinAmount } from '../lib/format'
import { COMING_SOON_SKUS } from '../lib/skus'
import { useBillingAccess } from '../lib/use-billing-access'
import { BillingManageGate } from './manage-gate'

/**
 * Кошелёк монет (C-6): балансы по метрикам + история леджера.
 * AI хранится в секундах (CR-26) — на балансе и в проводках показываем
 * минуты. CTA «Купить пакет» переиспользует диалог заявки C-5 (kind
 * COIN_PACK) через onRequestAddon — сам SKU берём из живого каталога.
 */

const KIND_TONE: Record<BillingCoinLedgerKind, StatusPillTone> = {
  PURCHASE: 'success',
  COMP_GRANT: 'info',
  CONSUMPTION: 'neutral',
  REVERSAL: 'warning',
}

type WalletSectionProps = {
  /** Открыть заявку на пакет монет (C-5). Без обработчика CTA не рендерятся. */
  onRequestAddon?: (sku: BillingAddonSku) => void
  /** Виды заказов с необработанной заявкой (дубликаты режутся серверно, CR-23). */
  pendingKinds?: ReadonlySet<'COIN_PACK' | 'ADVERTISING'>
}

export function WalletSection({ onRequestAddon, pendingKinds }: WalletSectionProps) {
  const t = useT()
  const locale = useLocale()
  const { canManage } = useBillingAccess()

  const walletQuery = useBillingWalletQuery()
  // Каталог нужен только для CTA покупки пакетов — его ошибки кошелёк не валят.
  const catalogQuery = useBillingCatalogQuery()

  if (walletQuery.isLoading) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (walletQuery.isError || !walletQuery.data) {
    return (
      <ErrorState
        title={t('billing.common.loadErrorTitle')}
        description={t('billing.common.loadErrorBody')}
        retryLabel={t('billing.common.retry')}
        onRetry={() => void walletQuery.refetch()}
      />
    )
  }

  const wallet = walletQuery.data
  const hasPending = pendingKinds?.has('COIN_PACK') ?? false

  /** Покупаемый COIN_PACK-SKU для метрики (активный и не «скоро»). */
  const coinSkuFor = (metric: BillingCoinMetric): BillingAddonSku | null => {
    const sku = catalogQuery.data?.addons.find(
      addon => addon.kind === 'COIN_PACK' && addon.coinMetric === metric
    )
    if (!sku || !sku.isActive || COMING_SOON_SKUS.has(sku.code)) return null
    return sku
  }

  const balances: Array<{
    metric: BillingCoinMetric
    label: string
    unit: string | null
    value: number
    icon: typeof Bot
  }> = [
    {
      metric: 'AI_SECONDS',
      label: t('billing.wallet.aiBalance'),
      unit: t('billing.wallet.minutesShort'),
      value: wallet.balances.aiSeconds,
      icon: Bot,
    },
    {
      metric: 'GENERATION_UNITS',
      label: t('billing.wallet.genBalance'),
      unit: null,
      value: wallet.balances.generationUnits,
      icon: ImagePlay,
    },
  ]

  return (
    <section aria-labelledby="billing-wallet-heading" className="space-y-4">
      <div>
        <h2 id="billing-wallet-heading" className="text-sm font-semibold text-foreground">
          {t('billing.wallet.title')}
        </h2>
        {/* Порядок списания (OQ-5/E-12) — честный однострочник. */}
        <p className="mt-0.5 max-w-[640px] text-[13px] leading-relaxed text-muted-foreground">
          {t('billing.wallet.drainOrder')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {balances.map(balance => {
          const Icon = balance.icon
          const sku = coinSkuFor(balance.metric)
          const canRequest = Boolean(sku && onRequestAddon)

          return (
            <div
              key={balance.metric}
              className="flex flex-col rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-muted-foreground">{balance.label}</p>
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums text-foreground">
                      {formatCoinAmount(locale, balance.metric, balance.value)}
                    </span>
                    {balance.unit && (
                      <span className="font-mono text-[12.5px] text-muted-foreground">
                        {balance.unit}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {canRequest && sku && onRequestAddon && (
                <div className="mt-4 border-t border-border pt-4">
                  <BillingManageGate canManage={canManage}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canManage || hasPending}
                      onClick={() => onRequestAddon(sku)}
                    >
                      <Coins className="mr-1.5 size-4" aria-hidden />
                      {hasPending ? t('billing.plans.pendingBadge') : t('billing.wallet.buyPack')}
                    </Button>
                  </BillingManageGate>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <p className="text-sm font-semibold text-foreground">
            {t('billing.wallet.historyTitle')}
          </p>
        </div>
        {wallet.entries.length === 0 ? (
          <EmptyState
            icon={Coins}
            title={t('billing.wallet.emptyTitle')}
            description={t('billing.wallet.emptyBody')}
          />
        ) : (
          <LedgerTable entries={wallet.entries} locale={locale} />
        )}
      </div>
    </section>
  )
}

function LedgerTable({ entries, locale }: { entries: BillingWalletEntry[]; locale: string }) {
  const t = useT()
  const intlLocale = toIntlLocale(locale)

  /** Знаковая величина проводки в единицах отображения (AI — минуты). */
  const deltaText = (entry: BillingWalletEntry): string => {
    const formatted = formatCoinAmount(locale, entry.metric, Math.abs(entry.delta))
    let sign = ''
    if (entry.delta > 0) sign = '+'
    else if (entry.delta < 0) sign = '−'
    const unit = entry.metric === 'AI_SECONDS' ? ` ${t('billing.wallet.minutesShort')}` : ''
    return `${sign}${formatted}${unit}`
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{t('billing.wallet.historyTitle')}</caption>
        <thead>
          <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <th scope="col" className="px-5 py-3">
              {t('billing.wallet.colDate')}
            </th>
            <th scope="col" className="px-5 py-3">
              {t('billing.wallet.colKind')}
            </th>
            <th scope="col" className="px-5 py-3">
              {t('billing.wallet.colMetric')}
            </th>
            <th scope="col" className="px-5 py-3 text-right">
              {t('billing.wallet.colDelta')}
            </th>
            <th scope="col" className="px-5 py-3 text-right">
              {t('billing.wallet.colBalance')}
            </th>
            <th scope="col" className="px-5 py-3">
              {t('billing.wallet.colReason')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-5 py-3 text-foreground">
                {formatDate(entry.createdAt, intlLocale)}
              </td>
              <td className="px-5 py-3">
                <StatusPill tone={KIND_TONE[entry.kind]} size="sm" dot={false}>
                  {t(`billing.wallet.kinds.${entry.kind}`)}
                </StatusPill>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                {t(`billing.wallet.metrics.${entry.metric}`)}
              </td>
              <td
                className={`whitespace-nowrap px-5 py-3 text-right font-mono text-[13px] tabular-nums ${
                  entry.delta > 0 ? 'text-success' : 'text-foreground'
                }`}
              >
                {deltaText(entry)}
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                {formatCoinAmount(locale, entry.metric, entry.balanceAfter)}
                {entry.metric === 'AI_SECONDS' ? ` ${t('billing.wallet.minutesShort')}` : ''}
              </td>
              <td className="max-w-[280px] truncate px-5 py-3 text-[13px] text-muted-foreground">
                {entry.reason ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
