import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { SuperAdminLayout } from '@widgets/super-admin-layout'
import { PublicRoute, SuperAdminRoute } from './protected-route'

const NotFoundPage = lazy(() => import('@pages/error/not-found'))
const ErrorPage = lazy(() => import('@pages/error/fallback'))
const AdminLoginPage = lazy(() => import('@pages/super-admin/login'))
const SuperAdminDashboardPage = lazy(() => import('@pages/super-admin/dashboard'))
const SuperAdminUsersPage = lazy(() => import('@pages/super-admin/users'))
const SuperAdminUserDetailsPage = lazy(() => import('@pages/super-admin/users/details'))
const SuperAdminOrganizationsPage = lazy(() => import('@pages/super-admin/organizations'))
const SuperAdminOrganizationDetailsPage = lazy(
  () => import('@pages/super-admin/organizations/details')
)
const SuperAdminOrgBillingPage = lazy(() => import('@pages/super-admin/organizations/billing'))
const SuperAdminOrgAccessPage = lazy(() => import('@pages/super-admin/organizations/access'))
const SuperAdminBlogPostDetailsPage = lazy(
  () => import('@pages/super-admin/blog-posts/details')
)
const SuperAdminEventsPage = lazy(() => import('@pages/super-admin/events'))
const SuperAdminEventDetailsPage = lazy(() => import('@pages/super-admin/events/details'))
const SuperAdminEventEditPage = lazy(() => import('@pages/super-admin/events/edit'))
const SuperAdminBlogPostsPage = lazy(
  () => import('@pages/super-admin/blog-posts/ui/blog-posts-page')
)
const SuperAdminCategoriesPage = lazy(() => import('@pages/super-admin/categories'))
const SuperAdminBlogCategoriesPage = lazy(() => import('@pages/super-admin/blog-categories'))
const SuperAdminCollectionsPage = lazy(() => import('@pages/super-admin/collections'))
const VerificationCodesPage = lazy(() => import('@pages/super-admin/verification-codes'))
const SuperAdminBillingPage = lazy(() => import('@pages/super-admin/billing'))
const SuperAdminAppBuildsPage = lazy(() => import('@pages/super-admin/app-builds'))

function withSuspense(node: ReactNode, fallback?: ReactNode) {
  return <Suspense fallback={fallback ?? <PageLoader />}>{node}</Suspense>
}

function PageLoader() {
  const t = useT()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      {t('admin.layout.pageLoading')}
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/admin" replace />,
  },
  {
    path: '/admin/login',
    element: <PublicRoute element={withSuspense(<AdminLoginPage />)} />,
    errorElement: withSuspense(<ErrorPage />),
  },
  {
    element: <SuperAdminRoute element={<SuperAdminLayout />} />,
    errorElement: withSuspense(<ErrorPage />),
    children: [
      {
        path: '/admin',
        element: withSuspense(<SuperAdminDashboardPage />),
      },
      {
        path: '/admin/users',
        element: withSuspense(<SuperAdminUsersPage />),
      },
      {
        path: '/admin/users/:userId',
        element: withSuspense(<SuperAdminUserDetailsPage />),
      },
      {
        path: '/admin/organizations',
        element: withSuspense(<SuperAdminOrganizationsPage />),
      },
      {
        path: '/admin/organizations/:orgId',
        element: withSuspense(<SuperAdminOrganizationDetailsPage />),
      },
      {
        path: '/admin/organizations/:orgId/billing',
        element: withSuspense(<SuperAdminOrgBillingPage />),
      },
      {
        path: '/admin/organizations/:orgId/access',
        element: withSuspense(<SuperAdminOrgAccessPage />),
      },
      {
        path: '/admin/events',
        element: withSuspense(<SuperAdminEventsPage />),
      },
      {
        path: '/admin/events/:id',
        element: withSuspense(<SuperAdminEventDetailsPage />),
      },
      {
        path: '/admin/events/:id/edit',
        element: withSuspense(<SuperAdminEventEditPage />),
      },
      {
        path: '/admin/blog-posts',
        element: withSuspense(<SuperAdminBlogPostsPage />),
      },
      {
        path: '/admin/blog-posts/:postId',
        element: withSuspense(<SuperAdminBlogPostDetailsPage />),
      },
      {
        path: '/admin/categories',
        element: withSuspense(<SuperAdminCategoriesPage />),
      },
      {
        path: '/admin/blog-categories',
        element: withSuspense(<SuperAdminBlogCategoriesPage />),
      },
      {
        path: '/admin/collections',
        element: withSuspense(<SuperAdminCollectionsPage />),
      },
      {
        path: '/admin/verification-codes',
        element: withSuspense(<VerificationCodesPage />),
      },
      {
        path: '/admin/billing',
        element: withSuspense(<SuperAdminBillingPage />),
      },
      {
        path: '/admin/app-builds',
        element: withSuspense(<SuperAdminAppBuildsPage />),
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
    errorElement: withSuspense(<ErrorPage />),
  },
])
