/**
 * Super Admin — раздел «Биллинг» (/admin/billing).
 *
 * Табы (S-9): «Обзор» — обзор монетизации платформы (карточки-STAT +
 * истечения ≤14 дней); «Выручка» (S-10) — сводка за период по типу/каналу;
 * «Операции» — мастер-переключатель S-19, очередь заявок managed-фазы и
 * выплаты организаторам (S-18); «Цены» (S-16) — редактор каталога тарифов
 * и SKU; «Аудит» (S-13) — лента операторских действий.
 * Активный таб живёт в ?tab= — deep-link'ается и переживает перезагрузку.
 */

import { useSearchParams } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { PageTabs } from '@shared/ui'

import { AuditSection } from './audit-section'
import { OperationsSection } from './operations-section'
import { OverviewSection } from './overview-section'
import { PricingSection } from './pricing-section'
import { RevenueSection } from './revenue-section'

const TAB_IDS = ['overview', 'revenue', 'operations', 'pricing', 'audit'] as const
type TabId = (typeof TAB_IDS)[number]
const DEFAULT_TAB: TabId = 'overview'

export default function SuperAdminBillingPage() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const active: TabId = TAB_IDS.includes(tabParam as TabId)
    ? (tabParam as TabId)
    : DEFAULT_TAB

  return (
    <div className="space-y-6">
      <PageTabs<TabId>
        items={TAB_IDS.map(id => ({ id, label: t(`admin.billing.tabs.${id}`) }))}
        active={active}
        onChange={id =>
          setSearchParams(id === DEFAULT_TAB ? {} : { tab: id }, { replace: true })
        }
      />

      {active === 'overview' && <OverviewSection />}
      {active === 'revenue' && <RevenueSection />}
      {active === 'operations' && <OperationsSection />}
      {active === 'pricing' && <PricingSection />}
      {active === 'audit' && <AuditSection />}
    </div>
  )
}
