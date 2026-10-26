/**
 * Колонки таблицы организаций для Super Admin
 * Согласно API: GET /api/v1/super-admin/organizations
 */

import type { ColumnDef } from '@tanstack/react-table'
import { formatDate, type Locale, type Translator } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'
import {
  MoreHorizontal,
  Check,
  X as XIcon,
  Loader2,
  Users,
  Eye,
  Archive,
  CreditCard,
  RotateCcw,
  Trash2,
} from 'lucide-react'

import type { AdminOrganization } from '@api/services/superAdmin.types'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
  org: AdminOrganization
  t: Translator
  locale: Locale
  onView: (org: AdminOrganization) => void
  onBilling: (org: AdminOrganization) => void
  onApprove: (org: AdminOrganization) => void
  onReject: (org: AdminOrganization) => void
  onArchive: (org: AdminOrganization) => void
  onRestore: (org: AdminOrganization) => void
  onHardDelete: (org: AdminOrganization) => void
  isPending?: boolean
}

// ================================
// Status Badge
// ================================

const statusLabelKeys: Record<string, string> = {
  PENDING: 'admin.statuses.pendingVerification',
  APPROVED: 'admin.statuses.approvedFeminine',
  REJECTED: 'admin.statuses.rejectedFeminine',
}

// ================================
// Actions Cell
// ================================

// Hard delete доступен ТОЛЬКО для архивированных и открывает защищённый диалог
// с вводом `DELETE <название>` — не удаляет в один клик из строки.
function ActionsCell({
  org,
  onView,
  onBilling,
  onApprove,
  onReject,
  onArchive,
  onRestore,
  onHardDelete,
  isPending,
}: ActionsProps) {
  const t = useT()
  const isPendingStatus = org.verificationStatus === 'PENDING'
  const isArchived = !!org.deletedAt

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
        <DropdownMenuItem onClick={() => onView(org)}>
          <Eye className="mr-2 size-4" />
          {t('admin.actions.viewDetails')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onBilling(org)}>
          <CreditCard className="mr-2 size-4" />
          {t('admin.billing.actions.openPanel')}
        </DropdownMenuItem>
        {isPendingStatus && !isArchived && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onApprove(org)}>
              <Check className="mr-2 size-4 text-success" />
              {t('admin.actions.approve')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReject(org)}>
              <XIcon className="mr-2 size-4 text-destructive" />
              {t('admin.actions.reject')}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {isArchived ? (
          <>
            <DropdownMenuItem onClick={() => onRestore(org)}>
              <RotateCcw className="mr-2 size-4" />
              {t('admin.actions.restoreOrganization')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHardDelete(org)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              {t('admin.actions.hardDeleteOrganization')}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={() => onArchive(org)}
            className="text-destructive focus:text-destructive"
          >
            <Archive className="mr-2 size-4" />
            {t('admin.actions.archiveOrganization')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ================================
// Create Columns
// ================================

export function createOrganizationsColumns(
  actions: Omit<ActionsProps, 'org'>
): ColumnDef<AdminOrganization>[] {
  return [
    {
      accessorKey: 'organization',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.organization')} />
      ),
      cell: ({ row }) => {
        const org = row.original
        const initials = org.name
          .split(' ')
          .map(w => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        return (
          <button
            onClick={() => actions.onView(org)}
            className="flex items-center gap-3 text-left hover:opacity-80"
          >
            <Avatar className="size-9">
              <AvatarImage src={org.logoUrl ?? undefined} />
              <AvatarFallback className="bg-muted text-xs font-medium">
                {initials || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium hover:underline">{org.name}</p>
              <p className="truncate text-xs text-muted-foreground">{org.email}</p>
            </div>
          </button>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'companyName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.company')} />
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.companyName}</span>,
    },
    {
      accessorKey: 'industry',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.industry')} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.industry || '—'}</span>
      ),
    },
    {
      accessorKey: 'companySize',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={actions.t('admin.tables.columns.companySize')}
        />
      ),
      cell: ({ row }) => {
        const v = row.original.companySize
        return (
          <span className="tabular-nums text-sm text-muted-foreground">
            {v != null && v !== '' ? String(v) : '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'inn',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.inn')} />
      ),
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.inn}</span>,
    },
    {
      accessorKey: 'verificationStatus',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.status')} />
      ),
      cell: ({ row }) => {
        const status = row.original.verificationStatus
        return (
          <StatusPill tone={statusPillTone(status)}>
            {statusLabelKeys[status] ? actions.t(statusLabelKeys[status]) : status}
          </StatusPill>
        )
      },
    },
    {
      accessorKey: 'members',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.members')} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Users className="size-4 text-muted-foreground" />
          <span className="tabular-nums">{row.original._count.members}</span>
          {typeof row.original._count.events === 'number' ? (
            <span className="text-xs text-muted-foreground">
              · {row.original._count.events} {actions.t('admin.tables.columns.events')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'state',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.state')} />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const org = row.original
        if (!org.deletedAt) {
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
              {formatDate(org.deletedAt, actions.locale)}
              {org.archivedByName ? ` · ${org.archivedByName}` : ''}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.createdAt')} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt, actions.locale)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsCell org={row.original} {...actions} />,
    },
  ]
}
