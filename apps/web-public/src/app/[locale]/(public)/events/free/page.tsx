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
 * `/events/free` — landing for the highest-intent filter on an early-stage
 * platform: free events. Captures queries like «бесплатные мероприятия в
 * Узбекистане», «free events Tashkent», «bepul tadbirlar» — these convert
 * better than generic catalog browsing because intent is already qualified.
 * SSR'd with breadcrumb + ItemList + FAQ JSON-LD. `noindex,follow` when
 * the list is empty (same anti-thin policy as city / category landings).
 */

interface FreeEventsPageProps {
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
      title: "Бесплатные мероприятия в Узбекистане",
      metaDescription:
        "Афиша бесплатных мероприятий по всей стране: лекции, мастер-классы, конференции и хакатоны с открытым входом. Регистрация на EVENTFLOW.",
      heading: "Бесплатные мероприятия",
      intro:
        "Открытые лекции, воркшопы, хакатоны и конференции — без оплаты участия. Большинство событий на EVENTFLOW бесплатные; этот список обновляется автоматически.",
      faqHeading: "Частые вопросы о бесплатных мероприятиях",
      emptyText: "Пока нет бесплатных мероприятий в афише.",
      browseAllLabel: "Все события →",
      locationFallback: "Место уточняется",
      breadcrumbLabel: "Бесплатные",
    };
  }
  if (locale === "uz") {
    return {
      title: "Oʻzbekistondagi bepul tadbirlar",
      metaDescription:
        "Mamlakat boʻyicha bepul tadbirlar afishasi: maʼruzalar, ustaxonalar, konferensiyalar va xakatonlar. EVENTFLOW orqali roʻyxatdan oʻtish.",
      heading: "Bepul tadbirlar",
      intro:
        "Ochiq maʼruzalar, ustaxonalar, xakatonlar va konferensiyalar — bepul. EVENTFLOW dagi tadbirlarning aksariyati bepul; bu roʻyxat avtomatik yangilanadi.",
      faqHeading: "Bepul tadbirlar haqida tez-tez beriladigan savollar",
      emptyText: "Hozircha bepul tadbirlar yoʻq.",
      browseAllLabel: "Barcha tadbirlar →",
      locationFallback: "Joy aniqlanmoqda",
      breadcrumbLabel: "Bepul",
    };
  }
  return {
    title: "Free events in Uzbekistan",
    metaDescription:
      "Free events across Uzbekistan: open lectures, workshops, conferences, and hackathons with no admission fee. Register on EVENTFLOW.",
    heading: "Free events",
    intro:
      "Open lectures, workshops, hackathons, and conferences — no admission fee. Most events on EVENTFLOW are free; this list auto-updates.",
    faqHeading: "Frequently asked questions about free events",
    emptyText: "No free events yet.",
    browseAllLabel: "Browse all events →",
    locationFallback: "Location to be announced",
    breadcrumbLabel: "Free",
  };
}

interface FaqEntry {
  question: string;
  answer: string;
}

function freeFaq(locale: Locale): FaqEntry[] {
  if (locale === "ru") {
    return [
      {
        question: "Все ли мероприятия на EVENTFLOW бесплатные?",
        answer:
          "На раннем этапе платформы большинство событий — бесплатные. Платные события прозрачно показывают стоимость в сумах. Эта страница агрегирует только бесплатные.",
      },
      {
        question: "Нужна ли регистрация на бесплатное событие?",
        answer:
          "Да, для большинства событий. Регистрация занимает меньше минуты, на почту приходит QR-код для входа.",
      },
      {
        question: "Могу ли я отменить регистрацию на бесплатное событие?",
        answer:
          "Да, в любое время в личном кабинете. Это поможет организатору точнее планировать число участников.",
      },
      {
        question: "Что если мест больше нет?",
        answer:
          "Организатор может ограничить число участников. Если регистрация закрыта, на странице события будет «Запись завершена».",
      },
    ];
  }
  if (locale === "uz") {
    return [
      {
        question: "EVENTFLOW dagi barcha tadbirlar bepulmi?",
        answer:
          "Platformaning dastlabki bosqichida tadbirlarning aksariyati bepul. Pullik tadbirlar narxni soʻmda shaffof koʻrsatadi. Bu sahifa faqat bepul tadbirlarni jamlaydi.",
      },
      {
        question: "Bepul tadbirga roʻyxatdan oʻtish kerakmi?",
        answer:
          "Ha, koʻp tadbirlar uchun. Roʻyxatdan oʻtish bir daqiqadan kam vaqt oladi, kirish uchun QR-kod elektron pochtangizga yuboriladi.",
      },
      {
        question: "Bepul tadbirga roʻyxatdan oʻtishni bekor qilish mumkinmi?",
        answer:
          "Ha, istalgan vaqt profilingizda. Bu tashkilotchiga ishtirokchilar sonini aniqroq rejalashtirishga yordam beradi.",
      },
      {
        question: "Joylar tugagan boʻlsa nima boʻladi?",
        answer:
          "Tashkilotchi ishtirokchilar sonini cheklashi mumkin. Roʻyxatdan oʻtish yopilgan boʻlsa, tadbir sahifasida «Roʻyxatdan oʻtish yopilgan» koʻrsatiladi.",
      },
    ];
  }
  return [
    {
      question: "Are all events on EVENTFLOW free?",
      answer:
        "On an early-stage platform most events are free. Paid events show their price transparently in Uzbek som. This page aggregates only the free ones.",
    },
    {
      question: "Do I need to register for a free event?",
      answer:
        "Yes, for most events. Registration takes under a minute and a QR ticket arrives in your inbox.",
    },
    {
      question: "Can I cancel my registration for a free event?",
      answer:
        "Yes, anytime from your profile. It helps the organizer plan attendance more accurately.",
    },
    {
      question: "What if seats are full?",
      answer:
        "Organizers can cap attendance. When registration closes the event page shows «Registration closed».",
    },
  ];
}

export async function generateMetadata({
  params,
}: FreeEventsPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const s = strings(locale);

  const meta = buildPageMetadata({
    locale,
    path: "/events/free",
    title: s.title,
    description: s.metaDescription,
  });

  // Anti-thin: only index when there's at least one upcoming free event.
  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    type: "FREE",
    limit: 1,
  });
  if ((data?.items?.length ?? 0) === 0) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function FreeEventsLandingPage({
  params,
}: FreeEventsPageProps): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);
  const s = strings(locale);

  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    type: "FREE",
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
      { name: s.breadcrumbLabel, path: "/events/free" },
    ],
    locale,
  );
  const faqItems = freeFaq(locale);
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
