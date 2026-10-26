/**
 * Колонки таблицы подборок для Super Admin
 */

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDate, type Locale, type Translator } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'
import { MoreHorizontal, Trash2, Loader2, Pencil, Calendar, Layers } from 'lucide-react'

import type { AdminCollection } from '@api/services/superAdmin.types'
import { cn } from '@shared/lib/cn'
import {
  Badge,
  Button,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/ui'

type ActionsProps = {
  collection: AdminCollection
  t: Translator
  locale: Locale
  onEdit: (collection: AdminCollection) => void
  onManageEvents: (collection: AdminCollection) => void
  onDelete: (collection: AdminCollection) => void
  isPending?: boolean
}

function ActionsCell({
  collection,
  onEdit,
  onManageEvents,
  onDelete,
  isPending,
}: ActionsProps) {
  const t = useT()
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
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
          <DropdownMenuItem onClick={() => onEdit(collection)}>
            <Pencil className="mr-2 size-4" />
            {t('admin.actions.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onManageEvents(collection)}>
            <Layers className="mr-2 size-4" />
            {t('admin.tables.columns.events')}
          </DropdownMenuItem>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.dialogs.deleteCollectionTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.dialogs.deleteCollectionDescription', { name: collection.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(collection)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('admin.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function createCollectionsColumns(
  actions: Omit<ActionsProps, 'collection'>
): ColumnDef<AdminCollection>[] {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.title')} />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">{row.original.slug}</span>
      ),
    },
    {
      accessorKey: '_count',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.events')} />
      ),
      cell: ({ row }) => {
        const count = row.original._count?.events ?? 0
        return (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-auto gap-1 px-1 text-muted-foreground hover:text-foreground"
            onClick={e => {
              e.stopPropagation()
              actions.onManageEvents(row.original)
            }}
          >
            <Calendar className="size-4" />
            {count}
          </Button>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.active')} />
      ),
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={cn(
            'text-xs',
            row.original.isActive
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {row.original.isActive ? actions.t('admin.statuses.yes') : actions.t('admin.statuses.no')}
        </Badge>
      ),
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
      cell: ({ row }) => <ActionsCell collection={row.original} {...actions} />,
    },
  ]
}
