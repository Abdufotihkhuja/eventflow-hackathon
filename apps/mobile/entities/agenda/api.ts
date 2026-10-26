/**
 * Event agenda (org session) — the mobile half of the web cabinet's «Программа».
 *
 * Wrapper-free through `apiTransport` for the same reason as `attendance`: the
 * generated SDK packages are frozen and expose no agenda methods, while the API
 * has had `/events/:id/agenda` all along.
 *
 * CONTRACT NOTE: the API stores a DAY and a WALL-CLOCK TIME, not an instant —
 * `date` is `YYYY-MM-DD` and `startTime` is `HH:MM`. That is deliberate on the
 * server (a schedule printed for a venue does not move with a timezone), so the
 * client must not "helpfully" turn the pair into a Date and back: it would
 * shift every item by the device's offset. `type` and `duration` are required.
 *
 * Kept deliberately smaller than the web manager: no drag-and-drop reordering
 * (its endpoint takes a full ordered id list — desk work, not phone work) and
 * no room manager. Items still show their room and speakers.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiTransport } from "@shared/api";

/** `AgendaItemType` in the Prisma schema. */
export const AGENDA_TYPES = [
  "KEYNOTE",
  "PRESENTATION",
  "WORKSHOP",
  "PANEL",
  "NETWORKING",
  "BREAK",
  "OPENING",
  "CLOSING",
  "REGISTRATION",
  "MENTORSHIP",
  "MENTOR_SESSION",
  "FREE_WORK",
] as const;
export type AgendaItemType = (typeof AGENDA_TYPES)[number];

export interface AgendaSpeakerRef {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  company?: string | null;
  photoUrl?: string | null;
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string | null;
  type: AgendaItemType;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM` wall clock — may arrive as a full ISO time from the API. */
  startTime: string;
  duration: number;
  location?: string | null;
  room?: { id: string; name: string } | null;
  speakers?: AgendaSpeakerRef[];
  sortOrder?: number | null;
}

export interface AgendaInput {
  title: string;
  description?: string;
  type: AgendaItemType;
  date: string;
  startTime: string;
  duration: number;
  location?: string;
}

export const agendaKeys = {
  all: ["agenda"] as const,
  list: (eventId: string) => ["agenda", eventId] as const,
};

function listOf(raw: unknown): AgendaItem[] {
  if (Array.isArray(raw)) return raw as AgendaItem[];
  const data = (raw as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as AgendaItem[]) : [];
}

/** The API's `@db.Time` column serialises as a full ISO instant on some paths
 *  and as `HH:MM:SS` on others. Both mean a wall clock — take the clock part. */
export function clockOf(startTime: string): string {
  if (!startTime) return "";
  const iso = startTime.match(/T(\d{2}:\d{2})/);
  if (iso) return iso[1];
  const plain = startTime.match(/^(\d{2}:\d{2})/);
  return plain ? plain[1] : startTime;
}

/** `date` likewise arrives as `YYYY-MM-DD` or as a midnight instant. */
export function dayOf(date: string): string {
  return typeof date === "string" ? date.slice(0, 10) : "";
}

function normalise(item: AgendaItem): AgendaItem {
  return {
    ...item,
    date: dayOf(item.date),
    startTime: clockOf(item.startTime),
    speakers: Array.isArray(item.speakers) ? item.speakers : [],
  };
}

/** Exported so the section rail can count items off the SAME cache entry the
 *  agenda screen fills — the badge costs nothing once the screen has loaded. */
export async function fetchAgenda(eventId: string): Promise<AgendaItem[]> {
  const raw = await apiTransport({ method: "GET", url: `/api/v1/events/${eventId}/agenda` });
  return listOf(raw)
    .map(normalise)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export function useAgendaQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: agendaKeys.list(eventId ?? ""),
    queryFn: () => fetchAgenda(eventId ?? ""),
    enabled: Boolean(eventId),
  });
}

export function useCreateAgendaItemMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AgendaInput) =>
      apiTransport({ method: "POST", url: `/api/v1/events/${eventId}/agenda`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: agendaKeys.list(eventId) }),
  });
}

export function useUpdateAgendaItemMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AgendaInput & { id: string }) =>
      apiTransport({ method: "PATCH", url: `/api/v1/events/${eventId}/agenda/${id}`, data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: agendaKeys.list(eventId) }),
  });
}

export function useDeleteAgendaItemMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiTransport({ method: "DELETE", url: `/api/v1/events/${eventId}/agenda/${id}` }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: agendaKeys.list(eventId) }),
  });
}

/** Group by day — the reason a multi-day agenda exists at all. */
export function groupByDay(items: AgendaItem[]): { date: string; items: AgendaItem[] }[] {
  const map = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const bucket = map.get(item.date);
    if (bucket) bucket.push(item);
    else map.set(item.date, [item]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dayItems]) => ({ date, items: dayItems }));
}

export function speakerName(s: AgendaSpeakerRef): string {
  return [s.firstName, s.lastName].filter(Boolean).join(" ").trim();
}

/** `Date` → the two strings the API stores. Local parts on purpose: the picker
 *  shows a wall clock and the server keeps a wall clock. */
export function toApiDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function toApiTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
