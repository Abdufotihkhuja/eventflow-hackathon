import { useQuery } from '@tanstack/react-query'
import { useLocale } from '@eventflow/i18n/react'

import { categoriesService } from '@api/services'

export const eventCategoriesKeys = {
  all: ['event-categories'] as const,
  list: (locale: string) => ['event-categories', locale] as const,
}

/** Активные тематики событий для выбора в форме создания/редактирования. */
export function useEventCategories() {
  const locale = useLocale()
  return useQuery({
    queryKey: eventCategoriesKeys.list(locale),
    queryFn: () => categoriesService.getCategories(locale),
    staleTime: 5 * 60 * 1000,
  })
}
