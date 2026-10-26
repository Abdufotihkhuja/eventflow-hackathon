/**
 * Колонки таблицы сборок мобильного приложения (Super Admin)
 */

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDate, type Locale, type Translator } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'
import { Apple, Download, Loader2, MoreHorizontal, Smartphone, Trash2 } from 'lucide-react'

import type { AppBuild } from '@api/services'
import { useDeleteAppBuild, useDownloadAppBuild } from '@features/super-admin'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui'

export function formatBuildSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function ActionsCell({ build }: { build: AppBuild }) {
  const t = useT()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const download = useDownloadAppBuild()
  const deleteBuild = useDeleteAppBuild()

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => download.mutate(build)}
        disabled={download.isPending}
      >
        {download.isPending ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <Download className="mr-1.5 size-4" />
        )}
        {t('admin.appBuilds.download')}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="size-8 p-0" disabled={deleteBuild.isPending}>
            {deleteBuild.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            <span className="sr-only">{t('admin.actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
            <AlertDialogTitle>{t('admin.appBuilds.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.appBuilds.deleteDescription', { version: build.version })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBuild.mutate(build.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('admin.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function createAppBuildsColumns(options: {
  t: Translator
  locale: Locale
}): ColumnDef<AppBuild>[] {
  const { t, locale } = options
  return [
    {
      accessorKey: 'platform',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('admin.appBuilds.columns.platform')} />
      ),
      cell: ({ row }) => {
        const isAndroid = row.original.platform === 'ANDROID'
        return (
          <Badge variant="secondary" className="gap-1.5 text-xs">
            {isAndroid ? <Smartphone className="size-3.5" /> : <Apple className="size-3.5" />}
            {isAndroid ? 'Android' : 'iOS'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'version',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('admin.appBuilds.columns.version')} />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.version}</span>,
    },
    {
      accessorKey: 'originalName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('admin.appBuilds.columns.file')} />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="max-w-[240px] truncate font-mono text-sm">{row.original.originalName}</div>
          <div className="text-xs text-muted-foreground">{formatBuildSize(row.original.size)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'notes',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('admin.appBuilds.columns.notes')} />
      ),
      cell: ({ row }) => (
        <span className="block max-w-[280px] truncate text-sm text-muted-foreground">
          {row.original.notes || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'uploadedByEmail',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('admin.appBuilds.columns.uploadedBy')} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.uploadedByEmail || '—'}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('admin.appBuilds.columns.uploadedAt')} />
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return (
          <span className="text-muted-foreground">
            {Number.isNaN(date.getTime()) ? '—' : formatDate(date, locale)}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsCell build={row.original} />,
    },
  ]
}
