import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { Bell, ChevronRight, Menu, Settings, User } from 'lucide-react'

import { ThemeToggle } from '@features/theme'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/ui'

import { LanguageSwitcher } from './language-switcher'

export type BreadcrumbItem = {
  label: string
  href?: string
}

type AdminNavbarProps = {
  title?: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  onMenuClick?: () => void
  userAvatar?: string
  userName?: string
  userEmail?: string
  /** ИНН организации */
  organizationInn?: string | null
  notificationCount?: number
  onLogout?: () => void
  profileHref?: string
  settingsHref?: string
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onNotificationsClick?: () => void
}

function toDisplayString(value: string | undefined | null | unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export function AdminNavbar({
  title,
  description,
  breadcrumbs,
  actions,
  onMenuClick,
  userAvatar,
  userName = 'Admin User',
  userEmail,
  organizationInn,
  notificationCount = 0,
  onLogout,
  profileHref,
  settingsHref,
  onProfileClick,
  onSettingsClick,
  onNotificationsClick,
}: AdminNavbarProps) {
  const t = useT()
  const displayName = toDisplayString(userName) || 'Admin User'
  const displayEmail = toDisplayString(userEmail)
  const userInitials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          {/* Кнопка мобильного меню */}
          {onMenuClick && (
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
              <Menu className="size-5" />
              <span className="sr-only">{t('admin.layout.shell.menu')}</span>
            </Button>
          )}

          {/* Хлебные крошки и заголовок */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1 overflow-hidden whitespace-nowrap text-xs text-muted-foreground">
                {breadcrumbs.map((item, index) => (
                  <div key={index} className="flex shrink-0 items-center gap-1 last:shrink last:min-w-0">
                    {item.href ? (
                      <Link to={item.href} className="transition-colors hover:text-foreground">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="truncate font-medium text-foreground">{item.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && <ChevronRight className="size-3 shrink-0" />}
                  </div>
                ))}
              </nav>
            )}

            {title && (
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</h1>
                {description && (
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    — {description}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="flex shrink-0 items-center gap-1">
            {actions}

            {/* ИНН организации */}
            {organizationInn != null && toDisplayString(organizationInn) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
                    <span className="text-muted-foreground/70">{t('admin.tables.columns.inn')}:</span>
                    <span className="font-mono tabular-nums">
                      {toDisplayString(organizationInn)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t('admin.layout.shell.organizationInn')}</TooltipContent>
              </Tooltip>
            )}

            {/* Уведомления */}
            {onNotificationsClick && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={onNotificationsClick}
                  >
                    <Bell className="size-5" />
                    {notificationCount > 0 && (
                      <Badge className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center p-0 text-[10px]">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </Badge>
                    )}
                    <span className="sr-only">{t('admin.layout.shell.notifications')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('admin.layout.shell.notifications')}</TooltipContent>
              </Tooltip>
            )}

            {/* Переключатель темы */}
            <LanguageSwitcher />
            <ThemeToggle />

            {/* Меню пользователя */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 gap-2 rounded-full px-2">
                  <Avatar className="size-7">
                    <AvatarImage src={userAvatar} alt={displayName} />
                    <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline-block">
                    {displayName.split(' ')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    {displayEmail && (
                      <p className="text-xs text-muted-foreground">{displayEmail}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                {(profileHref || settingsHref) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {profileHref && (
                        <DropdownMenuItem asChild>
                          <Link
                            to={profileHref}
                            onClick={onProfileClick}
                            className="cursor-pointer"
                          >
                            <User className="mr-2 size-4" />
                            {t('admin.layout.shell.profile')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {settingsHref && (
                        <DropdownMenuItem asChild>
                          <Link
                            to={settingsHref}
                            onClick={onSettingsClick}
                            className="cursor-pointer"
                          >
                            <Settings className="mr-2 size-4" />
                            {t('admin.layout.shell.settings')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </>
                )}
                {onLogout && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onLogout}
                      className="text-destructive focus:text-destructive"
                    >
                      {t('admin.layout.shell.logout')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
