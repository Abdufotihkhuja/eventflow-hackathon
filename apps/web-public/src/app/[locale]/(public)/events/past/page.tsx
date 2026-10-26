import { PastEventsPage } from "@widgets/events/layout";

import { breadcrumbSchema, itemListSchema } from "@shared/lib/json-ld";
import { fetchPublicEventsServer } from "@shared/lib/server-data";
import { getServerTranslator } from "@shared/lib/server-i18n";
import { buildPageMetadata } from "@shared/lib/seo";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";

interface PastEventsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ query?: string }>;
}

export async function generateMetadata({
  params,
}: Pick<PastEventsPageProps, "params">): Promise<Metadata> {
  const { locale, t } = await getServerTranslator((await params).locale);

  return buildPageMetadata({
    locale,
    path: "/events/past",
    title: t("public.navigation.past"),
    description: t("public.navigation.pastDescription"),
  });
}

/**
 * Past events archive — SSR'd so the list of historical events lands in HTML
 * for AI engines and non-JS crawlers, not just a client-side shell. Same
 * pattern as the upcoming catalog: fetch first page server-side and seed
 * the client TanStack Query cache via `initialEvents`.
 */
export default async function PastEvents({
  params,
  searchParams,
}: PastEventsPageProps): Promise<React.ReactNode> {
  const { locale, t } = await getServerTranslator((await params).locale);
  const sp = await searchParams;
  const initialQuery = sp.query ?? "";

  const initialEvents = await fetchPublicEventsServer({
    locale,
    filter: "past",
    limit: 50,
  });
  const events = initialEvents?.items ?? [];

  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("public.navigation.events"), path: "/events" },
      { name: t("public.navigation.past"), path: "/events/past" },
    ],
    locale,
  );

  const itemList = itemListSchema(
    events
      .filter((e) => e.slug)
      .map((e) => ({ name: e.title, path: `/events/${e.slug}` })),
    locale,
  );

  return (
    <>
      <JsonLd data={[breadcrumb, itemList]} />
      <PastEventsPage
        initialQuery={initialQuery}
        initialEvents={initialEvents}
      />
    </>
  );
}
