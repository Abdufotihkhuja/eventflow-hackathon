import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import {
  Ban,
  CheckCircle,
  ChevronDown,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react'

import type { AdminEvent, EventStatus } from '@api/services/superAdmin.types'
import { EVENT_STATUS_LABEL_KEYS } from '@entities/event'
import {
  useApproveEvent,
  useDeleteAdminEvent,
  useRejectEvent,
  useSetAdminEventStatus,
} from '@features/super-admin'
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
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shared/ui'

type AdminEventActionsMenuProps = {
  event: AdminEvent
}

export function AdminEventActionsMenu({ event }: AdminEventActionsMenuProps) {
  const t = useT()
  const navigate = useNavigate()
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [targetStatus, setTargetStatus] = useState<EventStatus | ''>('')
  const [statusReason, setStatusReason] = useState('')

  const approveEvent = useApproveEvent()
  const rejectEvent = useRejectEvent()
  const deleteEvent = useDeleteAdminEvent()
  const setEventStatus = useSetAdminEventStatus()

  const isLoading =
    approveEvent.isPending ||
    rejectEvent.isPending ||
    deleteEvent.isPending ||
    setEventStatus.isPending

  const canApprove = event.status === 'PENDING_REVIEW'
  const canReject = event.status === 'PENDING_REVIEW'
  const canPublish = event.status === 'DRAFT'

  const handleApprove = () => {
    approveEvent.mutate(event.id, {
      onSuccess: () => setShowApproveDialog(false),
    })
  }

  const handleReject = () => {
    rejectEvent.mutate(
      { eventId: event.id, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          setShowRejectDialog(false)
          setRejectReason('')
        },
      },
    )
  }

  const handleDelete = () => {
    deleteEvent.mutate(
      { eventId: event.id, reason: deleteReason || undefined },
      {
        onSuccess: () => {
          setShowDeleteDialog(false)
          setDeleteReason('')
          navigate('/admin/events')
        },
      },
    )
  }

  const handleStatusDialogChange = (open: boolean) => {
    setShowStatusDialog(open)
    if (!open) {
      setTargetStatus('')
      setStatusReason('')
    }
  }

  const handleSetStatus = () => {
    if (
      !targetStatus ||
      targetStatus === event.status ||
      statusReason.trim().length < 5
    )
      return

    setEventStatus.mutate(
      {
        eventId: event.id,
        data: {
          status: targetStatus,
          expectedStatus: event.status,
          expectedUpdatedAt: event.updatedAt,
          reason: statusReason.trim(),
        },
      },
      { onSuccess: () => handleStatusDialogChange(false) },
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            {t('tasks.actions.title')}
            <ChevronDown className="ml-2 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canPublish && (
            <DropdownMenuItem
              onClick={() => setShowApproveDialog(true)}
              className="text-success focus:text-success"
            >
              <Send className="mr-2 size-4" />
              {t('admin.actions.publish')}
            </DropdownMenuItem>
          )}

          {canApprove && (
            <DropdownMenuItem
              onClick={() => setShowApproveDialog(true)}
              className="text-success focus:text-success"
            >
              <CheckCircle className="mr-2 size-4" />
              {t('admin.actions.approve')}
            </DropdownMenuItem>
          )}

          {canReject && (
            <>
              {canApprove && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setShowRejectDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="mr-2 size-4" />
                {t('admin.actions.reject')}
              </DropdownMenuItem>
            </>
          )}
          {(canPublish || canApprove || canReject) && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setShowStatusDialog(true)}>
            <RefreshCw className="mr-2 size-4" />
            {t('admin.actions.changeEventStatus')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            {t('admin.actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Диалог одобрения */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.dialogs.approveEventTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.dialogs.approveEventDescription', {
                name: event.title,
              })}
              <br />
              <br />
              {t('admin.dialogs.approveEventHint')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveEvent.isPending}>
              {t('admin.actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={approveEvent.isPending}
            >
              {approveEvent.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {canPublish
                ? t('admin.actions.publish')
                : t('admin.actions.approve')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог отклонения */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.dialogs.rejectEventTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.dialogs.rejectEventToDraft', { name: event.title })}
              <br />
              <br />
              {t('events.confirmations.currentStatus', {
                status: t(
                  EVENT_STATUS_LABEL_KEYS[
                    event.status as keyof typeof EVENT_STATUS_LABEL_KEYS
                  ],
                ),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium">
              {t('admin.dialogs.rejectReason')}
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.dialogs.rejectReasonPlaceholder')}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectEvent.isPending}>
              {t('admin.actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejectEvent.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {rejectEvent.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {t('admin.actions.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showStatusDialog}
        onOpenChange={handleStatusDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.dialogs.changeEventStatusTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.dialogs.changeEventStatusDescription', {
                name: event.title,
              })}
              <br />
              <br />
              {t('events.confirmations.currentStatus', {
                status: t(
                  EVENT_STATUS_LABEL_KEYS[
                    event.status as keyof typeof EVENT_STATUS_LABEL_KEYS
                  ],
                ),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('admin.dialogs.newEventStatus')}
              </label>
              <Select
                value={targetStatus}
                onValueChange={(value) => setTargetStatus(value as EventStatus)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('admin.dialogs.selectEventStatus')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENT_STATUS_LABEL_KEYS) as EventStatus[]).map(
                    (status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        disabled={status === event.status}
                      >
                        {t(EVENT_STATUS_LABEL_KEYS[status])}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('admin.dialogs.statusChangeReason')}
              </label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={t('admin.dialogs.statusChangeReasonPlaceholder')}
                rows={3}
                maxLength={500}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t('admin.dialogs.changeEventStatusWarning')}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setEventStatus.isPending}>
              {t('admin.actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSetStatus}
              disabled={
                setEventStatus.isPending ||
                !targetStatus ||
                targetStatus === event.status ||
                statusReason.trim().length < 5
              }
            >
              {setEventStatus.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {t('admin.actions.changeEventStatus')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог удаления */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.dialogs.deleteEventTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.dialogs.deleteEventDescription', { name: event.title })}{' '}
              {t('admin.dialogs.deleteEventIrreversible')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium">
              {t('admin.dialogs.deleteReason')}
            </label>
            <Textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder={t('admin.dialogs.deleteReasonPlaceholder')}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvent.isPending}>
              {t('admin.actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {deleteEvent.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {t('admin.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
