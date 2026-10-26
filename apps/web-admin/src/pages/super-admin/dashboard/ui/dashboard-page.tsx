/**
 * Super Admin Dashboard — командный центр платформы.
 * API: GET /super-admin/stats (расширенная сводка), GET /super-admin/billing/overview,
 *      POST /super-admin/admins
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  ShieldPlus,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { EventStatusKey, SystemStats } from '@api/services/superAdmin.types'
import { useBillingOverview, useCreateSuperAdmin, useSystemStats } from '@features/super-admin'
import { cn } from '@shared/lib/cn'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Label,
  Skeleton,
  StatTile,
} from '@shared/ui'

import { DashboardSkeleton } from './dashboard-skeleton'
import { GrowthChart } from './growth-chart'
import { ModerationQueue } from './moderation-queue'

const EVENT_STATUS_ORDER: Array<{ key: EventStatusKey; tone: 'warning' | 'default' | 'muted' }> = [
  { key: 'PENDING_REVIEW', tone: 'warning' },
  { key: 'PUBLISHED', tone: 'default' },
  { key: 'COMPLETED', tone: 'muted' },
  { key: 'DRAFT', tone: 'muted' },
  { key: 'CANCELLED', tone: 'muted' },
]

export default function SuperAdminDashboardPage() {
  const t = useT()
  const locale = useLocale()
  const { data: stats, isLoading, isError, refetch } = useSystemStats()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !stats) {
    return (
      <ErrorState
        title={t('admin.dashboard.loadError')}
        description={t('admin.dashboard.loadErrorHint')}
        onRetry={() => refetch()}
        retryLabel={t('admin.toasts.retryAgain')}
      />
    )
  }

  const format = (value: number | undefined) => (value ?? 0).toLocaleString(locale)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label={t('admin.dashboard.cards.users')}
          value={format(stats.totalUsers)}
          icon={Users}
          delta={deltaOf(stats.newUsers7d, t('admin.dashboard.deltas.d7', { count: format(stats.newUsers7d) }))}
        />
        <StatTile
          label={t('admin.dashboard.cards.organizations')}
          value={format(stats.totalOrganizations)}
          icon={Building2}
          delta={deltaOf(
            stats.newOrganizations30d,
            t('admin.dashboard.deltas.d30', { count: format(stats.newOrganizations30d) })
          )}
        />
        <StatTile
          label={t('admin.dashboard.cards.registrations')}
          value={format(stats.totalRegistrations)}
          icon={ClipboardList}
          delta={deltaOf(
            stats.newRegistrations7d,
            t('admin.dashboard.deltas.d7', { count: format(stats.newRegistrations7d) })
          )}
        />
        <StatTile
          label={t('admin.dashboard.cards.events')}
          value={format(stats.totalEvents)}
          icon={CalendarDays}
          delta={deltaOf(
            stats.newEvents30d,
            t('admin.dashboard.deltas.d30', { count: format(stats.newEvents30d) })
          )}
        />
        <StatTile
          label={t('admin.dashboard.cards.members')}
          value={format(stats.totalMembers)}
          icon={UserCheck}
        />
        <StatTile
          label={t('admin.dashboard.cards.blogPosts')}
          value={format(stats.totalBlogPosts)}
          icon={FileText}
          hint={t('admin.dashboard.cards.publishedOfTotal', {
            published: format(stats.publishedBlogPosts),
          })}
        />
      </div>

      <ModerationQueue stats={stats} locale={locale} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GrowthChart growth={stats.growth ?? []} locale={locale} />
        </div>
        <div className="flex flex-col gap-4">
          <EventsByStatus stats={stats} locale={locale} />
          <AudienceSummary stats={stats} locale={locale} />
        </div>
      </div>

      <BillingSnapshot locale={locale} />

      <CreateAdminCard />
    </div>
  )
}

function deltaOf(count: number | undefined, label: string) {
  if (!count) return undefined
  return { label, trend: 'up' as const }
}

function EventsByStatus({ stats, locale }: { stats: SystemStats; locale: string }) {
  const t = useT()
  const byStatus = stats.eventsByStatus
  if (!byStatus) return null

  const total = stats.totalEvents ?? 0

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.dashboard.eventsByStatus.title')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t('admin.dashboard.eventsByStatus.total')}{' '}
          <span className="font-medium tabular-nums text-foreground">
            {total.toLocaleString(locale)}
          </span>
        </p>
      </div>
      <dl className="space-y-3">
        {EVENT_STATUS_ORDER.map(({ key, tone }) => {
          const count = byStatus[key] ?? 0
          const share = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={key}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <dt
                  className={cn(
                    tone === 'warning' && count > 0 ? 'text-warning' : 'text-muted-foreground'
                  )}
                >
                  {t(`admin.dashboard.eventsByStatus.${key}`)}
                </dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {count.toLocaleString(locale)}
                </dd>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full',
                    tone === 'warning' ? 'bg-warning' : 'bg-foreground/50'
                  )}
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          )
        })}
      </dl>
    </Card>
  )
}

function AudienceSummary({ stats, locale }: { stats: SystemStats; locale: string }) {
  const t = useT()

  const rows: Array<{ label: string; value: number | undefined }> = [
    { label: t('admin.dashboard.audience.members'), value: stats.totalMembers },
    { label: t('admin.dashboard.audience.blogPublished'), value: stats.publishedBlogPosts },
    { label: t('admin.dashboard.audience.blogTotal'), value: stats.totalBlogPosts },
    { label: t('admin.dashboard.audience.archivedUsers'), value: stats.archivedUsers },
    {
      label: t('admin.dashboard.audience.archivedOrganizations'),
      value: stats.archivedOrganizations,
    },
  ]

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        {t('admin.dashboard.audience.title')}
      </h2>
      <dl className="space-y-2.5">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {(row.value ?? 0).toLocaleString(locale)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function BillingSnapshot({ locale }: { locale: string }) {
  const t = useT()
  const { data, isLoading, isError } = useBillingOverview()

  if (isError) return null

  if (isLoading || !data) {
    return (
      <Card className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  const cells: Array<{ label: string; value: number; warn?: boolean }> = [
    { label: 'START', value: data.planDistribution.START },
    { label: 'PRO', value: data.planDistribution.PRO },
    { label: 'EXCLUSIVE', value: data.planDistribution.EXCLUSIVE },
    {
      label: t('admin.dashboard.billingSnapshot.suspended'),
      value: data.suspendedOrganizations,
      warn: data.suspendedOrganizations > 0,
    },
    {
      label: t('admin.dashboard.billingSnapshot.pendingRequests'),
      value: data.pendingRequests,
      warn: data.pendingRequests > 0,
    },
  ]

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.dashboard.billingSnapshot.title')}
        </h2>
        <Link
          to="/admin/billing"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-foreground underline-offset-4 transition-colors hover:underline"
        >
          {t('admin.dashboard.billingSnapshot.open')}
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {cells.map(cell => (
          <div key={cell.label}>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {cell.label}
            </dt>
            <dd
              className={cn(
                'mt-1 text-xl font-semibold leading-none tabular-nums',
                cell.warn ? 'text-warning' : 'text-foreground'
              )}
            >
              {cell.value.toLocaleString(locale)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function CreateAdminCard() {
  const t = useT()
  const [createAdminOpen, setCreateAdminOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const createAdmin = useCreateSuperAdmin()

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !name.trim() || password.length < 12) return
    createAdmin.mutate(
      { email: email.trim(), password, name: name.trim() },
      {
        onSuccess: () => {
          setCreateAdminOpen(false)
          setEmail('')
          setPassword('')
          setName('')
        },
      }
    )
  }

  return (
    <>
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <ShieldPlus className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('admin.dashboard.createAdmin.title')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('admin.dashboard.createAdmin.description')}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setCreateAdminOpen(true)} className="shrink-0">
          <UserPlus className="mr-1.5 size-4" aria-hidden="true" />
          {t('admin.dashboard.createAdmin.button')}
        </Button>
      </Card>

      <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.dashboard.createAdmin.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.dashboard.createAdmin.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                {t('admin.dashboard.createAdmin.passwordLabel')}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                minLength={12}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-name">{t('admin.dashboard.createAdmin.nameLabel')}</Label>
              <Input
                id="admin-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('admin.dashboard.createAdmin.namePlaceholder')}
                maxLength={100}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateAdminOpen(false)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  createAdmin.isPending || !email.trim() || !name.trim() || password.length < 12
                }
              >
                {createAdmin.isPending ? t('admin.actions.creating') : t('admin.actions.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
