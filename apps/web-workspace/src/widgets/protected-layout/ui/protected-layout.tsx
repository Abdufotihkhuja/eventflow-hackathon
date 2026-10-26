import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import {
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Plus,
  QrCode,
  Settings,
  Users,
  User,
  ShieldCheck,
  FileText,
  UserPlus,
  MessageSquare,
  MapPinned,
  KanbanSquare,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { clearAuthTokens, getMediaUrl, PUBLIC_SITE_URL } from '@api/config'
import {
  useCurrentUser,
  useActorType,
  isOrganizationUser,
  isMemberUser,
  useMemberPermissions,
  CompanyInfoDialog,
} from '@features/profile'
import { useEventsCountQuery } from '@features/events/api'
import { AdminLayout, type BreadcrumbItem, type NavigationGroup } from '@widgets/admin-layout'
import {
  NotificationsPanel,
  useUnreadNotificationsCount,
} from '@features/notifications'

import { clearAppQueryCache } from '@shared/lib/query-client'
import { Button } from '@shared/ui'
import { Toaster } from 'sonner'

// ================================
// Permission Codes для фильтрации навигации
// ================================

const PERMISSION_CODES = {
  // Панель
  DASHBOARD_VIEW: 'dashboard:view',

  // События
  EVENTS_VIEW: 'events:read',
  EVENTS_CREATE: 'events:create',
  EVENTS_UPDATE: 'events:update',

  // Участники / check-in
  REGISTRATIONS_VIEW: 'registrations:read',
  ATTENDANCE_VIEW: 'attendance:read',
  ATTENDANCE_CHECKIN: 'attendance:checkin',

  // Доски
  BOARDS_VIEW: 'boards:read',

  // Блог
  BLOG_VIEW: 'blog:read',
  BLOG_CREATE: 'blog:create',
  BLOG_UPDATE: 'blog:update',
  BLOG_SUBMIT: 'blog:submit',
  BLOG_PUBLISH: 'blog:publish',

  // Подписчики / заявки
  FOLLOWERS_VIEW: 'followers:read',
  CONTACTS_VIEW: 'contacts:read',

  // Площадки
  PLACES_VIEW: 'places:read',

  // Тарифы
  BILLING_VIEW: 'billing:view',

  // Пользователи (сотрудники)
  MEMBERS_VIEW: 'members:read',
  MEMBERS_CREATE: 'members:create',
} as const

// ================================
// Navigation Config
// ================================

type NavItem = {
  href: string
  labelKey: string
  icon: React.ReactNode
  end?: boolean
  badge?: number
  /** Требуемые коды прав (хотя бы один) */
  permissions?: string[]
  /** Только для организации */
  organizationOnly?: boolean
}

type NavGroup = {
  labelKey?: string
  items: NavItem[]
  /** Pin this group to the bottom of the sidebar rail. */
  pinBottom?: boolean
}

const fullNavigation: NavGroup[] = [
  // ── Primary: the daily operational entry points ──────────────────────────
  {
    items: [
      {
        href: '/dashboard',
        labelKey: 'workspace.layout.navigation.dashboard',
        icon: <LayoutDashboard className="h-5 w-5" />,
        end: true,
        permissions: [PERMISSION_CODES.DASHBOARD_VIEW],
      },
      {
        href: '/my-events',
        labelKey: 'workspace.layout.navigation.myEvents',
        icon: <CalendarDays className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.EVENTS_VIEW, PERMISSION_CODES.EVENTS_UPDATE],
      },
      {
        href: '/tasks/boards',
        labelKey: 'workspace.layout.navigation.board',
        icon: <KanbanSquare className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.BOARDS_VIEW],
      },
      {
        // Global door scanner — validates any ticket by QR/code, not event-scoped.
        // Per-event check-in also lives inside Event detail → Check-in.
        href: '/check-in',
        labelKey: 'workspace.layout.navigation.checkIn',
        icon: <QrCode className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.ATTENDANCE_CHECKIN],
      },
    ],
  },
  // ── Organization: everything owned by the org — public presence, venues,
  //    team and org-wide settings. One group so the product structure reads as
  //    "this belongs to the organization", distinct from the personal account.
  {
    labelKey: 'workspace.layout.navigationGroups.organization',
    items: [
      {
        href: '/my-blog',
        labelKey: 'workspace.layout.navigation.myBlog',
        icon: <FileText className="h-5 w-5" />,
        permissions: [
          PERMISSION_CODES.BLOG_VIEW,
          PERMISSION_CODES.BLOG_CREATE,
          PERMISSION_CODES.BLOG_UPDATE,
          PERMISSION_CODES.BLOG_SUBMIT,
          PERMISSION_CODES.BLOG_PUBLISH,
        ],
      },
      {
        href: '/followers',
        labelKey: 'workspace.layout.navigation.followers',
        icon: <UserPlus className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.FOLLOWERS_VIEW],
      },
      {
        href: '/contacts',
        labelKey: 'workspace.layout.navigation.contacts',
        icon: <MessageSquare className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.CONTACTS_VIEW],
      },
      {
        href: '/my-places',
        labelKey: 'workspace.layout.navigation.myPlaces',
        icon: <Building2 className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.PLACES_VIEW],
      },
      {
        href: '/places',
        labelKey: 'workspace.layout.navigation.placesCatalog',
        icon: <MapPinned className="h-5 w-5" />,
      },
      {
        href: '/users',
        labelKey: 'workspace.layout.navigation.users',
        icon: <Users className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.MEMBERS_VIEW, PERMISSION_CODES.MEMBERS_CREATE],
      },
      {
        href: '/settings',
        labelKey: 'workspace.layout.navigation.settings',
        icon: <Settings className="h-5 w-5" />,
        // Exact match so /settings/billing doesn't also light up Settings.
        end: true,
      },
      {
        href: '/settings/billing',
        labelKey: 'workspace.layout.navigation.billing',
        icon: <CreditCard className="h-5 w-5" />,
        permissions: [PERMISSION_CODES.BILLING_VIEW],
      },
    ],
  },
  // ── Account — the signed-in person, not the organization ──────────────────
  {
    labelKey: 'workspace.layout.navigationGroups.account',
    pinBottom: true,
    items: [
      {
        href: '/profile',
        labelKey: 'workspace.layout.navigation.profile',
        icon: <User className="h-5 w-5" />,
      },
      {
        href: '/security',
        labelKey: 'workspace.layout.navigation.security',
        icon: <ShieldCheck className="h-5 w-5" />,
      },
    ],
  },
]

// Конфигурация для breadcrumbs, title и actions для каждого роута
const routeConfig: Record<
  string,
  {
    titleKey: string
    descriptionKey?: string
    breadcrumbKey?: string
    showCreateButton?: boolean
    createPermission?: string
  }
> = {
  '/dashboard': {
    titleKey: 'workspace.layout.routes.dashboard.title',
    descriptionKey: 'workspace.layout.routes.dashboard.description',
    breadcrumbKey: 'workspace.layout.routes.dashboard.title',
  },
  '/my-events': {
    titleKey: 'workspace.layout.routes.myEvents.title',
    descriptionKey: 'workspace.layout.routes.myEvents.description',
    breadcrumbKey: 'workspace.layout.routes.myEvents.title',
  },
  '/users': {
    titleKey: 'workspace.layout.routes.users.title',
    descriptionKey: 'workspace.layout.routes.users.description',
    breadcrumbKey: 'workspace.layout.routes.users.title',
  },
  '/tasks/boards': {
    titleKey: 'workspace.layout.routes.boards.title',
    descriptionKey: 'workspace.layout.routes.boards.description',
    breadcrumbKey: 'workspace.layout.routes.boards.title',
  },
  '/profile': {
    titleKey: 'workspace.layout.routes.profile.title',
    descriptionKey: 'workspace.layout.routes.profile.description',
    breadcrumbKey: 'workspace.layout.routes.profile.title',
  },
  '/settings': {
    titleKey: 'workspace.layout.routes.settings.title',
    descriptionKey: 'workspace.layout.routes.settings.description',
    breadcrumbKey: 'workspace.layout.routes.settings.title',
  },
  // '/settings/billing' обрабатывается отдельно в getRouteConfig (C-15b):
  // крошки включают родителя «Настройки» и активную вкладку из ?tab=.
  '/security': {
    titleKey: 'workspace.layout.routes.security.title',
    descriptionKey: 'workspace.layout.routes.security.description',
    breadcrumbKey: 'workspace.layout.routes.security.title',
  },
  '/my-blog': {
    titleKey: 'workspace.layout.routes.myBlog.title',
    descriptionKey: 'workspace.layout.routes.myBlog.description',
    breadcrumbKey: 'workspace.layout.routes.myBlog.title',
  },
  '/followers': {
    titleKey: 'workspace.layout.routes.followers.title',
    descriptionKey: 'workspace.layout.routes.followers.description',
    breadcrumbKey: 'workspace.layout.routes.followers.title',
  },
  '/contacts': {
    titleKey: 'workspace.layout.routes.contacts.title',
    descriptionKey: 'workspace.layout.routes.contacts.description',
    breadcrumbKey: 'workspace.layout.routes.contacts.title',
  },
  '/my-places': {
    titleKey: 'workspace.layout.routes.myPlaces.title',
    descriptionKey: 'workspace.layout.routes.myPlaces.description',
    breadcrumbKey: 'workspace.layout.routes.myPlaces.title',
  },
  '/places': {
    titleKey: 'workspace.layout.routes.places.title',
    descriptionKey: 'workspace.layout.routes.places.description',
    breadcrumbKey: 'workspace.layout.routes.places.title',
  },
}

/** URL-адресуемые вкладки биллинга (контракт C-15a) → i18n-метки крошек. */
const BILLING_TAB_KEYS: Record<string, string> = {
  plans: 'billing.tabs.plans',
  addons: 'billing.tabs.addons',
  invoices: 'billing.tabs.invoices',
}

function getRouteConfig(pathname: string, t: ReturnType<typeof useT>, search = '') {
  // C-15b: /settings/billing живёт под «Настройками», а вкладки адресуемы
  // через ?tab= (C-15a) — крошки отражают и родителя, и активную вкладку.
  if (pathname === '/settings/billing') {
    const title = t('workspace.layout.routes.billing.title')
    const tab = new URLSearchParams(search).get('tab')
    const tabKey = tab ? BILLING_TAB_KEYS[tab] : undefined
    return {
      title,
      description: t('workspace.layout.routes.billing.description'),
      breadcrumbs: [
        { label: t('workspace.layout.routes.home'), href: '/' },
        { label: t('workspace.layout.routes.settings.title'), href: '/settings' },
        ...(tabKey
          ? [{ label: title, href: '/settings/billing' }, { label: t(tabKey) }]
          : [{ label: title }]),
      ],
      showCreateButton: undefined as boolean | undefined,
      createPermission: undefined as string | undefined,
    }
  }

  const exact = routeConfig[pathname]
  if (exact) {
    const title = t(exact.titleKey)
    return {
      title,
      description: exact.descriptionKey ? t(exact.descriptionKey) : undefined,
      breadcrumbs: [
        { label: t('workspace.layout.routes.home'), href: '/' },
        { label: exact.breadcrumbKey ? t(exact.breadcrumbKey) : title },
      ],
      showCreateButton: exact.showCreateButton,
      createPermission: exact.createPermission,
    }
  }
  if (pathname.startsWith('/places/') && pathname !== '/places') {
    return {
      title: t('workspace.layout.routes.place.title'),
      description: t('workspace.layout.routes.place.description'),
      breadcrumbs: [
        { label: t('workspace.layout.routes.home'), href: '/' },
        { label: t('workspace.layout.routes.places.title'), href: '/places' },
        { label: t('workspace.layout.routes.place.title') },
      ],
    }
  }
  if (
    pathname.startsWith('/my-events/') &&
    pathname !== '/my-events/create' &&
    !pathname.endsWith('/edit')
  ) {
    return {
      title: t('workspace.layout.routes.event.title'),
      description: t('workspace.layout.routes.event.description'),
      breadcrumbs: [
        { label: t('workspace.layout.routes.home'), href: '/' },
        { label: t('workspace.layout.routes.myEvents.title'), href: '/my-events' },
        { label: t('workspace.layout.routes.event.title') },
      ],
    }
  }
  if (
    pathname.startsWith('/my-blog/') &&
    pathname !== '/my-blog/new' &&
    !pathname.endsWith('/edit')
  ) {
    return {
      title: t('workspace.layout.routes.blogPost.title'),
      description: t('workspace.layout.routes.blogPost.description'),
      breadcrumbs: [
        { label: t('workspace.layout.routes.home'), href: '/' },
        { label: t('workspace.layout.routes.myBlog.title'), href: '/my-blog' },
        { label: t('workspace.layout.routes.blogPost.title') },
      ],
    }
  }
  return { title: t('workspace.layout.routes.page.title'), breadcrumbs: [] as BreadcrumbItem[] }
}

// ================================
// Protected Layout
// ================================

export function ProtectedLayout() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const actorType = useActorType()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { data: unreadData } = useUnreadNotificationsCount()
  const unreadNotifications = unreadData?.count ?? 0

  const { data: currentUser, isError: isUserError, isLoading: isUserLoading } = useCurrentUser()

  // Определяем тип из реальных данных API, с fallback на localStorage
  const isMember = currentUser ? currentUser.type === 'member' : actorType === 'member'

  // Запрашиваем права только для member, не для организации
  const { data: memberPermissions } = useMemberPermissions({ enabled: isMember })
  // Получаем количество событий для badge в навигации
  const { data: eventsCount } = useEventsCountQuery()

  // Если профиль не загрузился — сессия невалидна, разлогиниваем
  useEffect(() => {
    if (isUserError && !isUserLoading) {
      clearAuthTokens()
      clearAppQueryCache()
      navigate('/login', { replace: true })
    }
  }, [isUserError, isUserLoading, navigate])

  // Собираем все коды прав member
  const permissionCodes = useMemo(() => {
    if (!isMember) return new Set<string>()

    const codes = new Set<string>()
    memberPermissions?.allPermissions?.forEach(p => codes.add(p.code))
    memberPermissions?.permissions?.forEach(code => codes.add(code))
    return codes
  }, [isMember, memberPermissions])

  const isOrganization = currentUser?.type === 'organization'

  // Проверка наличия права
  const hasPermission = useCallback(
    (requiredPermissions?: string[]): boolean => {
      // Организация имеет все права
      if (isOrganization) return true

      // Если права не указаны — доступ есть
      if (!requiredPermissions || requiredPermissions.length === 0) return true

      // Проверяем наличие хотя бы одного права
      return requiredPermissions.some(code => permissionCodes.has(code))
    },
    [isOrganization, permissionCodes]
  )

  // Фильтруем навигацию по правам и добавляем динамические badge
  const filteredNavigation = useMemo((): NavigationGroup[] => {
    const placesEnabled = !isOrganizationUser(currentUser) || currentUser.data.placesFeatureEnabled

    return fullNavigation
      .map(group => ({
        label: group.labelKey ? t(group.labelKey) : undefined,
        pinBottom: group.pinBottom,
        items: group.items
          .filter(item => {
            // Скрываем organization-only пункты для не-организаций
            if (item.organizationOnly && !isOrganization) return false
            if (item.href === '/my-places' && !placesEnabled) return false

            // Проверка permissions
            return hasPermission(item.permissions)
          })
          .map(item => {
            const translatedItem = { ...item, label: t(item.labelKey) }
            if (item.href === '/my-events' && eventsCount !== undefined && eventsCount > 0) {
              return { ...translatedItem, badge: eventsCount }
            }
            return translatedItem
          }),
      }))
      .filter(group => group.items.length > 0)
  }, [currentUser, isOrganization, hasPermission, eventsCount, t])

  const currentRoute = getRouteConfig(location.pathname, t, location.search)

  // Проверяем право на создание события
  const canCreateEvent = hasPermission([
    PERMISSION_CODES.EVENTS_CREATE,
    PERMISSION_CODES.EVENTS_UPDATE,
  ])

  const showCreateButton = currentRoute.showCreateButton && canCreateEvent

  const handleLogout = () => {
    clearAuthTokens()
    clearAppQueryCache()
    navigate('/login', { replace: true })
  }

  const handleCreateEvent = useCallback(() => {
    navigate('/my-events/create')
  }, [navigate])

  // Global "N" shortcut → create event (mirrors the sidebar button hint).
  // Ignored while typing in inputs/textareas/contenteditable or with modifiers.
  useEffect(() => {
    if (!canCreateEvent) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (e.key.toLowerCase() !== 'n') return
      const el = document.activeElement as HTMLElement | null
      if (
        el?.isContentEditable ||
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        el?.tagName === 'SELECT'
      ) {
        return
      }
      e.preventDefault()
      handleCreateEvent()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canCreateEvent, handleCreateEvent])

  // Identity for the shell: a static organization context (sidebar top) and the
  // signed-in account with its role (sidebar bottom). For an organization login
  // these share a name; for a member they differ (their org vs. themselves).
  const getUserDisplayData = () => {
    if (isMemberUser(currentUser)) {
      const member = currentUser.data
      return {
        avatar: getMediaUrl(member.avatarUrl),
        name: `${member.firstName} ${member.lastName}`.trim(),
        email: member.email,
        inn: null, // Member не имеет ИНН, только организация
        role: member.role?.name,
        orgName: member.organization?.name ?? '',
        orgLogo: getMediaUrl(member.organization?.logoUrl),
        orgId: member.organization?.id,
      }
    }

    if (isOrganizationUser(currentUser)) {
      const org = currentUser.data
      return {
        avatar: getMediaUrl(org.logoUrl),
        name: org.organizationName,
        email: org.email,
        inn: org.inn,
        role: t('roles.owner'),
        orgName: org.organizationName,
        orgLogo: getMediaUrl(org.logoUrl),
        orgId: org.id,
      }
    }

    return {
      avatar: undefined,
      name: t('workspace.layout.navbar.defaultUser'),
      email: '',
      inn: null,
      role: undefined,
      orgName: '',
      orgLogo: undefined,
      orgId: undefined,
    }
  }

  const userData = getUserDisplayData()

  // Public organizer profile lives on the marketing site at /organizers/:id.
  // Only organizations have a public profile; resolve it safely or leave undefined.
  const publicProfileUrl = isOrganizationUser(currentUser)
    ? `${PUBLIC_SITE_URL}/organizers/${currentUser.data.id}`
    : undefined

  const showCompanyInfoPopup =
    isOrganizationUser(currentUser) && currentUser.data.needsCompanyInfo === true

  return (
    <>
      <AdminLayout
        title={currentRoute.title}
        description={currentRoute.description}
        breadcrumbs={currentRoute.breadcrumbs}
        actions={
          showCreateButton ? (
            <Button onClick={handleCreateEvent} size="sm">
              <Plus className="mr-1.5 size-4" />
              {t('workspace.layout.actions.createEvent')}
            </Button>
          ) : undefined
        }
        navigation={filteredNavigation}
        userAvatar={userData.avatar}
        userName={userData.name}
        userEmail={userData.email}
        accountRole={userData.role}
        organizationName={userData.orgName}
        organizationLogo={userData.orgLogo}
        organizationInn={userData.inn}
        organizationId={userData.orgId}
        onLogout={handleLogout}
        profileHref="/profile"
        settingsHref="/settings"
        showSidebarCreate={canCreateEvent}
        onCreateEvent={handleCreateEvent}
        publicProfileUrl={publicProfileUrl}
        notificationCount={unreadNotifications}
        onNotificationsClick={() => setNotificationsOpen(true)}
      >
        <Outlet />
        <Toaster position="top-right" closeButton richColors={false} />
      </AdminLayout>
      <NotificationsPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
      {showCompanyInfoPopup && isOrganizationUser(currentUser) && (
        <CompanyInfoDialog open={showCompanyInfoPopup} organization={currentUser.data} />
      )}
    </>
  )
}
