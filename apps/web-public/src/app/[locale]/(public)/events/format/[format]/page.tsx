import { notFound } from "next/navigation";

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
 * `/events/format/[format]` — landings per attendance mode. Captures
 * format-specific intent: «онлайн мероприятия Узбекистан», «online events
 * Tashkent», «oflayn tadbirlar». 3 formats × 3 locales = 9 URLs.
 */

const FORMATS = ["online", "offline", "hybrid"] as const;
type FormatSlug = (typeof FORMATS)[number];

function isFormat(value: string): value is FormatSlug {
  return (FORMATS as readonly string[]).includes(value);
}

function apiFormat(slug: FormatSlug): "ONLINE" | "OFFLINE" | "HYBRID" {
  return slug.toUpperCase() as "ONLINE" | "OFFLINE" | "HYBRID";
}

interface FormatPageProps {
  params: Promise<{ locale: string; format: string }>;
}

interface FaqEntry {
  question: string;
  answer: string;
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
  faq: FaqEntry[];
}

function strings(format: FormatSlug, locale: Locale): PageStrings {
  if (format === "online") {
    if (locale === "ru") {
      return {
        title: "Онлайн-мероприятия в Узбекистане",
        metaDescription:
          "Афиша онлайн-мероприятий: вебинары, конференции и мастер-классы, в которых можно участвовать удалённо. Регистрация на EVENTFLOW.",
        heading: "Онлайн-мероприятия",
        intro:
          "События, которые проходят полностью онлайн — можно участвовать из любой точки страны. Ссылка на трансляцию приходит после регистрации.",
        faqHeading: "Частые вопросы об онлайн-событиях",
        emptyText: "Пока нет запланированных онлайн-событий.",
        browseAllLabel: "Все события →",
        locationFallback: "Онлайн",
        breadcrumbLabel: "Онлайн",
        faq: [
          {
            question: "Как получить ссылку на онлайн-событие?",
            answer:
              "После регистрации ссылка приходит на почту. Часто организаторы дублируют её в Telegram-канале события.",
          },
          {
            question: "Нужна ли камера и микрофон?",
            answer:
              "Для большинства лекций — нет. Если событие интерактивное (воркшоп, мастермайнд), организатор указывает это на странице.",
          },
          {
            question: "Что если я пропущу прямую трансляцию?",
            answer:
              "Многие организаторы публикуют запись после события. Уточняйте на странице конкретного мероприятия.",
          },
        ],
      };
    }
    if (locale === "uz") {
      return {
        title: "Oʻzbekistondagi onlayn tadbirlar",
        metaDescription:
          "Onlayn tadbirlar afishasi: vebinarlar, konferensiyalar va ustaxonalar — masofadan ishtirok eting. EVENTFLOW da roʻyxatdan oʻtish.",
        heading: "Onlayn tadbirlar",
        intro:
          "Toʻliq onlayn boʻladigan tadbirlar — mamlakatning istalgan nuqtasidan ishtirok etish mumkin. Translyatsiyaga havola roʻyxatdan oʻtgandan keyin keladi.",
        faqHeading: "Onlayn tadbirlar haqida savollar",
        emptyText: "Hozircha onlayn tadbirlar yoʻq.",
        browseAllLabel: "Barcha tadbirlar →",
        locationFallback: "Onlayn",
        breadcrumbLabel: "Onlayn",
        faq: [
          {
            question: "Onlayn tadbirga havolani qanday olaman?",
            answer:
              "Roʻyxatdan oʻtgandan keyin havola elektron pochtangizga keladi. Koʻp tashkilotchilar tadbirning Telegram-kanalida ham qoʻyadi.",
          },
          {
            question: "Kamera va mikrofon kerakmi?",
            answer:
              "Aksariyat maʼruzalar uchun — yoʻq. Agar tadbir interaktiv boʻlsa (ustaxona, mastermayd), tashkilotchi sahifada koʻrsatadi.",
          },
          {
            question: "Jonli translyatsiyani oʻtkazib yuborsam-chi?",
            answer:
              "Koʻp tashkilotchilar tadbirdan keyin yozuvni eʼlon qiladi. Tafsilotlarni har bir tadbir sahifasidan tekshiring.",
          },
        ],
      };
    }
    return {
      title: "Online events in Uzbekistan",
      metaDescription:
        "Online events: webinars, conferences, and workshops you can join remotely. Register on EVENTFLOW.",
      heading: "Online events",
      intro:
        "Fully online events — join from anywhere in the country. The stream link arrives after registration.",
      faqHeading: "Frequently asked questions about online events",
      emptyText: "No online events yet.",
      browseAllLabel: "Browse all events →",
      locationFallback: "Online",
      breadcrumbLabel: "Online",
      faq: [
        {
          question: "How do I get the link to an online event?",
          answer:
            "After registration the link arrives by email. Many organizers also post it in the event's Telegram channel.",
        },
        {
          question: "Do I need a camera and microphone?",
          answer:
            "For most lectures, no. If the event is interactive (workshop, mastermind), the organizer says so on the page.",
        },
        {
          question: "What if I miss the live stream?",
          answer:
            "Many organizers post a recording afterward. Check the specific event page for details.",
        },
      ],
    };
  }
  if (format === "hybrid") {
    if (locale === "ru") {
      return {
        title: "Гибридные мероприятия в Узбекистане",
        metaDescription:
          "Гибридные события: можно участвовать оффлайн на площадке или онлайн через трансляцию. Регистрация на EVENTFLOW.",
        heading: "Гибридные мероприятия",
        intro:
          "События в гибридном формате — выбирайте: приходите на площадку или подключайтесь онлайн.",
        faqHeading: "Частые вопросы о гибридных событиях",
        emptyText: "Пока нет запланированных гибридных событий.",
        browseAllLabel: "Все события →",
        locationFallback: "Оффлайн + онлайн",
        breadcrumbLabel: "Гибрид",
        faq: [
          {
            question: "Как выбрать оффлайн или онлайн участие?",
            answer:
              "При регистрации некоторые организаторы спрашивают предпочтительный формат. Если поля нет — приходите как удобно, формат свободный.",
          },
          {
            question: "Будет ли запись для онлайн-участников?",
            answer:
              "Чаще всего да, но решение за организатором. Уточняйте на странице события.",
          },
        ],
      };
    }
    if (locale === "uz") {
      return {
        title: "Oʻzbekistondagi gibrid tadbirlar",
        metaDescription:
          "Gibrid tadbirlar: oflayn joyda yoki onlayn translyatsiya orqali ishtirok eting. EVENTFLOW da roʻyxatdan oʻtish.",
        heading: "Gibrid tadbirlar",
        intro:
          "Gibrid formatdagi tadbirlar — joyga keling yoki onlayn ulaning, tanlov sizniki.",
        faqHeading: "Gibrid tadbirlar haqida savollar",
        emptyText: "Hozircha gibrid tadbirlar yoʻq.",
        browseAllLabel: "Barcha tadbirlar →",
        locationFallback: "Oflayn + onlayn",
        breadcrumbLabel: "Gibrid",
        faq: [
          {
            question: "Oflayn yoki onlayn ishtirokni qanday tanlayman?",
            answer:
              "Roʻyxatdan oʻtishda baʼzi tashkilotchilar formatni soʻraydi. Agar maydon boʻlmasa — sizga qulay tarzda keling.",
          },
          {
            question: "Onlayn ishtirokchilar uchun yozuv boʻladimi?",
            answer:
              "Koʻp hollarda ha, lekin qaror tashkilotchida. Tadbir sahifasidan tekshiring.",
          },
        ],
      };
    }
    return {
      title: "Hybrid events in Uzbekistan",
      metaDescription:
        "Hybrid events you can attend in person or join online via stream. Register on EVENTFLOW.",
      heading: "Hybrid events",
      intro:
        "Hybrid-format events — come to the venue or join online, whichever works for you.",
      faqHeading: "Frequently asked questions about hybrid events",
      emptyText: "No hybrid events yet.",
      browseAllLabel: "Browse all events →",
      locationFallback: "In-person + online",
      breadcrumbLabel: "Hybrid",
      faq: [
        {
          question: "How do I choose in-person or online attendance?",
          answer:
            "Some organizers ask your preference during registration. If no such field — just attend in whichever format suits you.",
        },
        {
          question: "Will there be a recording for online attendees?",
          answer:
            "Often yes, but it's the organizer's call. Check the specific event page.",
        },
      ],
    };
  }
  // OFFLINE
  if (locale === "ru") {
    return {
      title: "Оффлайн-мероприятия в Узбекистане",
      metaDescription:
        "Афиша оффлайн-мероприятий: события на физических площадках по всей стране. Регистрация на EVENTFLOW.",
      heading: "Оффлайн-мероприятия",
      intro:
        "События, которые проходят на физических площадках — приходите лично. Адрес и время указаны на странице каждого события.",
      faqHeading: "Частые вопросы об оффлайн-событиях",
      emptyText: "Пока нет запланированных оффлайн-событий.",
      browseAllLabel: "Все события →",
      locationFallback: "Место уточняется",
      breadcrumbLabel: "Оффлайн",
      faq: [
        {
          question: "Как попасть на оффлайн-событие?",
          answer:
            "Зарегистрируйтесь на странице события. На указанную почту придёт QR-код, который сканируется на входе.",
        },
        {
          question: "Нужно ли распечатывать билет?",
          answer:
            "Нет — достаточно показать QR-код на экране телефона.",
        },
      ],
    };
  }
  if (locale === "uz") {
    return {
      title: "Oʻzbekistondagi oflayn tadbirlar",
      metaDescription:
        "Oflayn tadbirlar afishasi: mamlakat boʻylab jismoniy joylarda boʻladigan tadbirlar. EVENTFLOW da roʻyxatdan oʻtish.",
      heading: "Oflayn tadbirlar",
      intro:
        "Jismoniy joylarda boʻladigan tadbirlar — shaxsan keling. Manzil va vaqt har bir tadbir sahifasida koʻrsatilgan.",
      faqHeading: "Oflayn tadbirlar haqida savollar",
      emptyText: "Hozircha oflayn tadbirlar yoʻq.",
      browseAllLabel: "Barcha tadbirlar →",
      locationFallback: "Joy aniqlanmoqda",
      breadcrumbLabel: "Oflayn",
      faq: [
        {
          question: "Oflayn tadbirga qanday borish mumkin?",
          answer:
            "Tadbir sahifasida roʻyxatdan oʻting. Elektron pochtangizga QR-kod keladi, u kirishda skanerlanadi.",
        },
        {
          question: "Chiptani chop etish kerakmi?",
          answer:
            "Yoʻq — telefon ekranida QR-kodni koʻrsatish kifoya.",
        },
      ],
    };
  }
  return {
    title: "In-person events in Uzbekistan",
    metaDescription:
      "In-person events at physical venues across the country. Register on EVENTFLOW.",
    heading: "In-person events",
    intro:
      "Events held at physical venues — come in person. Address and time are on each event page.",
    faqHeading: "Frequently asked questions about in-person events",
    emptyText: "No in-person events yet.",
    browseAllLabel: "Browse all events →",
    locationFallback: "Location to be announced",
    breadcrumbLabel: "In-person",
    faq: [
      {
        question: "How do I attend an in-person event?",
        answer:
          "Register on the event page. A QR ticket arrives by email and is scanned at the door.",
      },
      {
        question: "Do I need to print the ticket?",
        answer: "No — showing the QR code on your phone screen is enough.",
      },
    ],
  };
}

export function generateStaticParams(): Array<{ format: string }> {
  return FORMATS.map((f) => ({ format: f }));
}

export async function generateMetadata({
  params,
}: FormatPageProps): Promise<Metadata> {
  const { locale: localeParam, format } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  if (!isFormat(format)) {
    return { robots: { index: false, follow: false } };
  }
  const s = strings(format, locale);

  const meta = buildPageMetadata({
    locale,
    path: `/events/format/${format}`,
    title: s.title,
    description: s.metaDescription,
  });

  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    format: apiFormat(format),
    limit: 1,
  });
  if ((data?.items?.length ?? 0) === 0) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function FormatLandingPage({
  params,
}: FormatPageProps): Promise<React.ReactNode> {
  const { locale: localeParam, format } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  if (!isFormat(format)) notFound();

  const t = createTranslator(locale);
  const s = strings(format, locale);

  const data = await fetchPublicEventsServer({
    locale,
    filter: "upcoming",
    format: apiFormat(format),
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
      { name: s.breadcrumbLabel, path: `/events/format/${format}` },
    ],
    locale,
  );
  const faq = faqSchema(s.faq);

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
      <FaqSection heading={s.faqHeading} items={s.faq} surface="tinted" />
    </>
  );
}
