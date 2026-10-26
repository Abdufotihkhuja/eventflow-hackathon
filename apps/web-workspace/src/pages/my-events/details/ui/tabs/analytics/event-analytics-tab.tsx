import { useMemo, useState } from 'react'

import { BarChart3 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { EventAnalyticsQuery } from '@api/services'
import { useEventAnalyticsQuery } from '@features/events/api'
import { useDebounce } from '@shared/lib'
import { Card, EmptyState, ErrorState, Skeleton } from '@shared/ui'

import { EventTabHeader } from '../../event-tab-header'
import { AnalyticsFilters } from './analytics-filters'
import { AnalyticsFunnel } from './analytics-funnel'
import { AnalyticsOverviewCards } from './analytics-overview-cards'
import { DemographicsCharts } from './demographics-charts'
import { QuestionsAnalyticsSection } from './questions-analytics-section'
import { RegistrationTrendChart } from './registration-trend-chart'
import { TestAnalyticsSection } from './test-analytics-section'

type Props = {
  eventId: string
  eventName?: string
}

/**
 * Analytics tab on the event detail page. Composes the analytics views above the fetched data
 * from /api/v1/events/:eventId/analytics. The endpoint is tenant-safe and returns only aggregated
 * counts (no PII), so this whole tab is safe to render for any organizer/member with EVENTS_READ.
 *
 * TODO(export): Export of analytics CSV/XLSX is intentionally deferred — the registrations export
 * pipeline (features/events/lib/registrations-export.ts) operates on raw rows, and a separate
 * aggregated export flow would need its own template. Left as a follow-up so we don't ship a
 * half-built button.
 */
export function EventAnalyticsTab({ eventId, eventName }: Props) {
  const t = useT()
  const [filters, setFilters] = useState<EventAnalyticsQuery>({})

  // Search field hits the network; the rest of the filters are select/date so they're already debounced
  // by user interaction. We debounce only the `search` field.
  const debouncedSearch = useDebounce(filters.search ?? '', 350)
  const queryParams: EventAnalyticsQuery = useMemo(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch],
  )

  const { data, isLoading, isError, isFetching, refetch } = useEventAnalyticsQuery(
    eventId,
    queryParams,
  )

  const header = (
    <EventTabHeader
      kicker={eventName}
      title={t('events.analytics.title')}
      description={t('events.analytics.description')}
    />
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        {header}
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState
          title={t('events.analytics.loadErrorTitle')}
          description={t('events.analytics.loadErrorDescription')}
          onRetry={() => refetch()}
          retryLabel={t('actions.retry')}
        />
      </div>
    )
  }

  // True-empty: nothing matches the filters AND no filters are set → honest zero state.
  const hasAnyFilter =
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.status ||
    !!filters.gender ||
    !!filters.ageGroup ||
    !!filters.testStatus ||
    !!(filters.search && filters.search.trim())

  if (data.meta.isEmpty && !hasAnyFilter) {
    return (
      <div className="space-y-5">
        {header}
        <Card className="py-8">
          <EmptyState
            icon={BarChart3}
            title={t('events.analytics.emptyTitle')}
            description={t('events.analytics.emptyDescription')}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5" aria-busy={isFetching}>
      {header}

      <AnalyticsFilters
        value={filters}
        onChange={setFilters}
        showTestStatus={data.tests.available}
      />

      <AnalyticsOverviewCards
        overview={data.overview}
        testsAvailable={data.tests.available}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RegistrationTrendChart trend={data.registrationTrend} />
        </div>
        <AnalyticsFunnel funnel={data.funnel} />
      </div>

      <DemographicsCharts demographics={data.demographics} />

      <QuestionsAnalyticsSection questions={data.questions} />

      <TestAnalyticsSection tests={data.tests} />
    </div>
  )
}
