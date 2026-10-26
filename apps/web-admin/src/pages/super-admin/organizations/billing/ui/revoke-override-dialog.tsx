/**
 * Диалог «Снять оверрайд» (S-5/S-6): организация возвращается к значению
 * тарифа по этому ключу. Причина ОБЯЗАТЕЛЬНА — история остаётся в аудите
 * (CAP_OVERRIDE_REVOKE / COMMISSION_OVERRIDE_REVOKE).
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { BillingOverride } from '@api/services'
import { getApiErrorMessage, useRevokeOverride } from '@features/super-admin'
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

type RevokeOverrideDialogProps = {
  orgId: string
  /** Целевой оверрайд; null — диалог закрыт. */
  override: BillingOverride | null
  onOpenChange: (open: boolean) => void
}

export function RevokeOverrideDialog({
  orgId,
  override,
  onOpenChange,
}: RevokeOverrideDialogProps) {
  const t = useT()
  const revokeOverride = useRevokeOverride(orgId)
  const [reason, setReason] = useState('')

  const open = override !== null

  useEffect(() => {
    if (open) {
      setReason('')
      revokeOverride.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canSubmit = reason.trim().length >= MIN_REASON_LENGTH && !revokeOverride.isPending

  const handleSubmit = () => {
    if (!override || !canSubmit) return
    revokeOverride.mutate(
      { key: override.key, reason: reason.trim() },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (revokeOverride.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.billing.revokeOverrideDialog.title')}</DialogTitle>
          <DialogDescription>
            {override
              ? t('admin.billing.revokeOverrideDialog.description', {
                  key: t(`admin.billing.overrides.keys.${override.key}`),
                })
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">
              {t('admin.billing.revokeOverrideDialog.reasonLabel')}
            </Label>
            <Textarea
              id="revoke-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.billing.revokeOverrideDialog.reasonPlaceholder')}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {revokeOverride.isError && (
            <InlineError
              message={getApiErrorMessage(
                revokeOverride.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={revokeOverride.isPending}
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
            {revokeOverride.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.revokeOverrideDialog.submitting')}
              </>
            ) : (
              t('admin.billing.revokeOverrideDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
