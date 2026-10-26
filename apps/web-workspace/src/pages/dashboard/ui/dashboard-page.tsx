import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileEdit,
  MapPin,
  Megaphone,
  UserPlus,
  Users,
} from 'lucide-react'
import { formatDate, plural } from '@eventflow/i18n'
import { useI18n, useT } from '@eventflow/i18n/react'

import { MEDIA_BASE_URL } from '@api/config'
import type { DashboardActivityItem } from '@api/services'
import { EventStatus } from '@entities/event'
import { BillingPlanChip } from '@features/billing'
import {
  useOrganizerDashboardStatsQuery,
  useOrganizerDashboardActivityQuery,
} from '@features/dashboard'
import { useEventsQuery } from '@features/events/api'
import { getBannerTemplateGradient, isBannerTemplate } from '@features/events/lib/banner-templates'
import { useActorType } from '@features/profile'
import { cn } from '@shared/lib/cn'
import { formatNumber } from '@shared/lib'
import { Button, Card, CardContent, EmptyState, PageHeader, Skeleton } from '@shared/ui'

// ── Activity mapping (real data) ──────────────────────────────────────────
type ActivityDisplay = {
  id: string
  title: string
  time: string
  context: string
  kind: 'sale' | 'event' | 'support' | 'update'
  icon: React.ComponentType<{ className?: string }>
}

const ACTIVITY_TYPE_MAP: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; kind: ActivityDisplay['kind'] }
> = {
  REGISTRATION: { icon: UserPlus, kind: 'sale' },
  EVENT_CREATED: { icon: CalendarPlus, kind: 'event' },
  EVENT_PUBLISHED: { icon: Megaphone, kind: 'event' },
  TASK_CREATED: { icon: FileEdit, kind: 'update' },
  TASK_COMPLETED: { icon: CheckCircle2, kind: 'support' },
  MEMBER_JOINED: { icon: UserPlus, kind: 'sale' },
}

const ACTIVITY_TITLE_KEYS: Record<string, string> = {
  REGISTRATION: 'dashboard.activity.descriptions.registration',
  EVENT_CREATED: 'dashboard.activity.descriptions.eventCreated',
  EVENT_PUBLISHED: 'dashboard.activity.descriptions.eventPublished',
  TASK_CREATED: 'dashboard.activity.descriptions.taskCreated',
  TASK_COMPLETED: 'dashboard.activity.descriptions.taskCompleted',
  MEMBER_JOINED: 'dashboard.activity.descriptions.memberJoined',
}

const ACTIVITY_KIND_COLOR: Record<ActivityDisplay['kind'], string> = {
  sale: 'text-success',
  event: 'text-primary',
  support: 'text-muted-foreground',
  update: 'text-muted-foreground',
}

function formatActivityTime(createdAt: string, locale: string, fallback: string): string {
  const timestamp = new Date(createdAt).getTime()
  if (!Number.isFinite(timestamp)) return fallback
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const divisions: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ]
  const division = divisions.find(item => absSeconds >= item.seconds) ?? divisions[divisions.length - 1]
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' }).format(
    Math.round(diffSeconds / division.seconds),
    division.unit,
  )
}

function mapActivity(item: DashboardActivityItem, t: ReturnType<typeof useT>, locale: string): ActivityDisplay {
  const config = ACTIVITY_TYPE_MAP[item.type] ?? { icon: Activity, kind: 'update' as const }
  const titleKey = ACTIVITY_TITLE_KEYS[item.type]
  return {
    id: item.id,
    title: titleKey ? t(titleKey, { name: item.entityName }) : item.description,
    time: formatActivityTime(item.createdAt, locale, item.timeAgo),
    context: item.entityName,
    kind: config.kind,
    icon: config.icon,
  }
}

function getGreeting(t: ReturnType<typeof useT>): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return t('dashboard.greeting.morning')
  if (hour >= 12 && hour < 17) return t('dashboard.greeting.afternoon')
  if (hour >= 17 && hour < 22) return t('dashboard.greeting.evening')
  return t('dashboard.greeting.night')
}

function formatCurrentDate(locale: string): string {
  return formatDate(new Date(), locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data, tone = 'ink' }: { data: number[]; tone?: 'ink' | 'ember' }) {
  if (!data.length) return null
  const w = 240
  const h = 28
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d - min) / span) * (h - 2) - 1}`)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" height={h} className="block w-full">
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} className={tone === 'ember' ? 'fill-primary/10' : 'fill-foreground/5'} />
      <polyline
        points={pts.join(' ')}
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={tone === 'ember' ? 'stroke-primary' : 'stroke-foreground/60'}
      />
    </svg>
  )
}

// ── KPI tile ──────────────────────────────────────────────────────────────
type KpiProps = {
  label: string
  value: string
  unit?: string
  delta?: string
  trend?: 'up' | 'down'
  hint?: string
  spark?: number[]
  sparkTone?: 'ink' | 'ember'
}

function Kpi({ label, value, unit, delta, trend, hint, spark, sparkTone }: KpiProps) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-mono text-[11.5px] font-medium tabular-nums',
              trend === 'down' ? 'text-destructive' : 'text-success'
            )}
          >
            {trend === 'down' ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
          {value}
        </span>
        {unit && <span className="font-mono text-[12.5px] text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
      {spark && (
        <div className="mt-4">
          <Sparkline data={spark} tone={sparkTone} />
        </div>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { locale, t } = useI18n()
  const actorType = useActorType()
  const isOrganization = actorType === 'organization'

  const { data: stats, isLoading } = useOrganizerDashboardStatsQuery(isOrganization)
  const { data: activityData, isLoading: activityLoading } = useOrganizerDashboardActivityQuery(
    { limit: 20 },
    isOrganization
  )

  const displayActivities = useMemo(
    () => (activityData?.items ?? []).map(item => mapActivity(item, t, locale)),
    [activityData, locale, t]
  )

  // Employee view — unchanged.
  if (!isOrganization) {
    return (
      <div className="space-y-6">
        <section>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{formatCurrentDate(locale)}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{getGreeting(t)}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.employeeWelcome')}</p>
        </section>
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={ClipboardList}
              title={t('dashboard.employeeTitle')}
              description={t('dashboard.employeeDescription')}
              className="py-8"
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // New organizer (no events) → empty state.
  if (stats && stats.events.total === 0) {
    return <StudioEmptyState />
  }

  const regDelta = stats?.participants.momChangePercent ?? 0
  const activeDelta = stats?.events.active.changePercent ?? 0
  const conversion = stats?.conversion
  const hasRegistrations = (conversion?.totalRegistrations ?? 0) > 0
  const hasApproved = (conversion?.approvedRegistrations ?? 0) > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Editorial header — Studio "Today" */}
      <PageHeader
        eyebrow={<span className="capitalize">{formatCurrentDate(locale)}</span>}
        title={getGreeting(t)}
        description={t('dashboard.organizerSummary')}
        meta={
          stats ? (
            <div className="flex flex-wrap items-center gap-x-2 text-[13px] font-medium text-muted-foreground">
              <span>
                {plural(locale, stats.events.active.value, {
                  en: { one: '# active event', other: '# active events' },
                  ru: {
                    one: '# активное событие',
                    few: '# активных события',
                    many: '# активных событий',
                    other: '# активных события',
                  },
                  uz: { other: '# ta faol tadbir' },
                })}
              </span>
              {stats.events.drafts > 0 && (
                <>
                  <span aria-hidden className="text-muted-foreground/40">·</span>
                  <span>
                    {plural(locale, stats.events.drafts, {
                      en: { one: '# draft', other: '# drafts' },
                      ru: {
                        one: '# черновик',
                        few: '# черновика',
                        many: '# черновиков',
                        other: '# черновиков',
                      },
                      uz: { other: '# ta qoralama' },
                    })}
                  </span>
                </>
              )}
            </div>
          ) : undefined
        }
        actions={
          <>
            {/* C-15b: точка входа в биллинг — тариф, кредиты, срок пакета. */}
            <BillingPlanChip />
            <Button asChild className="gap-2">
              <Link to="/my-events/create">
                <CalendarPlus className="size-4" />
                {t('events.page.createEvent')}
              </Link>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-[10px] border border-border bg-card p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))
        ) : (
          <>
            <Kpi
              label={t('dashboard.studio.registrations')}
              value={formatNumber(stats?.participants.total ?? 0)}
              delta={regDelta !== 0 ? `${Math.abs(regDelta)}%` : undefined}
              trend={regDelta < 0 ? 'down' : 'up'}
              hint={t('dashboard.studio.newThisMonth', { count: stats?.participants.newCount ?? 0 })}
            />
            <Kpi
              label={t('dashboard.studio.activeEvents')}
              value={formatNumber(stats?.events.active.value ?? 0)}
              delta={activeDelta !== 0 ? `${Math.abs(activeDelta)}%` : undefined}
              trend={activeDelta < 0 ? 'down' : 'up'}
              hint={t('dashboard.studio.activeEventsHint', { total: stats?.events.total ?? 0 })}
            />
            <Kpi
              label={t('dashboard.studio.approvalRate')}
              value={hasRegistrations ? `${conversion?.registrationRate ?? 0}` : '–'}
              unit={hasRegistrations ? '%' : undefined}
              hint={
                hasRegistrations
                  ? t('dashboard.studio.approvalRateHint', {
                      approved: conversion?.approvedRegistrations ?? 0,
                      total: conversion?.totalRegistrations ?? 0,
                    })
                  : t('dashboard.studio.notEnoughData')
              }
            />
            <Kpi
              label={t('dashboard.studio.checkInRate')}
              value={hasApproved ? `${conversion?.attendanceRate ?? 0}` : '–'}
              unit={hasApproved ? '%' : undefined}
              hint={
                hasApproved
                  ? t('dashboard.studio.checkInRateHint', {
                      approved: conversion?.approvedRegistrations ?? 0,
                    })
                  : t('dashboard.studio.notEnoughData')
              }
            />
          </>
        )}
      </section>

      {/* Active events + Needs attention */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ActiveEventsPanel />
        <NeedsAttentionPanel drafts={stats?.events.drafts ?? 0} />
      </section>

      {/* Recent activity */}
      <section className="rounded-[10px] border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-foreground">{t('dashboard.activity.title')}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {t('dashboard.studio.recentActivitySubtitle')}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            {t('common.all')}
            <ChevronRight className="ml-1 size-3" />
          </Button>
        </div>
        {activityLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-3 py-2">
                <Skeleton className="size-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : displayActivities.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t('dashboard.activity.emptyTitle')}
            description={t('dashboard.activity.emptyDescription')}
            className="py-8"
          />
        ) : (
          <div>
            {displayActivities.slice(0, 8).map((a, idx, arr) => {
              const Icon = a.icon
              return (
                <div
                  key={a.id}
                  className={cn(
                    'grid grid-cols-[20px_1fr_auto] items-start gap-3 py-3',
                    idx !== arr.length - 1 && 'border-b border-border'
                  )}
                >
                  <div className={cn('mt-0.5', ACTIVITY_KIND_COLOR[a.kind])}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-snug text-foreground">{a.title}</p>
                    <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">{a.context}</p>
                  </div>
                  <span className="whitespace-nowrap font-mono text-[11.5px] text-muted-foreground">{a.time}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

const getMediaUrl = (url: string) => {
  if (!url || url.startsWith('http') || url.startsWith('blob:')) return url
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

// Event thumbnail: cover image / banner-template gradient, with a letter fallback.
function EventThumb({ coverImage, title }: { coverImage?: string | null; title: string }) {
  const base = 'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md'

  if (coverImage && isBannerTemplate(coverImage)) {
    return <span className={cn(base, getBannerTemplateGradient(coverImage) ?? 'bg-muted')} />
  }
  if (coverImage) {
    return (
      <span className={base}>
        <img src={getMediaUrl(coverImage)} alt="" className="size-full object-cover" loading="lazy" />
      </span>
    )
  }
  return (
    <span className={cn(base, 'bg-foreground text-sm font-bold text-background')}>
      {title.charAt(0).toUpperCase()}
    </span>
  )
}

// ── Active events panel (real data) ───────────────────────────────────────
function ActiveEventsPanel() {
  const t = useT()
  const { locale } = useI18n()
  const { data, isLoading } = useEventsQuery({ status: EventStatus.PUBLISHED })
  const events = (data?.data ?? []).slice(0, 5)

  return (
    <section className="rounded-[10px] border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{t('dashboard.cards.activeEvents')}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{t('dashboard.studio.activeEventsSubtitle')}</div>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link to="/my-events">
            {t('common.all')}
            <ChevronRight className="ml-1 size-3" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 py-3">
              <Skeleton className="size-11 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-1.5 w-32" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('events.page.notFound')}</p>
      ) : (
        <div>
          {events.map((event, idx) => {
            const sold = event._count?.registrations ?? 0
            const cap = event.maxParticipants ?? 0
            const pct = cap ? Math.min(100, Math.round((sold / cap) * 100)) : 0
            const daysOut = event.startDate
              ? Math.ceil((new Date(event.startDate).getTime() - Date.now()) / 86400000)
              : null
            const urgent = daysOut !== null && daysOut >= 0 && daysOut <= 7
            const barTone = pct >= 90 ? 'bg-primary' : pct >= 75 ? 'bg-warning' : 'bg-foreground'
            const dateStr = event.startDate
              ? formatDate(new Date(event.startDate), locale, { day: 'numeric', month: 'short' })
              : ''
            const meta = [dateStr, event.venue].filter(Boolean).join(' · ')

            return (
              <Link
                key={event.id}
                to={`/my-events/${event.id}`}
                className={cn(
                  'grid grid-cols-[44px_1fr_140px_16px] items-center gap-4 rounded-md px-1 py-3.5 transition-colors hover:bg-muted/40',
                  idx > 0 && 'border-t border-border'
                )}
              >
                <EventThumb coverImage={event.coverImage} title={event.title} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold tracking-[-0.005em] text-foreground">
                      {event.title}
                    </span>
                    {urgent && (
                      <span className="shrink-0 rounded-[3px] border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                        D-{daysOut}
                      </span>
                    )}
                  </div>
                  {meta && (
                    <div className="mt-1 truncate font-mono text-[12px] text-muted-foreground">{meta}</div>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[12px] text-foreground">
                      {formatNumber(sold)}
                      {cap > 0 && <span className="text-muted-foreground"> / {formatNumber(cap)}</span>}
                    </span>
                    {cap > 0 && <span className="font-mono text-[11px] text-muted-foreground">{pct}%</span>}
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', barTone)} style={{ width: `${cap ? pct : 0}%` }} />
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Needs attention (derived from real signals) ───────────────────────────
function NeedsAttentionPanel({ drafts }: { drafts: number }) {
  const t = useT()
  const { data } = useEventsQuery({ status: EventStatus.PUBLISHED })
  const now = Date.now()
  // Real, actionable signal: live events nobody has registered for yet.
  const zeroReg = (data?.data ?? []).filter(
    e =>
      (e._count?.registrations ?? 0) === 0 &&
      (!e.startDate || new Date(e.startDate).getTime() >= now),
  )

  const items = [
    drafts > 0 && {
      tone: 'warning' as const,
      icon: FileEdit,
      title: t('dashboard.studio.attnDraftsTitle'),
      meta: t('dashboard.studio.attnDraftsMeta', { count: drafts }),
      cta: t('dashboard.studio.attnDraftsCta'),
      to: '/my-events',
    },
    zeroReg.length > 0 && {
      tone: 'warning' as const,
      icon: AlertTriangle,
      title: t('dashboard.studio.attnZeroRegTitle'),
      meta: t('dashboard.studio.attnZeroRegMeta', { count: zeroReg.length }),
      cta: t('dashboard.studio.attnZeroRegCta'),
      to: '/my-events',
    },
  ].filter(Boolean) as Array<{
    tone: 'warning' | 'info'
    icon: React.ComponentType<{ className?: string }>
    title: string
    meta: string
    cta: string
    to: string
  }>

  return (
    <section>
      <div className="mb-3 flex h-[18px] items-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t('dashboard.studio.needsAttention')}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="flex h-[calc(100%-30px)] min-h-[140px] flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-card px-6 py-10 text-center">
          <CheckCircle2 className="size-6 text-success" />
          <p className="mt-3 text-sm font-semibold text-foreground">{t('dashboard.studio.allClear')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.studio.allClearHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5"
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md',
                    item.tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold leading-snug text-foreground">{item.title}</div>
                  <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{item.meta}</div>
                  <Button asChild variant="outline" size="sm" className="mt-2.5 h-7 text-xs">
                    <Link to={item.to}>{item.cta}</Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Empty state (new organizer) ───────────────────────────────────────────
function StudioEmptyState() {
  const t = useT()
  const { locale } = useI18n()
  const steps = [
    { icon: UserPlus, title: t('dashboard.studio.empty.step1Title'), body: t('dashboard.studio.empty.step1Body'), cta: t('dashboard.studio.empty.step1Cta'), to: '/profile' },
    { icon: Users, title: t('dashboard.studio.empty.step2Title'), body: t('dashboard.studio.empty.step2Body'), cta: t('dashboard.studio.empty.step2Cta'), to: '/users' },
    { icon: MapPin, title: t('dashboard.studio.empty.step3Title'), body: t('dashboard.studio.empty.step3Body'), cta: t('dashboard.studio.empty.step3Cta'), to: '/my-places' },
    { icon: CalendarPlus, title: t('dashboard.studio.empty.step4Title'), body: t('dashboard.studio.empty.step4Body'), cta: t('dashboard.studio.empty.step4Cta'), to: '/my-events/create' },
  ]
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<span className="capitalize">{formatCurrentDate(locale)}</span>}
        title={t('dashboard.studio.empty.title')}
        description={t('dashboard.studio.empty.subtitle')}
        actions={<BillingPlanChip />}
      />

      {/* Gradient primary CTA */}
      <div
        className="relative overflow-hidden rounded-[14px] p-7 text-white"
        style={{ background: 'linear-gradient(135deg, #0e0e0d 0%, #2a2a28 60%, #c64a07 130%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 90% 0%, rgba(255,111,0,0.25), transparent 50%)' }}
        />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
              {t('dashboard.studio.empty.getStarted')}
            </div>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-[-0.025em]">
              {t('dashboard.studio.empty.ctaTitle')}{' '}
              <span className="font-display italic font-light text-[#ffba85]">
                {t('dashboard.studio.empty.ctaAccent')}
              </span>
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-white/70">
              {t('dashboard.studio.empty.ctaBody')}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2.5">
            <Button asChild className="gap-2 bg-white text-[#0e0e0d] hover:bg-white/90">
              <Link to="/my-events/create">
                <CalendarPlus className="size-4" />
                {t('events.page.createEvent')}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/25 bg-transparent text-white/85 hover:bg-white/10 hover:text-white"
            >
              <Link to="/my-events/create">{t('dashboard.studio.empty.fromTemplate')}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((s, idx) => {
          const Icon = s.icon
          return (
            <div key={idx} className="rounded-[10px] border border-border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
                <Icon className="size-4" />
              </span>
              <div className="mt-3.5 text-[15px] font-semibold tracking-[-0.005em] text-foreground">{s.title}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.body}</div>
              <Button asChild variant="ghost" size="sm" className="mt-3 px-0 text-xs hover:bg-transparent">
                <Link to={s.to}>
                  {s.cta}
                  <ChevronRight className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
