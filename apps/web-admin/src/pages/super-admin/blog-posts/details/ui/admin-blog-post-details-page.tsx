/**
 * Детальная страница статьи блога для супер-админа: KPI (просмотры/лайки/
 * комментарии/время чтения), обложка и текст статьи, модерация
 * (одобрить/отклонить с причиной), теги, даты и системная информация.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  X,
} from 'lucide-react'

import { getMediaUrl, PUBLIC_SITE_URL } from '@api/config'
import {
  useAdminBlogPost,
  useApproveBlogPost,
  useRejectBlogPost,
} from '@features/super-admin'
import { cn } from '@shared/lib/cn'
import { getDescriptionText } from '@shared/lib'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  LoadingState,
  StatTile,
  StatusPill,
  statusPillTone,
  Textarea,
} from '@shared/ui'

const STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: 'admin.statuses.draft',
  PENDING_REVIEW: 'admin.statuses.pendingModeration',
  APPROVED: 'admin.statuses.approved',
  REJECTED: 'admin.statuses.rejected',
  PUBLISHED: 'admin.statuses.published',
}

export default function AdminBlogPostDetailsPage() {
  const t = useT()
  const locale = useLocale()
  const { postId } = useParams<{ postId: string }>()

  const { data: post, isLoading, isError, refetch } = useAdminBlogPost(postId)
  const approveMutation = useApproveBlogPost()
  const rejectMutation = useRejectBlogPost()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (isLoading) {
    return <LoadingState />
  }

  if (isError || !post) {
    return (
      <div className="space-y-4">
        <BackButton />
        <ErrorState
          title={t('admin.errors.loadFailed')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      </div>
    )
  }

  const isPendingReview = post.status === 'PENDING_REVIEW'
  const isMutating = approveMutation.isPending || rejectMutation.isPending
  const publicUrl =
    post.status === 'PUBLISHED' && post.slug
      ? `${PUBLIC_SITE_URL.replace(/\/$/, '')}/blog/${post.slug}`
      : null

  const contentText = post.content ? getDescriptionText(post.content) : ''
  const format = (value: number) => value.toLocaleString(locale)

  const handleReject = () => {
    rejectMutation.mutate(
      { postId: post.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setRejectOpen(false)
          setReason('')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <BackButton />
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={statusPillTone(post.status)}>
                {STATUS_LABEL_KEYS[post.status] ? t(STATUS_LABEL_KEYS[post.status]) : post.status}
              </StatusPill>
            </div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{post.title}</h1>
            <p className="text-sm text-muted-foreground">
              <Link
                to={`/admin/organizations?search=${encodeURIComponent(post.organization.companyName)}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {post.organization.companyName}
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1">
            {publicUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 size-4" aria-hidden="true" />
                  {t('admin.blogPostDetails.openPost')}
                </a>
              </Button>
            )}
            {isPendingReview && (
              <>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(post.id)}
                  disabled={isMutating}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="mr-1.5 size-4" aria-hidden="true" />
                  )}
                  {t('admin.actions.approve')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  disabled={isMutating}
                >
                  <X className="mr-1.5 size-4" aria-hidden="true" />
                  {t('admin.actions.reject')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI-агрегаты */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t('admin.blogPostDetails.views')}
          value={format(post.viewsCount)}
          icon={Eye}
        />
        <StatTile
          label={t('admin.blogPostDetails.likes')}
          value={format(post.likesCount)}
          icon={Heart}
        />
        <StatTile
          label={t('admin.blogPostDetails.comments')}
          value={format(post.commentsCount)}
          icon={MessageCircle}
        />
        <StatTile
          label={t('admin.blogPostDetails.readingTime', { minutes: post.readingTime })}
          value={`~${post.readingTime}`}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Контент */}
        <div className="space-y-6 lg:col-span-2">
          {post.coverImage && (
            <div className="overflow-hidden rounded-lg">
              <img
                src={getMediaUrl(post.coverImage)}
                alt={post.title}
                className="aspect-video w-full object-cover"
              />
            </div>
          )}

          {post.shortDescription && (
            <p className="text-sm text-muted-foreground">{post.shortDescription}</p>
          )}

          {contentText && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t('admin.blogPostDetails.content')}
              </h3>
              <p className="max-w-prose whitespace-pre-wrap text-sm text-muted-foreground">
                {contentText}
              </p>
            </Card>
          )}

          {post.rejectionMessage && (
            <div className="rounded-lg border border-border bg-danger-soft p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div>
                  <p className="mb-1 text-sm font-medium text-danger-soft-foreground">
                    {t('admin.blogPostDetails.rejectionReason')}
                  </p>
                  <p className="text-sm text-danger-soft-foreground">{post.rejectionMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка */}
        <div className="space-y-6">
          {/* Теги */}
          {post.tags.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t('admin.blogPostDetails.tags')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Даты */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('admin.blogPostDetails.dates')}
            </h3>
            <dl className="space-y-2">
              <SystemInfoRow
                label={t('admin.blogPostDetails.createdAt')}
                value={formatDateTime(post.createdAt, locale)}
              />
              <SystemInfoRow
                label={t('admin.blogPostDetails.updatedAt')}
                value={formatDateTime(post.updatedAt, locale)}
              />
              {post.publishedAt && (
                <SystemInfoRow
                  label={t('admin.blogPostDetails.publishedAt')}
                  value={formatDateTime(post.publishedAt, locale)}
                />
              )}
              {post.reviewedAt && (
                <SystemInfoRow
                  label={t('admin.blogPostDetails.reviewedAt')}
                  value={formatDateTime(post.reviewedAt, locale)}
                />
              )}
            </dl>
          </Card>

          {/* Системная информация */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('admin.fields.systemInfo')}
            </h3>
            <dl className="space-y-2">
              <SystemInfoRow label="ID" value={post.id} mono copyable />
              <SystemInfoRow
                label={t('admin.blogPostDetails.slug')}
                value={post.slug}
                mono
                copyable
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <dt className="shrink-0 text-muted-foreground">
                  {t('admin.blogPostDetails.commentsEnabled')}
                </dt>
                <dd>
                  <StatusPill tone={post.commentsEnabled ? 'success' : 'neutral'} size="sm">
                    {post.commentsEnabled
                      ? t('admin.billing.overrides.yes')
                      : t('admin.billing.overrides.no')}
                  </StatusPill>
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Диалог отклонения */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.dialogs.rejectBlogPostTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.dialogs.rejectBlogPostDescription', { name: post.title })}
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
            <Button variant="destructive" onClick={handleReject} disabled={isMutating}>
              {rejectMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="mr-2 size-4" aria-hidden="true" />
              )}
              {t('admin.actions.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Back-кнопка к списку статей.
function BackButton() {
  const t = useT()
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
      <Link to="/admin/blog-posts">
        <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
        {t('admin.actions.back')}
      </Link>
    </Button>
  )
}

// Строка «Системной информации»: label — dt, значение — dd (mono для идентификаторов),
// опциональная кнопка копирования. Локальная копия паттерна с event-страницы.
function SystemInfoRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  const t = useT()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t('admin.toasts.copied'))
    } catch {
      toast.error(t('admin.toasts.copyError'))
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        <span className={cn('truncate font-medium', mono && 'font-mono text-xs')}>{value}</span>
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            aria-label={t('admin.actions.copy')}
            title={t('admin.actions.copy')}
          >
            <Copy className="size-3.5" />
          </Button>
        )}
      </dd>
    </div>
  )
}
