import { CheckCircle2, Info, Loader2 } from 'lucide-react'
import { toIntlLocale } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { ApiError } from '@api/types'
import type { BillingPlanKey } from '@api/services'
import { formatDate } from '@shared/lib/format'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui'

import { useBillingRequestsQuery, useCreateBillingRequest } from '../api'

export type BillingRequestPayload =
  | { kind: 'PLAN'; planKey: BillingPlanKey; mode: 'upgrade' | 'renew' }
  | { kind: 'COIN_PACK' | 'ADVERTISING'; skuCode: string; title: string }

type BillingRequestDialogProps = {
  payload: BillingRequestPayload | null
  onClose: () => void
}

type DuplicateDetails = { existingOrderId?: string; kind?: string }

/** 409 BILLING_REQUEST_DUPLICATE → детали существующей заявки (или null). */
function extractDuplicate(error: unknown): DuplicateDetails | null {
  const body = (error as ApiError | undefined)?.details as
    | { code?: string; details?: DuplicateDetails }
    | undefined
  if (body?.code !== 'BILLING_REQUEST_DUPLICATE') return null
  return body.details ?? {}
}

/**
 * Заявка managed-фазы (C-5): подтверждение → POST /billing/requests →
 * успех с SLA-копией (D-4: «в течение 2 рабочих дней»). Дубликат (409)
 * показывается честно — с датой существующей заявки из истории заказов.
 * Продление говорит прямо: кредиты сбрасываются (§2.1), а не складываются.
 */
export function BillingRequestDialog({ payload, onClose }: BillingRequestDialogProps) {
  const t = useT()
  const locale = useLocale()
  const createRequest = useCreateBillingRequest()
  const requestsQuery = useBillingRequestsQuery(payload !== null)

  const open = payload !== null

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      createRequest.reset()
      onClose()
    }
  }

  const handleConfirm = () => {
    if (!payload) return
    if (payload.kind === 'PLAN') {
      createRequest.mutate({ kind: 'PLAN', planKey: payload.planKey })
    } else {
      createRequest.mutate({ kind: payload.kind, skuCode: payload.skuCode })
    }
  }

  const duplicate = createRequest.isError ? extractDuplicate(createRequest.error) : null
  const otherError = createRequest.isError && !duplicate

  const duplicateOrder = duplicate
    ? (requestsQuery.data?.find(order => order.id === duplicate.existingOrderId) ??
      requestsQuery.data?.find(
        order => order.status === 'REQUESTED' && order.kind === payload?.kind
      ))
    : undefined

  const title =
    payload?.kind === 'PLAN'
      ? t(
          payload.mode === 'renew'
            ? 'billing.requestDialog.titleRenew'
            : 'billing.requestDialog.titleUpgrade',
          { plan: t(`billing.tiers.${payload.planKey}`) }
        )
      : payload
        ? t('billing.requestDialog.titleAddon', { title: payload.title })
        : ''

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {createRequest.isSuccess ? (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 className="size-5 text-success-soft-foreground" aria-hidden />
              </div>
              <DialogTitle>{t('billing.requestDialog.successTitle')}</DialogTitle>
              <DialogDescription>{t('billing.requestDialog.successBody')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                {t('billing.requestDialog.close')}
              </Button>
            </DialogFooter>
          </>
        ) : duplicate ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('billing.requestDialog.duplicateTitle')}</DialogTitle>
              <DialogDescription>
                {duplicateOrder
                  ? t('billing.requestDialog.duplicateBody', {
                      date: formatDate(duplicateOrder.createdAt, toIntlLocale(locale)),
                    })
                  : t('billing.requestDialog.duplicateBodyNoDate')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t('billing.requestDialog.close')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{t('billing.requestDialog.bodyPlan')}</DialogDescription>
            </DialogHeader>

            {payload?.kind === 'PLAN' && payload.mode === 'renew' && (
              <div className="flex gap-2.5 rounded-lg bg-secondary/50 p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {t('billing.requestDialog.renewResetNote')}
                </p>
              </div>
            )}

            {otherError && (
              <p role="alert" className="text-[13px] text-destructive">
                {t('billing.requestDialog.errorBody')}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t('billing.requestDialog.cancel')}
              </Button>
              <Button onClick={handleConfirm} disabled={createRequest.isPending}>
                {createRequest.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                )}
                {t('billing.requestDialog.confirm')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
