import { LandingPage } from "@widgets/landing/layout";
import { createTranslator, normalizeLocale } from "@eventflow/i18n";
import { fallbackLocale } from "@shared/lib/i18n-routing";
import { faqSchema } from "@shared/lib/json-ld";
import { fetchPublicEventsServer } from "@shared/lib/server-data";
import { buildPageMetadata } from "@shared/lib/seo";
import { homeFaq } from "@shared/lib/site-faq";
import { JsonLd } from "@shared/ui/json-ld";

import type { Metadata } from "next";

interface HomePageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);

  return buildPageMetadata({
    locale,
    path: "/",
    title: t("public.metadata.rootTitle"),
    description: t("public.metadata.rootDescription"),
    absoluteTitle: true,
  });
}

function faqHeading(locale: string): string {
  if (locale === "ru") return "Частые вопросы";
  if (locale === "uz") return "Tez-tez beriladigan savollar";
  return "Frequently asked questions";
}

export default async function HomePage({
  params,
}: HomePageProps): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const initialEvents = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    limit: 6,
  });

  // No upcoming events yet → fall back to recently-held ones so the featured
  // strip conveys real activity instead of a bare empty state. Fetched here
  // (server-side) only when needed, so it lands in the SSR HTML with no flash.
  const initialPastEvents =
    (initialEvents?.items?.length ?? 0) === 0
      ? await fetchPublicEventsServer({
          locale,
          filter: "past",
          limit: 6,
        })
      : undefined;

  const faqItems = homeFaq(locale);
  const faq = faqSchema(faqItems);

  return (
    <>
      {faq ? <JsonLd data={faq} /> : null}
      <LandingPage
        initialEvents={initialEvents}
        initialPastEvents={initialPastEvents}
        faqItems={faqItems}
        faqHeading={faqHeading(locale)}
      />
    </>
  );
}
