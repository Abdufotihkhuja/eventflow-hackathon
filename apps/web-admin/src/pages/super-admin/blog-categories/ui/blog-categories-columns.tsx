/**
 * Колонки таблицы категорий блога для Super Admin
 */

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDate, type Locale, type Translator } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'

function cellString(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return '—'
}
import { MoreHorizontal, Trash2, Loader2, Pencil } from 'lucide-react'

import type { AdminBlogCategory } from '@api/services/superAdmin.types'
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
  category: AdminBlogCategory
  t: Translator
  locale: Locale
  onEdit: (category: AdminBlogCategory) => void
  onDelete: (category: AdminBlogCategory) => void
  isPending?: boolean
}

function ActionsCell({ category, onEdit, onDelete, isPending }: ActionsProps) {
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
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="mr-2 size-4" />
            {t('admin.actions.edit')}
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
            <AlertDialogTitle>{t('admin.dialogs.deleteBlogCategoryTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.dialogs.deleteBlogCategoryDescription', {
                name: cellString(category.name),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(category)}
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

export function createBlogCategoriesColumns(
  actions: Omit<ActionsProps, 'category'>
): ColumnDef<AdminBlogCategory>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.title')} />
      ),
      cell: ({ row }) => <span className="font-medium">{cellString(row.original.name)}</span>,
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {cellString(row.original.slug)}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.active')} />
      ),
      cell: ({ row }) => {
        const active = row.original.isActive
        const isActive = active === true || (active as unknown) === 'true'
        return (
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              isActive
                ? 'bg-success-soft text-success-soft-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isActive ? actions.t('admin.statuses.yes') : actions.t('admin.statuses.no')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={actions.t('admin.tables.columns.createdAt')} />
      ),
      cell: ({ row }) => {
        const raw = row.original.createdAt
        const date =
          raw == null
            ? null
            : typeof raw === 'string' || typeof raw === 'number'
              ? new Date(raw)
              : null
        const str =
          date && !Number.isNaN(date.getTime())
            ? formatDate(date, actions.locale)
            : cellString(raw)
        return <span className="text-muted-foreground">{str}</span>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsCell category={row.original} {...actions} />,
    },
  ]
}
