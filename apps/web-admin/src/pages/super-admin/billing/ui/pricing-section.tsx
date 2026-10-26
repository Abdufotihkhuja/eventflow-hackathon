/**
 * S-16: редактор цен каталога (/admin/billing → таб «Цены»).
 *
 * Чтение — кабинетный GET /billing/plans (ВЕСЬ каталог с флагами, включая
 * неактивные строки); правка — POST /super-admin/billing/plans/:key/pricing и
 * /addon-skus/:code/pricing (аудит PRICE_SET / SKU_SET). Диалог отправляет
 * ТОЛЬКО изменённые поля; UZS-инпут в сумах → parseMajorToMinor (строки/BigInt,
 * без float, D-3), $-якорь — целые центы (информационный, не продажная цена).
 *
 * Правки каталога НЕ трогают уже проданные пакеты — снапшоты (CR-1).
 * Честное предупреждение: платный тариф с isPurchasable без UZS-цены НЕ
 * продаётся по $-якорю — заявки приходят без суммы, сумму фиксирует оператор.
 */

import { useState } from 'react'
import { Loader2, Tags, TriangleAlert } from 'lucide-react'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { CatalogAddonSku, CatalogPlan, UpdatePricingRequest } from '@api/services'
import {
  useBillingCatalog,
  useUpdatePlanPricing,
  useUpdateSkuPricing,
  getApiErrorMessage,
} from '@features/super-admin'
import { formatMinorAmount, parseMajorToMinor } from '@shared/lib'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusPill,
} from '@shared/ui'

/** Тийины строкой → мажорный инпут: "4900000" → "49000", "…50" → "….50". */
function minorToMajorInput(minor: string | null): string {
  if (!minor || minor.startsWith('-') || minor === '0') return ''
  const padded = minor.padStart(3, '0')
  const major = padded.slice(0, -2)
  const frac = padded.slice(-2)
  return frac === '00' ? major : `${major}.${frac}`
}

/** Целые центы → "$49.00" (целочисленно, без float-математики по деньгам). */
function formatUsdCents(cents: number): string {
  const abs = Math.abs(cents)
  const major = Math.trunc(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${cents < 0 ? '−' : ''}$${major}.${frac}`
}

type EditTarget =
  | { kind: 'plan'; plan: CatalogPlan }
  | { kind: 'sku'; sku: CatalogAddonSku }

export function PricingSection() {
  const t = useT()
  const locale = useLocale()
  const catalog = useBillingCatalog()
  const [editing, setEditing] = useState<EditTarget | null>(null)

  if (catalog.isLoading) {
    return (
      <div className="space-y-6">
        {[0, 1].map(i => (
          <Card key={i}>
            <Skeleton className="mb-4 h-5 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (catalog.isError) {
    return (
      <ErrorState
        title={t('admin.billing.pricing.loadError')}
        description={getApiErrorMessage(catalog.error, t('admin.billing.panel.loadErrorHint'))}
        onRetry={() => void catalog.refetch()}
        retryLabel={t('admin.toasts.retryAgain')}
      />
    )
  }

  const data = catalog.data
  if (!data) return null

  const plans = [...data.plans].sort((a, b) => a.sortOrder - b.sortOrder)
  const addons = [...data.addons].sort((a, b) => a.sortOrder - b.sortOrder)

  const notSet = (
    <span className="text-muted-foreground">{t('admin.billing.pricing.priceNotSet')}</span>
  )

  return (
    <div className="space-y-6">
      {/* Тарифы */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground">
          {t('admin.billing.pricing.plansTitle')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('admin.billing.pricing.description')}
        </p>

        {plans.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t('admin.billing.pricing.emptyTitle')}
            description={t('admin.billing.pricing.emptyHint')}
            className="py-8"
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.pricing.colPlan')}</th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.pricing.colPrice')}</th>
                  <th className="py-2 pr-4 font-medium">
                    {t('admin.billing.pricing.colUsdAnchor')}
                  </th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.pricing.colActive')}</th>
                  <th className="py-2 pr-4 font-medium">
                    {t('admin.billing.pricing.colPurchasable')}
                  </th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.key} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-foreground">
                        {t(`admin.billing.tiers.${plan.key}`)}
                      </span>{' '}
                      <span className="rounded-[3px] bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {plan.key}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {plan.priceAmountMinor
                        ? formatMinorAmount(plan.priceAmountMinor, 'UZS', locale)
                        : notSet}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {plan.usdAnchorCents !== null ? formatUsdCents(plan.usdAnchorCents) : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill tone={plan.isActive ? 'success' : 'neutral'} size="sm">
                        {plan.isActive
                          ? t('admin.billing.pricing.activeYes')
                          : t('admin.billing.pricing.activeNo')}
                      </StatusPill>
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill tone={plan.isPurchasable ? 'info' : 'neutral'} size="sm">
                        {plan.isPurchasable
                          ? t('admin.billing.pricing.purchasableYes')
                          : t('admin.billing.pricing.purchasableNo')}
                      </StatusPill>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing({ kind: 'plan', plan })}
                      >
                        {t('admin.actions.edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add-on SKU */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground">
          {t('admin.billing.pricing.skusTitle')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('admin.billing.pricing.skusDescription')}
        </p>

        {addons.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t('admin.billing.pricing.emptyTitle')}
            description={t('admin.billing.pricing.emptyHint')}
            className="py-8"
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.pricing.colSku')}</th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.pricing.colKind')}</th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.pricing.colPrice')}</th>
                  <th className="py-2 pr-4 font-medium">
                    {t('admin.billing.pricing.colUsdAnchor')}
                  </th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.pricing.colActive')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {addons.map(sku => (
                  <tr key={sku.code} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="rounded-[3px] bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                        {sku.code}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {t(`admin.billing.pricing.skuKind.${sku.kind}`)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {sku.priceAmountMinor
                        ? formatMinorAmount(sku.priceAmountMinor, 'UZS', locale)
                        : notSet}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {sku.usdAnchorCents !== null ? formatUsdCents(sku.usdAnchorCents) : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill tone={sku.isActive ? 'success' : 'neutral'} size="sm">
                        {sku.isActive
                          ? t('admin.billing.pricing.activeYes')
                          : t('admin.billing.pricing.activeNo')}
                      </StatusPill>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing({ kind: 'sku', sku })}
                      >
                        {t('admin.actions.edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <PricingDialog target={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

/**
 * Диалог правки цены/активации. Отправляет ТОЛЬКО изменённые поля; пустой
 * инпут = «оставить как есть» (снять цену через UI нельзя — намеренно).
 */
function PricingDialog(props: { target: EditTarget; onClose: () => void }) {
  const t = useT()
  const locale = useLocale()
  const { target } = props

  const current =
    target.kind === 'plan'
      ? {
          priceAmountMinor: target.plan.priceAmountMinor,
          usdAnchorCents: target.plan.usdAnchorCents,
          isActive: target.plan.isActive,
          isPurchasable: target.plan.isPurchasable,
        }
      : {
          priceAmountMinor: target.sku.priceAmountMinor,
          usdAnchorCents: target.sku.usdAnchorCents,
          isActive: target.sku.isActive,
          isPurchasable: false,
        }

  const [priceInput, setPriceInput] = useState(() => minorToMajorInput(current.priceAmountMinor))
  const [usdInput, setUsdInput] = useState(() =>
    current.usdAnchorCents !== null ? String(current.usdAnchorCents) : ''
  )
  const [isActive, setIsActive] = useState(current.isActive)
  const [isPurchasable, setIsPurchasable] = useState(current.isPurchasable)

  const updatePlan = useUpdatePlanPricing()
  const updateSku = useUpdateSkuPricing()
  const mutation = target.kind === 'plan' ? updatePlan : updateSku

  // Цена: пустой инпут = не менять; невалидный непустой — блокирует сабмит.
  const parsedPrice = priceInput.trim() === '' ? null : parseMajorToMinor(priceInput)
  const priceInvalid = priceInput.trim() !== '' && parsedPrice === null
  const priceChanged = parsedPrice !== null && parsedPrice !== current.priceAmountMinor

  // $-якорь: целые неотрицательные центы; пустой инпут = не менять.
  const usdTrimmed = usdInput.trim()
  const usdParsed = /^\d{1,9}$/.test(usdTrimmed) ? Number(usdTrimmed) : null
  const usdInvalid = usdTrimmed !== '' && usdParsed === null
  const usdChanged = usdParsed !== null && usdParsed !== current.usdAnchorCents

  const activeChanged = isActive !== current.isActive
  const purchasableChanged = target.kind === 'plan' && isPurchasable !== current.isPurchasable

  const hasChanges = priceChanged || usdChanged || activeChanged || purchasableChanged
  const canSubmit = hasChanges && !priceInvalid && !usdInvalid && !mutation.isPending

  // Честное предупреждение (D-15): платный тариф покупаем, но UZS-цены нет —
  // по $-якорю он НЕ продаётся, заявки приходят без суммы (фиксирует оператор).
  const effectivePriceMinor = parsedPrice ?? current.priceAmountMinor
  const noPriceWarning =
    target.kind === 'plan' &&
    target.plan.key !== 'START' &&
    isPurchasable &&
    effectivePriceMinor === null

  const submit = () => {
    if (!canSubmit) return
    const data: UpdatePricingRequest = {
      ...(priceChanged && parsedPrice !== null ? { priceAmountMinor: parsedPrice } : {}),
      ...(usdChanged && usdParsed !== null ? { usdAnchorCents: usdParsed } : {}),
      ...(activeChanged ? { isActive } : {}),
      ...(purchasableChanged ? { isPurchasable } : {}),
    }
    if (target.kind === 'plan') {
      updatePlan.mutate({ key: target.plan.key, data }, { onSuccess: props.onClose })
    } else {
      updateSku.mutate({ code: target.sku.code, data }, { onSuccess: props.onClose })
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={open => {
        if (mutation.isPending) return
        if (!open) props.onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {target.kind === 'plan'
              ? t('admin.billing.pricing.dialog.planTitle', {
                  name: t(`admin.billing.tiers.${target.plan.key}`),
                })
              : t('admin.billing.pricing.dialog.skuTitle', { code: target.sku.code })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.billing.pricing.dialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              {t('admin.billing.pricing.dialog.priceLabel')}
            </span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              inputMode="decimal"
              value={priceInput}
              onChange={e => setPriceInput(e.target.value)}
              aria-label={t('admin.billing.pricing.dialog.priceLabel')}
              aria-invalid={priceInvalid}
            />
            {priceInvalid ? (
              <span className="mt-1 block text-xs text-destructive" role="alert">
                {t('admin.billing.pricing.dialog.priceInvalid')}
              </span>
            ) : parsedPrice ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatMinorAmount(parsedPrice, 'UZS', locale)}
              </span>
            ) : (
              <span className="mt-1 block text-xs text-muted-foreground">
                {t('admin.billing.pricing.dialog.priceHint')}
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              {t('admin.billing.pricing.dialog.usdAnchorLabel')}
            </span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              inputMode="numeric"
              value={usdInput}
              onChange={e => setUsdInput(e.target.value)}
              aria-label={t('admin.billing.pricing.dialog.usdAnchorLabel')}
              aria-invalid={usdInvalid}
            />
            {usdInvalid ? (
              <span className="mt-1 block text-xs text-destructive" role="alert">
                {t('admin.billing.pricing.dialog.usdAnchorInvalid')}
              </span>
            ) : usdParsed !== null ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatUsdCents(usdParsed)}
              </span>
            ) : (
              <span className="mt-1 block text-xs text-muted-foreground">
                {t('admin.billing.pricing.dialog.usdAnchorHint')}
              </span>
            )}
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
            <Checkbox
              checked={isActive}
              onCheckedChange={checked => setIsActive(checked === true)}
              className="mt-0.5"
            />
            {t('admin.billing.pricing.dialog.isActiveLabel')}
          </label>

          {target.kind === 'plan' && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <Checkbox
                checked={isPurchasable}
                onCheckedChange={checked => setIsPurchasable(checked === true)}
                className="mt-0.5"
              />
              {t('admin.billing.pricing.dialog.isPurchasableLabel')}
            </label>
          )}

          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {t('admin.billing.pricing.dialog.snapshotNote')}
          </p>

          {noPriceWarning && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                {t('admin.billing.pricing.dialog.noPriceWarning')}
              </span>
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {getApiErrorMessage(mutation.error, t('common.error'))}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={props.onClose} disabled={mutation.isPending}>
            {t('admin.actions.cancel')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )}
            {mutation.isPending ? t('admin.actions.saving') : t('admin.actions.save')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
