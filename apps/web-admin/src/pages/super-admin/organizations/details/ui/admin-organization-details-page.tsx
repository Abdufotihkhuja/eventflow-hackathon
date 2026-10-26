/**
 * Детальная страница организации для супер-админа: профиль и контакты,
 * агрегаты (события/регистрации/подписчики/блог/команда), верификация
 * с одобрением/отклонением, команда и системные данные.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  Copy,
  CreditCard,
  FileText,
  Heart,
  ShieldOff,
  UserCheck,
} from 'lucide-react'

import { getMediaUrl } from '@api/config'
import type { AdminOrganization } from '@api/services/superAdmin.types'
import {
  useAdminOrganization,
  useApproveOrganization,
  useRejectOrganization,
  ConfirmActionDialog,
} from '@features/super-admin'
import { cn } from '@shared/lib/cn'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  ErrorState,
  LoadingState,
  StatTile,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

const VERIFICATION_LABEL_KEYS: Record<string, string> = {
  PENDING: 'admin.statuses.pendingVerification',
  APPROVED: 'admin.statuses.approvedFeminine',
  REJECTED: 'admin.statuses.rejectedFeminine',
}

const EVENT_STATUS_ORDER = [
  'PENDING_REVIEW',
  'PUBLISHED',
  'COMPLETED',
  'DRAFT',
  'CANCELLED',
] as const

export default function AdminOrganizationDetailsPage() {
  const t = useT()
  const locale = useLocale()
  const { orgId } = useParams<{ orgId: string }>()
  const [rejectOpen, setRejectOpen] = useState(false)

  const { data: org, isLoading, isError, refetch } = useAdminOrganization(orgId ?? null)
  const approveMutation = useApproveOrganization()
  const rejectMutation = useRejectOrganization()

  if (isLoading) {
    return <LoadingState label={t('admin.tables.pagination.loading')} />
  }

  if (isError || !org) {
    return (
      <ErrorState
        title={t('admin.errors.loadFailed')}
        description={t('admin.dashboard.loadErrorHint')}
        onRetry={() => refetch()}
        retryLabel={t('admin.toasts.retryAgain')}
      />
    )
  }

  const stats = org.stats
  const format = (value: number | undefined) => (value ?? 0).toLocaleString(locale)
  const initials = org.companyName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link to="/admin/organizations">
            <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
            {t('admin.actions.back')}
          </Link>
        </Button>

        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar className="size-14 shrink-0 rounded-lg">
              <AvatarImage src={getMediaUrl(org.logoUrl)} alt={org.companyName} />
              <AvatarFallback className="rounded-lg bg-muted text-base font-semibold text-foreground">
                {initials || <Building2 className="size-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={statusPillTone(org.verificationStatus)}>
                  {t(VERIFICATION_LABEL_KEYS[org.verificationStatus])}
                </StatusPill>
                <StatusPill tone={org.deletedAt ? 'cancelled' : 'live'}>
                  {org.deletedAt ? t('admin.statuses.archived') : t('admin.statuses.active')}
                </StatusPill>
              </div>
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                {org.companyName}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {org.name} · {org.email}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1">
            {org.verificationStatus === 'PENDING' && !org.deletedAt && (
              <>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(org.id)}
                  disabled={approveMutation.isPending}
                >
                  {t('admin.actions.approve')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={rejectMutation.isPending}
                >
                  {t('admin.actions.reject')}
                </Button>
              </>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/events?organizationId=${org.id}`}>
                <CalendarDays className="mr-1.5 size-4" aria-hidden="true" />
                {t('admin.actions.organizationEvents')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/organizations/${org.id}/billing`}>
                <CreditCard className="mr-1.5 size-4" aria-hidden="true" />
                {t('admin.billing.actions.openPanel')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/organizations/${org.id}/access`}>
                <ShieldOff className="mr-1.5 size-4" aria-hidden="true" />
                {t('admin.accessMask.actions.openPanel')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatTile
            label={t('admin.organizations.stats.events')}
            value={format(stats.totalEvents)}
            icon={CalendarDays}
            tone={stats.eventsByStatus.PENDING_REVIEW > 0 ? 'warning' : 'default'}
            highlight={stats.eventsByStatus.PENDING_REVIEW > 0}
          />
          <StatTile
            label={t('admin.organizations.stats.registrations')}
            value={format(stats.totalRegistrations)}
            icon={ClipboardList}
          />
          <StatTile
            label={t('admin.organizations.stats.followers')}
            value={format(stats.followersCount)}
            icon={Heart}
          />
          <StatTile
            label={t('admin.organizations.stats.blogPosts')}
            value={format(stats.blogPostsTotal)}
            icon={FileText}
            hint={t('admin.organizations.stats.publishedOf', {
              published: format(stats.blogPostsPublished),
            })}
          />
          <StatTile
            label={t('admin.organizations.stats.members')}
            value={format(stats.membersTotal)}
            icon={UserCheck}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Левая колонка */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              {t('admin.organizations.sections.contact')}
            </h2>
            <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              <InfoRow label="Email" value={org.email} />
              <InfoRow label={t('admin.organizations.fields.phone')} value={org.phone} />
              <InfoRow label={t('admin.organizations.fields.inn')} value={org.inn} mono />
              <InfoRow label={t('admin.organizations.fields.industry')} value={org.industry} />
              <InfoRow
                label={t('admin.organizations.fields.companySize')}
                value={org.companySize != null ? String(org.companySize) : null}
              />
              <InfoRow
                label={t('admin.organizations.fields.representativeName')}
                value={org.name}
              />
            </dl>
          </Card>

          {org.description && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {t('admin.organizations.sections.description')}
              </h2>
              <p className="max-w-prose whitespace-pre-wrap text-sm text-muted-foreground">
                {org.description}
              </p>
            </Card>
          )}

          {stats && (
            <Card>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {t('admin.organizations.team.title')}
                </h2>
                {stats.membersTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('admin.organizations.team.showing', {
                      shown: stats.members.length,
                      total: stats.membersTotal,
                    })}
                  </p>
                )}
              </div>
              {stats.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('admin.organizations.team.empty')}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.members.map(member => (
                    <li key={member.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Avatar className="size-9 shrink-0">
                        <AvatarImage
                          src={getMediaUrl(member.avatarUrl)}
                          alt={`${member.firstName} ${member.lastName}`}
                        />
                        <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                          {`${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.email}
                          {member.position ? ` · ${member.position}` : ''}
                        </p>
                      </div>
                      {member.roleName && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {member.roleName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        {/* Правая колонка */}
        <div className="space-y-4">
          {stats && <OrgEventsByStatus stats={stats} locale={locale} />}

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              {t('admin.organizations.sections.status')}
            </h2>
            <dl className="space-y-2.5">
              <InfoRow
                label={t('admin.organizations.fields.status')}
                value={t(VERIFICATION_LABEL_KEYS[org.verificationStatus])}
              />
              <InfoRow
                label={t('admin.organizations.fields.emailVerified')}
                value={org.isEmailVerified ? t('admin.billing.overrides.yes') : t('admin.billing.overrides.no')}
              />
              {org.verifiedAt && (
                <InfoRow
                  label={t('admin.organizations.fields.verifiedAt')}
                  value={formatDateTime(org.verifiedAt, locale)}
                />
              )}
            </dl>
            {org.rejectionReason && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-danger-soft p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                <p className="text-sm text-destructive">{org.rejectionReason}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              {t('admin.fields.systemInfo')}
            </h2>
            <dl className="space-y-2">
              <SystemInfoRow label="ID" value={org.id} mono copyable />
              <SystemInfoRow
                label={t('admin.organizations.fields.registration')}
                value={formatDateTime(org.createdAt, locale)}
              />
              <SystemInfoRow
                label={t('admin.organizations.fields.lastUpdate')}
                value={formatDateTime(org.updatedAt, locale)}
              />
              <SystemInfoRow
                label={t('admin.organizations.fields.placesAccess')}
                value={
                  org.placesFeatureEnabled
                    ? t('admin.billing.overrides.yes')
                    : t('admin.billing.overrides.no')
                }
              />
              {org.deletedAt && (
                <>
                  <SystemInfoRow
                    label={t('admin.fields.archivedAt')}
                    value={formatDateTime(org.deletedAt, locale)}
                  />
                  {org.archivedByName && (
                    <SystemInfoRow
                      label={t('admin.fields.archivedBy')}
                      value={org.archivedByName}
                    />
                  )}
                  {org.archiveReason && (
                    <SystemInfoRow
                      label={t('admin.fields.archiveReason')}
                      value={org.archiveReason}
                    />
                  )}
                </>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmActionDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t('admin.dialogs.rejectOrganizationTitle')}
        description={t('admin.dialogs.rejectOrganizationDescription', {
          name: org.companyName,
        })}
        confirmLabel={t('admin.actions.reject')}
        variant="destructive"
        withReason
        reasonLabel={t('admin.dialogs.rejectReason')}
        reasonPlaceholder={t('admin.dialogs.rejectReasonPlaceholder')}
        isPending={rejectMutation.isPending}
        onConfirm={reason => {
          rejectMutation.mutate(
            { orgId: org.id, reason },
            { onSuccess: () => setRejectOpen(false) }
          )
        }}
      />
    </div>
  )
}

function OrgEventsByStatus({
  stats,
  locale,
}: {
  stats: NonNullable<AdminOrganization['stats']>
  locale: string
}) {
  const t = useT()
  const total = stats.totalEvents

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
        {EVENT_STATUS_ORDER.map(key => {
          const count = stats.eventsByStatus[key] ?? 0
          const share = total > 0 ? (count / total) * 100 : 0
          const isPending = key === 'PENDING_REVIEW'
          return (
            <div key={key}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <dt
                  className={cn(
                    isPending && count > 0 ? 'text-warning' : 'text-muted-foreground'
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
                    isPending ? 'bg-warning' : 'bg-foreground/50'
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

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 truncate text-right font-medium text-foreground', mono && 'font-mono text-xs')}>
        {value}
      </dd>
    </div>
  )
}

function SystemInfoRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  const t = useT()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t('admin.toasts.copied'))
    } catch {
      toast.error(t('admin.toasts.copyError'))
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        <span className={cn('truncate font-medium', mono && 'font-mono text-xs')}>{value}</span>
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            aria-label={t('admin.actions.copy')}
            title={t('admin.actions.copy')}
          >
            <Copy className="size-3.5" />
          </Button>
        )}
      </dd>
    </div>
  )
}
