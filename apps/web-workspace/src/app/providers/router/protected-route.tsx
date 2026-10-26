import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { isWorkspaceSelectionPending } from '@api/index'
import { useAuth } from '@entities/auth'
import { usePermissions } from '@features/profile/api'
import { PermissionDenied } from '@shared/ui'

type ProtectedRouteProps = {
  element: React.ReactNode
}

export function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  // Deep-link preservation (P-7 and friends): remember the requested URL so the
  // login page can land back on it (e.g. /settings/billing?tab=plans&intent=…
  // from a /pricing signup redirect) instead of always /dashboard.
  const from = `${location.pathname}${location.search}`

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from }} />
  }

  // A USER session that logged in but has not yet entered a workspace holds a
  // bare USER token the workspace app cannot render — keep it on /login until it
  // picks an organization (see isWorkspaceSelectionPending).
  if (isWorkspaceSelectionPending()) {
    return <Navigate to="/login" replace state={{ from }} />
  }

  return element
}

type PublicRouteProps = {
  element: React.ReactNode
}

export function PublicRoute({ element }: PublicRouteProps) {
  const { isAuthenticated } = useAuth()

  // Authenticated users go straight to the workspace — UNLESS they are a USER
  // session still choosing an organization, in which case the login page hosts
  // the org switcher / empty state.
  if (isAuthenticated && !isWorkspaceSelectionPending()) {
    return <Navigate to="/dashboard" replace />
  }

  return element
}

type PermissionRouteProps = {
  anyOf?: string[]
  allOf?: string[]
  element?: React.ReactNode
}

export function PermissionRoute({ anyOf, allOf, element }: PermissionRouteProps) {
  const t = useT()
  const { isAuthenticated } = useAuth()
  const { isLoading, hasAny, hasAll } = usePermissions()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center bg-background text-foreground">
        {t('workspace.access.checking')}
      </div>
    )
  }

  const hasRequiredAny = !anyOf || anyOf.length === 0 || hasAny(...anyOf)
  const hasRequiredAll = !allOf || allOf.length === 0 || hasAll(...allOf)

  if (!hasRequiredAny || !hasRequiredAll) {
    return (
      <PermissionDenied
        title={t('workspace.access.deniedTitle')}
        description={t('workspace.access.deniedDescription')}
      />
    )
  }

  return element ? <>{element}</> : <Outlet />
}
