import { notFound } from "next/navigation";

import { createTranslator, type Locale } from "@eventflow/i18n";
import {
  EVENT_CITIES,
  EVENT_REGIONS,
  cityName,
  getRegion,
  regionAliases,
  regionHeading,
  regionIntro,
  regionMetaDescription,
  regionName,
  type RegionDef,
} from "@shared/lib/catalog-taxonomy";
import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import {
  breadcrumbSchema,
  faqSchema,
  itemListSchema,
} from "@shared/lib/json-ld";
import { fetchPublicEventsServer } from "@shared/lib/server-data";
import { buildPageMetadata } from "@shared/lib/seo";
import { FaqSection } from "@shared/ui/faq-section";
import { JsonLd } from "@shared/ui/json-ld";
import { EventCollectionView } from "@widgets/events/landing";

import type { Metadata } from "next";

/**
 * Region landing — `/events/region/[slug]`. Captures region-scoped queries
 * («события в Самаркандской области», «tadbirlar Andijon viloyatida»)
 * which are broader than city queries. Region → city mapping is held in
 * `EVENT_REGIONS`; the API is queried via `cities=` with every member
 * city's alias set, plus optional extra aliases for events whose `city`
 * field is the region's name itself.
 */

interface RegionPageProps {
  params: Promise<{ locale: string; region: string }>;
}

interface FaqEntry {
  question: string;
  answer: string;
}

function regionFaq(region: RegionDef, locale: Locale): FaqEntry[] {
  if (locale === "ru") {
    return [
      {
        question: `Какие события проходят в ${region.ruIn}?`,
        answer: `На этой странице — актуальная подборка мероприятий в ${region.ruIn}: конференции, форумы, хакатоны, бизнес-тренинги. Список обновляется автоматически.`,
      },
      {
        question: `Есть ли бесплатные события в ${region.ruIn}?`,
        answer: `Да. Большинство событий на EVENTFLOW проходят с бесплатной регистрацией. Используйте фильтр «бесплатные» в каталоге для уточнения.`,
      },
      {
        question: "Как зарегистрироваться?",
        answer:
          "Откройте страницу события и нажмите «Зарегистрироваться». QR-код приходит на почту и сканируется на входе.",
      },
      {
        question: "Как организатору опубликовать своё событие?",
        answer:
          "Зарегистрируйтесь на app.eventflow.uz, создайте событие за 5 минут и опубликуйте. Базовое размещение бесплатное.",
      },
    ];
  }
  if (locale === "uz") {
    return [
      {
        question: `${region.uzLoc} qanday tadbirlar boʻladi?`,
        answer: `Ushbu sahifada — ${region.uzLoc} tadbirlarning dolzarb tanlovi: konferensiyalar, forumlar, xakatonlar, biznes-treninglar. Roʻyxat avtomatik yangilanadi.`,
      },
      {
        question: `${region.uzLoc} bepul tadbirlar bormi?`,
        answer: `Ha. EVENTFLOW dagi tadbirlarning aksariyati bepul roʻyxatdan oʻtish bilan oʻtkaziladi. Katalogdagi «bepul» filtridan foydalaning.`,
      },
      {
        question: "Qanday roʻyxatdan oʻtaman?",
        answer:
          "Tadbir sahifasini oching va «Roʻyxatdan oʻtish» tugmasini bosing. QR-kod elektron pochtangizga keladi va kirishda skanerlanadi.",
      },
      {
        question: "Tashkilotchi tadbirini qanday eʼlon qiladi?",
        answer:
          "app.eventflow.uz da roʻyxatdan oʻting, 5 daqiqada tadbir yarating va eʼlon qiling. Asosiy joylashtirish bepul.",
      },
    ];
  }
  return [
    {
      question: `What events happen in ${region.en}?`,
      answer: `This page lists upcoming events in ${region.en}: conferences, forums, hackathons, and business trainings. The schedule auto-updates as organizers publish.`,
    },
    {
      question: `Are there free events in ${region.en}?`,
      answer: `Yes. Most events on EVENTFLOW run with free registration. Use the "free" filter in the catalog to narrow down.`,
    },
    {
      question: "How do I register?",
      answer:
        "Open the event page and click Register. A QR ticket arrives in your inbox and is scanned at the door.",
    },
    {
      question: "How can an organizer publish an event?",
      answer:
        "Sign up at app.eventflow.uz, create an event in 5 minutes, and publish. Basic listing is free.",
    },
  ];
}

export function generateStaticParams(): Array<{ region: string }> {
  return EVENT_REGIONS.map((r) => ({ region: r.slug }));
}

export async function generateMetadata({
  params,
}: RegionPageProps): Promise<Metadata> {
  const { locale: localeParam, region: regionSlug } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const region = getRegion(regionSlug);
  const path = `/events/region/${regionSlug}`;

  if (!region) {
    return { robots: { index: false, follow: false } };
  }

  const meta = buildPageMetadata({
    locale,
    path,
    title: regionHeading(region, locale),
    description: regionMetaDescription(region, locale),
  });

  const aliases = regionAliases(region);
  if (aliases.length === 0) {
    // Region has no member cities AND no extra aliases — never indexable.
    meta.robots = { index: false, follow: true };
    return meta;
  }

  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    cities: aliases,
    limit: 1,
  });
  if ((data?.items?.length ?? 0) === 0) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function RegionLandingPage({
  params,
}: RegionPageProps): Promise<React.ReactNode> {
  const { locale: localeParam, region: regionSlug } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const region = getRegion(regionSlug);
  if (!region) notFound();

  const t = createTranslator(locale);
  const heading = regionHeading(region, locale);
  const path = `/events/region/${regionSlug}`;

  const aliases = regionAliases(region);
  const data =
    aliases.length === 0
      ? undefined
      : await fetchPublicEventsServer({
          locale,
          filter: "upcoming",
          cities: aliases,
          limit: 50,
        });
  const events = data?.items ?? [];

  const itemList = itemListSchema(
    events
      .filter((e) => e.slug)
      .map((e) => ({ name: e.title, path: `/events/${e.slug}` })),
    locale,
  );
  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: t("public.navigation.events"), path: "/events" },
      { name: heading, path },
    ],
    locale,
  );
  const faqItems = regionFaq(region, locale);
  const faq = faqSchema(faqItems);

  // Cross-link to member cities + sibling regions for mesh.
  const memberCityLinks = region.cityCodes
    .map((code) => EVENT_CITIES.find((c) => c.code === code))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)
    .map((c) => ({
      label: cityName(c, locale),
      href: `/events/city/${c.code}`,
    }));
  const siblingRegions = EVENT_REGIONS.filter((r) => r.slug !== regionSlug)
    .slice(0, 6)
    .map((r) => ({
      label: regionName(r, locale),
      href: `/events/region/${r.slug}`,
    }));

  return (
    <>
      <JsonLd data={[breadcrumb, itemList, faq]} />
      <EventCollectionView
        events={events}
        eyebrow={t("public.navigation.events")}
        heading={heading}
        intro={regionIntro(region, locale)}
        emptyText={
          locale === "ru"
            ? `Пока нет предстоящих событий в ${region.ruIn}.`
            : locale === "uz"
              ? `${region.uzLoc} hozircha boʻladigan tadbirlar yoʻq.`
              : `No upcoming events in ${region.en} yet.`
        }
        browseAllLabel={
          locale === "ru"
            ? "Все события →"
            : locale === "uz"
              ? "Barcha tadbirlar →"
              : "Browse all events →"
        }
        locationFallback={
          locale === "ru"
            ? "Место уточняется"
            : locale === "uz"
              ? "Joy aniqlanmoqda"
              : "Location to be announced"
        }
        relatedLabel={
          locale === "ru"
            ? "Города и другие регионы"
            : locale === "uz"
              ? "Shaharlar va boshqa hududlar"
              : "Cities and other regions"
        }
        related={[...memberCityLinks, ...siblingRegions]}
      />
      <FaqSection
        heading={
          locale === "ru"
            ? `Частые вопросы о событиях в ${region.ruIn}`
            : locale === "uz"
              ? `${region.uzLoc} tadbirlar haqida tez-tez beriladigan savollar`
              : `Frequently asked questions about events in ${region.en}`
        }
        items={faqItems}
        surface="tinted"
      />
    </>
  );
}
