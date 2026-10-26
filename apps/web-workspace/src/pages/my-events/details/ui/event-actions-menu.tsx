import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Ban, CheckCircle, ChevronDown, Copy, Loader2, RefreshCw, Send, Trash2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { EventStatus, getEventStatusLabel, type Event } from '@entities/event'
import {
  useCancelEvent,
  useCompleteEvent,
  useDeleteEvent,
  useDuplicateEvent,
  useRegenerateInviteCode,
  useSubmitEventForReview,
} from '@features/events/api'
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
} from '@shared/ui'

type EventActionsMenuProps = {
  event: Event
}

export function EventActionsMenu({ event }: EventActionsMenuProps) {
  const t = useT()
  const navigate = useNavigate()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const submitForReview = useSubmitEventForReview()
  const cancelEvent = useCancelEvent()
  const completeEvent = useCompleteEvent()
  const deleteEvent = useDeleteEvent()
  const duplicateEvent = useDuplicateEvent()
  const regenerateInviteCode = useRegenerateInviteCode()

  const isLoading =
    submitForReview.isPending ||
    cancelEvent.isPending ||
    completeEvent.isPending ||
    deleteEvent.isPending ||
    duplicateEvent.isPending ||
    regenerateInviteCode.isPending

  // Модерация принимает только события с будущим стартом — для прошедшего
  // черновика пункт был бы заведомо мёртвым (400 от API).
  const canSubmitForReview =
    event.status === EventStatus.DRAFT && new Date(event.startDate).getTime() > Date.now()
  const canCancel = event.status === EventStatus.DRAFT || event.status === EventStatus.PUBLISHED
  // Прошедшее событие, которое уже было в эфире, можно завершить даже из
  // черновика: иначе после ре-модерации/отклонения оно застревает навсегда.
  const canComplete =
    event.status === EventStatus.PUBLISHED ||
    (event.status === EventStatus.DRAFT &&
      Boolean(event.publishedAt) &&
      new Date(event.endDate).getTime() < Date.now())
  const canRegenerateInviteCode =
    event.status !== EventStatus.CANCELLED && event.status !== EventStatus.COMPLETED

  const handleSubmitForReview = () => {
    submitForReview.mutate(event.id)
  }

  const handleCancel = () => {
    cancelEvent.mutate(event.id, {
      onSuccess: () => setShowCancelDialog(false),
    })
  }

  const handleComplete = () => {
    completeEvent.mutate(event.id, {
      onSuccess: () => setShowCompleteDialog(false),
    })
  }

  const handleRegenerateInviteCode = () => {
    regenerateInviteCode.mutate(event.id)
  }

  const handleDuplicate = () => {
    duplicateEvent.mutate(event, {
      onSuccess: duplicated => {
        if (duplicated?.id) navigate(`/my-events/${duplicated.id}`)
      },
    })
  }

  const handleDelete = () => {
    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        navigate('/my-events')
      },
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t('actions.title')}
            <ChevronDown className="ml-2 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 size-4" />
            {t('actions.duplicate')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {canSubmitForReview && (
            <DropdownMenuItem onClick={handleSubmitForReview}>
              <Send className="mr-2 size-4" />
              {t('events.actions.submitForReview')}
            </DropdownMenuItem>
          )}

          {canComplete && (
            <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
              <CheckCircle className="mr-2 size-4" />
              {t('events.actions.completeEvent')}
            </DropdownMenuItem>
          )}

          {canRegenerateInviteCode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRegenerateInviteCode}>
                <RefreshCw className="mr-2 size-4" />
                {t('events.actions.regenerateInviteCode')}
              </DropdownMenuItem>
            </>
          )}

          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="mr-2 size-4" />
                {t('events.actions.cancelEvent')}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            {t('events.actions.deleteEvent')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmations.cancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.confirmations.cancelDescription', { title: event.title })}
              <br />
              <br />
              {t('events.confirmations.currentStatus', {
                status: getEventStatusLabel(t)(event.status),
              })}
              <br />
              <br />
              {t('events.confirmations.cancelNotification')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelEvent.isPending}>
              {t('actions.back')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelEvent.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelEvent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('events.actions.cancelEvent')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmations.completeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.confirmations.completeDescription', { title: event.title })}
              <br />
              <br />
              {t('events.confirmations.afterCompletion')}
              <ul className="mt-2 list-inside list-disc text-sm">
                <li>{t('events.confirmations.completionRegistrationClosed')}</li>
                <li>{t('events.confirmations.completionCertificatesAvailable')}</li>
                <li>{t('events.confirmations.completionArchived')}</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completeEvent.isPending}>
              {t('actions.back')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={completeEvent.isPending}>
              {completeEvent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('events.actions.completeEvent')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.dialogs.deleteDescription', { title: event.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvent.isPending}>
              {t('actions.back')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteEvent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
