import * as React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { useT } from '@eventflow/i18n/react'

import {
  Button,
  DateTimeInput,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from '@shared/ui'

type RegistrationDeadlineFieldProps = {
  /** react-hook-form instance; обе формы (create/edit) используют loose-typed control. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

/**
 * Поле «Дедлайн регистрации» с явным переключателем включения/выключения и
 * кнопкой сброса. Синхронизировано с тумблером «Регистрация открыта»:
 * если регистрация закрыта вручную, показываем подсказку, что дедлайн не
 * действует, пока регистрацию не откроют.
 */
export function RegistrationDeadlineField({ form }: RegistrationDeadlineFieldProps) {
  const t = useT()
  const deadlineValue: string = form.watch('registrationDeadline') ?? ''
  const registrationOpen: boolean = form.watch('registrationOpen') ?? true
  const [enabled, setEnabled] = React.useState<boolean>(Boolean(deadlineValue))

  // Если значение появилось извне (например, при загрузке формы редактирования) —
  // включаем секцию.
  React.useEffect(() => {
    if (deadlineValue) setEnabled(true)
  }, [deadlineValue])

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    if (!checked) {
      form.setValue('registrationDeadline', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const handleReset = () => {
    form.setValue('registrationDeadline', '', {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <FormField
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      control={form.control as any}
      name="registrationDeadline"
      render={({ field }) => (
        <FormItem className="rounded-lg border border-border p-4">
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="space-y-0.5">
              <FormLabel className="text-base">
                {t('events.form.registrationDeadlineLabel')}
              </FormLabel>
              <FormDescription>
                {enabled
                  ? t('events.form.registrationDeadlineToggleOnHint')
                  : t('events.form.registrationDeadlineToggleOffHint')}
              </FormDescription>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              aria-label={t('events.form.registrationDeadlineLabel')}
            />
          </div>

          {enabled && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <FormControl>
                  <DateTimeInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    id="registrationDeadline"
                  />
                </FormControl>
                {field.value ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('actions.reset')}
                  </Button>
                ) : null}
              </div>
              <FormDescription>
                {t('events.form.registrationDeadlineDescription')}
              </FormDescription>
            </div>
          )}

          {!registrationOpen && (
            <p className="mt-3 flex items-center gap-1.5 rounded-md border border-warning-soft bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {t('events.form.registrationClosedDeadlineNote')}
            </p>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  )
}
