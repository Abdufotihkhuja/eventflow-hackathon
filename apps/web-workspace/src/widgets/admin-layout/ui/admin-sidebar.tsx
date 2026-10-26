import { Fragment, useMemo, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Plus,
  Settings,
  User,
  Users,
  KanbanSquare,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { PUBLIC_SITE_URL } from '@api/config'
import { WorkspaceOrgSwitcher } from '@features/auth'
import { cn } from '@shared/lib/cn'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/ui'

function initialsOf(name?: string): string {
  if (!name) return 'EF'
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export type NavigationItem = {
  href: string
  label: string
  icon?: ReactNode
  end?: boolean
  badge?: string | number
  disabled?: boolean
}

export type NavigationGroup = {
  label?: string
  items: NavigationItem[]
  /** Pin this group to the bottom of the sidebar (a spacer pushes it down). */
  pinBottom?: boolean
}

type AdminSidebarProps = {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  navigation?: NavigationGroup[]
  sidebarFooter?: ReactNode
  onLogout?: () => void
  userName?: string
  userEmail?: string
  userAvatar?: string
  accountRole?: string
  organizationName?: string
  organizationLogo?: string
  organizationInn?: string | null
  /** Id of the active workspace organization (for the header switcher). */
  organizationId?: string
  profileHref?: string
  settingsHref?: string
  showCreateButton?: boolean
  onCreateEvent?: () => void
}

export function AdminSidebar({
  collapsed,
  onCollapsedChange,
  navigation: navigationProp,
  sidebarFooter,
  onLogout,
  userName,
  userEmail,
  userAvatar,
  accountRole,
  organizationName,
  organizationLogo,
  organizationInn,
  organizationId,
  profileHref = '/profile',
  settingsHref = '/settings',
  showCreateButton = false,
  onCreateEvent,
}: AdminSidebarProps) {
  const t = useT()
  const accountName = userName || t('workspace.layout.navbar.defaultUser')
  const accountInitials = initialsOf(userName)
  // Organization context (informational header) — distinct from the signed-in account.
  const orgName = organizationName || accountName
  const orgSub = organizationInn ? `${t('workspace.layout.navbar.inn')} ${organizationInn}` : null
  const translatedDefaultNavigation = useMemo(
    (): NavigationGroup[] => [
      {
        items: [
          {
            href: '/dashboard',
            label: t('workspace.layout.navigation.dashboard'),
            icon: <LayoutDashboard className="size-5" />,
            end: true,
          },
        ],
      },
      {
        label: t('workspace.layout.navigationGroups.management'),
        items: [
          {
            href: '/my-events',
            label: t('workspace.layout.navigation.myEvents'),
            icon: <CalendarDays className="size-5" />,
          },
          {
            href: '/tasks/boards',
            label: t('workspace.layout.navigation.tasks'),
            icon: <KanbanSquare className="size-5" />,
          },
          {
            href: '/users',
            label: t('workspace.layout.navigation.users'),
            icon: <Users className="size-5" />,
          },
        ],
      },
      {
        label: t('workspace.layout.navigationGroups.system'),
        items: [
          {
            href: '/settings',
            label: t('workspace.layout.navigation.settings'),
            icon: <Settings className="size-5" />,
          },
        ],
      },
    ],
    [t]
  )
  const navigation = useMemo(
    () => navigationProp ?? translatedDefaultNavigation,
    [navigationProp, translatedDefaultNavigation]
  )
  // Groups flagged pinBottom are pushed to the bottom of the rail via a spacer.
  const firstBottomIndex = navigation.findIndex(group => group.pinBottom)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-border bg-secondary',
          collapsed ? 'w-[64px]' : 'w-[232px]'
        )}
      >
        {/* Шапка с логотипом */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'relative flex h-[52px] items-center',
              collapsed ? 'justify-center px-2' : 'justify-between px-4'
            )}
          >
            <a
              href="/dashboard"
              className={cn(
                'flex items-center gap-3 rounded-xl transition-opacity hover:opacity-80',
                collapsed && 'justify-center'
              )}
            >
              <img
                src={collapsed ? '/icon.svg' : '/logo.svg'}
                alt="EventFlow"
                className={cn(
                  'transition-[width,height,opacity] duration-200',
                  collapsed ? 'size-8' : 'h-7'
                )}
              />
            </a>

            {!collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onCollapsedChange(true)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={t('workspace.layout.sidebar.collapse')}
                  >
                    <ChevronsLeft className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('workspace.layout.sidebar.collapse')}</TooltipContent>
              </Tooltip>
            )}

            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onCollapsedChange(false)}
                    className="absolute -right-3 top-[27px] z-40 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={t('workspace.layout.sidebar.expand')}
                  >
                    <ChevronsRight className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('workspace.layout.sidebar.expand')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Организация — переключатель (если членств 2+) либо инфо-блок */}
        <div className={cn('shrink-0', collapsed ? 'flex justify-center px-2 pt-2' : 'px-3.5 pt-2')}>
          <WorkspaceOrgSwitcher
            collapsed={collapsed}
            activeOrganizationId={organizationId}
            fallbackName={orgName}
            fallbackLogo={organizationLogo}
            fallbackSub={orgSub}
          />
        </div>

        {/* Создать событие */}
        {showCreateButton && (
          <div className={cn('shrink-0', collapsed ? 'flex justify-center px-2 pt-2' : 'px-3.5 pt-2.5')}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onCreateEvent}
                    className="flex size-9 items-center justify-center rounded-md bg-foreground text-background transition-opacity hover:opacity-90"
                    aria-label={t('workspace.layout.actions.createEvent')}
                  >
                    <Plus className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('workspace.layout.actions.createEvent')}</TooltipContent>
              </Tooltip>
            ) : (
              <button
                type="button"
                onClick={onCreateEvent}
                className="flex w-full items-center justify-between rounded-md bg-foreground px-3 py-2 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" />
                  {t('workspace.layout.actions.createEvent')}
                </span>
                <kbd className="rounded-[3px] border border-background/25 bg-background/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-background/90">
                  N
                </kbd>
              </button>
            )}
          </div>
        )}

        {/* Навигация */}
        <nav
          className={cn(
            'custom-scrollbar flex flex-1 flex-col gap-1.5 overflow-y-auto',
            collapsed ? 'items-center px-2 py-3.5' : 'p-3.5'
          )}
        >
          {navigation.map((group, groupIndex) => (
            <Fragment key={groupIndex}>
              {firstBottomIndex > 0 && groupIndex === firstBottomIndex && (
                <div className="flex-1" aria-hidden />
              )}
              <div className={cn(collapsed && 'w-full flex flex-col items-center')}>
              {group.label && !collapsed ? (
                <div className="mb-1 mt-5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground first:mt-0">
                  {group.label}
                </div>
              ) : group.label && collapsed ? (
                <Separator className="my-3" />
              ) : null}

              <div
                className={cn(
                  'space-y-0.5',
                  collapsed && 'flex flex-col items-center gap-2 space-y-0'
                )}
              >
                {group.items.map(item => {
                  const linkContent = (isActive: boolean) => (
                    <>
                      <span
                        className={cn(
                          'flex shrink-0 items-center justify-center transition-colors',
                          isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      >
                        {item.icon ?? <LayoutDashboard className="size-5" />}
                      </span>

                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between overflow-hidden">
                          <span
                            className={cn(
                              'truncate text-[13px] tracking-[-0.005em] transition-colors',
                              isActive
                                ? 'font-semibold text-foreground'
                                : 'font-medium text-muted-foreground group-hover:text-foreground'
                            )}
                          >
                            {item.label}
                          </span>

                          {item.badge ? (
                            <Badge
                              variant={isActive ? 'default' : 'secondary'}
                              className="ml-2 h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                            >
                              {item.badge}
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </>
                  )

                  const linkClasses = (isActive: boolean) =>
                    cn(
                      'group relative flex items-center rounded-md border transition-colors [&_svg]:size-4',
                      collapsed ? 'size-9 justify-center' : 'gap-2.5 px-2.5 py-[7px]',
                      isActive
                        ? 'border-border bg-card text-foreground shadow-[0_1px_2px_rgba(14,14,13,0.04)]'
                        : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
                      item.disabled && 'pointer-events-none opacity-50'
                    )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.href}
                            end={item.end}
                            className={({ isActive }) => linkClasses(isActive)}
                          >
                            {({ isActive }) => linkContent(isActive)}
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          {item.label}
                          {item.badge ? (
                            <Badge className="h-5 px-1.5 text-[10px]">{item.badge}</Badge>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.end}
                      className={({ isActive }) => linkClasses(isActive)}
                    >
                      {({ isActive }) => linkContent(isActive)}
                    </NavLink>
                  )
                })}
              </div>
              </div>
            </Fragment>
          ))}
        </nav>

        {/* Подвал */}
        <div
          className={cn(
            'mt-auto space-y-2 border-t border-border',
            collapsed ? 'px-2 py-3.5' : 'p-3.5'
          )}
        >
          {sidebarFooter && !collapsed && (
            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground shadow-[0_1px_2px_rgba(14,14,13,0.04)]">
              {sidebarFooter}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <button
                  type="button"
                  aria-label={accountName}
                  className="mx-auto flex size-9 items-center justify-center rounded-md transition-colors hover:bg-card/60"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">
                      {accountInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-card/60"
                >
                  <Avatar className="size-7">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">
                      {accountInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
                      {accountName}
                    </div>
                    {(accountRole || userEmail) && (
                      <div className="truncate font-mono text-[10.5px] text-muted-foreground">
                        {accountRole || userEmail}
                      </div>
                    )}
                  </div>
                  <MoreVertical className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{accountName}</span>
                  {userEmail && <span className="text-xs text-muted-foreground">{userEmail}</span>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={profileHref} className="cursor-pointer">
                  <User className="mr-2 size-4" />
                  {t('workspace.layout.navbar.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={settingsHref} className="cursor-pointer">
                  <Settings className="mr-2 size-4" />
                  {t('workspace.layout.navbar.settings')}
                </Link>
              </DropdownMenuItem>
              {/* Сотрудник организации — это тот же человек, что и участник
                  событий: обратный путь в личный кабинет должен быть виден. */}
              <DropdownMenuItem asChild>
                <a
                  href={`${PUBLIC_SITE_URL.replace(/\/$/, '')}/profile`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <ExternalLink className="mr-2 size-4" />
                  {t('workspace.layout.navbar.personalCabinet')}
                </a>
              </DropdownMenuItem>
              {onLogout && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" />
                    {t('workspace.layout.navbar.logout')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  )
}
