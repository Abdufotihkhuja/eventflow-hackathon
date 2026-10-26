import { EventsPage } from "@widgets/events/layout";
import { getCategory } from "@shared/lib/catalog-taxonomy";
import { breadcrumbSchema, itemListSchema } from "@shared/lib/json-ld";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { fetchPublicEventsServer } from "@shared/lib/server-data";
import { buildPageMetadata } from "@shared/lib/seo";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";

interface EventsPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    query?: string;
    cat?: string;
    category?: string;
    tab?: string;
  }>;
}

/**
 * Detect URLs Google indexed by literally crawling our WebSite
 * `urlTemplate=/events?query={search_term_string}` — some bots don't
 * resolve the template and end up fetching the placeholder verbatim.
 * Any `{` / `}` in a query param is a template-leak; noindex prevents
 * those bot-trap URLs from clustering with the real catalog.
 */
function looksLikeTemplateLeak(
  sp: Record<string, string | undefined>,
): boolean {
  for (const value of Object.values(sp)) {
    if (typeof value === "string" && (value.includes("{") || value.includes("}"))) {
      return true;
    }
  }
  return false;
}

export async function generateMetadata({
  params,
  searchParams,
}: EventsPageProps): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const sp = await searchParams;

  // When the URL carries a known category filter, point the canonical at
  // the dedicated landing page — both URLs render the same event set, and
  // the landing has its own title/FAQ/schema. Without this Google reports
  // "duplicate, canonical not chosen". Old internal links used `?cat=` but
  // GSC also caught `?category=` variants in the wild, so accept both.
  const rawCategorySlug = (
    typeof sp.category === "string"
      ? sp.category
      : typeof sp.cat === "string"
        ? sp.cat
        : ""
  ).trim();
  const canonicalPath =
    rawCategorySlug && getCategory(rawCategorySlug)
      ? `/events/category/${rawCategorySlug}`
      : "/events";

  const meta = buildPageMetadata({
    locale,
    path: canonicalPath,
    title: t("public.navigation.events"),
    description: t("public.navigation.catalogDescription"),
  });

  // Bot-trap protection — see comment on `looksLikeTemplateLeak` above.
  if (looksLikeTemplateLeak(sp)) {
    meta.robots = { index: false, follow: true };
  }

  return meta;
}

export default async function Events({
  params,
  searchParams,
}: EventsPageProps): Promise<React.ReactNode> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const { query } = await searchParams;
  const initialEvents = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    limit: 50,
  });

  const itemList = itemListSchema(
    (initialEvents?.items ?? [])
      .filter((event) => event.slug)
      .map((event) => ({
        name: event.title,
        path: `/events/${event.slug}`,
      })),
    locale,
  );
  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("public.navigation.events"), path: "/events" },
    ],
    locale,
  );

  return (
    <>
      <JsonLd data={[breadcrumb, itemList]} />
      <EventsPage initialQuery={query ?? ""} initialEvents={initialEvents} />
    </>
  );
}
