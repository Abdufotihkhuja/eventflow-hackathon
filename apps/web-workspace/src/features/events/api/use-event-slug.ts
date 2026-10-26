/**
 * Slug для мероприятий: предложение по заголовку и проверка доступности.
 * Использовать с debounce (title/slug). При редактировании передавать excludeId.
 */

import { useQuery } from '@tanstack/react-query'

import { eventsService } from '@api/services'
import { SLUG_VALID_REGEX } from '@shared/lib'

import { eventsKeys } from './use-events-query'

export const EVENT_SUGGEST_SLUG_KEY = [...eventsKeys.all, 'suggest-slug'] as const
export const EVENT_CHECK_SLUG_KEY = [...eventsKeys.all, 'check-slug'] as const

/**
 * Предложить slug по заголовку (debounced title). При редактировании — excludeId = id мероприятия.
 */
export function useSuggestEventSlug(debouncedTitle: string | undefined, excludeId?: string) {
  const titleTrim = (debouncedTitle ?? '').trim()
  return useQuery({
    queryKey: [...EVENT_SUGGEST_SLUG_KEY, titleTrim, excludeId],
    queryFn: () =>
      eventsService.suggestSlug({
        title: titleTrim.slice(0, 500),
        excludeId,
      }),
    enabled: titleTrim.length > 0,
    staleTime: 60_000,
  })
}

/**
 * Проверить доступность slug (debounced slug). При редактировании — excludeId = id мероприятия.
 */
export function useCheckEventSlug(debouncedSlug: string | undefined, excludeId?: string) {
  const slugTrim = (debouncedSlug ?? '').trim().toLowerCase()
  const isValidFormat = SLUG_VALID_REGEX.test(slugTrim)

  return useQuery({
    queryKey: [...EVENT_CHECK_SLUG_KEY, slugTrim, excludeId],
    queryFn: () =>
      eventsService.checkSlug({
        slug: slugTrim,
        excludeId,
      }),
    enabled: slugTrim.length > 0 && isValidFormat,
    staleTime: 60_000,
  })
}
