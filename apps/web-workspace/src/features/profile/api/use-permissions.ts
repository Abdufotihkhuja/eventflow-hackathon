import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { MemberPermissionsResponse } from '@api/services'
import { authService } from '@api/services/authService'
import { getAccessToken } from '@api/config'

import { useCurrentUser } from './use-current-user'
import { useMemberPermissions } from './use-member-profile'

/**
 * Коды прав, закрытых маской доступа организации (тонкое управление
 * супер-админа). Читаются из session/me и применяются к владельцу и
 * сотрудникам. Сервер — источник истины; здесь только скрываем элементы.
 */
function useAccessDeniedCodes(): ReadonlySet<string> {
  const accessToken = getAccessToken()
  const query = useQuery({
    queryKey: ['session', 'access-denied'],
    queryFn: () => authService.getSessionMe(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!accessToken,
  })
  return useMemo(
    () => new Set(query.data?.accessDeniedPermissions ?? []),
    [query.data]
  )
}

/**
 * Resolved permission state for the current actor.
 *
 * - Organization (owner) actors implicitly hold every permission EXCEPT those closed by the
 *   organization's access mask (super-admin fine-grained control).
 * - Member actors expose a permission-code list (already minus the access mask); membership
 *   in that list grants the permission.
 * - While the underlying queries are loading, every check returns `false` so we don't flash
 *   privileged controls before the data arrives. Backend enforcement is still authoritative.
 */
export type UsePermissionsResult = {
  /** True until both the current-user and member-permission queries have settled. */
  isLoading: boolean
  /** True for organization-owner sessions, which bypass code-based checks. */
  isOrganizationActor: boolean
  /** Resolved permission codes (empty for organization actors — use `hasPermission` instead). */
  permissions: ReadonlySet<string>
  hasPermission: (code: string) => boolean
  hasAny: (...codes: string[]) => boolean
  hasAll: (...codes: string[]) => boolean
}

function resolveMemberPermissionCodes(
  profileCodes: string[],
  memberPermissions?: MemberPermissionsResponse
): string[] {
  const detailedCodes = (memberPermissions?.allPermissions ?? []).map(p => p.code)
  const legacyCodes = memberPermissions?.permissions ?? []

  return [...profileCodes, ...detailedCodes, ...legacyCodes]
}

/**
 * Permission helper backed by the existing session/profile queries.
 * Cheap to call — both underlying queries cache for several minutes.
 */
export function usePermissions(): UsePermissionsResult {
  const currentUserQuery = useCurrentUser()
  const currentUser = currentUserQuery.data
  const isOrganizationActor = currentUser?.type === 'organization'

  // Member endpoint is only meaningful for member actors. Skipping the query for
  // organization actors keeps unnecessary 4xx noise out of devtools and avoids
  // permission flicker when an org actor logs in.
  const memberPermissionsQuery = useMemberPermissions({
    enabled: currentUser?.type === 'member',
  })
  const memberPermissions = memberPermissionsQuery.data

  // Маска доступа организации (супер-админ): вычитается и у владельца, и у члена.
  const accessDenied = useAccessDeniedCodes()

  const permissions = useMemo<ReadonlySet<string>>(() => {
    if (isOrganizationActor) return new Set<string>()
    if (currentUser?.type === 'member') {
      const resolved = resolveMemberPermissionCodes(
        currentUser.data.permissions ?? [],
        memberPermissions
      )
      return new Set<string>(resolved.filter(code => !accessDenied.has(code)))
    }
    return new Set<string>()
  }, [isOrganizationActor, currentUser, memberPermissions, accessDenied])

  const isLoading =
    currentUserQuery.isLoading ||
    (currentUser?.type === 'member' && memberPermissionsQuery.isLoading)

  const hasPermission = (code: string) => {
    // Владелец имеет все права, КРОМЕ закрытых маской доступа организации.
    if (isOrganizationActor) return !accessDenied.has(code)
    return permissions.has(code)
  }

  const hasAny = (...codes: string[]) => codes.some(code => hasPermission(code))
  const hasAll = (...codes: string[]) => codes.every(code => hasPermission(code))

  return {
    isLoading,
    isOrganizationActor,
    permissions,
    hasPermission,
    hasAny,
    hasAll,
  }
}
