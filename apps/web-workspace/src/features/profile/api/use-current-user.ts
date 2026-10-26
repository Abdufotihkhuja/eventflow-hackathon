import { useQuery, useQueryClient } from '@tanstack/react-query'

import { authService } from '@api/services/authService'
import { memberService } from '@api/services/memberService'
import { getAccessToken, type UserType } from '@api/config'
import type { Organization } from '@api/services/auth.types'
import type { MemberProfile } from '@api/services/member.types'

export const SESSION_ACTOR_TYPE_QUERY_KEY = ['session', 'actor-type'] as const
export const CURRENT_USER_QUERY_KEY = ['user', 'me'] as const

/** Объединённый тип текущего пользователя */
export type CurrentUser =
  | { type: 'organization'; data: Organization }
  | { type: 'member'; data: MemberProfile }

async function fetchSessionActorType(): Promise<UserType> {
  const session = await authService.getSessionMe()
  return authService.resolveCurrentActorType(session)
}

export function useSessionActorType() {
  const accessToken = getAccessToken()

  return useQuery<UserType>({
    queryKey: SESSION_ACTOR_TYPE_QUERY_KEY,
    queryFn: fetchSessionActorType,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    enabled: !!accessToken,
  })
}

/**
 * Хук для получения данных текущего пользователя (организация или member)
 * Опирается на канонический session bootstrap и затем читает профильный surface
 */
export function useCurrentUser() {
  const accessToken = getAccessToken()
  const queryClient = useQueryClient()

  return useQuery<CurrentUser>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const resolvedActorType = await queryClient.ensureQueryData({
        queryKey: SESSION_ACTOR_TYPE_QUERY_KEY,
        queryFn: fetchSessionActorType,
      })

      if (resolvedActorType === 'member') {
        const data = await memberService.getMe()
        return { type: 'member', data }
      }

      if (resolvedActorType === 'organization') {
        const data = await authService.getOrganizationMe()
        return { type: 'organization', data }
      }

      throw new Error('Unknown session actor type')
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000, // 30 минут
    retry: 1,
    enabled: !!accessToken,
  })
}

// ================================
// Type Guards
// ================================

export function isOrganizationUser(
  user: CurrentUser | undefined
): user is { type: 'organization'; data: Organization } {
  return user?.type === 'organization'
}

export function isMemberUser(
  user: CurrentUser | undefined
): user is { type: 'member'; data: MemberProfile } {
  return user?.type === 'member'
}

// ================================
// Utility Hooks
// ================================

/**
 * Хук для получения actor type из сессии
 */
export function useActorType(): UserType | null {
  const { data: actorType } = useSessionActorType()
  return actorType ?? null
}

/**
 * Хук для проверки — member ли текущий пользователь
 */
export function useIsMember(): boolean {
  return useActorType() === 'member'
}

/**
 * Хук для проверки — организация ли текущий пользователь
 */
export function useIsOrganization(): boolean {
  return useActorType() === 'organization'
}
