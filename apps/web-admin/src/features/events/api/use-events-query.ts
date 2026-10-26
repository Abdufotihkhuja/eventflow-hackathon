import { useQuery } from '@tanstack/react-query'

import { eventsService, type GetEventsRequest } from '@api/services'
import { normalizeBlockNoteTables } from '@shared/lib'

export const eventsKeys = {
  all: ['events'] as const,
  lists: () => [...eventsKeys.all, 'list'] as const,
  list: (params?: GetEventsRequest) => [...eventsKeys.lists(), params] as const,
  details: () => [...eventsKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventsKeys.details(), id] as const,
}

export function useEventsQuery(params?: GetEventsRequest) {
  return useQuery({
    queryKey: eventsKeys.list(params),
    queryFn: () => eventsService.getEvents(params),
    staleTime: 30_000, // 30 секунд
    refetchOnWindowFocus: true,
    // Нормализуем таблицы в описаниях всех событий
    select: data => {
      if (!data) return data

      return {
        ...data,
        data: data.data.map(event => ({
          ...event,
          description: Array.isArray(event.description)
            ? normalizeBlockNoteTables(event.description)
            : event.description,
        })),
      }
    },
  })
}
