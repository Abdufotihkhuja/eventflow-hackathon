/**
 * Компонент карточки сотрудника для списка
 */

import {
  MoreVertical,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Clock,
  UserX,
  Settings,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { OrganizationMember, OrganizationRole } from '@api/services'
import { MemberStatus, MEMBER_STATUS_LABEL_KEYS } from '@api/services'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui'

type UserCardProps = {
  member: OrganizationMember
  roles: OrganizationRole[]
  onEdit: (member: OrganizationMember) => void
  onDelete: (member: OrganizationMember) => void
  onToggleStatus: (member: OrganizationMember) => void
  onResendInvite: (member: OrganizationMember) => void
  onManagePermissions: (member: OrganizationMember) => void
}

export function UserCard({
  member,
  roles,
  onEdit,
  onDelete,
  onToggleStatus,
  onResendInvite,
  onManagePermissions,
}: UserCardProps) {
  const t = useT()
  const getInitials = () => {
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
  }

  const getStatusBadgeVariant = () => {
    switch (member.status) {
      case MemberStatus.ACTIVE:
        return 'default'
      case MemberStatus.INVITED:
        return 'secondary'
      case MemberStatus.SUSPENDED:
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = () => {
    switch (member.status) {
      case MemberStatus.ACTIVE:
        return <ShieldCheck className="h-3 w-3" />
      case MemberStatus.INVITED:
        return <Clock className="h-3 w-3" />
      case MemberStatus.SUSPENDED:
        return <ShieldAlert className="h-3 w-3" />
      default:
        return <UserX className="h-3 w-3" />
    }
  }

  const roleName =
    roles.find(r => r.id === member.roleId)?.name || member.role?.name || t('users.page.notSpecified')
  const fullName = `${member.firstName} ${member.lastName}`

  return (
    <Card className="group relative overflow-hidden border border-border bg-card shadow-sm transition duration-300 hover:shadow-md">
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-border">
              {member.avatarUrl && (
                <AvatarImage src={getMediaUrl(member.avatarUrl)} alt={fullName} />
              )}
              <AvatarFallback className="bg-brand-secondary/10 text-brand-secondary font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate group-hover:text-brand-secondary transition-colors">
                {fullName}
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground truncate">
                  {member.position || t('users.page.notSpecified')}
              </p>
              {member.department && (
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5 truncate">
                  {member.department}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('admin.actions.openMenu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(member)}>{t('actions.edit')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManagePermissions(member)}>
                <Settings className="mr-2 h-4 w-4" />
                {t('users.page.configureAccess')}
              </DropdownMenuItem>
              {member.status === MemberStatus.INVITED && (
                <DropdownMenuItem onClick={() => onResendInvite(member)}>
                  {t('users.page.resendInvite')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onToggleStatus(member)}>
                {member.status === MemberStatus.SUSPENDED
                  ? t('users.page.unblock')
                  : t('users.page.block')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(member)} className="text-destructive">
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact info */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{member.phone}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Badge
            variant="outline"
            className="border-brand-secondary/30 bg-brand-secondary/10 text-brand-secondary"
          >
            {roleName}
          </Badge>
          <Badge variant={getStatusBadgeVariant()} className="gap-1">
            {getStatusIcon()}
            {t(MEMBER_STATUS_LABEL_KEYS[member.status])}
          </Badge>
        </div>

        {/* Footer info */}
        {member.createdAt && (
          <div className="mt-3 text-xs text-muted-foreground dark:text-muted-foreground">
            {t('users.page.added')}:{' '}
            {new Date(member.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
