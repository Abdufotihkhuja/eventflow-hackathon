/**
 * Sheet управления событиями подборки (Super Admin)
 * API: GET /collections/:id/events, GET /collections/available-events, POST/DELETE/PATCH events
 */

import { useState, useEffect, useMemo } from 'react'
import { useT } from '@eventflow/i18n/react'
import { Plus, Trash2, Loader2, GripVertical, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AdminCollection } from '@api/services/superAdmin.types'
import {
  useAdminCollectionEvents,
  useAvailableCollectionEvents,
  useAddEventsToCollection,
  useRemoveEventsFromCollection,
  useReorderCollectionEvents,
} from '@features/super-admin'
import { useDebounce } from '@shared/lib/use-debounce'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Checkbox,
  ScrollArea,
  Input,
} from '@shared/ui'

type CollectionEventsSheetProps = {
  collection: AdminCollection | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CollectionEventsSheet({
  collection,
  open,
  onOpenChange,
}: CollectionEventsSheetProps) {
  const t = useT()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [orderDirty, setOrderDirty] = useState(false)
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [availableSearch, setAvailableSearch] = useState('')
  const [availablePage, setAvailablePage] = useState(1)

  const debouncedSearch = useDebounce(availableSearch, 400)
  const collectionId = collection?.id ?? null
  const { data: eventsData, isLoading } = useAdminCollectionEvents(collectionId)

  const availableParams = useMemo(
    () =>
      addDialogOpen
        ? {
            page: availablePage,
            limit: 20,
            search: debouncedSearch.trim() || undefined,
          }
        : undefined,
    [addDialogOpen, availablePage, debouncedSearch]
  )
  const { data: availableData, isLoading: availableLoading } = useAvailableCollectionEvents(
    availableParams,
    { enabled: addDialogOpen }
  )
  const addEvents = useAddEventsToCollection()
  const removeEvents = useRemoveEventsFromCollection()
  const reorderEvents = useReorderCollectionEvents()

  const eventsRaw = eventsData ?? []
  const events = eventsRaw
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(item => item.event)
  const availableEvents = availableData?.data ?? []
  const availableTotal = availableData?.total ?? 0
  const availableLimit = availableData?.limit ?? 20
  const totalPages = Math.max(1, Math.ceil(availableTotal / availableLimit))
  const currentIds = events.map(e => e.id)

  useEffect(() => {
    const raw = eventsData ?? []
    if (open && raw.length > 0 && !orderDirty) {
      const ids = raw
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(item => item.event.id)
      setOrderedIds(ids)
    }
  }, [open, eventsData, orderDirty])

  const handleAddOpen = () => {
    setSelectedEventIds([])
    setAvailableSearch('')
    setAvailablePage(1)
    setAddDialogOpen(true)
  }

  const handleAddSubmit = () => {
    if (!collectionId || selectedEventIds.length === 0) return
    addEvents.mutate(
      { id: collectionId, data: { eventIds: selectedEventIds } },
      { onSuccess: () => setAddDialogOpen(false) }
    )
  }

  const handleRemove = (eventId: string) => {
    if (!collectionId) return
    removeEvents.mutate({ id: collectionId, data: { eventIds: [eventId] } })
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const next = [...orderedIds]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setOrderedIds(next)
    setOrderDirty(true)
  }

  const handleMoveDown = (index: number) => {
    if (index >= orderedIds.length - 1) return
    const next = [...orderedIds]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setOrderedIds(next)
    setOrderDirty(true)
  }

  const handleSaveOrder = () => {
    if (!collectionId || orderedIds.length === 0) return
    reorderEvents.mutate(
      { id: collectionId, data: { eventIds: orderedIds } },
      { onSuccess: () => setOrderDirty(false) }
    )
  }

  const handleSheetOpen = (isOpen: boolean) => {
    if (!isOpen) setOrderDirty(false)
    onOpenChange(isOpen)
  }

  const toggleEventSelection = (id: string) => {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const alreadyInCollection = (id: string) => currentIds.includes(id)

  if (!collection) return null

  const isPending =
    addEvents.isPending || removeEvents.isPending || reorderEvents.isPending

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpen}>
        <SheetContent className="flex flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('admin.collections.eventsSheetTitle')}</SheetTitle>
            <SheetDescription>
              {t('admin.collections.eventsSheetDescription', { name: collection.title })}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddOpen} disabled={isPending} className="gap-1">
                <Plus className="size-4" />
                {t('admin.collections.addEvents')}
              </Button>
              {orderDirty && orderedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSaveOrder}
                  disabled={reorderEvents.isPending}
                >
                  {reorderEvents.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {t('admin.collections.saveOrder')}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('admin.collections.noEvents')}</p>
            ) : (
              <ScrollArea className="flex-1">
                <ul className="space-y-2 pr-4">
                  {(
                    orderDirty
                      ? orderedIds
                          .map(id => events.find(e => e.id === id))
                          .filter((e): e is (typeof events)[number] => !!e)
                      : events
                  ).map((event, index) => (
                    <li
                      key={event.id}
                      className="flex items-center gap-2 rounded-lg border bg-card p-2 text-sm"
                    >
                      {orderDirty ? (
                        <div className="flex flex-col gap-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-6 p-0"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-6 p-0"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === orderedIds.length - 1}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <GripVertical className="size-4 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(event.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add events dialog — GET /collections/available-events (PUBLISHED/COMPLETED, минимальные поля) */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.collections.addEventsTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('admin.filters.searchByTitle')}
                value={availableSearch}
                onChange={e => {
                  setAvailableSearch(e.target.value)
                  setAvailablePage(1)
                }}
                className="pl-8"
              />
            </div>
          </div>
          <ScrollArea className="max-h-[40vh] flex-1">
            {availableLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ul className="space-y-2 pr-4">
                {availableEvents
                  .filter(e => !alreadyInCollection(e.id))
                  .map(event => (
                    <li
                      key={event.id}
                      className="flex items-center gap-2 rounded border p-2 text-sm"
                    >
                      <Checkbox
                        checked={selectedEventIds.includes(event.id)}
                        onCheckedChange={() => toggleEventSelection(event.id)}
                      />
                      <span className="flex-1 truncate">{event.title}</span>
                    </li>
                  ))}
              </ul>
            )}
            {!availableLoading && availableEvents.filter(e => !alreadyInCollection(e.id)).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {availableTotal === 0
                  ? t('admin.collections.noAvailableEvents')
                  : t('admin.collections.allEventsAlreadyInCollection')}
              </p>
            )}
          </ScrollArea>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAvailablePage(p => Math.max(1, p - 1))}
                disabled={availablePage <= 1 || availableLoading}
              >
                <ChevronLeft className="size-4" />
                {t('admin.actions.back')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {availablePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAvailablePage(p => Math.min(totalPages, p + 1))}
                disabled={availablePage >= totalPages || availableLoading}
              >
                {t('admin.actions.next')}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t('admin.actions.cancel')}
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={selectedEventIds.length === 0 || addEvents.isPending}
            >
              {addEvents.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t('admin.actions.add')} ({selectedEventIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
