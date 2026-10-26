/**
 * Публичное получение мероприятия по slug (без авторизации, только PUBLISHED).
 * Для страницы вида /events/:slug.
 */

import { useQuery } from '@tanstack/react-query'

import { publicEventsService } from '@api/services'
import { normalizeBlockNoteTables } from '@shared/lib'

import { eventsKeys } from './use-events-query'

export const publicEventBySlugKeys = {
  all: [...eventsKeys.all, 'public-by-slug'] as const,
  slug: (slug: string) => [...publicEventBySlugKeys.all, slug] as const,
}

export function usePublicEventBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: publicEventBySlugKeys.slug(slug ?? ''),
    queryFn: () => publicEventsService.getEventBySlug(slug!),
    enabled: !!slug && slug.trim().length > 0,
    staleTime: 60_000,
    select: data => {
      if (!data) return data
      if (Array.isArray(data.description)) {
        return { ...data, description: normalizeBlockNoteTables(data.description) }
      }
      return data
    },
  })
}
