import { useMemo, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  KanbanSquare,
} from 'lucide-react'

import { cn } from '@shared/lib/cn'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/ui'

export type NavigationItem = {
  href: string
  label: string
  icon?: ReactNode
  end?: boolean
  badge?: string | number
  /** Marks a count that should read as urgent (e.g. open moderation cases). */
  alert?: boolean
  disabled?: boolean
}

export type NavigationGroup = {
  label?: string
  items: NavigationItem[]
}

type AdminSidebarProps = {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  navigation?: NavigationGroup[]
  sidebarFooter?: ReactNode
  onLogout?: () => void
}

/**
 * Super-admin sidebar. Per the Eventflow design system the admin shell is a
 * fixed graphite (ink-900) rail with an ember active state and an ADMIN tag —
 * deliberately denser and more "controlled" than the organizer cabinet's light
 * sidebar. The dark chrome is intentional in both light and dark themes.
 */
export function AdminSidebar({
  collapsed,
  onCollapsedChange,
  navigation: navigationProp,
  sidebarFooter,
  onLogout,
}: AdminSidebarProps) {
  const t = useT()
  const defaultNavigation = useMemo<NavigationGroup[]>(
    () => [
      {
        items: [
          {
            href: '/admin',
            label: t('navigation.dashboard'),
            icon: <LayoutDashboard className="size-[18px]" />,
            end: true,
          },
        ],
      },
      {
        label: t('admin.layout.groups.management'),
        items: [
          {
            href: '/admin/events',
            label: t('navigation.events'),
            icon: <CalendarDays className="size-[18px]" />,
          },
          {
            href: '/admin/users',
            label: t('navigation.users'),
            icon: <Users className="size-[18px]" />,
          },
          {
            href: '/admin/organizations',
            label: t('tasks.title'),
            icon: <KanbanSquare className="size-[18px]" />,
          },
        ],
      },
      {
        label: t('admin.layout.groups.system'),
        items: [
          {
            href: '/admin/settings',
            label: t('admin.layout.shell.settings'),
            icon: <Settings className="size-[18px]" />,
          },
        ],
      },
    ],
    [t]
  )
  const navigation = useMemo(
    () => navigationProp ?? defaultNavigation,
    [defaultNavigation, navigationProp]
  )

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-white/[0.07] bg-[#0e0e0d] text-[#fbfbfa]',
          collapsed ? 'w-[64px]' : 'w-[232px]'
        )}
      >
        {/* Brand */}
        <div className="relative shrink-0 border-b border-white/[0.08]">
          <div
            className={cn(
              'relative flex h-14 items-center',
              collapsed ? 'justify-center px-2' : 'justify-between px-4'
            )}
          >
            <a
              href="/admin"
              className={cn(
                'flex items-center gap-2 transition-opacity hover:opacity-80',
                collapsed && 'justify-center'
              )}
            >
              <img
                src="/favicon.svg"
                alt="EventFlow"
                className={cn('shrink-0 brightness-0 invert', collapsed ? 'size-7' : 'size-5')}
              />
              {!collapsed && (
                <>
                  <span className="text-sm font-extrabold tracking-[-0.02em] text-white">
                    Eventflow
                  </span>
                  <span className="rounded-[3px] bg-primary px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
                    Admin
                  </span>
                </>
              )}
            </a>

            {!collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onCollapsedChange(true)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label={t('admin.layout.shell.collapse')}
                  >
                    <ChevronsLeft className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.layout.shell.collapse')}</TooltipContent>
              </Tooltip>
            )}

            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onCollapsedChange(false)}
                    className="absolute -right-3 top-[27px] z-40 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#1a1a18] text-white/70 shadow-sm transition-colors hover:bg-[#262624] hover:text-white"
                    aria-label={t('admin.layout.shell.expand')}
                  >
                    <ChevronsRight className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('admin.layout.shell.expand')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'custom-scrollbar flex flex-1 flex-col gap-0.5 overflow-y-auto',
            collapsed ? 'items-center px-2 py-3' : 'p-2.5'
          )}
        >
          {navigation.map((group, groupIndex) => (
            <div key={groupIndex} className={cn('w-full', collapsed && 'flex flex-col items-center')}>
              {group.label && !collapsed ? (
                <div className="mb-1.5 mt-5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40 first:mt-1">
                  {group.label}
                </div>
              ) : group.label && collapsed ? (
                <div className="my-2 h-px w-7 bg-white/10" />
              ) : null}

              <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center gap-2 space-y-0')}>
                {group.items.map(item => {
                  const linkContent = (isActive: boolean) => (
                    <>
                      <span className="flex shrink-0 items-center justify-center">
                        {item.icon ?? <LayoutDashboard className="size-[18px]" />}
                      </span>

                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between overflow-hidden">
                          <span className="truncate">{item.label}</span>

                          {item.badge != null && (
                            <span
                              className={cn(
                                'ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-semibold',
                                item.alert
                                  ? 'bg-destructive text-white'
                                  : isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white/10 text-white/80'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )

                  const linkClasses = (isActive: boolean) =>
                    cn(
                      'group relative flex items-center rounded-[5px] text-[12.5px] font-medium transition-colors',
                      collapsed ? 'size-10 justify-center' : 'gap-2.5 px-2.5 py-[7px]',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-white/70 hover:bg-white/[0.07] hover:text-white',
                      item.disabled && 'pointer-events-none opacity-40'
                    )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <NavLink to={item.href} end={item.end} className={({ isActive }) => linkClasses(isActive)}>
                            {({ isActive }) => linkContent(isActive)}
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          {item.label}
                          {item.badge != null && (
                            <span className="font-mono text-[10px]">{item.badge}</span>
                          )}
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
          ))}
        </nav>

        {/* Footer */}
        <div className={cn('mt-auto space-y-2.5 border-t border-white/[0.08]', collapsed ? 'px-2 py-3' : 'p-2.5')}>
          {sidebarFooter && !collapsed && (
            <div className="rounded-lg bg-white/[0.05] p-3 text-xs text-white/60">{sidebarFooter}</div>
          )}

          {onLogout &&
            (collapsed ? (
              <div className="flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onLogout}
                      aria-label={t('admin.layout.shell.logout')}
                      className="flex size-10 items-center justify-center rounded-[5px] text-white/60 transition-colors hover:bg-destructive/20 hover:text-white"
                    >
                      <LogOut className="size-[18px]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('admin.layout.shell.logout')}</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-2 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-destructive/20 hover:text-white"
              >
                <LogOut className="size-4" />
                <span>{t('admin.layout.shell.logout')}</span>
              </button>
            ))}
        </div>
      </aside>
    </TooltipProvider>
  )
}
