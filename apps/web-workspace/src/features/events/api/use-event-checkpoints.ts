import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  eventCheckpointsService,
  type CreateEventCheckpointRequest,
  type UpdateEventCheckpointRequest,
} from '@api/services'

import { attendanceKeys } from './use-attendance-query'
import { attendanceStatsKeys } from './use-attendance-stats-query'

export const eventCheckpointsKeys = {
  all: ['event-checkpoints'] as const,
  list: (eventId: string) => [...eventCheckpointsKeys.all, 'event', eventId] as const,
  matrix: (eventId: string) =>
    [...eventCheckpointsKeys.all, 'event', eventId, 'matrix'] as const,
}

export function useEventCheckpointsQuery(
  eventId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: eventCheckpointsKeys.list(eventId),
    queryFn: () => eventCheckpointsService.list(eventId),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 30_000,
  })
}

export function useCheckpointAttendanceQuery(
  eventId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: eventCheckpointsKeys.matrix(eventId),
    queryFn: () => eventCheckpointsService.matrix(eventId),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 10_000,
  })
}

/**
 * Правка чекпоинтов двигает и матрицу, и дневные счётчики (удаление уносит
 * отметки каскадом), поэтому инвалидируем всю посещаемость события разом.
 */
function useInvalidateCheckpoints(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: eventCheckpointsKeys.list(eventId) })
    queryClient.invalidateQueries({ queryKey: eventCheckpointsKeys.matrix(eventId) })
    queryClient.invalidateQueries({ queryKey: attendanceKeys.all(eventId) })
    queryClient.invalidateQueries({ queryKey: attendanceStatsKeys.detail(eventId) })
  }
}

export function useCreateEventCheckpoint(eventId: string) {
  const invalidate = useInvalidateCheckpoints(eventId)
  return useMutation({
    mutationFn: (body: CreateEventCheckpointRequest) =>
      eventCheckpointsService.create(eventId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateEventCheckpoint(eventId: string) {
  const invalidate = useInvalidateCheckpoints(eventId)
  return useMutation({
    mutationFn: ({
      checkpointId,
      body,
    }: {
      checkpointId: string
      body: UpdateEventCheckpointRequest
    }) => eventCheckpointsService.update(eventId, checkpointId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteEventCheckpoint(eventId: string) {
  const invalidate = useInvalidateCheckpoints(eventId)
  return useMutation({
    mutationFn: (checkpointId: string) =>
      eventCheckpointsService.remove(eventId, checkpointId),
    onSuccess: invalidate,
  })
}
