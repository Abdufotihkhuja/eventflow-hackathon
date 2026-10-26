import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, ru, uz } from 'date-fns/locale'
import { getDateFnsLocale } from '@eventflow/i18n'
import { useI18n, useT } from '@eventflow/i18n/react'

import {
  ChevronDown,
  ChevronUp,
  Check,
  Edit2,
  MessageSquare,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'

import {
  useEventCommentsQuery,
  useCreateEventComment,
  useUpdateEventComment,
  useDeleteEventComment,
} from '@features/events'
import { useAuth } from '@entities/auth'
import { getMediaUrl } from '@api/config'
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Skeleton,
} from '@shared/ui'
import type { EventComment } from '@api/services'

type EventCommentsTabProps = {
  eventId: string
  commentsEnabled: boolean
}

type CommentActorContext = {
  currentUserId: string | null
  currentOrganizationId: string | null
}

export function EventCommentsTab({ eventId, commentsEnabled }: EventCommentsTabProps) {
  const t = useT()
  const { locale } = useI18n()
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)

  const { currentUser } = useAuth()
  const { data: commentsResponse, isLoading } = useEventCommentsQuery(eventId, commentsEnabled)
  const comments = Array.isArray(commentsResponse)
    ? commentsResponse
    : (commentsResponse?.data ?? [])
  const totalComments = Array.isArray(commentsResponse)
    ? commentsResponse.length
    : (commentsResponse?.total ?? 0)
  const createComment = useCreateEventComment()
  const updateComment = useUpdateEventComment()
  const deleteComment = useDeleteEventComment()
  const dateFnsLocale = getDateFnsLocale(locale, { en: enUS, ru, uz })

  const actor: CommentActorContext = useMemo(() => {
    if (currentUser?.type === 'organization') {
      return { currentUserId: null, currentOrganizationId: currentUser.data.id }
    }
    if (currentUser?.type === 'member') {
      const orgId =
        (currentUser.data as { organizationId?: string }).organizationId ?? null
      return { currentUserId: currentUser.data.id, currentOrganizationId: orgId }
    }
    return { currentUserId: null, currentOrganizationId: null }
  }, [currentUser])

  const handleAddComment = () => {
    if (!newComment.trim()) return
    createComment.mutate(
      { eventId, data: { content: newComment.trim() } },
      { onSuccess: () => setNewComment('') }
    )
  }

  const handleStartEdit = (commentId: string, content: string) => {
    setEditingId(commentId)
    setEditContent(content)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = () => {
    if (!editingId || !editContent.trim()) return
    updateComment.mutate(
      { eventId, commentId: editingId, data: { content: editContent.trim() } },
      {
        onSuccess: () => {
          setEditingId(null)
          setEditContent('')
        },
      }
    )
  }

  const handleStartReply = (commentId: string) => {
    setReplyingToId(commentId)
    setReplyContent('')
  }

  const handleCancelReply = () => {
    setReplyingToId(null)
    setReplyContent('')
  }

  const handleSubmitReply = () => {
    if (!replyingToId || !replyContent.trim()) return
    createComment.mutate(
      { eventId, data: { content: replyContent.trim(), parentId: replyingToId } },
      {
        onSuccess: () => {
          setReplyingToId(null)
          setReplyContent('')
        },
      }
    )
  }

  const handleDelete = (commentId: string) => {
    deleteComment.mutate({ eventId, commentId })
  }

  if (!commentsEnabled) {
    return (
      <div className="py-12 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-sm font-medium text-foreground">
          {t('events.comments.disabledTitle')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('events.comments.disabledDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {totalComments > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('events.comments.totalCount', { count: totalComments })}{' '}
          <span className="font-medium text-foreground">{totalComments}</span>
        </p>
      )}

      {/* Composer для нового комментария верхнего уровня */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              placeholder={t('events.comments.placeholder')}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment()
              }}
              rows={3}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || createComment.isPending}
              className="w-full gap-2 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {t('actions.submit')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('events.comments.submitHint')}</p>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentNode
              key={comment.id}
              comment={comment}
              depth={0}
              actor={actor}
              t={t}
              dateFnsLocale={dateFnsLocale}
              editingId={editingId}
              editContent={editContent}
              replyingToId={replyingToId}
              replyContent={replyContent}
              isUpdating={updateComment.isPending}
              isSubmittingReply={createComment.isPending}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onChangeEdit={setEditContent}
              onStartReply={handleStartReply}
              onCancelReply={handleCancelReply}
              onSubmitReply={handleSubmitReply}
              onChangeReply={setReplyContent}
              onAskDelete={setDeletingCommentId}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm font-medium text-foreground">
              {t('events.comments.emptyTitle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('events.comments.emptyDescription')}
            </p>
          </div>
        </Card>
      )}

      <AlertDialog
        open={!!deletingCommentId}
        onOpenChange={open => !open && setDeletingCommentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.comments.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.comments.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCommentId(null)}>
              {t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingCommentId) return
                handleDelete(deletingCommentId)
                setDeletingCommentId(null)
              }}
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================================
// CommentNode — рекурсивный рендер одного комментария + вложенных ответов
// ============================================================================

type CommentNodeProps = {
  comment: EventComment
  depth: number
  actor: CommentActorContext
  t: ReturnType<typeof useT>
  dateFnsLocale: ReturnType<typeof getDateFnsLocale>
  editingId: string | null
  editContent: string
  replyingToId: string | null
  replyContent: string
  isUpdating: boolean
  isSubmittingReply: boolean
  onStartEdit: (commentId: string, content: string) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onChangeEdit: (value: string) => void
  onStartReply: (commentId: string) => void
  onCancelReply: () => void
  onSubmitReply: () => void
  onChangeReply: (value: string) => void
  onAskDelete: (commentId: string) => void
}

function CommentNode(props: CommentNodeProps) {
  const {
    comment,
    depth,
    actor,
    t,
    dateFnsLocale,
    editingId,
    editContent,
    replyingToId,
    replyContent,
    isUpdating,
    isSubmittingReply,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onChangeEdit,
    onStartReply,
    onCancelReply,
    onSubmitReply,
    onChangeReply,
    onAskDelete,
  } = props

  const [repliesExpanded, setRepliesExpanded] = useState(true)
  const isEditing = editingId === comment.id
  const isReplying = replyingToId === comment.id
  const isOrganizerAuthored = Boolean(comment.authorOrganizationId)

  const authorName = isOrganizerAuthored
    ? (comment.authorOrganization?.companyName ?? t('events.comments.organizerLabel'))
    : `${comment.user?.firstName ?? ''} ${comment.user?.lastName ?? ''}`.trim() ||
      t('public.comments.user')

  const authorInitials = isOrganizerAuthored
    ? authorName.charAt(0).toUpperCase()
    : `${comment.user?.firstName?.[0] ?? ''}${comment.user?.lastName?.[0] ?? ''}`.trim() ||
      '?'

  const avatarUrl = isOrganizerAuthored
    ? (comment.authorOrganization?.logoUrl
        ? getMediaUrl(comment.authorOrganization.logoUrl)
        : undefined)
    : comment.user?.avatarUrl
      ? getMediaUrl(comment.user.avatarUrl)
      : undefined

  const canEdit = isOrganizerAuthored
    ? actor.currentOrganizationId !== null &&
      comment.authorOrganizationId === actor.currentOrganizationId
    : actor.currentUserId !== null && comment.userId === actor.currentUserId

  const hasReplies = (comment.replies?.length ?? 0) > 0
  const wasEdited = comment.updatedAt !== comment.createdAt

  return (
    <div className={cn('flex gap-3', depth > 0 && 'mt-3')}>
      <Avatar
        className={cn(
          'h-10 w-10 flex-shrink-0 ring-2',
          isOrganizerAuthored
            ? 'ring-foreground/40'
            : 'ring-transparent'
        )}
      >
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback
          className={cn(
            'text-sm font-bold text-background',
            isOrganizerAuthored
              ? 'bg-foreground'
              : 'bg-muted-foreground'
          )}
        >
          {authorInitials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <Card
          className={cn(
            'p-3',
            isOrganizerAuthored &&
              'border-foreground/40 bg-foreground/5'
          )}
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">{authorName}</span>
              {isOrganizerAuthored && (
                <Badge
                  variant="secondary"
                  className="gap-1 border-foreground/40 bg-foreground/10 text-xs text-foreground"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {t('events.comments.organizerLabel')}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: dateFnsLocale,
                })}
              </span>
              {wasEdited && (
                <span className="text-xs italic text-muted-foreground">
                  {t('events.comments.edited')}
                </span>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onSaveEdit}
                      disabled={isUpdating}
                      aria-label={t('actions.save')}
                      className="h-7 w-7 p-0"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCancelEdit}
                      aria-label={t('actions.cancel')}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onStartEdit(comment.id, comment.content)}
                      aria-label={t('actions.edit')}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAskDelete(comment.id)}
                      aria-label={t('actions.delete')}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => onChangeEdit(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              autoFocus
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
          )}
        </Card>

        {/* Actions row под карточкой */}
        <div className="mt-1 flex items-center gap-2 pl-1 text-xs">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onStartReply(comment.id)}
            disabled={isSubmittingReply && isReplying}
          >
            <Reply className="h-3.5 w-3.5" />
            {t('events.comments.replyAsOrganizer')}
          </Button>
          {hasReplies && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setRepliesExpanded(prev => !prev)}
            >
              {repliesExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  {t('events.comments.hideReplies')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  {t('events.comments.showReplies', {
                    count: comment.replies?.length ?? 0,
                  })}
                </>
              )}
            </Button>
          )}
        </div>

        {isReplying && (
          <Card className="mt-2 border-foreground/30 bg-foreground/5 p-3">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('events.comments.replyingAs', { author: authorName })}
            </p>
            <textarea
              autoFocus
              value={replyContent}
              onChange={e => onChangeReply(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmitReply()
              }}
              rows={2}
              placeholder={t('events.comments.replyPlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelReply}>
                {t('actions.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={onSubmitReply}
                disabled={!replyContent.trim() || isSubmittingReply}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {t('events.comments.sendReply')}
              </Button>
            </div>
          </Card>
        )}

        {hasReplies && repliesExpanded && (
          <div
            className={cn(
              'mt-3 space-y-3 border-l-2 border-border pl-4',
              depth === 0 && 'ml-2'
            )}
          >
            {(comment.replies ?? []).map(reply => (
              <CommentNode
                key={reply.id}
                {...props}
                comment={reply}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
