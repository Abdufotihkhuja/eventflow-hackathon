"use client";

import { useMemo, useState } from "react";

import { useLocale } from "@eventflow/i18n/react";

import { mapPublicEventsToDesignEvents } from "@entities/event/lib";
import { withLocalePath } from "@shared/lib/i18n-routing";
import {
  usePublicEventsQuery,
  type PublicEventsResponse,
} from "@shared/lib/hooks/useEventsQuery";
import { Container } from "@shared/ui/container";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@shared/ui/dropdown-menu";
import {
  CalmEventCard,
  DesignIcon,
  Eyebrow,
  ItalicAccent,
} from "@shared/ui/design-system";

import type { Locale } from "@eventflow/i18n";

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

interface CategoryChip {
  id: string;
  en: string;
  ru: string;
  uz?: string;
}

const CATEGORIES: CategoryChip[] = [
  { id: "all", en: "All", ru: "Все", uz: "Hammasi" },
  {
    id: "business-training",
    en: "Business training",
    ru: "Бизнес-тренинги",
    uz: "Trening",
  },
  {
    id: "business-meetings",
    en: "Meetings",
    ru: "Бизнес-встречи",
    uz: "Uchrashuvlar",
  },
  { id: "workshops", en: "Workshops", ru: "Воркшопы", uz: "Ustaxonalar" },
  {
    id: "conference",
    en: "Conferences",
    ru: "Конференции",
    uz: "Konferensiyalar",
  },
  { id: "forum", en: "Forums", ru: "Форумы", uz: "Forumlar" },
  { id: "hackathon", en: "Hackathons", ru: "Хакатоны", uz: "Xakatonlar" },
  { id: "ideathon", en: "Ideathons", ru: "Идеатоны", uz: "Ideatonlar" },
];

export interface PastEventsPageProps {
  initialQuery?: string;
  /** Server-fetched first page of past events, used to seed TanStack Query. */
  initialEvents?: PublicEventsResponse;
}

export function PastEventsPage({
  initialQuery = "",
  initialEvents,
}: PastEventsPageProps): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [cat, setCat] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const { data, isLoading, error } = usePublicEventsQuery({
    params: { limit: 50, filter: "past" },
    initialData: initialEvents,
  });

  const availableYears = useMemo(() => {
    if (!data?.items) return [] as number[];
    const set = new Set<number>();
    for (const ev of data.items) {
      if (ev.startDate) set.add(new Date(ev.startDate).getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [data?.items]);

  const designEvents = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;
    if (selectedYear !== null) {
      items = items.filter((ev) => new Date(ev.startDate).getFullYear() === selectedYear);
    }
    return mapPublicEventsToDesignEvents(items, { locale });
  }, [data?.items, locale, selectedYear]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return designEvents.filter((ev) => {
      if (cat !== "all" && ev.cat !== cat) return false;
      if (!q) return true;
      const haystack = [ev.title, ev.venue, ev.city, ev.org, ev.catLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [designEvents, cat, searchTerm]);

  // The project launched recently, so the archive only holds events from the
  // last few weeks — pinning a calendar year would be misleading. Show a
  // recency label by default and a concrete year only when one is filtered.
  const yearLabel = useMemo(() => {
    if (selectedYear !== null) return String(selectedYear);
    return t(lang, { en: "recent", ru: "недавнее", uz: "yaqinda" });
  }, [selectedYear, lang]);

  return (
    <div
      style={{
        background: "var(--bg-1)",
        color: "var(--fg-1)",
        paddingBlock: "40px 80px",
      }}
    >
      <Container size="wide">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: 18,
            borderBottom: "2px solid var(--ink-400)",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Eyebrow style={{ marginBottom: 8 }}>
              {t(lang, {
                en: "Discovery · Past",
                ru: "Каталог · Прошедшие",
                uz: "Katalog · Oʻtgan",
              })}
            </Eyebrow>
            <h1
              style={{
                font: "700 38px/1.05 var(--font-sans)",
                letterSpacing: "-0.025em",
                margin: 0,
                color: "var(--ink-400)",
              }}
            >
              {t(lang, {
                en: "What already happened ",
                ru: "Что уже прошло ",
                uz: "Boʻlib oʻtgan tadbirlar ",
              })}
              <ItalicAccent>· {yearLabel}</ItalicAccent>
            </h1>
            <p
              style={{
                marginTop: 10,
                font: "400 14px/1.55 var(--font-sans)",
                color: "var(--fg-2)",
                maxWidth: "60ch",
                textWrap: "pretty",
              }}
            >
              {t(lang, {
                en: "An archive of events that wrapped up. Browse by category, search for an organizer, see what the city has been up to.",
                ru: "Архив завершённых событий. Листайте по категориям, ищите организатора, смотрите чем жил город.",
                uz: "Yakunlangan tadbirlar arxivi. Yoʻnalish boʻyicha varaqlang, tashkilotchini qidiring.",
              })}
            </p>
          </div>
          <div
            style={{
              font: "500 12px/1 var(--font-mono)",
              color: "var(--fg-3)",
            }}
          >
            {filtered.length}{" "}
            {t(lang, {
              en: "past events",
              ru: "прошедших",
              uz: "oʻtgan tadbir",
            })}{" "}
            ·{" "}
            {t(lang, {
              en: "archive",
              ru: "архив",
              uz: "arxiv",
            })}
          </div>
        </div>

        {/* Search + controls row */}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t(lang, {
                en: "Search past events, venues, organizers",
                ru: "Поиск прошедших событий, площадок, организаторов",
                uz: "Oʻtgan tadbir, joy, tashkilotchini qidirish",
              })}
              className="cm-events-search__input"
            />
          </label>
          <div className="cm-events-controls__row">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`cm-events-date${selectedYear !== null ? " is-active" : ""}`}
                >
                  <DesignIcon
                    name="calendar"
                    size={14}
                    stroke={2}
                    style={selectedYear !== null ? { color: "var(--ember-500)" } : undefined}
                  />
                  {selectedYear !== null
                    ? String(selectedYear)
                    : t(lang, { en: "Any year", ru: "Любой год", uz: "Istalgan yil" })}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem
                  onSelect={() => setSelectedYear(null)}
                  style={selectedYear === null ? { color: "var(--ember-500)" } : undefined}
                >
                  {t(lang, { en: "Any year", ru: "Любой год", uz: "Istalgan yil" })}
                  {selectedYear === null && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </DropdownMenuItem>
                {availableYears.map((y) => (
                  <DropdownMenuItem
                    key={y}
                    onSelect={() => setSelectedYear(y)}
                    style={selectedYear === y ? { color: "var(--ember-500)" } : undefined}
                  >
                    {y}
                    {selectedYear === y && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </DropdownMenuItem>
                ))}
                {availableYears.length === 0 && (
                  <DropdownMenuItem disabled>
                    {t(lang, { en: "No years yet", ru: "Пока нет данных", uz: "Maʼlumot yoʻq" })}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="cm-events-toggle" role="tablist" aria-label="View">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`cm-events-toggle__btn${view === v ? " is-active" : ""}`}
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
          {CATEGORIES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`cm-events-chip${active ? " is-active" : ""}`}
              >
                {t(lang, c)}
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
              en: "Failed to load past events.",
              ru: "Не удалось загрузить прошедшие события.",
              uz: "Oʻtgan tadbirlarni yuklab boʻlmadi.",
            })}
          </p>
        ) : filtered.length === 0 ? (
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
              en: "Nothing in the archive yet.",
              ru: "В архиве пока ничего нет.",
              uz: "Arxivda hozircha hech narsa yoʻq.",
            })}
          </p>
        ) : view === "grid" ? (
          <div className="cm-events-grid">
            {filtered.map((ev) => (
              <CalmEventCard
                key={ev.id}
                event={ev}
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
                href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
              />
            ))}
          </div>
        )}
      </Container>

      <style>{`
        .cm-events-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 980px) {
          .cm-events-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 620px) {
          .cm-events-grid { grid-template-columns: 1fr; }
        }

        /* ── Search + controls row (mirror events-page) ──────── */
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

        /* ── Category chips ───────────────────────────────────── */
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

        /* ── Controls row ─────────────────────────────────────── */
        .pe-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .pe-controls__right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .pe-search {
          position: relative;
          flex: 1;
          min-width: 0;
          display: block;
        }
        .pe-search__icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--fg-3);
          pointer-events: none;
        }
        .pe-search__input {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          padding: 0 14px 0 40px;
          border-radius: 8px;
          border: 1px solid var(--border-1);
          background: var(--bone-50);
          font: 400 14px/1 var(--font-sans);
          color: var(--fg-1);
          outline: none;
          transition: border-color .15s var(--ease-standard),
                      box-shadow .15s var(--ease-standard);
        }
        .pe-search__input:hover { border-color: var(--border-2); }
        .pe-search__input:focus {
          border-color: var(--ember-400);
          box-shadow: 0 0 0 3px var(--ember-100);
        }

        .pe-year {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 44px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid var(--border-1);
          background: var(--bone-50);
          font: 500 13px/1 var(--font-sans);
          color: var(--fg-2);
          cursor: pointer;
          white-space: nowrap;
          transition: border-color .15s var(--ease-standard),
                      background .15s var(--ease-standard),
                      color .15s var(--ease-standard);
        }
        .pe-year:hover {
          border-color: var(--border-2);
          color: var(--ink-400);
        }
        .pe-year.is-active {
          color: var(--ember-500);
          border-color: var(--ember-400);
          background: var(--ember-50);
        }

        .pe-toggle {
          display: inline-flex;
          height: 44px;
          padding: 4px;
          background: var(--bone-100);
          border-radius: 8px;
          gap: 2px;
        }
        .pe-toggle__btn {
          padding: 0 14px;
          border: none;
          background: transparent;
          color: var(--fg-2);
          font: 600 12px/1 var(--font-sans);
          cursor: pointer;
          border-radius: 6px;
          transition: background .15s var(--ease-standard),
                      color .15s var(--ease-standard);
        }
        .pe-toggle__btn:hover { color: var(--ink-400); }
        .pe-toggle__btn.is-active {
          background: var(--bone-50);
          color: var(--ink-400);
          box-shadow: var(--shadow-xs);
        }

        /* ── Category chips ───────────────────────────────────── */
        .pe-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 28px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .pe-chips::-webkit-scrollbar { display: none; }
        .pe-chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border-1);
          background: transparent;
          color: var(--fg-2);
          font: 500 13px/1 var(--font-sans);
          cursor: pointer;
          white-space: nowrap;
          transition: border-color .15s var(--ease-standard),
                      background .15s var(--ease-standard),
                      color .15s var(--ease-standard);
        }
        .pe-chip:hover {
          border-color: var(--border-2);
          color: var(--ink-400);
        }
        .pe-chip.is-active {
          background: var(--ink-400);
          border-color: var(--ink-400);
          color: var(--bone-50);
        }

        /* ── Mobile layout ────────────────────────────────────── */
        @media (max-width: 720px) {
          .pe-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .pe-controls__right { gap: 8px; }
          .pe-year { flex: 1; justify-content: space-between; }
          .pe-chips {
            flex-wrap: nowrap;
            margin-left: -4px;
            margin-right: -4px;
            padding: 0 4px 4px;
          }
        }
      `}</style>
    </div>
  );
}
