import { parseUtcIso } from "@shared/lib/date";
import type { EventScheduleItem } from "@entities/event/model";

export interface AgendaSlot {
  startMs: number;
  endMs: number;
  items: EventScheduleItem[];
}

export function startMsOf(item: EventScheduleItem): number {
  const date = parseUtcIso(item.startTime);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function endMsOf(item: EventScheduleItem): number {
  if (item.endTime) {
    const t = parseUtcIso(item.endTime).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const start = startMsOf(item);
  if (typeof item.duration === "number" && item.duration > 0) {
    return start + item.duration * 60_000;
  }
  return start;
}

export function normalizeLocation(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Group items belonging to a single day into overlap slots. Items must be
 * pre-sorted by startTime ascending. Half-open semantics: items sharing only
 * their boundary do NOT overlap.
 */
export function groupByOverlap(items: EventScheduleItem[]): AgendaSlot[] {
  if (!items.length) return [];

  const slots: AgendaSlot[] = [];
  let current: AgendaSlot | null = null;

  for (const item of items) {
    const start = startMsOf(item);
    const end = endMsOf(item);

    if (!current || start >= current.endMs) {
      current = { startMs: start, endMs: end, items: [item] };
      slots.push(current);
      continue;
    }

    current.items.push(item);
    if (end > current.endMs) {
      current.endMs = end;
    }
  }

  return slots;
}
