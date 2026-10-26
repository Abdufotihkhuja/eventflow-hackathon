/**
 * Super Admin — страница управления подборками
 * API: GET/POST/PATCH/DELETE /api/v1/super-admin/collections
 */

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'
import { useLocale, useT } from '@eventflow/i18n/react'
import { translateOptions } from '@eventflow/i18n'

import type { AdminCollection } from '@api/services/superAdmin.types'
import type { CreateAdminCollectionRequest } from '@api/services/superAdmin.types'
import {
  useAdminCollections,
  useCreateAdminCollection,
  useUpdateAdminCollection,
  useDeleteAdminCollection,
  useAdminCollectionEvents,
  useAddEventsToCollection,
  useRemoveEventsFromCollection,
} from '@features/super-admin'
import {
  Button,
  DataTable,
  ErrorState,
  FilterToolbar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

import { createCollectionsColumns } from './collections-columns'
import { CollectionFormDialog } from './collection-form-dialog'
import { CollectionEventsSheet } from './collection-events-sheet'

const ACTIVE_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.all' },
  { value: 'true', labelKey: 'admin.statuses.active' },
  { value: 'false', labelKey: 'admin.statuses.inactive' },
] as const

export default function SuperAdminCollectionsPage() {
  const t = useT()
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('all')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<AdminCollection | null>(null)
  const [eventsSheetOpen, setEventsSheetOpen] = useState(false)
  const [collectionForEvents, setCollectionForEvents] = useState<AdminCollection | null>(null)

  const { data, isLoading, error, refetch } = useAdminCollections({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    isActive: isActive === 'all' ? undefined : isActive === 'true',
  })

  const createCollection = useCreateAdminCollection()
  const updateCollection = useUpdateAdminCollection()
  const deleteCollection = useDeleteAdminCollection()
  const addEventsToCollection = useAddEventsToCollection()
  const removeEventsFromCollection = useRemoveEventsFromCollection()
  const { data: editingCollectionEvents } = useAdminCollectionEvents(
    editingCollection?.id ?? null
  )
  const isPending =
    createCollection.isPending ||
    updateCollection.isPending ||
    deleteCollection.isPending ||
    addEventsToCollection.isPending ||
    removeEventsFromCollection.isPending

  const handleCreate = () => {
    setEditingCollection(null)
    setFormOpen(true)
  }

  const handleEdit = (collection: AdminCollection) => {
    setEditingCollection(collection)
    setFormOpen(true)
  }

  const handleSubmit = (
    formData: CreateAdminCollectionRequest,
    selectedEventIds: string[]
  ) => {
    if (editingCollection) {
      const currentEventIds = (editingCollectionEvents ?? []).map(item => item.event.id)
      const toAdd = selectedEventIds.filter(id => !currentEventIds.includes(id))
      const toRemove = currentEventIds.filter(id => !selectedEventIds.includes(id))
      updateCollection.mutate(
        { id: editingCollection.id, data: formData },
        {
          onSuccess: async () => {
            if (toAdd.length > 0) {
              await addEventsToCollection.mutateAsync({
                id: editingCollection.id,
                data: { eventIds: toAdd },
              })
            }
            if (toRemove.length > 0) {
              await removeEventsFromCollection.mutateAsync({
                id: editingCollection.id,
                data: { eventIds: toRemove },
              })
            }
            setFormOpen(false)
          },
        }
      )
    } else {
      createCollection.mutate(
        { ...formData, eventIds: selectedEventIds },
        { onSuccess: () => setFormOpen(false) }
      )
    }
  }

  const handleDelete = (collection: AdminCollection) => {
    deleteCollection.mutate(collection.id)
  }

  const handleManageEvents = (collection: AdminCollection) => {
    setCollectionForEvents(collection)
    setEventsSheetOpen(true)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const clearFilters = () => {
    setSearch('')
    setIsActive('all')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }
  const hasFilters = !!search || isActive !== 'all'
  const activeOptions = useMemo(() => translateOptions(ACTIVE_OPTIONS, t), [t])

  const columns = useMemo(
    () =>
      createCollectionsColumns({
        t,
        locale,
        onEdit: handleEdit,
        onManageEvents: handleManageEvents,
        onDelete: handleDelete,
        isPending,
      }),
    [isPending, locale, t]
  )

  const pageCount = data ? Math.ceil(data.total / pagination.pageSize) : 0

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState
          title={t('admin.errors.loadFailed')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      )}

      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('admin.filters.searchByTitle')}
        hasFilters={hasFilters}
        onReset={clearFilters}
        resetLabel={t('admin.actions.reset')}
        filters={
          <Select
            value={isActive}
            onValueChange={v => {
              setIsActive(v)
              setPagination(prev => ({ ...prev, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="h-9 w-[160px]" aria-label={t('admin.filters.status')}>
              <SelectValue placeholder={t('admin.filters.status')} />
            </SelectTrigger>
            <SelectContent>
              {activeOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {t('admin.collections.newTitle')}
          </Button>
        }
        footer={
          data
            ? t('admin.tables.resultsFound', {
                count: data.total,
                entity: t('admin.tables.entities.collections'),
              })
            : undefined
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        emptyText={t('admin.tables.empty.collections')}
      />

      <CollectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        collection={editingCollection}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      <CollectionEventsSheet
        collection={collectionForEvents}
        open={eventsSheetOpen}
        onOpenChange={setEventsSheetOpen}
      />
    </div>
  )
}
