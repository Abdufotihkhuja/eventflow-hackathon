/**
 * Очередь модерации на дашборде супер-админа.
 * Три worklist-колонки (организации / события / статьи) с deep-links,
 * старые заявки сверху — это зона «действуй сейчас».
 */

import { Link } from 'react-router-dom'
import { Building2, CalendarDays, CheckCircle2, ChevronRight, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { SystemStats, SystemStatsModerationItem } from '@api/services/superAdmin.types'
import { formatDate } from '@shared/lib'
import { cn } from '@shared/lib/cn'
import { Card } from '@shared/ui'

type ModerationQueueProps = {
  stats: SystemStats
  locale: string
}

type QueueSection = {
  key: 'organizations' | 'events' | 'blogPosts'
  icon: LucideIcon
  count: number
  items: SystemStatsModerationItem[]
  listHref: string
  itemHref: (item: SystemStatsModerationItem) => string
}

export function ModerationQueue({ stats, locale }: ModerationQueueProps) {
  const t = useT()

  const sections: QueueSection[] = [
    {
      key: 'organizations',
      icon: Building2,
      count: stats.pendingOrganizations,
      items: stats.moderationQueue?.organizations ?? [],
      listHref: '/admin/organizations',
      itemHref: item => `/admin/organizations?search=${encodeURIComponent(item.title)}`,
    },
    {
      key: 'events',
      icon: CalendarDays,
      count: stats.pendingEvents,
      items: stats.moderationQueue?.events ?? [],
      listHref: '/admin/events',
      itemHref: item => `/admin/events/${item.id}`,
    },
    {
      key: 'blogPosts',
      icon: FileText,
      count: stats.pendingBlogPosts ?? 0,
      items: stats.moderationQueue?.blogPosts ?? [],
      listHref: '/admin/blog-posts',
      itemHref: () => '/admin/blog-posts',
    },
  ]

  const totalPending = sections.reduce((sum, section) => sum + section.count, 0)

  if (totalPending === 0) {
    return (
      <Card className="flex items-center gap-3 py-4">
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t('admin.dashboard.queue.title')}
          </p>
          <p className="text-sm text-muted-foreground">{t('admin.dashboard.queue.empty')}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3.5">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            {t('admin.dashboard.queue.title')}
          </h2>
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-warning-soft px-1.5 py-0.5 text-xs font-semibold tabular-nums text-warning-soft-foreground">
            {totalPending}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('admin.dashboard.queue.description')}
        </p>
      </div>

      <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {sections.map(section => (
          <QueueColumn key={section.key} section={section} locale={locale} />
        ))}
      </div>
    </Card>
  )
}

function QueueColumn({ section, locale }: { section: QueueSection; locale: string }) {
  const t = useT()
  const Icon = section.icon

  return (
    <section className="min-w-0 px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <h3 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t(`admin.dashboard.queue.${section.key}`)}
          </h3>
          <span
            className={cn(
              'tabular-nums text-xs font-semibold',
              section.count > 0 ? 'text-warning' : 'text-muted-foreground'
            )}
          >
            {section.count}
          </span>
        </div>
        {section.count > 0 && (
          <Link
            to={section.listHref}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-foreground underline-offset-4 transition-colors hover:underline"
          >
            {t('admin.dashboard.queue.showAll')}
            <ChevronRight className="size-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {section.items.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {section.items.map(item => (
            <li key={item.id}>
              <Link
                to={section.itemHref(item)}
                className="block rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <span className="block truncate text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {section.key !== 'organizations' && (
                    <>
                      {item.organizationName ?? t('admin.dashboard.queue.noOrganization')}
                      {' · '}
                    </>
                  )}
                  {t('admin.dashboard.queue.waitingSince', {
                    date: formatDate(item.createdAt, locale),
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
