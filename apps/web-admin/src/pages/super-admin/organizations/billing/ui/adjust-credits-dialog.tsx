/**
 * Диалог «Корректировка кредитов» (S-3): дельта ± (не 0, −1000…1000),
 * причина ОБЯЗАТЕЛЬНА. Append-only на бэкенде: отрицательная дельта
 * guarded не ниже нуля. Превью нового баланса; инлайн-ошибка — B-11.
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getApiErrorMessage, useAdjustCredits } from '@features/super-admin'
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
  Textarea,
} from '@shared/ui'

import { InlineError } from './inline-error'

const MIN_REASON_LENGTH = 3
const MAX_ABS_DELTA = 1000

type AdjustCreditsDialogProps = {
  orgId: string
  /** Текущий остаток кредитов живого пакета — для превью нового баланса. */
  creditsRemaining: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdjustCreditsDialog({
  orgId,
  creditsRemaining,
  open,
  onOpenChange,
}: AdjustCreditsDialogProps) {
  const t = useT()
  const adjustCredits = useAdjustCredits(orgId)

  const [deltaInput, setDeltaInput] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setDeltaInput('')
      setReason('')
      adjustCredits.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const delta = /^-?\d+$/.test(deltaInput.trim()) ? Number(deltaInput.trim()) : null
  const deltaValid =
    delta !== null && delta !== 0 && Math.abs(delta) <= MAX_ABS_DELTA
  const newBalance = deltaValid && delta !== null ? creditsRemaining + delta : null
  const canSubmit =
    deltaValid && reason.trim().length >= MIN_REASON_LENGTH && !adjustCredits.isPending

  const handleSubmit = () => {
    if (!deltaValid || delta === null) return
    adjustCredits.mutate(
      { delta, reason: reason.trim() },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (adjustCredits.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.billing.adjustDialog.title')}</DialogTitle>
          <DialogDescription>{t('admin.billing.adjustDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjust-delta">{t('admin.billing.adjustDialog.deltaLabel')}</Label>
            <Input
              id="adjust-delta"
              type="number"
              inputMode="numeric"
              min={-MAX_ABS_DELTA}
              max={MAX_ABS_DELTA}
              value={deltaInput}
              onChange={e => setDeltaInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.billing.adjustDialog.deltaHint')}
            </p>
            {newBalance !== null && (
              <p className="text-xs font-medium tabular-nums text-foreground">
                {t('admin.billing.adjustDialog.preview', {
                  from: creditsRemaining,
                  to: newBalance,
                })}
              </p>
            )}
            {newBalance !== null && newBalance < 0 && (
              <p className="text-xs text-destructive">
                {t('admin.billing.adjustDialog.belowZero')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-reason">
              {t('admin.billing.adjustDialog.reasonLabel')}
            </Label>
            <Textarea
              id="adjust-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.billing.adjustDialog.reasonPlaceholder')}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {adjustCredits.isError && (
            <InlineError
              message={getApiErrorMessage(
                adjustCredits.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={adjustCredits.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {adjustCredits.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.adjustDialog.submitting')}
              </>
            ) : (
              t('admin.billing.adjustDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
