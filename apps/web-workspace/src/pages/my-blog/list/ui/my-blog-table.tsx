/**
 * Table-first management list for the organizer's blog.
 * Mirrors the events-list table language. Shows only real backend fields:
 * cover, title, status, tags, date, and real engagement (views / comments /
 * reading time). Public & saved blog keep their card grid (BlogPostsList).
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Clock, Eye, ExternalLink, FileText, MessageCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { BlogPostPreview, BlogPostStatus } from '@api/services'
import { cn } from '@shared/lib/cn'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusPill,
  type StatusPillTone,
} from '@shared/ui'

const STATUS_TONE: Record<BlogPostStatus, StatusPillTone> = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'paused',
  APPROVED: 'success',
  REJECTED: 'cancelled',
  PUBLISHED: 'live',
}

const STATUS_LABEL: Record<BlogPostStatus, string> = {
  DRAFT: 'blog.status.draft',
  PENDING_REVIEW: 'blog.status.pendingReview',
  APPROVED: 'blog.status.approved',
  REJECTED: 'blog.status.rejected',
  PUBLISHED: 'blog.status.published',
}

type MyBlogTableProps = {
  posts: BlogPostPreview[]
  getPostHref: (post: BlogPostPreview) => string
  getEditHref: (post: BlogPostPreview) => string
  onDelete: (postId: string) => void
  isDeleteLoading?: boolean
}

const GRID = 'grid-cols-[minmax(0,1fr)_44px] sm:grid-cols-[minmax(0,1fr)_120px_170px_120px_44px]'

export function MyBlogTable({
  posts,
  getPostHref,
  getEditHref,
  onDelete,
  isDeleteLoading = false,
}: MyBlogTableProps) {
  const { t } = useI18n()

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={cn('hidden gap-4 border-b border-border bg-muted/30 px-4 py-2.5 sm:grid', GRID)}>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('blog.myBlog.colArticle')}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('blog.myBlog.statusPlaceholder')}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('blog.myBlog.colEngagement')}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('blog.myBlog.colDate')}
        </span>
        <span aria-hidden />
      </div>

      {posts.map(post => (
        <BlogPostRow
          key={post.id}
          post={post}
          detailHref={getPostHref(post)}
          editHref={getEditHref(post)}
          onDelete={onDelete}
          isDeleteLoading={isDeleteLoading}
        />
      ))}
    </div>
  )
}

function BlogPostRow({
  post,
  detailHref,
  editHref,
  onDelete,
  isDeleteLoading,
}: {
  post: BlogPostPreview
  detailHref: string
  editHref: string
  onDelete: (postId: string) => void
  isDeleteLoading: boolean
}) {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)

  const title = post.title || t('blog.myBlog.untitled')
  const tags = post.tags?.map(tag => tag.name).filter(Boolean).join(' · ') ?? ''
  const dateSource = post.publishedAt ?? post.createdAt
  const dateStr = dateSource
    ? formatDate(new Date(dateSource), locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className={cn('grid items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/40 sm:gap-4', GRID)}>
      {/* Article */}
      <Link to={detailHref} className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground/50">
          {post.coverImage ? (
            <img src={getMediaUrl(post.coverImage)} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <FileText className="size-4" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-[-0.005em] text-foreground">{title}</span>
            <span className="sm:hidden">
              <StatusPill tone={STATUS_TONE[post.status]} size="sm">
                {t(STATUS_LABEL[post.status])}
              </StatusPill>
            </span>
          </span>
          {tags && <span className="mt-0.5 block truncate font-mono text-[12px] text-muted-foreground">{tags}</span>}
        </span>
      </Link>

      {/* Status */}
      <div className="hidden sm:block">
        <StatusPill tone={STATUS_TONE[post.status]} size="sm">
          {t(STATUS_LABEL[post.status])}
        </StatusPill>
      </div>

      {/* Engagement — real backend metrics */}
      <div className="hidden items-center gap-3 font-mono text-[12px] text-muted-foreground sm:flex">
        <span className="inline-flex items-center gap-1" title={t('blog.myBlog.viewsLabel')}>
          <Eye className="size-3.5" aria-hidden="true" />
          {post.viewsCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1" title={t('blog.myBlog.commentsLabel')}>
          <MessageCircle className="size-3.5" aria-hidden="true" />
          {post.commentsCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1" title={t('blog.myBlog.readingTimeLabel')}>
          <Clock className="size-3.5" aria-hidden="true" />
          {t('blog.myBlog.readingTimeShort', { minutes: post.readingTime })}
        </span>
      </div>

      {/* Date */}
      <div className="hidden font-mono text-[12px] text-muted-foreground sm:block">{dateStr}</div>

      {/* Actions */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={t('actions.title')}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(detailHref)}>
              <ExternalLink className="mr-2 size-4" />
              {t('blog.myBlog.openAction')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={editHref}>
                <Pencil className="mr-2 size-4" />
                {t('actions.edit')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              {t('actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('blog.detail.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('blog.detail.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteLoading}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(post.id)
                setShowDelete(false)
              }}
              disabled={isDeleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
