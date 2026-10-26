"use client";

import { useMemo, useState, useCallback, useEffect } from "react";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { useLocale } from "@eventflow/i18n/react";

import { mapPublicEventsToDesignEvents } from "@entities/event/lib";
import { organizerAppUrl } from "@shared/config";
import { withLocalePath } from "@shared/lib/i18n-routing";
import {
  COLLECTIONS_PLURAL,
  DIRECTIONS_PLURAL,
  EVENTS_PLURAL,
} from "@shared/lib/plurals";
import { useTrackSearch } from "@shared/analytics/use-track-search";
import { usePublicEventsQuery } from "@shared/lib/hooks";
import type { PublicEventsResponse } from "@shared/api/eventService";
import { usePublicCategories } from "@shared/lib/hooks/usePublicCategories";
import { resolveMediaUrl } from "@shared/lib/utils";
import { Container } from "@shared/ui/container";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@shared/ui/dropdown-menu";
import {
  CalmEventCard,
  type DesignEvent,
  type DesignIconName,
  DesignIcon,
  Eyebrow,
  ItalicAccent,
} from "@shared/ui/design-system";

import { plural, type Locale } from "@eventflow/i18n";

const pickLang = (locale: Locale): "en" | "ru" | "uz" => {
  if (locale === "ru") return "ru";
  if (locale === "uz") return "uz";
  return "en";
};

const t = (
  lang: "en" | "ru" | "uz",
  bag: { en: string; ru?: string; uz?: string },
): string =>
  (lang === "ru" ? bag.ru : lang === "uz" ? bag.uz : bag.en) ?? bag.en;

type DateFilter = "any" | "today" | "tomorrow" | "weekend" | "week" | "month";

const DATE_FILTERS: DateFilter[] = ["any", "today", "tomorrow", "weekend", "week", "month"];

const DATE_LABELS: Record<DateFilter, { en: string; ru: string; uz: string }> = {
  any:      { en: "Any date",      ru: "Любая дата",      uz: "Istalgan sana" },
  today:    { en: "Today",         ru: "Сегодня",         uz: "Bugun" },
  tomorrow: { en: "Tomorrow",      ru: "Завтра",          uz: "Ertaga" },
  weekend:  { en: "This weekend",  ru: "Эти выходные",    uz: "Bu hafta oxiri" },
  week:     { en: "This week",     ru: "На этой неделе",  uz: "Bu hafta" },
  month:    { en: "This month",    ru: "В этом месяце",   uz: "Bu oy" },
};

function getDateRange(filter: DateFilter): { from: Date; to: Date } | null {
  if (filter === "any") return null;
  const now = new Date();
  const day = now.getDay();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (filter === "today") {
    const to = new Date(startOfToday);
    to.setHours(23, 59, 59, 999);
    return { from: startOfToday, to };
  }
  if (filter === "tomorrow") {
    const from = new Date(startOfToday);
    from.setDate(startOfToday.getDate() + 1);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (filter === "weekend") {
    const from = new Date(startOfToday);
    from.setDate(startOfToday.getDate() + (day === 0 ? -1 : 6 - day));
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (filter === "week") {
    const from = new Date(startOfToday);
    from.setDate(startOfToday.getDate() - ((day + 6) % 7));
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (filter === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
  return null;
}

interface CategoryCard {
  id: string;
  ic: DesignIconName;
  en: string;
  ru: string;
  uz?: string;
  blurb: { en: string; ru: string; uz?: string };
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    id: "business-training",
    ic: "book",
    en: "Business training",
    ru: "Бизнес-тренинги",
    uz: "Trening",
    blurb: {
      en: "Workshops and intensives that level up working teams.",
      ru: "Интенсивы и воркшопы, которые прокачивают рабочие команды.",
      uz: "Jamoaning kasbiy darajasini koʻtaradigan trening va ustaxonalar.",
    },
  },
  {
    id: "business-meetings",
    ic: "users",
    en: "Meetings",
    ru: "Бизнес-встречи",
    uz: "Uchrashuvlar",
    blurb: {
      en: "Roundtables, breakfasts, mixers — the deal-flow surface.",
      ru: "Круглые столы, завтраки, нетворкинг — место для сделок.",
      uz: "Davra suhbatlari, nonushtalar, networking — bitimlar uchun.",
    },
  },
  {
    id: "workshops",
    ic: "wrench",
    en: "Workshops",
    ru: "Воркшопы",
    uz: "Ustaxonalar",
    blurb: {
      en: "Hands-on, small-group sessions led by a practitioner.",
      ru: "Практические сессии в малых группах от практиков.",
      uz: "Amaliyotchi olib boradigan kichik guruhli amaliy sessiyalar.",
    },
  },
  {
    id: "conference",
    ic: "ticket",
    en: "Conferences",
    ru: "Конференции",
    uz: "Konferensiyalar",
    blurb: {
      en: "Multi-track gatherings with speakers and after-parties.",
      ru: "Многопрограммные встречи со спикерами и афтерпати.",
      uz: "Maʼruzachilar va after-party bilan koʻp dasturli yigʻilishlar.",
    },
  },
  {
    id: "forum",
    ic: "msg",
    en: "Forums",
    ru: "Форумы",
    uz: "Forumlar",
    blurb: {
      en: "Bigger-stage debates around an industry or a region.",
      ru: "Большие дискуссии вокруг отрасли или региона.",
      uz: "Soha yoki mintaqa atrofida katta sahna munozaralari.",
    },
  },
  {
    id: "hackathon",
    ic: "code",
    en: "Hackathons",
    ru: "Хакатоны",
    uz: "Xakatonlar",
    blurb: {
      en: "Build sprints — teams ship, judges score, prizes land.",
      ru: "Спринты — команды собирают, жюри оценивает, призы.",
      uz: "Sprintlar — jamoalar yigʻadi, hakamlar baholaydi, sovrinlar.",
    },
  },
  {
    id: "ideathon",
    ic: "bulb",
    en: "Ideathons",
    ru: "Идеатоны",
    uz: "Ideatonlar",
    blurb: {
      en: "Concept-first, lighter than a hack — pitch and refine.",
      ru: "От идеи к питчу — легче хакатона, фокус на концепте.",
      uz: "Konsepsiya birinchi — pitch va qayta ishlash.",
    },
  },
];

type Tab = "all" | "collections" | "categories";

interface CollectionDef {
  id: string;
  title: { en: string; ru: string; uz?: string };
  blurb: { en: string; ru: string; uz?: string };
  match: (ev: DesignEvent) => boolean;
}

const COLLECTIONS: CollectionDef[] = [
  {
    id: "featured",
    title: { en: "Featured", ru: "Рекомендуемые", uz: "Tavsiya etilgan" },
    blurb: {
      en: "Events the organizers marked as highlights.",
      ru: "События, которые организаторы отметили как главные.",
      uz: "Tashkilotchilar asosiy deb belgilagan tadbirlar.",
    },
    match: (ev) => ev.pick === true,
  },
  {
    id: "free",
    title: { en: "Free entry", ru: "Бесплатные", uz: "Bepul" },
    blurb: {
      en: "No ticket needed — just register and come.",
      ru: "Без билета — достаточно зарегистрироваться и прийти.",
      uz: "Chiptasiz — roʻyxatdan oʻting va keling.",
    },
    match: (ev) => {
      const price = (ev.price ?? "").toLowerCase();
      return (
        price.includes("free") ||
        price.includes("бесплат") ||
        price.includes("bepul") ||
        price === "0"
      );
    },
  },
  {
    id: "conferences",
    title: { en: "Conferences & forums", ru: "Конференции и форумы", uz: "Konferensiyalar" },
    blurb: {
      en: "Multi-track stages, speakers, professional crowd.",
      ru: "Многопрограммные сцены, спикеры, профессиональная аудитория.",
      uz: "Koʻp dasturli sahnalar, maʼruzachilar, professional auditoriya.",
    },
    match: (ev) => ev.cat === "conference" || ev.cat === "forum",
  },
  {
    id: "workshops",
    title: { en: "Workshops & training", ru: "Воркшопы и тренинги", uz: "Ustaxonalar va trening" },
    blurb: {
      en: "Hands-on intensives that level up your team.",
      ru: "Практические интенсивы, которые прокачивают команду.",
      uz: "Jamoangizning kasbiy darajasini koʻtaradigan amaliy intensivlar.",
    },
    match: (ev) => ev.cat === "workshops" || ev.cat === "business-training",
  },
];

const TABS: { id: Tab; en: string; ru: string; uz?: string }[] = [
  { id: "all", en: "All events", ru: "Все события", uz: "Hamma tadbirlar" },
  { id: "collections", en: "Collections", ru: "Подборки", uz: "Toʻplamlar" },
  { id: "categories", en: "Categories", ru: "Категории", uz: "Yoʻnalishlar" },
];

function tabFromQuery(value: string | null | undefined): Tab {
  if (value === "collections") return "collections";
  if (value === "categories") return "categories";
  return "all";
}

// Grammatical title fragments per UZ city select-code. EN = plain name
// ("Events in X"); RU = prepositional case ("События в X"); UZ = "-dagi"
// locative ("Xdagi tadbirlar").
const CITY_TITLE: Record<string, { en: string; ru: string; uz: string }> = {
  tashkent: { en: "Tashkent", ru: "Ташкенте", uz: "Toshkentdagi" },
  samarkand: { en: "Samarkand", ru: "Самарканде", uz: "Samarqanddagi" },
  bukhara: { en: "Bukhara", ru: "Бухаре", uz: "Buxorodagi" },
  andijan: { en: "Andijan", ru: "Андижане", uz: "Andijondagi" },
  namangan: { en: "Namangan", ru: "Намангане", uz: "Namangandagi" },
  fergana: { en: "Fergana", ru: "Фергане", uz: "Fargʻonadagi" },
  nukus: { en: "Nukus", ru: "Нукусе", uz: "Nukusdagi" },
  qarshi: { en: "Qarshi", ru: "Карши", uz: "Qarshidagi" },
  termez: { en: "Termez", ru: "Термезе", uz: "Termizdagi" },
  urgench: { en: "Urgench", ru: "Ургенче", uz: "Urganchdagi" },
  khiva: { en: "Khiva", ru: "Хиве", uz: "Xivadagi" },
  navoi: { en: "Navoi", ru: "Навои", uz: "Navoiydagi" },
  jizzakh: { en: "Jizzakh", ru: "Джизаке", uz: "Jizzaxdagi" },
  gulistan: { en: "Gulistan", ru: "Гулистане", uz: "Gulistondagi" },
  nurafshon: { en: "Nurafshon", ru: "Нурафшоне", uz: "Nurafshondagi" },
  kokand: { en: "Kokand", ru: "Коканде", uz: "Qoʻqondagi" },
  margilan: { en: "Margilan", ru: "Маргилане", uz: "Margʻilondagi" },
  chirchiq: { en: "Chirchiq", ru: "Чирчике", uz: "Chirchiqdagi" },
  angren: { en: "Angren", ru: "Ангрене", uz: "Angrendagi" },
  almalyk: { en: "Almalyk", ru: "Алмалыке", uz: "Olmaliqdagi" },
};

/**
 * Catalog headline. Country-level when no city is selected; only names a
 * specific city when that city filter is active — so the title never claims
 * "Tashkent" while showing events from other regions.
 */
function buildCatalogTitle(
  lang: "en" | "ru" | "uz",
  city: string,
  cityLabel: string,
): string {
  if (city === "all") {
    return t(lang, {
      en: "Events in Uzbekistan ",
      ru: "События в Узбекистане ",
      uz: "Oʻzbekistondagi tadbirlar ",
    });
  }
  const forms = CITY_TITLE[city];
  if (forms) {
    if (lang === "uz") return `${forms.uz} tadbirlar `;
    if (lang === "ru") return `События в ${forms.ru} `;
    return `Events in ${forms.en} `;
  }
  // Unknown/legacy city value — fall back to its localized label with a
  // construction that stays grammatical for any name.
  const label = cityLabel || city;
  if (lang === "uz") return `${label} shahridagi tadbirlar `;
  if (lang === "ru") return `События в городе ${label} `;
  return `Events in ${label} `;
}

export interface EventsPageProps {
  initialQuery?: string;
  /** Server-fetched first page of events for SSR/SEO. */
  initialEvents?: PublicEventsResponse;
}

export function EventsPage({
  initialQuery = "",
  initialEvents,
}: EventsPageProps): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = tabFromQuery(searchParams.get("tab"));

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [cat, setCat] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [dateFilter, setDateFilter] = useState<DateFilter>("any");

  // When the user opens /events?cat=foo or ?date=… we honour it as initial filter
  // eslint-disable-next-line no-restricted-syntax -- mount-only sync с query-param cat
  useEffect(() => {
    const fromUrl = searchParams.get("cat");
    if (fromUrl && fromUrl !== cat) setCat(fromUrl);
    const cityFromUrl = searchParams.get("city");
    if (cityFromUrl) setCity(cityFromUrl);
    const d = searchParams.get("date");
    if (d && DATE_FILTERS.includes(d as DateFilter)) {
      setDateFilter(d as DateFilter);
    } else if (searchParams.get("weekend") === "1") setDateFilter("weekend");
    else if (searchParams.get("week") === "1") setDateFilter("week");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  // Поисковые запросы каталога — в аналитику (дебаунс внутри хука).
  useTrackSearch(searchTerm);

  const { data, isLoading, error } = usePublicEventsQuery({
    params: { limit: 50, filter: "upcoming" },
    initialData: initialEvents,
  });

  const designEvents = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;
    if (dateFilter !== "any") {
      const range = getDateRange(dateFilter);
      if (range) {
        items = items.filter((ev) => {
          const d = new Date(ev.startDate);
          return d >= range.from && d <= range.to;
        });
      }
    }
    return mapPublicEventsToDesignEvents(items, { locale });
  }, [data?.items, locale, dateFilter]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return designEvents.filter((ev) => {
      if (cat !== "all" && ev.cat !== cat) return false;
      if (city !== "all" && ev.cityCode !== city) return false;
      if (!q) return true;
      const haystack = [ev.title, ev.venue, ev.city, ev.org, ev.catLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [designEvents, cat, city, searchTerm]);

  // City options for the location filter — only cities that actually have
  // events in the current result set, labelled with their localized name.
  const cityOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of designEvents) {
      if (ev.cityCode && !map.has(ev.cityCode)) {
        map.set(ev.cityCode, ev.city || ev.cityCode);
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([code, label]) => ({ code, label }));
  }, [designEvents]);

  const selectedCityLabel =
    cityOptions.find((c) => c.code === city)?.label ?? "";

  const collections = useMemo(
    () =>
      COLLECTIONS.map((col) => ({
        def: col,
        items: designEvents.filter(col.match).slice(0, 3),
      })).filter((c) => c.items.length > 0),
    [designEvents],
  );

  const switchTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const heroEyebrow = (() => {
    if (tab === "collections")
      return t(lang, {
        en: "Discovery · Collections",
        ru: "Каталог · Подборки",
        uz: "Katalog · Toʻplamlar",
      });
    if (tab === "categories")
      return t(lang, {
        en: "Discovery · Categories",
        ru: "Каталог · Категории",
        uz: "Katalog · Yoʻnalishlar",
      });
    return t(lang, {
      en: "Discovery",
      ru: "Каталог",
      uz: "Katalog",
    });
  })();

  const heroTitle = (() => {
    if (tab === "collections")
      return t(lang, {
        en: "Ready-made selections",
        ru: "Готовые подборки",
        uz: "Tayyor toʻplamlar",
      });
    if (tab === "categories")
      return t(lang, {
        en: "Browse by topic",
        ru: "События по темам",
        uz: "Mavzu boʻyicha",
      });
    return buildCatalogTitle(lang, city, selectedCityLabel);
  })();

  // Only qualify the title with a date when a date filter is genuinely active.
  // Always showing the current month ("· July") next to "0 events" read as a
  // month scope the catalog doesn't have — it lists all upcoming events
  // regardless of month, so the suffix now mirrors the real filter (or none).
  const heroItalic =
    tab === "all" && dateFilter !== "any"
      ? `· ${t(lang, DATE_LABELS[dateFilter])}`
      : null;

  return (
    <div className="cm-events-root">
      <Container size="wide">
        {/* Header */}
        <div className="cm-events-header">
          <div>
            <Eyebrow style={{ marginBottom: 8 }}>{heroEyebrow}</Eyebrow>
            <h1 className="cm-events-header__title">
              {heroTitle}
              {heroItalic ? (
                <ItalicAccent> {heroItalic}</ItalicAccent>
              ) : null}
            </h1>
          </div>
          <div className="cm-events-header__count">
            {tab === "all" && <>{plural(lang, filtered.length, EVENTS_PLURAL)}</>}
            {tab === "collections" && (
              <>{plural(lang, collections.length, COLLECTIONS_PLURAL)}</>
            )}
            {tab === "categories" && (
              <>{plural(lang, CATEGORY_CARDS.length, DIRECTIONS_PLURAL)}</>
            )}
          </div>
        </div>

        {/* Tab strip */}
        <div
          role="tablist"
          aria-label={t(lang, {
            en: "Catalog views",
            ru: "Виды каталога",
            uz: "Katalog koʻrinishlari",
          })}
          className="cm-events-tabs"
        >
          {TABS.map((tabDef) => {
            const active = tab === tabDef.id;
            return (
              <button
                key={tabDef.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchTab(tabDef.id)}
                className={`cm-events-tab${active ? " is-active" : ""}`}
              >
                {t(lang, tabDef)}
              </button>
            );
          })}
        </div>

        {tab === "all" && (
          <AllEventsView
            lang={lang}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            cat={cat}
            setCat={setCat}
            city={city}
            setCity={setCity}
            cityOptions={cityOptions}
            view={view}
            setView={setView}
            isLoading={isLoading}
            error={error as Error | null}
            filtered={filtered}
            locale={locale}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
        )}

        {tab === "collections" && (
          <CollectionsView
            lang={lang}
            isLoading={isLoading}
            collections={collections}
            locale={locale}
          />
        )}

        {tab === "categories" && (
          <CategoriesView
            lang={lang}
            designEvents={designEvents}
            onPickCategory={(id) => {
              setCat(id);
              switchTab("all");
            }}
          />
        )}
      </Container>

      <style>{`
        /* ── Page shell ─────────────────────────────────────────── */
        .cm-events-root {
          background: var(--bg-1);
          color: var(--fg-1);
          padding-block: clamp(28px, 4vw, 40px) clamp(48px, 7vw, 80px);
        }

        /* ── Header ─────────────────────────────────────────────── */
        .cm-events-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 18px;
          border-bottom: 2px solid var(--ink-400);
          margin-bottom: clamp(20px, 3vw, 28px);
          flex-wrap: wrap;
          gap: 16px;
        }
        .cm-events-header__title {
          font: 700 clamp(26px, 4.5vw, 38px) / 1.05 var(--font-sans);
          letter-spacing: -0.025em;
          margin: 0;
          color: var(--ink-400);
          text-wrap: balance;
        }
        .cm-events-header__count {
          font: 500 12px/1.4 var(--font-mono);
          color: var(--fg-3);
        }

        /* ── Tabs ───────────────────────────────────────────────── */
        .cm-events-tabs {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border-radius: 999px;
          border: 1px solid var(--border-1);
          background: var(--bone-50);
          margin-bottom: clamp(18px, 2.5vw, 24px);
          max-width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .cm-events-tabs::-webkit-scrollbar { display: none; }
        .cm-events-tab {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--fg-2);
          font: 600 13px/1 var(--font-sans);
          cursor: pointer;
          white-space: nowrap;
          transition: background-color .15s var(--ease-standard),
                      color .15s var(--ease-standard);
        }
        .cm-events-tab.is-active {
          background: var(--ink-400);
          color: var(--bone-50);
        }
        .cm-events-tab:not(.is-active):hover {
          color: var(--ink-400);
        }

        /* ── Search + controls row ──────────────────────────────── */
        .cm-events-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          margin-bottom: clamp(20px, 3vw, 24px);
          align-items: center;
        }
        .cm-events-controls__row {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }
        .cm-events-search {
          position: relative;
          display: block;
          min-width: 0;
        }
        .cm-events-search__input {
          width: 100%;
          box-sizing: border-box;
          height: 44px;
          padding: 0 14px 0 40px;
          border-radius: 8px;
          border: 1px solid var(--border-2);
          background: var(--bone-50);
          font: 400 14px/1 var(--font-sans);
          color: var(--fg-1);
          outline: none;
          transition: border-color .15s var(--ease-standard),
                      box-shadow .15s var(--ease-standard);
        }
        .cm-events-search__input:focus {
          border-color: var(--ink-400);
          box-shadow: 0 0 0 3px var(--ember-100);
        }
        .cm-events-date {
          height: 44px;
          padding: 0 16px;
          border-radius: 8px;
          border: 1px solid var(--border-2);
          background: var(--bone-50);
          font: 500 13px/1 var(--font-sans);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--fg-2);
          white-space: nowrap;
          transition: border-color .15s var(--ease-standard),
                      background .15s var(--ease-standard);
        }
        .cm-events-date:hover {
          border-color: var(--ink-400);
          color: var(--ink-400);
        }
        .cm-events-date.is-active {
          color: var(--ember-500);
          border-color: var(--ember-400);
          background: var(--ember-50);
        }
        .cm-events-toggle {
          display: flex;
          border: 1px solid var(--border-2);
          border-radius: 8px;
          overflow: hidden;
          height: 44px;
        }
        .cm-events-toggle__btn {
          padding: 0 16px;
          border: none;
          cursor: pointer;
          background: var(--bone-50);
          color: var(--fg-2);
          font: 600 12px/1 var(--font-sans);
          transition: background .15s var(--ease-standard),
                      color .15s var(--ease-standard);
        }
        .cm-events-toggle__btn.is-active {
          background: var(--ink-400);
          color: var(--bone-50);
        }
        @media (max-width: 720px) {
          .cm-events-controls { grid-template-columns: 1fr; }
          .cm-events-controls__row { justify-content: space-between; }
          .cm-events-date { flex: 1 1 auto; justify-content: center; }
        }
        @media (max-width: 380px) {
          .cm-events-toggle__btn { padding: 0 12px; font-size: 11px; }
        }

        /* ── Category chips ─────────────────────────────────────── */
        .cm-events-chips {
          display: flex;
          gap: 8px;
          margin-bottom: clamp(22px, 3.5vw, 28px);
          flex-wrap: wrap;
        }
        .cm-events-chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border-1);
          background: transparent;
          color: var(--fg-2);
          font: 500 13px/1 var(--font-sans);
          cursor: pointer;
          transition: all .15s var(--ease-standard);
        }
        .cm-events-chip:hover {
          border-color: var(--border-2);
          color: var(--ink-400);
        }
        .cm-events-chip.is-active {
          border-color: var(--ink-400);
          background: var(--ink-400);
          color: var(--bone-50);
        }

        /* ── Result grids ───────────────────────────────────────── */
        .cm-events-grid,
        .cm-events-collection-grid,
        .cm-events-category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 980px) {
          .cm-events-grid,
          .cm-events-collection-grid,
          .cm-events-category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 620px) {
          .cm-events-grid,
          .cm-events-collection-grid,
          .cm-events-category-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ── Empty state ────────────────────────────────────────── */
        .cm-events-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 6px;
          padding: clamp(40px, 6vw, 64px) 28px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-xl);
        }
        .cm-events-empty__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          background: var(--ember-50);
          color: var(--ember-500);
          margin-bottom: 14px;
        }
        .cm-events-empty__title {
          font: 700 clamp(18px, 2.4vw, 22px) / 1.2 var(--font-sans);
          letter-spacing: -0.02em;
          color: var(--ink-400);
          margin: 0;
          text-wrap: balance;
        }
        .cm-events-empty__text {
          font: 400 14.5px/1.6 var(--font-sans);
          color: var(--fg-2);
          margin: 0;
          max-width: 440px;
          text-wrap: pretty;
        }
        .cm-events-empty__cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 22px;
          font: 600 14px/1 var(--font-sans);
          padding: 13px 24px;
          border-radius: 999px;
          background: var(--ember-400);
          color: var(--bone-50);
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: background .15s var(--ease-standard);
        }
        .cm-events-empty__cta:hover { background: var(--ember-500); }

        /* ── Skeletons ──────────────────────────────────────────── */
        .cm-skel {
          position: relative;
          overflow: hidden;
          display: block;
          background: color-mix(in srgb, var(--border-1) 60%, transparent);
          border-radius: 6px;
        }
        .cm-skel::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.55),
            transparent
          );
          animation: cm-skel-shimmer 1.5s ease-in-out infinite;
        }
        @keyframes cm-skel-shimmer {
          100% { transform: translateX(100%); }
        }
        .cm-events-chip--skel {
          width: 96px;
          height: 33px;
          border-radius: 999px;
          border-color: transparent;
          position: relative;
          overflow: hidden;
          background: color-mix(in srgb, var(--border-1) 60%, transparent);
        }
        .cm-events-chip--skel::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.55),
            transparent
          );
          animation: cm-skel-shimmer 1.5s ease-in-out infinite;
        }
        .cm-cat-skel-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 24px;
          background: var(--bone-50);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xs);
        }
        .cm-cat-skel-card__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cm-skel--cat-icon { width: 44px; height: 44px; border-radius: var(--radius-md); }
        .cm-skel--cat-count { width: 56px; height: 11px; }
        .cm-skel--cat-title { width: 60%; height: 18px; margin-top: 2px; }
        .cm-skel--cat-line { width: 100%; height: 12px; }
        .cm-skel--cat-line-short { width: 70%; }
        @media (prefers-reduced-motion: reduce) {
          .cm-skel::after,
          .cm-events-chip--skel::after { animation: none; }
        }
      `}</style>
    </div>
  );
}

interface AllEventsViewProps {
  lang: "en" | "ru" | "uz";
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  cat: string;
  setCat: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  cityOptions: { code: string; label: string }[];
  view: "grid" | "list";
  setView: (v: "grid" | "list") => void;
  isLoading: boolean;
  error: Error | null;
  filtered: DesignEvent[];
  locale: Locale;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
}

function AllEventsView({
  lang,
  searchTerm,
  setSearchTerm,
  cat,
  setCat,
  city,
  setCity,
  cityOptions,
  view,
  setView,
  isLoading,
  error,
  filtered,
  locale,
  dateFilter,
  setDateFilter,
}: AllEventsViewProps): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoriesQuery = usePublicCategories();
  const categoryChips = useMemo(
    () => [
      { id: "all", label: t(lang, { en: "All", ru: "Все", uz: "Hammasi" }) },
      ...(categoriesQuery.data ?? []).map((c) => ({
        id: c.slug ?? c.id,
        label: c.name,
      })),
    ],
    [categoriesQuery.data, lang],
  );

  const handleDateChange = (next: DateFilter): void => {
    setDateFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("weekend");
    params.delete("week");
    params.delete("date");
    if (next !== "any") params.set("date", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleCityChange = (next: string): void => {
    setCity(next);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("city");
    if (next !== "all") params.set("city", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const allCitiesLabel = t(lang, {
    en: "All cities",
    ru: "Все города",
    uz: "Barcha shaharlar",
  });

  const locationFallback = t(lang, {
    en: "Location to be announced",
    ru: "Место уточняется",
    uz: "Joy aniqlanmoqda",
  });

  return (
    <>
      {/* Search + filter row */}
      <div className="cm-events-controls">
        <label className="cm-events-search">
          <DesignIcon
            name="search"
            size={18}
            stroke={2}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-3)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t(lang, {
              en: "Search events, venues, organizers",
              ru: "Поиск событий, площадок, организаторов",
              uz: "Tadbir, joy, tashkilotchilarni qidirish",
            })}
            aria-label={t(lang, {
              en: "Search events, venues, organizers",
              ru: "Поиск событий, площадок, организаторов",
              uz: "Tadbir, joy, tashkilotchilarni qidirish",
            })}
            className="cm-events-search__input"
          />
        </label>
        <div className="cm-events-controls__row">
          {cityOptions.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`cm-events-date${city !== "all" ? " is-active" : ""}`}
                >
                  <DesignIcon
                    name="pin"
                    size={14}
                    stroke={2}
                    style={city !== "all" ? { color: "var(--ember-500)" } : undefined}
                  />
                  {city === "all"
                    ? allCitiesLabel
                    : cityOptions.find((c) => c.code === city)?.label ?? city}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6}>
                <DropdownMenuItem
                  onSelect={() => handleCityChange("all")}
                  style={city === "all" ? { color: "var(--ember-500)" } : undefined}
                >
                  {allCitiesLabel}
                  {city === "all" && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </DropdownMenuItem>
                {cityOptions.map((c) => (
                  <DropdownMenuItem
                    key={c.code}
                    onSelect={() => handleCityChange(c.code)}
                    style={city === c.code ? { color: "var(--ember-500)" } : undefined}
                  >
                    {c.label}
                    {city === c.code && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`cm-events-date${dateFilter !== "any" ? " is-active" : ""}`}
              >
                <DesignIcon
                  name="calendar"
                  size={14}
                  stroke={2}
                  style={dateFilter !== "any" ? { color: "var(--ember-500)" } : undefined}
                />
                {t(lang, DATE_LABELS[dateFilter])}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6}>
              {DATE_FILTERS.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => handleDateChange(key)}
                  style={dateFilter === key ? { color: "var(--ember-500)" } : undefined}
                >
                  {t(lang, DATE_LABELS[key])}
                  {dateFilter === key && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="cm-events-toggle">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`cm-events-toggle__btn${
                  view === v ? " is-active" : ""
                }`}
                aria-pressed={view === v}
              >
                {v === "grid"
                  ? t(lang, { en: "Grid", ru: "Сетка", uz: "Tarmoq" })
                  : t(lang, { en: "List", ru: "Список", uz: "Roʻyxat" })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="cm-events-chips">
        {categoriesQuery.isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="cm-events-chip cm-events-chip--skel" aria-hidden />
            ))
          : categoryChips.map((c) => {
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  className={`cm-events-chip${active ? " is-active" : ""}`}
                >
                  {c.label}
                </button>
              );
            })}
      </div>

      {/* Loading / error / empty / list */}
      {isLoading ? (
        <div className="cm-events-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 360, borderRadius: 8 }}
            />
          ))}
        </div>
      ) : error ? (
        <p
          style={{
            padding: 24,
            borderRadius: 8,
            background: "var(--bg-2)",
            border: "1px solid var(--border-1)",
            color: "var(--fg-2)",
          }}
        >
          {t(lang, {
            en: "Failed to load events.",
            ru: "Не удалось загрузить события.",
            uz: "Tadbirlarni yuklab boʻlmadi.",
          })}
        </p>
      ) : filtered.length === 0 ? (
        (() => {
          const filtersActive =
            searchTerm.trim() !== "" ||
            cat !== "all" ||
            city !== "all" ||
            dateFilter !== "any";
          return (
            <div className="cm-events-empty">
              <span className="cm-events-empty__icon" aria-hidden>
                <DesignIcon
                  name={filtersActive ? "search" : "calendar"}
                  size={26}
                  stroke={1.7}
                />
              </span>
              <h3 className="cm-events-empty__title">
                {filtersActive
                  ? t(lang, {
                      en: "Nothing matches these filters",
                      ru: "Ничего не нашлось по этим фильтрам",
                      uz: "Bu filtrlar boʻyicha hech narsa topilmadi",
                    })
                  : t(lang, {
                      en: "No upcoming events yet",
                      ru: "Пока нет предстоящих событий",
                      uz: "Hozircha boʻladigan tadbirlar yoʻq",
                    })}
              </h3>
              <p className="cm-events-empty__text">
                {filtersActive
                  ? t(lang, {
                      en: "Try a different date, topic or search term.",
                      ru: "Попробуйте другую дату, тему или запрос.",
                      uz: "Boshqa sana, mavzu yoki soʻrovni sinab koʻring.",
                    })
                  : t(lang, {
                      en: "New events appear here as organizers publish them. Check back soon — or host your own.",
                      ru: "Новые события появляются здесь по мере публикации организаторами. Загляните позже — или проведите своё.",
                      uz: "Yangi tadbirlar tashkilotchilar chop etishi bilan shu yerda paydo boʻladi. Keyinroq kiring — yoki oʻzingiznikini oʻtkazing.",
                    })}
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCat("all");
                    handleCityChange("all");
                    setDateFilter("any");
                  }}
                  className="cm-events-empty__cta"
                >
                  {t(lang, {
                    en: "Reset filters",
                    ru: "Сбросить фильтры",
                    uz: "Filtrlarni tozalash",
                  })}
                </button>
              ) : (
                <a
                  href={organizerAppUrl}
                  className="cm-events-empty__cta"
                >
                  {t(lang, {
                    en: "Create an event",
                    ru: "Создать событие",
                    uz: "Tadbir yaratish",
                  })}
                </a>
              )}
            </div>
          );
        })()
      ) : view === "grid" ? (
        <div className="cm-events-grid">
          {filtered.map((ev) => (
            <CalmEventCard
              key={ev.id}
              event={ev}
              locationFallback={locationFallback}
              href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((ev) => (
            <CalmEventCard
              key={ev.id}
              event={ev}
              variant="list"
              locationFallback={locationFallback}
              href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface CollectionsViewProps {
  lang: "en" | "ru" | "uz";
  isLoading: boolean;
  collections: { def: CollectionDef; items: DesignEvent[] }[];
  locale: Locale;
}

function CollectionsView({
  lang,
  isLoading,
  collections,
  locale,
}: CollectionsViewProps): React.ReactNode {
  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i}>
            <div
              className="skeleton"
              style={{ height: 28, width: 220, borderRadius: 4, marginBottom: 14 }}
            />
            <div className="cm-events-collection-grid">
              {Array.from({ length: 3 }, (_, j) => (
                <div
                  key={j}
                  className="skeleton"
                  style={{ height: 320, borderRadius: 8 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <p
        style={{
          padding: 32,
          borderRadius: 8,
          background: "var(--bg-2)",
          border: "1px dashed var(--border-2)",
          color: "var(--fg-3)",
          textAlign: "center",
          font: "500 14px/1.5 var(--font-sans)",
        }}
      >
        {t(lang, {
          en: "No collections yet — check back soon.",
          ru: "Подборок пока нет — загляните позже.",
          uz: "Hozircha toʻplamlar yoʻq — keyinroq kiring.",
        })}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
      {collections.map(({ def, items }) => (
        <section key={def.id}>
          <header
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-1)",
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Eyebrow style={{ marginBottom: 6 }}>
                {t(lang, {
                  en: "Collection",
                  ru: "Подборка",
                  uz: "Toʻplam",
                })}
              </Eyebrow>
              <h2
                style={{
                  font: "700 24px/1.1 var(--font-sans)",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  color: "var(--ink-400)",
                  textWrap: "balance",
                }}
              >
                {t(lang, def.title)}
              </h2>
              <p
                style={{
                  marginTop: 6,
                  font: "400 14px/1.55 var(--font-sans)",
                  color: "var(--fg-2)",
                  maxWidth: "60ch",
                  textWrap: "pretty",
                }}
              >
                {t(lang, def.blurb)}
              </p>
            </div>
            <span
              style={{
                font: "500 11px/1 var(--font-mono)",
                color: "var(--fg-3)",
                letterSpacing: "0.04em",
              }}
            >
              {plural(lang, items.length, EVENTS_PLURAL)}
            </span>
          </header>
          <div className="cm-events-collection-grid">
            {items.map((ev) => (
              <CalmEventCard
                key={ev.id}
                event={ev}
                href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface CategoriesViewProps {
  lang: "en" | "ru" | "uz";
  designEvents: DesignEvent[];
  onPickCategory: (id: string) => void;
}

function CategoriesView({
  lang,
  designEvents,
  onPickCategory,
}: CategoriesViewProps): React.ReactNode {
  const categoriesQuery = usePublicCategories();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of designEvents) {
      if (!ev.cat) continue;
      map.set(ev.cat, (map.get(ev.cat) ?? 0) + 1);
    }
    return map;
  }, [designEvents]);

  // Встроенная иконка + описание по slug — fallback для стандартных тематик.
  const fallbackBySlug = useMemo(
    () => new Map(CATEGORY_CARDS.map((c) => [c.id, c])),
    [],
  );

  if (categoriesQuery.isLoading) {
    return (
      <div className="cm-events-category-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="cm-cat-skel-card" aria-hidden>
            <div className="cm-cat-skel-card__top">
              <span className="cm-skel cm-skel--cat-icon" />
              <span className="cm-skel cm-skel--cat-count" />
            </div>
            <span className="cm-skel cm-skel--cat-title" />
            <span className="cm-skel cm-skel--cat-line" />
            <span className="cm-skel cm-skel--cat-line cm-skel--cat-line-short" />
          </div>
        ))}
      </div>
    );
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="cm-events-category-grid">
      {categories.map((c) => {
        const slug = c.slug ?? c.id;
        const fb = fallbackBySlug.get(slug);
        const iconUrl = c.icon ? resolveMediaUrl(c.icon) : undefined;
        const count = c._count?.events ?? counts.get(slug) ?? 0;
        const blurb = c.description || (fb ? t(lang, fb.blurb) : "");
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPickCategory(slug)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 24,
              background: "var(--bone-50)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xs)",
              textAlign: "left",
              cursor: "pointer",
              transition:
                "box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.borderColor = "var(--border-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "var(--shadow-xs)";
              e.currentTarget.style.borderColor = "var(--border-1)";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  background: "var(--ember-50)",
                  color: "var(--ember-500)",
                  overflow: "hidden",
                }}
              >
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt=""
                    style={{ width: 22, height: 22, objectFit: "contain" }}
                  />
                ) : (
                  <DesignIcon name={fb?.ic ?? "sparkles"} size={22} stroke={1.7} />
                )}
              </span>
              <span
                style={{
                  font: "500 11px/1 var(--font-mono)",
                  color: "var(--fg-3)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {plural(lang, count, EVENTS_PLURAL)}
              </span>
            </div>
            <div>
              <h3
                style={{
                  font: "700 18px/1.2 var(--font-sans)",
                  letterSpacing: "-0.015em",
                  color: "var(--ink-400)",
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {c.name}
              </h3>
              {blurb && (
                <p
                  style={{
                    font: "400 14px/1.55 var(--font-sans)",
                    color: "var(--fg-2)",
                    margin: 0,
                    textWrap: "pretty",
                  }}
                >
                  {blurb}
                </p>
              )}
            </div>
            <span
              style={{
                marginTop: "auto",
                paddingTop: 4,
                font: "600 13px/1 var(--font-sans)",
                color: "var(--ember-500)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t(lang, {
                en: "Open category",
                ru: "Открыть категорию",
                uz: "Yoʻnalishni ochish",
              })}
              <DesignIcon name="arrow" size={13} stroke={2} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
