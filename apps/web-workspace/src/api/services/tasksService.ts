/**
 * API сервис для управления задачами (Kanban)
 * @see https://eventflow.uz/api/docs#/board-tasks
 */

import { request } from '@api/apiClient'

import type { TaskTag } from './board.types'
import type {
  Task,
  TaskComment,
  TaskChecklist,
  ChecklistItem,
  TaskAttachment,
  CreateTaskRequest,
  UpdateTaskRequest,
  MoveTaskRequest,
  GetTasksParams,
  GetTasksResponse,
  TaskDetailResponse,
  AddAssigneesRequest,
  CreateTagRequest,
  UpdateTagRequest,
  GetTagsResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  GetCommentsResponse,
  PaginatedCommentsApiResponse,
  CreateChecklistRequest,
  UpdateChecklistRequest,
  CreateChecklistItemRequest,
  UpdateChecklistItemRequest,
  GetAttachmentsResponse,
  GetActivitiesParams,
  GetActivitiesResponse,
  PaginatedActivitiesApiResponse,
  TaskActivity,
} from './task.types'

const getTasksUrl = (boardId: string) => `/v1/boards/${boardId}/tasks`
const getTagsUrl = (boardId: string) => `/v1/boards/${boardId}/tags`

// ================================
// Tasks CRUD
// ================================

export const tasksService = {
  /** Получить задачи доски с фильтрами */
  getTasks: (boardId: string, params?: GetTasksParams) =>
    request<GetTasksResponse>({
      method: 'GET',
      url: getTasksUrl(boardId),
      params,
    }),

  /** Получить задачу по ID */
  getTask: (boardId: string, taskId: string) =>
    request<TaskDetailResponse>({
      method: 'GET',
      url: `${getTasksUrl(boardId)}/${taskId}`,
    }),

  /** Создать задачу */
  createTask: (boardId: string, data: CreateTaskRequest) =>
    request<Task, CreateTaskRequest>({
      method: 'POST',
      url: getTasksUrl(boardId),
      data,
    }),

  /** Обновить задачу */
  updateTask: (boardId: string, taskId: string, data: UpdateTaskRequest) =>
    request<Task, UpdateTaskRequest>({
      method: 'PATCH',
      url: `${getTasksUrl(boardId)}/${taskId}`,
      data,
    }),

  /** Удалить задачу */
  deleteTask: (boardId: string, taskId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getTasksUrl(boardId)}/${taskId}`,
    }),

  /** Переместить задачу */
  moveTask: (boardId: string, taskId: string, data: MoveTaskRequest) =>
    request<Task, MoveTaskRequest>({
      method: 'PATCH',
      url: `${getTasksUrl(boardId)}/${taskId}/move`,
      data,
    }),

  /** Назначить исполнителей */
  addAssignees: (boardId: string, taskId: string, data: AddAssigneesRequest) =>
    request<Task, AddAssigneesRequest>({
      method: 'POST',
      url: `${getTasksUrl(boardId)}/${taskId}/assignees`,
      data,
    }),

  /** Удалить исполнителя */
  removeAssignee: (boardId: string, taskId: string, memberId: string) =>
    request<Task>({
      method: 'DELETE',
      url: `${getTasksUrl(boardId)}/${taskId}/assignees/${memberId}`,
    }),

  // ================================
  // Tags
  // ================================

  /** Получить теги доски */
  getTags: (boardId: string) =>
    request<GetTagsResponse>({
      method: 'GET',
      url: getTagsUrl(boardId),
    }),

  /** Создать тег */
  createTag: (boardId: string, data: CreateTagRequest) =>
    request<TaskTag, CreateTagRequest>({
      method: 'POST',
      url: getTagsUrl(boardId),
      data,
    }),

  /** Обновить тег */
  updateTag: (boardId: string, tagId: string, data: UpdateTagRequest) =>
    request<TaskTag, UpdateTagRequest>({
      method: 'PATCH',
      url: `${getTagsUrl(boardId)}/${tagId}`,
      data,
    }),

  /** Удалить тег */
  deleteTag: (boardId: string, tagId: string) =>
    request<void>({
      method: 'DELETE',
      url: `${getTagsUrl(boardId)}/${tagId}`,
    }),

  // ================================
  // Comments (по taskId напрямую)
  // ================================

  /** Получить комментарии задачи (API возвращает { data, total, page, limit, totalPages }) */
  getComments: async (taskId: string): Promise<GetCommentsResponse> => {
    const res = await request<GetCommentsResponse | PaginatedCommentsApiResponse>({
      method: 'GET',
      url: `/v1/tasks/${taskId}/comments`,
    })
    if (Array.isArray(res)) return res
    if (res && typeof res === 'object' && 'data' in res) {
      const raw = (res as PaginatedCommentsApiResponse).data
      return raw.map(c => ({
        id: c.id,
        taskId: c.taskId,
        content: c.content,
        authorId: c.memberId ?? '',
        author: c.member
          ? {
              id: c.member.id,
              firstName: c.member.firstName,
              lastName: c.member.lastName,
              avatar: c.member.avatar,
            }
          : { id: '', firstName: 'Организатор', lastName: '(Админ)' },
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        isEdited: false,
      }))
    }
    return []
  },

  /** Добавить комментарий */
  createComment: (taskId: string, data: CreateCommentRequest) =>
    request<TaskComment, CreateCommentRequest>({
      method: 'POST',
      url: `/v1/tasks/${taskId}/comments`,
      data,
    }),

  /** Редактировать комментарий */
  updateComment: (taskId: string, commentId: string, data: UpdateCommentRequest) =>
    request<TaskComment, UpdateCommentRequest>({
      method: 'PATCH',
      url: `/v1/tasks/${taskId}/comments/${commentId}`,
      data,
    }),

  /** Удалить комментарий */
  deleteComment: (taskId: string, commentId: string) =>
    request<void>({
      method: 'DELETE',
      url: `/v1/tasks/${taskId}/comments/${commentId}`,
    }),

  // ================================
  // Checklists (по taskId напрямую)
  // ================================

  /** Создать чеклист */
  createChecklist: (taskId: string, data: CreateChecklistRequest) =>
    request<TaskChecklist, CreateChecklistRequest>({
      method: 'POST',
      url: `/v1/tasks/${taskId}/checklists`,
      data,
    }),

  /** Обновить чеклист */
  updateChecklist: (taskId: string, checklistId: string, data: UpdateChecklistRequest) =>
    request<TaskChecklist, UpdateChecklistRequest>({
      method: 'PATCH',
      url: `/v1/tasks/${taskId}/checklists/${checklistId}`,
      data,
    }),

  /** Удалить чеклист */
  deleteChecklist: (taskId: string, checklistId: string) =>
    request<void>({
      method: 'DELETE',
      url: `/v1/tasks/${taskId}/checklists/${checklistId}`,
    }),

  // ================================
  // Checklist Items (по checklistId напрямую)
  // ================================

  /** Добавить пункт в чеклист */
  addChecklistItem: (checklistId: string, data: CreateChecklistItemRequest) =>
    request<ChecklistItem, CreateChecklistItemRequest>({
      method: 'POST',
      url: `/v1/checklists/${checklistId}/items`,
      data,
    }),

  /** Обновить пункт чеклиста */
  updateChecklistItem: (checklistId: string, itemId: string, data: UpdateChecklistItemRequest) =>
    request<ChecklistItem, UpdateChecklistItemRequest>({
      method: 'PATCH',
      url: `/v1/checklists/${checklistId}/items/${itemId}`,
      data,
    }),

  /** Удалить пункт чеклиста */
  deleteChecklistItem: (checklistId: string, itemId: string) =>
    request<void>({
      method: 'DELETE',
      url: `/v1/checklists/${checklistId}/items/${itemId}`,
    }),

  // ================================
  // Attachments (по taskId напрямую)
  // ================================

  /** Получить вложения задачи */
  getAttachments: (taskId: string) =>
    request<GetAttachmentsResponse>({
      method: 'GET',
      url: `/v1/tasks/${taskId}/attachments`,
    }),

  /** Загрузить вложение */
  uploadAttachment: (taskId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return request<TaskAttachment, FormData>({
      method: 'POST',
      url: `/v1/tasks/${taskId}/attachments`,
      data: formData,
    })
  },

  /** Удалить вложение */
  deleteAttachment: (taskId: string, attachmentId: string) =>
    request<void>({
      method: 'DELETE',
      url: `/v1/tasks/${taskId}/attachments/${attachmentId}`,
    }),

  // ================================
  // Activities
  // ================================

  /** Получить историю изменений задачи (API возвращает { data, total, page, limit, totalPages }) */
  getTaskActivities: async (
    taskId: string,
    params?: GetActivitiesParams
  ): Promise<GetActivitiesResponse> => {
    const res = await request<GetActivitiesResponse | PaginatedActivitiesApiResponse>({
      method: 'GET',
      url: `/v1/tasks/${taskId}/activities`,
      params,
    })
    if (Array.isArray(res)) return res
    if (res && typeof res === 'object' && 'data' in res) {
      const raw = (res as PaginatedActivitiesApiResponse).data
      return raw.map(
        (a): TaskActivity => ({
          id: a.id,
          taskId: a.taskId,
          boardId: '',
          type: a.type as TaskActivity['type'],
          description: '',
          memberId: a.memberId ?? '',
          member: a.member,
          metadata: a.details,
          createdAt: a.createdAt,
        })
      )
    }
    return []
  },

  /** Получить историю изменений доски */
  getBoardActivities: (boardId: string, params?: GetActivitiesParams) =>
    request<GetActivitiesResponse>({
      method: 'GET',
      url: `/v1/boards/${boardId}/activities`,
      params,
    }),
} as const
