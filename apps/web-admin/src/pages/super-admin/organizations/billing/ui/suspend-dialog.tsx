/**
 * Диалог приостановки/реактивации организации (S-8, пакет D-1/E-17):
 * вход остаётся, запись в кабинете блокируется, новые регистрации закрыты.
 * Причина обязательна для приостановки; реактивация — подтверждение без тела.
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getApiErrorMessage, useReactivateOrg, useSuspendOrg } from '@features/super-admin'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@shared/ui'

import { InlineError } from './inline-error'

const MIN_REASON_LENGTH = 3

type SuspendDialogProps = {
  orgId: string
  /** true — организация сейчас приостановлена (диалог работает как реактивация). */
  suspended: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuspendDialog({ orgId, suspended, open, onOpenChange }: SuspendDialogProps) {
  const t = useT()
  const suspend = useSuspendOrg(orgId)
  const reactivate = useReactivateOrg(orgId)
  const [reason, setReason] = useState('')

  const pending = suspend.isPending || reactivate.isPending
  const mutation = suspended ? reactivate : suspend

  useEffect(() => {
    if (open) {
      setReason('')
      suspend.reset()
      reactivate.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canSubmit = suspended
    ? !pending
    : reason.trim().length >= MIN_REASON_LENGTH && !pending

  const handleSubmit = () => {
    if (!canSubmit) return
    if (suspended) {
      reactivate.mutate(undefined, { onSuccess: () => onOpenChange(false) })
    } else {
      suspend.mutate(reason.trim(), { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (pending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {suspended
              ? t('admin.billing.suspendDialog.reactivateTitle')
              : t('admin.billing.suspendDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {suspended
              ? t('admin.billing.suspendDialog.reactivateDescription')
              : t('admin.billing.suspendDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!suspended && (
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">
                {t('admin.billing.suspendDialog.reasonLabel')}
              </Label>
              <Textarea
                id="suspend-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t('admin.billing.suspendDialog.reasonPlaceholder')}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
            </div>
          )}

          {mutation.isError && (
            <InlineError
              message={getApiErrorMessage(
                mutation.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button
            type="button"
            variant={suspended ? 'default' : 'destructive'}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.suspendDialog.submitting')}
              </>
            ) : suspended ? (
              t('admin.billing.suspendDialog.reactivateSubmit')
            ) : (
              t('admin.billing.suspendDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
