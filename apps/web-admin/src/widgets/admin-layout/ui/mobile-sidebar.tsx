import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { LayoutDashboard, LogOut } from 'lucide-react'

import { cn } from '@shared/lib/cn'
import { Badge, Sheet, SheetContent, SheetHeader, SheetTitle } from '@shared/ui'

import { type NavigationGroup } from './admin-sidebar'

type MobileSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  navigation: NavigationGroup[]
  sidebarFooter?: ReactNode
  onLogout?: () => void
}

export function MobileSidebar({
  open,
  onOpenChange,
  navigation,
  sidebarFooter,
  onLogout,
}: MobileSidebarProps) {
  const t = useT()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] border-border bg-card p-0">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-3">
            <img src="/logo.svg" alt="EventFlow" className="h-7" />
          </SheetTitle>
        </SheetHeader>

        <nav className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navigation.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.label && (
                <div className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map(item => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.end}
                    onClick={() => onOpenChange(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent',
                        item.disabled && 'pointer-events-none opacity-50'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'flex shrink-0 items-center justify-center transition-colors',
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          {item.icon ?? <LayoutDashboard className="size-5" />}
                        </span>
                        <span
                          className={cn(
                            'flex-1 truncate transition-colors',
                            isActive
                              ? 'font-medium text-foreground'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <Badge
                            variant={isActive ? 'default' : 'secondary'}
                            className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-border p-3">
          {sidebarFooter && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {sidebarFooter}
            </div>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onLogout()
                onOpenChange(false)
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              <span>{t('admin.layout.shell.logout')}</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
