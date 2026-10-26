/**
 * Хук для формы задачи с react-hook-form
 */

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, type TaskFormData } from './schemas/task-schema'
import { TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES } from '@entities/task'

interface UseTaskFormOptions {
  defaultValues?: Partial<TaskFormData>
  onSubmit: (data: TaskFormData) => void | Promise<void>
}

export const useTaskForm = ({ defaultValues, onSubmit }: UseTaskFormOptions) => {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      type: TASK_TYPES.TASK,
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.TODO,
      labelIds: [],
      ...defaultValues,
    },
  })

  const handleSubmit = form.handleSubmit(async data => {
    await onSubmit(data)
  })

  return {
    form,
    handleSubmit,
  }
}
