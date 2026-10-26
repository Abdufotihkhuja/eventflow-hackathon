import { createTranslator, type Locale } from "@eventflow/i18n";
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
 * `/events/this-month` — the medium-horizon date landing. Covers events
 * starting between now and the last second of the current calendar month
 * (Tashkent time). Auto-updates every render. noindex when empty.
 */

const TASHKENT_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

interface MonthRange {
  fromIso: string;
  toIso: string;
}

function thisMonthRange(now = new Date()): MonthRange {
  const tashkentNow = new Date(now.getTime() + TASHKENT_UTC_OFFSET_MS);
  const nextMonth = new Date(
    Date.UTC(
      tashkentNow.getUTCFullYear(),
      tashkentNow.getUTCMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    ),
  );
  return {
    fromIso: now.toISOString(),
    toIso: new Date(
      nextMonth.getTime() - TASHKENT_UTC_OFFSET_MS,
    ).toISOString(),
  };
}

interface DatePageProps {
  params: Promise<{ locale: string }>;
}

interface PageStrings {
  title: string;
  metaDescription: string;
  heading: string;
  intro: string;
  faqHeading: string;
  emptyText: string;
  browseAllLabel: string;
  locationFallback: string;
  breadcrumbLabel: string;
}

function strings(locale: Locale): PageStrings {
  if (locale === "ru") {
    return {
      title: "События в этом месяце в Узбекистане",
      metaDescription:
        "Афиша мероприятий до конца месяца: конференции, форумы, концерты и фестивали. Регистрация на EVENTFLOW.",
      heading: "События в этом месяце",
      intro:
        "Мероприятия, которые проходят до конца текущего месяца — конференции, форумы, лекции и культурные события.",
      faqHeading: "Частые вопросы о событиях этого месяца",
      emptyText: "В этом месяце событий пока не запланировано.",
      browseAllLabel: "Все события →",
      locationFallback: "Место уточняется",
      breadcrumbLabel: "В этом месяце",
    };
  }
  if (locale === "uz") {
    return {
      title: "Bu oyda Oʻzbekistonda nima qiziq",
      metaDescription:
        "Oy oxirigacha tadbirlar afishasi: konferensiyalar, forumlar, konsertlar va festivallar. EVENTFLOW orqali roʻyxatdan oʻtish.",
      heading: "Bu oydagi tadbirlar",
      intro:
        "Joriy oyning oxirigacha boʻladigan tadbirlar — konferensiyalar, forumlar, maʼruzalar va madaniy tadbirlar.",
      faqHeading: "Bu oydagi tadbirlar haqida savollar",
      emptyText: "Bu oyda tadbirlar hozircha yoʻq.",
      browseAllLabel: "Barcha tadbirlar →",
      locationFallback: "Joy aniqlanmoqda",
      breadcrumbLabel: "Bu oyda",
    };
  }
  return {
    title: "Events this month in Uzbekistan",
    metaDescription:
      "Schedule through the end of the month: conferences, forums, concerts, festivals. Register on EVENTFLOW.",
    heading: "Events this month",
    intro:
      "Events happening through the end of the current month — conferences, forums, lectures, and cultural events.",
    faqHeading: "Frequently asked questions about this month's events",
    emptyText: "No events this month yet.",
    browseAllLabel: "Browse all events →",
    locationFallback: "Location to be announced",
    breadcrumbLabel: "This month",
  };
}

interface FaqEntry {
  question: string;
  answer: string;
}

function monthFaq(locale: Locale): FaqEntry[] {
  if (locale === "ru") {
    return [
      {
        question: "Какие события показывает эта страница?",
        answer:
          "Все события, начинающиеся между сейчас и концом текущего календарного месяца по Ташкенту.",
      },
      {
        question: "Можно ли фильтровать по городу?",
        answer:
          "Да — откройте страницу любого города (например, /events/city/tashkent) или категории. Этот список объединяет всё за месяц.",
      },
      {
        question: "Когда обновляется список?",
        answer:
          "Автоматически при каждом открытии страницы — новые события появляются сразу после публикации организатором.",
      },
    ];
  }
  if (locale === "uz") {
    return [
      {
        question: "Bu sahifada qanday tadbirlar koʻrsatiladi?",
        answer:
          "Toshkent vaqti boʻyicha hozirdan to joriy taqvim oyining oxirigacha boshlanadigan barcha tadbirlar.",
      },
      {
        question: "Shahar boʻyicha filtrlash mumkinmi?",
        answer:
          "Ha — istalgan shahar (masalan, /events/city/tashkent) yoki kategoriya sahifasini oching. Bu roʻyxat oy boʻyicha hammasini jamlaydi.",
      },
      {
        question: "Roʻyxat qachon yangilanadi?",
        answer:
          "Sahifa ochilgan har safar avtomatik — yangi tadbirlar tashkilotchi eʼlon qilgandan keyin darhol koʻrinadi.",
      },
    ];
  }
  return [
    {
      question: "Which events does this page show?",
      answer:
        "Every event starting between now and the end of the current calendar month in Tashkent time.",
    },
    {
      question: "Can I filter by city?",
      answer:
        "Yes — open any city page (for example /events/city/tashkent) or category. This list aggregates the whole month.",
    },
    {
      question: "When does the list update?",
      answer:
        "Automatically on every page open — new events appear as soon as the organizer publishes.",
    },
  ];
}

export async function generateMetadata({
  params,
}: DatePageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const s = strings(locale);

  const meta = buildPageMetadata({
    locale,
    path: "/events/this-month",
    title: s.title,
    description: s.metaDescription,
  });

  const { fromIso, toIso } = thisMonthRange();
  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    limit: 50,
  });
  const inRange =
    data?.items?.some(
      (e) =>
        typeof e.startDate === "string" &&
        e.startDate >= fromIso &&
        e.startDate < toIso,
    ) ?? false;
  if (!inRange) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function ThisMonthPage({
  params,
}: DatePageProps): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);
  const s = strings(locale);

  const { fromIso, toIso } = thisMonthRange();
  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    limit: 50,
  });
  const events = (data?.items ?? []).filter(
    (e) =>
      typeof e.startDate === "string" &&
      e.startDate >= fromIso &&
      e.startDate < toIso,
  );

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
      { name: s.breadcrumbLabel, path: "/events/this-month" },
    ],
    locale,
  );
  const faqItems = monthFaq(locale);
  const faq = faqSchema(faqItems);

  return (
    <>
      <JsonLd data={[breadcrumb, itemList, faq]} />
      <EventCollectionView
        events={events}
        eyebrow={t("public.navigation.events")}
        heading={s.heading}
        intro={s.intro}
        emptyText={s.emptyText}
        browseAllLabel={s.browseAllLabel}
        locationFallback={s.locationFallback}
      />
      <FaqSection heading={s.faqHeading} items={faqItems} surface="tinted" />
    </>
  );
}
