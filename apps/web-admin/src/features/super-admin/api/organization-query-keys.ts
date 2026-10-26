/**
 * Ключи кэша организаций супер-админки и их общая инвалидация.
 * Вынесено из хуков, чтобы покрыть тестом без React и алиасов сборки.
 */

import type { QueryClient } from '@tanstack/react-query'

export const ADMIN_ORGANIZATIONS_QUERY_KEY = ['super-admin', 'organizations'] as const
export const ADMIN_ORGANIZATION_QUERY_KEY = ['super-admin', 'organization'] as const
export const PENDING_ORGANIZATIONS_QUERY_KEY = ['super-admin', 'organizations', 'pending'] as const

/**
 * Вызывается в onSuccess мутаций одной организации (approve, reject, update,
 * archive, restore). Не для hard delete: карточки больше нет, её перезапрос
 * получит 404. Списки и карточка лежат под разными
 * префиксами (`organizations` против `organization`), поэтому сброс одного
 * списка карточку не обновляет: страница деталей продолжала показывать
 * старый статус и кнопки, а повторный клик падал с «уже отклонена».
 */
export function invalidateOrganizationQueries(queryClient: QueryClient, orgId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ADMIN_ORGANIZATIONS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: [...ADMIN_ORGANIZATION_QUERY_KEY, orgId] }),
  ])
}
