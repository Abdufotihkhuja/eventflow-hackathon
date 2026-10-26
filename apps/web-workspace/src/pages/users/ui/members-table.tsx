import { Edit, Loader2, Mail, MoreVertical, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import {
  getOrganizationRoleLabel,
  MemberStatus,
  type OrganizationMember,
  type OrganizationRole,
} from '@api/services'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

function isOwnerRole(role?: Pick<OrganizationRole, 'name'> | null): boolean {
  return ['owner', 'владелец'].includes((role?.name ?? '').toLowerCase())
}

function initialsOf(first?: string, last?: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'
}

const GRID =
  'grid grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)_172px_120px_104px_44px] items-center gap-4'

type MembersTableProps = {
  members: OrganizationMember[]
  roles: OrganizationRole[]
  currentMemberId: string | null
  canUpdate: boolean
  canDelete: boolean
  canManageRoles: boolean
  rowPendingId?: string | null
  onChangeRole: (member: OrganizationMember, roleId: string) => void
  onEdit: (member: OrganizationMember) => void
  onManagePermissions: (member: OrganizationMember) => void
  onResendInvite: (member: OrganizationMember) => void
  onToggleStatus: (member: OrganizationMember) => void
  onDelete: (member: OrganizationMember) => void
}

export function MembersTable({
  members,
  roles,
  currentMemberId,
  canUpdate,
  canDelete,
  canManageRoles,
  rowPendingId,
  onChangeRole,
  onEdit,
  onManagePermissions,
  onResendInvite,
  onToggleStatus,
  onDelete,
}: MembersTableProps) {
  const { t, locale } = useI18n()
  const roleLabel = getOrganizationRoleLabel(t)

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[840px]">
        {/* Header */}
        <div
          className={`${GRID} border-b border-border bg-secondary/60 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}
        >
          <span>{t('users.page.colName')}</span>
          <span>{t('users.page.colEmail')}</span>
          <span>{t('users.page.colRole')}</span>
          <span>{t('users.page.colAdded')}</span>
          <span>{t('users.page.colStatus')}</span>
          <span className="sr-only">{t('users.page.openMenu')}</span>
        </div>

        {members.map(member => {
          const isSelf = currentMemberId !== null && member.id === currentMemberId
          const owner = isOwnerRole(member.role)
          const protectedRow = owner || isSelf
          const isInvited = member.status === MemberStatus.INVITED
          const isSuspended = member.status === MemberStatus.SUSPENDED
          const roleChangeable = canUpdate && !protectedRow
          const rowBusy = rowPendingId === member.id

          const actions = [
            canUpdate && { key: 'edit', label: t('users.page.editEmployee'), icon: Edit, onClick: () => onEdit(member) },
            canManageRoles && {
              key: 'access',
              label: t('users.page.configureAccessAction'),
              icon: ShieldCheck,
              onClick: () => onManagePermissions(member),
            },
            canUpdate && isInvited && {
              key: 'resend',
              label: t('users.page.sendInviteAgain'),
              icon: Mail,
              onClick: () => onResendInvite(member),
            },
            canUpdate && !protectedRow && {
              key: 'toggle',
              label: isSuspended ? t('users.page.unblock') : t('users.page.block'),
              icon: isSuspended ? ShieldCheck : ShieldOff,
              onClick: () => onToggleStatus(member),
            },
          ].filter(Boolean) as { key: string; label: string; icon: typeof Edit; onClick: () => void }[]

          const canDeleteRow = canDelete && !protectedRow
          const hasMenu = actions.length > 0 || canDeleteRow

          return (
            <div
              key={member.id}
              className={`${GRID} border-b border-border px-5 py-3.5 last:border-b-0`}
            >
              {/* Name */}
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={getMediaUrl(member.avatarUrl)} alt="" />
                  <AvatarFallback className="bg-secondary text-[11px] font-medium text-foreground">
                    {initialsOf(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {`${member.firstName} ${member.lastName}`.trim() || '—'}
                  </div>
                  {isSelf && (
                    <div className="text-[11px] font-medium text-primary">{t('users.page.you')}</div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="truncate font-mono text-[12.5px] text-muted-foreground">
                {member.email}
              </div>

              {/* Role */}
              <div>
                {roleChangeable ? (
                  <Select
                    value={member.roleId}
                    onValueChange={value => onChangeRole(member, value)}
                    disabled={rowBusy}
                  >
                    <SelectTrigger className="h-8 text-[13px]">
                      <SelectValue placeholder={roleLabel(member.role)} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {roleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-[13px] text-foreground">{roleLabel(member.role)}</span>
                )}
              </div>

              {/* Added */}
              <div className="font-mono text-[12px] text-muted-foreground">
                {member.createdAt
                  ? formatDate(new Date(member.createdAt), locale, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </div>

              {/* Status */}
              <div>
                <StatusPill tone={statusPillTone(member.status)} size="sm">
                  {member.status === MemberStatus.ACTIVE
                    ? t('users.status.active')
                    : member.status === MemberStatus.INVITED
                      ? t('users.status.invited')
                      : t('users.status.suspended')}
                </StatusPill>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                {rowBusy ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : hasMenu ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={t('users.page.openMenu')}>
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {actions.map(action => (
                        <DropdownMenuItem key={action.key} onClick={action.onClick}>
                          <action.icon className="mr-2 size-4" />
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                      {canDeleteRow && (
                        <>
                          {actions.length > 0 && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            onClick={() => onDelete(member)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
