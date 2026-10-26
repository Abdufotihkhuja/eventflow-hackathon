import { notFound } from "next/navigation";

import { createTranslator, plural, type Locale } from "@eventflow/i18n";

import { organizerAppUrl } from "@shared/config";
import {
  EVENT_CATEGORIES,
  categoryHeading,
  categoryName,
  getCategory,
} from "@shared/lib/catalog-taxonomy";
import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import {
  breadcrumbSchema,
  faqSchema,
  itemListSchema,
} from "@shared/lib/json-ld";
import { EVENTS_PLURAL } from "@shared/lib/plurals";
import { buildPageMetadata } from "@shared/lib/seo";
import {
  fetchPublicCategoriesServer,
  fetchPublicEventsServer,
} from "@shared/lib/server-data";
import { categoryFaq } from "@shared/lib/site-faq";
import { resolveMediaUrl } from "@shared/lib/utils";
import { FaqSection } from "@shared/ui/faq-section";
import { JsonLd } from "@shared/ui/json-ld";
import { EventCollectionView } from "@widgets/events/landing";

import type { Metadata } from "next";

interface CategoryPageProps {
  params: Promise<{ locale: string; category: string }>;
}

export function generateStaticParams(): Array<{ category: string }> {
  return EVENT_CATEGORIES.map((c) => ({ category: c.slug }));
}

function intro(locale: Locale, name: string): string {
  const lower = name.toLowerCase();
  if (locale === "ru")
    return `Предстоящие ${lower} в Узбекистане: даты, площадки и регистрация на EVENTFLOW.`;
  if (locale === "uz")
    return `Oʻzbekistondagi yaqin ${lower}: sanalar, joylar va EVENTFLOW orqali roʻyxatdan oʻtish.`;
  return `Upcoming ${lower} in Uzbekistan — dates, venues, and free registration on EVENTFLOW.`;
}

/**
 * Copy for a category landing. Kept in one place because the empty state — the
 * common case while a category fills up — needs a full set of strings, not a
 * single sentence: heading, explanation, and the labels of the past-events
 * fallback shown instead of a blank page.
 */
function copy(
  locale: Locale,
  name: string,
): {
  meta: (n: number) => string;
  emptyTitle: string;
  emptyText: string;
  emptyAction: string;
  pastHeading: string;
  pastNote: string;
  pastAll: string;
  browseAll: string;
  related: string;
  locationFallback: string;
} {
  if (locale === "ru") {
    return {
      meta: (n) => `${plural("ru", n, EVENTS_PLURAL)} впереди`,
      emptyTitle: `Пока нет предстоящих событий в категории «${name}»`,
      emptyText:
        "Новые события появляются здесь сразу после публикации организатором. Посмотрите ближайшие события платформы или выберите другую тему ниже.",
      emptyAction: "Создать событие",
      pastHeading: `Уже прошли в категории «${name}»`,
      pastNote:
        "Эти события завершились, но их страницы открыты — с программой, спикерами и организаторами.",
      pastAll: "Все прошедшие →",
      browseAll: "Все события →",
      related: "Другие категории",
      locationFallback: "Место уточняется",
    };
  }
  if (locale === "uz") {
    return {
      meta: (n) => `${plural("uz", n, EVENTS_PLURAL)} kelmoqda`,
      emptyTitle: `«${name}» yoʻnalishida hozircha rejalashtirilgan tadbirlar yoʻq`,
      emptyText:
        "Yangi tadbirlar tashkilotchi eʼlon qilishi bilan shu yerda paydo boʻladi. Platformadagi yaqin tadbirlarni koʻring yoki quyidan boshqa yoʻnalishni tanlang.",
      emptyAction: "Tadbir yaratish",
      pastHeading: `«${name}» yoʻnalishida oʻtgan tadbirlar`,
      pastNote:
        "Bu tadbirlar yakunlangan, ammo ularning sahifalari ochiq — dastur, spikerlar va tashkilotchilar bilan.",
      pastAll: "Barcha oʻtgan tadbirlar →",
      browseAll: "Barcha tadbirlar →",
      related: "Boshqa yoʻnalishlar",
      locationFallback: "Joy aniqlanmoqda",
    };
  }
  return {
    meta: (n) => `${plural("en", n, EVENTS_PLURAL)} upcoming`,
    emptyTitle: `No upcoming ${name.toLowerCase()} yet`,
    emptyText:
      "New events show up here the moment an organizer publishes them. Browse what's coming up across the platform, or pick another topic below.",
    emptyAction: "Create an event",
    pastHeading: `Recently held ${name.toLowerCase()}`,
    pastNote:
      "These events have wrapped up, but their pages stay open — agenda, speakers, and organizers included.",
    pastAll: "All past events →",
    browseAll: "Browse all events →",
    related: "Other categories",
    locationFallback: "Location to be announced",
  };
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { locale: localeParam, category } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const def = getCategory(category);
  const path = `/events/category/${category}`;

  if (!def) {
    return { robots: { index: false, follow: false } };
  }

  const meta = buildPageMetadata({
    locale,
    path,
    title: categoryHeading(def, locale),
    description: intro(locale, categoryName(def, locale)),
  });

  // Don't index a category that has no upcoming events yet (avoid thin pages);
  // it stays crawlable so links are followed and it indexes once populated.
  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    category,
    limit: 1,
  });
  if ((data?.items?.length ?? 0) === 0) {
    meta.robots = { index: false, follow: true };
  }

  return meta;
}

export default async function CategoryLandingPage({
  params,
}: CategoryPageProps): Promise<React.ReactNode> {
  const { locale: localeParam, category } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const def = getCategory(category);
  if (!def) notFound();

  const t = createTranslator(locale);
  const name = categoryName(def, locale);
  const heading = categoryHeading(def, locale);
  const path = `/events/category/${category}`;
  const c = copy(locale, name);

  // Past events and the category counters are fetched alongside the main list:
  // both only matter when the category is empty (fallback content + labelling
  // the sibling chips), and one round trip keeps the page fast either way.
  const [data, pastData, categories] = await Promise.all([
    fetchPublicEventsServer({
      locale,
      filter: "upcoming",
      category,
      limit: 50,
    }),
    fetchPublicEventsServer({
      locale,
      filter: "past",
      category,
      limit: 3,
    }),
    fetchPublicCategoriesServer(locale),
  ]);
  const events = data?.items ?? [];
  const pastEvents = pastData?.items ?? [];
  const bySlug = new Map(categories.map((cat) => [cat.slug, cat]));

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

  // Same card object as the catalog band on the home page — icon, name, count.
  // Sorted so topics that actually have something scheduled come first: an
  // empty category shouldn't hand the visitor a row of equal-looking dead ends.
  const related = EVENT_CATEGORIES.filter((cat) => cat.slug !== category)
    .map((cat) => {
      const apiCat = bySlug.get(cat.slug);
      const count = apiCat?.upcomingCount ?? 0;
      const icon = apiCat?.icon;
      return {
        label: categoryName(cat, locale),
        href: `/events/category/${cat.slug}`,
        count,
        countLabel: count > 0 ? plural(locale, count, EVENTS_PLURAL) : undefined,
        icon: cat.icon,
        iconUrl: icon ? resolveMediaUrl(icon) : undefined,
      };
    })
    .sort((a, b) => b.count - a.count);

  const faqItems = categoryFaq(def, locale);
  const faq = faqSchema(faqItems);
  const faqHeadingText =
    locale === "ru"
      ? `Частые вопросы о категории «${def.ru}»`
      : locale === "uz"
        ? `«${def.uz}» kategoriyasi haqida tez-tez beriladigan savollar`
        : `Frequently asked questions about ${def.en.toLowerCase()}`;

  return (
    <>
      <JsonLd data={[breadcrumb, itemList, faq]} />
      <EventCollectionView
        events={events}
        eyebrow={t("public.navigation.events")}
        heading={heading}
        intro={intro(locale, name)}
        meta={c.meta(data?.total ?? events.length)}
        emptyTitle={c.emptyTitle}
        emptyText={c.emptyText}
        emptyAction={{
          label: c.emptyAction,
          href: organizerAppUrl,
          external: true,
        }}
        pastEvents={pastEvents}
        pastHeading={c.pastHeading}
        pastNote={c.pastNote}
        pastAllLabel={c.pastAll}
        browseAllLabel={c.browseAll}
        locationFallback={c.locationFallback}
        relatedLabel={c.related}
        relatedLayout="cards"
        related={related}
      />
      <FaqSection heading={faqHeadingText} items={faqItems} surface="tinted" />
    </>
  );
}
