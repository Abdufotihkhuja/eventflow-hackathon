/**
 * S-13: аудит-лента операторских действий (/admin/billing → таб «Аудит»).
 *
 * GET /super-admin/billing/audit: фильтры по action (select известных
 * действий) и targetId (текст, дебаунс), пагинация с keepPreviousData.
 * Кнопка «Детали» раскрывает metadata форматированным JSON — metadata
 * PII-safe by construction (вайтлист снапшотов S-12), поэтому показывать
 * её оператору безопасно. Коды действий/целей — технические идентификаторы
 * журнала, рендерятся моно-чипами без перевода (как id организаций).
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react'
import { formatDateTime, plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { BillingAuditAction } from '@api/services'
import { useBillingAudit, getApiErrorMessage } from '@features/super-admin'
import { ENTRIES_PLURAL, useDebounce } from '@shared/lib'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PaginationBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@shared/ui'

const PAGE_SIZE = 25

/** Известные действия журнала (зеркало AdminAuditAction бэкенда, S-12). */
const AUDIT_ACTIONS: BillingAuditAction[] = [
  'PLAN_ASSIGN',
  'PLAN_SWITCH',
  'PLAN_EXTEND',
  'PLAN_EXPIRE',
  'PLAN_CREDIT_ADJUST',
  'PAYMENT_RECORD',
  'PAYMENT_REVERSAL',
  'COMMISSION_OVERRIDE_SET',
  'COMMISSION_OVERRIDE_REVOKE',
  'CAP_OVERRIDE_SET',
  'CAP_OVERRIDE_REVOKE',
  'COMP_GRANT',
  'ORG_SUSPEND',
  'ORG_REACTIVATE',
  'PRICE_SET',
  'SKU_SET',
  'AD_ORDER_STATUS',
  'FEATURED_GRANDFATHER',
  'PAYOUT_RECORD',
  'BILLING_SWITCH_TOGGLE',
  'ARCHIVE_USER',
  'RESTORE_USER',
  'ARCHIVE_ORGANIZATION',
  'RESTORE_ORGANIZATION',
  'USER_HARD_DELETE',
  'ORGANIZATION_HARD_DELETE',
]

const ALL_ACTIONS = 'all'

export function AuditSection() {
  const t = useT()
  const locale = useLocale()

  const [action, setAction] = useState<string>(ALL_ACTIONS)
  const [targetIdInput, setTargetIdInput] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const targetId = useDebounce(targetIdInput.trim(), 400)

  const audit = useBillingAudit({
    action: action === ALL_ACTIONS ? undefined : action,
    targetId: targetId || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const data = audit.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t('admin.billing.audit.title')}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">{t('admin.billing.audit.description')}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={action}
          onValueChange={next => {
            setAction(next)
            setPage(1)
            setExpandedId(null)
          }}
        >
          <SelectTrigger
            className="w-full sm:w-72"
            aria-label={t('admin.billing.audit.actionFilterLabel')}
          >
            <SelectValue placeholder={t('admin.billing.audit.actionFilterLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ACTIONS}>
              {t('admin.billing.audit.allActions')}
            </SelectItem>
            {AUDIT_ACTIONS.map(code => (
              <SelectItem key={code} value={code}>
                <span className="font-mono text-xs">{code}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={targetIdInput}
          onChange={e => {
            setTargetIdInput(e.target.value)
            setPage(1)
            setExpandedId(null)
          }}
          placeholder={t('admin.billing.audit.targetIdPlaceholder')}
          aria-label={t('admin.billing.audit.targetIdPlaceholder')}
          className="w-full font-mono text-xs sm:w-80"
        />
      </div>

      {audit.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : audit.isError ? (
        <ErrorState
          title={t('admin.billing.audit.loadError')}
          description={getApiErrorMessage(audit.error, t('admin.billing.panel.loadErrorHint'))}
          onRetry={() => void audit.refetch()}
          retryLabel={t('admin.toasts.retryAgain')}
          className="mt-4"
        />
      ) : data && data.data.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t('admin.billing.audit.empty')}
          description={t('admin.billing.audit.emptyHint')}
          className="py-8"
        />
      ) : data ? (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">
                    {t('admin.billing.audit.colCreatedAt')}
                  </th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.audit.colAction')}</th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.audit.colActor')}</th>
                  <th className="py-2 pr-4 font-medium">{t('admin.billing.audit.colTarget')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.data.map(entry => {
                  const expanded = expandedId === entry.id
                  return (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      expanded={expanded}
                      onToggle={() => setExpandedId(expanded ? null : entry.id)}
                      createdAtLabel={formatDateTime(entry.createdAt, locale)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={data.page}
            totalPages={totalPages}
            onPageChange={next => {
              setPage(next)
              setExpandedId(null)
            }}
            summary={plural(locale, data.total, ENTRIES_PLURAL)}
            previousLabel={t('admin.tables.pagination.previousPage')}
            nextLabel={t('admin.tables.pagination.nextPage')}
            className="mt-4"
          />
        </>
      ) : null}
    </Card>
  )
}

/** Строка ленты + раскрываемая metadata (<pre> с форматированным JSON). */
function AuditRow(props: {
  entry: {
    id: string
    action: string
    actorId: string
    actorEmail: string | null
    targetType: string
    targetId: string
    targetLabel: string | null
    metadata: Record<string, unknown>
  }
  expanded: boolean
  onToggle: () => void
  createdAtLabel: string
}) {
  const t = useT()
  const { entry, expanded } = props
  const ToggleIcon = expanded ? ChevronUp : ChevronDown

  return (
    <>
      <tr className="border-b border-border/60 last:border-0">
        <td className="whitespace-nowrap py-2.5 pr-4 text-muted-foreground">
          {props.createdAtLabel}
        </td>
        <td className="py-2.5 pr-4">
          <span className="rounded-[3px] bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
            {entry.action}
          </span>
        </td>
        <td className="py-2.5 pr-4">
          {entry.actorEmail ?? (
            <span className="font-mono text-xs text-muted-foreground">
              {entry.actorId.slice(0, 8)}…
            </span>
          )}
        </td>
        <td className="py-2.5 pr-4">
          <span className="rounded-[3px] bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {entry.targetType}
          </span>{' '}
          <span className="break-all text-foreground">
            {entry.targetLabel ?? (
              <span className="font-mono text-xs">{entry.targetId.slice(0, 8)}…</span>
            )}
          </span>
        </td>
        <td className="py-2.5 text-right">
          <Button size="sm" variant="ghost" onClick={props.onToggle} aria-expanded={expanded}>
            {t('admin.actions.viewDetails')}
            <ToggleIcon className="ml-1 size-3.5" aria-hidden="true" />
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/60 last:border-0">
          <td colSpan={5} className="py-2 pr-2">
            <div className="overflow-x-auto rounded-md bg-muted px-3 py-2">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('admin.billing.audit.metadataTitle')}
              </p>
              <pre className="whitespace-pre font-mono text-xs leading-relaxed text-foreground">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
