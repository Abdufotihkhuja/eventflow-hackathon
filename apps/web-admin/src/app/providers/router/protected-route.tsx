import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'

import { clearAuthTokens, getAccessToken } from '@api/config'
import { sessionService } from '@api/services/sessionService'

type RouteProps = {
  element: React.ReactNode
}

export function PublicRoute({ element }: RouteProps) {
  const hasToken = !!getAccessToken()
  const sessionQuery = useQuery({
    queryKey: ['session', 'me'],
    queryFn: sessionService.getMe,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  })

  if (sessionQuery.isSuccess && sessionQuery.data.platformRole) {
    return <Navigate to="/admin" replace />
  }

  return element
}

export function SuperAdminRoute({ element }: RouteProps) {
  const hasToken = !!getAccessToken()
  const sessionQuery = useQuery({
    queryKey: ['session', 'me'],
    queryFn: sessionService.getMe,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  })

  if (!hasToken) {
    return <Navigate to="/admin/login" replace />
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Загружаем сессию...
      </div>
    )
  }

  if (sessionQuery.isError || !sessionQuery.data?.platformRole) {
    clearAuthTokens()
    return <Navigate to="/admin/login" replace />
  }

  return element
}
