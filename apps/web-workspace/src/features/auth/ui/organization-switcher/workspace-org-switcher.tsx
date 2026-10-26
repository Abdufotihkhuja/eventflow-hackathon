import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { MyOrganizationMembership } from '@api/index'
import { cn } from '@shared/lib/cn'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@shared/ui'

import { useMyOrganizations } from '../../api/use-my-organizations'
import { useEnterWorkspace } from '../../api/use-enter-workspace'

type WorkspaceOrgSwitcherProps = {
  collapsed: boolean
  /** Id of the workspace the current session is in (marked as active). */
  activeOrganizationId?: string
  /** Fallbacks shown while memberships load or when there is a single org. */
  fallbackName: string
  fallbackLogo?: string
  fallbackSub?: string | null
}

function initialsOf(name?: string): string {
  if (!name) return 'EF'
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('') || 'EF'
  )
}

/**
 * Organization context in the sidebar header. Read-only when the account belongs
 * to a single organization; a dropdown switcher when it has 2+ active memberships.
 * Selecting another organization mints a workspace session
 * (POST /me/organizations/:id/session) and reloads into its dashboard.
 *
 * Suspended/removed memberships never appear — the backend already filters them
 * out of GET /me/organizations.
 */
export function WorkspaceOrgSwitcher({
  collapsed,
  activeOrganizationId,
  fallbackName,
  fallbackLogo,
  fallbackSub,
}: WorkspaceOrgSwitcherProps) {
  const t = useT()
  const { data: memberships } = useMyOrganizations()
  const enterWorkspace = useEnterWorkspace()

  const canSwitch = (memberships?.length ?? 0) >= 2

  const handleSelect = async (membership: MyOrganizationMembership) => {
    if (membership.organizationId === activeOrganizationId) return
    if (enterWorkspace.isPending) return
    await enterWorkspace.mutateAsync(membership.organizationId)
    // Full reload re-bootstraps the session/actor cleanly for the new workspace.
    window.location.assign('/dashboard')
  }

  // ── Read-only (single org / still loading) ──────────────────────────────────
  if (!canSwitch) {
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-card">
              <Avatar className="size-6 rounded-[4px]">
                <AvatarImage src={fallbackLogo} className="rounded-[4px]" />
                <AvatarFallback className="rounded-[4px] bg-brand-soft text-[10px] font-bold text-brand-soft-foreground">
                  {initialsOf(fallbackName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{fallbackName}</TooltipContent>
        </Tooltip>
      )
    }

    return (
      <div className="flex w-full items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2 text-left">
        <OrgAvatar logo={fallbackLogo} name={fallbackName} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {fallbackName}
          </div>
          {fallbackSub ? (
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {fallbackSub}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // ── Switcher (2+ memberships) ───────────────────────────────────────────────
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <button
            type="button"
            aria-label={t('security.workspace.switchTitle')}
            className="flex size-9 items-center justify-center rounded-md border border-border bg-card transition-colors hover:border-primary/40 hover:bg-secondary/50"
          >
            <Avatar className="size-6 rounded-[4px]">
              <AvatarImage src={fallbackLogo} className="rounded-[4px]" />
              <AvatarFallback className="rounded-[4px] bg-brand-soft text-[10px] font-bold text-brand-soft-foreground">
                {initialsOf(fallbackName)}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-secondary/50"
          >
            <OrgAvatar logo={fallbackLogo} name={fallbackName} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {fallbackName}
              </div>
              {fallbackSub ? (
                <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {fallbackSub}
                </div>
              ) : null}
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t('security.workspace.switchTitle')}
        </DropdownMenuLabel>
        {memberships?.map(membership => {
          const isActive = membership.organizationId === activeOrganizationId
          const isPending =
            enterWorkspace.isPending &&
            enterWorkspace.variables === membership.organizationId
          const roleLabel =
            membership.roleName ??
            (membership.isOwner
              ? t('security.workspace.organizationRole')
              : t('security.workspace.memberRole'))

          return (
            <DropdownMenuItem
              key={membership.membershipId}
              onSelect={event => {
                event.preventDefault()
                void handleSelect(membership)
              }}
              disabled={enterWorkspace.isPending}
              className="gap-2.5 py-2"
            >
              <OrgAvatar logo={getMediaUrl(membership.logoUrl)} name={membership.name} small />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-foreground">
                  {membership.name}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{roleLabel}</div>
              </div>
              {isPending ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : isActive ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function OrgAvatar({
  logo,
  name,
  small,
}: {
  logo?: string | null
  name: string
  small?: boolean
}) {
  return (
    <Avatar className={cn('shrink-0 rounded-[5px]', small ? 'size-6' : 'size-7')}>
      <AvatarImage src={logo ?? undefined} className="rounded-[5px]" />
      <AvatarFallback
        className={cn(
          'rounded-[5px] bg-brand-soft font-bold text-brand-soft-foreground',
          small ? 'text-[10px]' : 'text-[11px]'
        )}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
