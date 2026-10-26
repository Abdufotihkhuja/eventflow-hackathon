import { useState } from 'react'
import { Building2, Check, ChevronRight, Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { MyOrganizationMembership } from '@api/index'
import { cn } from '@shared/lib/cn'
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@shared/ui'

import { useEnterWorkspace } from '../../api/use-enter-workspace'

type OrganizationSwitcherProps = {
  memberships: MyOrganizationMembership[]
  /** ID текущей активной организации (для пометки) */
  activeOrganizationId?: string | null
  /** Вызывается после успешного входа в workspace */
  onEntered?: (membership: MyOrganizationMembership) => void
  className?: string
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Список организаций текущего пользователя с входом в выбранный workspace.
 * Переиспользуется на экране после входа (>1 членства) и в переключателе в шапке.
 */
export function OrganizationSwitcher({
  memberships,
  activeOrganizationId,
  onEntered,
  className,
}: OrganizationSwitcherProps) {
  const t = useT()
  const enterWorkspace = useEnterWorkspace()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleSelect = async (membership: MyOrganizationMembership) => {
    if (enterWorkspace.isPending) return
    setPendingId(membership.organizationId)
    try {
      await enterWorkspace.mutateAsync(membership.organizationId)
      onEntered?.(membership)
    } catch {
      setPendingId(null)
    }
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {memberships.map(membership => {
        const isActive = membership.organizationId === activeOrganizationId
        const isPending = pendingId === membership.organizationId && enterWorkspace.isPending
        const logo = getMediaUrl(membership.logoUrl)

        return (
          <li key={membership.membershipId}>
            <button
              type="button"
              onClick={() => handleSelect(membership)}
              disabled={enterWorkspace.isPending}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors',
                'hover:border-primary/40 hover:bg-secondary/50',
                'disabled:cursor-not-allowed disabled:opacity-60',
                isActive && 'border-primary/40 bg-secondary/40'
              )}
            >
              <Avatar className="size-10 shrink-0 rounded-lg">
                {logo ? <AvatarImage src={logo} alt={membership.name} /> : null}
                <AvatarFallback className="rounded-lg bg-muted text-sm font-medium text-muted-foreground">
                  {initialsOf(membership.name) || <Building2 className="size-4" />}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {membership.name}
                  </span>
                  {membership.isOwner ? (
                    <Badge variant="secondary" className="shrink-0 text-[11px]">
                      {t('security.workspace.owner')}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-[13px] text-muted-foreground">
                  {membership.roleName ??
                    (membership.isOwner
                      ? t('security.workspace.organizationRole')
                      : t('security.workspace.memberRole'))}
                </p>
              </div>

              {isPending ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : isActive ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
