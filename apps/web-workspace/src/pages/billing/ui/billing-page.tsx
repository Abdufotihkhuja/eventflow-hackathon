import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useT } from '@eventflow/i18n/react'

import type { BillingAddonSku, BillingPlanKey } from '@api/services'
import {
  AddonsSection,
  BillingRequestDialog,
  InvoicesSection,
  OverviewSection,
  PlansSection,
  WalletSection,
  isKnownSku,
  parseBillingPlanIntent,
  useBillingAccess,
  useBillingRequestsQuery,
  type BillingRequestPayload,
} from '@features/billing'
import { PageHeader, PageTabs, type PageTabItem } from '@shared/ui'

/**
 * Вкладки адресуемы через URL (C-15a): /settings/billing?tab=plans — контракт
 * deep-link'ов для at-limit подсказок по всему кабинету (?tab=plans из
 * LimitPrompt, сидбар-метрик и т.д.). `overview` — дефолт без параметра.
 */
const VALID_TABS = ['overview', 'plans', 'addons', 'invoices'] as const

type BillingTab = (typeof VALID_TABS)[number]

export default function BillingPage() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requestPayload, setRequestPayload] = useState<BillingRequestPayload | null>(null)
  const { canManage, isLoading: accessLoading } = useBillingAccess()

  const requestsQuery = useBillingRequestsQuery()

  const rawTab = searchParams.get('tab')
  const tab: BillingTab = VALID_TABS.includes(rawTab as BillingTab)
    ? (rawTab as BillingTab)
    : 'overview'

  // P-7: ?intent=PLAN_<key> из /pricing-сайнапа — одноразово открываем диалог
  // заявки с преселектом тарифа и срезаем параметр (view-only пользователям
  // диалог не открываем — CTA заявок для них и так задизейблены).
  const intentPlan = parseBillingPlanIntent(searchParams.get('intent'))
  useEffect(() => {
    if (!intentPlan || accessLoading) return
    if (canManage) {
      setRequestPayload({ kind: 'PLAN', planKey: intentPlan, mode: 'upgrade' })
    }
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        params.delete('intent')
        return params
      },
      { replace: true }
    )
  }, [intentPlan, accessLoading, canManage, setSearchParams])

  const setTab = useCallback(
    (next: BillingTab) => {
      setSearchParams(
        prev => {
          const params = new URLSearchParams(prev)
          if (next === 'overview') params.delete('tab')
          else params.set('tab', next)
          return params
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  // Необработанные заявки: дубликаты по виду режутся серверно (CR-23),
  // поэтому и бейджи считаем по виду заказа, не по конкретному тарифу/SKU.
  const pendingPlanOrder = useMemo(
    () => requestsQuery.data?.find(order => order.kind === 'PLAN' && order.status === 'REQUESTED'),
    [requestsQuery.data]
  )
  const pendingKinds = useMemo(() => {
    const kinds = new Set<'COIN_PACK' | 'ADVERTISING'>()
    for (const order of requestsQuery.data ?? []) {
      if (order.status !== 'REQUESTED') continue
      if (order.kind === 'COIN_PACK') kinds.add('COIN_PACK')
      if (order.kind === 'ADVERTISING') kinds.add('ADVERTISING')
    }
    return kinds
  }, [requestsQuery.data])

  const handleRequestPlan = useCallback((planKey: BillingPlanKey) => {
    setRequestPayload({ kind: 'PLAN', planKey, mode: 'upgrade' })
  }, [])

  const handleRenew = useCallback((planKey: BillingPlanKey) => {
    setRequestPayload({ kind: 'PLAN', planKey, mode: 'renew' })
  }, [])

  const handleRequestAddon = useCallback(
    (sku: BillingAddonSku) => {
      setRequestPayload({
        kind: sku.kind === 'COIN_PACK' ? 'COIN_PACK' : 'ADVERTISING',
        skuCode: sku.code,
        title: isKnownSku(sku.code) ? t(`billing.addons.skus.${sku.code}.title`) : sku.code,
      })
    },
    [t]
  )

  const tabs: PageTabItem<BillingTab>[] = [
    { id: 'overview', label: t('billing.tabs.overview') },
    { id: 'plans', label: t('billing.tabs.plans') },
    { id: 'addons', label: t('billing.tabs.addons') },
    { id: 'invoices', label: t('billing.tabs.invoices') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('billing.eyebrow')}
        title={t('billing.title')}
        description={t('billing.description')}
        bottom={<PageTabs items={tabs} active={tab} onChange={setTab} />}
      />

      {tab === 'overview' && (
        <OverviewSection onComparePlans={() => setTab('plans')} onRenew={handleRenew} />
      )}
      {tab === 'plans' && (
        <PlansSection onRequestPlan={handleRequestPlan} pendingPlanOrder={pendingPlanOrder} />
      )}
      {tab === 'addons' && (
        <>
          {/* C-6: кошелёк монет — балансы, порядок списания, история леджера. */}
          <WalletSection onRequestAddon={handleRequestAddon} pendingKinds={pendingKinds} />
          <AddonsSection onRequestAddon={handleRequestAddon} pendingKinds={pendingKinds} />
        </>
      )}
      {tab === 'invoices' && <InvoicesSection />}

      <BillingRequestDialog payload={requestPayload} onClose={() => setRequestPayload(null)} />
    </div>
  )
}
