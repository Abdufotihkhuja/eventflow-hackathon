/**
 * Диалог «Установить оверрайд» (S-5/S-6): per-org переопределение энтайтлмента
 * поверх тарифа. Редактор значения типизирован по ключу (числовые → valueInt,
 * флаг → valueBool, енумы → valueString); причина ОБЯЗАТЕЛЬНА (OQ-7),
 * expiresAt — опциональный тайм-бокс. EVENT_CREDITS намеренно исключён:
 * резолвер его не читает — кредиты пакета правятся диалогом корректировки.
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { BillingOverride, EntitlementKey } from '@api/services'
import { getApiErrorMessage, useSetOverride } from '@features/super-admin'
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
  Switch,
  Textarea,
} from '@shared/ui'

import { InlineError } from './inline-error'

const MIN_REASON_LENGTH = 3

/** Ключи, редактируемые оверрайдом, и вид их значения. */
const KEY_VALUE_KIND = {
  COMMISSION_BPS: 'int',
  STAFF_SEATS: 'int',
  MAX_PARTICIPANTS_PER_EVENT: 'int',
  MAX_EVENTS: 'int',
  GENERATION_CREDITS: 'int',
  AI_MINUTES_MONTHLY: 'int',
  TASK_BOARD_ENABLED: 'bool',
  STATS_TIER: 'enum',
  QR_MODE: 'enum',
  // Пилот/точечное отключение VIA-платежей поверх глобального тумблера.
  VIA_PAYMENTS: 'bool',
} as const

type OverridableKey = keyof typeof KEY_VALUE_KIND

const OVERRIDABLE_KEYS = Object.keys(KEY_VALUE_KIND) as OverridableKey[]

/** Варианты енум-ключей (зеркалят StatsTier / QrCheckInMode бэкенда). */
const ENUM_OPTIONS: Record<'STATS_TIER' | 'QR_MODE', string[]> = {
  STATS_TIER: ['BASIC', 'FORECASTING', 'FORECASTING_SLA'],
  QR_MODE: ['ARRIVAL_ONLY', 'EXTENDED'],
}

/** Границы числовых значений: комиссия ≤ 1200 bps (CR-8), остальные ≥ 0. */
const INT_MAX: Partial<Record<OverridableKey, number>> = {
  COMMISSION_BPS: 1200,
}

type OverrideDialogProps = {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Существующий оверрайд для правки; null — создание нового. */
  initial: BillingOverride | null
}

export function OverrideDialog({ orgId, open, onOpenChange, initial }: OverrideDialogProps) {
  const t = useT()
  const setOverride = useSetOverride(orgId)

  const [key, setKey] = useState<OverridableKey>('STAFF_SEATS')
  const [intInput, setIntInput] = useState('')
  const [boolValue, setBoolValue] = useState(true)
  const [enumValue, setEnumValue] = useState('')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial && OVERRIDABLE_KEYS.includes(initial.key as OverridableKey)) {
      setKey(initial.key as OverridableKey)
      setIntInput(initial.valueInt != null ? String(initial.valueInt) : '')
      setBoolValue(initial.valueBool ?? true)
      setEnumValue(initial.valueString ?? '')
      setReason(initial.reason)
      setExpiresAt(initial.expiresAt ? initial.expiresAt.slice(0, 10) : '')
    } else {
      setKey('STAFF_SEATS')
      setIntInput('')
      setBoolValue(true)
      setEnumValue('')
      setReason('')
      setExpiresAt('')
    }
    setOverride.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const kind = KEY_VALUE_KIND[key]
  const intValue = /^\d+$/.test(intInput.trim()) ? Number(intInput.trim()) : null
  const intMax = INT_MAX[key]
  const intValid = intValue !== null && (intMax === undefined || intValue <= intMax)

  const valueValid =
    kind === 'int' ? intValid : kind === 'enum' ? enumValue.length > 0 : true
  const canSubmit =
    valueValid && reason.trim().length >= MIN_REASON_LENGTH && !setOverride.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    setOverride.mutate(
      {
        key: key as EntitlementKey,
        ...(kind === 'int' && intValue !== null ? { valueInt: intValue } : {}),
        ...(kind === 'bool' ? { valueBool: boolValue } : {}),
        ...(kind === 'enum' ? { valueString: enumValue } : {}),
        reason: reason.trim(),
        ...(expiresAt
          ? { expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString() }
          : {}),
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (setOverride.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? t('admin.billing.overrideDialog.editTitle')
              : t('admin.billing.overrideDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('admin.billing.overrideDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="override-key">{t('admin.billing.overrideDialog.keyLabel')}</Label>
            <Select
              value={key}
              onValueChange={value => setKey(value as OverridableKey)}
              disabled={!!initial}
            >
              <SelectTrigger id="override-key" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDABLE_KEYS.map(k => (
                  <SelectItem key={k} value={k}>
                    {t(`admin.billing.overrides.keys.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind === 'int' && (
            <div className="space-y-2">
              <Label htmlFor="override-int">
                {t('admin.billing.overrideDialog.valueLabel')}
              </Label>
              <Input
                id="override-int"
                type="number"
                inputMode="numeric"
                min={0}
                max={intMax}
                value={intInput}
                onChange={e => setIntInput(e.target.value)}
              />
              {key === 'COMMISSION_BPS' && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.billing.overrideDialog.commissionHint')}
                  {intValid && intValue !== null && (
                    <span className="ml-1 font-medium tabular-nums text-foreground">
                      = {(intValue / 100).toLocaleString()}%
                    </span>
                  )}
                </p>
              )}
              {intValue !== null && intMax !== undefined && intValue > intMax && (
                <p className="text-xs text-destructive">
                  {t('admin.billing.overrideDialog.maxExceeded', { max: intMax })}
                </p>
              )}
            </div>
          )}

          {kind === 'bool' && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="override-bool" className="text-sm font-normal">
                {t('admin.billing.overrideDialog.boolLabel')}
              </Label>
              <Switch id="override-bool" checked={boolValue} onCheckedChange={setBoolValue} />
            </div>
          )}

          {kind === 'enum' && (
            <div className="space-y-2">
              <Label htmlFor="override-enum">
                {t('admin.billing.overrideDialog.valueLabel')}
              </Label>
              <Select value={enumValue} onValueChange={setEnumValue}>
                <SelectTrigger id="override-enum" className="w-full">
                  <SelectValue
                    placeholder={t('admin.billing.overrideDialog.enumPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {ENUM_OPTIONS[key as 'STATS_TIER' | 'QR_MODE'].map(option => (
                    <SelectItem key={option} value={option}>
                      {t(`admin.billing.overrideDialog.enum.${key}.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="override-expires">
              {t('admin.billing.overrideDialog.expiresLabel')}
            </Label>
            <Input
              id="override-expires"
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.billing.overrideDialog.expiresHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-reason">
              {t('admin.billing.overrideDialog.reasonLabel')}
            </Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.billing.overrideDialog.reasonPlaceholder')}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {setOverride.isError && (
            <InlineError
              message={getApiErrorMessage(
                setOverride.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={setOverride.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {setOverride.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.overrideDialog.submitting')}
              </>
            ) : (
              t('admin.billing.overrideDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
