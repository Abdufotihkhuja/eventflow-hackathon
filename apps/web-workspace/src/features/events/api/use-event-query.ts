import { useQuery } from '@tanstack/react-query'

import { eventsService } from '@api/services'
import { normalizeBlockNoteTables } from '@shared/lib'

import { eventsKeys } from './use-events-query'

export function useEventQuery(eventId: string, enabled = true) {
  // Выполняем запрос только если eventId валидный (не пустой)
  const isEnabled = enabled && !!eventId && eventId.trim() !== ''

  return useQuery({
    queryKey: eventsKeys.detail(eventId),
    queryFn: () => eventsService.getEvent(eventId),
    enabled: isEnabled,
    staleTime: 60_000, // 1 минута
    // Нормализуем таблицы в описании после получения данных
    select: data => {
      if (data && Array.isArray(data.description)) {
        return {
          ...data,
          description: normalizeBlockNoteTables(data.description),
        }
      }
      return data
    },
  })
}
