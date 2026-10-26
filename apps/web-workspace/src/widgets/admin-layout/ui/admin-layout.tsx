import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { cn } from '@shared/lib/cn'

import { AdminNavbar, type BreadcrumbItem } from './admin-navbar'
import { AdminSidebar, type NavigationGroup } from './admin-sidebar'
import { MobileSidebar } from './mobile-sidebar'

type AdminLayoutProps = {
  title?: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  sidebarFooter?: ReactNode
  navigation?: NavigationGroup[]
  userAvatar?: string
  userName?: string
  userEmail?: string
  /** Название организации (информационный блок в шапке сайдбара) */
  organizationName?: string
  /** Логотип организации */
  organizationLogo?: string
  /** ИНН организации */
  organizationInn?: string | null
  /** Id активной организации (для переключателя в шапке сайдбара) */
  organizationId?: string
  notificationCount?: number
  onLogout?: () => void
  profileHref?: string
  settingsHref?: string
  accountRole?: string
  showSidebarCreate?: boolean
  onCreateEvent?: () => void
  /** Organization public profile URL (header "View public profile"). */
  publicProfileUrl?: string
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onNotificationsClick?: () => void
  children: ReactNode
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'eventflow-workspace-sidebar-collapsed'

export function AdminLayout({
  title,
  description,
  breadcrumbs,
  actions,
  sidebarFooter,
  navigation,
  userAvatar,
  userName,
  userEmail,
  organizationName,
  organizationLogo,
  organizationInn,
  organizationId,
  notificationCount,
  onLogout,
  profileHref,
  settingsHref,
  accountRole,
  showSidebarCreate,
  onCreateEvent,
  publicProfileUrl,
  onProfileClick,
  onSettingsClick,
  onNotificationsClick,
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const navGroups = useMemo(() => navigation ?? [], [navigation])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
    } catch {
      // ignore storage errors
    }
  }, [collapsed])

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background text-foreground">
      {/* Десктопный сайдбар */}
      <div className="hidden lg:block">
        <AdminSidebar
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          navigation={navGroups}
          sidebarFooter={sidebarFooter}
          onLogout={onLogout}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          accountRole={accountRole}
          organizationName={organizationName}
          organizationLogo={organizationLogo}
          organizationId={organizationId}
          organizationInn={organizationInn}
          profileHref={profileHref}
          settingsHref={settingsHref}
          showCreateButton={showSidebarCreate}
          onCreateEvent={onCreateEvent}
        />
      </div>

      {/* Мобильный сайдбар */}
      <MobileSidebar
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        navigation={navGroups}
        sidebarFooter={sidebarFooter}
        onLogout={onLogout}
      />

      {/* Основной контент */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminNavbar
          title={title}
          description={description}
          breadcrumbs={breadcrumbs}
          actions={actions}
          publicProfileUrl={publicProfileUrl}
          onMenuClick={() => setMobileOpen(true)}
          userAvatar={userAvatar}
          userName={userName}
          userEmail={userEmail}
          organizationInn={organizationInn}
          notificationCount={notificationCount}
          onLogout={onLogout}
          profileHref={profileHref}
          settingsHref={settingsHref}
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
          onNotificationsClick={onNotificationsClick}
        />

        <main className={cn('min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6')}>
          <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
