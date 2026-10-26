/**
 * Диалог «Записать платёж» (S-4, managed-фаза).
 *
 * Сумма вводится в UZS и конвертируется в СТРОКУ тийинов (BigInt-математика,
 * D-3); внешний референс обязателен (D-5); необязательная привязка к
 * REQUESTED-заказу подставляет тип выручки. 409 PAYMENT_DUPLICATE_REF
 * показывается инлайн по машиночитаемому code (E-13). Loading/ошибка — B-11.
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { formatDate } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type {
  BillingOrder,
  PaymentTransaction,
  RevenueType,
} from '@api/services'
import {
  getApiErrorCode,
  getApiErrorMessage,
  useRecordPayment,
} from '@features/super-admin'
import { formatMinorAmount, parseMajorToMinor } from '@shared/lib'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

import { InlineError } from './inline-error'

const NO_ORDER_VALUE = 'none'
const REVENUE_TYPES: RevenueType[] = ['PLAN_FEE', 'COIN_PACK', 'ADVERTISING']
const MIN_REF_LENGTH = 3
const MAX_REF_LENGTH = 120

/** Тип выручки по виду заказа-основания (TICKET_SALE не бывает заявкой). */
function revenueTypeForOrder(order: BillingOrder | undefined): RevenueType | null {
  switch (order?.kind) {
    case 'PLAN':
      return 'PLAN_FEE'
    case 'COIN_PACK':
      return 'COIN_PACK'
    case 'ADVERTISING':
      return 'ADVERTISING'
    default:
      return null
  }
}

type RecordPaymentDialogProps = {
  orgId: string
  /** REQUESTED-заказы для необязательной привязки платежа. */
  pendingOrders: BillingOrder[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Предвыбранный заказ («Обработать» из истории заказов). */
  initialOrderId?: string | null
  /** Записанная транзакция — страница ведёт сессионный список (S-4 note). */
  onRecorded: (transaction: PaymentTransaction) => void
}

export function RecordPaymentDialog({
  orgId,
  pendingOrders,
  open,
  onOpenChange,
  initialOrderId,
  onRecorded,
}: RecordPaymentDialogProps) {
  const t = useT()
  const locale = useLocale()
  const recordPayment = useRecordPayment(orgId)

  const [orderId, setOrderId] = useState<string>(NO_ORDER_VALUE)
  const [amountInput, setAmountInput] = useState('')
  const [externalRef, setExternalRef] = useState('')
  const [revenueType, setRevenueType] = useState<RevenueType>('PLAN_FEE')

  useEffect(() => {
    if (open) {
      const initial = initialOrderId ?? NO_ORDER_VALUE
      setOrderId(initial)
      setAmountInput('')
      setExternalRef('')
      setRevenueType(
        revenueTypeForOrder(pendingOrders.find(o => o.id === initialOrderId)) ??
          'PLAN_FEE'
      )
      recordPayment.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialOrderId])

  const amountMinor = parseMajorToMinor(amountInput)
  const refValid =
    externalRef.trim().length >= MIN_REF_LENGTH &&
    externalRef.trim().length <= MAX_REF_LENGTH
  const canSubmit = amountMinor !== null && refValid && !recordPayment.isPending

  const errorCode = recordPayment.isError ? getApiErrorCode(recordPayment.error) : undefined
  const errorMessage = recordPayment.isError
    ? errorCode === 'PAYMENT_DUPLICATE_REF'
      ? t('admin.billing.paymentDialog.duplicateRef')
      : getApiErrorMessage(recordPayment.error, t('admin.billing.panel.loadError'))
    : null

  const handleSelectOrder = (value: string) => {
    setOrderId(value)
    const linked = revenueTypeForOrder(pendingOrders.find(o => o.id === value))
    if (linked) setRevenueType(linked)
  }

  const handleSubmit = () => {
    if (amountMinor === null || !refValid) return
    recordPayment.mutate(
      {
        orderId: orderId === NO_ORDER_VALUE ? undefined : orderId,
        amountMinor,
        currency: 'UZS',
        externalRef: externalRef.trim(),
        revenueType,
      },
      {
        onSuccess: transaction => {
          onRecorded(transaction)
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (recordPayment.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin.billing.paymentDialog.title')}</DialogTitle>
          <DialogDescription>{t('admin.billing.paymentDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-order">
              {t('admin.billing.paymentDialog.orderLabel')}
            </Label>
            <Select value={orderId} onValueChange={handleSelectOrder}>
              <SelectTrigger id="payment-order" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ORDER_VALUE}>
                  {t('admin.billing.paymentDialog.noOrder')}
                </SelectItem>
                {pendingOrders.map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {t('admin.billing.paymentDialog.orderOption', {
                      kind: t(`admin.billing.orders.kind.${order.kind}`),
                      amount: formatMinorAmount(order.amountMinor, order.currency, locale),
                      date: formatDate(order.createdAt, locale),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">
              {t('admin.billing.paymentDialog.amountLabel')}
            </Label>
            <Input
              id="payment-amount"
              inputMode="decimal"
              placeholder="1 500 000"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.billing.paymentDialog.amountHint')}
            </p>
            {amountMinor !== null && (
              <p className="text-xs font-medium tabular-nums text-foreground">
                {t('admin.billing.paymentDialog.amountPreview', { minor: amountMinor })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-ref">
              {t('admin.billing.paymentDialog.externalRefLabel')}
            </Label>
            <Input
              id="payment-ref"
              value={externalRef}
              onChange={e => setExternalRef(e.target.value)}
              placeholder={t('admin.billing.paymentDialog.externalRefPlaceholder')}
              maxLength={MAX_REF_LENGTH}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-revenue-type">
              {t('admin.billing.paymentDialog.revenueTypeLabel')}
            </Label>
            <Select
              value={revenueType}
              onValueChange={v => setRevenueType(v as RevenueType)}
            >
              <SelectTrigger id="payment-revenue-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {t(`admin.billing.paymentDialog.revenueTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {errorMessage && <InlineError message={errorMessage} />}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={recordPayment.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {recordPayment.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.paymentDialog.submitting')}
              </>
            ) : (
              t('admin.billing.paymentDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
