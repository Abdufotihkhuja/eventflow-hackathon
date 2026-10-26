import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import { LayoutDashboard, LogOut } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

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
      <SheetContent side="left" className="w-[280px] border-border bg-secondary p-0">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-3">
            <img src="/logo.svg" alt="EventFlow" className="h-7" />
          </SheetTitle>
        </SheetHeader>

        <nav className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navigation.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.label && (
                <div className="mb-1 mt-5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground first:mt-0">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.end}
                    onClick={() => onOpenChange(false)}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-md border px-2.5 py-[7px] text-[13px] transition-colors [&_svg]:size-4',
                        isActive
                          ? 'border-border bg-card text-foreground shadow-[0_1px_2px_rgba(14,14,13,0.04)]'
                          : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
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
                              ? 'text-foreground'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          {item.icon ?? <LayoutDashboard className="size-5" />}
                        </span>
                        <span
                          className={cn(
                            'flex-1 truncate transition-colors',
                            isActive
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-muted-foreground group-hover:text-foreground'
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
            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground shadow-[0_1px_2px_rgba(14,14,13,0.04)]">
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
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              <span>{t('workspace.layout.sidebar.logout')}</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
