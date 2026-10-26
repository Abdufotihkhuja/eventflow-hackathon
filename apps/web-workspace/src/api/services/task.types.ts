// ================================
// Task Types (переиспользуем из board.types)
// ================================

import type { TaskType, TaskPriority, TaskAssignee, TaskTag } from './board.types'

export { TaskType, TaskPriority } from './board.types'

/** Полная сущность задачи */
export type Task = {
  id: string
  boardId: string
  columnId: string
  title: string
  description?: string | null
  type?: TaskType
  priority: TaskPriority
  position: number
  dueDate?: string | null
  startDate?: string | null
  completedAt?: string | null
  estimatedHours?: number | null
  coverColor?: string | null

  // Исполнители
  assigneeIds: string[]
  assignees?: TaskAssignee[]

  // Метки
  tagIds: string[]
  tags?: TaskTag[]

  // Статистика
  commentsCount: number
  attachmentsCount: number
  checklistProgress?: {
    total: number
    completed: number
  } | null

  // Метаданные
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Комментарий к задаче */
export type TaskComment = {
  id: string
  taskId: string
  content: string
  authorId: string
  author: {
    id: string
    firstName: string
    lastName: string
    avatar?: string | null
  }
  createdAt: string
  updatedAt: string
  isEdited: boolean
}

/** Чеклист задачи */
export type TaskChecklist = {
  id: string
  taskId: string
  title: string
  position: number
  items: ChecklistItem[]
  createdAt: string
  updatedAt: string
}

/** Пункт чеклиста */
export type ChecklistItem = {
  id: string
  checklistId: string
  title: string
  isCompleted: boolean
  position: number
  completedAt?: string | null
  completedBy?: string | null
  createdAt: string
  updatedAt: string
}

/** Вложение задачи */
export type TaskAttachment = {
  id: string
  taskId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedById: string | null
  createdAt: string
  uploadedBy: {
    id: string
    firstName: string
    lastName: string
  } | null
  // Альтернативные поля для совместимости
  filename?: string
  url?: string
  size?: number
}

/** Запись истории изменений */
export type TaskActivity = {
  id: string
  taskId?: string | null
  boardId: string
  type:
    | 'CREATED'
    | 'UPDATED'
    | 'COMMENTED'
    | 'MOVED'
    | 'ATTACHMENT_ADDED'
    | 'ATTACHMENT_REMOVED'
    | 'task_created'
    | 'task_updated'
    | 'task_moved'
    | 'task_assigned'
    | 'task_unassigned'
    | 'task_completed'
    | 'comment_added'
    | 'comment_updated'
    | 'comment_deleted'
    | 'attachment_added'
    | 'attachment_deleted'
    | 'checklist_created'
    | 'checklist_updated'
    | 'checklist_deleted'
    | 'checklist_item_added'
    | 'checklist_item_completed'
    | 'due_date_changed'
    | 'priority_changed'
    | 'tag_added'
    | 'tag_removed'
    | 'column_created'
    | 'column_updated'
    | 'column_deleted'
    | 'member_added'
    | 'member_removed'
    | 'board_updated'
  description: string
  memberId: string
  member?: {
    id: string
    firstName: string
    lastName: string
    avatar?: string | null
  } | null
  metadata?: Record<string, unknown>
  createdAt: string
}

// ================================
// Request/Response Types
// ================================

// Tasks
export type CreateTaskRequest = {
  columnId: string
  title: string
  description?: string
  type?: TaskType
  priority?: TaskPriority
  dueDate?: string
  startDate?: string
  estimatedHours?: number
  coverColor?: string
  tagIds?: string[]
  assigneeIds?: string[]
}

export type UpdateTaskRequest = Partial<Omit<CreateTaskRequest, 'columnId'>>

export type MoveTaskRequest = {
  columnId: string
  position?: number
}

export type GetTasksParams = {
  columnId?: string
  assigneeId?: string
  tagId?: string
  priority?: TaskPriority
  type?: TaskType
  search?: string
  dueFrom?: string
  dueTo?: string
  page?: number
  limit?: number
}

/**
 * Ответ GET /boards/{boardId}/tasks
 * apiClient автоматически разворачивает data
 */
export type GetTasksResponse = Task[]

export type TaskDetailResponse = Task & {
  comments: TaskComment[]
  checklists: TaskChecklist[]
  attachments: TaskAttachment[]
}

// Assignees
export type AddAssigneesRequest = {
  memberIds: string[]
}

// Tags
export type CreateTagRequest = {
  name: string
  color: string
}

export type UpdateTagRequest = Partial<CreateTagRequest>

/** apiClient автоматически разворачивает data */
export type GetTagsResponse = TaskTag[]

// Comments
export type CreateCommentRequest = {
  content: string
}

export type UpdateCommentRequest = {
  content: string
}

/** apiClient автоматически разворачивает data */
export type GetCommentsResponse = TaskComment[]

/** Пагинированный ответ API (member вместо author) */
export type PaginatedCommentsApiResponse = {
  data: Array<{
    id: string
    taskId: string
    memberId: string | null
    content: string
    createdAt: string
    updatedAt: string
    member?: { id: string; firstName: string; lastName: string; avatar?: string | null } | null
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}

// Checklists
export type CreateChecklistRequest = {
  title: string
}

export type UpdateChecklistRequest = {
  title?: string
}

export type CreateChecklistItemRequest = {
  title: string
}

export type UpdateChecklistItemRequest = {
  title?: string
  isCompleted?: boolean
}

// Attachments
export type UploadAttachmentResponse = TaskAttachment

/** apiClient автоматически разворачивает data */
export type GetAttachmentsResponse = TaskAttachment[]

// Activities
export type GetActivitiesParams = {
  page?: number
  limit?: number
}

/** apiClient автоматически разворачивает data */
export type GetActivitiesResponse = TaskActivity[]

/** Пагинированный ответ API activities (details вместо metadata) */
export type PaginatedActivitiesApiResponse = {
  data: Array<{
    id: string
    taskId: string
    memberId: string | null
    type: string
    details?: Record<string, unknown>
    createdAt: string
    member?: { id: string; firstName: string; lastName: string; avatar?: string | null } | null
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}
