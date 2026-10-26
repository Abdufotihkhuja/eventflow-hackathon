import { notFound } from "next/navigation";

import { createTranslator, type Locale } from "@eventflow/i18n";
import {
  EVENT_CATEGORIES,
  EVENT_CITIES,
  categoryName,
  cityAliases,
  cityHeading,
  cityName,
  getCategory,
  getCity,
  type CategoryDef,
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
 * Compound landing — `/events/city/[city]/category/[category]`. Targets
 * the long-tail compound query that dominates real-world intent in UZ:
 * «хакатоны в Ташкенте», «AI workshops Tashkent», «konsertlar Samarqand».
 *
 * Full 10 cities × 7 categories grid = 70 base URLs × 3 locales = 210.
 * Most cells are empty on an early-stage platform; they `noindex,follow`
 * automatically so we don't pollute the index. As content arrives the
 * cells flip to indexable without any code change.
 */

interface CompoundPageProps {
  params: Promise<{ locale: string; city: string; category: string }>;
}

interface FaqEntry {
  question: string;
  answer: string;
}

/** Localized H1 / title — combines city locative + category. */
function compoundHeading(
  city: CityDef,
  category: CategoryDef,
  locale: Locale,
): string {
  if (locale === "ru") {
    return `${category.ru} в ${city.ruIn}`;
  }
  if (locale === "uz") {
    return `${city.uzLoc} ${category.uz.toLowerCase()}`;
  }
  return `${category.en} in ${city.en}`;
}

function compoundIntro(
  city: CityDef,
  category: CategoryDef,
  locale: Locale,
): string {
  if (locale === "ru") {
    return `Афиша на категорию «${category.ru}» в ${city.ruIn}. Даты, площадки и регистрация на EVENTFLOW.`;
  }
  if (locale === "uz") {
    return `${city.uzLoc} «${category.uz}» kategoriyasi boʻyicha afisha. Sanalar, joylar va EVENTFLOW orqali roʻyxatdan oʻtish.`;
  }
  return `${category.en} happening in ${city.en} — dates, venues, and registration on EVENTFLOW.`;
}

function compoundMetaDescription(
  city: CityDef,
  category: CategoryDef,
  locale: Locale,
): string {
  if (locale === "ru") {
    return `${category.ru} в ${city.ruIn}: предстоящие даты, регистрация и контакты организаторов на EVENTFLOW.`;
  }
  if (locale === "uz") {
    return `${city.uzLoc} ${category.uz.toLowerCase()}: yaqin sanalar, roʻyxatdan oʻtish va tashkilotchilar kontaktlari EVENTFLOW da.`;
  }
  return `${category.en} in ${city.en}: upcoming dates, registration, and organizer contacts on EVENTFLOW.`;
}

function compoundFaq(
  city: CityDef,
  category: CategoryDef,
  locale: Locale,
): FaqEntry[] {
  if (locale === "ru") {
    const catLower = category.ru.toLowerCase();
    return [
      {
        question: `Где найти ${catLower} в ${city.ruIn}?`,
        answer: `На этой странице — актуальная подборка категории «${category.ru}» в ${city.ruIn}. Список обновляется автоматически после публикации организаторами.`,
      },
      {
        question: `Есть ли бесплатные ${catLower} в ${city.ruIn}?`,
        answer: `Да, большинство событий категории «${category.ru}» в ${city.ruIn} проходят с бесплатной регистрацией. Точные условия — на странице каждого события.`,
      },
      {
        question: `Как зарегистрироваться?`,
        answer:
          "Откройте страницу события и нажмите «Зарегистрироваться». QR-код приходит на почту и сканируется на входе.",
      },
    ];
  }
  if (locale === "uz") {
    return [
      {
        question: `${city.uzLoc} ${category.uz.toLowerCase()}ni qayerdan topaman?`,
        answer: `Ushbu sahifada — ${city.uzLoc} «${category.uz}» kategoriyasining dolzarb tanlovi. Roʻyxat tashkilotchilar eʼlon qilgandan keyin avtomatik yangilanadi.`,
      },
      {
        question: `${city.uzLoc} bepul ${category.uz.toLowerCase()} bormi?`,
        answer: `Ha, ${city.uzLoc} «${category.uz}» kategoriyasidagi tadbirlarning aksariyati bepul roʻyxatdan oʻtish bilan oʻtkaziladi. Aniq shartlar har bir tadbir sahifasida.`,
      },
      {
        question: "Qanday roʻyxatdan oʻtaman?",
        answer:
          "Tadbir sahifasini oching va «Roʻyxatdan oʻtish» tugmasini bosing. QR-kod elektron pochtangizga keladi va kirishda skanerlanadi.",
      },
    ];
  }
  const catLower = category.en.toLowerCase();
  return [
    {
      question: `Where can I find ${catLower} in ${city.en}?`,
      answer: `This page lists the current ${catLower} in ${city.en}. The schedule auto-updates as organizers publish.`,
    },
    {
      question: `Are there free ${catLower} in ${city.en}?`,
      answer: `Yes, most events in the ${category.en} category in ${city.en} run with free registration. Exact terms appear on each event page.`,
    },
    {
      question: "How do I register?",
      answer:
        "Open the event page and click Register. A QR ticket arrives in your inbox and is scanned at the door.",
    },
  ];
}

export function generateStaticParams(): Array<{
  city: string;
  category: string;
}> {
  const out: Array<{ city: string; category: string }> = [];
  for (const c of EVENT_CITIES) {
    for (const cat of EVENT_CATEGORIES) {
      out.push({ city: c.code, category: cat.slug });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: CompoundPageProps): Promise<Metadata> {
  const {
    locale: localeParam,
    city: cityCode,
    category: categorySlug,
  } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const city = getCity(cityCode);
  const category = getCategory(categorySlug);
  const path = `/events/city/${cityCode}/category/${categorySlug}`;

  if (!city || !category) {
    return { robots: { index: false, follow: false } };
  }

  const meta = buildPageMetadata({
    locale,
    path,
    title: compoundHeading(city, category, locale),
    description: compoundMetaDescription(city, category, locale),
  });

  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    cities: cityAliases(city),
    category: categorySlug,
    limit: 1,
  });
  if ((data?.items?.length ?? 0) === 0) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function CompoundLandingPage({
  params,
}: CompoundPageProps): Promise<React.ReactNode> {
  const {
    locale: localeParam,
    city: cityCode,
    category: categorySlug,
  } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const city = getCity(cityCode);
  const category = getCategory(categorySlug);
  if (!city || !category) notFound();

  const t = createTranslator(locale);
  const heading = compoundHeading(city, category, locale);
  const path = `/events/city/${cityCode}/category/${categorySlug}`;

  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    cities: cityAliases(city),
    category: categorySlug,
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
      { name: cityHeading(city, locale), path: `/events/city/${cityCode}` },
      { name: heading, path },
    ],
    locale,
  );
  const faqItems = compoundFaq(city, category, locale);
  const faq = faqSchema(faqItems);

  const relatedCategories = EVENT_CATEGORIES.filter(
    (c) => c.slug !== categorySlug,
  )
    .slice(0, 6)
    .map((c) => ({
      label: categoryName(c, locale),
      href: `/events/city/${cityCode}/category/${c.slug}`,
    }));
  const relatedCities = EVENT_CITIES.filter((c) => c.code !== cityCode)
    .slice(0, 6)
    .map((c) => ({
      label: cityName(c, locale),
      href: `/events/city/${c.code}/category/${categorySlug}`,
    }));

  return (
    <>
      <JsonLd data={[breadcrumb, itemList, faq]} />
      <EventCollectionView
        events={events}
        eyebrow={t("public.navigation.events")}
        heading={heading}
        intro={compoundIntro(city, category, locale)}
        emptyText={
          locale === "ru"
            ? `Пока нет событий категории «${category.ru}» в ${city.ruIn}.`
            : locale === "uz"
              ? `${city.uzLoc} «${category.uz}» kategoriyasidagi tadbirlar hozircha yoʻq.`
              : `No ${category.en.toLowerCase()} scheduled in ${city.en} yet.`
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
            ? "Другие категории"
            : locale === "uz"
              ? "Boshqa yoʻnalishlar"
              : "Other categories"
        }
        related={[...relatedCategories, ...relatedCities]}
      />
      <FaqSection
        heading={
          locale === "ru"
            ? `Частые вопросы о ${category.ru.toLowerCase()} в ${city.ruIn}`
            : locale === "uz"
              ? `${city.uzLoc} ${category.uz.toLowerCase()} haqida tez-tez beriladigan savollar`
              : `Frequently asked questions about ${category.en.toLowerCase()} in ${city.en}`
        }
        items={faqItems}
        surface="tinted"
      />
    </>
  );
}
