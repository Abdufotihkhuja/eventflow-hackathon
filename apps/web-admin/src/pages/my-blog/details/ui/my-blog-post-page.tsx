/**
 * Страница детального просмотра статьи (управление)
 * @module pages/my-blog/details
 */

import { useNavigate, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { enUS, ru, uz } from 'date-fns/locale'
import { getDateFnsLocale } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import { PUBLIC_SITE_URL } from '@api/config'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Eye,
  EyeOff,
  Upload,
  MoreVertical,
  Clock,
  Tag as TagIcon,
  Heart,
  MessageCircle,
} from 'lucide-react'
import {
  Button,
  RichTextEditor,
  BlogStatusBadge,
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
import { getMediaUrl } from '@api/config'
import {
  useBlogPost,
  useDeleteBlogPost,
  useSubmitBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
} from '@features/blog/api'
import { useState } from 'react'

export function MyBlogPostPage() {
  const t = useT()
  const locale = useLocale()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: post, isLoading } = useBlogPost(id)
  const deleteMutation = useDeleteBlogPost()
  const submitMutation = useSubmitBlogPost()
  const publishMutation = usePublishBlogPost()
  const unpublishMutation = useUnpublishBlogPost()

  const handleDelete = async () => {
    if (!id) return
    await deleteMutation.mutateAsync(id)
    navigate('/my-blog')
  }

  const handleSubmit = () => {
    if (!id) return
    submitMutation.mutate(id)
  }

  const handlePublish = () => {
    if (!id) return
    publishMutation.mutate(id)
  }

  const handleUnpublish = () => {
    if (!id) return
    unpublishMutation.mutate(id)
  }

  if (isLoading || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const canEdit = ['DRAFT', 'REJECTED'].includes(post.status)
  const canSubmit = post.status === 'DRAFT'
  const canPublish = post.status === 'APPROVED'
  const canUnpublish = post.status === 'PUBLISHED'
  const dateFnsLocale = getDateFnsLocale(locale, { en: enUS, ru, uz })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/my-blog')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <BlogStatusBadge status={post.status} className="mb-3" />
                <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                  {post.title}
                </h1>
              </div>

              {/* Meta - минималистично */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {t('blog.detail.readingTime', { minutes: post.readingTime })}
                  </span>
                </div>
                <span className="text-muted-foreground/50">•</span>
                <span>
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  })}
                </span>
                {post.publishedAt && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1.5">
                      <Upload className="h-4 w-4" />
                      <span>
                        {t('blog.detail.publishedRelative', {
                          date: formatDistanceToNow(new Date(post.publishedAt), {
                            addSuffix: true,
                            locale: dateFnsLocale,
                          }),
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Stats - компактно и элегантно */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2 group cursor-default">
                  <Eye className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-base font-semibold tabular-nums">{post.viewsCount}</span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                  <Heart className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-base font-semibold tabular-nums">{post.likesCount}</span>
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                  <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-base font-semibold tabular-nums">{post.commentsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canEdit && (
                <DropdownMenuItem onClick={() => navigate(`/my-blog/${id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('actions.edit')}
                </DropdownMenuItem>
              )}

              {canSubmit && (
                <DropdownMenuItem onClick={handleSubmit}>
                  <Send className="mr-2 h-4 w-4" />
                  {t('blog.detail.submitForReview')}
                </DropdownMenuItem>
              )}

              {canPublish && (
                <DropdownMenuItem onClick={handlePublish}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('admin.actions.publish')}
                </DropdownMenuItem>
              )}

              {canUnpublish && (
                <DropdownMenuItem onClick={handleUnpublish}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  {t('admin.actions.unpublish')}
                </DropdownMenuItem>
              )}

              {post.status === 'PUBLISHED' && (
                <DropdownMenuItem
                  onClick={() => {
                    const base = PUBLIC_SITE_URL.replace(/\/$/, '')
                    window.open(`${base}/blog/${post.slug}`, '_blank')
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('blog.detail.viewOnSite')}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Rejection Reason */}
        {post.status === 'REJECTED' && post.rejectionMessage && (
          <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
            <h3 className="font-semibold text-destructive mb-2">
              {t('blog.detail.rejectionReason')}
            </h3>
            <p className="text-sm">{post.rejectionMessage}</p>
          </div>
        )}

        {/* Cover Image */}
        {post.coverImage && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border">
            <img
              src={getMediaUrl(post.coverImage)}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Short Description */}
        {post.shortDescription && (
          <div className="text-lg text-muted-foreground italic">{post.shortDescription}</div>
        )}

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <RichTextEditor
            value={post.content as any}
            editable={false}
            className="border-0 bg-transparent [&_.bn-container]:bg-transparent [&_.bn-editor]:bg-transparent [&_.bn-editor]:text-foreground dark:[&_.bn-editor]:text-foreground"
          />
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <TagIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {t('blog.detail.tags')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => {
                // Обрабатываем структуру тегов из API (может быть tag.tag или просто tag)
                const tagData = (tag as any).tag || tag
                return (
                  <span
                    key={tagData.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <TagIcon className="h-3 w-3" />
                    {tagData.name}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('blog.detail.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('blog.detail.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
