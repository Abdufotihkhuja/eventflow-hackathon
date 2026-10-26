import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

import { MessageSquare, Send, Trash2, Edit2, X, Check } from 'lucide-react'

import {
  useEventCommentsQuery,
  useCreateEventComment,
  useUpdateEventComment,
  useDeleteEventComment,
} from '@features/events'
import { useAuth } from '@entities/auth'
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
  Button,
  Card,
  Skeleton,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'

type EventCommentsTabProps = {
  eventId: string
  commentsEnabled: boolean
}

export function EventCommentsTab({ eventId, commentsEnabled }: EventCommentsTabProps) {
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)

  const { currentUser } = useAuth()
  const { data: commentsResponse, isLoading } = useEventCommentsQuery(eventId, commentsEnabled)
  // Поддержка пагинированного ответа { data, total } и обратная совместимость с массивом
  const comments = Array.isArray(commentsResponse)
    ? commentsResponse
    : (commentsResponse?.data ?? [])
  const totalComments = Array.isArray(commentsResponse)
    ? commentsResponse.length
    : (commentsResponse?.total ?? 0)
  const createComment = useCreateEventComment()
  const updateComment = useUpdateEventComment()
  const deleteComment = useDeleteEventComment()

  // Получаем ID текущего пользователя
  const currentUserId =
    currentUser?.type === 'organization'
      ? currentUser.data.id
      : currentUser?.type === 'member'
        ? currentUser.data.id
        : null

  const handleAddComment = () => {
    if (!newComment.trim()) return
    createComment.mutate(
      { eventId, data: { content: newComment.trim() } },
      {
        onSuccess: () => {
          setNewComment('')
        },
      }
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
      {
        eventId,
        commentId: editingId,
        data: { content: editContent.trim() },
      },
      {
        onSuccess: () => {
          setEditingId(null)
          setEditContent('')
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
        <p className="mt-4 text-sm font-medium text-foreground">Комментарии отключены</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Комментарии к этому событию отключены организатором
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с количеством */}
      {totalComments > 0 && (
        <p className="text-sm text-muted-foreground">
          Всего комментариев: <span className="font-medium text-foreground">{totalComments}</span>
        </p>
      )}
      {/* New Comment Form */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              placeholder="Напишите комментарий..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddComment()
                }
              }}
              rows={3}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || createComment.isPending}
              className="w-full gap-2 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              Отправить
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Нажмите Ctrl+Enter (или Cmd+Enter на Mac) для отправки
          </p>
        </div>
      </Card>

      {/* Comments List */}
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
          {comments.map(comment => {
            const isEditing = editingId === comment.id
            const authorName = `${comment.user.firstName} ${comment.user.lastName}`.trim()
            const authorInitials = `${comment.user.firstName?.[0] ?? ''}${comment.user.lastName?.[0] ?? ''}`.trim() || '?'

            return (
              <Card key={comment.id} className="p-4">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={comment.user.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-brand-soft text-brand-soft-foreground text-sm font-bold">
                      {authorInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-medium text-sm text-foreground">{authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                        {comment.updatedAt !== comment.createdAt && (
                          <span className="text-xs text-muted-foreground italic">(изменено)</span>
                        )}
                      </div>
                      {/* Показываем кнопки редактирования/удаления только для своих комментариев */}
                      {currentUserId === comment.userId && (
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={updateComment.isPending}
                                aria-label={t('actions.save')}
                                className="h-7 w-7 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
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
                                onClick={() => handleStartEdit(comment.id, comment.content)}
                                aria-label={t('actions.edit')}
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                            onClick={() => setDeletingCommentId(comment.id)}
                            disabled={deleteComment.isPending}
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
                        onChange={e => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm font-medium text-foreground">Комментариев пока нет</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Будьте первым, кто оставит комментарий к этому событию
            </p>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deletingCommentId} onOpenChange={open => !open && setDeletingCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить комментарий?</AlertDialogTitle>
            <AlertDialogDescription>
              Комментарий будет удалён без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCommentId(null)}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingCommentId) return
                handleDelete(deletingCommentId)
                setDeletingCommentId(null)
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
