import { useEffect, useMemo, useState } from 'react'

import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { formatDate } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import type { EventCheckpoint } from '@api/services'
import {
  useCreateEventCheckpoint,
  useDeleteEventCheckpoint,
  useEventCheckpointsQuery,
  useUpdateEventCheckpoint,
} from '@features/events/api'
import { toDateTimeLocalValue, toISO8601Z } from '@shared/lib'
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
  Badge,
  Button,
  DateTimeInput,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
} from '@shared/ui'

type EventCheckpointsManagerProps = {
  eventId: string
  /** ISO-дата начала события: подсказка для дефолтов первого чекпоинта. */
  eventStartDate?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CheckpointDialogMode =
  | { kind: 'create' }
  | { kind: 'edit'; checkpoint: EventCheckpoint }

/** Бэкенд отдаёт machine-readable code — по нему выбираем текст, а не по message. */
function checkpointErrorMessage(
  error: unknown,
  t: ReturnType<typeof useI18n>['t']
): string {
  const payload = error as { code?: string; message?: string } | null
  switch (payload?.code) {
    case 'EVENT_CHECKPOINT_OVERLAP':
      return t('events.checkpoints.errorOverlap')
    case 'EVENT_CHECKPOINT_INVALID_WINDOW':
      return t('events.checkpoints.errorWindow')
    case 'EVENT_CHECKPOINT_WINDOW_TOO_LONG':
      return t('events.checkpoints.errorTooLong')
    default:
      return payload?.message || t('events.checkpoints.errorGeneric')
  }
}

/** Локальная строка `YYYY-MM-DDTHH:mm` со сдвигом на N часов от базы. */
function shiftLocalDateTime(base: Date, hours: number): string {
  const shifted = new Date(base.getTime() + hours * 60 * 60 * 1000)
  shifted.setMinutes(0, 0, 0)
  return toDateTimeLocalValue(shifted.toISOString())
}

function CheckpointFormDialog({
  eventId,
  mode,
  open,
  onOpenChange,
  defaults,
}: {
  eventId: string
  mode: CheckpointDialogMode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Начало/конец, подставляемые новому чекпоинту. */
  defaults: { startsAt: string; endsAt: string }
}) {
  const { t } = useI18n()
  const create = useCreateEventCheckpoint(eventId)
  const update = useUpdateEventCheckpoint(eventId)

  const [name, setName] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  useEffect(() => {
    if (!open || !mode) return
    if (mode.kind === 'edit') {
      setName(mode.checkpoint.name)
      setStartsAt(toDateTimeLocalValue(mode.checkpoint.startsAt))
      setEndsAt(toDateTimeLocalValue(mode.checkpoint.endsAt))
    } else {
      setName('')
      setStartsAt(defaults.startsAt)
      setEndsAt(defaults.endsAt)
    }
  }, [open, mode, defaults])

  if (!mode) return null

  const isPending = create.isPending || update.isPending

  const handleSubmit = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error(t('events.checkpoints.errorNameRequired'))
      return
    }
    const startsIso = toISO8601Z(startsAt)
    const endsIso = toISO8601Z(endsAt)
    if (!startsIso || !endsIso) {
      toast.error(t('events.checkpoints.errorWindow'))
      return
    }
    // Дублируем серверную проверку, чтобы не гонять заведомо битую форму по сети.
    if (new Date(endsIso).getTime() <= new Date(startsIso).getTime()) {
      toast.error(t('events.checkpoints.errorWindow'))
      return
    }

    const body = { name: trimmedName, startsAt: startsIso, endsAt: endsIso }
    const onError = (error: unknown) =>
      toast.error(checkpointErrorMessage(error, t))

    if (mode.kind === 'create') {
      create.mutate(body, {
        onSuccess: () => {
          toast.success(t('events.checkpoints.created'))
          onOpenChange(false)
        },
        onError,
      })
    } else {
      update.mutate(
        { checkpointId: mode.checkpoint.id, body },
        {
          onSuccess: () => {
            toast.success(t('events.checkpoints.updated'))
            onOpenChange(false)
          },
          onError,
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode.kind === 'create'
              ? t('events.checkpoints.createTitle')
              : t('events.checkpoints.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('events.checkpoints.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkpoint-name">
              {t('events.checkpoints.fieldName')}
            </Label>
            <Input
              id="checkpoint-name"
              value={name}
              maxLength={160}
              onChange={event => setName(event.target.value)}
              placeholder={t('events.checkpoints.fieldNamePlaceholder')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="checkpoint-starts">
                {t('events.checkpoints.fieldStart')}
              </Label>
              <DateTimeInput
                id="checkpoint-starts"
                value={startsAt}
                onChange={setStartsAt}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkpoint-ends">
                {t('events.checkpoints.fieldEnd')}
              </Label>
              <DateTimeInput
                id="checkpoint-ends"
                value={endsAt}
                onChange={setEndsAt}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('events.checkpoints.windowHint')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {mode.kind === 'create' ? t('actions.create') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EventCheckpointsManager({
  eventId,
  eventStartDate,
  open,
  onOpenChange,
}: EventCheckpointsManagerProps) {
  const { locale, t } = useI18n()
  const checkpointsQuery = useEventCheckpointsQuery(eventId, { enabled: open })
  const remove = useDeleteEventCheckpoint(eventId)

  const [dialogMode, setDialogMode] = useState<CheckpointDialogMode | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EventCheckpoint | null>(null)

  const checkpoints = useMemo(() => {
    const list = checkpointsQuery.data ?? []
    return [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }, [checkpointsQuery.data])

  // Новый чекпоинт начинается там, где кончился последний; для первого — от
  // начала события (или от ближайшего часа, если событие уже идёт).
  const defaults = useMemo(() => {
    const last = checkpoints[checkpoints.length - 1]
    const base = last
      ? new Date(last.endsAt)
      : eventStartDate && new Date(eventStartDate).getTime() > Date.now()
        ? new Date(eventStartDate)
        : new Date()
    return {
      startsAt: shiftLocalDateTime(base, 0),
      endsAt: shiftLocalDateTime(base, 2),
    }
  }, [checkpoints, eventStartDate])

  const handleDelete = () => {
    if (!pendingDelete) return
    remove.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(t('events.checkpoints.deleted'))
        setPendingDelete(null)
      },
      onError: error => {
        toast.error(checkpointErrorMessage(error, t))
        setPendingDelete(null)
      },
    })
  }

  const now = Date.now()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('events.checkpoints.title')}</DialogTitle>
            <DialogDescription>
              {t('events.checkpoints.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {checkpoints.length === 0
                ? t('events.checkpoints.emptyTitle')
                : t('events.checkpoints.countSummary', { count: checkpoints.length })}
            </p>
            <Button size="sm" onClick={() => setDialogMode({ kind: 'create' })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('events.checkpoints.addButton')}
            </Button>
          </div>

          {checkpointsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : checkpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-8 text-center">
              <CalendarClock className="size-5 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                {t('events.checkpoints.emptyTitle')}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {t('events.checkpoints.emptyDescription')}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('events.checkpoints.colCheckpoint')}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t('events.checkpoints.colMarked')}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {t('events.checkpoints.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {checkpoints.map(checkpoint => {
                    const startsAt = new Date(checkpoint.startsAt)
                    const endsAt = new Date(checkpoint.endsAt)
                    const isActive =
                      startsAt.getTime() <= now && endsAt.getTime() > now
                    const isFinished = endsAt.getTime() <= now

                    return (
                      <tr
                        key={checkpoint.id}
                        className={cn(isFinished && !isActive && 'opacity-70')}
                      >
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">{checkpoint.name}</span>
                            {isActive && (
                              <Badge className="h-4 px-1.5 text-[10px]">
                                {t('events.checkpoints.activeNow')}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {formatDate(startsAt, locale, {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' — '}
                            {formatDate(endsAt, locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                            {checkpoint.checkedInCount}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() =>
                                setDialogMode({ kind: 'edit', checkpoint })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">
                                {t('actions.edit')}
                              </span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => setPendingDelete(checkpoint)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CheckpointFormDialog
        eventId={eventId}
        mode={dialogMode}
        open={dialogMode !== null}
        onOpenChange={isOpen => {
          if (!isOpen) setDialogMode(null)
        }}
        defaults={defaults}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={isOpen => {
          if (!isOpen) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('events.checkpoints.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.checkedInCount > 0
                ? t('events.checkpoints.deleteWithMarks', {
                    name: pendingDelete.name,
                    count: pendingDelete.checkedInCount,
                  })
                : t('events.checkpoints.deleteDescription', {
                    name: pendingDelete?.name ?? '',
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={remove.isPending}
            >
              {remove.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
