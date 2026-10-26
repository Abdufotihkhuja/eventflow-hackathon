/**
 * Хуки для работы со списком задач
 */

import { useQuery } from '@tanstack/react-query'

import { tasksService } from '@api/services'
import type { GetTasksParams, GetActivitiesParams } from '@api/services'

// ================================
// Query Keys
// ================================

export const tasksKeys = {
  all: ['tasks'] as const,
  lists: () => [...tasksKeys.all, 'list'] as const,
  list: (boardId: string, params?: GetTasksParams) =>
    [...tasksKeys.lists(), boardId, params] as const,
  details: () => [...tasksKeys.all, 'detail'] as const,
  detail: (boardId: string, taskId: string) => [...tasksKeys.details(), boardId, taskId] as const,
  comments: (taskId: string) => [...tasksKeys.all, 'comments', taskId] as const,
  attachments: (taskId: string) => [...tasksKeys.all, 'attachments', taskId] as const,
  activities: (taskId: string) => [...tasksKeys.all, 'activities', taskId] as const,
}

export const tagsKeys = {
  all: ['tags'] as const,
  list: (boardId: string) => [...tagsKeys.all, boardId] as const,
}

// ================================
// Queries
// ================================

/**
 * Хук для получения задач доски с фильтрами
 */
export function useTasksQuery(
  boardId: string | undefined,
  params?: GetTasksParams,
  enabled = true
) {
  return useQuery({
    queryKey: tasksKeys.list(boardId!, params),
    queryFn: () => tasksService.getTasks(boardId!, params),
    enabled: !!boardId && enabled,
    staleTime: 30_000, // 30 секунд
    refetchOnWindowFocus: true,
  })
}

/**
 * Хук для получения задачи по ID
 */
export function useTaskQuery(
  boardId: string | undefined,
  taskId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: tasksKeys.detail(boardId!, taskId!),
    queryFn: () => tasksService.getTask(boardId!, taskId!),
    enabled: !!boardId && !!taskId && enabled,
    staleTime: 60_000, // 1 минута
  })
}

/**
 * Хук для получения тегов доски
 */
export function useTagsQuery(boardId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: tagsKeys.list(boardId!),
    queryFn: () => tasksService.getTags(boardId!),
    enabled: !!boardId && enabled,
    staleTime: 5 * 60_000, // 5 минут
  })
}

/**
 * Хук для получения комментариев задачи
 */
export function useCommentsQuery(taskId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: tasksKeys.comments(taskId!),
    queryFn: () => tasksService.getComments(taskId!),
    enabled: !!taskId && enabled,
    staleTime: 30_000, // 30 секунд
  })
}

/**
 * Хук для получения вложений задачи
 */
export function useAttachmentsQuery(taskId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: tasksKeys.attachments(taskId!),
    queryFn: () => tasksService.getAttachments(taskId!),
    enabled: !!taskId && enabled,
    staleTime: 60_000, // 1 минута
  })
}

/**
 * Хук для получения истории изменений задачи
 */
export function useTaskActivitiesQuery(
  taskId: string | undefined,
  params?: GetActivitiesParams,
  enabled = true
) {
  return useQuery({
    queryKey: [...tasksKeys.activities(taskId!), params],
    queryFn: () => tasksService.getTaskActivities(taskId!, params),
    enabled: !!taskId && enabled,
    staleTime: 30_000, // 30 секунд
  })
}
