/**
 * Детальная информация о статье блога (Sheet)
 * @module pages/super-admin/blog-posts/ui/blog-post-detail-sheet
 */

import { useState } from 'react'
import { formatDateTime } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import {
  Eye,
  Heart,
  MessageSquare,
  Clock,
  Calendar,
  Building2,
  Tag,
  FileText,
  Check,
  X,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

import type { AdminBlogPost } from '@api/services'
import { getMediaUrl } from '@api/config'
import { cn } from '@shared/lib/cn'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Separator,
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

type BlogPostDetailSheetProps = {
  post: AdminBlogPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onView: (post: AdminBlogPost) => void
  onApprove: (post: AdminBlogPost) => void
  onReject: (post: AdminBlogPost) => void
  isPending?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'admin.statuses.draft',
  PENDING_REVIEW: 'admin.statuses.pendingModeration',
  APPROVED: 'admin.statuses.approved',
  REJECTED: 'admin.statuses.rejected',
  PUBLISHED: 'admin.statuses.published',
}

export function BlogPostDetailSheet({
  post,
  open,
  onOpenChange,
  onView,
  onApprove,
  onReject,
  isPending,
}: BlogPostDetailSheetProps) {
  const t = useT()
  const locale = useLocale()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (!post) return null

  const isPendingReview = post.status === 'PENDING_REVIEW'
  const canApprove = isPendingReview
  const canReject = isPendingReview || post.status === 'APPROVED'

  const handleReject = () => {
    onReject(post)
    setRejectOpen(false)
    setReason('')
    onOpenChange(false)
  }

  const handleApprove = () => {
    onApprove(post)
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t('admin.blogPostDetails.title')}</SheetTitle>
            <SheetDescription>{t('admin.blogPostDetails.description')}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Cover & Title */}
            <div className="space-y-4">
              {post.coverImage && (
                <div className="overflow-hidden rounded-lg">
                  <img
                    src={getMediaUrl(post.coverImage)}
                    alt={post.title}
                    className="aspect-video w-full object-cover"
                  />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold">{post.title}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusPill tone={statusPillTone(post.status)} size="sm">
                    {t(STATUS_LABELS[post.status])}
                  </StatusPill>
                  {post.commentsEnabled && (
                    <Badge variant="outline" className="text-xs">
                      {t('admin.blogPostDetails.commentsEnabled')}
                    </Badge>
                  )}
                </div>
              </div>
              {post.shortDescription && (
                <p className="text-sm text-muted-foreground">{post.shortDescription}</p>
              )}
            </div>

            <Separator />

            {/* Stats */}
            <Section title={t('admin.blogPostDetails.stats')} icon={<Eye className="size-4" />}>
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  icon={<Eye className="size-4" />}
                  label={t('admin.blogPostDetails.views')}
                  value={post.viewsCount}
                  color="blue"
                />
                <StatCard
                  icon={<Heart className="size-4" />}
                  label={t('admin.blogPostDetails.likes')}
                  value={post.likesCount}
                  color="rose"
                />
                <StatCard
                  icon={<MessageSquare className="size-4" />}
                  label={t('admin.blogPostDetails.comments')}
                  value={post.commentsCount}
                  color="emerald"
                />
              </div>
              {post.readingTime > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  <span>{t('admin.blogPostDetails.readingTime', { minutes: post.readingTime })}</span>
                </div>
              )}
            </Section>

            <Separator />

            {/* Organization */}
            <Section title={t('admin.blogPostDetails.author')} icon={<Building2 className="size-4" />}>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="size-10">
                  {post.organization.logoUrl && (
                    <AvatarImage src={getMediaUrl(post.organization.logoUrl)} />
                  )}
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {post.organization.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{post.organization.companyName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {post.organization.email}
                  </p>
                </div>
              </div>
            </Section>

            {/* Tags */}
            {post.tags.length > 0 && (
              <>
                <Separator />
                <Section title={t('admin.blogPostDetails.tags')} icon={<Tag className="size-4" />}>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        #{tag.name}
                      </Badge>
                    ))}
                  </div>
                </Section>
              </>
            )}

            <Separator />

            {/* Dates */}
            <Section title={t('admin.blogPostDetails.dates')} icon={<Calendar className="size-4" />}>
              <InfoRow
                icon={<Calendar />}
                label={t('admin.blogPostDetails.createdAt')}
                value={formatDateTime(post.createdAt, locale)}
              />
              <InfoRow
                icon={<Calendar />}
                label={t('admin.blogPostDetails.updatedAt')}
                value={formatDateTime(post.updatedAt, locale)}
              />
              {post.publishedAt && (
                <InfoRow
                  icon={<FileText />}
                  label={t('admin.blogPostDetails.publishedAt')}
                  value={formatDateTime(post.publishedAt, locale)}
                />
              )}
              {post.reviewedAt && (
                <InfoRow
                  icon={<Check />}
                  label={t('admin.blogPostDetails.reviewedAt')}
                  value={formatDateTime(post.reviewedAt, locale)}
                />
              )}
            </Section>

            {/* Rejection Reason */}
            {post.rejectionMessage && (
              <>
                <Separator />
                <div className="rounded-lg border border-border bg-danger-soft p-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-danger-soft-foreground">
                    <AlertTriangle className="size-4" />
                    {t('admin.blogPostDetails.rejectionReason')}
                  </h4>
                  <p className="mt-2 text-sm text-danger-soft-foreground">
                    {post.rejectionMessage}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => onView(post)}>
                <ExternalLink className="mr-2 size-4" />
                {t('admin.blogPostDetails.openPost')}
              </Button>

              {(canApprove || canReject) && (
                <div className="flex gap-2">
                  {canApprove && (
                    <Button className="flex-1" onClick={handleApprove} disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 size-4" />
                      )}
                      {t('admin.actions.approve')}
                    </Button>
                  )}
                  {canReject && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setRejectOpen(true)}
                      disabled={isPending}
                    >
                      <X className="mr-2 size-4" />
                      {t('admin.actions.reject')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
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
            <Button variant="destructive" onClick={handleReject}>
              <X className="mr-2 size-4" />
              {t('admin.actions.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ================================
// Helper Components
// ================================

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="[&>svg]:size-4">{icon}</span>
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

type StatCardProps = {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'rose' | 'emerald'
}

const colorMap = {
  blue: 'bg-info-soft text-info-soft-foreground',
  rose: 'bg-danger-soft text-danger-soft-foreground',
  emerald: 'bg-success-soft text-success-soft-foreground',
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className={cn('rounded-lg p-3 text-center', colorMap[color])}>
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1 text-lg font-bold">{value.toLocaleString()}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  )
}
