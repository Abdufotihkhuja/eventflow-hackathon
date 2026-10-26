/**
 * Форма для создания/редактирования задачи
 */

import { Button } from '@shared/ui/shadcn/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui/shadcn/form'
import { Input } from '@shared/ui/shadcn/input'
import { Textarea } from '@shared/ui/shadcn/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/shadcn/select'
import { useTaskForm } from '../../lib/use-task-form'
import type { TaskFormData } from '../../lib'
import {
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  getTaskTypeLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from '@entities/task'
import { useT } from '@eventflow/i18n/react'

interface TaskFormProps {
  defaultValues?: Partial<TaskFormData>
  onSubmit: (data: TaskFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function TaskForm({ defaultValues, onSubmit, onCancel, isLoading = false }: TaskFormProps) {
  const t = useT()
  const { form, handleSubmit } = useTaskForm({
    defaultValues,
    onSubmit,
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tasks.form.titleLabel')}</FormLabel>
              <FormControl>
                <Input placeholder={t('tasks.form.titlePlaceholder')} {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('tasks.fields.description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('tasks.form.descriptionPlaceholder')}
                  rows={5}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks.fields.type')} *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.form.selectType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(TASK_TYPES).map(type => (
                      <SelectItem key={type} value={type}>
                        {getTaskTypeLabel(t)(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks.fields.priority')} *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.form.selectPriority')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(TASK_PRIORITIES).map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {getTaskPriorityLabel(t)(priority)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks.fields.status')} *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.form.selectStatus')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(TASK_STATUSES).map(status => (
                      <SelectItem key={status} value={status}>
                        {getTaskStatusLabel(t)(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t('actions.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('tasks.form.saving') : t('actions.save')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
