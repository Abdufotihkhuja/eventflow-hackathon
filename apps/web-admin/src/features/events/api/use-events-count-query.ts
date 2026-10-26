import { useQueryClient } from '@tanstack/react-query'

import { eventsKeys } from './use-events-query'

/**
 * Хук для получения общего количества событий пользователя из кеша.
 * Используется для badge в навигации.
 *
 * Этот хук НЕ делает API запрос, а читает данные из кеша TanStack Query.
 * Если данные еще не загружены, возвращает undefined.
 */
export function useEventsCountQuery() {
  const queryClient = useQueryClient()

  // Ищем в кеше любой успешный запрос событий
  const cachedData = queryClient
    .getQueryCache()
    .findAll({ queryKey: eventsKeys.lists(), type: 'active' })
    .map(query => query.state.data)
    .find(data => data && typeof data === 'object' && 'total' in data)

  return {
    data: cachedData ? (cachedData as { total: number }).total : undefined,
  }
}
