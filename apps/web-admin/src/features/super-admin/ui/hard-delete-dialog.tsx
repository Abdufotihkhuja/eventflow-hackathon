/**
 * Универсальный диалог необратимого удаления (hard delete) для Super Admin.
 *
 * Защита от случайного удаления:
 *  - визуально опасный (danger) стиль и явное предупреждение;
 *  - кнопка подтверждения активна только когда супер-админ ввёл точную строку
 *    подтверждения (`confirmationPhrase`);
 *  - диалог нельзя закрыть кликом мимо (AlertDialog) — только явными кнопками.
 */

import { useEffect, useState } from 'react'
import { useT } from '@eventflow/i18n/react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'

import { cn } from '@shared/lib/cn'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
} from '@shared/ui'

type HardDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Заголовок диалога. */
  title: string
  /** Предупреждение о необратимости (под заголовком). */
  warning: string
  /** Точная строка, которую нужно ввести (например, `DELETE` или `DELETE Acme`). */
  confirmationPhrase: string
  /** Подпись к полю ввода (например, «Введите DELETE для подтверждения»). */
  inputLabel: string
  /** Доп. содержимое: реквизиты сущности / сводка зависимостей. */
  children?: React.ReactNode
  /** Текст кнопки подтверждения. */
  confirmLabel: string
  isPending?: boolean
  onConfirm: () => void
}

export function HardDeleteDialog({
  open,
  onOpenChange,
  title,
  warning,
  confirmationPhrase,
  inputLabel,
  children,
  confirmLabel,
  isPending,
  onConfirm,
}: HardDeleteDialogProps) {
  const t = useT()
  const [value, setValue] = useState('')

  // Сбрасываем введённое подтверждение каждый раз, когда диалог открывается.
  useEffect(() => {
    if (open) setValue('')
  }, [open])

  const matches = value.trim() === confirmationPhrase

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        // Запрещаем закрытие во время выполнения запроса.
        if (isPending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{warning}</AlertDialogDescription>
        </AlertDialogHeader>

        {children ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            {children}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="hard-delete-confirm" className="text-sm">
            {inputLabel}
          </Label>
          <Input
            id="hard-delete-confirm"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={confirmationPhrase}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={isPending}
            className={cn(
              'font-mono',
              value.length > 0 && !matches && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>

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
            variant="destructive"
            disabled={!matches || isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
