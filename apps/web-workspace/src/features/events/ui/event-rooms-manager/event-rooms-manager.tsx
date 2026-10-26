import { useEffect, useMemo, useState } from 'react'

import { Loader2, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useLocale } from '@eventflow/i18n/react'

import type { EventRoom } from '@api/services'
import {
  useCreateEventRoom,
  useDeleteEventRoom,
  useEventRoomsQuery,
  useUpdateEventRoom,
} from '@features/events/api'
import { resolveLocalizedField } from '@entities/event/lib/localized-field'
import {
  buildScalarNameTranslations,
  flattenScalarNameTranslations,
  ScalarNameTranslationEditor,
  type ScalarNameTranslationsState,
} from '@features/translations'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Skeleton,
  Switch,
} from '@shared/ui'

type EventRoomsManagerProps = {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Не удалось выполнить действие'
}

type RoomDialogMode =
  | { kind: 'create' }
  | { kind: 'edit'; room: EventRoom }

function RoomFormDialog({
  eventId,
  mode,
  open,
  onOpenChange,
  nextSortOrder,
}: {
  eventId: string
  mode: RoomDialogMode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Auto-assigned sortOrder for new rooms (max + 10). Edit keeps existing. */
  nextSortOrder: number
}) {
  const create = useCreateEventRoom(eventId)
  const update = useUpdateEventRoom(eventId)
  const [translationsState, setTranslationsState] = useState<ScalarNameTranslationsState>(() =>
    buildScalarNameTranslations('name'),
  )
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!open || !mode) return
    if (mode.kind === 'edit') {
      setTranslationsState(
        buildScalarNameTranslations('name', {
          scalar: mode.room.name,
          translations: mode.room.translations,
        }),
      )
      setIsActive(mode.room.isActive)
    } else {
      setTranslationsState(buildScalarNameTranslations('name'))
      setIsActive(true)
    }
  }, [open, mode])

  if (!mode) return null

  const isPending = create.isPending || update.isPending
  const handleSubmit = () => {
    const { scalar, translations } = flattenScalarNameTranslations(translationsState, 'name')
    if (!scalar) {
      toast.error('Заполните название хотя бы на одном языке')
      return
    }
    if (mode.kind === 'create') {
      create.mutate(
        {
          name: scalar,
          sortOrder: nextSortOrder,
          isActive,
          ...(Object.keys(translations).length > 0 ? { translations } : {}),
        },
        {
          onSuccess: () => {
            toast.success('Зал создан')
            onOpenChange(false)
          },
          onError: err => toast.error(ApiErrorMessage(err)),
        },
      )
    } else {
      update.mutate(
        {
          roomId: mode.room.id,
          body: {
            name: scalar,
            isActive,
            ...(Object.keys(translations).length > 0 ? { translations } : {}),
          },
        },
        {
          onSuccess: () => {
            toast.success('Зал обновлён')
            onOpenChange(false)
          },
          onError: err => toast.error(ApiErrorMessage(err)),
        },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode.kind === 'create' ? 'Новый зал' : 'Редактирование зала'}
          </DialogTitle>
          <DialogDescription>
            Название зала отображается на программе и в публичной странице события.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ScalarNameTranslationEditor
            fieldKey="name"
            label="Название зала"
            placeholder="Например, Главный зал"
            state={translationsState}
            onStateChange={setTranslationsState}
          />
          <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <div>
              <Label htmlFor="room-active" className="text-sm font-medium">
                Активен
              </Label>
              <p className="text-xs text-muted-foreground">
                виден в программе и фильтрах
              </p>
            </div>
            <Switch id="room-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {mode.kind === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EventRoomsManager({ eventId, open, onOpenChange }: EventRoomsManagerProps) {
  const roomsQuery = useEventRoomsQuery(eventId, { enabled: open })
  const update = useUpdateEventRoom(eventId)
  const remove = useDeleteEventRoom(eventId)
  const uiLocale = useLocale()

  const [dialogMode, setDialogMode] = useState<RoomDialogMode | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EventRoom | null>(null)

  const sortedRooms = useMemo(() => {
    const list = roomsQuery.data ?? []
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [roomsQuery.data])

  // Auto-assign sortOrder for new rooms = max + 10. UX-wise the user shouldn't
  // think about ordering when creating; reorder later via drag if/when added.
  const nextSortOrder = useMemo(
    () => sortedRooms.reduce((acc, r) => Math.max(acc, r.sortOrder), 0) + 10,
    [sortedRooms],
  )

  const handleToggleActive = (room: EventRoom) => {
    update.mutate(
      { roomId: room.id, body: { isActive: !room.isActive } },
      {
        onSuccess: () => toast.success(room.isActive ? 'Зал отключён' : 'Зал включён'),
        onError: err => toast.error(ApiErrorMessage(err)),
      },
    )
  }

  const handleDelete = () => {
    if (!pendingDelete) return
    remove.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Зал удалён')
        setPendingDelete(null)
      },
      onError: err => {
        toast.error(ApiErrorMessage(err))
        setPendingDelete(null)
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Залы</DialogTitle>
            <DialogDescription>
              Управляйте списком залов и сцен этого события. Залы используются для фильтра
              программы и валидации параллельных сессий.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {sortedRooms.length === 0
                ? 'Залы пока не добавлены'
                : `Активных: ${sortedRooms.filter(r => r.isActive).length} / ${sortedRooms.length}`}
            </p>
            <Button size="sm" onClick={() => setDialogMode({ kind: 'create' })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Добавить зал
            </Button>
          </div>

          {roomsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sortedRooms.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Залы пока не добавлены
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Зал</th>
                    <th className="px-3 py-2 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedRooms.map(room => (
                    <tr key={room.id} className={cn(!room.isActive && 'opacity-70')}>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">
                            {resolveLocalizedField(
                              room.translations,
                              'name',
                              uiLocale,
                              room.name,
                            )}
                          </span>
                          {!room.isActive && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                              выключен
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => setDialogMode({ kind: 'edit', room })}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Изменить
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => handleToggleActive(room)}
                            disabled={update.isPending}
                          >
                            {room.isActive ? (
                              <>
                                <PowerOff className="h-3.5 w-3.5" /> Выключить
                              </>
                            ) : (
                              <>
                                <Power className="h-3.5 w-3.5" /> Включить
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(room)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RoomFormDialog
        eventId={eventId}
        mode={dialogMode}
        open={dialogMode !== null}
        onOpenChange={open => {
          if (!open) setDialogMode(null)
        }}
        nextSortOrder={nextSortOrder}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить зал?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Зал «${resolveLocalizedField(pendingDelete.translations, 'name', uiLocale, pendingDelete.name)}» будет удалён без возможности восстановления. Если зал привязан к пунктам программы, удаление будет заблокировано — отвяжите его сначала или выключите.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={remove.isPending}
            >
              {remove.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
