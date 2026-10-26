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
 * `/events/this-weekend` — date-scoped landing for high-intent "куда сходить
 * на выходные" / "what to do this weekend" queries. Range is computed at
 * render time (next Saturday 00:00 → next Sunday 23:59 in Asia/Tashkent),
 * and events are filtered SSR-side from the upcoming list so the HTML
 * always reflects fresh content.
 */

// Tashkent is UTC+5 year-round (no DST). Computing the weekend window in
// this offset keeps the page locally-correct without pulling tz libraries.
const TASHKENT_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

interface WeekendRange {
  fromIso: string;
  toIso: string;
}

function nextWeekendRange(now = new Date()): WeekendRange {
  const tashkentNow = new Date(now.getTime() + TASHKENT_UTC_OFFSET_MS);
  const day = tashkentNow.getUTCDay(); // 0=Sun..6=Sat (treated as Tashkent date)
  // If today is Sat (6) or Sun (0), include the rest of today; else jump
  // forward to next Saturday.
  const daysToSat = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
  const sat = new Date(tashkentNow);
  sat.setUTCDate(sat.getUTCDate() + daysToSat);
  sat.setUTCHours(0, 0, 0, 0);
  const monday = new Date(sat);
  monday.setUTCDate(monday.getUTCDate() + 2); // Sat + 2 days = Mon 00:00
  return {
    fromIso: new Date(sat.getTime() - TASHKENT_UTC_OFFSET_MS).toISOString(),
    toIso: new Date(monday.getTime() - TASHKENT_UTC_OFFSET_MS).toISOString(),
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
      title: "Куда сходить на выходных в Узбекистане",
      metaDescription:
        "Афиша мероприятий на ближайшие выходные: концерты, лекции, мастер-классы, фестивали. Регистрация на EVENTFLOW.",
      heading: "Куда сходить на выходных",
      intro:
        "Мероприятия на ближайшие субботу и воскресенье — от лекций и воркшопов до концертов и фестивалей.",
      faqHeading: "Частые вопросы о событиях на выходных",
      emptyText: "На ближайшие выходные событий пока не запланировано.",
      browseAllLabel: "Все события →",
      locationFallback: "Место уточняется",
      breadcrumbLabel: "На выходных",
    };
  }
  if (locale === "uz") {
    return {
      title: "Oʻzbekistonda dam olish kunlari nima qilish",
      metaDescription:
        "Yaqin dam olish kunlari uchun tadbirlar afishasi: konsertlar, maʼruzalar, ustaxonalar, festivallar. EVENTFLOW orqali roʻyxatdan oʻtish.",
      heading: "Dam olish kunlari uchun tadbirlar",
      intro:
        "Yaqin shanba va yakshanba kunlari uchun tadbirlar — maʼruzalardan tortib konsertlar va festivallargacha.",
      faqHeading: "Dam olish kunlari tadbirlari haqida savollar",
      emptyText: "Yaqin dam olish kunlari uchun tadbirlar hozircha yoʻq.",
      browseAllLabel: "Barcha tadbirlar →",
      locationFallback: "Joy aniqlanmoqda",
      breadcrumbLabel: "Dam olish kunlari",
    };
  }
  return {
    title: "What to do this weekend in Uzbekistan",
    metaDescription:
      "This weekend's schedule: concerts, lectures, workshops, festivals. Register on EVENTFLOW.",
    heading: "Events this weekend",
    intro:
      "Events scheduled for this Saturday and Sunday — from lectures and workshops to concerts and festivals.",
    faqHeading: "Frequently asked questions about weekend events",
    emptyText: "No events for this weekend yet.",
    browseAllLabel: "Browse all events →",
    locationFallback: "Location to be announced",
    breadcrumbLabel: "This weekend",
  };
}

interface FaqEntry {
  question: string;
  answer: string;
}

function weekendFaq(locale: Locale): FaqEntry[] {
  if (locale === "ru") {
    return [
      {
        question: "Какие события показывает эта страница?",
        answer:
          "Только те, что начинаются в ближайшую субботу или воскресенье по ташкентскому времени. Окно обновляется автоматически каждую неделю.",
      },
      {
        question: "Все события платные?",
        answer:
          "Нет — большинство мероприятий на EVENTFLOW бесплатные. Платные показывают стоимость в сумах прямо на карточке.",
      },
      {
        question: "Что если планы изменятся?",
        answer:
          "В личном кабинете можно отменить регистрацию за минуту — это поможет организатору точнее планировать.",
      },
    ];
  }
  if (locale === "uz") {
    return [
      {
        question: "Bu sahifada qanday tadbirlar koʻrsatiladi?",
        answer:
          "Faqat yaqin shanba yoki yakshanbada Toshkent vaqti boʻyicha boshlanadigan tadbirlar. Oyna har hafta avtomatik yangilanadi.",
      },
      {
        question: "Barcha tadbirlar pullikmi?",
        answer:
          "Yoʻq — EVENTFLOW dagi tadbirlarning aksariyati bepul. Pullik tadbirlar narxni kartochkada darhol koʻrsatadi.",
      },
      {
        question: "Reja oʻzgarsa nima boʻladi?",
        answer:
          "Profilingizda roʻyxatdan oʻtishni bir daqiqada bekor qilish mumkin — bu tashkilotchiga aniqroq rejalashtirishga yordam beradi.",
      },
    ];
  }
  return [
    {
      question: "Which events does this page show?",
      answer:
        "Only events starting this Saturday or Sunday in Tashkent time. The window auto-updates every week.",
    },
    {
      question: "Are all events paid?",
      answer:
        "No — most events on EVENTFLOW are free. Paid events show their price in Uzbek som right on the card.",
    },
    {
      question: "What if my plans change?",
      answer:
        "You can cancel registration from your profile in under a minute — it helps the organizer plan attendance accurately.",
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
    path: "/events/this-weekend",
    title: s.title,
    description: s.metaDescription,
  });

  // Filter the upcoming list down to the weekend window; if nothing falls
  // into it, noindex so we don't ship an empty page to the SERP.
  const { fromIso, toIso } = nextWeekendRange();
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

export default async function ThisWeekendPage({
  params,
}: DatePageProps): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);
  const s = strings(locale);

  const { fromIso, toIso } = nextWeekendRange();
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
      { name: s.breadcrumbLabel, path: "/events/this-weekend" },
    ],
    locale,
  );
  const faqItems = weekendFaq(locale);
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
