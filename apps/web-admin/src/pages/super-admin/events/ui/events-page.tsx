/**
 * Super Admin — страница управления событиями
 * Согласно API: /api/v1/super-admin/events
 */

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'
import { useLocale, useT } from '@eventflow/i18n/react'
import { translateOptions } from '@eventflow/i18n'

import type {
  AdminEvent,
  EventStatus,
  EventFormat,
  EventType,
} from '@api/services/superAdmin.types'
import {
  useAdminEvents,
  useApproveEvent,
  useRejectEvent,
  useDeleteAdminEvent,
  useFeaturedEventMutation,
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

import { createEventsColumns } from './events-columns'
import { EventDetailSheet } from './event-detail-sheet'

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allStatuses' },
  { value: 'DRAFT', labelKey: 'admin.statuses.draft' },
  { value: 'PENDING_REVIEW', labelKey: 'admin.statuses.pendingModeration' },
  { value: 'PUBLISHED', labelKey: 'admin.statuses.published' },
  { value: 'COMPLETED', labelKey: 'statuses.completed' },
  { value: 'CANCELLED', labelKey: 'admin.statuses.cancelled' },
] as const

const FORMAT_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allFormats' },
  { value: 'ONLINE', labelKey: 'admin.statuses.online' },
  { value: 'OFFLINE', labelKey: 'admin.statuses.offline' },
  { value: 'HYBRID', labelKey: 'admin.statuses.hybrid' },
] as const

const TYPE_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allTypes' },
  { value: 'FREE', labelKey: 'admin.statuses.free' },
  { value: 'PAID', labelKey: 'admin.statuses.paid' },
] as const

const FEATURED_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allEvents' },
  { value: 'featured', labelKey: 'admin.filters.featured' },
  { value: 'not-featured', labelKey: 'admin.filters.notFeatured' },
] as const

export default function SuperAdminEventsPage() {
  const t = useT()
  const locale = useLocale()
  const navigate = useNavigate()
  // Кросс-ссылка из карточки организации: /admin/events?organizationId=<id>
  const [searchParams, setSearchParams] = useSearchParams()
  const organizationId = searchParams.get('organizationId') || undefined

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [format, setFormat] = useState('all')
  const [type, setType] = useState('all')
  const [featured, setFeatured] = useState('all')

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data, isLoading, error, refetch } = useAdminEvents({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    status: status !== 'all' ? (status as EventStatus) : undefined,
    format: format !== 'all' ? (format as EventFormat) : undefined,
    type: type !== 'all' ? (type as EventType) : undefined,
    organizationId,
    isFeatured: featured === 'featured' ? true : featured === 'not-featured' ? false : undefined,
  })

  // Имя организации для чипа берём из загруженных событий; пока данных нет — показываем id.
  const organizationLabel = organizationId
    ? (data?.data.find(event => event.organizationId === organizationId)?.organization
        .companyName ?? organizationId)
    : undefined

  const clearOrganizationFilter = () => {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        params.delete('organizationId')
        return params
      },
      { replace: true }
    )
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const approveEvent = useApproveEvent()
  const rejectEvent = useRejectEvent()
  const deleteEvent = useDeleteAdminEvent()
  const toggleFeatured = useFeaturedEventMutation()

  const isPending = approveEvent.isPending || rejectEvent.isPending || deleteEvent.isPending

  const handleView = (event: AdminEvent) => {
    navigate(`/admin/events/${event.id}`)
  }

  const handleApprove = (event: AdminEvent) => {
    approveEvent.mutate(event.id, {
      onSuccess: () => {
        setSheetOpen(false)
        setSelectedEvent(null)
      },
    })
  }

  const handleReject = (event: AdminEvent, reason?: string) => {
    rejectEvent.mutate(
      { eventId: event.id, reason },
      {
        onSuccess: () => {
          setSheetOpen(false)
          setSelectedEvent(null)
        },
      }
    )
  }

  const handleToggleFeatured = (event: AdminEvent) => {
    toggleFeatured.mutate(event.id)
  }

  const handleDelete = (event: AdminEvent, reason?: string) => {
    deleteEvent.mutate(
      { eventId: event.id, reason },
      {
        onSuccess: () => {
          setSheetOpen(false)
          setSelectedEvent(null)
        },
      }
    )
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setFormat('all')
    setType('all')
    setFeatured('all')
    if (organizationId) clearOrganizationFilter()
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const hasFilters =
    !!search ||
    status !== 'all' ||
    format !== 'all' ||
    type !== 'all' ||
    featured !== 'all' ||
    !!organizationId
  const statusOptions = useMemo(() => translateOptions(STATUS_OPTIONS, t), [t])
  const formatOptions = useMemo(() => translateOptions(FORMAT_OPTIONS, t), [t])
  const typeOptions = useMemo(() => translateOptions(TYPE_OPTIONS, t), [t])
  const featuredOptions = useMemo(() => translateOptions(FEATURED_OPTIONS, t), [t])

  const columns = useMemo(
    () =>
      createEventsColumns({
        t,
        locale,
        onView: handleView,
        onApprove: handleApprove,
        onReject: handleReject,
        onDelete: handleDelete,
        onToggleFeatured: handleToggleFeatured,
        isPending,
        isDeletePending: deleteEvent.isPending,
        isFeaturedPending: toggleFeatured.isPending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending, deleteEvent.isPending, toggleFeatured.isPending, locale, t]
  )

  const pageCount = data ? Math.ceil(data.total / pagination.pageSize) : 0

  const handleSelectChange =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState
          title={t('admin.errors.loadFailed')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      )}

      {organizationId && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
            {t('admin.filters.organizationChip', { name: organizationLabel ?? organizationId })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-1.5 size-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={clearOrganizationFilter}
              aria-label={t('admin.actions.reset')}
            >
              <X className="size-3" />
            </Button>
          </span>
        </div>
      )}

      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('admin.filters.searchByTitle')}
        hasFilters={hasFilters}
        onReset={clearFilters}
        resetLabel={t('admin.actions.reset')}
        filters={
          <>
            <Select value={status} onValueChange={handleSelectChange(setStatus)}>
              <SelectTrigger className="h-9 w-[160px]" aria-label={t('admin.tables.columns.status')}>
                <SelectValue placeholder={t('admin.tables.columns.status')} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={format} onValueChange={handleSelectChange(setFormat)}>
              <SelectTrigger className="h-9 w-[140px]" aria-label={t('admin.tables.columns.format')}>
                <SelectValue placeholder={t('admin.tables.columns.format')} />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={handleSelectChange(setType)}>
              <SelectTrigger className="h-9 w-[140px]" aria-label={t('admin.tables.columns.type')}>
                <SelectValue placeholder={t('admin.tables.columns.type')} />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={featured} onValueChange={handleSelectChange(setFeatured)}>
              <SelectTrigger className="h-9 w-[150px]" aria-label={t('admin.filters.priority')}>
                <SelectValue placeholder={t('admin.filters.priority')} />
              </SelectTrigger>
              <SelectContent>
                {featuredOptions.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        footer={
          data
            ? t('admin.tables.resultsFound', {
                count: data.total,
                entity: t('admin.tables.entities.events'),
              })
            : undefined
        }
      />

      <DataTable
        key={`${status}-${format}-${type}-${featured}-${search}-${organizationId ?? ''}-${pagination.pageIndex}`}
        columns={columns}
        data={data?.data ?? []}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        emptyText={t('admin.tables.empty.events')}
      />

      <EventDetailSheet
        event={selectedEvent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
        isPending={isPending}
      />
    </div>
  )
}
