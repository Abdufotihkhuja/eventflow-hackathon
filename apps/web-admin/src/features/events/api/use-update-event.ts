import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventsService, type UpdateEventRequest } from '@api/services'

import { eventsKeys } from './use-events-query'

export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateEventRequest) => eventsService.updateEvent(eventId, data),
    onSuccess: () => {
      // Инвалидируем детали события и список
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) })
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() })
    },
  })
}
