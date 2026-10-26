/**
 * View-model adapter: the API's `PublicEventItemDto` (already localized via the
 * `locale` query param) → the design components' `EventItem` shape. This is the
 * single bridge between the backend domain and the ported UI, so the design
 * cards/posters stay untouched. Missing visual seeds (hue/pattern) are derived
 * deterministically from the event id.
 */
import type { components } from "@eventflow/api-contracts";

import { env } from "@shared/config/env";
import type { EventItem, L, Lang } from "@shared/data/events";
import { STRINGS } from "@shared/i18n/strings";
import {
  formatDateStamp,
  formatDayNum,
  formatMonthShort,
  formatPrice,
  formatTime,
  hueFromId,
  patternFromId,
} from "@shared/lib/format";

export type ApiEventListItem = components["schemas"]["PublicEventItemDto"];

/** Wrap an already-localized string as an `L` so `tx()` is a no-op passthrough. */
function wrap(value: string): L {
  return { uz: value, ru: value, en: value };
}

/** Resolve a cover path (e.g. `/uploads/x.png`) to an absolute, fetchable URL. */
function resolveCover(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${env.apiUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function toCardEvent(dto: ApiEventListItem, lang: Lang): EventItem {
  const free = dto.type === "FREE";
  const price: L = free
    ? STRINGS["common.free"]
    : dto.price != null
      ? wrap(formatPrice(dto.price, dto.currency, lang))
      : wrap("—");

  return {
    id: dto.id,
    title: wrap(dto.title),
    org: dto.organization?.name ?? "",
    orgLogo: resolveCover((dto.organization as { logoUrl?: string | null } | undefined)?.logoUrl),
    date: formatDateStamp(dto.startDate, lang),
    day: formatDayNum(dto.startDate, lang),
    month: formatMonthShort(dto.startDate, lang),
    time: formatTime(dto.startDate, lang),
    venue: wrap(dto.venue ?? ""),
    city: wrap(dto.city ?? ""),
    price,
    free,
    cat: dto.categories?.[0]?.slug ?? "",
    catLabel: wrap(dto.categories?.[0]?.name ?? ""),
    going: dto.registrationsCount ?? 0,
    capacity: dto.maxParticipants ?? 0,
    hue: hueFromId(dto.id),
    pattern: patternFromId(dto.id),
    coverImage: resolveCover(dto.coverImage),
    pick: dto.isFeatured,
    about: wrap(dto.shortDescription ?? ""),
  };
}

type ApiEventDetail = components["schemas"]["PublicEventDetailDto"];

/** Build the minimal `EventItem` the poster/hero needs from the detail DTO.
 *  The detail DTO types several fields loosely, so we read through one
 *  permissive shape (// CONTRACT-GAP). */
export function toDetailEvent(dto: ApiEventDetail, lang: Lang): EventItem {
  const d = dto as unknown as {
    id: string;
    title: string;
    type?: string;
    price?: string | number | null;
    currency?: string | null;
    coverImage?: string | null;
    venue?: string | null;
    city?: string | null;
    startDate: string;
    shortDescription?: string | null;
    isFeatured?: boolean;
    registrationsCount?: number | null;
    maxParticipants?: number | null;
    categories?: { slug?: string; name?: string }[];
    organization?: { name?: string; companyName?: string; logoUrl?: string | null };
  };
  const free = d.type === "FREE";
  const priceNum = d.price != null && d.price !== "" ? Number(d.price) : null;
  const price: L = free
    ? STRINGS["common.free"]
    : priceNum != null && !Number.isNaN(priceNum)
      ? wrap(formatPrice(priceNum, d.currency ?? "UZS", lang))
      : wrap("—");

  return {
    id: d.id,
    title: wrap(d.title),
    org: d.organization?.name ?? d.organization?.companyName ?? "",
    orgLogo: resolveCover(d.organization?.logoUrl),
    date: formatDateStamp(d.startDate, lang),
    day: formatDayNum(d.startDate, lang),
    month: formatMonthShort(d.startDate, lang),
    time: formatTime(d.startDate, lang),
    venue: wrap(d.venue ?? ""),
    city: wrap(d.city ?? ""),
    price,
    free,
    cat: d.categories?.[0]?.slug ?? "",
    catLabel: wrap(d.categories?.[0]?.name ?? ""),
    going: d.registrationsCount ?? 0,
    capacity: d.maxParticipants ?? 0,
    hue: hueFromId(d.id),
    pattern: patternFromId(d.id),
    coverImage: resolveCover(d.coverImage),
    pick: Boolean(d.isFeatured),
    about: wrap(d.shortDescription ?? ""),
  };
}
