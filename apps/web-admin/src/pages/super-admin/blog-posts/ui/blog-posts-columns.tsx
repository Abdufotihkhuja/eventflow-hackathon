/**
 * Колонки таблицы блог-постов для супер админа
 * @module pages/super-admin/blog-posts/ui/blog-posts-columns
 */

import { type ColumnDef } from '@tanstack/react-table'
import { formatDate, type Locale, type Translator } from '@eventflow/i18n'
import { Eye, MoreVertical, Check, X, Trash2, Heart } from 'lucide-react'
import type { AdminBlogPost } from '@api/services'
import { getMediaUrl } from '@api/config'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DataTableColumnHeader,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

const STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: 'admin.statuses.draft',
  PENDING_REVIEW: 'admin.statuses.pendingModeration',
  APPROVED: 'admin.statuses.approved',
  REJECTED: 'admin.statuses.rejected',
  PUBLISHED: 'admin.statuses.published',
}

interface CreateBlogPostsColumnsProps {
  t: Translator
  locale: Locale
  onView?: (post: AdminBlogPost) => void
  onApprove?: (post: AdminBlogPost) => void
  onReject?: (post: AdminBlogPost) => void
  onDelete?: (post: AdminBlogPost) => void
  onRowClick?: (post: AdminBlogPost) => void
}

export function createBlogPostsColumns({
  t,
  locale,
  onView,
  onApprove,
  onReject,
  onDelete,
  onRowClick,
}: CreateBlogPostsColumnsProps): ColumnDef<AdminBlogPost>[] {
  return [
    {
      accessorKey: 'title',
      accessorFn: row => {
        const title = row.title
        if (typeof title === 'string') return title
        if (title && typeof title === 'object') return String(title)
        return ''
      },
      header: t('admin.tables.columns.post'),
      cell: ({ row }) => {
        const post = row.original
        const titleValue = row.getValue('title')
        const title =
          typeof titleValue === 'string'
            ? titleValue
            : typeof titleValue === 'object' && titleValue !== null
              ? String(titleValue)
              : t('common.notFound')
        const org = post?.organization
        const orgName = org && typeof org === 'object' ? String(org.companyName || org.name || '') : ''
        const coverImage = post?.coverImage

        return (
          <button
            type="button"
            className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity w-full"
            onClick={() => onRowClick?.(post)}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
              {coverImage ? (
                <img
                  src={getMediaUrl(String(coverImage))}
                  alt={title}
                  className="size-10 rounded object-cover"
                />
              ) : (
                title.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{title}</div>
              {orgName && (
                <div className="text-xs text-muted-foreground truncate">{orgName}</div>
              )}
            </div>
          </button>
        )
      },
    },
    {
      accessorKey: 'status',
      accessorFn: row => {
        const status = row.status
        if (typeof status === 'string') return status
        if (status && typeof status === 'object') return String(status)
        return 'DRAFT'
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.status')} />,
      cell: ({ row }) => {
        const statusValue = row.getValue('status')
        const status =
          typeof statusValue === 'string'
            ? statusValue
            : typeof statusValue === 'object' && statusValue !== null
              ? String(statusValue)
              : 'DRAFT'
        return (
          <StatusPill tone={statusPillTone(status)}>
            {STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status}
          </StatusPill>
        )
      },
      filterFn: (row, id, value) => {
        const cellValue = row.getValue(id)
        if (typeof cellValue !== 'string') {
          return false
        }
        return value.includes(cellValue)
      },
    },
    {
      id: 'stats',
      accessorFn: row => {
        const count = row.viewsCount
        return typeof count === 'number' ? count : 0
      },
      header: t('admin.tables.columns.views'),
      enableSorting: false,
      cell: ({ row }) => {
        const post = row.original
        const viewsCount = typeof post?.viewsCount === 'number' ? post.viewsCount : 0

        return (
          <div className="flex items-center gap-1.5 text-sm">
            <Eye className="size-4 text-muted-foreground" />
            <span>{viewsCount.toLocaleString()}</span>
          </div>
        )
      },
    },
    {
      id: 'likes',
      accessorFn: row => {
        const count = row.likesCount
        return typeof count === 'number' ? count : 0
      },
      header: t('admin.tables.columns.likes'),
      enableSorting: false,
      cell: ({ row }) => {
        const post = row.original
        const likesCount = typeof post?.likesCount === 'number' ? post.likesCount : 0

        return (
          <div className="flex items-center gap-1.5 text-sm">
            <Heart className="size-4 text-muted-foreground" />
            <span>{likesCount.toLocaleString()}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      accessorFn: row => {
        const date = row.createdAt
        if (typeof date === 'string') return date
        if (date && typeof date === 'object') return String(date)
        return ''
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.createdAt')} />,
      cell: ({ row }) => {
        try {
          const dateValue = row.getValue('createdAt')
          if (!dateValue) {
            return <div className="text-sm text-muted-foreground">—</div>
          }
          const dateString =
            typeof dateValue === 'string'
              ? dateValue
              : typeof dateValue === 'object' && dateValue !== null
                ? String(dateValue)
                : null
          if (!dateString) {
            return <div className="text-sm text-muted-foreground">—</div>
          }
          const date = new Date(dateString)
          if (isNaN(date.getTime())) {
            return <div className="text-sm text-muted-foreground">—</div>
          }
          return (
            <div className="text-sm whitespace-nowrap">
              {formatDate(date, locale)}
            </div>
          )
        } catch {
          return <div className="text-sm text-muted-foreground">—</div>
        }
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const post = row.original
        const canApprove = post.status === 'PENDING_REVIEW'
        const canReject = post.status === 'PENDING_REVIEW' || post.status === 'APPROVED'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(post)}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('admin.actions.viewDetails')}
                </DropdownMenuItem>
              )}
              {canApprove && onApprove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onApprove(post)}>
                    <Check className="mr-2 size-4 text-success" />
                    {t('admin.actions.approve')}
                  </DropdownMenuItem>
                </>
              )}
              {canReject && onReject && (
                <DropdownMenuItem onClick={() => onReject(post)}>
                  <X className="mr-2 h-4 w-4 text-destructive" />
                  {t('admin.actions.reject')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(post)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('admin.actions.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
