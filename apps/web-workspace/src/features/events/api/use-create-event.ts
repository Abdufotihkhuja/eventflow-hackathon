import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventsService, type CreateEventRequest } from '@api/services'

import { eventsKeys } from './use-events-query'

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateEventRequest) => eventsService.createEvent(data),
    onSuccess: () => {
      // Инвалидируем все запросы событий (списки + count)
      queryClient.invalidateQueries({ queryKey: eventsKeys.all })
    },
  })
}
