import { type ReactNode } from 'react'

import { Bell, ChevronRight, ExternalLink, Menu } from 'lucide-react'
import { useI18n } from '@eventflow/i18n/react'

import { ThemeToggle } from '@features/theme'
import { cn } from '@shared/lib/cn'
import {
  Button,
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
  /** Absolute URL to the organization's public profile on the marketing site. */
  publicProfileUrl?: string
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onNotificationsClick?: () => void
}

export function AdminNavbar({
  title,
  breadcrumbs,
  actions,
  onMenuClick,
  notificationCount = 0,
  publicProfileUrl,
  onNotificationsClick,
}: AdminNavbarProps) {
  const { t } = useI18n()

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="flex h-[52px] items-center gap-3 px-4 sm:px-6">
          {/* Кнопка мобильного меню */}
          {onMenuClick && (
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
              <Menu className="size-5" />
              <span className="sr-only">{t('workspace.layout.navbar.menu')}</span>
            </Button>
          )}

          {/* Хлебные крошки / заголовок */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <div
                      key={index}
                      className="flex shrink-0 items-center gap-1.5 last:min-w-0 last:shrink"
                    >
                      {index > 0 && (
                        <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
                      )}
                      {item.href && !isLast ? (
                        <a
                          href={item.href}
                          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span
                          className={cn(
                            'truncate text-[13px]',
                            isLast ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </nav>
            ) : title ? (
              <span className="truncate text-[13px] font-semibold text-foreground">{title}</span>
            ) : null}
          </div>

          {/* Действия */}
          <div className="flex shrink-0 items-center gap-1">
            {actions}

            {publicProfileUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={publicProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="hidden lg:inline">
                      {t('workspace.layout.navbar.viewPublicProfile')}
                    </span>
                  </a>
                </TooltipTrigger>
                <TooltipContent>{t('workspace.layout.navbar.viewPublicProfile')}</TooltipContent>
              </Tooltip>
            )}

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
                      <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary ring-2 ring-background" />
                    )}
                    <span className="sr-only">{t('workspace.layout.navbar.notifications')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('workspace.layout.navbar.notifications')}</TooltipContent>
              </Tooltip>
            )}

            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
