import type { ReactNode } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { formatDate, formatDateTime } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";

import { formatEventPrice } from "@entities/event/lib/formatters";
import { EventImage } from "@entities/event/ui/event-image";
import { parseUtcIso } from "@shared/lib/date";
import { cn } from "@shared/lib/utils";

import type { Event } from "@entities/event/model";

export interface EventCardProps {
  event: Event;
  /** Sentinel for backward compatibility — both render the same calm card. */
  variant?: "grid" | "list";
}

/** Compact "Apr 30" label for the cover stamp. */
function formatStampDate(iso: string, locale: string): string {
  return formatDate(parseUtcIso(iso), locale, {
    day: "numeric",
    month: "short",
  });
}

/** Mono "Thu, Apr 30 · 09:00" line for the card footer. */
function formatLongStamp(iso: string, locale: string): string {
  const d = parseUtcIso(iso);
  const datePart = formatDate(d, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timePart = formatDateTime(d, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

/**
 * Eventflow event card — calm Luma-style:
 * cover stamp + organizer/city overlay, mono date row, ink title, single
 * accent label on the right (Event / Workshop / etc), pricing in footer.
 */
export function EventCard({ event }: EventCardProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const eventHref = `/events/${event.slug ?? event.id}`;
  const priceLabel = formatEventPrice(
    event.pricing,
    event.price,
    event.currency,
    locale,
    t
  );

  return (
    <Link
      href={eventHref}
      aria-label={t("public.events.eventDetailsAria", { title: event.title })}
      className="group block focus-visible:outline-none"
    >
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-bone-300/60 bg-white",
          "shadow-[0_1px_2px_rgba(14,14,13,0.04),0_4px_12px_rgba(14,14,13,0.04)]",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:border-bone-400 hover:shadow-[0_2px_6px_rgba(14,14,13,0.05),0_14px_32px_rgba(14,14,13,0.08)]",
          "group-focus-visible:ring-2 group-focus-visible:ring-ember-400/40 group-focus-visible:ring-offset-2"
        )}
      >
        <EventCardCover event={event} locale={locale} />

        <div className="flex flex-1 flex-col gap-3 p-5">
          <EventCardMeta event={event} locale={locale} />

          <h3 className="text-lg font-bold leading-snug text-ink-400 transition-colors duration-200 group-hover:text-ember-500 line-clamp-2">
            {event.title}
          </h3>

          {event.location && (
            <p className="text-sm text-ink-100 line-clamp-1">
              {event.location}
            </p>
          )}

          <div className="mt-auto border-t border-dashed border-bone-300 pt-3">
            <span className="text-sm font-semibold text-ink-300">
              {priceLabel}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

interface EventCardCoverProps {
  event: Event;
  locale: string;
  /** Optional override for the corner stamp (e.g. status pill). */
  stamp?: ReactNode;
  /** Optional override for the bottom-left organizer slot. */
  bottomLeft?: ReactNode;
  /** Optional override for the bottom-right city/format slot. */
  bottomRight?: ReactNode;
}

/** Cover with date stamp top-right, organizer bottom-left, city bottom-right. */
export function EventCardCover({
  event,
  locale,
  stamp,
  bottomLeft,
  bottomRight,
}: EventCardCoverProps): ReactNode {
  return (
    <div className="relative aspect-[5/4] w-full overflow-hidden">
      <EventImage
        coverImage={event.imageUrl}
        alt={event.title}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 34vw"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        priority={event.isHighlighted}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent"
      />

      {/* Date stamp / status — top-right */}
      <div className="absolute right-4 top-4">
        {stamp ?? (
          <span
            className={cn(
              "inline-flex items-center rounded-md bg-ink-400/90 px-2.5 py-1.5",
              "text-xs font-semibold text-bone-50 backdrop-blur-md",
              "[font-family:var(--font-mono)] tracking-tight"
            )}
          >
            {formatStampDate(event.startDate, locale)}
          </span>
        )}
      </div>

      {/* Bottom row — organizer + city, white text on dark gradient */}
      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-semibold text-white drop-shadow-sm">
          {bottomLeft ?? event.organizer ?? ""}
        </span>
        {(bottomRight !== undefined || event.location) && (
          <span className="min-w-0 truncate text-sm text-white/85 drop-shadow-sm">
            {bottomRight ?? `· ${event.location ?? ""}`}
          </span>
        )}
      </div>
    </div>
  );
}

interface EventCardMetaProps {
  event: Event;
  locale: string;
  /** Right-side accent label (Event / Workshop / Participant …). */
  accentLabel?: string;
}

/** Mono date line on the left + ember accent label on the right. */
export function EventCardMeta({
  event,
  locale,
  accentLabel,
}: EventCardMetaProps): ReactNode {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={cn(
          "text-xs text-ink-300",
          "[font-family:var(--font-mono)]"
        )}
      >
        {formatLongStamp(event.startDate, locale)}
      </span>
      <span className="shrink-0 text-xs font-semibold text-ember-500">
        {accentLabel ?? t("public.events.event")}
      </span>
    </div>
  );
}
