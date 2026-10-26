import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { eventsService } from '@api/services'
import type {
  CreateEventCommentRequest,
  GetEventCommentsParams,
  UpdateEventCommentRequest,
} from '@api/services'

import { eventsKeys } from './use-events-query'

export const eventCommentsKeys = {
  all: (eventId: string) => [...eventsKeys.detail(eventId), 'comments'] as const,
  list: (eventId: string, params?: GetEventCommentsParams) =>
    [...eventCommentsKeys.all(eventId), 'list', params] as const,
}

/**
 * Хук для получения комментариев события (пагинированный ответ: data, total, page, limit).
 * В UI используйте result.data?.data ?? [] для списка и result.data?.total для счётчика.
 */
export function useEventCommentsQuery(
  eventId: string | undefined,
  enabled = true,
  params: GetEventCommentsParams = { page: 1, limit: 50 }
) {
  return useQuery({
    queryKey: eventCommentsKeys.list(eventId!, params),
    queryFn: () => eventsService.getComments(eventId!, params),
    enabled: !!eventId && enabled,
    staleTime: 30_000,
  })
}

/**
 * Хук для создания комментария к событию
 */
export function useCreateEventComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: CreateEventCommentRequest }) =>
      eventsService.createComment(eventId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventCommentsKeys.all(variables.eventId) })
    },
  })
}

/**
 * Хук для обновления комментария события
 */
export function useUpdateEventComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      commentId,
      data,
    }: {
      eventId: string
      commentId: string
      data: UpdateEventCommentRequest
    }) => eventsService.updateComment(eventId, commentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventCommentsKeys.all(variables.eventId) })
    },
  })
}

/**
 * Хук для удаления комментария события
 */
export function useDeleteEventComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, commentId }: { eventId: string; commentId: string }) =>
      eventsService.deleteComment(eventId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventCommentsKeys.all(variables.eventId) })
    },
  })
}
