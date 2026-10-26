import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'

import { eventsService } from '@api/services'

import { eventsKeys } from './use-events-query'

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (eventId: string) => eventsService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all })
      toast.success('Событие удалено')
    },
    onError: () => {
      toast.error('Ошибка удаления события')
    },
  })
}
