import "server-only";

import { blogService } from "@shared/api/blogService";
import type { PublicEventsResponse } from "@shared/api/eventService";

/* eslint-disable import/no-restricted-paths -- только типы доменной модели блога:
   эти функции просто прокидывают наружу то, что возвращает blogService,
   который типизирован ими же (тот же приём, что в shared/api/blogService.ts). */
import type {
  BlogListResponse,
  BlogPost,
  BlogPostCategory,
} from "@entities/blog/model/types";
/* eslint-enable import/no-restricted-paths */
import type { ApiBlogParams } from "@shared/api/blogService";

/**
 * Server-side fetchers for initial list data. Rendering the first page on the
 * server puts real content + internal links into the HTML, so non-JS crawlers
 * and AI engines see the catalog (not just a client-side skeleton).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://api.localhost";

interface PublicEventsQuery {
  locale: string;
  filter?: "upcoming" | "past" | "all";
  limit?: number;
  featured?: boolean;
  /** Category slug filter (for category landing pages). */
  category?: string;
  /** Single city substring filter (case-insensitive contains). */
  city?: string;
  /**
   * Alternative spellings for the same city (e.g. ["tashkent", "Ташкент",
   * "Toshkent"]) — OR-matched server-side. Used by `/events/city/[slug]`
   * landings so the canonical city slug picks up events stored under any
   * locale variant in the database.
   */
  cities?: string[];
  /** API payment type filter — FREE | PAID. Powers /events/free landing. */
  type?: "FREE" | "PAID";
  /** API format filter — ONLINE | OFFLINE | HYBRID. Powers /events/{format}. */
  format?: "ONLINE" | "OFFLINE" | "HYBRID";
}

export async function fetchPublicEventsServer(
  query: PublicEventsQuery,
): Promise<PublicEventsResponse | undefined> {
  try {
    const params = new URLSearchParams();
    if (query.filter) params.set("filter", query.filter);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.featured) params.set("featured", "true");
    if (query.category) params.set("category", query.category);
    if (query.city) params.set("city", query.city);
    if (query.cities && query.cities.length > 0) {
      params.set("cities", query.cities.join(","));
    }
    if (query.type) params.set("type", query.type);
    if (query.format) params.set("format", query.format);
    params.set("locale", query.locale);

    const res = await fetch(
      `${API_BASE_URL}/api/v1/public/events?${params.toString()}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return undefined;
    return (await res.json()) as PublicEventsResponse;
  } catch {
    return undefined;
  }
}

export interface PublicCategorySummary {
  id: string;
  name: string;
  slug: string;
  /** Uploaded icon path as stored by the API (unresolved). */
  icon?: string;
  /** Upcoming, publicly visible events in this category (from the API). */
  upcomingCount: number;
}

/**
 * Active catalog categories with their upcoming-event counts. Used by the
 * category landings to label the "other categories" chips, so a visitor sees
 * where the events actually are instead of clicking into empty pages.
 */
export async function fetchPublicCategoriesServer(
  locale: string,
): Promise<PublicCategorySummary[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/categories?locale=${encodeURIComponent(locale)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      id?: string;
      name?: string;
      slug?: string;
      icon?: string | null;
      _count?: { events?: number };
    }>;
    if (!Array.isArray(data)) return [];
    return data.flatMap<PublicCategorySummary>((c) =>
      c.id && c.name && c.slug
        ? [
            {
              id: c.id,
              name: c.name,
              slug: c.slug,
              icon: c.icon ?? undefined,
              upcomingCount: c._count?.events ?? 0,
            },
          ]
        : [],
    );
  } catch {
    return [];
  }
}

/**
 * First page of blog posts, adapted to the same shape the client query uses
 * (`blogService.getPosts` already runs server-side in `generateStaticParams`).
 */
export async function fetchBlogPostsServer(
  locale: ApiBlogParams["locale"],
  page = 1,
  pageSize = 9,
): Promise<BlogListResponse | undefined> {
  try {
    return await blogService.getPosts({}, page, pageSize, locale);
  } catch {
    return undefined;
  }
}

/** Latest posts for the blog hero / featured strip. */
export async function fetchFeaturedPostsServer(
  locale: ApiBlogParams["locale"],
  limit = 3,
): Promise<BlogPost[] | undefined> {
  try {
    return await blogService.getFeaturedPosts(limit, locale);
  } catch {
    return undefined;
  }
}

/** Dynamic blog categories for the catalog chips (localized names). */
export async function fetchBlogCategoriesServer(
  locale: ApiBlogParams["locale"],
): Promise<BlogPostCategory[] | undefined> {
  try {
    return await blogService.getCategories(locale);
  } catch {
    return undefined;
  }
}

export interface PublicOrganizerSummary {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  /** Number of public events this organizer has (PUBLISHED, any time). */
  eventCount: number;
  /** Number of public events with endDate in the future — drives ordering. */
  upcomingCount: number;
}

/**
 * Public list of EVERY verified (APPROVED, not deleted) organization,
 * with event counts attached. Backed by `GET /api/v1/public/organizations`
 * — so even orgs that haven't shipped an event yet show up in the
 * `/organizers/all` directory. The endpoint already returns the list
 * sorted by `upcomingCount → eventCount → name`.
 */
export async function fetchPublicOrganizersServer(
  locale: string,
  pageSize = 100,
): Promise<PublicOrganizerSummary[]> {
  try {
    const params = new URLSearchParams({
      page: "1",
      limit: String(pageSize),
      locale,
    });
    const res = await fetch(
      `${API_BASE_URL}/api/v1/public/organizations?${params.toString()}`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      organizations?: Array<{
        id: string;
        name?: string;
        companyName?: string | null;
        logoUrl?: string | null;
        description?: string | null;
        eventCount?: number;
        upcomingCount?: number;
      }>;
    };
    const list = data.organizations ?? [];
    return list.flatMap<PublicOrganizerSummary>((org) => {
      const display = org.companyName || org.name || "";
      if (!org.id || !display) return [];
      return [
        {
          id: org.id,
          name: display,
          logoUrl: org.logoUrl ?? undefined,
          description: org.description ?? undefined,
          eventCount: org.eventCount ?? 0,
          upcomingCount: org.upcomingCount ?? 0,
        },
      ];
    });
  } catch {
    return [];
  }
}
