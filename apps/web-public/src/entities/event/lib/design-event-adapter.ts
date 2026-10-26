import { createTranslator, getCityLabel } from "@eventflow/i18n";

import type { PublicEvent } from "@shared/api/eventService";
import { formatUzDate } from "@shared/lib/uz-date";
import { resolveMediaUrl } from "@shared/lib/utils";
import type {
  DesignEvent,
  DesignEventPattern,
} from "@shared/ui/design-system";

export type { DesignEvent, DesignEventPattern };

// `event.city` is a stable select-code ("tashkent"); the label lives in the
// `cities.<code>` i18n namespace. Cache one label-getter per locale so we don't
// rebuild a translator for every card in a list.
const cityLabelByLocale = new Map<string, (code: string | null | undefined) => string>();
const localizeCity = (code: string | null | undefined, locale: string): string => {
  if (!code) return "";
  let getter = cityLabelByLocale.get(locale);
  if (!getter) {
    getter = getCityLabel(createTranslator(locale));
    cityLabelByLocale.set(locale, getter);
  }
  return getter(code);
};

const HUE_BY_CATEGORY: Record<string, number> = {
  "business-training": 22,
  "business-meetings": 178,
  workshops: 142,
  conference: 38,
  forum: 268,
  hackathon: 12,
  ideathon: 312,
};

const PATTERNS: DesignEventPattern[] = [
  "sunburst",
  "grid",
  "arches",
  "dots",
  "rays",
];

interface CategoryLabels {
  en: string;
  ru: string;
  uz?: string;
}

const CATEGORY_LABELS: Record<string, CategoryLabels> = {
  "business-training": {
    en: "Business training",
    ru: "Бизнес-тренинг",
    uz: "Biznes trening",
  },
  "business-meetings": {
    en: "Business meet",
    ru: "Бизнес-встреча",
    uz: "Biznes uchrashuv",
  },
  workshops: { en: "Workshop", ru: "Воркшоп", uz: "Ustaxona" },
  conference: { en: "Conference", ru: "Конференция", uz: "Konferensiya" },
  forum: { en: "Forum", ru: "Форум", uz: "Forum" },
  hackathon: { en: "Hackathon", ru: "Хакатон", uz: "Xakaton" },
  ideathon: { en: "Ideathon", ru: "Идеатон", uz: "Ideaton" },
};

export interface MapPublicEventOptions {
  locale: string;
  index?: number;
  freeLabel?: string;
  perTicketLabel?: string;
  timeZone?: string;
}

const intlLocaleFor = (locale: string): string =>
  locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-Latn-UZ" : "en-US";

const formatDateLabel = (
  iso: string,
  locale: string,
  timeZone?: string,
): { date: string; time: string } => {
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) {
      return { date: iso, time: "" };
    }
    const intlLocale = intlLocaleFor(locale);
    const tz = timeZone || undefined;

    const sameYear =
      new Intl.DateTimeFormat(intlLocale, {
        year: "numeric",
        timeZone: tz,
      }).format(dt) ===
      new Intl.DateTimeFormat(intlLocale, {
        year: "numeric",
        timeZone: tz,
      }).format(new Date());

    let intlDate: string;
    if (locale === "uz") {
      // ICU's uz-Latn-UZ short-month/weekday data is patchy ("M05" etc.) —
      // render natively so the hero reads "Dush, 18-may" / "Dush, 18-may 2026".
      intlDate = formatUzDate(
        dt,
        {
          weekday: "short",
          day: true,
          month: "long",
          year: !sameYear,
        },
        tz,
      );
    } else {
      intlDate = new Intl.DateTimeFormat(intlLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        ...(sameYear ? {} : { year: "numeric" }),
        timeZone: tz,
      }).format(dt);
    }

    // 24h with zero-padded hour for international consistency.
    const intlTime = new Intl.DateTimeFormat(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(dt);

    return { date: intlDate, time: intlTime };
  } catch {
    return { date: iso, time: "" };
  }
};

const formatPrice = (
  ev: PublicEvent,
  freeLabel: string,
  perTicketLabel: string,
): string => {
  if (ev.type === "FREE") return freeLabel;
  const raw = typeof ev.price === "string" ? Number(ev.price) : ev.price;
  if (raw == null || Number.isNaN(raw) || raw === 0) return freeLabel;
  const formatted = new Intl.NumberFormat("en-US").format(raw);
  return `${perTicketLabel} ${formatted} ${ev.currency ?? "UZS"}`;
};

const pickLang = (locale: string): "en" | "ru" | "uz" => {
  if (locale === "ru") return "ru";
  if (locale === "uz") return "uz";
  return "en";
};

const localizedCategoryLabel = (
  category: string | undefined,
  locale: string,
): { id: string; label: string } => {
  if (!category) return { id: "other", label: "Event" };
  const labels = CATEGORY_LABELS[category];
  if (!labels) {
    return { id: category, label: category };
  }
  const lang = pickLang(locale);
  return { id: category, label: labels[lang] ?? labels.en };
};

const stableHashHue = (input: string): number => {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h % 360;
};

export const mapPublicEventToDesignEvent = (
  ev: PublicEvent,
  options: MapPublicEventOptions,
): DesignEvent => {
  const { locale, index = 0, freeLabel, perTicketLabel, timeZone } = options;
  const lang = pickLang(locale);
  const { date, time } = formatDateLabel(
    ev.startDate,
    locale,
    timeZone ?? ev.timezone ?? "Asia/Tashkent",
  );
  const primaryCategory = ev.categories?.[0];
  const fallbackCategory = localizedCategoryLabel(undefined, locale);
  const catId = primaryCategory?.slug ?? fallbackCategory.id;
  const catLabel = primaryCategory?.name ?? fallbackCategory.label;
  const hue =
    HUE_BY_CATEGORY[primaryCategory?.slug ?? ""] ??
    stableHashHue(ev.id || ev.title || "event");

  // Defensive fallbacks — these match the canonical i18n strings under
  // `public.events.pricing.free` / `…fromAmount`. Call sites should pass
  // translated overrides via `freeLabel` / `perTicketLabel`; this keeps a
  // sensible default if a caller forgets, and never falls through to English
  // on non-English locales.
  const free =
    freeLabel ??
    (lang === "ru" ? "Бесплатное" : lang === "uz" ? "Bepul" : "Free");
  const per =
    perTicketLabel ??
    (lang === "ru" ? "от" : lang === "uz" ? "dan" : "from");

  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    shortDescription: ev.shortDescription?.trim() || undefined,
    org: ev.organization?.name ?? ev.organization?.companyName ?? "Eventflow",
    orgLogo: resolveMediaUrl(ev.organization?.logoUrl),
    cover:
      ev.coverImage && !ev.coverImage.startsWith("template:")
        ? resolveMediaUrl(ev.coverImage)
        : undefined,
    date,
    time,
    venue: ev.venue ?? ev.location ?? "",
    city: localizeCity(ev.city, locale),
    cityCode: ev.city ?? undefined,
    price: formatPrice(ev, free, per),
    cat: catId,
    catLabel,
    going: ev.registrationsCount ?? 0,
    capacity: ev.maxParticipants ?? 0,
    hue,
    pattern: PATTERNS[index % PATTERNS.length] as DesignEventPattern,
    pick: ev.isFeatured,
  };
};

export const mapPublicEventsToDesignEvents = (
  events: PublicEvent[],
  options: Omit<MapPublicEventOptions, "index">,
): DesignEvent[] =>
  events.map((ev, index) =>
    mapPublicEventToDesignEvent(ev, { ...options, index }),
  );
