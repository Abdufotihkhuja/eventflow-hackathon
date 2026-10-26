"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

import { useLocale } from "@eventflow/i18n/react";

import { mapPublicEventToDesignEvent } from "@entities/event/lib";
import { useEventDetailsQuery } from "@features/event/details";
import { trackEvent } from "@shared/analytics/track";
import { isAuthenticated } from "@shared/lib/apiClient";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { extractTextFromBlocks } from "@shared/lib/richText";
import { formatUzDate } from "@shared/lib/uz-date";
import { BlogContentBlocks, CommentsSection } from "@shared/ui";
import { Container } from "@shared/ui/container";
import {
  CalmEventCard,
  DesignIcon,
  EventPoster,
  Eyebrow,
  ItalicAccent,
} from "@shared/ui/design-system";
import {
  useActiveSection,
  useCanRegisterQuery,
  useCheckSavedEventQuery,
  usePublicEventsQuery,
  useToggleSavedEventMutation,
} from "@shared/lib/hooks";

import type { Locale } from "@eventflow/i18n";
import type {
  AgendaSpeaker,
  EventDetail,
  EventRoom,
  EventScheduleItem,
} from "@entities/event";
import type { BlockNoteContentBlock } from "@entities/blog";
import type { PublicEvent } from "@shared/api/eventService";

const pickLang = (locale: Locale): "en" | "ru" | "uz" => {
  if (locale === "ru") return "ru";
  if (locale === "uz") return "uz";
  return "en";
};

const intlLocaleFor = (locale: Locale): string =>
  locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-Latn-UZ" : "en-US";

const formatTimeLabel = (
  iso: string | undefined,
  locale: Locale,
  timeZone?: string,
): string => {
  if (!iso) return "—";
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return new Intl.DateTimeFormat(intlLocaleFor(locale), {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timeZone || undefined,
    }).format(dt);
  } catch {
    return iso;
  }
};

const formatDayLabel = (
  iso: string | undefined,
  locale: Locale,
  timeZone?: string,
): string => {
  if (!iso) return "—";
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    // ICU's `uz-Latn-UZ` long-month data is incomplete (renders as "M05"),
    // so the schedule day-headers go through our own formatter.
    if (locale === "uz") {
      return formatUzDate(dt, { day: true, month: "long" }, timeZone);
    }
    return new Intl.DateTimeFormat(intlLocaleFor(locale), {
      day: "numeric",
      month: "long",
      timeZone: timeZone || undefined,
    }).format(dt);
  } catch {
    return iso;
  }
};

const dateKeyOf = (iso: string | undefined, timeZone?: string): string => {
  if (!iso) return "";
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timeZone || undefined,
    })
      .format(dt)
      .replace(/\//g, "-");
  } catch {
    return "";
  }
};

const t = (
  lang: "en" | "ru" | "uz",
  bag: { en: string; ru?: string; uz?: string },
): string =>
  (lang === "ru" ? bag.ru : lang === "uz" ? bag.uz : bag.en) ?? bag.en;

type OnlineTone = "ember" | "green" | "blue" | "red" | "purple";

interface OnlinePlatform {
  label: string;
  tone: OnlineTone;
}

/**
 * Map a meeting / broadcast URL to a friendly platform label + tone so
 * the venue card can read "Join via Google Meet" instead of a raw host.
 * Falls back to ember/"Online broadcast" for anything we don't recognize.
 */
const detectOnlinePlatform = (url: string): OnlinePlatform => {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = url.toLowerCase();
  }
  if (host.includes("meet.google.com") || host.includes("hangouts.google"))
    return { label: "Google Meet", tone: "green" };
  if (host.includes("zoom.us") || host.endsWith("zoom.com"))
    return { label: "Zoom", tone: "blue" };
  if (host.includes("youtube.com") || host.includes("youtu.be"))
    return { label: "YouTube", tone: "red" };
  if (host.includes("teams.microsoft.com") || host.includes("teams.live.com"))
    return { label: "Microsoft Teams", tone: "purple" };
  if (host.includes("twitch.tv")) return { label: "Twitch", tone: "purple" };
  if (host.includes("discord")) return { label: "Discord", tone: "purple" };
  if (host === "t.me" || host.endsWith(".t.me") || host.includes("telegram"))
    return { label: "Telegram", tone: "blue" };
  if (host.endsWith("vk.com") || host.includes("vkvideo"))
    return { label: "ВКонтакте", tone: "blue" };
  if (host.includes("rutube")) return { label: "Rutube", tone: "red" };
  return { label: "Online broadcast", tone: "ember" };
};

/**
 * The client-side React-Query refetch returns the raw API payload, where
 * description-like fields can be either a string or a TipTap/BlockNote block
 * tree (`{id, type, props, content, children}`). React refuses to render
 * objects directly, so coerce into plain text before rendering.
 */
const asText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return extractTextFromBlocks(value);
};

interface SectionDef {
  id: string;
  label: { en: string; ru: string; uz?: string };
}

const SECTIONS: SectionDef[] = [
  { id: "about", label: { en: "About", ru: "О событии", uz: "Tadbir" } },
  {
    id: "speakers",
    label: { en: "Speakers", ru: "Спикеры", uz: "Maʼruzachilar" },
  },
  {
    id: "programme",
    label: { en: "Programme", ru: "Программа", uz: "Dastur" },
  },
  { id: "venue", label: { en: "Venue", ru: "Место", uz: "Joy" } },
  {
    id: "materials",
    label: { en: "Materials", ru: "Материалы", uz: "Materiallar" },
  },
  {
    id: "comments",
    label: { en: "Comments", ru: "Комментарии", uz: "Izohlar" },
  },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

/**
 * Convert an EventDetail (entity shape) into a minimal PublicEvent-shaped
 * object so we can reuse the design-event adapter for visual fields.
 */
const toPublicEventShape = (ev: EventDetail): PublicEvent =>
  ({
    id: ev.id,
    title: ev.title,
    slug: ev.slug,
    coverImage: ev.imageUrl,
    format: (ev.format?.toUpperCase() as PublicEvent["format"]) ?? "OFFLINE",
    status: "PUBLISHED",
    type: ev.pricing === "free" ? "FREE" : "PAID",
    startDate: ev.startDate,
    endDate: ev.endDate,
    city: ev.logistics?.city,
    venue: ev.logistics?.venue,
    location: ev.location,
    price: ev.price,
    currency: ev.currency,
    categories: (ev.categories ?? []).map((name) => ({ slug: "", name })),
    organization: {
      id: ev.organization?.id ?? ev.organizationId ?? "",
      name: ev.organization?.name ?? ev.organizer ?? "Eventflow",
      companyName: ev.organization?.companyName,
      logoUrl: ev.organization?.logoUrl ?? ev.organizerLogoUrl,
    },
    maxParticipants: ev.capacity,
    registrationsCount: ev.registrationsCount,
    isFeatured: ev.isHighlighted,
  }) as PublicEvent;

/**
 * Sidebar avatar for the event organizer. Falls back to two-letter
 * initials when the logo URL is missing OR the image fails to load
 * (broken upload, network error, etc.) — without it, a stale logo_url
 * row in the DB leaves a blank square in the host card.
 */
function HostAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | undefined;
}): React.ReactNode {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;
  return (
    <div className="cm-detail-card__host-avatar">
      {showImage ? (
        <img
          src={logoUrl as string}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "inherit",
          }}
        />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

/**
 * Speaker avatar in the speakers grid. Shows uploaded photo when available;
 * falls back to two-letter initials if the URL is missing or the image fails
 * to load (broken upload, network error, etc.).
 */
function SpeakerAvatar({
  avatarUrl,
  name,
  initials,
}: {
  avatarUrl: string | undefined;
  name: string;
  initials: string;
}): React.ReactNode {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;
  return (
    <div className="cm-speaker__avatar">
      {showImage ? (
        <img
          src={avatarUrl as string}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "inherit",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}

type SpeakerSocialPlatform =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "telegram"
  | "website";

const SOCIAL_LABELS: Record<SpeakerSocialPlatform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  website: "Website",
};

/** Brand glyph for a speaker's social link. Uses currentColor for theming. */
function SpeakerSocialIcon({
  platform,
}: {
  platform: SpeakerSocialPlatform;
}): React.ReactNode {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    focusable: false,
  } as const;
  switch (platform) {
    case "linkedin":
      return (
        <svg {...common} fill="currentColor">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.39A5.9 5.9 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.48 1.39 2.13.65.67 1.33 1.08 2.13 1.39.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.39 5.9 5.9 0 0 0 1.39-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.39-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common} fill="currentColor">
          <path d="M23.91 3.79 20.3 20.84c-.25 1.21-.98 1.5-1.99.94l-5.5-4.07-2.66 2.56c-.3.3-.55.55-1.12.55l.4-5.65 10.27-9.27c.45-.4-.1-.62-.69-.22L6.27 13.69.86 12c-1.18-.37-1.2-1.18.25-1.74l21.1-8.13c.98-.36 1.84.22 1.7 1.66z" />
        </svg>
      );
    case "website":
      return (
        <svg
          {...common}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Compact avatar for speakers/mentors attached to a schedule item. Same
 * fallback rules as the main speakers grid (initials when the photo is
 * missing or fails to load) but rendered at 28×28 to fit the agenda card.
 */
function ScheduleSpeakerAvatar({
  avatarUrl,
  name,
  initials,
}: {
  avatarUrl: string | undefined;
  name: string;
  initials: string;
}): React.ReactNode {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;
  return (
    <div className="cm-programme-card__speaker-avatar" aria-hidden>
      {showImage ? (
        <img
          src={avatarUrl as string}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

const SCHEDULE_SPEAKER_VISIBLE_LIMIT = 5;

const speakerFullName = (sp: AgendaSpeaker): string =>
  [sp.firstName, sp.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

const speakerInitials = (sp: AgendaSpeaker): string =>
  (`${sp.firstName?.[0] ?? ""}${sp.lastName?.[0] ?? ""}` || "?").toUpperCase();

const speakerSubtitle = (sp: AgendaSpeaker): string =>
  [sp.position, sp.company].filter(Boolean).join(" · ");

const POPOVER_SPRING = { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.6 };
const POPOVER_INITIAL = { opacity: 0, y: 6, scale: 0.94 };
const POPOVER_ANIMATE = { opacity: 1, y: 0, scale: 1 };
const POPOVER_EXIT = { opacity: 0, y: 4, scale: 0.96 };

/**
 * Headless hover/focus state for popovers — used by both the per-speaker
 * chip and the "+N more" overflow chip. Closes on blur and on Escape so
 * keyboard users can dismiss without leaving the row.
 */
function usePopover(): {
  open: boolean;
  bind: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
} {
  const [open, setOpen] = useState(false);
  const bind = {
    onPointerEnter: () => setOpen(true),
    onPointerLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    },
  };
  return { open, bind };
}

/**
 * Single circular avatar in the agenda card. Hover or keyboard focus
 * reveals a small floating card with the speaker's name + role/company,
 * animated with a soft spring (no abrupt pop, no over-eager fade).
 */
function ScheduleSpeakerChip({
  speaker,
}: {
  speaker: AgendaSpeaker;
}): React.ReactNode {
  const fullName = speakerFullName(speaker) || "—";
  const initials = speakerInitials(speaker);
  const subtitle = speakerSubtitle(speaker);
  const { open, bind } = usePopover();

  return (
    <div
      className="cm-programme-card__chip"
      tabIndex={0}
      role="button"
      aria-label={subtitle ? `${fullName} — ${subtitle}` : fullName}
      {...bind}
    >
      <ScheduleSpeakerAvatar
        avatarUrl={speaker.avatarUrl}
        name={fullName}
        initials={initials}
      />
      <AnimatePresence>
        {open ? (
          <motion.div
            className="cm-programme-card__pop"
            initial={POPOVER_INITIAL}
            animate={POPOVER_ANIMATE}
            exit={POPOVER_EXIT}
            transition={POPOVER_SPRING}
            role="tooltip"
          >
            <span className="cm-programme-card__pop-name">{fullName}</span>
            {subtitle ? (
              <span className="cm-programme-card__pop-role">{subtitle}</span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Overflow chip shown after the visible-limit. Hover/focus opens a vertical
 * list of every speaker that didn't fit so the user can still see them all.
 */
function ScheduleSpeakerOverflow({
  speakers,
}: {
  speakers: AgendaSpeaker[];
}): React.ReactNode {
  const { open, bind } = usePopover();
  return (
    <div
      className="cm-programme-card__chip cm-programme-card__chip--more"
      tabIndex={0}
      role="button"
      aria-label={`+${speakers.length}`}
      {...bind}
    >
      <div
        className="cm-programme-card__speaker-avatar cm-programme-card__speaker-avatar--more"
        aria-hidden
      >
        <span>+{speakers.length}</span>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="cm-programme-card__pop cm-programme-card__pop--list"
            initial={POPOVER_INITIAL}
            animate={POPOVER_ANIMATE}
            exit={POPOVER_EXIT}
            transition={POPOVER_SPRING}
            role="tooltip"
          >
            {speakers.map((sp) => {
              const fullName = speakerFullName(sp) || "—";
              const subtitle = speakerSubtitle(sp);
              return (
                <div key={sp.id} className="cm-programme-card__pop-row">
                  <ScheduleSpeakerAvatar
                    avatarUrl={sp.avatarUrl}
                    name={fullName}
                    initials={speakerInitials(sp)}
                  />
                  <div className="cm-programme-card__pop-row-text">
                    <span className="cm-programme-card__pop-name">{fullName}</span>
                    {subtitle ? (
                      <span className="cm-programme-card__pop-role">{subtitle}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Horizontal stack of speaker avatars attached to a schedule item. Caps at
 * `SCHEDULE_SPEAKER_VISIBLE_LIMIT` and folds the remainder into a "+N" chip
 * so dozens of mentors don't overflow the agenda card.
 */
function ScheduleSpeakerStack({
  speakers,
}: {
  speakers: AgendaSpeaker[];
}): React.ReactNode {
  const visible = speakers.slice(0, SCHEDULE_SPEAKER_VISIBLE_LIMIT);
  const hidden = speakers.slice(SCHEDULE_SPEAKER_VISIBLE_LIMIT);
  return (
    <ul className="cm-programme-card__speakers">
      {visible.map((sp) => (
        <li key={sp.id} className="cm-programme-card__speaker">
          <ScheduleSpeakerChip speaker={sp} />
        </li>
      ))}
      {hidden.length > 0 ? (
        <li className="cm-programme-card__speaker">
          <ScheduleSpeakerOverflow speakers={hidden} />
        </li>
      ) : null}
    </ul>
  );
}

interface CalmEventDetailsViewProps {
  slug: string;
  initialEvent: EventDetail;
  inviteCode?: string;
}

export function CalmEventDetailsView({
  slug,
  initialEvent,
  inviteCode,
}: CalmEventDetailsViewProps): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);

  const { data } = useEventDetailsQuery({
    slug,
    inviteCode,
    initialData: initialEvent,
  });
  const event = data ?? initialEvent;

  const aboutBlocks = useMemo<BlockNoteContentBlock[]>(() => {
    let raw: unknown[] = [];
    if (Array.isArray(event.descriptionBlocks)) {
      raw = event.descriptionBlocks;
    } else if (Array.isArray(event.description)) {
      raw = event.description as unknown as unknown[];
    }
    const blocks = raw as unknown as BlockNoteContentBlock[];
    const hasRenderableContent = blocks.some((b) => {
      if (b?.type === "image" && b.props?.url) return true;
      return (
        Array.isArray(b?.content) &&
        b.content.some(
          (c) => typeof c?.text === "string" && c.text.trim() !== ""
        )
      );
    });
    return hasRenderableContent ? blocks : [];
  }, [event.descriptionBlocks, event.description]);

  const designEvent = useMemo(
    () =>
      mapPublicEventToDesignEvent(toPublicEventShape(event), {
        locale,
        timeZone: event.logistics?.timezone,
      }),
    [event, locale],
  );

  // Date/time labels for the header meta. A lone start time reads as noise on
  // multi-day or all-day events (where the stored clock value is meaningless,
  // e.g. an end-of-day 23:58 placeholder), so show a date range, a start–end
  // window, or an explicit "All day" instead of a single misleading time.
  const { metaDateValue, metaTimeValue } = useMemo(() => {
    const tz = event.logistics?.timezone || undefined;
    const startISO = event.startDate;
    const endISO = event.endDate;
    const startKey = dateKeyOf(startISO, tz);
    const endKey = endISO ? dateKeyOf(endISO, tz) : "";
    const multiDay = Boolean(endKey && startKey && endKey !== startKey);
    const startTime = formatTimeLabel(startISO, locale, tz);
    const endTime = endISO ? formatTimeLabel(endISO, locale, tz) : "";
    const allDay =
      startTime === "00:00" &&
      (multiDay || endTime === "00:00" || endTime === "23:59" || endTime === "23:58");

    const dateValue = multiDay
      ? `${formatDayLabel(startISO, locale, tz)} — ${formatDayLabel(endISO, locale, tz)}`
      : designEvent.date || "—";

    let timeValue: string;
    if (allDay) {
      timeValue = t(lang, { en: "All day", ru: "Весь день", uz: "Kun boʻyi" });
    } else if (!multiDay && endTime && endTime !== startTime) {
      timeValue = `${startTime} – ${endTime}`;
    } else {
      timeValue = startTime || "—";
    }
    return { metaDateValue: dateValue, metaTimeValue: timeValue };
  }, [
    event.startDate,
    event.endDate,
    event.logistics?.timezone,
    locale,
    lang,
    designEvent.date,
  ]);

  const [activeSection, setActiveSection] = useActiveSection(
    SECTION_IDS,
    "about",
  );
  const navListRef = useRef<HTMLUListElement>(null);

  // Floating mobile CTA: visible while the user reads, hidden once the real
  // ticket card scrolls into view so it never covers the card or the footer.
  const ctaCardRef = useRef<HTMLDivElement>(null);
  const [showMobileCta, setShowMobileCta] = useState(true);

  // eslint-disable-next-line no-restricted-syntax -- observes the in-page CTA card to toggle the mobile sticky bar
  useEffect(() => {
    const card = ctaCardRef.current;
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMobileCta(!entry.isIntersecting),
      { rootMargin: "0px 0px -120px 0px" },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll active pill into view when section changes (mobile UX)
  // eslint-disable-next-line no-restricted-syntax -- DOM-side scroll alignment for the sticky pill nav
  useEffect(() => {
    const list = navListRef.current;
    if (!list) return;
    const pill = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!pill) return;
    const lr = list.getBoundingClientRect();
    const pr = pill.getBoundingClientRect();
    if (pr.left < lr.left + 24 || pr.right > lr.right - 24) {
      pill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeSection]);

  // Sync sticky-nav top + sticky-nav height with the live DOM. Header height
  // changes on resize/breakpoint AND when the user signs in (Sign-in button
  // becomes an avatar dropdown and the chrome reflows). Section
  // scroll-margin-top is computed from both vars below in CSS, so anchor
  // jumps stay clear of the nav even after auth resolves.
  // eslint-disable-next-line no-restricted-syntax -- needs DOM measurement of the global header + sticky pill nav
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header");
    const navList = navListRef.current;
    const navWrap = navList?.parentElement; // .cm-detail-nav

    const sync = (): void => {
      const root = document.documentElement;
      if (header) {
        root.style.setProperty(
          "--cm-detail-nav-top",
          `${Math.round(header.getBoundingClientRect().height)}px`,
        );
      }
      if (navWrap) {
        root.style.setProperty(
          "--cm-detail-nav-pill-height",
          `${Math.round(navWrap.getBoundingClientRect().height)}px`,
        );
      }
    };

    sync();
    const ro = new ResizeObserver(sync);
    if (header) ro.observe(header);
    if (navWrap) ro.observe(navWrap);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  const handleNavClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  // Programme filters: single-select hall + single-select day. null = «All».
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const eventTimezone = event.logistics?.timezone || undefined;
  const sortedRooms = useMemo<EventRoom[]>(
    () => [...(event.rooms ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [event.rooms],
  );
  const showRoomFilter = sortedRooms.length >= 2;

  // All days (computed from full schedule; switching hall does not reshuffle days)
  const allDays = useMemo(() => {
    const map = new Map<
      string,
      { dateKey: string; firstStart: string; label: string }
    >();
    (event.schedule ?? []).forEach((item) => {
      const k = dateKeyOf(item.startTime, eventTimezone);
      if (!k) return;
      const cur = map.get(k);
      if (!cur || (item.startTime ?? "") < cur.firstStart) {
        map.set(k, {
          dateKey: k,
          firstStart: item.startTime ?? "",
          label: formatDayLabel(item.startTime, locale, eventTimezone),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    );
  }, [event.schedule, eventTimezone, locale]);
  const showDayFilter = allDays.length >= 2;
  const effectiveDateKey =
    selectedDateKey && allDays.some((d) => d.dateKey === selectedDateKey)
      ? selectedDateKey
      : null;
  const dayIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    allDays.forEach((d, idx) => map.set(d.dateKey, idx));
    return map;
  }, [allDays]);

  const hasActiveFilter =
    selectedRoomId !== null || effectiveDateKey !== null;
  const resetFilters = (): void => {
    setSelectedRoomId(null);
    setSelectedDateKey(null);
  };

  // Group programme by day → by start time, after applying filters.
  const programmeByDay = useMemo(() => {
    const items = (event.schedule ?? []).filter((item) => {
      if (selectedRoomId && item.roomId !== selectedRoomId) return false;
      if (
        effectiveDateKey &&
        dateKeyOf(item.startTime, eventTimezone) !== effectiveDateKey
      )
        return false;
      return true;
    });

    const byDay = new Map<
      string,
      {
        dateKey: string;
        dateLabel: string;
        firstStart: string;
        byTime: Map<string, EventScheduleItem[]>;
      }
    >();
    items.forEach((item) => {
      const k = dateKeyOf(item.startTime, eventTimezone);
      if (!k) return;
      let bucket = byDay.get(k);
      if (!bucket) {
        bucket = {
          dateKey: k,
          dateLabel: formatDayLabel(item.startTime, locale, eventTimezone),
          firstStart: item.startTime ?? "",
          byTime: new Map(),
        };
        byDay.set(k, bucket);
      }
      const time = item.startTime ?? "";
      const list = bucket.byTime.get(time) ?? [];
      list.push(item);
      bucket.byTime.set(time, list);
    });

    return Array.from(byDay.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((d) => ({
        ...d,
        byTime: Array.from(d.byTime.entries()).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      }));
  }, [
    event.schedule,
    selectedRoomId,
    effectiveDateKey,
    eventTimezone,
    locale,
  ]);

  const hasProgramme = programmeByDay.length > 0;

  // Related events
  const relatedQuery = usePublicEventsQuery({
    params: { limit: 4, filter: "upcoming" },
  });
  const related = useMemo(() => {
    if (!relatedQuery.data?.items) return [];
    return relatedQuery.data.items
      .filter((ev) => ev.id !== event.id && ev.slug !== slug)
      .slice(0, 3)
      .map((ev, index) =>
        mapPublicEventToDesignEvent(ev, { locale, index: index + 1 }),
      );
  }, [relatedQuery.data?.items, event.id, slug, locale]);

  const capacityLabel = event.capacity
    ? `${(event.registrationsCount ?? 0).toLocaleString()} / ${event.capacity.toLocaleString()}`
    : null;

  // Registration deadline — the backend uses this field to gate registration
  // (returns `DEADLINE_PASSED` reason from /can-register) and JSON-LD emits
  // it as Offer.validThrough, but until now the UI surfaced nothing. Users
  // only learnt about it after the deadline passed, when the CTA flipped to
  // "Registration closed". Show it preemptively in the sidebar card so they
  // can plan. Hide once passed — the existing `registrationBlocked` state
  // already replaces the CTA with a closed-label, so showing the deadline
  // again would be redundant noise.
  const registrationDeadlineISO = event.logistics?.registrationDeadline;
  const registrationDeadlineDate = registrationDeadlineISO
    ? new Date(registrationDeadlineISO)
    : null;
  const deadlineValid =
    registrationDeadlineDate !== null &&
    !Number.isNaN(registrationDeadlineDate.getTime()) &&
    registrationDeadlineDate.getTime() > Date.now();
  const deadlineSoon =
    deadlineValid &&
    registrationDeadlineDate.getTime() - Date.now() < 72 * 3600 * 1000;
  const deadlineDayLabel = deadlineValid
    ? formatDayLabel(
        registrationDeadlineISO,
        locale,
        event.logistics?.timezone || undefined,
      )
    : "";
  const deadlineTimeLabel = deadlineValid
    ? formatTimeLabel(
        registrationDeadlineISO,
        locale,
        event.logistics?.timezone || undefined,
      )
    : "";

  // Carry the invite code through to registration — invite-only events
  // reject registration without it, so dropping it here breaks the flow.
  const registerHref = withLocalePath(
    `/events/${slug}/register${
      inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : ""
    }`,
    locale
  );
  const loginHref = withLocalePath("/login", locale);

  const handleRegisterClick = (): void => {
    trackEvent("register_click", {
      event_id: event.slug ?? slug,
      event_title: event.title,
    });
  };

  // Free events have no "tickets" to get — register reads more naturally.
  const ctaLabel =
    event.pricing === "free"
      ? { en: "Register", ru: "Зарегистрироваться", uz: "Roʻyxatdan oʻtish" }
      : { en: "Get tickets", ru: "Получить билет", uz: "Chipta olish" };

  // Состояние регистрации (дедлайн / ручное закрытие / лимит мест / уже идёт).
  // Кнопка-CTA должна отражать реальную доступность, а не вести в тупик.
  const { data: canRegisterData } = useCanRegisterQuery(event.id, {
    enabled: Boolean(event.id),
    inviteCode,
  });
  const isPastEvent = event.endDate
    ? new Date(event.endDate).getTime() < Date.now()
    : false;
  const registrationBlocked =
    isPastEvent || (canRegisterData ? canRegisterData.canRegister === false : false);
  const registrationBlockedLabel = (() => {
    if (isPastEvent) {
      return t(lang, {
        en: "Event ended",
        ru: "Событие завершилось",
        uz: "Tadbir tugadi",
      });
    }
    switch (canRegisterData?.reasonCode) {
      case "DEADLINE_PASSED":
        return t(lang, {
          en: "Registration closed",
          ru: "Регистрация закрыта",
          uz: "Roʻyxatga olish yopilgan",
        });
      case "MANUALLY_CLOSED":
        return t(lang, {
          en: "Registration closed",
          ru: "Регистрация закрыта",
          uz: "Roʻyxatga olish yopilgan",
        });
      case "CAPACITY_FULL":
        return t(lang, {
          en: "All seats taken",
          ru: "Мест больше нет",
          uz: "Joylar tugadi",
        });
      case "NOT_PUBLISHED":
        return t(lang, {
          en: "Registration unavailable",
          ru: "Регистрация недоступна",
          uz: "Roʻyxatga olish mavjud emas",
        });
      default:
        return t(lang, {
          en: "Registration closed",
          ru: "Регистрация закрыта",
          uz: "Roʻyxatga olish yopilgan",
        });
    }
  })();

  // Auth state — read from localStorage on the client only to avoid hydration
  // mismatch. Defaults to false on the server.
  const [authed, setAuthed] = useState(false);
  // eslint-disable-next-line no-restricted-syntax -- client-only auth read for sidebar actions
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  // ── Save (favorite) ───────────────────────────────────────────────
  const savedQuery = useCheckSavedEventQuery(event.id, { enabled: authed });
  const toggleSaved = useToggleSavedEventMutation(event.id);
  const isSaved = savedQuery.data?.isSaved ?? false;
  // Local feedback flags drive the inline micro-anim instead of toasts.
  const [savePulse, setSavePulse] = useState<"saved" | "unsaved" | "error" | null>(null);
  const [shareState, setShareState] = useState<"copied" | "error" | null>(null);
  const flashRef = useRef<number | null>(null);
  const flash = useCallback((set: (v: null) => void): void => {
    if (flashRef.current) window.clearTimeout(flashRef.current);
    flashRef.current = window.setTimeout(() => set(null), 1400);
  }, []);

  const handleSave = useCallback((): void => {
    if (!authed) {
      window.location.href = loginHref;
      return;
    }
    const wasSaved = isSaved;
    toggleSaved.mutate(undefined, {
      onSuccess: () => {
        setSavePulse(wasSaved ? "unsaved" : "saved");
        flash(setSavePulse);
      },
      onError: () => {
        setSavePulse("error");
        flash(setSavePulse);
      },
    });
  }, [authed, flash, isSaved, loginHref, toggleSaved]);

  // ── Share ─────────────────────────────────────────────────────────
  const handleShare = useCallback(async (): Promise<void> => {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title: event.title, url: shareUrl };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        flash(setShareState);
        return;
      }
    } catch (err) {
      // User-cancelled native share dialogs throw AbortError — ignore silently.
      if ((err as { name?: string })?.name === "AbortError") return;
      setShareState("error");
      flash(setShareState);
    }
  }, [event.title, flash]);

  // eslint-disable-next-line no-restricted-syntax -- cleanup of local feedback timeout
  useEffect(
    () => () => {
      if (flashRef.current) window.clearTimeout(flashRef.current);
    },
    [],
  );

  return (
    <div className="cm-detail">
      <Container size="wide">
        {/* Hero poster */}
        <div className="cm-detail__hero">
          <EventPoster event={designEvent} fit="contain" priority />
        </div>

        {/* Two-column layout */}
        <div className="cm-detail-grid">
          {/* Main column */}
          <div>
            <Eyebrow style={{ marginBottom: 12 }}>{designEvent.catLabel}</Eyebrow>
            <h1 className="cm-detail__title">{event.title}</h1>
            <div className="cm-detail__meta">
              {[
                {
                  label: t(lang, { en: "Date", ru: "Дата", uz: "Sana" }),
                  value: metaDateValue,
                },
                {
                  label: t(lang, { en: "Time", ru: "Время", uz: "Vaqt" }),
                  value: metaTimeValue,
                },
                {
                  label: t(lang, {
                    en: "Location",
                    ru: "Место",
                    uz: "Joy",
                  }),
                  value:
                    [designEvent.venue, designEvent.city]
                      .filter(Boolean)
                      .join(" · ") || "—",
                },
              ].map((row) => (
                <div key={row.label} className="cm-detail__meta-cell">
                  <div className="cm-detail__meta-label">{row.label}</div>
                  <div className="cm-detail__meta-value">{row.value}</div>
                </div>
              ))}
            </div>

            {/* Sticky in-page nav */}
            <nav className="cm-detail-nav">
              <ul ref={navListRef} className="cm-detail-nav__list">
                {SECTIONS.map((s) => {
                  const active = activeSection === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={handleNavClick(s.id)}
                        data-active={active || undefined}
                        className={`cm-detail-nav__pill${
                          active ? " is-active" : ""
                        }`}
                      >
                        {t(lang, s.label)}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* About */}
            <section id="about" className="cm-detail-section">
              <h2 className="cm-detail-section__title">
                {t(lang, {
                  en: "About this event",
                  ru: "О событии",
                  uz: "Tadbir haqida",
                })}
              </h2>
              {aboutBlocks.length > 0 ? (
                <BlogContentBlocks
                  blocks={aboutBlocks}
                  className="cm-detail-prose"
                />
              ) : (
                <p className="cm-detail-section__lede">
                  {asText(event.description) ||
                    asText(event.overviewDescription) ||
                    asText(event.summary) ||
                    t(lang, {
                      en: "Full event description coming soon.",
                      ru: "Полное описание появится скоро.",
                      uz: "Toʻliq tavsif tez orada.",
                    })}
                </p>
              )}
              {event.highlights && event.highlights.length > 0 ? (
                <div className="cm-detail-highlights">
                  {event.highlights.map((h) => (
                    <span key={h.id} className="cm-detail-highlight">
                      {h.title}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Speakers */}
            <section id="speakers" className="cm-detail-section">
              <h2 className="cm-detail-section__title">
                {t(lang, {
                  en: "Speakers",
                  ru: "Спикеры",
                  uz: "Maʼruzachilar",
                })}
              </h2>
              {event.speakers && event.speakers.length > 0 ? (
                <div className="cm-speakers-grid">
                  {event.speakers.map((sp) => {
                    const initials = `${sp.firstName?.[0] ?? ""}${sp.lastName?.[0] ?? ""}`.toUpperCase();
                    const fullName = [sp.firstName, sp.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .replace(/\s+/g, " ")
                      .trim();
                    return (
                      <div key={sp.id} className="cm-speaker">
                        <SpeakerAvatar
                          avatarUrl={sp.avatarUrl}
                          name={fullName}
                          initials={initials || "?"}
                        />
                        <div>
                          <div className="cm-speaker__name">{fullName}</div>
                          {sp.role || sp.company ? (
                            <div className="cm-speaker__role">
                              {[sp.role, sp.company]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          ) : null}
                          {sp.bio ? (
                            <p className="cm-speaker__bio">{sp.bio}</p>
                          ) : null}
                          {sp.socials && sp.socials.length > 0 ? (
                            <div className="cm-speaker__socials">
                              {sp.socials.map((s) => (
                                <a
                                  key={`${s.platform}-${s.url}`}
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cm-speaker__social"
                                  aria-label={SOCIAL_LABELS[s.platform]}
                                  title={SOCIAL_LABELS[s.platform]}
                                >
                                  <SpeakerSocialIcon platform={s.platform} />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="cm-detail-section__empty">
                  {t(lang, {
                    en: "Speaker line-up to be announced.",
                    ru: "Список спикеров скоро.",
                    uz: "Maʼruzachilar tez orada eʼlon qilinadi.",
                  })}
                </p>
              )}
            </section>

            {/* Programme */}
            <section id="programme" className="cm-detail-section">
              <h2 className="cm-detail-section__title">
                {t(lang, {
                  en: "Programme",
                  ru: "Программа",
                  uz: "Dastur",
                })}
              </h2>
              {(showDayFilter || showRoomFilter) && (
                <div className="cm-programme-filters" role="group" aria-label={t(lang, { en: "Programme filters", ru: "Фильтры программы", uz: "Dastur filtrlari" })}>
                  {showDayFilter && (
                    <div className="cm-programme-filter-row">
                      <span className="cm-programme-filter-row__label">
                        <DesignIcon name="calendar" size={14} />
                        <span>{t(lang, { en: "Day", ru: "День", uz: "Kun" })}</span>
                      </span>
                      <div
                        className="cm-programme-filter-row__chips"
                        role="tablist"
                        aria-label={t(lang, {
                          en: "Filter programme by day",
                          ru: "Фильтр программы по дням",
                          uz: "Dasturni kunlar bo'yicha filtrlash",
                        })}
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={effectiveDateKey === null}
                          onClick={() => setSelectedDateKey(null)}
                          className={`cm-programme-chip${effectiveDateKey === null ? " is-active" : ""}`}
                        >
                          {t(lang, { en: "All days", ru: "Все дни", uz: "Barcha kunlar" })}
                        </button>
                        {allDays.map((day, idx) => {
                          const active = effectiveDateKey === day.dateKey;
                          return (
                            <button
                              key={day.dateKey}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setSelectedDateKey(day.dateKey)}
                              className={`cm-programme-chip cm-programme-chip--day${active ? " is-active" : ""}`}
                            >
                              <span className="cm-programme-chip__index">
                                {t(lang, { en: "Day", ru: "День", uz: "Kun" })} {idx + 1}
                              </span>
                              <span className="cm-programme-chip__sep" aria-hidden>·</span>
                              <span className="cm-programme-chip__date">{day.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {showRoomFilter && (
                    <div className="cm-programme-filter-row">
                      <span className="cm-programme-filter-row__label">
                        <DesignIcon name="pin" size={14} />
                        <span>{t(lang, { en: "Hall", ru: "Зал", uz: "Zal" })}</span>
                      </span>
                      <div
                        className="cm-programme-filter-row__chips"
                        role="tablist"
                        aria-label={t(lang, {
                          en: "Filter programme by hall",
                          ru: "Фильтр программы по залам",
                          uz: "Dasturni zallar bo'yicha filtrlash",
                        })}
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={selectedRoomId === null}
                          onClick={() => setSelectedRoomId(null)}
                          className={`cm-programme-chip${selectedRoomId === null ? " is-active" : ""}`}
                        >
                          {t(lang, { en: "All halls", ru: "Все залы", uz: "Barcha zallar" })}
                        </button>
                        {sortedRooms.map((room) => {
                          const active = selectedRoomId === room.id;
                          return (
                            <button
                              key={room.id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setSelectedRoomId(room.id)}
                              className={`cm-programme-chip${active ? " is-active" : ""}`}
                            >
                              {room.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="cm-programme-filters__reset"
                    >
                      {t(lang, {
                        en: "Reset filters",
                        ru: "Сбросить фильтры",
                        uz: "Filtrlarni tozalash",
                      })}
                    </button>
                  )}
                </div>
              )}

              {hasProgramme ? (
                <div className="cm-programme">
                  {programmeByDay.map((day) => {
                    const dayIdx = dayIndexByKey.get(day.dateKey);
                    return (
                      <div key={day.dateKey} className="cm-programme-day">
                        {showDayFilter && typeof dayIdx === "number" && (
                          <div className="cm-programme-day__head">
                            <span className="cm-programme-day__badge">
                              <DesignIcon name="calendar" size={14} />
                              <span>
                                {t(lang, { en: "Day", ru: "День", uz: "Kun" })} {dayIdx + 1}
                                <span className="cm-programme-day__sep"> — </span>
                                {day.dateLabel}
                              </span>
                            </span>
                            <span className="cm-programme-day__rule" />
                          </div>
                        )}
                        <div className="cm-programme-day__body">
                          {day.byTime.map(([time, items]) => (
                            <div key={time} className="cm-programme-row">
                              <div className="cm-programme-row__time">
                                {formatTimeLabel(time, locale, eventTimezone)}
                              </div>
                              <div
                                className={`cm-programme-row__items${
                                  items.length > 1
                                    ? " cm-programme-row__items--multi"
                                    : ""
                                }`}
                              >
                                {items.map((item) => (
                                  <div key={item.id} className="cm-programme-card">
                                    <div className="cm-programme-card__title">
                                      {item.title}
                                    </div>
                                    {item.location ? (
                                      <div className="cm-programme-card__loc">
                                        {item.location}
                                      </div>
                                    ) : null}
                                    {item.description ? (
                                      <p className="cm-programme-card__desc">
                                        {item.description}
                                      </p>
                                    ) : null}
                                    {item.speakers && item.speakers.length > 0 ? (
                                      <ScheduleSpeakerStack
                                        speakers={item.speakers}
                                      />
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="cm-detail-section__empty">
                  {hasActiveFilter
                    ? t(lang, {
                        en: "No programme items match the selected filters.",
                        ru: "По выбранным фильтрам ничего не найдено.",
                        uz: "Tanlangan filtrlar bo'yicha hech narsa topilmadi.",
                      })
                    : t(lang, {
                    en: "Detailed programme to be published soon.",
                    ru: "Подробная программа скоро.",
                    uz: "Batafsil dastur tez orada eʼlon qilinadi.",
                  })}
                </p>
              )}
            </section>

            {/* Venue */}
            <section id="venue" className="cm-detail-section">
              <h2 className="cm-detail-section__title">
                {t(lang, {
                  en: event.format === "online" ? "How to join" : "Venue",
                  ru: event.format === "online" ? "Как присоединиться" : "Место",
                  uz:
                    event.format === "online"
                      ? "Qoʻshilish tartibi"
                      : "Joy",
                })}
              </h2>
              <div className="cm-venue-grid">
                {event.format === "online" ? (
                  <div>
                    <div className="cm-venue__name">
                      {t(lang, {
                        en: "Online event",
                        ru: "Онлайн-мероприятие",
                        uz: "Onlayn tadbir",
                      })}
                    </div>
                    <p className="cm-venue__addr">
                      {event.logistics?.onlineUrl
                        ? t(lang, {
                            en: "Join from anywhere — the broadcast link is on the right.",
                            ru: "Подключайтесь откуда угодно — ссылка на трансляцию справа.",
                            uz: "Istalgan joydan qoʻshiling — translyatsiya havolasi oʻngda.",
                          })
                        : t(lang, {
                            en: "The broadcast link will be sent to registered attendees by email shortly before the event starts.",
                            ru: "Ссылка на трансляцию придёт зарегистрированным участникам на почту незадолго до начала.",
                            uz: "Translyatsiya havolasi roʻyxatdan oʻtgan ishtirokchilarga tadbir boshlanishidan oldin elektron pochta orqali yuboriladi.",
                          })}
                    </p>
                    {event.logistics?.accessNotes ? (
                      <p className="cm-venue__notes">
                        {event.logistics.accessNotes}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <div className="cm-venue__name">
                      {event.logistics?.venue ||
                        event.location ||
                        t(lang, {
                          en: "Venue TBD",
                          ru: "Место уточняется",
                          uz: "Joy aniqlanmoqda",
                        })}
                    </div>
                    <div className="cm-venue__addr">
                      {event.logistics?.address ||
                        event.logistics?.city ||
                        designEvent.city}
                    </div>
                    {event.logistics?.accessNotes ? (
                      <p className="cm-venue__notes">
                        {event.logistics.accessNotes}
                      </p>
                    ) : null}
                  </div>
                )}
                {event.format === "online" ? (() => {
                  const onlineUrl = event.logistics?.onlineUrl?.trim();
                  const platform = onlineUrl
                    ? detectOnlinePlatform(onlineUrl)
                    : null;
                  const screenInner = (
                    <span className="cm-venue__online-screen" aria-hidden>
                      <span className="cm-venue__online-bezel">
                        <span className="cm-venue__online-glow" />
                        <span className="cm-venue__online-bars">
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                        </span>
                        <span className="cm-venue__online-dot" />
                      </span>
                      <span className="cm-venue__online-stand" />
                    </span>
                  );
                  if (onlineUrl && platform) {
                    return (
                      <a
                        href={onlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-tone={platform.tone}
                        className="cm-venue__map cm-venue__map--online cm-venue__map--online-live"
                        aria-label={t(lang, {
                          en: `Join the online event on ${platform.label}`,
                          ru: `Присоединиться к онлайн-трансляции на ${platform.label}`,
                          uz: `${platform.label} orqali onlayn tadbirga qoʻshilish`,
                        })}
                      >
                        {screenInner}
                        <span className="cm-venue__online-cta">
                          <span className="cm-venue__online-cta-eyebrow">
                            {t(lang, {
                              en: "Join via",
                              ru: "Подключиться через",
                              uz: "Quyidagi orqali qoʻshilish",
                            })}
                          </span>
                          <span className="cm-venue__online-cta-host">
                            {platform.label}
                            <span aria-hidden> ↗</span>
                          </span>
                        </span>
                      </a>
                    );
                  }
                  return (
                    <div
                      className="cm-venue__map cm-venue__map--online"
                      data-tone="ember"
                      role="img"
                      aria-label={t(lang, {
                        en: "Online event — broadcast link will be shared with attendees",
                        ru: "Онлайн-мероприятие — ссылку получат зарегистрированные участники",
                        uz: "Onlayn tadbir — havola roʻyxatdan oʻtgan ishtirokchilarga yuboriladi",
                      })}
                    >
                      {screenInner}
                      <span className="cm-venue__online-eyebrow">
                        {t(lang, {
                          en: "Live online",
                          ru: "Онлайн",
                          uz: "Onlayn",
                        })}
                      </span>
                    </div>
                  );
                })() : (() => {
                  const lat = event.logistics?.latitude?.trim();
                  const lon = event.logistics?.longitude?.trim();
                  const hasCoords = Boolean(lat) && Boolean(lon);
                  // Build a free-text address fallback so we can still
                  // render a real map when the organizer hasn't pinned
                  // exact coordinates yet. We require at least a venue
                  // or street address — city alone is too generic to
                  // produce a useful map and falls through to the TBD
                  // empty-state instead.
                  const venuePart = event.logistics?.venue?.trim();
                  const addressPart = event.logistics?.address?.trim();
                  const cityPart =
                    event.logistics?.city?.trim() ?? designEvent.city?.trim();
                  const hasSpecificLocation = Boolean(
                    venuePart || addressPart,
                  );
                  const addressParts = [venuePart, addressPart, cityPart]
                    .filter(
                      (part): part is string => Boolean(part) && part !== "—",
                    );
                  const uniqueAddressParts = Array.from(
                    new Set(addressParts),
                  );
                  const addressQuery = uniqueAddressParts.join(", ");
                  if (!hasCoords && !hasSpecificLocation) {
                    return (
                      <div
                        className="cm-venue__map cm-venue__map--tbd"
                        role="img"
                        aria-label={t(lang, {
                          en: "Venue location to be announced",
                          ru: "Место будет объявлено позже",
                          uz: "Joy keyinroq eʼlon qilinadi",
                        })}
                      >
                        <span className="cm-venue__map-grid" aria-hidden />
                        <span className="cm-venue__map-radar" aria-hidden>
                          <span className="cm-venue__map-ring cm-venue__map-ring--1" />
                          <span className="cm-venue__map-ring cm-venue__map-ring--2" />
                          <span className="cm-venue__map-ring cm-venue__map-ring--3" />
                        </span>
                        <DesignIcon
                          name="pin"
                          size={32}
                          stroke={1.8}
                          className="cm-venue__map-pin"
                        />
                        <span className="cm-venue__map-eyebrow">
                          {t(lang, {
                            en: "Location TBD",
                            ru: "Место уточняется",
                            uz: "Joy aniqlanmoqda",
                          })}
                        </span>
                      </div>
                    );
                  }
                  // Coords win: open map.yandex.ru with a deep-link
                  // pointing at the exact pin. Otherwise fall back to a
                  // text search; Yandex's free `map-widget/v1` iframe
                  // requires no API key for either mode, so the embed
                  // works on a fresh deploy.
                  const widgetSrc = hasCoords
                    ? `https://yandex.ru/map-widget/v1/?ll=${encodeURIComponent(
                        lon as string,
                      )},${encodeURIComponent(
                        lat as string,
                      )}&pt=${encodeURIComponent(
                        lon as string,
                      )},${encodeURIComponent(
                        lat as string,
                      )},pm2rdm&z=16&l=map`
                    : `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(
                        addressQuery,
                      )}&z=15&l=map`;
                  const externalHref = hasCoords
                    ? `https://yandex.ru/maps/?pt=${encodeURIComponent(
                        lon as string,
                      )},${encodeURIComponent(lat as string)}&z=16&l=map`
                    : `https://yandex.ru/maps/?text=${encodeURIComponent(
                        addressQuery,
                      )}&z=15&l=map`;
                  return (
                    <div className="cm-venue__map cm-venue__map--live">
                      <iframe
                        src={widgetSrc}
                        className="cm-venue__map-canvas"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={t(lang, {
                          en: "Venue location on Yandex Maps",
                          ru: "Расположение места на Яндекс.Картах",
                          uz: "Joyning Yandex.Xaritalardagi manzili",
                        })}
                        allowFullScreen
                      />
                      <a
                        href={externalHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cm-venue__map-open"
                      >
                        {t(lang, {
                          en: "Open in Yandex Maps",
                          ru: "Открыть в Яндекс.Картах",
                          uz: "Yandex.Xaritalarda ochish",
                        })}
                        <span aria-hidden>↗</span>
                      </a>
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Materials */}
            <section id="materials" className="cm-detail-section">
              <h2 className="cm-detail-section__title">
                {t(lang, {
                  en: "Materials",
                  ru: "Материалы",
                  uz: "Materiallar",
                })}
              </h2>
              {event.resources && event.resources.length > 0 ? (
                <ul className="cm-materials">
                  {event.resources.map((r) => {
                    const tooltip = r.isExternal
                      ? t(lang, {
                          en: "Open in a new tab",
                          ru: "Открыть в новой вкладке",
                          uz: "Yangi yorliqda ochish",
                        })
                      : t(lang, {
                          en: "Download file",
                          ru: "Скачать файл",
                          uz: "Faylni yuklab olish",
                        });
                    return (
                      <li key={r.id}>
                        <a
                          href={r.href}
                          {...(r.isExternal
                            ? {
                                target: "_blank",
                                rel: "noreferrer noopener",
                              }
                            : { download: "" })}
                          className="cm-material"
                          title={tooltip}
                          aria-label={`${r.label} — ${tooltip}`}
                        >
                          {r.isExternal ? (
                            <ExternalLinkIcon
                              size={18}
                              strokeWidth={1.8}
                              style={{ color: "var(--ember-500)" }}
                              aria-hidden
                            />
                          ) : (
                            <DesignIcon
                              name="download"
                              size={18}
                              stroke={1.8}
                              style={{ color: "var(--ember-500)" }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="cm-material__label">{r.label}</div>
                            {r.description ? (
                              <div className="cm-material__desc">
                                {r.description}
                              </div>
                            ) : null}
                          </div>
                          <DesignIcon
                            name="arrow"
                            size={14}
                            stroke={2}
                            style={{ color: "var(--fg-3)" }}
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="cm-detail-section__empty">
                  {t(lang, {
                    en: "Materials will appear here after registration.",
                    ru: "Материалы появятся после регистрации.",
                    uz: "Materiallar roʻyxatdan oʻtgach koʻrinadi.",
                  })}
                </p>
              )}
            </section>

            {/* Comments */}
            <section
              id="comments"
              className="cm-detail-section cm-comments-scope"
            >
              <h2 className="cm-detail-section__title">
                {t(lang, {
                  en: "Comments",
                  ru: "Комментарии",
                  uz: "Izohlar",
                })}
              </h2>
              {event.commentsEnabled === false ? (
                <p className="cm-comments-empty">
                  {t(lang, {
                    en: "Comments are disabled for this event.",
                    ru: "Комментарии для этого мероприятия отключены.",
                    uz: "Bu tadbir uchun izohlar oʻchirilgan.",
                  })}
                </p>
              ) : (
                <CommentsSection
                  resource="event"
                  entityId={event.id}
                  hideHeader
                  className="bg-transparent border-0 shadow-none rounded-none p-0 sm:p-0 space-y-5"
                />
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="cm-detail-sidebar">
            <div className="cm-detail-card" ref={ctaCardRef}>
              <div className="cm-detail-card__price">{designEvent.price}</div>

              {capacityLabel ? (
                <>
                  <div className="cm-detail-card__capacity-track">
                    <div
                      className="cm-detail-card__capacity-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          ((event.registrationsCount ?? 0) /
                            (event.capacity || 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="cm-detail-card__capacity-label">
                    {capacityLabel}{" "}
                    {t(lang, {
                      en: "registered",
                      ru: "зарегистрировано",
                      uz: "roʻyxatdan oʻtgan",
                    })}
                  </div>
                </>
              ) : null}

              {deadlineValid ? (
                <div
                  className={`cm-detail-card__deadline${deadlineSoon ? " is-soon" : ""}`}
                >
                  <div className="cm-detail-card__deadline-label">
                    {t(lang, {
                      en: "Registration closes",
                      ru: "Регистрация до",
                      uz: "Roʻyxatga olish tugaydi",
                    })}
                  </div>
                  <div className="cm-detail-card__deadline-value">
                    {deadlineDayLabel}
                    <span className="cm-detail-card__deadline-sep">·</span>
                    {deadlineTimeLabel}
                  </div>
                </div>
              ) : null}

              {registrationBlocked ? (
                <div
                  className="cm-detail-card__cta"
                  aria-disabled="true"
                  style={{
                    cursor: "not-allowed",
                    opacity: 0.6,
                    pointerEvents: "none",
                    textAlign: "center",
                  }}
                >
                  {registrationBlockedLabel}
                </div>
              ) : (
                <a
                  href={registerHref}
                  className="cm-detail-card__cta"
                  onClick={handleRegisterClick}
                >
                  {t(lang, ctaLabel)}
                </a>
              )}

              <div className="cm-detail-card__actions">
                <button
                  type="button"
                  className={`cm-detail-card__action${
                    isSaved ? " is-active" : ""
                  }${savePulse ? ` is-pulse-${savePulse}` : ""}`}
                  onClick={handleSave}
                  aria-pressed={isSaved}
                  aria-live="polite"
                  disabled={toggleSaved.isPending}
                >
                  <span
                    className="cm-detail-card__action-icon"
                    aria-hidden="true"
                  >
                    {savePulse === "saved" || savePulse === "unsaved" ? (
                      <DesignIcon name="check" size={14} stroke={2.4} />
                    ) : isSaved ? (
                      <DesignIcon name="heart" size={14} stroke={2} />
                    ) : null}
                  </span>
                  <span className="cm-detail-card__action-label">
                    {savePulse === "error"
                      ? t(lang, {
                          en: "Try again",
                          ru: "Ещё раз",
                          uz: "Qayta",
                        })
                      : isSaved
                        ? t(lang, {
                            en: "Saved",
                            ru: "Сохранено",
                            uz: "Saqlangan",
                          })
                        : t(lang, {
                            en: "Save",
                            ru: "Сохранить",
                            uz: "Saqlash",
                          })}
                  </span>
                </button>
                <button
                  type="button"
                  className={`cm-detail-card__action${
                    shareState ? ` is-pulse-${shareState}` : ""
                  }`}
                  onClick={() => {
                    void handleShare();
                  }}
                  aria-live="polite"
                >
                  <span
                    className="cm-detail-card__action-icon"
                    aria-hidden="true"
                  >
                    {shareState === "copied" ? (
                      <DesignIcon name="check" size={14} stroke={2.4} />
                    ) : null}
                  </span>
                  <span className="cm-detail-card__action-label">
                    {shareState === "copied"
                      ? t(lang, {
                          en: "Copied",
                          ru: "Скопировано",
                          uz: "Nusxalandi",
                        })
                      : shareState === "error"
                        ? t(lang, {
                            en: "Try again",
                            ru: "Ещё раз",
                            uz: "Qayta",
                          })
                        : t(lang, {
                            en: "Share",
                            ru: "Поделиться",
                            uz: "Ulashish",
                          })}
                  </span>
                </button>
              </div>

              {(() => {
                const orgId =
                  event.organization?.id ?? event.organizationId ?? "";
                const orgName = event.organization?.name ?? designEvent.org;
                const orgLogo = designEvent.orgLogo;
                const inner = (
                  <>
                    <HostAvatar name={orgName} logoUrl={orgLogo} />
                    <div>
                      <div className="cm-detail-card__host-label">
                        {t(lang, {
                          en: "Hosted by",
                          ru: "Организатор",
                          uz: "Tashkilotchi",
                        })}
                      </div>
                      <div className="cm-detail-card__host-name">
                        {orgName}
                      </div>
                      <div className="cm-detail-card__host-cta">
                        {t(lang, {
                          en: "View profile",
                          ru: "Открыть профиль",
                          uz: "Profilni ochish",
                        })}
                        <span aria-hidden style={{ marginLeft: 4 }}>→</span>
                      </div>
                    </div>
                  </>
                );
                return orgId ? (
                  <a
                    href={withLocalePath(`/organizers/${orgId}`, locale)}
                    className="cm-detail-card__host cm-detail-card__host--link"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="cm-detail-card__host">{inner}</div>
                );
              })()}
            </div>
          </aside>
        </div>
      </Container>

      {/* Related events — full-bleed band */}
      {related.length > 0 ? (
        <section className="cm-related">
          <Container size="wide">
            <h2 className="cm-related__title">
              {t(lang, {
                en: "You might also ",
                ru: "Вам также может ",
                uz: "Sizga yana ",
              })}
              <ItalicAccent>
                {t(lang, {
                  en: "like",
                  ru: "понравиться",
                  uz: "yoqishi mumkin",
                })}
              </ItalicAccent>
            </h2>
            <div className="cm-related-grid">
              {related.map((ev) => (
                <CalmEventCard
                  key={ev.id}
                  event={ev}
                  href={withLocalePath(
                    `/events/${ev.slug ?? ev.id}`,
                    locale,
                  )}
                />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <style>{`
        /* ── Page shell ─────────────────────────────────────────── */
        .cm-detail {
          background: var(--bg-1);
          color: var(--fg-1);
          padding-block: clamp(20px, 3vw, 32px) clamp(48px, 7vw, 80px);
        }
        /* When the related band closes the page, drop the page-bottom
           padding — the band already provides breathing room and a bg-3
           floor that should butt up against the Footer. */
        .cm-detail:has(> .cm-related) {
          padding-bottom: 0;
        }

        /* ── Hero poster ──────────────────────────────────────────
           No fixed aspect-ratio: the EventPoster (fit="contain")
           sets its own ratio from the cover image's intrinsic
           dimensions, clamped to a sensible range, so portraits and
           wide banners both render edge-to-edge without letterbox
           bars on phones, tablets, or desktop. */
        .cm-detail__hero {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: clamp(24px, 4vw, 32px);
          border: 1px solid var(--border-1);
        }

        /* ── Title + meta row ───────────────────────────────────── */
        .cm-detail__title {
          font: 800 clamp(32px, 5.5vw, 56px) / 1.05 var(--font-sans);
          letter-spacing: -0.035em;
          margin: 0;
          color: var(--ink-400);
          text-wrap: balance;
        }
        .cm-detail__meta {
          display: grid;
          grid-template-columns: auto auto 1fr;
          gap: clamp(16px, 2.5vw, 32px);
          margin-top: clamp(18px, 2.5vw, 24px);
          padding-top: clamp(18px, 2.5vw, 24px);
          border-top: 1px solid var(--border-1);
        }
        .cm-detail__meta-cell { min-width: 0; }
        @media (max-width: 540px) {
          .cm-detail__meta { grid-template-columns: repeat(2, 1fr); }
          .cm-detail__meta-cell:nth-child(3) { grid-column: 1 / -1; }
        }
        .cm-detail__meta-label {
          font: 500 10px/1 var(--font-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--fg-3);
          margin-bottom: 6px;
        }
        .cm-detail__meta-value {
          font: 600 clamp(14px, 1.4vw, 16px) / 1.3 var(--font-sans);
          color: var(--fg-1);
          word-wrap: break-word;
        }

        /* ── In-page nav ────────────────────────────────────────── */
        /* Two subtleties (same fix as organizer-public-page sub-nav):
           1. calc(... - 1px) parks the nav 1px below header bottom instead
              of right at the edge. Sub-pixel header heights (e.g. 73.5px on
              retina) used to round to a value that overshot by 0.5px and
              rendered as a 1px hairline gap. The nav has an opaque
              --bg-1 background, so a 1px overlap is invisible — it just
              paints over the header bottom border.
           2. List padding-block is 16px (was 10px). overflow-x: auto
              implicitly clips vertically, so the global focus-visible
              outline (2px solid + 2px offset = 4px beyond pill border) was
              being chopped off the top/bottom of the focused pill.
              16px gives the outline room to render unclipped. */
        .cm-detail-nav {
          position: sticky;
          top: calc(var(--cm-detail-nav-top, 69px) - 1px);
          z-index: 5;
          background: var(--bg-1);
          border-bottom: 1px solid var(--border-1);
          margin: clamp(20px, 3vw, 28px) -8px clamp(8px, 1.5vw, 16px);
          padding: 0 8px;
        }
        .cm-detail-nav__list {
          display: flex;
          gap: 6px;
          list-style: none;
          margin: 0;
          padding: 16px 0;
          overflow-x: auto;
          scroll-behavior: smooth;
          scroll-padding-inline: 24px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          /* Fade indicator on right edge — hints at horizontal scroll on mobile */
          -webkit-mask-image: linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%);
                  mask-image: linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%);
        }
        @media (min-width: 720px) {
          .cm-detail-nav__list {
            -webkit-mask-image: none;
                    mask-image: none;
          }
        }
        .cm-detail-nav__list::-webkit-scrollbar { display: none; }
        .cm-detail-nav__pill {
          display: inline-block;
          padding: 8px 14px;
          border-radius: 999px;
          font: 600 13px/1 var(--font-sans);
          color: var(--fg-2);
          background: transparent;
          border: 1px solid var(--border-1);
          text-decoration: none;
          white-space: nowrap;
          scroll-snap-align: start;
          transition: all .15s var(--ease-standard);
        }
        .cm-detail-nav__pill:hover {
          color: var(--ink-400);
          border-color: var(--border-2);
        }
        .cm-detail-nav__pill.is-active {
          color: var(--bone-100);
          background: var(--ink-400);
          border-color: var(--ink-400);
        }

        /* ── Sections ───────────────────────────────────────────── */
        .cm-detail-section {
          /* Anchor jumps stop just below the live header + sticky pill nav.
             Both vars are measured in JS, so this stays correct after the
             header reflows on auth or breakpoint change. */
          scroll-margin-top: calc(
            var(--cm-detail-nav-top, 69px)
            + var(--cm-detail-nav-pill-height, 60px)
            + 16px
          );
          padding: clamp(24px, 4vw, 32px) 0;
        }
        .cm-detail-section__title {
          font: 700 clamp(22px, 3vw, 26px) / 1.1 var(--font-sans);
          letter-spacing: -0.02em;
          margin: 0 0 clamp(16px, 2.5vw, 24px);
          color: var(--ink-400);
        }
        .cm-detail-section__lede {
          font: 400 clamp(15px, 1.6vw, 16px) / 1.65 var(--font-sans);
          color: var(--fg-2);
          text-wrap: pretty;
          margin: 0;
        }
        .cm-detail-section__empty {
          font: 400 14px/1.5 var(--font-sans);
          color: var(--fg-3);
          margin: 0;
        }
        /* Rich-text description — tuned to the editorial system:
           Manrope body at 1.65, graphite ink, ember links, tight headings. */
        .cm-detail-prose {
          max-width: none;
          font: 400 clamp(15px, 1.6vw, 16px) / 1.65 var(--font-sans);
          color: var(--fg-2);
          text-wrap: pretty;
        }
        .cm-detail-prose > * {
          margin-top: var(--space-4, 16px);
        }
        .cm-detail-prose > *:first-child {
          margin-top: 0;
        }
        .cm-detail-prose h1,
        .cm-detail-prose h2,
        .cm-detail-prose h3,
        .cm-detail-prose h4,
        .cm-detail-prose h5,
        .cm-detail-prose h6 {
          margin-top: var(--space-8, 32px);
          color: var(--ink-400);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.2;
          text-wrap: balance;
        }
        .cm-detail-prose h1 {
          font-size: clamp(22px, 3vw, 26px);
        }
        .cm-detail-prose h2 {
          font-size: clamp(20px, 2.6vw, 23px);
        }
        .cm-detail-prose h3 {
          font-size: clamp(18px, 2.2vw, 20px);
        }
        .cm-detail-prose h4,
        .cm-detail-prose h5,
        .cm-detail-prose h6 {
          font-size: 17px;
        }
        .cm-detail-prose p {
          color: var(--fg-2);
          line-height: 1.65;
        }
        .cm-detail-prose strong {
          color: var(--ink-400);
          font-weight: 600;
        }
        .cm-detail-prose em {
          font-style: italic;
        }
        .cm-detail-prose a {
          color: var(--ember-500);
          text-decoration: underline;
          text-underline-offset: 4px;
          text-decoration-thickness: 1px;
          transition: color var(--dur-base, 200ms)
            var(--ease-standard, ease);
        }
        .cm-detail-prose a:hover {
          color: var(--ember-600);
          text-underline-offset: 2px;
        }
        .cm-detail-prose ul,
        .cm-detail-prose ol {
          padding-left: 24px;
          color: var(--fg-2);
        }
        .cm-detail-prose ul {
          list-style: disc;
        }
        .cm-detail-prose ol {
          list-style: decimal;
        }
        .cm-detail-prose li {
          margin-top: 6px;
          line-height: 1.65;
        }
        .cm-detail-prose code {
          font: 500 0.9em / 1.4 var(--font-mono);
          background: var(--bg-3);
          padding: 2px 6px;
          border-radius: var(--radius-sm, 4px);
        }
        .cm-detail-prose img {
          border-radius: var(--radius-xl, 12px);
          border: 1px solid var(--border-1);
        }
        .cm-detail-highlights {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 20px;
        }
        .cm-detail-highlight {
          padding: 8px 14px;
          border-radius: 999px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          font: 500 13px/1 var(--font-sans);
          color: var(--fg-2);
        }

        /* ── Two-column layout ──────────────────────────────────── */
        .cm-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 380px;
          gap: 48px;
          align-items: start;
        }
        .cm-detail-grid > * { min-width: 0; }
        @media (max-width: 1080px) {
          .cm-detail-grid { grid-template-columns: minmax(0, 1fr) 320px; gap: 32px; }
        }
        @media (max-width: 920px) {
          .cm-detail-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
          }
        }

        /* ── Sidebar sticky card ────────────────────────────────── */
        .cm-detail-sidebar { min-width: 0; }
        .cm-detail-card {
          position: sticky;
          top: 80px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-lg);
          padding: clamp(20px, 2.5vw, 24px);
        }
        @media (max-width: 920px) {
          .cm-detail-card {
            position: static;
            margin-top: 24px;
          }
        }
        .cm-detail-card__price {
          font: 800 clamp(26px, 3.5vw, 32px) / 1 var(--font-sans);
          letter-spacing: -0.02em;
          color: var(--ink-400);
          margin-bottom: 4px;
        }
        .cm-detail-card__price-meta {
          font: 500 11px/1.4 var(--font-mono);
          color: var(--fg-3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 20px;
        }
        .cm-detail-card__capacity-track {
          height: 4px;
          background: var(--bone-300);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .cm-detail-card__capacity-fill {
          height: 100%;
          background: var(--ember-400);
        }
        .cm-detail-card__capacity-label {
          font: 500 11px/1 var(--font-mono);
          color: var(--fg-3);
          margin-bottom: 20px;
        }
        /* Registration deadline. Calm by default — the urgency flag
           .is-soon only switches on when under 72h are left, at which
           point the value flips to ember. We avoid a permanent ember
           tint because most events are weeks out and a constant flame
           would erode the cue value. */
        .cm-detail-card__deadline {
          margin-bottom: 20px;
          padding: 12px 14px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: 10px;
        }
        .cm-detail-card__deadline.is-soon {
          background: var(--ember-50);
          border-color: var(--ember-200);
        }
        .cm-detail-card__deadline-label {
          font: 500 10px/1 var(--font-mono);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--fg-3);
          margin-bottom: 6px;
        }
        .cm-detail-card__deadline.is-soon .cm-detail-card__deadline-label {
          color: var(--ember-600);
        }
        .cm-detail-card__deadline-value {
          font: 600 14px/1.3 var(--font-sans);
          color: var(--fg-1);
        }
        .cm-detail-card__deadline.is-soon .cm-detail-card__deadline-value {
          color: var(--ember-600);
        }
        .cm-detail-card__deadline-sep {
          color: var(--fg-3);
          margin: 0 6px;
        }
        .cm-detail-card__cta {
          display: block;
          width: 100%;
          text-align: center;
          padding: 14px 20px;
          background: var(--ember-400);
          color: var(--bone-50);
          border-radius: 8px;
          font: 700 15px/1 var(--font-sans);
          text-decoration: none;
          box-shadow: var(--shadow-glow-warm);
          transition: background .15s var(--ease-standard),
                      transform .15s var(--ease-standard);
        }
        .cm-detail-card__cta:hover { background: var(--ember-500); }
        .cm-detail-card__cta:active { transform: scale(.98); }
        .cm-detail-card__actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }
        .cm-detail-card__action {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 14px;
          border: 1px solid var(--border-2);
          background: transparent;
          border-radius: 6px;
          font: 600 13px/1 var(--font-sans);
          color: var(--fg-1);
          cursor: pointer;
          overflow: hidden;
          transition: background var(--dur-base) var(--ease-standard),
                      border-color var(--dur-base) var(--ease-standard),
                      color var(--dur-base) var(--ease-standard),
                      transform 80ms var(--ease-standard),
                      box-shadow var(--dur-base) var(--ease-standard);
        }
        .cm-detail-card__action:hover { background: var(--bg-3); }
        .cm-detail-card__action:active:not(:disabled) {
          transform: scale(0.97);
        }
        .cm-detail-card__action:disabled {
          opacity: 0.6;
          cursor: progress;
        }
        .cm-detail-card__action.is-active {
          background: var(--bg-2);
          border-color: var(--ember-400);
          color: var(--ember-500);
        }
        .cm-detail-card__action.is-active:hover {
          background: var(--ember-50);
        }
        /* Inline icon — slides in with the label so press → state morph
           reads as tactile rather than a popup toast. */
        .cm-detail-card__action-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 0;
          opacity: 0;
          transform: scale(0.6);
          overflow: hidden;
          transition: width var(--dur-base) var(--ease-out),
                      opacity var(--dur-base) var(--ease-out),
                      transform var(--dur-base) var(--ease-out);
        }
        .cm-detail-card__action.is-active .cm-detail-card__action-icon,
        .cm-detail-card__action.is-pulse-saved .cm-detail-card__action-icon,
        .cm-detail-card__action.is-pulse-unsaved .cm-detail-card__action-icon,
        .cm-detail-card__action.is-pulse-copied .cm-detail-card__action-icon {
          width: 16px;
          opacity: 1;
          transform: scale(1);
        }
        .cm-detail-card__action-label {
          transition: color var(--dur-base) var(--ease-standard);
        }
        /* Pulse — soft flash that recedes via timeout in JS. The keyframe
           pings the border and bg so the press feels confirmed in place. */
        @keyframes cm-action-pulse-success {
          0%   { box-shadow: 0 0 0 0 rgba(31, 122, 63, 0.0); }
          30%  { box-shadow: 0 0 0 6px rgba(31, 122, 63, 0.16); }
          100% { box-shadow: 0 0 0 0 rgba(31, 122, 63, 0.0); }
        }
        @keyframes cm-action-pulse-ember {
          0%   { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.0); }
          30%  { box-shadow: 0 0 0 6px rgba(234, 88, 12, 0.18); }
          100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.0); }
        }
        @keyframes cm-action-pulse-error {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-3px); }
          75%      { transform: translateX(3px); }
        }
        .cm-detail-card__action.is-pulse-saved {
          background: var(--success-soft);
          border-color: var(--success);
          color: var(--success);
          animation: cm-action-pulse-success 700ms var(--ease-out);
        }
        .cm-detail-card__action.is-pulse-unsaved {
          color: var(--ink-200);
          animation: cm-action-pulse-ember 700ms var(--ease-out);
        }
        .cm-detail-card__action.is-pulse-copied {
          background: var(--success-soft);
          border-color: var(--success);
          color: var(--success);
          animation: cm-action-pulse-success 700ms var(--ease-out);
        }
        .cm-detail-card__action.is-pulse-error {
          border-color: var(--danger);
          color: var(--danger);
          animation: cm-action-pulse-error 320ms var(--ease-standard);
        }
        @media (prefers-reduced-motion: reduce) {
          .cm-detail-card__action,
          .cm-detail-card__action-icon,
          .cm-detail-card__action-label {
            transition: none;
            animation: none !important;
          }
          .cm-detail-card__action:active:not(:disabled) { transform: none; }
        }
        .cm-detail-card__host {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-1);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cm-detail-card__host-avatar {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: var(--ink-400);
          color: var(--bone-50);
          display: flex;
          align-items: center;
          justify-content: center;
          font: 700 13px/1 var(--font-sans);
          flex-shrink: 0;
        }
        .cm-detail-card__host-label {
          font: 500 10px/1 var(--font-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--fg-3);
          margin-bottom: 4px;
        }
        .cm-detail-card__host-name {
          font: 600 14px/1.3 var(--font-sans);
          color: var(--fg-1);
          word-break: break-word;
        }
        .cm-detail-card__host-cta {
          font: 600 11px/1 var(--font-mono);
          letter-spacing: 0.04em;
          color: var(--ember-500);
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          text-transform: uppercase;
        }
        .cm-detail-card__host--link {
          color: inherit;
          text-decoration: none;
          border-radius: 8px;
          margin-left: -8px;
          margin-right: -8px;
          padding-left: 8px;
          padding-right: 8px;
          padding-bottom: 8px;
          transition: background 200ms;
        }
        .cm-detail-card__host--link:hover {
          background: var(--bg-3);
        }
        .cm-detail-card__host--link:hover .cm-detail-card__host-cta {
          color: var(--ember-600);
        }

        /* ── Speakers ───────────────────────────────────────────── */
        .cm-speakers-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .cm-speaker {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 16px;
          padding: 16px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: 8px;
          min-width: 0;
        }
        .cm-speaker__avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--ember-300);
          color: var(--bone-100);
          display: flex;
          align-items: center;
          justify-content: center;
          font: 700 18px/1 var(--font-sans);
          flex-shrink: 0;
        }
        .cm-speaker__name {
          font: 700 16px/1.2 var(--font-sans);
          color: var(--ink-400);
        }
        .cm-speaker__role {
          font: 500 12px/1.4 var(--font-mono);
          color: var(--ember-500);
          margin: 4px 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .cm-speaker__bio {
          font: 400 14px/1.5 var(--font-sans);
          color: var(--fg-2);
          margin: 0;
        }
        .cm-speaker__socials {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .cm-speaker__social {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid var(--border-1);
          color: var(--fg-2);
          background: var(--bg-1);
          transition:
            color 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }
        .cm-speaker__social:hover {
          color: var(--ember-500);
          border-color: var(--ember-300);
          background: var(--bg-2);
        }
        @media (max-width: 720px) {
          .cm-speakers-grid { grid-template-columns: 1fr; }
        }

        /* ── Programme: filters ─────────────────────────────────── */
        .cm-programme-filters {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: clamp(20px, 3vw, 24px);
        }
        .cm-programme-filter-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .cm-programme-filter-row__label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          font: 600 10px/1 var(--font-mono);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--fg-3);
        }
        .cm-programme-filter-row__label svg {
          color: var(--ember-500);
          width: 12px;
          height: 12px;
        }
        @media (min-width: 720px) {
          .cm-programme-filter-row {
            flex-direction: row;
            align-items: center;
            gap: 14px;
          }
          .cm-programme-filter-row__label { min-width: 64px; }
        }
        .cm-programme-filter-row__chips {
          display: flex;
          flex-wrap: nowrap;
          gap: 6px;
          overflow-x: auto;
          padding: 2px 24px 2px 2px;
          margin: -2px -8px -2px -2px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: x proximity;
          -webkit-mask-image: linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%);
                  mask-image: linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%);
        }
        .cm-programme-filter-row__chips::-webkit-scrollbar { display: none; }
        @media (min-width: 720px) {
          .cm-programme-filter-row__chips {
            flex-wrap: wrap;
            overflow-x: visible;
            padding: 0;
            margin: 0;
            -webkit-mask-image: none;
                    mask-image: none;
          }
        }
        .cm-programme-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          background: transparent;
          border: 1px solid var(--border-1);
          color: var(--fg-2);
          font: 500 12px/1 var(--font-sans);
          cursor: pointer;
          scroll-snap-align: start;
          transition:
            background .15s var(--ease-standard),
            border-color .15s var(--ease-standard),
            color .15s var(--ease-standard);
        }
        .cm-programme-chip:hover {
          border-color: var(--border-2);
          color: var(--ink-400);
        }
        .cm-programme-chip:focus-visible {
          outline: 2px solid var(--ember-400);
          outline-offset: 2px;
        }
        .cm-programme-chip.is-active {
          background: var(--ink-400);
          border-color: var(--ink-400);
          color: var(--bone-50);
        }
        .cm-programme-chip--day .cm-programme-chip__index {
          font-weight: 700;
        }
        .cm-programme-chip__sep {
          opacity: 0.45;
        }
        .cm-programme-chip.is-active .cm-programme-chip__sep {
          opacity: 0.55;
        }
        .cm-programme-chip__date {
          font-weight: 500;
        }
        .cm-programme-filters__reset {
          align-self: flex-end;
          padding: 6px 10px;
          border: 0;
          background: transparent;
          color: var(--fg-3);
          font: 600 11px/1 var(--font-mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 6px;
          transition: color 160ms var(--ease-standard), background 160ms var(--ease-standard);
        }
        .cm-programme-filters__reset:hover {
          color: var(--ember-600);
          background: var(--bg-3);
        }

        /* ── Programme: day groups ─────────────────────────────── */
        .cm-programme-day {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cm-programme-day + .cm-programme-day {
          margin-top: clamp(12px, 2vw, 20px);
        }
        .cm-programme-day__head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }
        .cm-programme-day__badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(234, 107, 55, 0.08);
          border: 1px solid rgba(234, 107, 55, 0.18);
          color: var(--ember-600);
          font: 600 12px/1 var(--font-sans);
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .cm-programme-day__badge svg {
          color: var(--ember-500);
        }
        .cm-programme-day__sep {
          color: var(--ember-500);
          opacity: 0.55;
        }
        .cm-programme-day__rule {
          flex: 1;
          height: 1px;
          background: linear-gradient(
            to right,
            var(--border-1),
            transparent
          );
        }
        .cm-programme-day__body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Programme ──────────────────────────────────────────── */
        .cm-programme {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cm-programme-row {
          display: grid;
          grid-template-columns: 88px 1fr;
          gap: clamp(16px, 2.5vw, 24px);
          padding-bottom: 16px;
          border-bottom: 1px dashed var(--border-1);
        }
        .cm-programme-row__time {
          font: 600 13px/1.4 var(--font-mono);
          color: var(--ember-500);
          padding-top: 4px;
        }
        .cm-programme-row__items {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          min-width: 0;
        }
        .cm-programme-row__items--multi {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .cm-programme-card {
          padding: 14px 16px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-md);
          min-width: 0;
          transition: border-color .15s var(--ease-standard),
                      background .15s var(--ease-standard);
        }
        .cm-programme-card:hover {
          border-color: var(--border-2);
          background: var(--bone-50);
        }
        .cm-programme-card__title {
          font: 700 15px/1.3 var(--font-sans);
          color: var(--ink-400);
          margin-bottom: 4px;
          word-break: break-word;
        }
        .cm-programme-card__loc {
          font: 500 11px/1 var(--font-mono);
          color: var(--fg-3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .cm-programme-card__desc {
          font: 400 13px/1.5 var(--font-sans);
          color: var(--fg-2);
          margin: 8px 0 0;
        }
        /* Speakers / mentors attached to a schedule item — overlapping
           round avatars (Slack/Linear-style facepile) with hover popovers. */
        .cm-programme-card__speakers {
          list-style: none;
          margin: 12px 0 0;
          padding: 0;
          display: flex;
          align-items: center;
        }
        .cm-programme-card__speaker {
          position: relative;
          display: inline-flex;
        }
        .cm-programme-card__speaker + .cm-programme-card__speaker {
          margin-left: -12px;
        }
        .cm-programme-card__chip {
          position: relative;
          display: inline-flex;
          cursor: pointer;
          outline: none;
          border-radius: 999px;
          transition: transform 180ms var(--ease-standard);
        }
        .cm-programme-card__chip:hover,
        .cm-programme-card__chip:focus-visible {
          transform: translateY(-2px);
          z-index: 2;
        }
        .cm-programme-card__chip:focus-visible .cm-programme-card__speaker-avatar {
          box-shadow: 0 0 0 2px var(--ember-400);
        }
        .cm-programme-card__speaker-avatar {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--bone-100);
          border: 2px solid var(--bg-2);
          box-shadow: 0 1px 2px rgba(14, 14, 13, 0.06);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font: 600 13px/1 var(--font-sans);
          color: var(--fg-3);
          transition: box-shadow 180ms var(--ease-standard);
        }
        .cm-programme-card__chip:hover .cm-programme-card__speaker-avatar {
          box-shadow: 0 4px 12px rgba(14, 14, 13, 0.15);
        }
        .cm-programme-card__speaker-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cm-programme-card__speaker-avatar--more {
          background: var(--ink-400);
          color: var(--bone-100);
          font-size: 12px;
          letter-spacing: 0.02em;
        }

        /* Hover popover. Anchored to the chip's left edge so we never spill
           over the viewport on phones (chips sit ~16px from the card edge,
           the card is ~16px from the screen edge — a center-anchored popup
           goes off-screen). The arrow points back at the avatar centre.
           Opacity/scale animation comes from framer-motion — don't write
           transform here, motion owns it. */
        .cm-programme-card__pop {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          transform-origin: bottom left;
          width: 240px;
          max-width: calc(100vw - 32px);
          padding: 10px 12px;
          background: var(--ink-400);
          color: var(--bone-100);
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(14, 14, 13, 0.18);
          z-index: 5;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cm-programme-card__pop::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 20px;
          border: 6px solid transparent;
          border-top-color: var(--ink-400);
        }
        .cm-programme-card__pop-name {
          font: 600 13px/1.3 var(--font-sans);
          color: var(--bone-100);
        }
        .cm-programme-card__pop-role {
          font: 500 11px/1.3 var(--font-sans);
          color: rgba(251, 251, 250, 0.72);
        }
        /* "+N more" overflow popover lists every hidden speaker. */
        .cm-programme-card__pop--list {
          width: 280px;
          gap: 8px;
        }
        .cm-programme-card__pop-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .cm-programme-card__pop-row .cm-programme-card__speaker-avatar {
          border-color: var(--ink-300);
          box-shadow: none;
        }
        .cm-programme-card__pop-row-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          line-height: 1.25;
          overflow: hidden;
        }
        .cm-programme-card__pop-row-text .cm-programme-card__pop-name,
        .cm-programme-card__pop-row-text .cm-programme-card__pop-role {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: block;
        }
        @media (prefers-reduced-motion: reduce) {
          .cm-programme-card__chip {
            transition: none;
          }
          .cm-programme-card__chip:hover,
          .cm-programme-card__chip:focus-visible {
            transform: none;
          }
        }
        @media (max-width: 720px) {
          .cm-programme-row {
            grid-template-columns: 1fr;
            gap: 8px;
            padding-bottom: 14px;
          }
          .cm-programme-row__time {
            padding-top: 0;
            padding-bottom: 2px;
            font-size: 12px;
          }
          .cm-programme-row__items--multi { grid-template-columns: 1fr; }
          .cm-programme-card { padding: 12px 14px; }
          .cm-programme-card__title { font-size: 14px; }
        }

        /* ── Venue ──────────────────────────────────────────────── */
        .cm-venue-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .cm-venue__name {
          font: 700 18px/1.3 var(--font-sans);
          color: var(--ink-400);
          margin-bottom: 8px;
          word-break: break-word;
        }
        .cm-venue__addr {
          font: 400 14px/1.5 var(--font-sans);
          color: var(--fg-2);
        }
        .cm-venue__notes {
          font: 400 13px/1.5 var(--font-sans);
          color: var(--fg-3);
          margin: 12px 0 0;
        }
        .cm-venue__map {
          aspect-ratio: 16 / 9;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--bone-200), var(--bone-300));
          border: 1px solid var(--border-1);
          position: relative;
          overflow: hidden;
        }
        .cm-venue__map--live {
          padding: 0;
        }
        /* Yandex map iframe fills the box */
        iframe.cm-venue__map-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }
        /* Floating "Open in Yandex Maps" pill — sits over the iframe so
           the user can break out to the full map without losing the
           in-page preview. */
        .cm-venue__map-open {
          position: absolute;
          right: 12px;
          bottom: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bone-50);
          color: var(--ink-300);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-pill);
          font: 600 12px/1 var(--font-sans);
          text-decoration: none;
          box-shadow: var(--shadow-sm);
          z-index: 2;
          transition: background var(--dur-base) var(--ease-standard),
                      color var(--dur-base) var(--ease-standard),
                      box-shadow var(--dur-base) var(--ease-standard);
        }
        .cm-venue__map-open:hover {
          background: var(--ink-400);
          color: var(--bone-50);
          box-shadow: var(--shadow-md);
        }
        .cm-venue__map-open:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.28);
        }
        /* Venue TBD — playful empty-state for events with no coords/address.
           Faint grid evokes a paper map; ember pin sits on a radar pulse
           so the tile feels alive without becoming a distraction. */
        .cm-venue__map--tbd {
          background:
            radial-gradient(
              circle at 50% 50%,
              var(--bone-50) 0%,
              var(--bone-200) 70%,
              var(--bone-300) 100%
            );
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cm-venue__map-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.55;
          background-image:
            linear-gradient(to right, rgba(14, 14, 13, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(14, 14, 13, 0.06) 1px, transparent 1px);
          background-size: 32px 32px, 32px 32px;
          mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 78%);
          -webkit-mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 78%);
        }
        .cm-venue__map-radar {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          pointer-events: none;
        }
        .cm-venue__map-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 32px;
          height: 32px;
          margin: -16px 0 0 -16px;
          border-radius: 50%;
          border: 1.5px solid var(--ember-400);
          opacity: 0;
          animation: cm-venue-pulse 2.6s var(--ease-out) infinite;
        }
        .cm-venue__map-ring--2 { animation-delay: 0.6s; }
        .cm-venue__map-ring--3 { animation-delay: 1.2s; }
        @keyframes cm-venue-pulse {
          0%   { transform: scale(0.6); opacity: 0; }
          15%  { opacity: 0.55; }
          100% { transform: scale(3.6); opacity: 0; }
        }
        .cm-venue__map-pin {
          position: relative;
          color: var(--ember-500);
          filter: drop-shadow(0 4px 8px rgba(234, 88, 12, 0.32));
          animation: cm-venue-pin-bob 3s var(--ease-out) infinite;
        }
        @keyframes cm-venue-pin-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        .cm-venue__map-eyebrow {
          position: absolute;
          left: 50%;
          bottom: 16px;
          transform: translateX(-50%);
          font: 500 10px/1 var(--font-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--fg-3);
          background: var(--bone-50);
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-1);
          white-space: nowrap;
        }
        @media (prefers-reduced-motion: reduce) {
          .cm-venue__map-ring,
          .cm-venue__map-pin {
            animation: none !important;
          }
          .cm-venue__map-ring--1 { opacity: 0.4; transform: scale(2.2); }
          .cm-venue__map-ring--2,
          .cm-venue__map-ring--3 { display: none; }
        }
        /* ── Online variant ─────────────────────────────────────── */
        .cm-venue__map--online {
          /* Tone vars — overridden per [data-tone] below */
          --cm-online-tone: 234, 88, 12;          /* default ember */
          --cm-online-tone-strong: var(--ember-400);
          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(var(--cm-online-tone), 0.10) 0%,
              transparent 55%
            ),
            linear-gradient(135deg, var(--bone-50), var(--bone-200));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cm-venue__map--online[data-tone="green"]  { --cm-online-tone: 31, 122, 63;  --cm-online-tone-strong: #1f7a3f; }
        .cm-venue__map--online[data-tone="blue"]   { --cm-online-tone: 37, 99, 235;  --cm-online-tone-strong: #2563eb; }
        .cm-venue__map--online[data-tone="red"]    { --cm-online-tone: 220, 38, 38;  --cm-online-tone-strong: #dc2626; }
        .cm-venue__map--online[data-tone="purple"] { --cm-online-tone: 124, 58, 237; --cm-online-tone-strong: #7c3aed; }
        a.cm-venue__map--online-live {
          display: flex;
          text-decoration: none;
          cursor: pointer;
          transition: border-color var(--dur-base) var(--ease-standard),
                      box-shadow var(--dur-base) var(--ease-standard);
        }
        a.cm-venue__map--online-live:hover {
          border-color: var(--cm-online-tone-strong, var(--ember-400));
          box-shadow: 0 0 0 3px rgba(var(--cm-online-tone, 234, 88, 12), 0.18);
        }
        a.cm-venue__map--online-live:focus-visible {
          outline: none;
          border-color: var(--cm-online-tone-strong, var(--ember-400));
          box-shadow: 0 0 0 3px rgba(var(--cm-online-tone, 234, 88, 12), 0.32);
        }
        .cm-venue__online-screen {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 56%;
          max-width: 200px;
        }
        .cm-venue__online-bezel {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          background: var(--ink-400);
          border-radius: 8px;
          padding: 6px;
          box-shadow: 0 8px 20px -8px rgba(14, 14, 13, 0.35),
                      inset 0 0 0 1px rgba(255, 255, 255, 0.04);
          overflow: hidden;
        }
        .cm-venue__online-glow {
          position: absolute;
          inset: 6px;
          border-radius: 4px;
          background:
            radial-gradient(
              circle at 50% 60%,
              rgba(var(--cm-online-tone, 234, 88, 12), 0.55) 0%,
              rgba(var(--cm-online-tone, 234, 88, 12), 0.18) 45%,
              transparent 75%
            );
          animation: cm-venue-online-glow 3.4s var(--ease-out) infinite;
        }
        @keyframes cm-venue-online-glow {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        .cm-venue__online-bars {
          position: absolute;
          inset: 6px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
          padding: 0 14%;
        }
        .cm-venue__online-bars > span {
          flex: 1;
          background: var(--cm-online-tone-strong, var(--ember-400));
          border-radius: 1px;
          box-shadow: 0 0 6px rgba(var(--cm-online-tone, 234, 88, 12), 0.4);
          animation: cm-venue-online-bar 1.1s var(--ease-out) infinite;
          transform-origin: bottom;
        }
        .cm-venue__online-bars > span:nth-child(1) { animation-delay: 0s;    height: 32%; }
        .cm-venue__online-bars > span:nth-child(2) { animation-delay: 0.1s;  height: 56%; }
        .cm-venue__online-bars > span:nth-child(3) { animation-delay: 0.2s;  height: 80%; }
        .cm-venue__online-bars > span:nth-child(4) { animation-delay: 0.15s; height: 60%; }
        .cm-venue__online-bars > span:nth-child(5) { animation-delay: 0.05s; height: 38%; }
        @keyframes cm-venue-online-bar {
          0%, 100% { transform: scaleY(1);    opacity: 0.85; }
          50%      { transform: scaleY(0.55); opacity: 1; }
        }
        .cm-venue__online-dot {
          position: absolute;
          top: 10px;
          right: 12px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
          animation: cm-venue-online-dot 1.4s var(--ease-standard) infinite;
        }
        @keyframes cm-venue-online-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        .cm-venue__online-stand {
          width: 36%;
          height: 4px;
          background: linear-gradient(
            to bottom,
            rgba(14, 14, 13, 0.16),
            rgba(14, 14, 13, 0.06)
          );
          border-radius: 0 0 6px 6px;
        }
        .cm-venue__online-eyebrow,
        .cm-venue__online-cta {
          position: absolute;
          left: 50%;
          bottom: 12px;
          transform: translateX(-50%);
          background: var(--bone-50);
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-1);
          font-family: var(--font-sans);
          white-space: nowrap;
          z-index: 2;
        }
        .cm-venue__online-eyebrow {
          font: 500 10px/1 var(--font-mono);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--fg-3);
        }
        .cm-venue__online-cta {
          display: inline-flex;
          align-items: baseline;
          gap: 8px;
          font: 600 12px/1 var(--font-sans);
          color: var(--ink-300);
          box-shadow: var(--shadow-sm);
          transition: background var(--dur-base) var(--ease-standard),
                      color var(--dur-base) var(--ease-standard);
        }
        a.cm-venue__map--online-live:hover .cm-venue__online-cta {
          background: var(--ink-400);
          color: var(--bone-50);
        }
        .cm-venue__online-cta-eyebrow {
          font: 500 9px/1 var(--font-mono);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--fg-3);
        }
        a.cm-venue__map--online-live:hover .cm-venue__online-cta-eyebrow {
          color: rgba(251, 251, 250, 0.65);
        }
        .cm-venue__online-cta-host {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        @media (prefers-reduced-motion: reduce) {
          .cm-venue__online-glow,
          .cm-venue__online-bars > span,
          .cm-venue__online-dot {
            animation: none !important;
          }
          .cm-venue__online-glow { opacity: 0.7; }
        }
        @media (max-width: 720px) {
          .cm-venue-grid { grid-template-columns: 1fr; gap: 16px; }
        }

        /* ── Materials ──────────────────────────────────────────── */
        .cm-materials {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cm-material {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: 8px;
          text-decoration: none;
          color: var(--fg-1);
          transition: border-color .15s var(--ease-standard),
                      background .15s var(--ease-standard);
        }
        .cm-material:hover {
          border-color: var(--border-2);
          background: var(--bg-3);
        }
        .cm-material__label {
          font: 600 14px/1.3 var(--font-sans);
        }
        .cm-material__desc {
          font: 400 12px/1.4 var(--font-sans);
          color: var(--fg-3);
          margin-top: 2px;
        }

        /* ── Comments ───────────────────────────────────────────── */
        .cm-comments-empty {
          font: 400 14px/1.5 var(--font-sans);
          color: var(--fg-3);
          padding: clamp(18px, 2.5vw, 24px);
          background: var(--bg-2);
          border: 1px dashed var(--border-2);
          border-radius: 8px;
          margin: 0;
        }

        /* ── Related band ───────────────────────────────────────── */
        .cm-related {
          background: var(--bg-3);
          padding-block: clamp(40px, 6vw, 64px);
          margin-top: clamp(48px, 7vw, 80px);
          border-top: 1px solid var(--border-1);
        }
        .cm-related__title {
          font: 700 clamp(22px, 3.2vw, 28px) / 1 var(--font-sans);
          letter-spacing: -0.025em;
          margin: 0 0 clamp(18px, 2.5vw, 24px);
          color: var(--ink-400);
          text-wrap: balance;
        }
        .cm-related-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        @media (min-width: 920px) and (max-width: 1280px) {
          .cm-related-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
          .cm-related-grid { grid-template-columns: 1fr; }
        }

        /* ── Mobile sticky CTA bar ──────────────────────────────────
           Keeps the primary registration action reachable without
           scrolling to the bottom card. Hidden on desktop (the sticky
           sidebar handles it) and once the in-page card is in view. */
        .cm-detail-mobilecta { display: none; }
        @media (max-width: 1024px) {
          .cm-detail-mobilecta {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: var(--z-sticky);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px max(16px, env(safe-area-inset-left))
              calc(10px + env(safe-area-inset-bottom))
              max(16px, env(safe-area-inset-right));
            background: color-mix(in srgb, var(--bone-50) 92%, transparent);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--border-1);
            box-shadow: var(--shadow-lg);
            transform: translateY(0);
            opacity: 1;
            transition: transform var(--dur-base) var(--ease-out),
              opacity var(--dur-base) var(--ease-out);
          }
          .cm-detail-mobilecta.is-hidden {
            transform: translateY(120%);
            opacity: 0;
            pointer-events: none;
          }
        }
        .cm-detail-mobilecta__price {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .cm-detail-mobilecta__price-value {
          font: 700 18px/1.1 var(--font-sans);
          letter-spacing: -0.01em;
          color: var(--ink-400);
        }
        .cm-detail-mobilecta__price-meta {
          font: 500 11px/1.2 var(--font-sans);
          color: var(--fg-3);
        }
        .cm-detail-mobilecta__btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 24px;
          border-radius: var(--radius-pill);
          background: var(--ember-400);
          color: var(--bone-50);
          font: 600 15px/1 var(--font-sans);
          letter-spacing: -0.01em;
          transition: background var(--dur-fast) var(--ease-standard);
        }
        .cm-detail-mobilecta__btn:hover { background: var(--ember-300); }
        .cm-detail-mobilecta__btn[aria-disabled="true"] {
          opacity: 0.6;
          pointer-events: none;
        }
      `}</style>

      <div
        className={`cm-detail-mobilecta${showMobileCta ? "" : " is-hidden"}`}
        role="region"
        aria-label={t(lang, {
          en: "Registration",
          ru: "Регистрация",
          uz: "Roʻyxatdan oʻtish",
        })}
      >
        <div className="cm-detail-mobilecta__price">
          <span className="cm-detail-mobilecta__price-value">
            {designEvent.price}
          </span>
        </div>
        {registrationBlocked ? (
          <span className="cm-detail-mobilecta__btn" aria-disabled="true">
            {registrationBlockedLabel}
          </span>
        ) : (
          <a
            href={registerHref}
            className="cm-detail-mobilecta__btn"
            onClick={handleRegisterClick}
          >
            {t(lang, ctaLabel)}
          </a>
        )}
      </div>
    </div>
  );
}
