import type { Locale } from "@eventflow/i18n";

import { withLocalePath } from "./i18n-routing";
import { SITE_NAME, siteUrl } from "./seo";

/** A single JSON-LD node. */
export type JsonLdObject = Record<string, unknown>;

const ORG_ID = `${siteUrl}/#organization`;
const WEBSITE_ID = `${siteUrl}/#website`;
const BRAND_LOGO_URL = `${siteUrl}/assets/email-logo.png`;

/** Absolute, locale-prefixed URL for a path. */
function absoluteUrl(path: string, locale: Locale): string {
  return `${siteUrl}${withLocalePath(path, locale)}`;
}

/** Removes undefined / null / empty-string / empty-array values recursively. */
function compact<T>(value: T): T {
  if (Array.isArray(value)) {
    const arr = value.map(compact).filter((v) => v !== undefined);
    return arr as unknown as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, compact(v)] as const)
      .filter(([, v]) => {
        if (v === undefined || v === null || v === "") return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      });
    return Object.fromEntries(entries) as T;
  }
  return value;
}

/**
 * Public contact email for the brand. Surfaced via Organization.email and
 * Organization.contactPoint so Google can show it in the Knowledge Panel and
 * AI engines (ChatGPT, Perplexity) can cite it when asked how to reach us.
 */
const SUPPORT_EMAIL = "support@eventflow.uz";

/**
 * Brand-name variants Google should map to the same Organization entity.
 * Disambiguates from unrelated "EventFlow" products globally (the .NET
 * CQRS framework on github.com/eventflow, eventflowapp.com exhibitor SaaS,
 * etc.) by tying the brand to the .uz domain, Cyrillic forms, and the
 * Uzbek transliteration that local press and social use.
 */
const BRAND_ALTERNATE_NAMES = [
  "EVENTFLOW.uz",
  "Eventflow.uz",
  "Eventflow",
  "Эвентфлоу",
  "Эвентфлоу Узбекистан",
  "Eventflow Oʻzbekiston",
];

/**
 * Brand-owned profile URLs (`sameAs`) — feeds Google's Knowledge Panel
 * and helps AI engines anchor the brand to verifiable third-party identities
 * (Facebook page, Instagram, Telegram channel, YouTube, LinkedIn). Read from
 * env so they can be set per environment without redeploying code:
 *
 *   NEXT_PUBLIC_BRAND_FACEBOOK=https://facebook.com/eventflow.uz
 *   NEXT_PUBLIC_BRAND_INSTAGRAM=https://instagram.com/eventflow.uz
 *   NEXT_PUBLIC_BRAND_TELEGRAM=https://t.me/eventflow_uz
 *   NEXT_PUBLIC_BRAND_YOUTUBE=https://youtube.com/@eventflow_uz
 *   NEXT_PUBLIC_BRAND_LINKEDIN=https://linkedin.com/company/eventflow-uz
 *   NEXT_PUBLIC_BRAND_TWITTER=https://twitter.com/eventflow_uz
 *
 * Empty / missing values are filtered out — the schema only emits URLs
 * the brand actually owns. Add new platforms by extending `SAMEAS_ENV_KEYS`.
 */
const SAMEAS_ENV_KEYS = [
  "NEXT_PUBLIC_BRAND_FACEBOOK",
  "NEXT_PUBLIC_BRAND_INSTAGRAM",
  "NEXT_PUBLIC_BRAND_TELEGRAM",
  "NEXT_PUBLIC_BRAND_YOUTUBE",
  "NEXT_PUBLIC_BRAND_LINKEDIN",
  "NEXT_PUBLIC_BRAND_TWITTER",
] as const;

function brandSameAs(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of SAMEAS_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    // Must look like an absolute URL — Google rejects relative `sameAs`.
    try {
      new URL(trimmed);
    } catch {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/** EVENTFLOW Organization — the brand entity referenced by every other node. */
export function organizationSchema(): JsonLdObject {
  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    url: siteUrl,
    logo: BRAND_LOGO_URL,
    description:
      "EVENTFLOW connects attendees and organizers: discover events, register, and manage attendance with QR tickets.",
    knowsLanguage: ["en", "ru", "uz"],
    areaServed: { "@type": "Country", name: "Uzbekistan" },
    email: SUPPORT_EMAIL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tashkent",
      addressCountry: "UZ",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SUPPORT_EMAIL,
        availableLanguage: ["en", "ru", "uz"],
        areaServed: "UZ",
      },
    ],
    sameAs: brandSameAs(),
  });
}

/** WebSite node with a SearchAction that enables a sitelinks search box. */
export function webSiteSchema(locale: Locale): JsonLdObject {
  return compact({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    // Same brand-variant set as Organization — strengthens the
    // brand→domain association across SERP and AI engines.
    alternateName: BRAND_ALTERNATE_NAMES,
    url: `${siteUrl}${withLocalePath("/", locale)}`,
    inLanguage: locale,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/events", locale)}?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbSchema(
  items: BreadcrumbItem[],
  locale: Locale,
): JsonLdObject {
  return compact({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, locale),
    })),
  });
}

interface ListItemInput {
  name: string;
  path: string;
}

/** ItemList for a collection page (catalog, blog, category/city landing). */
export function itemListSchema(
  items: ListItemInput[],
  locale: Locale,
): JsonLdObject | null {
  if (items.length === 0) return null;
  return compact({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(item.path, locale),
      name: item.name,
    })),
  });
}

interface EventSchemaInput {
  locale: Locale;
  path: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  /** API format: ONLINE | OFFLINE | HYBRID */
  format?: string;
  /** API status: PUBLISHED | CANCELLED | COMPLETED | ... */
  status?: string;
  /** API payment type: FREE | PAID */
  type?: string;
  price?: number | string;
  currency?: string;
  city?: string;
  venue?: string;
  address?: string;
  onlineUrl?: string;
  /** Absolute image URL, if available. */
  image?: string;
  organizer?: {
    id?: string;
    name?: string;
    /** Organizer's own website, if provided. */
    url?: string;
  };
  registrationDeadline?: string;
  /**
   * ISO date when the event went public — used as `Offer.validFrom`
   * (the date from which the ticket / registration is purchasable).
   * Google Rich Results warns when `validFrom` is missing.
   */
  publishedAt?: string;
  /** Fallback when `publishedAt` is absent — typically the API `createdAt`. */
  createdAt?: string;
  /**
   * Speakers / performers — emitted as `Event.performer` Person entries.
   * When absent, the organizer is used as the performer (sensible for
   * conferences/workshops where the organizing entity IS the act).
   */
  performers?: Array<{ name: string; image?: string; description?: string }>;
}

function attendanceMode(format?: string): string | undefined {
  switch (format) {
    case "ONLINE":
      return "https://schema.org/OnlineEventAttendanceMode";
    case "HYBRID":
      return "https://schema.org/MixedEventAttendanceMode";
    case "OFFLINE":
      return "https://schema.org/OfflineEventAttendanceMode";
    default:
      return undefined;
  }
}

function eventStatus(status?: string): string {
  return status === "CANCELLED"
    ? "https://schema.org/EventCancelled"
    : "https://schema.org/EventScheduled";
}

function eventLocation(input: EventSchemaInput): unknown {
  const isOnline = input.format === "ONLINE";
  const isHybrid = input.format === "HYBRID";

  const place =
    input.city || input.venue || input.address
      ? {
          "@type": "Place",
          name: input.venue || input.city,
          address: compact({
            "@type": "PostalAddress",
            streetAddress: input.address,
            addressLocality: input.city,
            addressCountry: "UZ",
          }),
        }
      : undefined;

  const virtual = {
    "@type": "VirtualLocation",
    url: input.onlineUrl || absoluteUrl(input.path, input.locale),
  };

  if (isOnline) return virtual;
  if (isHybrid) return [place, virtual].filter(Boolean);
  return place;
}

export function eventSchema(input: EventSchemaInput): JsonLdObject {
  const url = absoluteUrl(input.path, input.locale);

  // Resolve organizer Organization node, preferring the organizer's own
  // website but falling back to the on-site profile URL — Google reports
  // a Rich Results warning when `organizer.url` is missing entirely.
  const organizerProfileUrl = input.organizer?.id
    ? absoluteUrl(`/organizers/${input.organizer.id}`, input.locale)
    : undefined;
  const organizer = input.organizer?.name
    ? compact({
        "@type": "Organization",
        name: input.organizer.name,
        url: input.organizer.url || organizerProfileUrl,
      })
    : { "@id": ORG_ID };

  // Performers: explicit speaker list when we have one, otherwise the
  // organizer itself (Google's Rich Results expects `performer` for the
  // Event rich card; a missing field triggers a warning).
  const performer =
    input.performers && input.performers.length > 0
      ? input.performers.map((p) =>
          compact({
            "@type": "Person",
            name: p.name,
            image: p.image,
            description: p.description,
          }),
        )
      : input.organizer?.name
        ? [
            compact({
              "@type": "Organization",
              name: input.organizer.name,
              url: input.organizer.url || organizerProfileUrl,
            }),
          ]
        : undefined;

  // Offer.validFrom: prefer the explicit publish date; fall back to the
  // record's created date so the field is always populated when at all
  // possible. (Falling back to `now` would make the JSON-LD non-stable
  // across renders, which hurts caching and confuses Google.)
  const offerValidFrom = input.publishedAt || input.createdAt;

  return compact({
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    eventAttendanceMode: attendanceMode(input.format),
    eventStatus: eventStatus(input.status),
    url,
    image: input.image ? [input.image] : undefined,
    inLanguage: input.locale,
    location: eventLocation(input),
    organizer,
    performer,
    offers: compact({
      "@type": "Offer",
      price: input.type === "FREE" ? "0" : input.price ? String(input.price) : "0",
      priceCurrency: input.currency || "UZS",
      availability: "https://schema.org/InStock",
      url,
      validFrom: offerValidFrom,
      validThrough: input.registrationDeadline,
    }),
  });
}

interface ArticleSchemaInput {
  locale: Locale;
  path: string;
  title: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  /**
   * Author identity. Pass `authorType: "Person"` when the post has a real
   * byline author (from `BlogPost.authorId` on the API) — emitted as
   * `Person { name, image, description }` for E-E-A-T. Pass `"Organization"`
   * (or omit) to surface the organization byline (legacy / org-authored
   * posts). When `authorName` is also omitted, falls back to the main
   * EVENTFLOW Organization by @id.
   */
  authorType?: "Person" | "Organization";
  authorName?: string;
  authorUrl?: string;
  authorLogo?: string;
  /** Person.description / Organization (none) — short bio surfaced in SERPs. */
  authorBio?: string;
}

export function articleSchema(input: ArticleSchemaInput): JsonLdObject {
  const url = absoluteUrl(input.path, input.locale);

  const author = (() => {
    if (!input.authorName) return { "@id": ORG_ID };
    if (input.authorType === "Person") {
      return compact({
        "@type": "Person",
        name: input.authorName,
        url: input.authorUrl,
        image: input.authorLogo,
        description: input.authorBio,
      });
    }
    return compact({
      "@type": "Organization",
      name: input.authorName,
      url: input.authorUrl,
      logo: input.authorLogo,
    });
  })();

  return compact({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    image: input.image ? [input.image] : undefined,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    inLanguage: input.locale,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    author,
    publisher: { "@id": ORG_ID },
  });
}

interface PricingOfferInput {
  /** Localized tier name (matches the visible card, e.g. "Pro"). */
  name: string;
  /** UZS price in tiyin as a string (D-3); wins over the USD anchor when set. */
  priceAmountMinor: string | null;
  /** Marketing USD anchor in cents; null — the free tier. */
  usdAnchorCents: number | null;
  /** Whether the tier is actually sellable today (catalog `isPurchasable`). */
  isPurchasable: boolean;
}

interface PricingProductInput {
  locale: Locale;
  /** Unlocalized page path, e.g. "/pricing". */
  path: string;
  name: string;
  description: string;
  offers: PricingOfferInput[];
}

/**
 * Product node for the /pricing page (P-12): the organizer plan lineup with
 * one Offer per tier. Honest pricing rules (A-3/§2.2):
 * - A set UZS price is the real, binding list price → priceCurrency UZS,
 *   availability InStock once the tier is purchasable.
 * - Until then the USD anchor is display-only (never charged) → priceCurrency
 *   USD with availability PreOrder, so search engines do not present the
 *   anchor as a buyable price.
 * - The free tier (no price at all) is genuinely available → "0" / InStock.
 */
export function pricingProductSchema(input: PricingProductInput): JsonLdObject {
  const url = absoluteUrl(input.path, input.locale);

  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url,
    brand: { "@id": ORG_ID },
    offers: input.offers.map((offer) => {
      const hasUzs =
        offer.priceAmountMinor !== null && /^\d+$/.test(offer.priceAmountMinor);
      // Tiyin → whole soums by dropping the two minor digits (string math —
      // catalog prices are set in whole soums, and this avoids BigInt).
      const uzsPrice = hasUzs
        ? (offer.priceAmountMinor as string).slice(0, -2) || "0"
        : null;
      const usdAnchor =
        offer.usdAnchorCents !== null
          ? String(offer.usdAnchorCents / 100)
          : null;
      const isFree = uzsPrice === null && usdAnchor === null;

      return compact({
        "@type": "Offer",
        name: offer.name,
        price: uzsPrice ?? usdAnchor ?? "0",
        priceCurrency: uzsPrice !== null ? "UZS" : "USD",
        availability:
          (uzsPrice !== null && offer.isPurchasable) || isFree
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
        url,
      });
    }),
  });
}

interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(items: FaqItem[]): JsonLdObject | null {
  const valid = items.filter((i) => i.question && i.answer);
  if (valid.length === 0) return null;

  return compact({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });
}

interface OrganizerProfileInput {
  locale: Locale;
  path: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  city?: string;
  country?: string;
}

/** Organization node for a public organizer profile page. */
export function organizerProfileSchema(input: OrganizerProfileInput): JsonLdObject {
  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    description: input.description,
    logo: input.logo,
    url: absoluteUrl(input.path, input.locale),
    sameAs: input.website ? [input.website] : undefined,
    address: input.city
      ? compact({
          "@type": "PostalAddress",
          addressLocality: input.city,
          addressCountry: input.country,
        })
      : undefined,
    subOrganization: { "@id": ORG_ID },
  });
}
