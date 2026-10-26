/**
 * Zod схема для формы задачи
 */

import { z } from 'zod'
import { TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES } from '@entities/task'

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'Название обязательно')
    .max(200, 'Название не должно превышать 200 символов'),

  description: z.string().max(5000, 'Описание не должно превышать 5000 символов').optional(),

  type: z.enum([TASK_TYPES.TASK, TASK_TYPES.BUG, TASK_TYPES.STORY, TASK_TYPES.EPIC]),

  priority: z.enum([
    TASK_PRIORITIES.LOWEST,
    TASK_PRIORITIES.LOW,
    TASK_PRIORITIES.MEDIUM,
    TASK_PRIORITIES.HIGH,
    TASK_PRIORITIES.HIGHEST,
  ]),

  status: z.enum([
    TASK_STATUSES.BACKLOG,
    TASK_STATUSES.TODO,
    TASK_STATUSES.IN_PROGRESS,
    TASK_STATUSES.IN_REVIEW,
    TASK_STATUSES.DONE,
  ]),

  boardId: z.string().min(1, 'Доска обязательна'),

  sprintId: z.string().optional(),

  assigneeId: z.string().optional(),

  labelIds: z.array(z.string()).optional(),

  dueDate: z.string().optional(),

  startDate: z.string().optional(),

  estimatedHours: z.number().min(0, 'Оценка времени не может быть отрицательной').optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>
