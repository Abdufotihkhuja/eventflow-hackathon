/**
 * Диалог «Реверсировать платёж» (S-4): деструктивное подтверждение,
 * причина ОБЯЗАТЕЛЬНА. Исправления — только реверс-записями (D-5).
 * Loading/инлайн-ошибка — B-11.
 */

import { useEffect, useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { PaymentTransaction } from '@api/services'
import { getApiErrorMessage, useReversePayment } from '@features/super-admin'
import { formatMinorAmount } from '@shared/lib'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
  Textarea,
} from '@shared/ui'

import { InlineError } from './inline-error'

const MIN_REASON_LENGTH = 3

type ReversePaymentDialogProps = {
  orgId: string
  transaction: PaymentTransaction | null
  onOpenChange: (open: boolean) => void
  /** Реверсированная транзакция — страница обновляет сессионный список. */
  onReversed: (transaction: PaymentTransaction) => void
}

export function ReversePaymentDialog({
  orgId,
  transaction,
  onOpenChange,
  onReversed,
}: ReversePaymentDialogProps) {
  const t = useT()
  const locale = useLocale()
  const reversePayment = useReversePayment(orgId)

  const [reason, setReason] = useState('')
  const open = transaction !== null

  useEffect(() => {
    if (open) {
      setReason('')
      reversePayment.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canSubmit = reason.trim().length >= MIN_REASON_LENGTH && !reversePayment.isPending

  const handleSubmit = () => {
    if (!transaction || !canSubmit) return
    reversePayment.mutate(
      { transactionId: transaction.id, reason: reason.trim() },
      {
        onSuccess: reversed => {
          onReversed(reversed)
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (reversePayment.isPending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-destructive" aria-hidden="true" />
            {t('admin.billing.reverseDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.billing.reverseDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {transaction && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm tabular-nums text-foreground">
              {t('admin.billing.reverseDialog.transactionLabel', {
                ref: transaction.providerTxnId,
                amount: formatMinorAmount(
                  transaction.amountMinor,
                  transaction.currency,
                  locale
                ),
              })}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="reverse-reason">
              {t('admin.billing.reverseDialog.reasonLabel')}
            </Label>
            <Textarea
              id="reverse-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.billing.reverseDialog.reasonPlaceholder')}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {reversePayment.isError && (
            <InlineError
              message={getApiErrorMessage(
                reversePayment.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={reversePayment.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {reversePayment.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.reverseDialog.submitting')}
              </>
            ) : (
              t('admin.billing.reverseDialog.submit')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
