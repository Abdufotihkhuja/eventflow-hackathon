import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { getAccessToken, clearAuthTokens, type UserType } from '@api/config'
import {
  useCurrentUser,
  useActorType,
  isOrganizationUser,
  isMemberUser,
  type CurrentUser,
} from '@features/profile'
import { clearAppQueryCache } from '@shared/lib/query-client'

/**
 * Хук аутентификации с данными пользователя
 * Поддерживает как организации, так и member
 */
export function useAuth() {
  const navigate = useNavigate()
  const accessToken = getAccessToken()
  const isAuthenticated = !!accessToken
  const actorType = useActorType()

  const { data: currentUser, isLoading, error, refetch } = useCurrentUser()

  const logout = useCallback(() => {
    clearAuthTokens()
    clearAppQueryCache()
    navigate('/login', { replace: true })
  }, [navigate])

  return {
    isAuthenticated,
    accessToken,
    actorType,
    /** Полные данные текущего пользователя с типом */
    currentUser,
    /** @deprecated Используй currentUser */
    user: currentUser,
    isLoading,
    error,
    logout,
    refetch,
    // Type guards
    isOrganization: isOrganizationUser(currentUser),
    isMember: isMemberUser(currentUser),
  }
}

// Re-export type guards для удобства
export { isOrganizationUser, isMemberUser }
export type { CurrentUser, UserType }
