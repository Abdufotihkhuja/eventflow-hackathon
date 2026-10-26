/**
 * Колонки таблицы пользователей для Super Admin
 * Согласно API: GET /api/v1/super-admin/users
 */

import type { ColumnDef } from '@tanstack/react-table'
import { formatDate, type Locale, type Translator } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'
import {
  MoreHorizontal,
  Loader2,
  Eye,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react'

import type { AdminUser } from '@api/services/superAdmin.types'
import { formatUserName, getUserInitials } from '@shared/lib'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

type ActionsProps = {
  user: AdminUser
  t: Translator
  locale: Locale
  onView: (user: AdminUser) => void
  onArchive: (user: AdminUser) => void
  onRestore: (user: AdminUser) => void
  onHardDelete: (user: AdminUser) => void
  isPending?: boolean
}

// ================================
// Actions Cell — зависит от состояния записи.
// Активный: Просмотр, Архивировать. Архивированный: Просмотр, Восстановить,
// Hard delete. Hard delete доступен ТОЛЬКО для архивированных и открывает
// защищённый диалог с вводом фразы — не удаляет в один клик.
// ================================

function ActionsCell({
  user,
  onView,
  onArchive,
  onRestore,
  onHardDelete,
  isPending,
}: ActionsProps) {
  const t = useT()
  const isArchived = !!user.deletedAt

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="size-8 p-0" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreHorizontal className="size-4" />
          )}
          <span className="sr-only">{t('admin.actions.openMenu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(user)}>
          <Eye className="mr-2 size-4" />
          {t('admin.actions.viewDetails')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isArchived ? (
          <>
            <DropdownMenuItem onClick={() => onRestore(user)}>
              <RotateCcw className="mr-2 size-4" />
              {t('admin.actions.restoreUser')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHardDelete(user)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              {t('admin.actions.hardDeleteUser')}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={() => onArchive(user)}
            className="text-destructive focus:text-destructive"
          >
            <Archive className="mr-2 size-4" />
            {t('admin.actions.archiveUser')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ================================
// Create Columns
// ================================

export function createUsersColumns(actions: Omit<ActionsProps, 'user'>): ColumnDef<AdminUser>[] {
  return [
    {
      accessorKey: 'user',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.user')} />
      ),
      cell: ({ row }) => {
        const user = row.original
        const fullName = formatUserName(user.firstName, user.lastName)
        const initials = getUserInitials(user.firstName, user.lastName)

        return (
          <button
            onClick={() => actions.onView(user)}
            className="flex items-center gap-3 text-left hover:opacity-80"
          >
            <Avatar className="size-9">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-muted text-xs font-medium">
                {initials || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium hover:underline">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </button>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'organization',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={actions.t('admin.tables.columns.organization')}
        />
      ),
      cell: ({ row }) => {
        const { organizationName, roleName } = row.original
        if (!organizationName) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <div className="min-w-0">
            <p className="truncate text-sm">{organizationName}</p>
            {roleName ? (
              <p className="truncate text-xs text-muted-foreground">{roleName}</p>
            ) : null}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'authProvider',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.provider')} />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-medium">
          {row.original.authProvider}
        </Badge>
      ),
    },
    {
      accessorKey: 'isEmailVerified',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.email')} />
      ),
      cell: ({ row }) => {
        const verified = row.original.isEmailVerified
        return (
          <StatusPill tone={verified ? 'success' : 'warning'}>
            {verified
              ? actions.t('admin.statuses.verified')
              : actions.t('admin.statuses.notVerified')}
          </StatusPill>
        )
      },
    },
    {
      id: 'state',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.state')} />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original
        if (!user.deletedAt) {
          return (
            <StatusPill tone={statusPillTone('active')}>
              {actions.t('admin.statuses.active')}
            </StatusPill>
          )
        }
        return (
          <div className="min-w-0 space-y-0.5">
            <StatusPill tone={statusPillTone('archived')}>
              {actions.t('admin.statuses.archived')}
            </StatusPill>
            <p className="truncate text-xs text-muted-foreground">
              {formatDate(user.deletedAt, actions.locale)}
              {user.archivedByName ? ` · ${user.archivedByName}` : ''}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.registration')} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt, actions.locale)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsCell user={row.original} {...actions} />,
    },
  ]
}
