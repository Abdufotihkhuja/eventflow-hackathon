/**
 * KPI-строка детальной страницы события: регистрации с разбивкой по статусам,
 * заполненность, просмотры публичной страницы, чек-ины, сертификаты, комментарии.
 */

import {
  BadgeCheck,
  ClipboardList,
  Eye,
  Gauge,
  MessageCircle,
  UserCheck,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { AdminEvent } from '@api/services/superAdmin.types'
import { StatTile } from '@shared/ui'

type EventStatsRowProps = {
  event: AdminEvent
  locale: string
}

export function EventStatsRow({ event, locale }: EventStatsRowProps) {
  const t = useT()
  const stats = event.stats
  if (!stats) return null

  const byStatus = stats.registrationsByStatus
  const approved = byStatus.APPROVED ?? 0
  const pending = byStatus.PENDING ?? 0
  const totalRegistrations = event._count.registrations

  const capacity = event.maxParticipants ?? null
  const fillPercent = capacity && capacity > 0 ? Math.round((approved / capacity) * 100) : null

  const format = (value: number) => value.toLocaleString(locale)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatTile
        label={t('admin.events.stats.registrations')}
        value={format(totalRegistrations)}
        icon={ClipboardList}
        hint={t('admin.events.stats.registrationsHint', {
          approved: format(approved),
          pending: format(pending),
        })}
        tone={pending > 0 ? 'warning' : 'default'}
        highlight={pending > 0}
      />
      <StatTile
        label={t('admin.events.stats.fill')}
        value={fillPercent !== null ? `${fillPercent}%` : '—'}
        icon={Gauge}
        hint={
          capacity
            ? t('admin.events.stats.fillHint', {
                approved: format(approved),
                capacity: format(capacity),
              })
            : t('admin.events.stats.noCapacity')
        }
      />
      <StatTile
        label={t('admin.events.stats.views')}
        value={format(event.viewsCount ?? 0)}
        icon={Eye}
      />
      <StatTile
        label={t('admin.events.stats.checkIns')}
        value={format(stats.checkedInParticipants)}
        icon={UserCheck}
        hint={
          approved > 0
            ? t('admin.events.stats.checkInsHint', {
                percent: Math.round((stats.checkedInParticipants / approved) * 100),
              })
            : undefined
        }
      />
      <StatTile
        label={t('admin.events.stats.certificates')}
        value={format(stats.certificatesIssued)}
        icon={BadgeCheck}
      />
      <StatTile
        label={t('admin.events.stats.comments')}
        value={format(stats.commentsCount)}
        icon={MessageCircle}
      />
    </div>
  )
}
