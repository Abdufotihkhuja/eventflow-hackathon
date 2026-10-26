/**
 * Колонки таблицы событий для Super Admin
 * Согласно API: approve/reject
 */

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDate, type Locale, type Translator } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'
import {
  MoreHorizontal,
  Check,
  Send,
  X as XIcon,
  Loader2,
  Users,
  MapPin,
  Globe,
  Ticket,
  Eye,
  Trash2,
} from 'lucide-react'

import type { AdminEvent } from '@api/services/superAdmin.types'
import { cn } from '@shared/lib/cn'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatusPill,
  statusPillTone,
  Textarea,
} from '@shared/ui'
import { FeaturedEventToggle } from '@features/super-admin'

type ActionsProps = {
  event: AdminEvent
  t: Translator
  locale: Locale
  onView: (event: AdminEvent) => void
  onApprove: (event: AdminEvent) => void
  onReject: (event: AdminEvent, reason?: string) => void
  onDelete: (event: AdminEvent, reason?: string) => void
  onToggleFeatured: (event: AdminEvent) => void
  isPending?: boolean
  isDeletePending?: boolean
  isFeaturedPending?: boolean
}

// ================================
// Status Badge
// ================================

const statusLabelKeys: Record<string, string> = {
  DRAFT: 'admin.statuses.draft',
  PENDING_REVIEW: 'admin.statuses.pendingModeration',
  PUBLISHED: 'admin.statuses.published',
  COMPLETED: 'statuses.completed',
  CANCELLED: 'admin.statuses.cancelled',
}

// ================================
// Format Badge
// ================================

const formatLabelKeys: Record<string, string> = {
  ONLINE: 'admin.statuses.online',
  OFFLINE: 'admin.statuses.offline',
  HYBRID: 'admin.statuses.hybrid',
}

const formatIcons: Record<string, React.ReactNode> = {
  ONLINE: <Globe className="size-3" />,
  OFFLINE: <MapPin className="size-3" />,
  HYBRID: <Globe className="size-3" />,
}

// ================================
// Type Badge
// ================================

const typeLabelKeys: Record<string, string> = {
  FREE: 'admin.statuses.free',
  PAID: 'admin.statuses.paid',
}

// ================================
// Actions Cell
// ================================

function ActionsCell({
  event,
  onView,
  onApprove,
  onReject,
  onDelete,
  isPending,
  isDeletePending,
}: ActionsProps) {
  const t = useT()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const isPendingReview = event.status === 'PENDING_REVIEW'
  const isDraft = event.status === 'DRAFT'

  const handleReject = () => {
    onReject(event, reason || undefined)
    setRejectOpen(false)
    setReason('')
  }

  const handleDelete = () => {
    onDelete(event, deleteReason || undefined)
    setDeleteOpen(false)
    setDeleteReason('')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            disabled={isPending || isDeletePending}
          >
            {isPending || isDeletePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            <span className="sr-only">{t('admin.actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView(event)}>
            <Eye className="mr-2 size-4" />
            {t('admin.actions.viewDetails')}
          </DropdownMenuItem>
          {isDraft && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onApprove(event)}>
                <Send className="mr-2 size-4 text-success" />
                {t('admin.actions.publish')}
              </DropdownMenuItem>
            </>
          )}
          {isPendingReview && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onApprove(event)}>
                <Check className="mr-2 size-4 text-success" />
                {t('admin.actions.approve')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRejectOpen(true)}>
                <XIcon className="mr-2 size-4 text-destructive" />
                {t('admin.actions.reject')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            {t('admin.actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.dialogs.rejectEventTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.dialogs.rejectEventDescription', { name: event.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('admin.dialogs.optionalRejectReasonPlaceholder')}
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t('admin.actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XIcon className="mr-2 size-4" />
              {t('admin.actions.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.dialogs.deleteEventTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.dialogs.deleteEventDescription', { name: event.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('admin.dialogs.deleteReasonPlaceholder')}
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('admin.actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeletePending}>
              {isDeletePending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              {t('admin.actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ================================
// Create Columns
// ================================

export function createEventsColumns(
  actions: Omit<ActionsProps, 'event'>
): ColumnDef<AdminEvent>[] {
  return [
    {
      accessorKey: 'event',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.event')} />
      ),
      cell: ({ row }) => {
        const event = row.original
        return (
          <button
            onClick={() => actions.onView(event)}
            className="flex items-center gap-3 text-left transition hover:opacity-80"
          >
            <Avatar className="size-10 rounded-lg">
              <AvatarImage src={event.coverImage ?? undefined} className="object-cover" />
              <AvatarFallback className="rounded-lg bg-muted text-xs font-medium">
                {event.title.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-medium hover:underline">
                {event.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {event.organization.companyName}
              </p>
            </div>
          </button>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'isFeatured',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.featured')} />
      ),
      cell: ({ row }) => {
        const event = row.original
        return (
          <FeaturedEventToggle
            isFeatured={event.isFeatured}
            onToggle={() => actions.onToggleFeatured(event)}
            isPending={actions.isFeaturedPending}
          />
        )
      },
      size: 70,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.status')} />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <StatusPill tone={statusPillTone(status)}>
            {statusLabelKeys[status] ? actions.t(statusLabelKeys[status]) : status}
          </StatusPill>
        )
      },
    },
    {
      accessorKey: 'format',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.format')} />
      ),
      cell: ({ row }) => {
        const fmt = row.original.format
        return (
          <div className="flex items-center gap-1.5">
            {formatIcons[fmt]}
            <span className="text-sm">
              {formatLabelKeys[fmt] ? actions.t(formatLabelKeys[fmt]) : fmt}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.type')} />
      ),
      cell: ({ row }) => {
        const type = row.original.type
        return (
          <Badge
            variant="outline"
            className={cn(
              'font-medium',
              type === 'FREE'
                ? 'border-border text-success-soft-foreground'
                : 'border-border text-info-soft-foreground'
            )}
          >
            <Ticket className="mr-1 size-3" />
            {typeLabelKeys[type] ? actions.t(typeLabelKeys[type]) : type}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'registrations',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.participants')} />
      ),
      cell: ({ row }) => {
        const count = row.original._count.registrations
        const max = row.original.maxParticipants
        return (
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            <span className="tabular-nums">
              {count}
              {max && <span className="text-muted-foreground">/{max}</span>}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'startDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.startDate')} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.startDate, actions.locale)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsCell event={row.original} {...actions} />,
    },
  ]
}
