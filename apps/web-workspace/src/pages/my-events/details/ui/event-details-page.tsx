import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { CalendarDays, Edit, ExternalLink, Link2, Loader2, MapPin } from 'lucide-react'
import { formatDate, getCityLabel } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import { PUBLIC_SITE_URL } from '@api/config'
import {
  EventFormat,
  EventStatus,
  getEventFormatLabel,
  getEventStatusLabel,
  resolveLocalizedField,
} from '@entities/event'
import { useEventQuery, EventQrCodeDialog } from '@features/events'
import {
  Button,
  PageTabs,
  type PageTabItem,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

import { EventActionsMenu } from './event-actions-menu'
import { EventOverviewTab } from './tabs/event-overview-tab'
import { EventParticipantsTab } from './tabs/event-participants-tab'
import { EventAttendanceTab } from './tabs/event-attendance-tab'
import { EventAnalyticsTab } from './tabs/analytics'
import { EventCertificatesTab } from './tabs/event-certificates-tab'
import { EventBadgesTab } from './tabs/event-badges-tab'
import { EventAgendaTab } from './tabs/event-agenda-tab'
import { EventSpeakersTab } from './tabs/event-speakers-tab'
import { EventQuestionsTab } from './tabs/event-questions-tab'
import { EventCommentsTab } from './tabs/event-comments-tab'

type TabType =
  | 'overview'
  | 'participants'
  | 'speakers'
  | 'agenda'
  | 'questions'
  | 'attendance'
  | 'analytics'
  | 'badges'
  | 'certificates'
  | 'comments'

const VALID_TABS: TabType[] = [
  'overview', 'participants', 'speakers', 'agenda',
  'questions', 'attendance', 'analytics', 'badges', 'certificates', 'comments',
]

const MS_PER_DAY = 86_400_000

export default function EventDetailsPage() {
  const t = useT()
  const uiLocale = useLocale()
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = id ?? ''
  const isInvalidEventId = eventId.trim() === ''

  const { data: event, isLoading, isError, error } = useEventQuery(eventId, !isInvalidEventId)

  const rawTab = searchParams.get('tab')
  const activeTab: TabType = VALID_TABS.includes(rawTab as TabType)
    ? (rawTab as TabType)
    : 'overview'

  const setActiveTab = useCallback(
    (tab: TabType) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (tab === 'overview') next.delete('tab')
        else next.set('tab', tab)
        return next
      }, { replace: true })
    },
    [setSearchParams]
  )

  if (isInvalidEventId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">{t('events.details.invalidId')}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/my-events">{t('events.details.backToList')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.details.loading')}</p>
        </div>
      </div>
    )
  }

  if (isError || !event) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            {error?.message ?? t('events.details.notFound')}
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/my-events">{t('events.details.backToList')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  const title = resolveLocalizedField(event.translations, 'title', uiLocale, event.title)
  const start = new Date(event.startDate)
  const whenStr = `${formatDate(start, uiLocale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${formatDate(start, uiLocale, { hour: '2-digit', minute: '2-digit' })}`

  const venue = resolveLocalizedField(event.translations, 'venue', uiLocale, event.venue)
  const cityLabel = event.city ? getCityLabel(t)(event.city) : ''
  const locationStr =
    event.format === EventFormat.ONLINE
      ? getEventFormatLabel(t)(event.format)
      : [venue, cityLabel].filter(Boolean).join(', ')

  const isPublished = event.status === EventStatus.PUBLISHED
  const liveUrl = event.slug ? `${PUBLIC_SITE_URL.replace(/\/$/, '')}/events/${event.slug}` : null
  const liveUrlDisplay = liveUrl ? liveUrl.replace(/^https?:\/\//, '') : null

  const days = Math.ceil((start.getTime() - Date.now()) / MS_PER_DAY)
  const countdown =
    isPublished && days > 0
      ? t('events.overview.countdownDays', { count: days })
      : isPublished && days === 0
        ? t('events.overview.countdownToday')
        : null

  const editedStr = formatDate(new Date(event.updatedAt), uiLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const allTabs: PageTabItem<TabType>[] = [
    { id: 'overview', label: t('events.tabs.overview') },
    {
      id: 'participants',
      label: t('events.tabs.participants'),
      count: event._count?.registrations ?? 0,
    },
    { id: 'agenda', label: t('events.tabs.agenda') },
    { id: 'speakers', label: t('events.tabs.speakers') },
    { id: 'questions', label: t('events.tabs.questions') },
    { id: 'attendance', label: t('events.tabs.attendance') },
    { id: 'analytics', label: t('events.tabs.analytics') },
    { id: 'badges', label: t('events.tabs.badges') },
    { id: 'certificates', label: t('events.tabs.certificates') },
    ...(event.commentsEnabled
      ? [{ id: 'comments' as const, label: t('events.tabs.comments') }]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header — kicker, title, meta, actions; navigation lives in the shell breadcrumb */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusPill tone={statusPillTone(event.status)} size="sm">
                {getEventStatusLabel(t)(event.status)}
              </StatusPill>
              {countdown && (
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {countdown}
                </span>
              )}
            </div>

            <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                {whenStr}
              </span>
              {locationStr && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{locationStr}</span>
                </span>
              )}
              {liveUrl && liveUrlDisplay && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[13px] transition-colors hover:text-foreground"
                >
                  <Link2 className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{liveUrlDisplay}</span>
                </a>
              )}
            </div>

            <p className="font-mono text-[12px] text-muted-foreground">
              {t('events.details.lastEditedLabel')} · {editedStr}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <EventQrCodeDialog eventId={event.id} eventTitle={title} />
            {isPublished && liveUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="size-4" />
                  <span className="hidden sm:inline">{t('events.details.viewLivePage')}</span>
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to={`/my-events/${event.id}/edit`} className="gap-2">
                <Edit className="size-4" />
                <span className="hidden sm:inline">{t('actions.edit')}</span>
              </Link>
            </Button>
            <EventActionsMenu event={event} />
          </div>
        </div>

        {/* Tabs directly under the header — same language as the events list */}
        <PageTabs items={allTabs} active={activeTab} onChange={setActiveTab} />
      </div>

      <div>
        {activeTab === 'overview' && <EventOverviewTab event={event} />}
        {activeTab === 'participants' && (
          <EventParticipantsTab
            eventId={event.id}
            eventName={title}
            event={{
              registrationMode: event.registrationMode,
              minTestScore: event.minTestScore,
              maxTestScore: event.maxTestScore,
            }}
          />
        )}
        {activeTab === 'speakers' && <EventSpeakersTab eventId={event.id} />}
        {activeTab === 'agenda' && (
          <EventAgendaTab eventId={event.id} startDate={event.startDate} endDate={event.endDate} />
        )}
        {activeTab === 'questions' && <EventQuestionsTab eventId={event.id} />}
        {activeTab === 'attendance' && (
          <EventAttendanceTab
            eventId={event.id}
            eventName={title}
            eventStartDate={event.startDate}
          />
        )}
        {activeTab === 'analytics' && <EventAnalyticsTab eventId={event.id} eventName={title} />}
        {activeTab === 'badges' && <EventBadgesTab eventId={event.id} />}
        {activeTab === 'certificates' && <EventCertificatesTab eventId={event.id} />}
        {activeTab === 'comments' && (
          <EventCommentsTab eventId={event.id} commentsEnabled={event.commentsEnabled ?? false} />
        )}
      </div>
    </div>
  )
}
