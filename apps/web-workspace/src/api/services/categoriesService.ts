/**
 * API сервис для тематик событий (публичный список активных категорий).
 * Управление категориями (CRUD) доступно только супер-админу в админке.
 */

import { request } from '@api/apiClient'

export type EventCategoryOption = {
  id: string
  slug: string
  name: string
  icon?: string | null
}

export const categoriesService = {
  /** Получить активные тематики (публично, с локализованными названиями) */
  getCategories: (locale?: string) =>
    request<EventCategoryOption[]>({
      method: 'GET',
      url: '/v1/categories',
      params: locale ? { locale } : undefined,
      skipAuth: true,
    }),
}
