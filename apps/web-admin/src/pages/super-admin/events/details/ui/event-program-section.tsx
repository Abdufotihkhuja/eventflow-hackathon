/**
 * Read-only программа события для супер-админа: пункты сгруппированы по дням,
 * время — wall-clock из UTC-полей (как в agenda-manager), тип — soft-чип.
 */

import { useMemo } from 'react'
import { CalendarRange, MapPin, Paperclip } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { AdminEventAgendaItem } from '@api/services/superAdmin.types'
import { formatDate } from '@shared/lib'
import { EmptyState } from '@shared/ui'

type EventProgramSectionProps = {
  items: AdminEventAgendaItem[]
  locale: string
}

const AGENDA_TYPE_LABEL_KEYS: Record<string, string> = {
  KEYNOTE: 'events.agenda.type.keynote',
  PRESENTATION: 'events.agenda.type.presentation',
  WORKSHOP: 'events.agenda.type.workshop',
  PANEL: 'events.agenda.type.panel',
  NETWORKING: 'events.agenda.type.networking',
  BREAK: 'events.agenda.type.break',
  OPENING: 'events.agenda.type.opening',
  CLOSING: 'events.agenda.type.closing',
  REGISTRATION: 'events.agenda.type.registration',
  MENTORSHIP: 'events.agenda.type.mentorship',
  MENTOR_SESSION: 'events.agenda.type.mentorSession',
  FREE_WORK: 'events.agenda.type.freeWork',
}

/** Wall-clock HH:MM из ISO (время хранится как UTC-время суток). */
function extractTime(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const total = (h * 60 + m + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function EventProgramSection({ items, locale }: EventProgramSectionProps) {
  const t = useT()

  const days = useMemo(() => {
    const byDate = new Map<string, AdminEventAgendaItem[]>()
    for (const item of items) {
      const key = item.date.slice(0, 10)
      const list = byDate.get(key)
      if (list) list.push(item)
      else byDate.set(key, [item])
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title={t('admin.events.details.programEmpty')}
        description={t('admin.events.details.programEmptyHint')}
      />
    )
  }

  return (
    <div className="space-y-6">
      {days.map(([date, dayItems], dayIndex) => (
        <section key={date}>
          {days.length > 1 && (
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('admin.events.details.programDay', { day: dayIndex + 1 })} ·{' '}
              {formatDate(date, locale)}
            </h3>
          )}
          <ol className="divide-y divide-border rounded-lg border border-border">
            {dayItems.map(item => {
              const start = extractTime(item.startTime)
              const end = start ? addMinutes(start, item.duration) : ''
              return (
                <li key={item.id} className="flex gap-4 px-4 py-3">
                  <div className="w-24 shrink-0 pt-0.5">
                    <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                      {start}
                    </p>
                    {end && (
                      <p className="font-mono text-xs tabular-nums text-muted-foreground">
                        – {end}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {AGENDA_TYPE_LABEL_KEYS[item.type]
                          ? t(AGENDA_TYPE_LABEL_KEYS[item.type])
                          : item.type}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {item.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" aria-hidden="true" />
                          {item.location}
                        </span>
                      )}
                      {(item.materials?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="size-3" aria-hidden="true" />
                          {t('admin.events.details.programMaterials', {
                            count: item.materials?.length ?? 0,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
