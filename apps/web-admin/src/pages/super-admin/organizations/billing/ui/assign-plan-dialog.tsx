/**
 * Диалог «Назначить/сменить тариф» (S-2, решение §2.4).
 *
 * При живом пакете и другом тарифе выбор судьбы кредитов ОБЯЗАТЕЛЕН
 * (RESET | CARRY_OVER) — без тихого дефолта; продление того же тарифа
 * всегда сбрасывает кредиты (§2.1). Ошибка мутации показывается инлайн (B-11).
 */

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { AdminOrgBilling, CreditMode, PlanKey } from '@api/services'
import { getApiErrorMessage, useActivatePlan } from '@features/super-admin'
import { cn } from '@shared/lib/cn'
import { CREDITS_PLURAL } from '@shared/lib'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

import { InlineError } from './inline-error'

const SELECTABLE_PLANS: PlanKey[] = ['PRO', 'EXCLUSIVE']

type AssignPlanDialogProps = {
  orgId: string
  billing: AdminOrgBilling
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Заказ-основание (заявка REQUESTED из истории заказов). */
  orderId?: string | null
}

export function AssignPlanDialog({
  orgId,
  billing,
  open,
  onOpenChange,
  orderId,
}: AssignPlanDialogProps) {
  const t = useT()
  const locale = useLocale()
  const activatePlan = useActivatePlan(orgId)

  const [planKey, setPlanKey] = useState<PlanKey | ''>('')
  const [creditMode, setCreditMode] = useState<CreditMode | null>(null)

  useEffect(() => {
    if (open) {
      setPlanKey('')
      setCreditMode(null)
      activatePlan.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const activePurchase = billing.status.activePurchase
  const remaining = activePurchase?.eventCreditsRemaining ?? 0
  const isRenewal = !!activePurchase && planKey === activePurchase.planKey
  const needsCreditChoice = !!activePurchase && !!planKey && !isRenewal
  const canSubmit =
    !!planKey && (!needsCreditChoice || creditMode !== null) && !activatePlan.isPending

  const remainingPhrase = plural(locale, remaining, CREDITS_PLURAL)

  const handleSubmit = () => {
    if (!planKey) return
    activatePlan.mutate(
      {
        planKey,
        creditMode: needsCreditChoice ? (creditMode ?? undefined) : undefined,
        orderId: orderId ?? undefined,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (activatePlan.isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin.billing.assignDialog.title')}</DialogTitle>
          <DialogDescription>{t('admin.billing.assignDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('admin.billing.assignDialog.currentPlan', {
              plan: t(`admin.billing.tiers.${billing.status.tierKey}`),
            })}
            {orderId ? (
              <>
                {' · '}
                {t('admin.billing.assignDialog.orderLinked', {
                  orderId: orderId.slice(0, 8),
                })}
              </>
            ) : null}
          </p>

          <div className="space-y-2">
            <Label htmlFor="assign-plan-select">
              {t('admin.billing.assignDialog.planLabel')}
            </Label>
            <Select
              value={planKey}
              onValueChange={v => {
                setPlanKey(v as PlanKey)
                setCreditMode(null)
              }}
            >
              <SelectTrigger id="assign-plan-select" className="w-full">
                <SelectValue placeholder={t('admin.billing.assignDialog.planPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE_PLANS.map(plan => (
                  <SelectItem key={plan} value={plan}>
                    {t(`admin.billing.tiers.${plan}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isRenewal && (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
              {t('admin.billing.assignDialog.renewalNotice')}
            </div>
          )}

          {needsCreditChoice && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                {t('admin.billing.assignDialog.creditChoiceTitle', {
                  credits: remainingPhrase,
                })}
              </legend>
              <p className="text-xs text-muted-foreground">
                {t('admin.billing.assignDialog.creditChoiceHint')}
              </p>

              <CreditModeOption
                checked={creditMode === 'RESET'}
                onSelect={() => setCreditMode('RESET')}
                title={t('admin.billing.assignDialog.resetTitle')}
                hint={t('admin.billing.assignDialog.resetHint')}
              />
              <CreditModeOption
                checked={creditMode === 'CARRY_OVER'}
                onSelect={() => setCreditMode('CARRY_OVER')}
                title={t('admin.billing.assignDialog.carryTitle')}
                hint={t('admin.billing.assignDialog.carryHint')}
              />

              {creditMode !== null && (
                <div className="rounded-md bg-muted px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('admin.billing.assignDialog.consequencesTitle')}
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-foreground">
                    <li>
                      {creditMode === 'RESET'
                        ? t('admin.billing.assignDialog.consequenceCreditsReset', {
                            credits: remainingPhrase,
                          })
                        : t('admin.billing.assignDialog.consequenceCreditsCarry', {
                            credits: remainingPhrase,
                          })}
                    </li>
                    <li>{t('admin.billing.assignDialog.consequenceCommission')}</li>
                    <li>{t('admin.billing.assignDialog.consequenceQuotas')}</li>
                  </ul>
                </div>
              )}
            </fieldset>
          )}

          {activatePlan.isError && (
            <InlineError
              message={getApiErrorMessage(
                activatePlan.error,
                t('admin.billing.panel.loadError')
              )}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={activatePlan.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {activatePlan.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                {t('admin.billing.assignDialog.submitting')}
              </>
            ) : (
              t('admin.billing.assignDialog.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type CreditModeOptionProps = {
  checked: boolean
  onSelect: () => void
  title: string
  hint: string
}

function CreditModeOption({ checked, onSelect, title, hint }: CreditModeOptionProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors',
        checked ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
      )}
    >
      <input
        type="radio"
        name="credit-mode"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        onChange={onSelect}
      />
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}
