import { Fragment, useMemo, useState } from 'react'

import {
  Activity,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  Download,
  FileEdit,
  Megaphone,
  Percent,
  TicketCheck,
  UserPlus,
  Users,
} from 'lucide-react'

import type { DashboardActivityItem } from '@api/services'
import {
  StatCard,
  TicketsSoldChart,
  RevenueExpensesChart,
  useOrganizerDashboardStatsQuery,
  useOrganizerDashboardActivityQuery,
} from '@features/dashboard'
import { useActorType } from '@features/profile'
import { cn } from '@shared/lib/cn'
import { formatNumber } from '@shared/lib'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@shared/ui'
import type { Translator } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

type Metric = {
  id: string
  label: string
  value: string
  delta: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  changePercent: number
  description?: string
}

type ActivityDisplay = {
  id: string
  title: string
  time: string
  context: string
  badge: string
  type: 'registration' | 'event' | 'support' | 'update'
  icon: React.ComponentType<{ className?: string }>
}

const getFallbackMetrics = (t: Translator): Metric[] => [
  { id: 'events', label: t('dashboard.batch1.dashboardPage.s001'), value: '0', delta: '', trend: 'neutral', icon: CalendarPlus, changePercent: 0 },
  { id: 'tickets', label: t('dashboard.batch1.dashboardPage.s002'), value: '0', delta: '', trend: 'neutral', icon: TicketCheck, changePercent: 0 },
  { id: 'participants', label: t('dashboard.batch1.dashboardPage.s003'), value: '0', delta: '', trend: 'neutral', icon: Users, changePercent: 0 },
  { id: 'conversion', label: t('dashboard.batch1.dashboardPage.s005'), value: '0%', delta: '', trend: 'neutral', icon: Percent, changePercent: 0 },
]

const ACTIVITY_TYPE_MAP: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; badgeKey: string | null; style: ActivityDisplay['type'] }
> = {
  REGISTRATION: { icon: UserPlus, badgeKey: null, style: 'registration' },
  EVENT_PUBLISHED: { icon: Megaphone, badgeKey: 'dashboard.batch1.dashboardPage.activityPublished', style: 'event' },
  registration: { icon: UserPlus, badgeKey: null, style: 'registration' },
  event: { icon: Megaphone, badgeKey: 'dashboard.batch1.dashboardPage.activityNew', style: 'event' },
  support: { icon: CheckCircle2, badgeKey: 'dashboard.batch1.dashboardPage.activityDone', style: 'support' },
  update: { icon: FileEdit, badgeKey: 'dashboard.batch1.dashboardPage.activityEdit', style: 'update' },
}

function mapActivity(item: DashboardActivityItem, t: Translator): ActivityDisplay {
  const config = ACTIVITY_TYPE_MAP[item.type] ?? { icon: Activity, badgeKey: null, style: 'update' as const }
  return {
    id: item.id,
    title: item.description,
    time: item.timeAgo,
    context: item.entityName,
    badge: config.badgeKey ? t(config.badgeKey) : '',
    type: config.style,
    icon: config.icon,
  }
}

function getGreeting(t: Translator): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return t('dashboard.batch1.dashboardPage.greetingMorning')
  if (hour >= 12 && hour < 17) return t('dashboard.batch1.dashboardPage.greetingDay')
  if (hour >= 17 && hour < 22) return t('dashboard.batch1.dashboardPage.greetingEvening')
  return t('dashboard.batch1.dashboardPage.greetingNight')
}

function formatCurrentDate(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function DashboardPage() {
  const t = useT()
  const locale = useLocale()
  const [timePeriod, setTimePeriod] = useState('6months')
  const actorType = useActorType()
  const isOrganization = actorType === 'organization'

  const { data: stats, isLoading } = useOrganizerDashboardStatsQuery(isOrganization)
  const { data: activityData, isLoading: activityLoading } = useOrganizerDashboardActivityQuery({ limit: 20 }, isOrganization)

  const metrics = useMemo((): Metric[] => {
    if (!stats) return getFallbackMetrics(t)

    const trend = (p: number): 'up' | 'down' | 'neutral' =>
      p > 0 ? 'up' : p < 0 ? 'down' : 'neutral'
    const deltaStr = (abs: number, period: string) =>
      t('dashboard.batch1.dashboardPage.deltaForPeriod', {
        sign: abs >= 0 ? '+' : '',
        value: abs,
        period,
      })

    const { events, tickets, participants, conversion } = stats

    return [
      {
        id: 'events',
        label: t('dashboard.batch1.dashboardPage.s001'),
        value: formatNumber(events.active.value),
        delta: deltaStr(events.active.changeAbsolute, events.active.period),
        trend: trend(events.active.changePercent),
        icon: CalendarPlus,
        changePercent: events.active.changePercent,
        description: t('dashboard.batch1.dashboardPage.eventsDescription', {
          total: events.total,
          drafts: events.drafts,
          completed: events.completed,
        }),
      },
      {
        id: 'tickets',
        label: t('dashboard.batch1.dashboardPage.s002'),
        value: formatNumber(tickets.open.value),
        delta: deltaStr(tickets.open.changeAbsolute, tickets.open.period),
        trend: trend(tickets.open.changePercent),
        icon: TicketCheck,
        changePercent: tickets.open.changePercent,
        description: t('dashboard.batch1.dashboardPage.ticketsDescription', {
          total: tickets.total,
          completed: tickets.completed,
        }),
      },
      {
        id: 'participants',
        label: t('dashboard.batch1.dashboardPage.s003'),
        value: formatNumber(participants.total),
        delta: t('dashboard.batch1.dashboardPage.participantsDelta', {
          count: participants.newCount,
          sign: participants.momChangePercent >= 0 ? '+' : '',
          percent: participants.momChangePercent,
        }),
        trend: trend(participants.momChangePercent),
        icon: Users,
        changePercent: participants.momChangePercent,
        description: t('dashboard.batch1.dashboardPage.s004'),
      },
      {
        id: 'conversion',
        label: t('dashboard.batch1.dashboardPage.s005'),
        value: `${conversion.registrationRate}%`,
        delta: t('dashboard.batch1.dashboardPage.conversionDelta', {
          approved: conversion.approvedRegistrations,
          total: conversion.totalRegistrations,
          attendance: conversion.attendanceRate,
        }),
        trend: conversion.registrationRate >= 0 ? 'neutral' : 'down',
        icon: Percent,
        changePercent: 0,
        description: t('dashboard.batch1.dashboardPage.s006'),
      },
    ]
  }, [stats, t])

  const displayActivities = useMemo(() => {
    const list = activityData?.items ?? []
    return list.map(item => mapActivity(item, t))
  }, [activityData, t])

  if (!isOrganization) {
    return (
      <div className="space-y-6">
        <section>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span className="capitalize">{formatCurrentDate(locale)}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{getGreeting(t)}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.batch1.dashboardPage.s007')}</p>
        </section>
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={ClipboardList}
              title={t('dashboard.batch1.dashboardPage.s008')}
              description={t('dashboard.batch1.dashboardPage.s009')}
              className="py-8"
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <span className="capitalize">{formatCurrentDate(locale)}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{getGreeting(t)}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.batch1.dashboardPage.s010')}</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="mr-2 size-4 text-muted-foreground" />
              <SelectValue placeholder={t('dashboard.batch1.dashboardPage.s011')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">{t('dashboard.batch1.dashboardPage.s012')}</SelectItem>
              <SelectItem value="3months">{t('dashboard.batch1.dashboardPage.s013')}</SelectItem>
              <SelectItem value="6months">{t('dashboard.batch1.dashboardPage.s014')}</SelectItem>
              <SelectItem value="1year">{t('dashboard.batch1.dashboardPage.s015')}</SelectItem>
              <SelectItem value="all">{t('dashboard.batch1.dashboardPage.s016')}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="w-full gap-2 sm:w-auto">
            <Download className="size-4" />{t('dashboard.batch1.dashboardPage.s017')}</Button>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="size-8 rounded-lg" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-28 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))
          : metrics.map((metric, idx) => (
              <StatCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                delta={metric.delta}
                trend={metric.trend}
                icon={metric.icon}
                changePercent={metric.changePercent}
                description={metric.description}
                tooltipSide={idx === 0 ? 'top' : 'left'}
                animationDelay={idx * 50}
              />
            ))}
      </section>

      {/* Charts */}
      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <TicketsSoldChart />
        <RevenueExpensesChart />
      </section>

      {/* Activity */}
      <Card
        className={cn('animate-in fade-in slide-in-from-bottom-2')}
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t('dashboard.batch1.dashboardPage.s018')}</CardTitle>
                <CardDescription className="text-xs">{t('dashboard.batch1.dashboardPage.s019')}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs">{t('dashboard.batch1.dashboardPage.s020')}<ChevronRight className="ml-1 size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          ) : displayActivities.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={t('dashboard.batch1.dashboardPage.s021')}
              description={t('dashboard.batch1.dashboardPage.s022')}
              className="py-8"
            />
          ) : (
            <div className="space-y-1">
              {displayActivities.map((activity, idx) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isLast={idx === displayActivities.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type ActivityItemProps = {
  activity: ActivityDisplay
  isLast: boolean
}

const BADGE_STYLES: Record<string, string> = {
  registration: 'bg-info-soft text-info-soft-foreground',
  event: 'bg-brand-soft text-brand-soft-foreground',
  support: 'bg-success-soft text-success-soft-foreground',
  update: 'bg-warning-soft text-warning-soft-foreground',
}

const ICON_STYLES: Record<string, string> = {
  registration: 'bg-info-soft text-info-soft-foreground',
  event: 'bg-brand-soft text-brand-soft-foreground',
  support: 'bg-success-soft text-success-soft-foreground',
  update: 'bg-warning-soft text-warning-soft-foreground',
}

function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const Icon = activity.icon

  return (
    <Fragment>
      <div className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
        <div className={cn('rounded-lg p-2', ICON_STYLES[activity.type])}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{activity.title}</p>
          <p className="truncate text-xs text-muted-foreground">{activity.context}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-medium', BADGE_STYLES[activity.type])}>
            {activity.badge}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-3" />
            {activity.time}
          </span>
        </div>
      </div>
      {!isLast && <div className="mx-2 h-px bg-border/50" />}
    </Fragment>
  )
}
