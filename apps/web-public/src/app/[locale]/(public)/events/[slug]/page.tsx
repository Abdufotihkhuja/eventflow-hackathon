import { notFound } from "next/navigation";

import { adaptApiEventToEventDetail } from "@entities/event/lib";
import { breadcrumbSchema, eventSchema, faqSchema } from "@shared/lib/json-ld";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { buildPageMetadata, createLocalizedAlternates } from "@shared/lib/seo";
import { TrackViewItem } from "@shared/analytics/track-view-item";
import { resolveMediaUrl } from "@shared/lib/utils";
import { DeletedContentScreen } from "@shared/ui";
import { JsonLd } from "@shared/ui/json-ld";
import { EventDetailsPage } from "@widgets/events/detail";

import type { Locale } from "@eventflow/i18n";
import type { Metadata } from "next";

/** Ответ API при 410 Gone */
interface DeletedContentResponse {
  statusCode: 410;
  deleted: true;
  deletionReason?: string;
  deletedAt: string;
}

interface EventDetailsPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams?: Promise<{
    inviteCode?: string | string[];
  }>;
}

// API URL для серверных запросов
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";

type FetchEventResult =
  | { type: "found"; event: Record<string, unknown> }
  | { type: "not_found" }
  | { type: "deleted"; deletionReason?: string; deletedAt: string };

/**
 * Получение события по slug с сервера (GET /api/v1/public/events/by-slug/:slug).
 * Обрабатывает 404 и 410 Gone (удалённый контент).
 */
async function fetchEventBySlug(
  slug: string,
  locale?: string,
  inviteCode?: string
): Promise<FetchEventResult> {
  try {
    const queryParams = new URLSearchParams();
    if (locale) queryParams.set("locale", locale);
    if (inviteCode) queryParams.set("inviteCode", inviteCode);
    const query = queryParams.size > 0 ? `?${queryParams.toString()}` : "";
    const response = await fetch(
      `${API_BASE_URL}/api/v1/public/events/by-slug/${encodeURIComponent(slug)}${query}`,
      { next: { revalidate: 60 } }
    );

    if (response.status === 410) {
      const data = (await response.json()) as DeletedContentResponse;
      return {
        type: "deleted",
        deletionReason: data.deletionReason,
        deletedAt: data.deletedAt,
      };
    }

    if (!response.ok) {
      if (response.status === 404) {
        return { type: "not_found" };
      }
      throw new Error(`Failed to fetch event: ${response.status}`);
    }

    const event = (await response.json()) as Record<string, unknown>;
    return { type: "found", event };
  } catch (error) {
    console.error("Error fetching event:", error);
    return { type: "not_found" };
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: EventDetailsPageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const inviteCode = getSingleSearchParam(resolvedSearchParams?.inviteCode);
  const { locale, t } = await getServerTranslator(localeParam);
  const result = await fetchEventBySlug(slug, locale, inviteCode);
  const path = `/events/${slug}`;

  if (result.type === "not_found" || result.type === "deleted") {
    return {
      title: t("public.metadata.eventNotFoundTitle"),
      description: t("public.metadata.eventNotFoundDescription"),
      alternates: createLocalizedAlternates(locale, path),
      robots: { index: false, follow: false },
    };
  }

  const event = result.event;
  // Prefer the organizer's real cover photo as og:image so social-share
  // previews (Telegram, Facebook, Twitter, AI engines) render the actual
  // event hero instead of our brand-template fallback. `eventImageUrl`
  // already strips template placeholders + resolves to absolute URL.
  const customCover = eventImageUrl(event.coverImage);
  const meta = buildPageMetadata({
    locale,
    path,
    title: String(event.title),
    description: eventMetaDescription(event, locale),
    ...(customCover ? { images: [customCover] } : {}),
  });

  // SEO: don't index this URL when the event has translations for other
  // locales but not for the requested one — the page would render fallback
  // (e.g. Russian) inside an `<html lang="en">` shell, which is a strong
  // language-mismatch signal and gets deprioritized in Google's EN index.
  // Empty `availableLocales` means scalar-only content (locale unknown),
  // so we leave it indexable rather than removing the only ranking surface.
  if (!hasGenuineLocaleContent(event.availableLocales, locale)) {
    meta.robots = { index: false, follow: true };
  }

  // Closed events only render for a valid invite or an existing registration,
  // so a crawler that got here followed a shared invite link. Keep it out of
  // the index, otherwise the invite URL becomes searchable.
  if (isClosedAccessType(event.accessType)) {
    meta.robots = { index: false, follow: false };
  }

  return meta;
}

function isClosedAccessType(accessType: unknown): boolean {
  return accessType === "INVITE_ONLY" || accessType === "PRIVATE";
}

function hasGenuineLocaleContent(
  availableLocales: unknown,
  locale: Locale,
): boolean {
  if (!Array.isArray(availableLocales) || availableLocales.length === 0) {
    return true; // unknown / scalar-only — fall back to indexing
  }
  return (availableLocales as unknown[]).includes(locale);
}

/** Keep meta descriptions within the SERP-friendly range. */
function truncateDescription(value: string, max = 200): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/**
 * Meta description for an event: its own summary when present, otherwise a
 * factual fallback built from the title, date, and city (so the page never
 * ships an empty description).
 */
function eventMetaDescription(
  event: Record<string, unknown>,
  locale: Locale,
): string {
  // `description` can be a rich-content array; only accept string summaries.
  const summary = [event.shortDescription, event.description].find(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );
  if (summary) return truncateDescription(summary);

  const start = event.startDate ? new Date(String(event.startDate)) : null;
  const dateStr =
    start && !Number.isNaN(start.getTime())
      ? new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(start)
      : "";
  const where = [dateStr, event.city ? String(event.city) : ""]
    .filter(Boolean)
    .join(", ");
  return [String(event.title), where].filter(Boolean).join(" — ");
}

/** Absolute cover image URL for schema, skipping template placeholders. */
function eventImageUrl(coverImage: unknown): string | undefined {
  const raw = typeof coverImage === "string" ? coverImage : "";
  if (!raw || raw.startsWith("template:")) return undefined;
  return resolveMediaUrl(raw);
}

interface RawOrganization {
  id?: string;
  name?: string;
  website?: string;
}

interface RawFaq {
  question?: string;
  answer?: string;
}

interface RawSpeaker {
  name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  photo?: string;
  photoUrl?: string;
  avatarUrl?: string;
  bio?: string;
  description?: string;
  position?: string;
}

/**
 * Compose the speaker's display name from whichever fields the API exposes.
 * Different event modules used to surface `name`, `fullName`, or split
 * first/last across versions.
 */
function speakerName(s: RawSpeaker): string {
  if (s.fullName) return s.fullName.trim();
  if (s.name) return s.name.trim();
  return `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
}

interface PerformerLite {
  name: string;
  image?: string;
  description?: string;
}

function eventPerformers(raw: Record<string, unknown>): PerformerLite[] {
  const speakers = Array.isArray(raw.speakers) ? (raw.speakers as RawSpeaker[]) : [];
  const result: PerformerLite[] = [];
  for (const s of speakers) {
    const name = speakerName(s);
    if (!name) continue;
    const photo = s.photo || s.photoUrl || s.avatarUrl;
    const entry: PerformerLite = { name };
    const image = photo ? resolveMediaUrl(photo) : undefined;
    if (image) entry.image = image;
    const description = s.bio || s.description || s.position;
    if (description) entry.description = description;
    result.push(entry);
  }
  return result;
}

export default async function EventDetailsRoute({
  params,
  searchParams,
}: EventDetailsPageProps): Promise<React.ReactNode> {
  const { locale: localeParam, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const inviteCode = getSingleSearchParam(resolvedSearchParams?.inviteCode);
  const { locale, t } = await getServerTranslator(localeParam);
  const result = await fetchEventBySlug(slug, locale, inviteCode);

  if (result.type === "not_found") {
    notFound();
  }

  if (result.type === "deleted") {
    return (
      <DeletedContentScreen
        message={result.deletionReason}
        contentType="event"
        deletedAt={result.deletedAt}
      />
    );
  }

  const raw = result.event;
  const event = adaptApiEventToEventDetail(raw, t);
  const path = `/events/${slug}`;
  const organization = (raw.organization ?? {}) as RawOrganization;
  const faqs = (Array.isArray(raw.faqs) ? raw.faqs : []) as RawFaq[];

  const eventLd = eventSchema({
    locale,
    path,
    title: String(raw.title ?? ""),
    description: eventMetaDescription(raw, locale),
    startDate: raw.startDate ? String(raw.startDate) : undefined,
    endDate: raw.endDate ? String(raw.endDate) : undefined,
    format: raw.format ? String(raw.format) : undefined,
    status: raw.status ? String(raw.status) : undefined,
    type: raw.type ? String(raw.type) : undefined,
    price: raw.price as number | string | undefined,
    currency: raw.currency ? String(raw.currency) : undefined,
    city: raw.city ? String(raw.city) : undefined,
    venue: raw.venue ? String(raw.venue) : undefined,
    address: raw.address ? String(raw.address) : undefined,
    onlineUrl: raw.onlineUrl ? String(raw.onlineUrl) : undefined,
    image: eventImageUrl(raw.coverImage),
    organizer: {
      id: organization.id,
      name: organization.name,
      url: organization.website,
    },
    registrationDeadline: raw.registrationDeadline
      ? String(raw.registrationDeadline)
      : undefined,
    // Offer.validFrom — when the offer becomes available. Prefer the
    // event's publish date; fall back to its DB createdAt.
    publishedAt: raw.publishedAt ? String(raw.publishedAt) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    // Event.performer — derived from API speakers; eventSchema falls back
    // to the organizer when the list is empty.
    performers: eventPerformers(raw),
  });

  const breadcrumbLd = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("public.navigation.events"), path: "/events" },
      { name: String(raw.title ?? ""), path },
    ],
    locale,
  );

  const faqLd = faqSchema(
    faqs.map((faq) => ({
      question: String(faq.question ?? ""),
      answer: String(faq.answer ?? ""),
    })),
  );

  const isFree = String(raw.type) === "FREE";
  const priceValue = isFree ? 0 : Number(raw.price) || undefined;
  const viewItem = {
    item_id: slug,
    item_name: String(raw.title ?? ""),
    item_category:
      (Array.isArray(raw.categories) &&
        (raw.categories[0] as { name?: string })?.name) ||
      undefined,
    price: priceValue,
  };

  return (
    <>
      <JsonLd data={[eventLd, breadcrumbLd, faqLd]} />
      <TrackViewItem
        item={viewItem}
        currency={raw.currency ? String(raw.currency) : "UZS"}
        value={priceValue}
      />
      <EventDetailsPage slug={slug} initialEvent={event} inviteCode={inviteCode} />
    </>
  );
}

function getSingleSearchParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
