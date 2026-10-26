/**
 * Layout для Super Admin панели
 */

import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  CreditCard,
  Shield,
  KeyRound,
  FileText,
  FolderTree,
  Tags,
  Layers,
  Smartphone,
} from 'lucide-react'
import { Toaster } from 'sonner'

import { clearAuthTokens } from '@api/config'
import { useSuperAdminMe } from '@features/super-admin'
import { clearAppQueryCache } from '@shared/lib/query-client'
import { AdminLayout, type BreadcrumbItem, type NavigationGroup } from '@widgets/admin-layout'

export function SuperAdminLayout() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: me } = useSuperAdminMe()

  const superAdminNavigation = useMemo<NavigationGroup[]>(
    () => [
      {
        items: [
          {
            href: '/admin',
            label: t('admin.layout.routes.overview'),
            icon: <LayoutDashboard className="size-5" />,
            end: true,
          },
        ],
      },
      {
        label: t('admin.layout.groups.management'),
        items: [
          {
            href: '/admin/users',
            label: t('admin.layout.routes.users'),
            icon: <Users className="size-5" />,
          },
          {
            href: '/admin/organizations',
            label: t('admin.layout.routes.organizations'),
            icon: <Building2 className="size-5" />,
          },
          {
            href: '/admin/events',
            label: t('admin.layout.routes.events'),
            icon: <CalendarDays className="size-5" />,
          },
          {
            href: '/admin/blog-posts',
            label: t('admin.layout.routes.blog'),
            icon: <FileText className="size-5" />,
          },
          {
            href: '/admin/categories',
            label: t('admin.layout.routes.categories'),
            icon: <FolderTree className="size-5" />,
          },
          {
            href: '/admin/blog-categories',
            label: t('admin.layout.routes.blogCategories'),
            icon: <Tags className="size-5" />,
          },
          {
            href: '/admin/collections',
            label: t('admin.layout.routes.collections'),
            icon: <Layers className="size-5" />,
          },
          {
            href: '/admin/verification-codes',
            label: t('admin.layout.routes.verificationCodes'),
            icon: <KeyRound className="size-5" />,
          },
          {
            href: '/admin/billing',
            label: t('admin.layout.routes.billing'),
            icon: <CreditCard className="size-5" />,
          },
          {
            href: '/admin/app-builds',
            label: t('admin.layout.routes.appBuilds'),
            icon: <Smartphone className="size-5" />,
          },
        ],
      },
    ],
    [t]
  )

  const routeConfig = useMemo<
    Record<string, { title: string; description?: string; breadcrumbs?: BreadcrumbItem[] }>
  >(
    () => ({
      '/admin': {
        title: t('admin.layout.brand'),
        description: t('admin.layout.descriptions.overview'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin') },
          { label: t('admin.layout.routes.overview') },
        ],
      },
      '/admin/users': {
        title: t('admin.layout.routes.users'),
        description: t('admin.layout.descriptions.users'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.users') },
        ],
      },
      '/admin/organizations': {
        title: t('admin.layout.routes.organizations'),
        description: t('admin.layout.descriptions.organizations'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.organizations') },
        ],
      },
      '/admin/events': {
        title: t('admin.layout.routes.events'),
        description: t('admin.layout.descriptions.events'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.events') },
        ],
      },
      '/admin/blog-posts': {
        title: t('admin.layout.routes.blog'),
        description: t('admin.layout.descriptions.blog'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.blog') },
        ],
      },
      '/admin/categories': {
        title: t('admin.layout.routes.categories'),
        description: t('admin.layout.descriptions.categories'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.categories') },
        ],
      },
      '/admin/blog-categories': {
        title: t('admin.layout.routes.blogCategories'),
        description: t('admin.layout.descriptions.blogCategories'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.blogCategories') },
        ],
      },
      '/admin/collections': {
        title: t('admin.layout.routes.collections'),
        description: t('admin.layout.descriptions.collections'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.collections') },
        ],
      },
      '/admin/verification-codes': {
        title: t('admin.layout.routes.verificationCodes'),
        description: t('admin.layout.descriptions.verificationCodes'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.verificationCodes') },
        ],
      },
      '/admin/billing': {
        title: t('admin.layout.routes.billing'),
        description: t('admin.layout.descriptions.billing'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.billing') },
        ],
      },
      '/admin/app-builds': {
        title: t('admin.layout.routes.appBuilds'),
        description: t('admin.layout.descriptions.appBuilds'),
        breadcrumbs: [
          { label: t('admin.layout.routes.admin'), href: '/admin' },
          { label: t('admin.layout.routes.appBuilds') },
        ],
      },
    }),
    [t]
  )

  const currentRoute = useMemo(() => {
    return (
      routeConfig[location.pathname] || {
        title: t('admin.layout.brand'),
        breadcrumbs: [{ label: t('admin.layout.routes.admin') }],
      }
    )
  }, [location.pathname, routeConfig, t])

  const handleLogout = () => {
    clearAuthTokens()
    clearAppQueryCache()
    navigate('/admin/login', { replace: true })
  }

  return (
    <AdminLayout
      title={currentRoute.title}
      description={currentRoute.description}
      breadcrumbs={currentRoute.breadcrumbs}
      navigation={superAdminNavigation}
      userAvatar={undefined}
      userName={me?.name ?? t('admin.layout.brand')}
      userEmail={me?.email ?? 'admin@eventflow.uz'}
      onLogout={handleLogout}
      sidebarFooter={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5" aria-hidden="true" />
          <span className="font-medium">{t('admin.layout.mode')}</span>
        </div>
      }
    >
      <Outlet />
      <Toaster position="top-right" closeButton richColors={false} />
    </AdminLayout>
  )
}
