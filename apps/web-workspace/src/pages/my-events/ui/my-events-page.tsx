import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ArrowUpDown, CalendarDays, LayoutGrid, List, Plus, Search } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import {
  EVENT_FORMAT_LABEL_KEYS,
  EVENT_STATUS_LABEL_KEYS,
  EVENT_TYPE_LABEL_KEYS,
  EventFormat,
  EventStatus,
  EventType,
} from '@entities/event'
import { useEventsQuery } from '@features/events/api'
import { cn } from '@shared/lib/cn'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PageTabs,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type PageTabItem,
} from '@shared/ui'

import { EventCard } from './event-card'
import { EventRow } from './event-row'

type SortKey = 'newest' | 'oldest' | 'date' | 'title'
type ViewMode = 'table' | 'cards'

const VIEW_STORAGE_KEY = 'eventflow-events-view'

const time = (value?: string | null) => (value ? new Date(value).getTime() : 0)

export default function MyEventsPage() {
  const t = useT()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')
  const [formatFilter, setFormatFilter] = useState<EventFormat | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [view, setViewState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'cards' || stored === 'table' ? stored : 'table'
  })
  const setView = (next: ViewMode) => {
    setViewState(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const {
    data: eventsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useEventsQuery({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  })

  const handleCreateEvent = () => {
    navigate('/my-events/create')
  }

  const allEvents = eventsData?.data ?? []
  const total = allEvents.length
  const visibleEvents =
    formatFilter !== 'all'
      ? allEvents.filter(event => event.format === formatFilter)
      : allEvents
  const filteredEvents = [...visibleEvents].sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return time(a.createdAt) - time(b.createdAt)
      case 'date':
        return time(a.startDate) - time(b.startDate)
      case 'title':
        return a.title.localeCompare(b.title)
      case 'newest':
      default:
        return time(b.createdAt) - time(a.createdAt)
    }
  })

  const hasFilters =
    Boolean(search) ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    formatFilter !== 'all'

  const statusTabs: PageTabItem<EventStatus | 'all'>[] = [
    { id: 'all', label: t('events.page.allStatuses') },
    ...Object.entries(EVENT_STATUS_LABEL_KEYS).map(([status, labelKey]) => ({
      id: status as EventStatus,
      label: t(labelKey),
    })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('events.page.myEvents')}
        title={t('events.page.myEvents')}
        description={t('events.page.description')}
        actions={
          <Button onClick={handleCreateEvent} size="sm">
            <Plus className="mr-1.5 size-4" />
            {t('events.page.createEvent')}
          </Button>
        }
        bottom={<PageTabs items={statusTabs} active={statusFilter} onChange={setStatusFilter} />}
      />

      {/* Filter bar — search · filters · view (all 40px, one rhythm) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('events.page.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 pl-9"
            aria-label={t('events.page.searchPlaceholder')}
          />
        </div>

        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as EventType | 'all')}>
          <SelectTrigger className="h-10 w-full sm:w-[150px]" aria-label={t('events.page.allTypes')}>
            <SelectValue placeholder={t('events.page.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('events.page.allTypes')}</SelectItem>
            {Object.entries(EVENT_TYPE_LABEL_KEYS).map(([type, labelKey]) => (
              <SelectItem key={type} value={type}>
                {t(labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={formatFilter}
          onValueChange={v => setFormatFilter(v as EventFormat | 'all')}
        >
          <SelectTrigger className="h-10 w-full sm:w-[150px]" aria-label={t('events.page.allFormats')}>
            <SelectValue placeholder={t('events.page.allFormats')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('events.page.allFormats')}</SelectItem>
            {Object.entries(EVENT_FORMAT_LABEL_KEYS).map(([format, labelKey]) => (
              <SelectItem key={format} value={format}>
                {t(labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
          <SelectTrigger className="h-10 w-full sm:w-[170px]" aria-label={t('events.page.sortLabel')}>
            <ArrowUpDown className="mr-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <SelectValue placeholder={t('events.page.sortLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('events.page.sortNewest')}</SelectItem>
            <SelectItem value="oldest">{t('events.page.sortOldest')}</SelectItem>
            <SelectItem value="date">{t('events.page.sortDate')}</SelectItem>
            <SelectItem value="title">{t('events.page.sortTitle')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-md border border-border bg-background p-1 sm:ml-auto">
          <ViewToggleButton
            active={view === 'table'}
            onClick={() => setView('table')}
            label={t('events.page.viewTable')}
          >
            <List className="size-4" />
          </ViewToggleButton>
          <ViewToggleButton
            active={view === 'cards'}
            onClick={() => setView('cards')}
            label={t('events.page.viewCards')}
          >
            <LayoutGrid className="size-4" />
          </ViewToggleButton>
        </div>
      </div>

      {isLoading && <LoadingState label={t('events.page.loading')} />}

      {isError && !isLoading && (
        <ErrorState
          title={t('events.page.loadError')}
          description={error?.message ?? t('events.page.checkConnection')}
          onRetry={() => refetch()}
          retryLabel={t('actions.retry')}
        />
      )}

      {!isLoading && !isError && filteredEvents.length === 0 && (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title={t('events.page.notFound')}
            description={
              hasFilters
                ? t('events.page.tryChangingFilters')
                : t('events.page.createFirstEvent')
            }
            action={
              !hasFilters
                ? { label: t('events.page.createEvent'), onClick: handleCreateEvent }
                : undefined
            }
          />
        </Card>
      )}

      {!isLoading && !isError && filteredEvents.length > 0 && (
        <div className="space-y-3">
          {view === 'table' ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="hidden grid-cols-[minmax(0,1fr)_130px_180px_44px] gap-4 border-b border-border bg-muted/30 px-4 py-2.5 sm:grid">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('events.table.event')}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('events.table.status')}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('events.table.registrations')}
                </span>
                <span aria-hidden />
              </div>
              {filteredEvents.map(event => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          <p className="font-mono text-[12px] text-muted-foreground">
            {t('events.page.showingCount', { shown: filteredEvents.length, total })}
          </p>
        </div>
      )}
    </div>
  )
}

function ViewToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
