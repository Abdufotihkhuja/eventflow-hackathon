import type { AgendaItem } from '@api/services'

export type AgendaSlot = {
  startMin: number
  endMin: number
  items: AgendaItem[]
}

const HHMM_RE = /^(\d{2}):(\d{2})/

export function startMinutesOf(item: Pick<AgendaItem, 'startTime'>): number {
  const value = item.startTime ?? ''
  const direct = HHMM_RE.exec(value)
  if (direct) {
    return Number(direct[1]) * 60 + Number(direct[2])
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 0
  }
  return parsed.getUTCHours() * 60 + parsed.getUTCMinutes()
}

export function endMinutesOf(item: Pick<AgendaItem, 'startTime' | 'duration'>): number {
  return startMinutesOf(item) + (item.duration ?? 0)
}

export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.min(24 * 60, Math.round(minutes)))
  const hh = String(Math.floor(safe / 60)).padStart(2, '0')
  const mm = String(safe % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function normalizeLocation(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/**
 * Group items belonging to a single day into overlap slots. Items must be
 * pre-sorted by (startTime asc, sortOrder asc). A slot represents a span
 * `[startMin, endMin)` and contains every item whose own range intersects
 * the running envelope. Half-open semantics: 10:00–11:00 and 11:00–12:00
 * are NOT overlapping.
 */
export function groupByOverlap(items: AgendaItem[]): AgendaSlot[] {
  if (!items.length) return []

  const slots: AgendaSlot[] = []
  let current: AgendaSlot | null = null

  for (const item of items) {
    const start = startMinutesOf(item)
    const end = start + (item.duration ?? 0)

    if (!current || start >= current.endMin) {
      current = { startMin: start, endMin: end, items: [item] }
      slots.push(current)
      continue
    }

    current.items.push(item)
    if (end > current.endMin) {
      current.endMin = end
    }
  }

  return slots
}
