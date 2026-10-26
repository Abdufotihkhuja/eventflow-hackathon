/**
 * Константы для модуля управления задачами
 * Включает типы, статусы, приоритеты задач
 */
import { createLabelGetter, type Translator } from '@eventflow/i18n'

/** Типы задач (от Jira) */
export const TASK_TYPES = {
  TASK: 'task',
  BUG: 'bug',
  STORY: 'story',
  EPIC: 'epic',
} as const

export type TaskType = (typeof TASK_TYPES)[keyof typeof TASK_TYPES]

export const TASK_TYPE_LABEL_KEYS = {
  [TASK_TYPES.TASK]: 'tasks.type.task',
  [TASK_TYPES.BUG]: 'tasks.type.bug',
  [TASK_TYPES.STORY]: 'tasks.type.story',
  [TASK_TYPES.EPIC]: 'tasks.type.epic',
} as const satisfies Record<TaskType, string>

/** Приоритеты задач (от Jira) */
export const TASK_PRIORITIES = {
  LOWEST: 'lowest',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  HIGHEST: 'highest',
} as const

export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES]

export const TASK_PRIORITY_LABEL_KEYS = {
  [TASK_PRIORITIES.LOWEST]: 'tasks.priority.lowest',
  [TASK_PRIORITIES.LOW]: 'tasks.priority.low',
  [TASK_PRIORITIES.MEDIUM]: 'tasks.priority.medium',
  [TASK_PRIORITIES.HIGH]: 'tasks.priority.high',
  [TASK_PRIORITIES.HIGHEST]: 'tasks.priority.highest',
} as const satisfies Record<TaskPriority, string>

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TASK_PRIORITIES.LOWEST]: 'text-gray-500',
  [TASK_PRIORITIES.LOW]: 'text-blue-500',
  [TASK_PRIORITIES.MEDIUM]: 'text-yellow-500',
  [TASK_PRIORITIES.HIGH]: 'text-orange-500',
  [TASK_PRIORITIES.HIGHEST]: 'text-red-500',
}

/** Статусы задач (универсальные для канбан) */
export const TASK_STATUSES = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
} as const

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES]

export const TASK_STATUS_LABEL_KEYS = {
  [TASK_STATUSES.BACKLOG]: 'tasks.status.backlog',
  [TASK_STATUSES.TODO]: 'tasks.status.todo',
  [TASK_STATUSES.IN_PROGRESS]: 'tasks.status.inProgress',
  [TASK_STATUSES.IN_REVIEW]: 'tasks.status.inReview',
  [TASK_STATUSES.DONE]: 'tasks.status.done',
} as const satisfies Record<TaskStatus, string>

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TASK_STATUSES.BACKLOG]: 'bg-gray-100 dark:bg-gray-800',
  [TASK_STATUSES.TODO]: 'bg-blue-50 dark:bg-blue-950',
  [TASK_STATUSES.IN_PROGRESS]: 'bg-yellow-50 dark:bg-yellow-950',
  [TASK_STATUSES.IN_REVIEW]: 'bg-purple-50 dark:bg-purple-950',
  [TASK_STATUSES.DONE]: 'bg-green-50 dark:bg-green-950',
}

/** Цвета меток (от Trello) */
export const LABEL_COLORS = [
  '#10b981', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
] as const

export type LabelColor = (typeof LABEL_COLORS)[number]

/** Типы активности в задаче */
export const ACTIVITY_TYPES = {
  CREATED: 'created',
  UPDATED: 'updated',
  COMMENTED: 'commented',
  STATUS_CHANGED: 'status_changed',
  ASSIGNED: 'assigned',
  PRIORITY_CHANGED: 'priority_changed',
} as const

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES]

export const getTaskTypeLabel = (t: Translator) => createLabelGetter(TASK_TYPE_LABEL_KEYS, t)
export const getTaskPriorityLabel = (t: Translator) =>
  createLabelGetter(TASK_PRIORITY_LABEL_KEYS, t)
export const getTaskStatusLabel = (t: Translator) => createLabelGetter(TASK_STATUS_LABEL_KEYS, t)
