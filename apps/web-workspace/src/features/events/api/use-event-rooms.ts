import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  eventRoomsService,
  type CreateEventRoomRequest,
  type UpdateEventRoomRequest,
} from '@api/services'

import { agendaKeys } from './use-agenda'

export const eventRoomsKeys = {
  all: ['event-rooms'] as const,
  list: (eventId: string) => [...eventRoomsKeys.all, 'event', eventId] as const,
}

export function useEventRoomsQuery(eventId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: eventRoomsKeys.list(eventId),
    queryFn: () => eventRoomsService.list(eventId),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 60_000,
  })
}

export function useCreateEventRoom(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateEventRoomRequest) => eventRoomsService.create(eventId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventRoomsKeys.list(eventId) })
      // Agenda карточки показывают локализованное имя зала — тоже инвалидируем.
      queryClient.invalidateQueries({ queryKey: agendaKeys.list(eventId) })
    },
  })
}

export function useUpdateEventRoom(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, body }: { roomId: string; body: UpdateEventRoomRequest }) =>
      eventRoomsService.update(eventId, roomId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventRoomsKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: agendaKeys.list(eventId) })
    },
  })
}

export function useDeleteEventRoom(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) => eventRoomsService.remove(eventId, roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventRoomsKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: agendaKeys.list(eventId) })
    },
  })
}
