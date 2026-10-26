/**
 * Типы для модуля управления задачами
 */

import type { TaskType, TaskPriority, TaskStatus, LabelColor, ActivityType } from './constants'

/** Метка задачи */
export interface Label {
  id: string
  name: string
  color: LabelColor
  boardId: string
}

/** Чек-лист (от Trello) */
export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  order: number
}

export interface Checklist {
  id: string
  title: string
  items: ChecklistItem[]
}

/** Комментарий */
export interface Comment {
  id: string
  taskId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  createdAt: string
  updatedAt?: string
}

/** Вложение */
export interface Attachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: string
}

/** История активности */
export interface Activity {
  id: string
  type: ActivityType
  userId: string
  userName: string
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

/** Оценка времени (от Jira) */
export interface TimeTracking {
  estimated?: number // в часах
  spent?: number // в часах
  remaining?: number // в часах
}

/** Связь между задачами (от Jira) */
export interface TaskLink {
  id: string
  type: 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates'
  targetTaskId: string
  targetTaskTitle: string
}

/** Основная сущность задачи */
export interface Task {
  id: string
  title: string
  description?: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  boardId: string
  columnId?: string
  sprintId?: string

  // Пользователи
  creatorId: string
  assigneeId?: string
  assigneeName?: string
  assigneeAvatar?: string

  // Метки
  labels: Label[]

  // Чек-листы (от Trello)
  checklists: Checklist[]

  // Комментарии
  commentsCount: number

  // Вложения
  attachmentsCount: number

  // Связи (от Jira)
  links: TaskLink[]

  // Время (от Jira)
  timeTracking?: TimeTracking

  // Даты
  dueDate?: string
  startDate?: string
  createdAt: string
  updatedAt: string

  // Позиция для drag & drop
  order: number
}

/** Колонка на доске (канбан) */
export interface BoardColumn {
  id: string
  title: string
  status: TaskStatus
  order: number
  limit?: number // WIP лимит (от Kanban)
  boardId: string
}

/** Доска задач */
export interface Board {
  id: string
  title: string
  description?: string
  color?: string

  // Настройки
  columns: BoardColumn[]
  defaultLabels: Label[]

  // Участники
  ownerId: string
  memberIds: string[]

  // Метаданные
  tasksCount: number
  createdAt: string
  updatedAt: string
}

/** Спринт (от Jira) */
export interface Sprint {
  id: string
  name: string
  goal?: string
  boardId: string

  // Даты
  startDate: string
  endDate: string

  // Статус
  status: 'planned' | 'active' | 'completed'

  // Метаданные
  tasksCount: number
  completedTasksCount: number
  createdAt: string
}

/** Фильтры для задач */
export interface TaskFilters {
  boardId?: string
  sprintId?: string
  status?: TaskStatus[]
  priority?: TaskPriority[]
  type?: TaskType[]
  assigneeId?: string
  labelIds?: string[]
  search?: string
  dueDateFrom?: string
  dueDateTo?: string
}
