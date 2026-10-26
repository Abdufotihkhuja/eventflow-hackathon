/**
 * Маска доступа организации (тонкое управление супер-админа). Эндпоинты
 * /api/v1/super-admin/organizations/:orgId/access-mask ещё не в
 * сгенерированном adminSdk — зовём через общий apiClient напрямую (тот же
 * приём, что и другие не-SDK вызовы web-admin). Формы совпадают с DTO бэкенда.
 */

import { apiClient } from '@api/apiClient'

/** GET /super-admin/organizations/:orgId/access-mask */
export interface AccessMask {
  /** Полный каталог кодов прав (module:action). */
  allCodes: string[]
  /** Коды, закрытые для организации (deny-list). */
  deniedCodes: string[]
}

export interface SetAccessMaskRequest {
  deniedCodes: string[]
  /** Причина необязательна; попадает в аудит. */
  reason?: string
}

export const accessMaskService = {
  getMask: (orgId: string) =>
    apiClient.get<AccessMask>(`/api/v1/super-admin/organizations/${orgId}/access-mask`),

  setMask: (orgId: string, data: SetAccessMaskRequest) =>
    apiClient.put<{ deniedCodes: string[] }, SetAccessMaskRequest>(
      `/api/v1/super-admin/organizations/${orgId}/access-mask`,
      data
    ),
} as const
