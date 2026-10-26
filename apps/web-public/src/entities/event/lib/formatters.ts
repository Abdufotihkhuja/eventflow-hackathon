import { formatDate, formatDateTime, formatNumber, t as fallbackT } from "@eventflow/i18n";
import { parseUtcIso } from "@shared/lib/date";

import type {
  Event,
  EventAccess,
  EventCategory,
  EventFormat,
  EventPricing,
} from "@entities/event/model";
import type { Locale, Translator } from "@eventflow/i18n";

const formatLabelKeys: Record<EventFormat, string> = {
  online: "public.events.formats.online",
  offline: "public.events.formats.offline",
  hybrid: "public.events.formats.hybrid",
};

const accessLabelKeys: Record<EventAccess, string> = {
  open: "public.events.access.open",
  request: "public.events.access.request",
  invite: "public.events.access.invite",
  private: "public.events.access.private",
};

const pricingLabelKeys: Record<EventPricing, string> = {
  free: "public.events.pricing.free",
  paid: "public.events.pricing.paid",
};

const categoryLabelKeys: Record<EventCategory, string> = {
  "business-training": "public.landing.categories.businessTraining",
  "business-meetings": "public.landing.categories.businessMeetings",
  workshops: "public.landing.categories.workshops",
  conference: "public.landing.categories.conference",
  forum: "public.landing.categories.forum",
  hackathon: "public.landing.categories.hackathon",
  ideathon: "public.landing.categories.ideathon",
};

export function getEventFormatLabel(format: EventFormat, t: Translator = fallbackT): string {
  return t(formatLabelKeys[format]);
}

export function getEventAccessLabel(access: EventAccess, t: Translator = fallbackT): string {
  return t(accessLabelKeys[access]);
}

export function getEventPricingLabel(pricing: EventPricing, t: Translator = fallbackT): string {
  return t(pricingLabelKeys[pricing]);
}

export function getEventCategoryLabel(category: EventCategory, t: Translator = fallbackT): string {
  return t(categoryLabelKeys[category]);
}

export function getEventCapacityLabel(event: Event, t: Translator = fallbackT): string {
  if (event.hasUnlimitedCapacity) {
    return t("public.events.capacity.unlimited");
  }

  if (typeof event.capacity === "number") {
    return t("public.events.capacity.seats", { count: event.capacity });
  }

  return t("public.events.capacity.unknown");
}

export function getEventGroupLabel(
  allowsGroupRegistration: boolean,
  t: Translator = fallbackT
): string {
  return allowsGroupRegistration
    ? t("public.events.participation.group")
    : t("public.events.participation.individual");
}

export function getEventCertificateLabel(
  hasCertificate: boolean,
  t: Translator = fallbackT
): string {
  return hasCertificate
    ? t("public.events.participation.withCertificate")
    : t("public.events.participation.withoutCertificate");
}

function createEventFormatters(locale?: Locale | string, timezone?: string) {
  const tz = timezone ?? undefined;
  return {
    dateTime: (value: Date) => formatDateTime(value, locale, {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }),
    date: (value: Date) => formatDate(value, locale, {
      day: "numeric",
      month: "long",
      timeZone: tz,
    }),
    time: new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }),
  };
}

export function formatEventPeriod(
  startDate: string,
  endDate?: string,
  eventTimezone?: string,
  locale?: Locale | string
): string {
  const start = parseUtcIso(startDate);
  const end = endDate ? parseUtcIso(endDate) : undefined;
  const { dateTime, date, time } = createEventFormatters(locale, eventTimezone);

  if (!end) {
    return dateTime(start);
  }

  const startKey = eventTimezone
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: eventTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(start)
        .replace(/\//g, "-")
    : start.toDateString();
  const endKey = eventTimezone
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: eventTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(end)
        .replace(/\//g, "-")
    : end.toDateString();
  const isSameDay = startKey === endKey;

  if (isSameDay) {
    return `${date(start)}, ${time.format(start)} — ${time.format(end)}`;
  }

  return `${dateTime(start)} — ${dateTime(end)}`;
}

/**
 * Форматирует цену для отображения.
 * price может прийти из API числом или строкой; currency — код валюты (UZS, RUB и т.д.).
 */
export function formatEventPrice(
  pricing: EventPricing,
  price?: number | string,
  currency?: string,
  locale?: Locale | string,
  t: Translator = fallbackT
): string {
  if (pricing === "free") {
    return t(pricingLabelKeys.free);
  }

  const num =
    typeof price === "string"
      ? Number.parseFloat(price)
      : price;

  if (typeof num === "number" && !Number.isNaN(num)) {
    const formatted = formatNumber(num, locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const suffix = currency?.toUpperCase() ?? "₽";
    return `${formatted} ${suffix}`;
  }

  return t(pricingLabelKeys.paid);
}
