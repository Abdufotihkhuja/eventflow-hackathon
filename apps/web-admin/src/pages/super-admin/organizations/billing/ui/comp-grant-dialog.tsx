/**
 * Диалог comp-гранта монет (S-7): goodwill-начисление в леджер, переживает
 * смену/истечение тарифа. AI-метрика хранится в СЕКУНДАХ (CR-26) — админ
 * вводит минуты, на отправке конвертируем ×60. Причина обязательна.
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { CoinMetric } from '@api/services'
import { getApiErrorMessage, useCompGrant } from '@features/super-admin'
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
  Textarea,
} from '@shared/ui'

import { InlineError } from './inline-error'

const MIN_REASON_LENGTH = 3
/** Верхняя граница DTO — 1 000 000 единиц (секунд/юнитов). */
const MAX_QUANTITY = 1_000_000

type CompGrantDialogProps = {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompGrantDialog({ orgId, open, onOpenChange }: CompGrantDialogProps) {
  const t = useT()
  const compGrant = useCompGrant(orgId)

  const [metric, setMetric] = useState<CoinMetric>('GENERATION_UNITS')
  const [quantityInput, setQuantityInput] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setMetric('GENERATION_UNITS')
      setQuantityInput('')
      setReason('')
      compGrant.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const quantity = /^\d+$/.test(quantityInput.trim()) ? Number(quantityInput.trim()) : null
  /** Отправляемое количество: минуты → секунды для AI-метрики. */
  const sendQuantity = quantity !== null && metric === 'AI_SECONDS' ? quantity * 60 : quantity
  const quantityValid =
    sendQuantity !== null && sendQuantity >= 1 && sendQuantity <= MAX_QUANTITY
  const canSubmit =
    quantityValid && reason.trim().length >= MIN_REASON_LENGTH && !compGrant.isPending

  const handleSubmit = () => {
    if (!canSubmit || sendQuantity === null) return
    compGrant.mutate(
      { metric, quantity: sendQuantity, reason: reason.trim() },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (compGrant.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.billing.compDialog.title')}</DialogTitle>
          <DialogDescription>{t('admin.billing.compDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comp-metric">{t('admin.billing.compDialog.metricLabel')}</Label>
            <Select value={metric} onValueChange={value => setMetric(value as CoinMetric)}>
              <SelectTrigger id="comp-metric" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERATION_UNITS">
                  {t('admin.billing.compDialog.metric.GENERATION_UNITS')}
                </SelectItem>
                <SelectItem value="AI_SECONDS">
                  {t('admin.billing.compDialog.metric.AI_SECONDS')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comp-quantity">
              {metric === 'AI_SECONDS'
                ? t('admin.billing.compDialog.quantityMinutesLabel')
                : t('admin.billing.compDialog.quantityUnitsLabel')}
            </Label>
            <Input
              id="comp-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              value={quantityInput}
              onChange={e => setQuantityInput(e.target.value)}
            />
            {metric === 'AI_SECONDS' && quantityValid && quantity !== null && (
              <p className="text-xs text-muted-foreground">
                {t('admin.billing.compDialog.secondsPreview', {
                  seconds: quantity * 60,
                })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comp-reason">{t('admin.billing.compDialog.reasonLabel')}</Label>
            <Textarea
              id="comp-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.billing.compDialog.reasonPlaceholder')}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {compGrant.isError && (
            <InlineError
              message={getApiErrorMessage(
                compGrant.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={compGrant.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {compGrant.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.compDialog.submitting')}
              </>
            ) : (
              t('admin.billing.compDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
