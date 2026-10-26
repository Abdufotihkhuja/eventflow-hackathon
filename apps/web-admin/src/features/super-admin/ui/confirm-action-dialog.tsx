/**
 * Лёгкий диалог подтверждения для обратимых действий супер-админа
 * (архивация — с опциональной причиной; восстановление — без). Для необратимого
 * удаления используется отдельный HardDeleteDialog с вводом фразы.
 */

import { useEffect, useState } from 'react'
import { useT } from '@eventflow/i18n/react'
import { Loader2 } from 'lucide-react'

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

type ConfirmActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  variant?: 'default' | 'destructive'
  /** Показать поле необязательной причины (для архивации). */
  withReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  isPending?: boolean
  onConfirm: (reason?: string) => void
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = 'default',
  withReason,
  reasonLabel,
  reasonPlaceholder,
  isPending,
  onConfirm,
}: ConfirmActionDialogProps) {
  const t = useT()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (isPending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {withReason ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-action-reason" className="text-sm">
              {reasonLabel}
            </Label>
            <Textarea
              id="confirm-action-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={isPending}
            onClick={() => onConfirm(withReason ? reason.trim() || undefined : undefined)}
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
