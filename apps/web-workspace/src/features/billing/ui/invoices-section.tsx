import { FileText } from 'lucide-react'
import { toIntlLocale } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { BillingOrder } from '@api/services'
import { formatDate } from '@shared/lib/format'
import { EmptyState, ErrorState, Skeleton, StatusPill, statusPillTone } from '@shared/ui'

import { useBillingRequestsQuery } from '../api'
import { formatUzsMinor } from '../lib/format'

/**
 * История заявок и заказов организации (C-5; полноценный С-8 — P1).
 * Настоящих счетов-фактур ещё нет — таблица честно показывает Order-историю:
 * заявки managed-фазы и их статусы. Пусто — прежний честный EmptyState.
 */
export function InvoicesSection() {
  const t = useT()
  const locale = useLocale()

  const requestsQuery = useBillingRequestsQuery()

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <p className="text-sm font-semibold text-foreground">{t('billing.invoices.title')}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {t('billing.invoices.description')}
        </p>
      </div>

      {requestsQuery.isLoading ? (
        <div className="space-y-3 p-5" aria-hidden>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : requestsQuery.isError ? (
        <ErrorState
          className="rounded-none border-0"
          title={t('billing.common.loadErrorTitle')}
          description={t('billing.common.loadErrorBody')}
          retryLabel={t('billing.common.retry')}
          onRetry={() => void requestsQuery.refetch()}
        />
      ) : !requestsQuery.data || requestsQuery.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('billing.invoices.emptyTitle')}
          description={t('billing.invoices.emptyBody')}
        />
      ) : (
        <OrdersTable orders={requestsQuery.data} locale={locale} />
      )}
    </div>
  )
}

function OrdersTable({ orders, locale }: { orders: BillingOrder[]; locale: string }) {
  const t = useT()
  const intlLocale = toIntlLocale(locale)

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{t('billing.invoices.historyTitle')}</caption>
        <thead>
          <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <th scope="col" className="px-5 py-3">
              {t('billing.invoices.colDate')}
            </th>
            <th scope="col" className="px-5 py-3">
              {t('billing.invoices.colKind')}
            </th>
            <th scope="col" className="px-5 py-3">
              {t('billing.invoices.colStatus')}
            </th>
            <th scope="col" className="px-5 py-3 text-right">
              {t('billing.invoices.colAmount')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(order => (
            <tr key={order.id} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-5 py-3 text-foreground">
                {formatDate(order.createdAt, intlLocale)}
              </td>
              <td className="px-5 py-3 text-foreground">
                {t(`billing.invoices.kinds.${order.kind}`)}
              </td>
              <td className="px-5 py-3">
                <StatusPill tone={statusPillTone(order.status)} size="sm">
                  {t(`billing.invoices.statuses.${order.status}`)}
                </StatusPill>
              </td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-[13px] tabular-nums text-foreground">
                {order.amountMinor !== '0' && order.currency === 'UZS'
                  ? formatUzsMinor(locale, order.amountMinor)
                  : order.amountMinor !== '0'
                    ? `${order.amountMinor} ${order.currency}`
                    : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
