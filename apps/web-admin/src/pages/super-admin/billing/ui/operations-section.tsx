/**
 * Таб «Операции» раздела /admin/billing (извлечён из billing-page.tsx при
 * появлении табов в S-9; содержимое — 1:1, плюс восстановлен потерянный
 * импорт useRecordPayout, из-за которого диалог выплаты падал в рантайме).
 *
 * S-19: мастер-переключатель тарифной системы с двойным подтверждением
 * (диалог + чекбокс «понимаю последствия»); первое включение штампует
 * 90-дневные грандфазер-окна — счётчик показывается в результате.
 * Плюс очередь REQUESTED-заявок managed-фазы (listRequests).
 *
 * S-18: секция «Выплаты» — сводка «к выплате» (тело билетов − комиссия −
 * выплачено, M-7) с фиксацией выплат через диалог; runbook:
 * docs/monetization/15-payout-runbook.md.
 */

import { useState } from 'react'
import { AlertCircle, Inbox, Loader2, TriangleAlert } from 'lucide-react'
import { formatDate, formatDateTime, plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { OrderStatus } from '@api/services'
import {
  useBillingRequests,
  useEnforcement,
  usePayoutsOwed,
  useRecordPayout,
  useSetEnforcement,
  useSetVia,
  useViaState,
  getApiErrorMessage,
} from '@features/super-admin'
import { REQUESTS_PLURAL, formatMinorAmount, parseMajorToMinor } from '@shared/lib'
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
  Switch,
  type StatusPillTone,
} from '@shared/ui'

const ORDER_STATUS_TONE: Record<OrderStatus, StatusPillTone> = {
  REQUESTED: 'warning',
  PENDING_PAYMENT: 'scheduled',
  PAID: 'success',
  CANCELLED: 'cancelled',
  EXPIRED: 'ended',
  REFUNDED: 'info',
}

export function OperationsSection() {
  const t = useT()
  const locale = useLocale()

  // S-19: выделенный GET состояния тумблера (enabled + enabledAt).
  const enforcement = useEnforcement()
  const enforcementEnabled = enforcement.data?.enabled
  const stateLoading = enforcement.isLoading

  const setEnforcement = useSetEnforcement()
  const requests = useBillingRequests()

  const [confirmTarget, setConfirmTarget] = useState<boolean | null>(null)
  const [understood, setUnderstood] = useState(false)

  const openConfirm = (target: boolean) => {
    setEnforcement.reset()
    setUnderstood(false)
    setConfirmTarget(target)
  }

  const handleConfirm = () => {
    if (confirmTarget === null || !understood) return
    setEnforcement.mutate(confirmTarget, {
      onSuccess: () => setConfirmTarget(null),
    })
  }

  const lastResult = setEnforcement.data

  return (
    <div className="space-y-6">
      {/* S-19: мастер-переключатель */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t('admin.billing.enforcement.title')}
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t('admin.billing.enforcement.description')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {stateLoading ? (
              <Loader2
                className="size-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <Switch
                checked={enforcementEnabled ?? false}
                disabled={setEnforcement.isPending}
                onCheckedChange={next => openConfirm(next)}
                aria-label={t('admin.billing.enforcement.title')}
              />
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {enforcementEnabled !== undefined ? (
            <StatusPill tone={enforcementEnabled ? 'live' : 'neutral'}>
              {enforcementEnabled
                ? t('admin.billing.enforcement.stateOn')
                : t('admin.billing.enforcement.stateOff')}
            </StatusPill>
          ) : stateLoading ? null : (
            <StatusPill tone="neutral">
              {t('admin.billing.enforcement.stateUnknown')}
            </StatusPill>
          )}
          <p className="text-xs text-muted-foreground">
            {t('admin.billing.enforcement.stateHint')}
          </p>

          {lastResult && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              <p className="font-medium">
                {lastResult.enabled
                  ? t('admin.billing.enforcement.successOn')
                  : t('admin.billing.enforcement.successOff')}
              </p>
              {lastResult.enabledAt && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('admin.billing.enforcement.enabledAt', {
                    date: formatDateTime(lastResult.enabledAt, locale),
                  })}
                </p>
              )}
              {lastResult.grandfathersStamped > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('admin.billing.enforcement.grandfathersStamped', {
                    count: lastResult.grandfathersStamped,
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Очередь заявок managed-фазы */}
      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('admin.billing.requests.title')}
          </h3>
          {requests.data && requests.data.length > 0 && (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning-soft-foreground">
              {plural(locale, requests.data.length, REQUESTS_PLURAL)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('admin.billing.requests.description')}{' '}
          {t('admin.billing.requests.hint')}
        </p>

        {requests.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : requests.isError ? (
          <ErrorState
            title={t('admin.billing.requests.loadError')}
            description={t('admin.billing.panel.loadErrorHint')}
            onRetry={() => requests.refetch()}
            retryLabel={t('admin.toasts.retryAgain')}
            className="mt-4"
          />
        ) : requests.data && requests.data.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t('admin.billing.requests.empty')}
            description={t('admin.billing.requests.emptyHint')}
            className="py-8"
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.orders.kindLabel')}</th>
                  <th className="pb-2 pr-4 font-medium">
                    {t('admin.billing.orders.statusLabel')}
                  </th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.orders.amount')}</th>
                  <th className="pb-2 font-medium">{t('admin.billing.orders.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {(requests.data ?? []).map(order => (
                  <tr key={order.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {t(`admin.billing.orders.kind.${order.kind}`)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill tone={ORDER_STATUS_TONE[order.status]} size="sm">
                        {t(`admin.billing.orders.status.${order.status}`)}
                      </StatusPill>
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {formatMinorAmount(order.amountMinor, order.currency, locale)}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {formatDate(order.createdAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* VIA: глобальный тумблер провайдера + пилотные организации */}
      <ViaSection />

      {/* Двойное подтверждение переключения S-19 */}

      <PayoutsSection />
      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={next => {
          if (setEnforcement.isPending) return
          if (!next) setConfirmTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert
                className={
                  confirmTarget ? 'size-5 text-warning' : 'size-5 text-destructive'
                }
                aria-hidden="true"
              />
              {confirmTarget
                ? t('admin.billing.enforcement.enableTitle')
                : t('admin.billing.enforcement.disableTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget
                ? t('admin.billing.enforcement.enableDescription')
                : t('admin.billing.enforcement.disableDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <Checkbox
                checked={understood}
                onCheckedChange={checked => setUnderstood(checked === true)}
                className="mt-0.5"
              />
              {t('admin.billing.enforcement.confirmUnderstand')}
            </label>

            {setEnforcement.isError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {getApiErrorMessage(
                    setEnforcement.error,
                    t('admin.billing.panel.loadError')
                  )}
                </span>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={setEnforcement.isPending}
              onClick={() => setConfirmTarget(null)}
            >
              {t('admin.actions.cancel')}
            </Button>
            <Button
              type="button"
              variant={confirmTarget ? 'default' : 'destructive'}
              disabled={!understood || setEnforcement.isPending}
              onClick={handleConfirm}
            >
              {setEnforcement.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  {t('admin.billing.enforcement.submitting')}
                </>
              ) : confirmTarget ? (
                t('admin.billing.enforcement.confirmEnable')
              ) : (
                t('admin.billing.enforcement.confirmDisable')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * VIA: глобальный тумблер онлайн-оплат (прод-активация) с подтверждением.
 * ВЫКЛ — провайдер доступен только пилотным организациям (per-org оверрайд
 * VIA_PAYMENTS=true на странице биллинга организации); ВКЛ — всем, кроме
 * точечных VIA_PAYMENTS=false. Аудит VIA_SWITCH_TOGGLE.
 */
function ViaSection() {
  const t = useT()
  const viaState = useViaState()
  const setVia = useSetVia()
  const [confirmTarget, setConfirmTarget] = useState<boolean | null>(null)

  const enabled = viaState.data?.enabled
  const pilotCount = viaState.data?.pilotOrgCount ?? 0

  const handleConfirm = () => {
    if (confirmTarget === null) return
    setVia.mutate(confirmTarget, {
      onSuccess: () => setConfirmTarget(null),
    })
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {t('admin.billing.via.title')}
          </h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('admin.billing.via.description')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {viaState.isLoading ? (
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <Switch
              checked={enabled ?? false}
              disabled={setVia.isPending}
              onCheckedChange={next => {
                setVia.reset()
                setConfirmTarget(next)
              }}
              aria-label={t('admin.billing.via.title')}
            />
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {enabled !== undefined && (
          <StatusPill tone={enabled ? 'live' : 'neutral'}>
            {enabled
              ? t('admin.billing.via.stateOn')
              : t('admin.billing.via.stateOff')}
          </StatusPill>
        )}
        <p className="text-xs text-muted-foreground">
          {pilotCount > 0
            ? t('admin.billing.via.pilotCount', { count: pilotCount })
            : t('admin.billing.via.pilotHint')}
        </p>
      </div>

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={next => {
          if (setVia.isPending) return
          if (!next) setConfirmTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert
                className={
                  confirmTarget ? 'size-5 text-warning' : 'size-5 text-destructive'
                }
                aria-hidden="true"
              />
              {confirmTarget
                ? t('admin.billing.via.enableTitle')
                : t('admin.billing.via.disableTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget
                ? t('admin.billing.via.enableDescription')
                : t('admin.billing.via.disableDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {setVia.isError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                {getApiErrorMessage(setVia.error, t('common.error'))}
              </span>
            </div>
          )}

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={setVia.isPending}
              onClick={() => setConfirmTarget(null)}
            >
              {t('admin.actions.cancel')}
            </Button>
            <Button
              type="button"
              variant={confirmTarget ? 'default' : 'destructive'}
              disabled={setVia.isPending}
              onClick={handleConfirm}
            >
              {setVia.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  {t('admin.billing.via.submitting')}
                </>
              ) : confirmTarget ? (
                t('admin.billing.via.confirmEnable')
              ) : (
                t('admin.billing.via.confirmDisable')
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/** S-18: сводка «к выплате» и фиксация выплат (M-7, managed runbook). */
function PayoutsSection() {
  const t = useT()
  const locale = useLocale()
  const payouts = usePayoutsOwed()
  const [payoutOrg, setPayoutOrg] = useState<{ id: string; owedMinor: string } | null>(null)

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t('admin.billing.payouts.title')}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('admin.billing.payouts.description')}
      </p>

      {payouts.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : payouts.isError ? (
        <ErrorState
          title={t('admin.billing.payouts.loadError')}
          description={getApiErrorMessage(payouts.error, t('common.error'))}
          onRetry={() => void payouts.refetch()}
        />
      ) : !payouts.data || payouts.data.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('admin.billing.payouts.emptyTitle')}
          description={t('admin.billing.payouts.emptyDescription')}
        />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">{t('admin.billing.payouts.colOrg')}</th>
                <th className="py-2 pr-4">{t('admin.billing.payouts.colGross')}</th>
                <th className="py-2 pr-4">{t('admin.billing.payouts.colCommission')}</th>
                <th className="py-2 pr-4">{t('admin.billing.payouts.colPaidOut')}</th>
                <th className="py-2 pr-4">{t('admin.billing.payouts.colOwed')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {payouts.data.map(row => {
                const owedNegative = row.owedMinor.startsWith('-')
                const owedPositive = !owedNegative && row.owedMinor !== '0'
                return (
                  <tr key={row.organizationId} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <a
                        className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                        href={`/admin/organizations/${row.organizationId}/billing`}
                      >
                        {row.organizationId.slice(0, 8)}…
                      </a>
                    </td>
                    <td className="py-2 pr-4">{formatMinorAmount(row.grossMinor, 'UZS', locale)}</td>
                    <td className="py-2 pr-4">{formatMinorAmount(row.commissionMinor, 'UZS', locale)}</td>
                    <td className="py-2 pr-4">{formatMinorAmount(row.paidOutMinor, 'UZS', locale)}</td>
                    <td className={`py-2 pr-4 font-medium ${owedNegative ? 'text-destructive' : ''}`}>
                      {formatMinorAmount(row.owedMinor, 'UZS', locale)}
                      {owedNegative && (
                        <span className="ml-2 text-xs text-destructive">
                          {t('admin.billing.payouts.overpaid')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!owedPositive}
                        onClick={() =>
                          setPayoutOrg({ id: row.organizationId, owedMinor: row.owedMinor })
                        }
                      >
                        {t('admin.billing.payouts.recordCta')}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('admin.billing.payouts.runbookHint')}
          </p>
        </div>
      )}

      {payoutOrg && (
        <RecordPayoutDialog
          organizationId={payoutOrg.id}
          owedMinor={payoutOrg.owedMinor}
          onClose={() => setPayoutOrg(null)}
        />
      )}
    </Card>
  )
}

/** Диалог фиксации выплаты: сумма prefill = owed, референс платёжки обязателен. */
function RecordPayoutDialog(props: {
  organizationId: string
  owedMinor: string
  onClose: () => void
}) {
  const t = useT()
  const locale = useLocale()
  const recordPayout = useRecordPayout(props.organizationId)
  const [amountInput, setAmountInput] = useState(() => {
    // prefill: owed в мажорных единицах (тийины → сумы строкой, без float)
    const owed = props.owedMinor
    if (owed.startsWith('-') || owed === '0') return ''
    const padded = owed.padStart(3, '0')
    const major = padded.slice(0, -2)
    const minor = padded.slice(-2)
    return minor === '00' ? major : `${major}.${minor}`
  })
  const [externalRef, setExternalRef] = useState('')

  const amountMinor = parseMajorToMinor(amountInput)
  const canSubmit = amountMinor !== null && externalRef.trim().length >= 3

  const submit = () => {
    if (!canSubmit || amountMinor === null) return
    recordPayout.mutate(
      { amountMinor, externalRef: externalRef.trim() },
      { onSuccess: props.onClose }
    )
  }

  return (
    <AlertDialog open onOpenChange={open => !open && props.onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.billing.payouts.dialogTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.billing.payouts.dialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              {t('admin.billing.payouts.amountLabel')}
            </span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              inputMode="decimal"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              aria-label={t('admin.billing.payouts.amountLabel')}
            />
            {amountMinor && (
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatMinorAmount(amountMinor, 'UZS', locale)}
              </span>
            )}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              {t('admin.billing.payouts.refLabel')}
            </span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={externalRef}
              onChange={e => setExternalRef(e.target.value)}
              aria-label={t('admin.billing.payouts.refLabel')}
            />
          </label>
          {recordPayout.isError && (
            <p className="text-sm text-destructive" role="alert">
              {getApiErrorMessage(recordPayout.error, t('common.error'))}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={props.onClose} disabled={recordPayout.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || recordPayout.isPending}>
            {recordPayout.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )}
            {t('admin.billing.payouts.confirmCta')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
