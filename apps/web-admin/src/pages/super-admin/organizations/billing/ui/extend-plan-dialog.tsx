/**
 * Диалог «Продлить период» (S-3): дни 1–365 + необязательная причина.
 * Ручной «предохранительный клапан» для споров о продлении (§2.1).
 * Loading/инлайн-ошибка обязательны (критик B-11).
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import { getApiErrorMessage, useExtendPlan } from '@features/super-admin'
import { DAYS_PLURAL } from '@shared/lib'
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

const MIN_DAYS = 1
const MAX_DAYS = 365

type ExtendPlanDialogProps = {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExtendPlanDialog({ orgId, open, onOpenChange }: ExtendPlanDialogProps) {
  const t = useT()
  const locale = useLocale()
  const extendPlan = useExtendPlan(orgId)

  const [daysInput, setDaysInput] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setDaysInput('')
      setReason('')
      extendPlan.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const days = /^\d+$/.test(daysInput.trim()) ? Number(daysInput.trim()) : null
  const daysValid = days !== null && days >= MIN_DAYS && days <= MAX_DAYS
  const canSubmit = daysValid && !extendPlan.isPending

  const handleSubmit = () => {
    if (!daysValid || days === null) return
    extendPlan.mutate(
      { days, reason: reason.trim() || undefined },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (extendPlan.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.billing.extendDialog.title')}</DialogTitle>
          <DialogDescription>{t('admin.billing.extendDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="extend-days">{t('admin.billing.extendDialog.daysLabel')}</Label>
            <Input
              id="extend-days"
              type="number"
              inputMode="numeric"
              min={MIN_DAYS}
              max={MAX_DAYS}
              value={daysInput}
              onChange={e => setDaysInput(e.target.value)}
            />
            {daysValid && (
              <p className="text-xs text-muted-foreground">
                {t('admin.billing.extendDialog.preview', {
                  days: plural(locale, days, DAYS_PLURAL),
                })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="extend-reason">
              {t('admin.billing.extendDialog.reasonLabel')}
            </Label>
            <Textarea
              id="extend-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.billing.extendDialog.reasonPlaceholder')}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {extendPlan.isError && (
            <InlineError
              message={getApiErrorMessage(
                extendPlan.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={extendPlan.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {extendPlan.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.extendDialog.submitting')}
              </>
            ) : (
              t('admin.billing.extendDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
