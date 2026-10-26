import { notFound } from "next/navigation";

import { createTranslator, type Locale } from "@eventflow/i18n";
import {
  EVENT_CITIES,
  cityAliases,
  cityHeading,
  cityIntro,
  cityMetaDescription,
  cityName,
  getCity,
  type CityDef,
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
 * City landing pages — one indexable URL per supported Uzbek city.
 *
 * GEO play: queries like "events in Tashkent" / "konsert Toshkent" /
 * "мероприятия в Ташкенте" map directly to these pages, each carrying its
 * own H1, Event ItemList, FAQ schema, and Breadcrumb. The catalog filter
 * runs against ALL spellings of the city (en/ru/uz/code) via the API's
 * `cities` OR-filter — the DB stores mixed forms, so a single canonical
 * slug needs to fan out to every variant to pick up the full event set.
 */

interface CityPageProps {
  params: Promise<{ locale: string; city: string }>;
}

export function generateStaticParams(): Array<{ city: string }> {
  return EVENT_CITIES.map((c) => ({ city: c.code }));
}

interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Localized FAQ tailored to a city. Uses the right grammatical case per
 * locale — Russian prepositional ("в Ташкенте"), Uzbek locative
 * ("Toshkentda" / "Toshkentdagi") — so the answers read naturally.
 */
function cityFaq(city: CityDef, locale: Locale): FaqEntry[] {
  if (locale === "ru") {
    // ruIn = prepositional case ("в Ташкенте"), ru = nominative.
    return [
      {
        question: `Какие мероприятия проходят в ${city.ruIn}?`,
        answer: `На EVENTFLOW публикуются актуальные конференции, форумы, бизнес-тренинги, хакатоны и воркшопы в ${city.ruIn}. Список выше обновляется автоматически — последние подтверждённые события идут первыми.`,
      },
      {
        question: "Как зарегистрироваться на мероприятие?",
        answer:
          "Откройте страницу события и нажмите кнопку регистрации. Регистрация на большинстве событий бесплатна и занимает меньше минуты. На указанную почту приходит QR-код для входа.",
      },
      {
        question: `Есть ли бесплатные события в ${city.ruIn}?`,
        answer: `Да. Используйте фильтр «бесплатные» в каталоге — большинство мероприятий в ${city.ruIn} организаторы делают с открытым входом или по бесплатной регистрации.`,
      },
      {
        question: "Как организатору опубликовать своё событие?",
        answer:
          "Зарегистрируйтесь как организатор на app.eventflow.uz, создайте событие за 5 минут, добавьте площадку и опубликуйте. Площадка бесплатная — берём комиссию только с платных билетов.",
      },
    ];
  }
  if (locale === "uz") {
    // uzLoc carries the locative suffix ("Toshkentdagi"); for the question
    // headers we use plain "<city>da" derived from the nominative form.
    const inCity = `${city.uz}da`;
    return [
      {
        question: `${inCity} qanday tadbirlar boʻladi?`,
        answer: `EVENTFLOW da ${city.uzLoc} yaqin konferensiyalar, forumlar, biznes-treninglar, xakatonlar va ustaxonalar eʼlon qilinadi. Yuqoridagi roʻyxat avtomatik yangilanadi.`,
      },
      {
        question: "Tadbirga qanday roʻyxatdan oʻtaman?",
        answer:
          "Tadbir sahifasini oching va roʻyxatdan oʻtish tugmasini bosing. Koʻp tadbirlarda roʻyxatdan oʻtish bepul va bir daqiqadan kam vaqt oladi. Kirish uchun QR-kod elektron pochtangizga yuboriladi.",
      },
      {
        question: `${inCity} bepul tadbirlar bormi?`,
        answer: `Ha. Katalogdagi «bepul» filtridan foydalaning — ${city.uzLoc} tadbirlar koʻpchiligi tashkilotchilar tomonidan bepul kirish yoki bepul roʻyxatdan oʻtish bilan oʻtkaziladi.`,
      },
      {
        question: "Tashkilotchi sifatida tadbirimni qanday eʼlon qilaman?",
        answer:
          "app.eventflow.uz da tashkilotchi sifatida roʻyxatdan oʻting, 5 daqiqada tadbir yarating va eʼlon qiling. Platforma bepul — faqat pullik chiptalardan komissiya olamiz.",
      },
    ];
  }
  return [
    {
      question: `What events are happening in ${city.en}?`,
      answer: `EVENTFLOW lists upcoming conferences, forums, business trainings, hackathons, and workshops in ${city.en}. The list above auto-updates with the latest confirmed events.`,
    },
    {
      question: "How do I register for an event?",
      answer:
        "Open an event page and click the register button. Most events are free and registration takes under a minute. You'll receive a QR ticket by email for entry.",
    },
    {
      question: `Are there free events in ${city.en}?`,
      answer: `Yes. Use the "free" filter in the catalog — most organizers in ${city.en} run events with open admission or free registration.`,
    },
    {
      question: "How can an organizer publish an event?",
      answer:
        "Sign up as an organizer at app.eventflow.uz, create an event in 5 minutes, add the venue, and publish. The platform is free — we only take commission on paid tickets.",
    },
  ];
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { locale: localeParam, city } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const def = getCity(city);
  const path = `/events/city/${city}`;

  if (!def) {
    return { robots: { index: false, follow: false } };
  }

  const meta = buildPageMetadata({
    locale,
    path,
    title: cityHeading(def, locale),
    description: cityMetaDescription(def, locale),
  });

  // Don't index a city that has no upcoming events yet (avoid thin pages);
  // stays crawlable so links are followed and indexing happens once events
  // appear. Same pattern as category landings.
  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    cities: cityAliases(def),
    limit: 1,
  });
  if ((data?.items?.length ?? 0) === 0) {
    meta.robots = { index: false, follow: true };
  }

  return meta;
}

export default async function CityLandingPage({
  params,
}: CityPageProps): Promise<React.ReactNode> {
  const { locale: localeParam, city } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const def = getCity(city);
  if (!def) notFound();

  const t = createTranslator(locale);
  const heading = cityHeading(def, locale);
  const path = `/events/city/${city}`;

  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    cities: cityAliases(def),
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
  const faqItems = cityFaq(def, locale);
  const faq = faqSchema(faqItems);

  // Sibling cities for cross-linking (mesh + crawl discovery).
  const related = EVENT_CITIES.filter((c) => c.code !== city).map((c) => ({
    label: cityName(c, locale),
    href: `/events/city/${c.code}`,
  }));

  const faqHeading =
    locale === "ru"
      ? `Частые вопросы о событиях в ${def.ruIn}`
      : locale === "uz"
        ? `${def.uzLoc} tadbirlar haqida tez-tez beriladigan savollar`
        : `Frequently asked questions about events in ${def.en}`;

  return (
    <>
      <JsonLd data={[breadcrumb, itemList, faq]} />
      <EventCollectionView
        events={events}
        eyebrow={t("public.navigation.events")}
        heading={heading}
        intro={cityIntro(def, locale)}
        emptyText={
          locale === "ru"
            ? `Пока нет предстоящих событий в ${def.ruIn}.`
            : locale === "uz"
              ? `${def.uzLoc} hozircha boʻladigan tadbirlar yoʻq.`
              : `No upcoming events in ${def.en} yet.`
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
            ? "Другие города"
            : locale === "uz"
              ? "Boshqa shaharlar"
              : "Other cities"
        }
        related={related}
      />
      <FaqSection heading={faqHeading} items={faqItems} surface="tinted" />
    </>
  );
}
