/**
 * Мутации для работы с задачами
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { tasksService } from '@api/services'
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  MoveTaskRequest,
  AddAssigneesRequest,
  CreateTagRequest,
  UpdateTagRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateChecklistRequest,
  UpdateChecklistRequest,
  CreateChecklistItemRequest,
  UpdateChecklistItemRequest,
} from '@api/services'

import { boardsKeys } from '@features/boards/api'

import { tasksKeys, tagsKeys } from './use-tasks-query'

// ================================
// Task Mutations
// ================================

/**
 * Хук для создания задачи
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: CreateTaskRequest }) =>
      tasksService.createTask(boardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() })
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для обновления задачи
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      taskId,
      data,
    }: {
      boardId: string
      taskId: string
      data: UpdateTaskRequest
    }) => tasksService.updateTask(boardId, taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для удаления задачи
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, taskId }: { boardId: string; taskId: string }) =>
      tasksService.deleteTask(boardId, taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.lists() })
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для перемещения задачи
 */
export function useMoveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      taskId,
      data,
    }: {
      boardId: string
      taskId: string
      data: MoveTaskRequest
    }) => tasksService.moveTask(boardId, taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для назначения исполнителей
 */
export function useAddAssignees() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      taskId,
      data,
    }: {
      boardId: string
      taskId: string
      data: AddAssigneesRequest
    }) => tasksService.addAssignees(boardId, taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

/**
 * Хук для удаления исполнителя
 */
export function useRemoveAssignee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      taskId,
      memberId,
    }: {
      boardId: string
      taskId: string
      memberId: string
    }) => tasksService.removeAssignee(boardId, taskId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
      queryClient.invalidateQueries({ queryKey: boardsKeys.detail(variables.boardId) })
    },
  })
}

// ================================
// Tag Mutations
// ================================

/**
 * Хук для создания тега
 */
export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: CreateTagRequest }) =>
      tasksService.createTag(boardId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.list(variables.boardId) })
    },
  })
}

/**
 * Хук для обновления тега
 */
export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      tagId,
      data,
    }: {
      boardId: string
      tagId: string
      data: UpdateTagRequest
    }) => tasksService.updateTag(boardId, tagId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.list(variables.boardId) })
    },
  })
}

/**
 * Хук для удаления тега
 */
export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ boardId, tagId }: { boardId: string; tagId: string }) =>
      tasksService.deleteTag(boardId, tagId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagsKeys.list(variables.boardId) })
    },
  })
}

// ================================
// Comment Mutations
// ================================

/**
 * Хук для создания комментария
 */
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateCommentRequest }) =>
      tasksService.createComment(taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.comments(variables.taskId) })
    },
  })
}

/**
 * Хук для обновления комментария
 */
export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      data,
    }: {
      taskId: string
      commentId: string
      data: UpdateCommentRequest
    }) => tasksService.updateComment(taskId, commentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.comments(variables.taskId) })
    },
  })
}

/**
 * Хук для удаления комментария
 */
export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      tasksService.deleteComment(taskId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.comments(variables.taskId) })
    },
  })
}

// ================================
// Checklist Mutations
// ================================

/**
 * Хук для создания чеклиста
 */
export function useCreateChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string
      boardId: string
      data: CreateChecklistRequest
    }) => tasksService.createChecklist(taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
    },
  })
}

/**
 * Хук для обновления чеклиста
 */
export function useUpdateChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      checklistId,
      data,
    }: {
      taskId: string
      boardId: string
      checklistId: string
      data: UpdateChecklistRequest
    }) => tasksService.updateChecklist(taskId, checklistId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
    },
  })
}

/**
 * Хук для удаления чеклиста
 */
export function useDeleteChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      checklistId,
    }: {
      taskId: string
      boardId: string
      checklistId: string
    }) => tasksService.deleteChecklist(taskId, checklistId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
    },
  })
}

/**
 * Хук для добавления пункта в чеклист
 */
export function useAddChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      checklistId,
      data,
    }: {
      checklistId: string
      boardId: string
      taskId: string
      data: CreateChecklistItemRequest
    }) => tasksService.addChecklistItem(checklistId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
    },
  })
}

/**
 * Хук для обновления пункта чеклиста
 */
export function useUpdateChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      checklistId,
      itemId,
      data,
    }: {
      checklistId: string
      itemId: string
      boardId: string
      taskId: string
      data: UpdateChecklistItemRequest
    }) => tasksService.updateChecklistItem(checklistId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
    },
  })
}

/**
 * Хук для удаления пункта чеклиста
 */
export function useDeleteChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      checklistId,
      itemId,
    }: {
      checklistId: string
      itemId: string
      boardId: string
      taskId: string
    }) => tasksService.deleteChecklistItem(checklistId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tasksKeys.detail(variables.boardId, variables.taskId),
      })
    },
  })
}

// ================================
// Attachment Mutations
// ================================

/**
 * Хук для загрузки вложения
 */
export function useAddAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      tasksService.uploadAttachment(taskId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.attachments(variables.taskId) })
    },
  })
}

/**
 * Хук для удаления вложения
 */
export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      tasksService.deleteAttachment(taskId, attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.attachments(variables.taskId) })
    },
  })
}
