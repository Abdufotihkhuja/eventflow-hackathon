/**
 * Org-scoped event rows (GET /events with the workspace token) → view model.
 * The response is untyped in the generated contract (CONTRACT-GAP, same
 * pattern as entities/event) — this adapter is the single narrowing point.
 *
 * Lifecycle is DERIVED client-side: the backend has no LIVE status —
 * PUBLISHED + "now inside the event window" reads as live, PUBLISHED past its
 * end reads as past (completed events normally flip PUBLISHED → COMPLETED).
 */
import { hueFromId, patternFromId, resolveMediaUrl } from "@shared/lib/format";

import type { EventLifecycleStatus } from "@shared/ui";

export type OrgEventStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "CANCELLED"
  | "COMPLETED";

/** Raw row shape we rely on (subset of the API's Event + `_count`). */
interface RawOrgEvent {
  id: string;
  title?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  venue?: string | null;
  city?: string | null;
  coverImage?: string | null;
  viewsCount?: number | null;
  maxParticipants?: number | null;
  type?: string | null;
  format?: string | null;
  price?: number | string | null;
  currency?: string | null;
  registrationDeadline?: string | null;
  publishedAt?: string | null;
  _count?: { registrations?: number | null } | null;
}

/** Fuller raw shape used by the manage/edit screen (adds fields the list row
 *  drops: description blocks, slug, categories, format). */
interface RawOrgEventDetail extends RawOrgEvent {
  slug?: string | null;
  description?: unknown;
  format?: string | null;
  categories?: { id: string; name?: string | null }[] | null;
  accessType?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  onlineUrl?: string | null;
  registrationDeadline?: string | null;
  registrationOpen?: boolean | null;
  commentsEnabled?: boolean | null;
  shortDescription?: string | null;
  translations?: unknown;
}

export interface OrgEventRow {
  id: string;
  title: string;
  status: OrgEventStatus;
  lifecycle: EventLifecycleStatus;
  startDate: string | null;
  endDate: string | null;
  venue: string;
  city: string;
  coverImage?: string;
  /** Real page views (increments on public slug open). */
  views: number;
  registrations: number;
  capacity: number | null;
  free: boolean;
  format: "OFFLINE" | "ONLINE" | "HYBRID";
  /** Приём заявок закрывается раньше старта — карточка обязана это показать
   *  (design 4.4 §теги), иначе организатор узнаёт о закрытом приёме постфактум. */
  registrationDeadline: string | null;
  /** Момент первой публикации; не сбрасывается при возврате в черновик, поэтому
   *  по нему видно, что прошедшее событие можно завершить. */
  publishedAt: string | null;
  /** Poster fallback seed (no cover art). */
  hue: number;
  pattern: ReturnType<typeof patternFromId>;
}

export function lifecycleOf(status: OrgEventStatus, startDate?: string | null, endDate?: string | null, now = Date.now()): EventLifecycleStatus {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "PENDING_REVIEW":
      return "pending";
    case "CANCELLED":
      return "cancelled";
    case "COMPLETED":
      return "past";
    case "PUBLISHED": {
      const start = startDate ? Date.parse(startDate) : Number.NaN;
      const end = endDate ? Date.parse(endDate) : Number.NaN;
      if (!Number.isNaN(end) && end < now) return "past";
      if (!Number.isNaN(start) && start <= now && (Number.isNaN(end) || now <= end)) return "live";
      return "published";
    }
  }
}

/** Coerce the API's `price` (string | number | null) to a number, else null. */
function toNumberOrNull(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export function toOrgEventRow(raw: unknown, now = Date.now()): OrgEventRow {
  const e = (raw ?? {}) as RawOrgEvent;
  const status = (e.status ?? "DRAFT") as OrgEventStatus;
  const price = toNumberOrNull(e.price);
  return {
    id: e.id,
    title: e.title ?? "",
    status,
    lifecycle: lifecycleOf(status, e.startDate, e.endDate, now),
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    venue: e.venue ?? "",
    city: e.city ?? "",
    coverImage: resolveMediaUrl(e.coverImage),
    views: e.viewsCount ?? 0,
    registrations: e._count?.registrations ?? 0,
    capacity: e.maxParticipants ?? null,
    free: e.type === "FREE" || price == null || price === 0,
    format: e.format === "ONLINE" || e.format === "HYBRID" ? e.format : "OFFLINE",
    registrationDeadline: e.registrationDeadline ?? null,
    publishedAt: e.publishedAt ?? null,
    hue: hueFromId(e.id ?? ""),
    pattern: patternFromId(e.id ?? ""),
  };
}

/** Editable form-facing view of a single event (edit prefill + manage stats).
 *  Keeps the raw `coverImage` path AND a resolved URL: the form re-sends the
 *  server path on save, while the UI shows the fetchable URL. */
export interface OrgEventDetail extends OrgEventRow {
  slug: string | null;
  /** BlockNote description blocks (untyped) — flattened to text by the form. */
  description: unknown;
  format: "OFFLINE" | "ONLINE" | "HYBRID";
  price: number | null;
  currency: string | null;
  categoryIds: string[];
  /** Server-relative cover path (what create/edit expects back), unresolved. */
  coverImagePath: string | null;
  accessType: "OPEN" | "REQUEST" | "INVITE_ONLY" | "PRIVATE";
  address: string;
  /** Venue point, when the author picked one on the map. */
  latitude: number | null;
  longitude: number | null;
  onlineUrl: string;
  registrationDeadline: string | null;
  registrationOpen: boolean;
  commentsEnabled: boolean;
  shortDescription: string;
  /** field → locale → text (see EventTranslations in mutations.ts). */
  translations: Record<string, Partial<Record<string, string>>>;
}

const ACCESS_TYPES = ["OPEN", "REQUEST", "INVITE_ONLY", "PRIVATE"] as const;

export function toOrgEventDetail(raw: unknown, now = Date.now()): OrgEventDetail {
  const e = (raw ?? {}) as RawOrgEventDetail;
  const row = toOrgEventRow(e, now);
  const format = (e.format ?? "OFFLINE") as OrgEventDetail["format"];
  return {
    ...row,
    slug: e.slug ?? null,
    description: e.description,
    format: format === "ONLINE" || format === "HYBRID" ? format : "OFFLINE",
    price: toNumberOrNull(e.price),
    currency: e.currency ?? null,
    categoryIds: Array.isArray(e.categories) ? e.categories.map((c) => c.id) : [],
    coverImagePath: e.coverImage ?? null,
    accessType: ACCESS_TYPES.includes(e.accessType as never)
      ? (e.accessType as OrgEventDetail["accessType"])
      : "OPEN",
    address: e.address ?? "",
    latitude: toNumberOrNull(e.latitude),
    longitude: toNumberOrNull(e.longitude),
    onlineUrl: e.onlineUrl ?? "",
    registrationDeadline: e.registrationDeadline ?? null,
    // Both default TRUE server-side, so a missing key means "on", not "off".
    registrationOpen: e.registrationOpen !== false,
    commentsEnabled: e.commentsEnabled !== false,
    shortDescription: e.shortDescription ?? "",
    translations:
      e.translations && typeof e.translations === "object"
        ? (e.translations as Record<string, Partial<Record<string, string>>>)
        : {},
  };
}
