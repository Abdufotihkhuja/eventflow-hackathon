/**
 * Super Admin — биллинг-панель организации (S-2).
 * GET /api/v1/super-admin/billing/organizations/:orgId
 *
 * Тариф + источник, живой пакет с кредитами, эффективные лимиты с метерами
 * (AI показывается в минутах = секунды/60, CR-26), активные оверрайды и
 * история заказов; заявки REQUESTED подсвечены с действием «Обработать».
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ReceiptText, SlidersHorizontal } from 'lucide-react'
import { formatDate, formatDateTime, plural, type Translator } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type {
  BillingOrder,
  BillingOverride,
  OrderStatus,
  PaymentTransaction,
  PaymentTxStatus,
  PlanPurchaseStatus,
} from '@api/services'
import { useAdminOrganization, useOrgBilling } from '@features/super-admin'
import { REQUESTS_PLURAL, formatMinorAmount } from '@shared/lib'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusPill,
  type StatusPillTone,
} from '@shared/ui'

import { AdjustCreditsDialog } from './adjust-credits-dialog'
import { AssignPlanDialog } from './assign-plan-dialog'
import { BillingMeter } from './billing-meter'
import { CompGrantDialog } from './comp-grant-dialog'
import { ExpirePlanDialog } from './expire-plan-dialog'
import { ExtendPlanDialog } from './extend-plan-dialog'
import { OverrideDialog } from './override-dialog'
import { RecordPaymentDialog } from './record-payment-dialog'
import { ReversePaymentDialog } from './reverse-payment-dialog'
import { RevokeOverrideDialog } from './revoke-override-dialog'
import { SuspendDialog } from './suspend-dialog'

const PACK_STATUS_TONE: Record<PlanPurchaseStatus, StatusPillTone> = {
  PENDING_PAYMENT: 'scheduled',
  ACTIVE: 'live',
  EXHAUSTED: 'warning',
  EXPIRED: 'ended',
  SUPERSEDED: 'neutral',
}

const ORDER_STATUS_TONE: Record<OrderStatus, StatusPillTone> = {
  REQUESTED: 'warning',
  PENDING_PAYMENT: 'scheduled',
  PAID: 'success',
  CANCELLED: 'cancelled',
  EXPIRED: 'ended',
  REFUNDED: 'info',
}

const PAYMENT_STATUS_TONE: Record<PaymentTxStatus, StatusPillTone> = {
  CREATED: 'scheduled',
  CONFIRMED: 'success',
  FAILED: 'cancelled',
  REVERSED: 'neutral',
}

export default function OrgBillingPage() {
  const t = useT()
  const locale = useLocale()
  const { orgId = '' } = useParams<{ orgId: string }>()

  const organization = useAdminOrganization(orgId || null)
  const billing = useOrgBilling(orgId || null)

  const [assignDialog, setAssignDialog] = useState<{
    open: boolean
    orderId: string | null
  }>({ open: false, orderId: null })
  const [extendOpen, setExtendOpen] = useState(false)
  const [expireOpen, setExpireOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)

  // S-5/S-6: редактор per-org оверрайдов; S-7 comp-грант; S-8 приостановка.
  const [overrideDialog, setOverrideDialog] = useState<{
    open: boolean
    initial: BillingOverride | null
  }>({ open: false, initial: null })
  const [revokeTarget, setRevokeTarget] = useState<BillingOverride | null>(null)
  const [compOpen, setCompOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)

  // S-4: история заказов не содержит транзакций — платежи этой сессии ведём
  // локально (записанные через диалог), реверс обновляет строку по id.
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean
    orderId: string | null
  }>({ open: false, orderId: null })
  const [recordedPayments, setRecordedPayments] = useState<PaymentTransaction[]>([])
  const [reverseTarget, setReverseTarget] = useState<PaymentTransaction | null>(null)

  const openAssignDialog = (orderId: string | null = null) =>
    setAssignDialog({ open: true, orderId })

  const openPaymentDialog = (orderId: string | null = null) =>
    setPaymentDialog({ open: true, orderId })

  if (billing.isLoading) {
    return <BillingSkeleton />
  }

  if (billing.isError || !billing.data) {
    return (
      <ErrorState
        title={t('admin.billing.panel.loadError')}
        description={t('admin.billing.panel.loadErrorHint')}
        onRetry={() => billing.refetch()}
        retryLabel={t('admin.toasts.retryAgain')}
      />
    )
  }

  const data = billing.data
  const { status, entitlements, overrides, orders } = data
  const pack = status.activePurchase
  const pendingOrders = orders.filter(o => o.status === 'REQUESTED')

  const formatAiMinutes = (seconds: number) => {
    const minutes = seconds / 60
    return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('admin.billing.panel.eyebrow')}
        title={organization.data?.name ?? t('admin.billing.panel.title')}
        description={t('admin.billing.panel.title')}
        meta={
          <Link
            to="/admin/organizations"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t('admin.billing.panel.back')}
          </Link>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setCompOpen(true)}>
              {t('admin.billing.compDialog.title')}
            </Button>
            <Button variant="outline" onClick={() => openPaymentDialog()}>
              {t('admin.billing.paymentDialog.title')}
            </Button>
            <Button onClick={() => openAssignDialog()}>
              {t('admin.billing.actions.assignPlan')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Текущий тариф + платформенные флаги */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t('admin.billing.overview.currentTier')}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {t(`admin.billing.tiers.${status.tierKey}`)}
            </span>
            <StatusPill tone={status.source === 'PURCHASE' ? 'brand' : 'neutral'}>
              {t(`admin.billing.source.${status.source}`)}
            </StatusPill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill tone={entitlements.enforcementEnabled ? 'live' : 'neutral'}>
              {entitlements.enforcementEnabled
                ? t('admin.billing.flags.enforcementOn')
                : t('admin.billing.flags.enforcementOff')}
            </StatusPill>
            {entitlements.suspended && (
              <StatusPill tone="danger">{t('admin.billing.flags.suspended')}</StatusPill>
            )}
          </div>
          {/* S-8: приостановка/реактивация — операторский рычаг E-17 */}
          <div className="mt-4 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              className={
                entitlements.suspended ? undefined : 'text-destructive hover:text-destructive'
              }
              onClick={() => setSuspendOpen(true)}
            >
              {entitlements.suspended
                ? t('admin.billing.suspendDialog.reactivateSubmit')
                : t('admin.billing.suspendDialog.submit')}
            </Button>
          </div>
        </Card>

        {/* Активный пакет */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            {t('admin.billing.pack.title')}
          </h3>
          {pack ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-semibold text-foreground">
                  {t(`admin.billing.tiers.${pack.planKey}`)}
                </span>
                <StatusPill tone={PACK_STATUS_TONE[pack.status]}>
                  {t(`admin.billing.pack.status.${pack.status}`)}
                </StatusPill>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <FactRow
                  label={t('admin.billing.pack.activatedAt')}
                  value={pack.activatedAt ? formatDate(pack.activatedAt, locale) : '—'}
                />
                <FactRow
                  label={t('admin.billing.pack.expiresAt')}
                  value={
                    pack.expiresAt
                      ? formatDate(pack.expiresAt, locale)
                      : t('admin.billing.pack.noExpiry')
                  }
                />
              </dl>
              <BillingMeter
                label={t('admin.billing.pack.credits')}
                text={t('admin.billing.pack.creditsRemaining', {
                  remaining: pack.eventCreditsRemaining,
                  granted: pack.eventCreditsGranted,
                })}
                value={pack.eventCreditsGranted - pack.eventCreditsRemaining}
                max={pack.eventCreditsGranted}
              />
              {/* S-3: операции жизненного цикла живого пакета */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button variant="outline" size="sm" onClick={() => setExtendOpen(true)}>
                  {t('admin.billing.extendDialog.title')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
                  {t('admin.billing.adjustDialog.title')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setExpireOpen(true)}
                >
                  {t('admin.billing.expireDialog.title')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm font-medium text-foreground">
                {t('admin.billing.pack.empty')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('admin.billing.pack.emptyHint')}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Эффективные лимиты */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground">
          {t('admin.billing.entitlements.title')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('admin.billing.entitlements.hint')}
        </p>
        <div className="mt-4 grid gap-x-8 gap-y-2.5 lg:grid-cols-2">
          <dl className="space-y-2.5">
            <FactRow
              label={t('admin.billing.entitlements.commission')}
              value={`${(entitlements.commissionBps / 100).toLocaleString(locale)}%`}
            />
            <FactRow
              label={t('admin.billing.entitlements.staffSeats')}
              value={
                entitlements.staffSeats != null
                  ? String(entitlements.staffSeats)
                  : t('admin.billing.entitlements.unlimited')
              }
            />
            <FactRow
              label={t('admin.billing.entitlements.maxParticipants')}
              value={
                entitlements.maxParticipantsPerEvent != null
                  ? String(entitlements.maxParticipantsPerEvent)
                  : t('admin.billing.entitlements.unlimited')
              }
            />
            <FactRow
              label={t('admin.billing.entitlements.maxEvents')}
              value={
                entitlements.maxEvents != null
                  ? String(entitlements.maxEvents)
                  : t('admin.billing.entitlements.unlimited')
              }
            />
            <FactRow
              label={t('admin.billing.entitlements.taskBoard')}
              value={
                entitlements.taskBoardEnabled
                  ? t('admin.billing.entitlements.enabled')
                  : t('admin.billing.entitlements.disabled')
              }
            />
          </dl>
          <div className="space-y-4">
            <div>
              <BillingMeter
                label={t('admin.billing.entitlements.generations')}
                text={
                  entitlements.generations.limit != null
                    ? t('admin.billing.entitlements.usedOf', {
                        used: entitlements.generations.used,
                        limit: entitlements.generations.limit,
                      })
                    : `${t('admin.billing.entitlements.used', {
                        used: entitlements.generations.used,
                      })} · ${t('admin.billing.entitlements.noLimit')}`
                }
                value={entitlements.generations.used}
                max={entitlements.generations.limit}
              />
              {entitlements.generations.periodKey && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('admin.billing.entitlements.window', {
                    periodKey: entitlements.generations.periodKey,
                  })}
                </p>
              )}
            </div>
            <div>
              <BillingMeter
                label={t('admin.billing.entitlements.aiMinutes')}
                text={
                  entitlements.aiSeconds.limit != null
                    ? t('admin.billing.entitlements.usedOf', {
                        used: formatAiMinutes(entitlements.aiSeconds.used),
                        limit: formatAiMinutes(entitlements.aiSeconds.limit),
                      })
                    : `${t('admin.billing.entitlements.used', {
                        used: formatAiMinutes(entitlements.aiSeconds.used),
                      })} · ${t('admin.billing.entitlements.noLimit')}`
                }
                value={entitlements.aiSeconds.used}
                max={entitlements.aiSeconds.limit}
              />
              {entitlements.aiSeconds.periodKey && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('admin.billing.entitlements.window', {
                    periodKey: entitlements.aiSeconds.periodKey,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Активные оверрайды (S-5/S-6): точечные переопределения поверх тарифа */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('admin.billing.overrides.title')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('admin.billing.overrides.hint')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOverrideDialog({ open: true, initial: null })}
          >
            {t('admin.billing.overrides.add')}
          </Button>
        </div>
        {overrides.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title={t('admin.billing.overrides.empty')}
            className="py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.overrides.key')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.overrides.value')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.overrides.reason')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.overrides.expiresAt')}</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {overrides.map(override => (
                  <tr key={override.key} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {t(`admin.billing.overrides.keys.${override.key}`)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {formatOverrideValue(override, t)}
                    </td>
                    <td className="max-w-[280px] py-2.5 pr-4 text-muted-foreground">
                      {override.reason}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {override.expiresAt
                        ? formatDate(override.expiresAt, locale)
                        : t('admin.billing.overrides.noExpiry')}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* EVENT_CREDITS-строки (легаси) не редактируются — резолвер их не читает */}
                        {override.key !== 'EVENT_CREDITS' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setOverrideDialog({ open: true, initial: override })
                            }
                          >
                            {t('admin.billing.overrides.edit')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokeTarget(override)}
                        >
                          {t('admin.billing.overrides.revoke')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* История заказов */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('admin.billing.orders.title')}
          </h3>
          {pendingOrders.length > 0 && (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning-soft-foreground">
              {t('admin.billing.orders.pendingNotice', {
                requests: plural(locale, pendingOrders.length, REQUESTS_PLURAL),
              })}
            </span>
          )}
        </div>
        {orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={t('admin.billing.orders.empty')}
            description={t('admin.billing.orders.emptyHint')}
            className="py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.orders.kindLabel')}</th>
                  <th className="pb-2 pr-4 font-medium">
                    {t('admin.billing.orders.statusLabel')}
                  </th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.orders.amount')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.orders.createdAt')}</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onProcess={() =>
                      order.kind === 'PLAN'
                        ? openAssignDialog(order.id)
                        : openPaymentDialog(order.id)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Платежи, записанные в этой сессии (S-4: транзакций нет в истории заказов) */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground">
          {t('admin.billing.payments.title')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('admin.billing.payments.hint')}
        </p>
        {recordedPayments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t('admin.billing.payments.empty')}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">{t('admin.billing.payments.amount')}</th>
                  <th className="pb-2 pr-4 font-medium">
                    {t('admin.billing.payments.statusLabel')}
                  </th>
                  <th className="pb-2 pr-4 font-medium">
                    {t('admin.billing.payments.externalRef')}
                  </th>
                  <th className="pb-2 pr-4 font-medium">
                    {t('admin.billing.payments.createdAt')}
                  </th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {recordedPayments.map(payment => (
                  <tr key={payment.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 tabular-nums">
                      {formatMinorAmount(payment.amountMinor, payment.currency, locale)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]} size="sm">
                        {t(`admin.billing.payments.status.${payment.status}`)}
                      </StatusPill>
                    </td>
                    <td className="max-w-[220px] truncate py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                      {payment.providerTxnId}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {formatDateTime(payment.createdAt, locale)}
                    </td>
                    <td className="py-2.5 text-right">
                      {payment.status !== 'REVERSED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setReverseTarget(payment)}
                        >
                          {t('admin.billing.payments.reverse')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AssignPlanDialog
        orgId={orgId}
        billing={data}
        open={assignDialog.open}
        onOpenChange={open => setAssignDialog(prev => ({ ...prev, open }))}
        orderId={assignDialog.orderId}
      />
      <ExtendPlanDialog orgId={orgId} open={extendOpen} onOpenChange={setExtendOpen} />
      <ExpirePlanDialog orgId={orgId} open={expireOpen} onOpenChange={setExpireOpen} />
      <AdjustCreditsDialog
        orgId={orgId}
        creditsRemaining={pack?.eventCreditsRemaining ?? 0}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
      <RecordPaymentDialog
        orgId={orgId}
        pendingOrders={pendingOrders}
        open={paymentDialog.open}
        onOpenChange={open => setPaymentDialog(prev => ({ ...prev, open }))}
        initialOrderId={paymentDialog.orderId}
        onRecorded={transaction => setRecordedPayments(prev => [transaction, ...prev])}
      />
      <OverrideDialog
        orgId={orgId}
        open={overrideDialog.open}
        onOpenChange={open => setOverrideDialog(prev => ({ ...prev, open }))}
        initial={overrideDialog.initial}
      />
      <RevokeOverrideDialog
        orgId={orgId}
        override={revokeTarget}
        onOpenChange={open => {
          if (!open) setRevokeTarget(null)
        }}
      />
      <CompGrantDialog orgId={orgId} open={compOpen} onOpenChange={setCompOpen} />
      <SuspendDialog
        orgId={orgId}
        suspended={entitlements.suspended}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
      />
      <ReversePaymentDialog
        orgId={orgId}
        transaction={reverseTarget}
        onOpenChange={open => {
          if (!open) setReverseTarget(null)
        }}
        onReversed={reversed =>
          setRecordedPayments(prev =>
            prev.map(payment => (payment.id === reversed.id ? reversed : payment))
          )
        }
      />
    </div>
  )
}

function OrderRow({ order, onProcess }: { order: BillingOrder; onProcess: () => void }) {
  const t = useT()
  const locale = useLocale()
  const isRequested = order.status === 'REQUESTED'

  return (
    <tr
      className={
        isRequested
          ? 'border-b border-border/60 bg-warning-soft/40 last:border-0'
          : 'border-b border-border/60 last:border-0'
      }
    >
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
      <td className="py-2.5 pr-4 text-muted-foreground">
        {formatDateTime(order.createdAt, locale)}
      </td>
      <td className="py-2.5 text-right">
        {/* Обработка заявки: PLAN — активация пакета с заказом-основанием (§2.4),
            остальные виды — запись ручного платежа (S-4). */}
        {isRequested && (
          <Button variant="outline" size="sm" onClick={onProcess}>
            {t('admin.billing.orders.process')}
          </Button>
        )}
      </td>
    </tr>
  )
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function formatOverrideValue(override: BillingOverride, t: Translator): string {
  if (override.valueBool != null) {
    return override.valueBool
      ? t('admin.billing.overrides.yes')
      : t('admin.billing.overrides.no')
  }
  if (override.valueInt != null) return String(override.valueInt)
  if (override.valueString != null) return override.valueString
  return '—'
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}
