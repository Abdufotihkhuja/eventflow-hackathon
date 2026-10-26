import {
  EVENT_CATEGORIES,
  EVENT_CITIES,
  EVENT_REGIONS,
  cityAliases,
  getCategory,
  regionAliases,
} from "@shared/lib/catalog-taxonomy";
import {
  SUPPORTED_LOCALES,
  seoDefaultLocale,
  withLocalePath,
  type Locale,
} from "@shared/lib/i18n-routing";
import { isPricingLive } from "@shared/lib/pricing-live";
import { siteUrl } from "@shared/lib/seo";

import type { MetadataRoute } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";

/** API max page size, and a safety cap on pages walked per collection. */
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

/** Public, indexable static routes (unlocalized paths). */
// M-14 release gate: /pricing joins the sitemap only once the flag flips
// (the page carries noindex until then — see (public)/pricing/page.tsx).
const PRICING_PATHS = isPricingLive() ? (["/pricing"] as const) : ([] as const);

const STATIC_PATHS = [
  "/",
  "/events",
  "/events/past",
  "/events/free",
  "/events/this-weekend",
  "/events/this-month",
  "/events/format/online",
  "/events/format/offline",
  "/events/format/hybrid",
  "/about",
  "/blog",
  "/faq",
  "/organizers/all",
  "/privacy",
  "/terms",
] as const;

function absoluteUrl(path: string, locale: Locale): string {
  return `${siteUrl}${withLocalePath(path, locale)}`;
}

function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = absoluteUrl(path, locale);
  }
  languages["x-default"] = absoluteUrl(path, seoDefaultLocale);
  return languages;
}

interface EntryOptions {
  lastModified?: string | Date;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
}

function entry(path: string, options: EntryOptions = {}): MetadataRoute.Sitemap[number] {
  // The entry's primary `url` aligns with the locale we declare as
  // `x-default` (UZ) so the sitemap and hreflang signal the same canonical.
  return {
    url: absoluteUrl(path, seoDefaultLocale),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: { languages: languagesFor(path) },
  };
}

interface DynamicSlug {
  slug: string;
  lastModified?: string;
}

interface EventsResult {
  events: DynamicSlug[];
  organizerIds: string[];
  /** Category slugs seen on UPCOMING events (matches landing-page noindex policy). */
  upcomingCategorySlugs: string[];
  /** Lowercased city forms seen on UPCOMING events (city landings noindex when empty). */
  upcomingCitySeen: Set<string>;
}

/**
 * Walks all event pages, collecting slugs + unique organizer ids. Category /
 * city gating is restricted to UPCOMING events (endDate >= now) because both
 * landing pages render `noindex` when they have zero upcoming events —
 * announcing them in the sitemap regardless would just burn Google's crawl
 * budget on URLs that immediately tell it not to index. Past events still
 * show up for their permanent slug URLs.
 */
async function fetchAllEvents(): Promise<EventsResult> {
  const events: DynamicSlug[] = [];
  const organizerIds = new Set<string>();
  const upcomingCategorySlugs = new Set<string>();
  const upcomingCitySeen = new Set<string>();
  const now = Date.now();

  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/public/events?filter=all&page=${page}&limit=${PAGE_SIZE}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const data = (await res.json()) as {
        items?: Array<{
          slug?: string;
          updatedAt?: string;
          startDate?: string;
          endDate?: string;
          city?: string | null;
          organization?: { id?: string };
          categories?: Array<{ slug?: string }>;
        }>;
        totalPages?: number;
      };
      const items = data.items ?? [];
      for (const item of items) {
        if (item.slug) {
          events.push({
            slug: item.slug,
            lastModified: item.updatedAt ?? item.startDate,
          });
        }
        if (item.organization?.id) organizerIds.add(item.organization.id);

        // Mirror the API's `upcoming` filter (endDate >= now) so the gating
        // here matches what the landing pages actually display.
        const endMs = item.endDate ? Date.parse(item.endDate) : NaN;
        const isUpcoming = !Number.isNaN(endMs) && endMs >= now;
        if (isUpcoming) {
          for (const cat of item.categories ?? []) {
            if (cat.slug) upcomingCategorySlugs.add(cat.slug);
          }
          if (typeof item.city === "string" && item.city.trim().length > 0) {
            upcomingCitySeen.add(item.city.trim().toLowerCase());
          }
        }
      }
      if (items.length < PAGE_SIZE || (data.totalPages && page >= data.totalPages)) {
        break;
      }
    }
  } catch {
    /* return what we have */
  }

  return {
    events,
    organizerIds: [...organizerIds],
    upcomingCategorySlugs: [...upcomingCategorySlugs],
    upcomingCitySeen,
  };
}

/** Walks all blog pages, collecting slugs. */
async function fetchAllBlog(): Promise<DynamicSlug[]> {
  const posts: DynamicSlug[] = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/blog?page=${page}&limit=${PAGE_SIZE}&sortBy=publishedAt&sortOrder=desc`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const data = (await res.json()) as {
        data?: Array<{ slug?: string; updatedAt?: string; publishedAt?: string }>;
        totalPages?: number;
      };
      const items = data.data ?? [];
      for (const item of items) {
        if (item.slug) {
          posts.push({
            slug: item.slug,
            lastModified: item.updatedAt ?? item.publishedAt,
          });
        }
      }
      if (items.length < PAGE_SIZE || (data.totalPages && page >= data.totalPages)) {
        break;
      }
    }
  } catch {
    /* return what we have */
  }

  return posts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    { events, organizerIds, upcomingCategorySlugs, upcomingCitySeen },
    posts,
  ] = await Promise.all([fetchAllEvents(), fetchAllBlog()]);

  const staticEntries = [...STATIC_PATHS, ...PRICING_PATHS].map((path) =>
    entry(path, {
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : 0.7,
    }),
  );

  const eventEntries = events.map((event) =>
    entry(`/events/${event.slug}`, {
      lastModified: event.lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    }),
  );

  const postEntries = posts.map((post) =>
    entry(`/blog/${post.slug}`, {
      lastModified: post.lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  const organizerEntries = organizerIds.map((id) =>
    entry(`/organizers/${id}`, {
      changeFrequency: "weekly",
      priority: 0.5,
    }),
  );

  // Category landing pages — only those that have at least one UPCOMING
  // event and a known taxonomy slug. Avoids advertising thin pages that
  // would just `noindex,follow` on hit.
  const categoryEntries = upcomingCategorySlugs
    .filter((slug) => getCategory(slug))
    .map((slug) =>
      entry(`/events/category/${slug}`, {
        changeFrequency: "daily",
        priority: 0.6,
      }),
    );

  // City landing pages — same anti-thin policy: only cities whose alias
  // appears on at least one upcoming event.
  const cityEntries = EVENT_CITIES.filter((city) =>
    cityAliases(city).some((alias) =>
      upcomingCitySeen.has(alias.trim().toLowerCase()),
    ),
  ).map((city) =>
    entry(`/events/city/${city.code}`, {
      changeFrequency: "daily",
      priority: 0.6,
    }),
  );

  // Region landings — include only regions whose alias set matches at
  // least one upcoming event's city. Mirrors landing-page noindex policy.
  const regionEntries = EVENT_REGIONS.filter((r) =>
    regionAliases(r).some((alias) =>
      upcomingCitySeen.has(alias.trim().toLowerCase()),
    ),
  ).map((r) =>
    entry(`/events/region/${r.slug}`, {
      changeFrequency: "daily",
      priority: 0.6,
    }),
  );

  // Compound City × Category landings — include only the (city, category)
  // pairs we can prove have at least one upcoming event. With 70 base
  // combinations × 3 locales, listing only populated cells keeps the
  // sitemap honest and saves Google's crawl budget.
  const compoundEntries: ReturnType<typeof entry>[] = [];
  for (const city of EVENT_CITIES) {
    const cityHasEvents = cityAliases(city).some((alias) =>
      upcomingCitySeen.has(alias.trim().toLowerCase()),
    );
    if (!cityHasEvents) continue;
    for (const cat of EVENT_CATEGORIES) {
      if (!upcomingCategorySlugs.includes(cat.slug)) continue;
      compoundEntries.push(
        entry(`/events/city/${city.code}/category/${cat.slug}`, {
          changeFrequency: "daily",
          priority: 0.5,
        }),
      );
    }
  }

  return [
    ...staticEntries,
    ...eventEntries,
    ...postEntries,
    ...organizerEntries,
    ...categoryEntries,
    ...cityEntries,
    ...regionEntries,
    ...compoundEntries,
  ];
}
