/**
 * Детальная страница пользователя для супер-админа: профиль, KPI-агрегаты
 * (регистрации/посещения/сертификаты/комментарии/подписки), контакты,
 * членства в организациях, приватность и системная информация.
 */

import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ClipboardList,
  Copy,
  ExternalLink,
  Heart,
  MessageCircle,
} from 'lucide-react'

import { getMediaUrl } from '@api/config'
import type { AdminUser } from '@api/services/superAdmin.types'
import { useAdminUser } from '@features/super-admin'
import { formatUserName, getUserInitials } from '@shared/lib'
import { cn } from '@shared/lib/cn'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  StatTile,
  StatusPill,
  statusPillTone,
} from '@shared/ui'

export default function AdminUserDetailsPage() {
  const t = useT()
  const locale = useLocale()
  const { userId } = useParams<{ userId: string }>()

  const { data: user, isLoading, isError, refetch } = useAdminUser(userId ?? null)

  if (isLoading) {
    return <LoadingState />
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <BackButton />
        <ErrorState
          title={t('admin.errors.loadFailed')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      </div>
    )
  }

  const fullName = formatUserName(user.firstName, user.lastName)
  const initials = getUserInitials(user.firstName, user.lastName)
  const isArchived = !!user.deletedAt
  const stats = user.stats

  const format = (value: number) => value.toLocaleString(locale)

  const socialLinks = [
    { label: t('admin.users.fields.linkedin'), url: user.linkedinUrl },
    { label: t('admin.users.fields.instagram'), url: user.instagramUrl },
    { label: t('admin.users.fields.facebook'), url: user.facebookUrl },
    { label: t('admin.users.fields.website'), url: user.websiteUrl },
  ].filter((link): link is { label: string; url: string } => !!link.url)

  const totalRegistrations = stats
    ? Object.values(stats.registrationsByStatus).reduce((sum, count) => sum + (count ?? 0), 0)
    : 0
  const approved = stats?.registrationsByStatus.APPROVED ?? 0
  const pending = stats?.registrationsByStatus.PENDING ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <BackButton />
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar className="size-14 shrink-0">
              <AvatarImage src={getMediaUrl(user.avatarUrl)} alt={fullName} />
              <AvatarFallback className="bg-muted text-sm font-medium">
                {initials || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={statusPillTone(isArchived ? 'archived' : 'active')}>
                  {isArchived ? t('admin.statuses.archived') : t('admin.statuses.active')}
                </StatusPill>
                <Badge variant="secondary" className="font-medium">
                  {user.authProvider}
                </Badge>
                <StatusPill tone={user.isEmailVerified ? 'success' : 'neutral'}>
                  {t('admin.users.fields.emailVerified')}
                </StatusPill>
              </div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{fullName}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
                {user.phone ? ` · ${user.phone}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI-агрегаты */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatTile
            label={t('admin.users.stats.registrations')}
            value={format(totalRegistrations)}
            icon={ClipboardList}
            hint={t('admin.users.stats.registrationsHint', {
              approved: format(approved),
              pending: format(pending),
            })}
            tone={pending > 0 ? 'warning' : 'default'}
            highlight={pending > 0}
          />
          <StatTile
            label={t('admin.users.stats.attended')}
            value={format(stats.attendedEvents)}
            icon={CalendarCheck}
          />
          <StatTile
            label={t('admin.users.stats.certificates')}
            value={format(stats.certificatesCount)}
            icon={BadgeCheck}
          />
          <StatTile
            label={t('admin.users.stats.comments')}
            value={format(stats.eventCommentsCount)}
            icon={MessageCircle}
          />
          <StatTile
            label={t('admin.users.stats.following')}
            value={format(stats.followingCount)}
            icon={Heart}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Левая колонка */}
        <div className="space-y-6">
          {/* Контакты */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('admin.users.sections.contact')}
            </h3>
            <dl className="space-y-2">
              <InfoRow label={t('admin.users.fields.email')} value={user.email} />
              <InfoRow label={t('admin.users.fields.phone')} value={user.phone ?? '—'} />
              <InfoRow label={t('admin.users.fields.location')} value={user.location ?? '—'} />
            </dl>
          </Card>

          {/* О себе */}
          {user.bio && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t('admin.users.sections.about')}
              </h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{user.bio}</p>
            </Card>
          )}

          {/* Соцсети */}
          {socialLinks.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t('admin.users.sections.social')}
              </h3>
              <dl className="space-y-2">
                {socialLinks.map(link => (
                  <div
                    key={link.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <dt className="shrink-0 text-muted-foreground">{link.label}</dt>
                    <dd className="min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        <span className="truncate">{link.url}</span>
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                      </a>
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>

        {/* Правая колонка */}
        <div className="space-y-6">
          {/* Членства в организациях */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('admin.users.memberships.title')}
            </h3>
            {stats && stats.memberships.length > 0 ? (
              <ul className="space-y-2">
                {stats.memberships.map((membership, index) => (
                  <li
                    key={`${membership.organizationId ?? 'none'}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <div
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    >
                      <Building2 className="size-4" />
                    </div>
                    <div className="min-w-0">
                      {membership.organizationName ? (
                        <Link
                          to={`/admin/organizations?search=${encodeURIComponent(membership.organizationName)}`}
                          className="block truncate text-sm font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {membership.organizationName}
                        </Link>
                      ) : (
                        <span className="block truncate text-sm font-medium text-foreground">—</span>
                      )}
                      {membership.roleName && (
                        <p className="truncate text-xs text-muted-foreground">
                          {membership.roleName}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('admin.users.memberships.empty')}</p>
            )}
          </Card>

          {/* Приватность */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('admin.users.sections.privacy')}
            </h3>
            <dl className="space-y-2">
              <PrivacyRow
                label={t('admin.users.fields.publicProfile')}
                enabled={user.isPublicProfile}
              />
              <PrivacyRow label={t('admin.users.fields.showEmail')} enabled={user.showEmail} />
              <PrivacyRow label={t('admin.users.fields.showPhone')} enabled={user.showPhone} />
            </dl>
          </Card>

          {/* Системная информация */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t('admin.fields.systemInfo')}
            </h3>
            <dl className="space-y-2">
              <SystemInfoRow label="ID" value={user.id} mono copyable />
              <SystemInfoRow
                label={t('admin.users.fields.registration')}
                value={formatDateTime(user.createdAt, locale)}
              />
              <SystemInfoRow
                label={t('admin.users.fields.lastUpdate')}
                value={formatDateTime(user.updatedAt, locale)}
              />
            </dl>
            {user.deletedAt && <ArchiveInfoBlock user={user} locale={locale} />}
          </Card>
        </div>
      </div>
    </div>
  )
}

// Back-кнопка к списку пользователей.
function BackButton() {
  const t = useT()
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
      <Link to="/admin/users">
        <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
        {t('admin.actions.back')}
      </Link>
    </Button>
  )
}

// Простая строка «label — значение».
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  )
}

// Boolean-строка приватности: включено → success-пилл «Да», иначе neutral «Нет».
function PrivacyRow({ label, enabled }: { label: string; enabled: boolean }) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd>
        <StatusPill tone={enabled ? 'success' : 'neutral'} size="sm">
          {enabled ? t('admin.billing.overrides.yes') : t('admin.billing.overrides.no')}
        </StatusPill>
      </dd>
    </div>
  )
}

// Блок архивации: дата, кто и причина (только для архивированных).
function ArchiveInfoBlock({ user, locale }: { user: AdminUser; locale: string }) {
  const t = useT()
  return (
    <div className="mt-4 space-y-2 rounded-lg bg-danger-soft p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-danger-soft-foreground">
        <Archive className="size-4" aria-hidden="true" />
        {t('admin.statuses.archived')}
      </div>
      <dl className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <dt className="shrink-0 text-danger-soft-foreground/80">
            {t('admin.fields.archivedAt')}
          </dt>
          <dd className="min-w-0 truncate font-medium text-danger-soft-foreground">
            {user.deletedAt ? formatDateTime(user.deletedAt, locale) : '—'}
          </dd>
        </div>
        {user.archivedByName && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="shrink-0 text-danger-soft-foreground/80">
              {t('admin.fields.archivedBy')}
            </dt>
            <dd className="min-w-0 truncate font-medium text-danger-soft-foreground">
              {user.archivedByName}
            </dd>
          </div>
        )}
        {user.archiveReason && (
          <div className="flex items-start justify-between gap-3 text-sm">
            <dt className="shrink-0 text-danger-soft-foreground/80">
              {t('admin.fields.archiveReason')}
            </dt>
            <dd className="min-w-0 text-right font-medium text-danger-soft-foreground">
              {user.archiveReason}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

// Строка «Системной информации»: label — dt, значение — dd (mono для идентификаторов),
// опциональная кнопка копирования. Локальная копия паттерна с event-страницы.
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
