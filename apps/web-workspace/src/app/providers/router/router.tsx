import { Suspense, lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { PUBLIC_SITE_URL } from '@api/config'
import { DashboardPageSkeleton } from '@pages/dashboard'
import { ProtectedLayout } from '@widgets/protected-layout'
import { PermissionRoute, ProtectedRoute, PublicRoute } from './protected-route'

const CHUNK_RELOAD_STORAGE_KEY = 'eventflow.chunk-reload-attempt'

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError')
  )
}

function reloadOnceForFreshAssets(): void {
  if (typeof window === 'undefined') return

  const attemptKey = `${window.location.pathname}${window.location.search}`
  const previousAttempt = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)
  const now = Date.now()

  if (previousAttempt) {
    try {
      const parsed = JSON.parse(previousAttempt) as { key?: string; at?: number }
      const isRecentAttempt =
        parsed.key === attemptKey && typeof parsed.at === 'number' && now - parsed.at < 30_000

      if (isRecentAttempt) return
    } catch {
      if (previousAttempt === attemptKey) return
    }
  }

  window.sessionStorage.setItem(
    CHUNK_RELOAD_STORAGE_KEY,
    JSON.stringify({ key: attemptKey, at: now })
  )
  window.location.reload()
}

function lazyWithChunkReload<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(() =>
    importer().catch(error => {
      if (isChunkLoadError(error)) {
        reloadOnceForFreshAssets()
      }

      throw error
    })
  )
}

const LoginPage = lazyWithChunkReload(() => import('@pages/auth/login'))
const DashboardPage = lazyWithChunkReload(() => import('@pages/dashboard'))
const MyEventsPage = lazyWithChunkReload(() => import('@pages/my-events'))
const CreateEventPage = lazyWithChunkReload(() => import('@pages/my-events/create'))
const EditEventPage = lazyWithChunkReload(() => import('@pages/my-events/edit'))
const EventDetailsPage = lazyWithChunkReload(() => import('@pages/my-events/details'))
const ProfilePage = lazyWithChunkReload(() => import('@pages/profile'))
const UsersPage = lazyWithChunkReload(() => import('@pages/users'))
const SettingsPage = lazyWithChunkReload(() => import('@pages/settings'))
const BillingPage = lazyWithChunkReload(() => import('@pages/billing'))
const SecurityPage = lazyWithChunkReload(() => import('@pages/security'))
const FollowersPage = lazyWithChunkReload(() => import('@pages/followers'))
const ContactsPage = lazyWithChunkReload(() => import('@pages/contacts'))
const MyPlacesPage = lazyWithChunkReload(() => import('@pages/my-places'))
const PlaceEditorPage = lazyWithChunkReload(() => import('@pages/my-places/editor'))
const NotFoundPage = lazyWithChunkReload(() => import('@pages/error/not-found'))
const ErrorPage = lazyWithChunkReload(() => import('@pages/error/fallback'))
const AcceptInvitationPage = lazyWithChunkReload(() => import('@pages/speaker-invitation/accept'))
const RejectInvitationPage = lazyWithChunkReload(() => import('@pages/speaker-invitation/reject'))
const AcceptInvitePage = lazyWithChunkReload(() =>
  import('@pages/invite-activate').then(m => ({ default: m.AcceptInvitePage }))
)
const ActivateRedirect = lazyWithChunkReload(() =>
  import('@pages/invite-activate').then(m => ({ default: m.ActivateRedirect }))
)
const BlogListPage = lazyWithChunkReload(() => import('@pages/blog/list'))
const BlogPostPage = lazyWithChunkReload(() => import('@pages/blog/details'))
const PlacesCatalogPage = lazyWithChunkReload(() => import('@pages/places/catalog'))
const PlacePublicDetailsPage = lazyWithChunkReload(() => import('@pages/places/details'))
const MyBlogPage = lazyWithChunkReload(() => import('@pages/my-blog/list'))
const BlogEditorPage = lazyWithChunkReload(() => import('@pages/my-blog/editor'))
const MyBlogPostPage = lazyWithChunkReload(() => import('@pages/my-blog/details'))
const SavedBlogPage = lazyWithChunkReload(() => import('@pages/saved-blog'))
const BoardsListPage = lazyWithChunkReload(() => import('@pages/tasks/boards'))
const BoardDetailPage = lazyWithChunkReload(() => import('@pages/tasks/board-detail'))

import CheckInPage from '@pages/check-in'

const ADMIN_APP_URL = import.meta.env.VITE_ADMIN_APP_URL ?? 'http://admin.localhost'

const ROUTE_PERMISSIONS = {
  dashboard: ['dashboard:view'],
  eventsRead: ['events:read', 'events:update'],
  eventsCreate: ['events:create'],
  eventsUpdate: ['events:update'],
  attendanceCheckin: ['attendance:checkin'],
  users: ['members:read', 'members:create'],
  billingRead: ['billing:view'],
  followersRead: ['followers:read'],
  contactsRead: ['contacts:read'],
  placesRead: ['places:read'],
  placesCreate: ['places:create'],
  placesUpdate: ['places:update'],
  blogRead: ['blog:read', 'blog:create', 'blog:update', 'blog:submit', 'blog:publish'],
  blogCreate: ['blog:create', 'blog:submit'],
  blogUpdate: ['blog:update', 'blog:publish'],
  boardsRead: ['boards:read'],
} as const

function withSuspense(node: ReactNode, fallback?: ReactNode) {
  return <Suspense fallback={fallback ?? <PageLoader />}>{node}</Suspense>
}

function PageLoader() {
  const t = useT()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      {t('workspace.layout.loading.page')}
    </div>
  )
}

function AdminAppRedirect() {
  if (typeof window !== 'undefined') {
    const target = new URL(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
      ADMIN_APP_URL
    )
    window.location.replace(target.toString())
  }

  return <PageLoader />
}

function PublicEventRedirect() {
  if (typeof window !== 'undefined') {
    const target = new URL(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
      PUBLIC_SITE_URL
    )

    if (target.origin !== window.location.origin) {
      window.location.replace(target.toString())
    }
  }

  return <PageLoader />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <PublicRoute element={withSuspense(<LoginPage />)} />,
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/speaker-invitation/accept',
    element: withSuspense(<AcceptInvitationPage />),
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/speaker-invitation/reject',
    element: withSuspense(<RejectInvitationPage />),
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/invite/accept',
    element: withSuspense(<AcceptInvitePage />),
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    // Старые ссылки из писем — редиректим на новый экран, сохраняя токен.
    path: '/invite/activate',
    element: withSuspense(<ActivateRedirect />),
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/check-in',
    element: (
      <ProtectedRoute
        element={
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.attendanceCheckin]}
            element={withSuspense(<CheckInPage />)}
          />
        }
      />
    ),
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/blog',
    element: withSuspense(<BlogListPage />),
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/blog/:slug',
    element: withSuspense(<BlogPostPage />),
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/events/:slug',
    element: <PublicEventRedirect />,
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    element: <ProtectedRoute element={<ProtectedLayout />} />,
    errorElement: withSuspense(<ErrorPage />),
    children: [
      {
        path: '/dashboard',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.dashboard]}
            element={withSuspense(<DashboardPage />, <DashboardPageSkeleton />)}
          />
        ),
      },
      {
        path: '/my-events',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.eventsRead]}
            element={withSuspense(<MyEventsPage />)}
          />
        ),
      },
      {
        path: '/my-events/create',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.eventsCreate]}
            element={withSuspense(<CreateEventPage />)}
          />
        ),
      },
      {
        path: '/my-events/:id/edit',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.eventsUpdate]}
            element={withSuspense(<EditEventPage />)}
          />
        ),
      },
      {
        path: '/my-events/:id',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.eventsRead]}
            element={withSuspense(<EventDetailsPage />)}
          />
        ),
      },
      {
        path: '/users',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.users]}
            element={withSuspense(<UsersPage />)}
          />
        ),
      },
      {
        path: '/settings/billing',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.billingRead]}
            element={withSuspense(<BillingPage />)}
          />
        ),
      },
      {
        path: '/followers',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.followersRead]}
            element={withSuspense(<FollowersPage />)}
          />
        ),
      },
      {
        path: '/contacts',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.contactsRead]}
            element={withSuspense(<ContactsPage />)}
          />
        ),
      },
      {
        path: '/my-places',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.placesRead]}
            element={withSuspense(<MyPlacesPage />)}
          />
        ),
      },
      {
        path: '/my-places/new',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.placesCreate]}
            element={withSuspense(<PlaceEditorPage />)}
          />
        ),
      },
      {
        path: '/my-places/:id',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.placesUpdate, ...ROUTE_PERMISSIONS.placesRead]}
            element={withSuspense(<PlaceEditorPage />)}
          />
        ),
      },
      {
        path: '/my-blog',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.blogRead]}
            element={withSuspense(<MyBlogPage />)}
          />
        ),
      },
      {
        path: '/my-blog/new',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.blogCreate]}
            element={withSuspense(<BlogEditorPage />)}
          />
        ),
      },
      {
        path: '/my-blog/:id',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.blogRead]}
            element={withSuspense(<MyBlogPostPage />)}
          />
        ),
      },
      {
        path: '/my-blog/:id/edit',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.blogUpdate]}
            element={withSuspense(<BlogEditorPage />)}
          />
        ),
      },
      {
        path: '/places',
        element: withSuspense(<PlacesCatalogPage />),
      },
      {
        path: '/places/:slug',
        element: withSuspense(<PlacePublicDetailsPage />),
      },
      {
        path: '/profile',
        element: withSuspense(<ProfilePage />),
      },
      {
        path: '/settings',
        element: withSuspense(<SettingsPage />),
      },
      {
        path: '/security',
        element: withSuspense(<SecurityPage />),
      },
      {
        path: '/saved-blog',
        element: withSuspense(<SavedBlogPage />),
      },
      {
        path: '/tasks',
        element: <Navigate to="/tasks/boards" replace />,
      },
      {
        path: '/tasks/boards',
        element: (
          <PermissionRoute
            anyOf={[...ROUTE_PERMISSIONS.boardsRead]}
            element={withSuspense(<BoardsListPage />)}
          />
        ),
      },
    ],
  },
  {
    // Board detail is a fullscreen Kanban surface with its own chrome, so it
    // renders outside the AdminLayout shell (like /check-in) but stays auth-gated.
    element: (
      <ProtectedRoute
        element={<PermissionRoute anyOf={[...ROUTE_PERMISSIONS.boardsRead]} element={<Outlet />} />}
      />
    ),
    errorElement: withSuspense(<ErrorPage />),
    children: [
      {
        path: '/tasks/boards/:boardId',
        element: withSuspense(<BoardDetailPage />),
      },
    ],
  },
  {
    path: '/admin/login',
    element: <AdminAppRedirect />,
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/admin',
    element: <AdminAppRedirect />,
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '/admin/*',
    element: <AdminAppRedirect />,
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
])
