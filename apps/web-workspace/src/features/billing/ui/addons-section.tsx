import { useMemo } from 'react'
import { Coins, Megaphone, Star, type LucideIcon } from 'lucide-react'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { BillingAddonSku } from '@api/services'
import { ErrorState, Skeleton, StatusPill } from '@shared/ui'

import { useBillingCatalogQuery } from '../api'
import { formatUsdAnchorCents, formatUzsMinor } from '../lib/format'
import { COMING_SOON_SKUS, isKnownSku } from '../lib/skus'
import { useBillingAccess } from '../lib/use-billing-access'
import { BillingManageGate } from './manage-gate'
import { Button } from '@shared/ui'

function skuIcon(sku: BillingAddonSku): LucideIcon {
  if (sku.kind === 'COIN_PACK') return Coins
  if (sku.code === 'AD_FEATURED_WEEK') return Star
  return Megaphone
}

type AddonsSectionProps = {
  /** Открыть заявку на дополнение (C-5). Без обработчика CTA не рендерятся. */
  onRequestAddon?: (sku: BillingAddonSku) => void
  /** Коды SKU с необработанной заявкой (по виду заказа, C-5). */
  pendingKinds?: ReadonlySet<'COIN_PACK' | 'ADVERTISING'>
}

/**
 * Дополнения из живого каталога (C-3/C-5): пакеты монет и рекламные SKU.
 * Цены — UZS из каталога, до установки — USD-якорь с оговоркой; неактивные
 * строки честно помечены недоступными.
 */
export function AddonsSection({ onRequestAddon, pendingKinds }: AddonsSectionProps) {
  const t = useT()
  const locale = useLocale()
  const { canManage } = useBillingAccess()

  const catalogQuery = useBillingCatalogQuery()

  const addons = useMemo(
    () => [...(catalogQuery.data?.addons ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [catalogQuery.data]
  )

  if (catalogQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return (
      <ErrorState
        title={t('billing.common.loadErrorTitle')}
        description={t('billing.common.loadErrorBody')}
        retryLabel={t('billing.common.retry')}
        onRetry={() => void catalogQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      <p className="max-w-[640px] text-sm leading-relaxed text-muted-foreground">
        {t('billing.addons.description')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {addons.map(sku => {
          const Icon = skuIcon(sku)
          const comingSoon = COMING_SOON_SKUS.has(sku.code)
          const requestable = sku.isActive && !comingSoon && Boolean(onRequestAddon)
          const requestKind = sku.kind === 'COIN_PACK' ? 'COIN_PACK' : 'ADVERTISING'
          const hasPending = pendingKinds?.has(requestKind) ?? false

          const title = isKnownSku(sku.code) ? t(`billing.addons.skus.${sku.code}.title`) : sku.code
          const description = isKnownSku(sku.code)
            ? t(`billing.addons.skus.${sku.code}.description`)
            : ''

          const price = sku.priceAmountMinor
            ? formatUzsMinor(locale, sku.priceAmountMinor)
            : sku.usdAnchorCents
              ? formatUsdAnchorCents(sku.usdAnchorCents)
              : null

          const unitLabel =
            sku.adBillingUnit === 'PER_WEEK'
              ? t('billing.addons.units.PER_WEEK')
              : sku.adBillingUnit === 'PER_CAMPAIGN'
                ? t('billing.addons.units.PER_CAMPAIGN')
                : sku.adBillingUnit === 'PER_MESSAGE'
                  ? t('billing.addons.units.PER_MESSAGE')
                  : null

          return (
            <div key={sku.code} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    {comingSoon ? (
                      <StatusPill tone="neutral" size="sm" dot={false}>
                        {t('billing.addons.comingSoon')}
                      </StatusPill>
                    ) : !sku.isActive ? (
                      <StatusPill tone="neutral" size="sm" dot={false}>
                        {t('billing.addons.unavailable')}
                      </StatusPill>
                    ) : null}
                  </div>
                  {description && (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
                  )}
                  {price && (
                    <p className="text-[13px] font-medium text-foreground">
                      {price}
                      {unitLabel && (
                        <span className="font-normal text-muted-foreground"> · {unitLabel}</span>
                      )}
                      {!sku.priceAmountMinor && (
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          · {t('billing.addons.usdAnchorNote')}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {requestable && onRequestAddon && (
                <div className="mt-4 border-t border-border pt-4">
                  <BillingManageGate canManage={canManage}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canManage || hasPending}
                      onClick={() => onRequestAddon(sku)}
                    >
                      {hasPending ? t('billing.plans.pendingBadge') : t('billing.addons.requestCta')}
                    </Button>
                  </BillingManageGate>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
