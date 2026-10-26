"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@shared/ui/dropdown-menu";
import { useMemo, useState } from "react";

import { useLocale } from "@eventflow/i18n/react";

import { mapPublicEventsToDesignEvents } from "@entities/event/lib";
import { organizerAppUrl } from "@shared/config";
import {
  usePublicEventsQuery,
  type PublicEventsResponse,
} from "@shared/lib/hooks/useEventsQuery";
import { usePublicCategories } from "@shared/lib/hooks/usePublicCategories";
import { resolveMediaUrl } from "@shared/lib/utils";
import { getCategory } from "@shared/lib/catalog-taxonomy";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { EVENTS_PLURAL } from "@shared/lib/plurals";
import { Container } from "@shared/ui/container";
import {
  CalmEventCard,
  DesignIcon,
  Eyebrow,
  ItalicAccent,
  SectionLink,
} from "@shared/ui/design-system";

import { plural, type Locale } from "@eventflow/i18n";

import "./calm-marketplace-hero.css";

const t = (
  lang: "en" | "ru" | "uz",
  bag: { en: string; ru?: string; uz?: string },
): string =>
  (lang === "ru" ? bag.ru : lang === "uz" ? bag.uz : bag.en) ?? bag.en;

const pickLang = (locale: Locale): "en" | "ru" | "uz" => {
  if (locale === "ru") return "ru";
  if (locale === "uz") return "uz";
  return "en";
};

interface PopularPill {
  id: string;
  en: string;
  ru: string;
  uz?: string;
  filter: string;
}

// Встроенная иконка по slug — fallback, пока для тематики не загружена своя.
const POPULAR: PopularPill[] = [
  { id: "workshops", en: "Workshops", ru: "Воркшопы", uz: "Ustaxonalar", filter: "workshops" },
  { id: "talks", en: "Business training", ru: "Бизнес-тренинги", uz: "Trening", filter: "business-training" },
  { id: "meetings", en: "Meetings", ru: "Бизнес-встречи", uz: "Uchrashuvlar", filter: "business-meetings" },
  { id: "conferences", en: "Conferences", ru: "Конференции", uz: "Konferensiyalar", filter: "conference" },
  { id: "forums", en: "Forums", ru: "Форумы", uz: "Forumlar", filter: "forum" },
];

export interface CalmMarketplaceHeroProps {
  /** Server-fetched upcoming events for SSR/SEO of the featured strip. */
  initialEvents?: PublicEventsResponse;
  /** Recently-held events, fetched server-side only when there are no upcoming
   *  ones — the featured strip falls back to these instead of an empty state. */
  initialPastEvents?: PublicEventsResponse;
}

export function CalmMarketplaceHero({
  initialEvents,
  initialPastEvents,
}: CalmMarketplaceHeroProps = {}): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);
  const categoriesQuery = usePublicCategories();
  const categories = categoriesQuery.data ?? [];
  const eventsQuery = usePublicEventsQuery({
    params: { limit: 6, filter: "upcoming" },
    initialData: initialEvents,
  });
  const countQuery = usePublicEventsQuery({
    params: { limit: 50, filter: "upcoming" },
  });

  const designEvents = useMemo(
    () =>
      eventsQuery.data
        ? mapPublicEventsToDesignEvents(eventsQuery.data.items.slice(0, 3), {
            locale,
          })
        : [],
    [eventsQuery.data, locale],
  );

  const catCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!countQuery.data) return map;
    for (const ev of countQuery.data.items) {
      for (const cat of ev.categories ?? []) {
        if (cat.slug) map.set(cat.slug, (map.get(cat.slug) ?? 0) + 1);
      }
    }
    return map;
  }, [countQuery.data]);

  // Show categories that actually have events first — a wall of "0 events"
  // up top is a weak first impression. Stable within each group.
  const categoryCount = (c: (typeof categories)[number]): number =>
    c._count?.events ?? catCounts.get(c.slug ?? "") ?? 0;
  const sortedCategories = [...categories].sort(
    (a, b) => (categoryCount(b) > 0 ? 1 : 0) - (categoryCount(a) > 0 ? 1 : 0),
  );

  // Date filter + popular topic tags only make sense at scale — hide them
  // until there are 10+ active (upcoming) events to browse.
  const activeEventsCount = countQuery.data?.total ?? 0;
  const showDiscovery = activeEventsCount >= 10;
  // With zero published events, a "catalog" band and a curated strip read as
  // empty filler. Suppress them and show one honest empty state instead.
  // Derived from `eventsQuery` (not `countQuery`) because only the former has
  // server-side initialData — so this is already correct during SSR, letting
  // the past-events fallback render in the initial HTML with no client flash.
  const hasNoEvents =
    !eventsQuery.isLoading && (eventsQuery.data?.total ?? 0) === 0;

  // Fallback: when there are no upcoming events, surface recently-held ones so
  // the featured strip still conveys real platform activity — a warmer first
  // impression than a bare empty state. Only fetched when actually needed.
  const pastEventsQuery = usePublicEventsQuery({
    params: { limit: 6, filter: "past" },
    enabled: hasNoEvents,
    initialData: initialPastEvents,
  });
  const pastDesignEvents = useMemo(
    () =>
      pastEventsQuery.data
        ? mapPublicEventsToDesignEvents(pastEventsQuery.data.items.slice(0, 3), {
            locale,
          })
        : [],
    [pastEventsQuery.data, locale],
  );
  const showPastFallback = hasNoEvents && pastDesignEvents.length > 0;
  const pastHref = withLocalePath("/events/past", locale);

  type DateFilter = "any" | "today" | "tomorrow" | "weekend" | "week" | "month";
  const DATE_FILTERS: DateFilter[] = ["any", "today", "tomorrow", "weekend", "week", "month"];
  const DATE_LABELS: Record<DateFilter, { en: string; ru: string; uz: string }> = {
    any:      { en: "Any date",     ru: "Любая дата",     uz: "Istalgan sana" },
    today:    { en: "Today",        ru: "Сегодня",        uz: "Bugun" },
    tomorrow: { en: "Tomorrow",     ru: "Завтра",         uz: "Ertaga" },
    weekend:  { en: "This weekend", ru: "Эти выходные",   uz: "Bu hafta oxiri" },
    week:     { en: "This week",    ru: "На этой неделе", uz: "Bu hafta" },
    month:    { en: "This month",   ru: "В этом месяце",  uz: "Bu oy" },
  };

  const [dateFilter, setDateFilter] = useState<DateFilter>("any");

  // On a single-column phone the full topic list runs long and pushes the
  // featured strip well below the fold. Peek the first ~2.5 cards, fade the
  // rest, and let people expand on demand. No-op above the mobile breakpoint.
  const [catExpanded, setCatExpanded] = useState(false);
  const catToggleable = !categoriesQuery.isLoading && sortedCategories.length > 3;

  const eventsHref = withLocalePath("/events", locale);

  return (
    <div className="cm-root">
      {/* ── Centered hero on bone canvas ── */}
      <section className="cm-hero">
        <div aria-hidden className="cm-hero__glow" />

        <Container size="narrow" className="cm-hero__inner">

          <h1 className="cm-hero__title">
            {lang === "ru" ? (
              <>
                Найди событие,{" "}
                <ItalicAccent>в которое</ItalicAccent>{" "}
                стоит прийти.
              </>
            ) : lang === "uz" ? (
              <>
                Borishga arziydigan{" "}
                <ItalicAccent>tadbirni</ItalicAccent>{" "}
                toping.
              </>
            ) : (
              <>
                Find an event{" "}
                <ItalicAccent>worth showing up</ItalicAccent>{" "}
                for.
              </>
            )}
          </h1>

          <p className="cm-hero__lede">
            {t(lang, {
              en: "Spend your time well. Find your perfect event on Eventflow. Fast sign-up for the events that matter — from cozy workshops to big gatherings.",
              ru: "Проводите время с пользой. Найдите свое идеальное мероприятие на Eventflow. Быстрая регистрация на главные события: от уютных мастер-классов до больших встреч.",
              uz: "Vaqtingizni foydali o‘tkazing. Eventflow orqali o‘zingizga mos tadbirni toping. Asosiy tadbirlarga oson ro‘yxatdan o‘tish: qulay master-klasslardan tortib katta uchrashuvlargacha.",
            })}
          </p>

          {/* Pill search */}
          <form
            action={eventsHref}
            method="get"
            role="search"
            className="cm-search"
          >
            <label className="cm-search__field">
              <DesignIcon
                name="search"
                size={16}
                stroke={2}
                style={{ color: "var(--fg-3)" }}
              />
              <input
                name="query"
                aria-label={t(lang, {
                  en: "Search events",
                  ru: "Поиск событий",
                  uz: "Tadbirlarni qidirish",
                })}
                placeholder={t(lang, {
                  en: "Hackathons, workshops…",
                  ru: "Хакатоны, воркшопы…",
                  uz: "Xakatonlar, ustaxonalar…",
                })}
                className="cm-search__input"
              />
            </label>
            {showDiscovery && (
              <>
                <span aria-hidden className="cm-search__divider" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`cm-search__date${dateFilter !== "any" ? " is-active" : ""}`}
                    >
                      <DesignIcon
                        name="calendar"
                        size={14}
                        stroke={2}
                        style={{ color: dateFilter !== "any" ? "var(--ember-500)" : "var(--fg-3)" }}
                      />
                      {t(lang, DATE_LABELS[dateFilter])}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-3)", marginLeft: 2 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" sideOffset={8}>
                    {DATE_FILTERS.map((key) => (
                      <DropdownMenuItem
                        key={key}
                        onSelect={() => setDateFilter(key)}
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
                {dateFilter !== "any" && <input type="hidden" name="date" value={dateFilter} />}
              </>
            )}
            <button type="submit" className="cm-search__submit">
              <DesignIcon name="search" size={15} stroke={2.2} />
              <span className="cm-search__submit-label">
                {t(lang, { en: "Search", ru: "Найти", uz: "Topish" })}
              </span>
            </button>
          </form>

          {/* Popular pills */}
          {showDiscovery && (
            <div className="cm-popular">
              <Eyebrow style={{ marginBottom: 14 }} align="center">
                {t(lang, { en: "Popular", ru: "Популярно", uz: "Mashhur" })}
              </Eyebrow>
              <div className="cm-popular__list">
                {POPULAR.map((p) => (
                  <Link
                    key={p.id}
                    href={`${eventsHref}?cat=${p.filter}`}
                    className="cm-pill"
                  >
                    {t(lang, p)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* ── Tinted category band ── */}
      {!hasNoEvents && (
      <section className="cm-cat">
        <Container size="wide">
          <div className="cm-section-head">
            <div>
              <Eyebrow style={{ marginBottom: 10 }}>
                {t(lang, { en: "Browse", ru: "Каталог", uz: "Katalog" })}
              </Eyebrow>
              <h2 className="cm-section-head__title">
                {t(lang, { en: "Events ", ru: "События ", uz: "Tadbirlar " })}
                <ItalicAccent>
                  {t(lang, {
                    en: "by topic",
                    ru: "по тематике",
                    uz: "mavzu boʻyicha",
                  })}
                </ItalicAccent>
              </h2>
            </div>
            <SectionLink href={eventsHref}>
              {t(lang, {
                en: "All categories",
                ru: "Все категории",
                uz: "Barcha kategoriyalar",
              })}
            </SectionLink>
          </div>

          <div
            className={`cm-cat-collapse${catToggleable ? " is-toggleable" : ""}${catExpanded ? " is-expanded" : ""}`}
          >
          <div className="cm-cat-grid">
            {categoriesQuery.isLoading &&
              Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="cm-cat-card cm-cat-card--skel" aria-hidden>
                  <div className="cm-skel cm-skel--icon" />
                  <div className="cm-cat-card__text">
                    <div className="cm-skel cm-skel--name" />
                    <div className="cm-skel cm-skel--count" />
                  </div>
                </div>
              ))}
            {!categoriesQuery.isLoading &&
              sortedCategories.map((c) => {
              const slug = c.slug ?? "";
              const iconUrl = c.icon ? resolveMediaUrl(c.icon) : undefined;
              // If this slug matches our static taxonomy, link to the
              // dedicated landing page (`/events/category/[slug]`) — it has
              // its own metadata, JSON-LD, FAQ and ranks independently in
              // search. Otherwise fall back to the catalog filter so any
              // dynamic categories from the API still work.
              const landingHref = getCategory(slug)
                ? withLocalePath(`/events/category/${slug}`, locale)
                : `${eventsHref}?cat=${slug}`;
              return (
                <Link
                  key={c.id}
                  href={landingHref}
                  className="cm-cat-card"
                >
                  <div className="cm-cat-card__icon">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt=""
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <DesignIcon
                        name={getCategory(slug)?.icon ?? "sparkles"}
                      />
                    )}
                  </div>
                  <div className="cm-cat-card__text">
                    <div className="cm-cat-card__name">{c.name}</div>
                    {(() => {
                      const count = c._count?.events ?? catCounts.get(slug) ?? 0;
                      if (countQuery.isLoading)
                        return (
                          <div className="cm-cat-card__count">
                            <span className="cm-cat-skeleton" />
                          </div>
                        );
                      // Don't paint a wall of "0 events" — only show a count
                      // for topics that actually have something scheduled.
                      if (count === 0) return null;
                      return (
                        <div className="cm-cat-card__count">
                          {plural(lang, count, EVENTS_PLURAL)}
                        </div>
                      );
                    })()}
                  </div>
                  <DesignIcon
                    name="arrow"
                    size={14}
                    stroke={2}
                    style={{ color: "var(--fg-3)" }}
                  />
                </Link>
              );
            })}
          </div>
          {catToggleable && (
            <>
              <div className="cm-cat-fade" aria-hidden />
              <button
                type="button"
                className="cm-cat-toggle"
                onClick={() => setCatExpanded((v) => !v)}
                aria-expanded={catExpanded}
              >
                {catExpanded
                  ? t(lang, {
                      en: "Show less",
                      ru: "Свернуть",
                      uz: "Yigʻish",
                    })
                  : t(lang, {
                      en: "Show all",
                      ru: "Показать все",
                      uz: "Hammasini koʻrsatish",
                    })}
                <svg
                  className="cm-cat-toggle__chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </>
          )}
          </div>
        </Container>
      </section>
      )}

      {/* ── Featured strip ── */}
      <section className="cm-featured">
        <Container size="wide">
          <div className="cm-section-head cm-section-head--underline">
            <div>
              <Eyebrow style={{ marginBottom: 8 }}>
                {showPastFallback
                  ? t(lang, { en: "Recently", ru: "Недавно", uz: "Yaqinda" })
                  : t(lang, { en: "Coming up", ru: "Афиша", uz: "Afisha" })}
              </Eyebrow>
              <h2 className="cm-section-head__title">
                {showPastFallback
                  ? t(lang, { en: "Recently held ", ru: "Недавние ", uz: "Yaqinda oʻtgan " })
                  : t(lang, { en: "Upcoming ", ru: "Ближайшие ", uz: "Yaqin " })}
                <ItalicAccent>
                  {t(lang, { en: "events", ru: "события", uz: "tadbirlar" })}
                </ItalicAccent>
              </h2>
            </div>
            {!hasNoEvents ? (
              <SectionLink href={eventsHref}>
                {t(lang, {
                  en: "See all",
                  ru: "Смотреть все",
                  uz: "Hammasini koʻrish",
                })}
              </SectionLink>
            ) : showPastFallback ? (
              <SectionLink href={pastHref}>
                {t(lang, {
                  en: "See all",
                  ru: "Смотреть все",
                  uz: "Hammasini koʻrish",
                })}
              </SectionLink>
            ) : null}
          </div>

          {eventsQuery.isLoading || (hasNoEvents && pastEventsQuery.isLoading) ? (
            <div className="cm-event-grid">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 360, borderRadius: 8 }}
                />
              ))}
            </div>
          ) : designEvents.length > 0 ? (
            <div className="cm-event-grid">
              {designEvents.map((ev) => (
                <CalmEventCard
                  key={ev.id}
                  event={ev}
                  href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
                />
              ))}
            </div>
          ) : showPastFallback ? (
            <div className="cm-event-grid">
              {pastDesignEvents.map((ev) => (
                <CalmEventCard
                  key={ev.id}
                  event={ev}
                  href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
                />
              ))}
            </div>
          ) : (
            <div className="cm-empty-state">
              <span className="cm-empty-state__icon" aria-hidden>
                <DesignIcon name="calendar" size={26} stroke={1.7} />
              </span>
              <h3 className="cm-empty-state__title">
                {t(lang, {
                  en: "No upcoming events yet",
                  ru: "Пока нет предстоящих событий",
                  uz: "Hozircha boʻladigan tadbirlar yoʻq",
                })}
              </h3>
              <p className="cm-empty-state__text">
                {t(lang, {
                  en: "Eventflow is just getting started in Uzbekistan. The first events will appear here soon — or you can host your own.",
                  ru: "Eventflow только запускается в Узбекистане. Первые события появятся здесь совсем скоро — или вы можете провести своё.",
                  uz: "Eventflow Oʻzbekistonda endi ishga tushmoqda. Birinchi tadbirlar tez orada shu yerda paydo boʻladi — yoki oʻzingiznikini oʻtkazishingiz mumkin.",
                })}
              </p>
              <div className="cm-empty-state__actions">
                <a
                  href={organizerAppUrl}
                  className="cm-empty-state__cta"
                >
                  {t(lang, {
                    en: "Create an event",
                    ru: "Создать событие",
                    uz: "Tadbir yaratish",
                  })}
                </a>
                <Link
                  href={withLocalePath("/blog", locale)}
                  className="cm-empty-state__cta cm-empty-state__cta--ghost"
                >
                  {t(lang, {
                    en: "Read the blog",
                    ru: "Читать блог",
                    uz: "Blogni oʻqish",
                  })}
                </Link>
              </div>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
