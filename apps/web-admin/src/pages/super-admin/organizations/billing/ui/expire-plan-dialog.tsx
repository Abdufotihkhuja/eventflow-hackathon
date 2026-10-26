/**
 * Диалог «Истечь принудительно» (S-3): деструктивное подтверждение,
 * причина ОБЯЗАТЕЛЬНА (политика mandatory-reason), описание объясняет
 * немедленный возврат на START (§2.1). Инлайн-ошибка — B-11.
 */

import { useEffect, useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getApiErrorMessage, useExpirePlan } from '@features/super-admin'
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

type ExpirePlanDialogProps = {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpirePlanDialog({ orgId, open, onOpenChange }: ExpirePlanDialogProps) {
  const t = useT()
  const expirePlan = useExpirePlan(orgId)

  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      expirePlan.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canSubmit = reason.trim().length >= MIN_REASON_LENGTH && !expirePlan.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    expirePlan.mutate({ reason: reason.trim() }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (expirePlan.isPending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-destructive" aria-hidden="true" />
            {t('admin.billing.expireDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('admin.billing.expireDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expire-reason">
              {t('admin.billing.expireDialog.reasonLabel')}
            </Label>
            <Textarea
              id="expire-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.billing.expireDialog.reasonPlaceholder')}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {expirePlan.isError && (
            <InlineError
              message={getApiErrorMessage(
                expirePlan.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={expirePlan.isPending}
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
            {expirePlan.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.expireDialog.submitting')}
              </>
            ) : (
              t('admin.billing.expireDialog.submit')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
