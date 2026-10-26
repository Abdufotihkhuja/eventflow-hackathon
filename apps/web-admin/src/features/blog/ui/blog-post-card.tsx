/**
 * Карточка статьи блога (для списков)
 * @module features/blog/ui/blog-post-card
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Heart, MessageCircle, Eye, Bookmark, Clock, MoreVertical, Trash2 } from 'lucide-react'
import { cn } from '@shared/lib/cn'
import { getMediaUrl } from '@api/config'
import { BlogStatusBadge } from '@shared/ui/blog-status-badge'
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
  DropdownMenuTrigger,
} from '@shared/ui'
import type { BlogPostPreview } from '@api/services'

type BlogPostCardProps = {
  post: BlogPostPreview
  href: string
  showStatus?: boolean
  className?: string
  onLike?: (postId: string) => void
  onSave?: (postId: string) => void
  onDelete?: (postId: string) => void
  isLikeLoading?: boolean
  isSaveLoading?: boolean
  isDeleteLoading?: boolean
}

export function BlogPostCard({
  post,
  href,
  showStatus = false,
  className,
  onLike,
  onSave,
  onDelete,
  isLikeLoading = false,
  isSaveLoading = false,
  isDeleteLoading = false,
}: BlogPostCardProps) {
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onLike?.(post.id)
  }

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSave?.(post.id)
  }

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(post.id)
    setShowDeleteDialog(false)
  }

  return (
    <Link to={href} className="group block h-full relative">
      <article
        className={cn(
          'flex flex-col h-full overflow-hidden rounded-xl border bg-card transition duration-300',
          'border-border hover:border-border hover:shadow-md',
          className
        )}
      >
        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <img
              src={getMediaUrl(post.coverImage)}
              alt={post.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {showStatus && onDelete && (
              <div
                className="absolute right-3 top-3 z-10"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-8 rounded-full bg-card/90 shadow-md hover:bg-card border-0"
                      aria-label="Действия"
                      disabled={isDeleteLoading}
                      onClick={e => e.preventDefault()}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      disabled={isDeleteLoading}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col flex-1 p-5 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {showStatus && onDelete && !post.coverImage && (
                <div
                  className="absolute right-3 top-3 z-10"
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-8 rounded-full bg-card/90 shadow-md hover:bg-card border-0"
                        aria-label="Действия"
                        disabled={isDeleteLoading}
                        onClick={e => e.preventDefault()}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={handleDeleteClick}
                        disabled={isDeleteLoading}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {post.tags.slice(0, 5).map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/20"
                    >
                      {tag.name}
                    </span>
                  ))}
                  {post.tags.length > 5 && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      +{post.tags.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Title */}
              <h3 className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {post.title}
              </h3>
            </div>

            {/* Status Badge */}
            {showStatus && <BlogStatusBadge status={post.status} />}
          </div>

          {/* Description */}
          {post.shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
              {post.shortDescription}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-border/50">
            {/* Organization & Date */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {post.organization.logoUrl && (
                <img
                  src={getMediaUrl(post.organization.logoUrl)}
                  alt={post.organization.name}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{post.organization.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </p>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex items-center gap-3 ml-4 flex-wrap justify-end">
              {/* Reading time */}
              <div
                className="flex items-center gap-1 text-xs text-muted-foreground"
                title="Время чтения"
              >
                <Clock className="h-4 w-4" />
                <span>{post.readingTime} мин</span>
              </div>

              {/* Views */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{post.viewsCount}</span>
              </div>

              {/* Comments */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>{post.commentsCount}</span>
              </div>

              {/* Likes */}
              {onLike && (
                <button
                  onClick={handleLike}
                  disabled={isLikeLoading}
                  className={cn(
                    'flex items-center gap-1 text-xs transition-colors',
                    post.isLiked
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400',
                    isLikeLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Heart className={cn('h-4 w-4', post.isLiked && 'fill-current')} />
                  <span>{post.likesCount}</span>
                </button>
              )}

              {/* Save */}
              {onSave && (
                <button
                  onClick={handleSave}
                  disabled={isSaveLoading}
                  className={cn(
                    'flex items-center gap-1 text-xs transition-colors',
                    post.isSaved
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400',
                    isSaveLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Bookmark className={cn('h-4 w-4', post.isSaved && 'fill-current')} />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {showStatus && onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent onClick={e => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить статью <strong>«{post.title}»</strong>? Это действие
                нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={e => e.stopPropagation()}>
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleteLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Link>
  )
}
