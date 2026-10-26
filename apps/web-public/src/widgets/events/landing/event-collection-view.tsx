"use client";

import { useMemo } from "react";

import { useLocale } from "@eventflow/i18n/react";

import { mapPublicEventsToDesignEvents } from "@entities/event/lib";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { Container } from "@shared/ui/container";
import { CalmEventCard, DesignIcon, Eyebrow } from "@shared/ui/design-system";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

import type { PublicEvent } from "@shared/api/eventService";
import type { DesignIconName } from "@shared/ui/design-system";

interface RelatedLink {
  label: string;
  /** Unlocalized href, e.g. "/events/city/tashkent". */
  href: string;
  /** Upcoming-event count; drives ordering emphasis and the counter. */
  count?: number;
  /** Localized counter copy, e.g. "3 события". Cards layout only. */
  countLabel?: string;
  /** Fallback glyph for the cards layout. */
  icon?: DesignIconName;
  /** Uploaded icon (already resolved to an absolute URL); wins over `icon`. */
  iconUrl?: string;
}

interface ActionLink {
  label: string;
  href: string;
  /** External hrefs (organizer app) skip locale prefixing. */
  external?: boolean;
}

export interface EventCollectionViewProps {
  events: PublicEvent[];
  eyebrow: string;
  heading: string;
  intro?: string;
  /** Short line under the title, e.g. "3 события" — only when there are results. */
  meta?: string;
  /** Headline of the empty state; the sentence below it is `emptyText`. */
  emptyTitle?: string;
  emptyText: string;
  /** Icon inside the empty-state medallion. */
  emptyIcon?: DesignIconName;
  /** Second call to action in the empty state (the catalog link is always there). */
  emptyAction?: ActionLink;
  /** Recently-held events in the same collection — shown when nothing is upcoming. */
  pastEvents?: PublicEvent[];
  pastHeading?: string;
  pastNote?: string;
  pastAllLabel?: string;
  browseAllLabel: string;
  locationFallback: string;
  relatedLabel?: string;
  related?: RelatedLink[];
  /**
   * `cards` mirrors the catalog band on the home page (icon, name, counter) —
   * use it for topic categories. `chips` stays for flat lists like cities.
   */
  relatedLayout?: "chips" | "cards";
}

/** Ghost button of the empty state — plain `<a>` for the organizer app. */
function SecondaryAction({ action }: { action: ActionLink }): React.ReactNode {
  const className = "cm-landing-btn cm-landing-btn--ghost";
  if (action.external) {
    return (
      <a href={action.href} className={className}>
        {action.label}
      </a>
    );
  }
  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

/**
 * Lean, fully server-rendered landing view for a filtered event collection
 * (category / city). Receives events as props so the grid is in the SSR HTML
 * for crawlers and AI engines, while staying interactive after hydration.
 *
 * An empty collection is a normal state for a young catalog, so the empty
 * case is a designed layout rather than a one-line placeholder: it names the
 * situation, offers a way onward, and — when the caller passes them — shows
 * recently-held events so the page still carries real content and links.
 */
export function EventCollectionView({
  events,
  eyebrow,
  heading,
  intro,
  meta,
  emptyTitle,
  emptyText,
  emptyIcon = "calendar",
  emptyAction,
  pastEvents,
  pastHeading,
  pastNote,
  pastAllLabel,
  browseAllLabel,
  locationFallback,
  relatedLabel,
  related,
  relatedLayout = "chips",
}: EventCollectionViewProps): React.ReactNode {
  const locale = useLocale();
  const designEvents = useMemo(
    () => mapPublicEventsToDesignEvents(events, { locale }),
    [events, locale],
  );
  const pastDesignEvents = useMemo(
    () => mapPublicEventsToDesignEvents(pastEvents ?? [], { locale }),
    [pastEvents, locale],
  );
  const isEmpty = designEvents.length === 0;
  const showPast = isEmpty && pastDesignEvents.length > 0;

  return (
    <div className="cm-landing-root">
      <Container size="wide">
        <div className="cm-landing-header">
          <Eyebrow style={{ marginBottom: 8 }}>{eyebrow}</Eyebrow>
          <h1 className="cm-landing-title">{heading}</h1>
          {intro ? <p className="cm-landing-intro">{intro}</p> : null}
          {meta && !isEmpty ? <p className="cm-landing-meta">{meta}</p> : null}
        </div>

        {isEmpty ? (
          <div className="cm-landing-empty">
            <span className="cm-landing-empty__badge" aria-hidden="true">
              <DesignIcon name={emptyIcon} size={20} />
            </span>
            {emptyTitle ? (
              <p className="cm-landing-empty__title">{emptyTitle}</p>
            ) : null}
            <p className="cm-landing-empty__text">{emptyText}</p>
            <div className="cm-landing-empty__actions">
              <Link href="/events" className="cm-landing-btn">
                {browseAllLabel}
              </Link>
              {emptyAction ? (
                <SecondaryAction action={emptyAction} />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="cm-landing-grid">
            {designEvents.map((ev) => (
              <CalmEventCard
                key={ev.id}
                event={ev}
                locationFallback={locationFallback}
                href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
              />
            ))}
          </div>
        )}

        {showPast ? (
          <section className="cm-landing-past" aria-label={pastHeading}>
            <div className="cm-landing-past__head">
              <h2 className="cm-landing-past__title">{pastHeading}</h2>
              {pastAllLabel ? (
                <Link href="/events/past" className="cm-landing-past__all">
                  {pastAllLabel}
                </Link>
              ) : null}
            </div>
            {pastNote ? (
              <p className="cm-landing-past__note">{pastNote}</p>
            ) : null}
            <div className="cm-landing-grid">
              {pastDesignEvents.map((ev) => (
                <CalmEventCard
                  key={ev.id}
                  event={ev}
                  locationFallback={locationFallback}
                  href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {related && related.length > 0 ? (
          <nav className="cm-landing-related" aria-label={relatedLabel}>
            {relatedLabel ? (
              <Eyebrow style={{ marginBottom: 12 }}>{relatedLabel}</Eyebrow>
            ) : null}
            {relatedLayout === "cards" ? (
              <div className="cm-landing-cat-grid">
                {related.map((r) => (
                  <Link key={r.href} href={r.href} className="cm-landing-cat">
                    <span className="cm-landing-cat__icon" aria-hidden="true">
                      {r.iconUrl ? (
                        <img src={r.iconUrl} alt="" width={20} height={20} />
                      ) : (
                        <DesignIcon name={r.icon ?? "sparkles"} />
                      )}
                    </span>
                    <span className="cm-landing-cat__text">
                      <span className="cm-landing-cat__name">{r.label}</span>
                      {r.countLabel ? (
                        <span className="cm-landing-cat__count">
                          {r.countLabel}
                        </span>
                      ) : null}
                    </span>
                    <DesignIcon
                      name="arrow"
                      size={14}
                      stroke={2}
                      style={{ color: "var(--fg-3)", flexShrink: 0 }}
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="cm-landing-chips">
                {related.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className={`cm-landing-chip${r.count ? " is-live" : ""}`}
                  >
                    {r.label}
                    {r.count ? (
                      <span className="cm-landing-chip__count">{r.count}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        ) : null}

        <div className="cm-landing-all">
          <Link href="/events" className="cm-landing-all-link">
            {browseAllLabel}
          </Link>
        </div>
      </Container>

      <style>{`
        .cm-landing-root {
          background: var(--bg-1);
          color: var(--fg-1);
          padding-block: clamp(28px, 4vw, 40px) clamp(48px, 7vw, 80px);
        }
        .cm-landing-header {
          padding-bottom: 18px;
          border-bottom: 2px solid var(--ink-400);
          margin-bottom: clamp(20px, 3vw, 28px);
        }
        .cm-landing-title {
          font: 700 clamp(26px, 4.5vw, 38px) / 1.05 var(--font-sans);
          letter-spacing: -0.025em;
          margin: 0;
          color: var(--ink-400);
          text-wrap: balance;
        }
        .cm-landing-intro {
          margin: 10px 0 0;
          font: 400 15px/1.6 var(--font-sans);
          color: var(--fg-2);
          max-width: 70ch;
          text-wrap: pretty;
        }
        .cm-landing-meta {
          margin: 12px 0 0;
          font: 500 13px/1 var(--font-sans);
          letter-spacing: 0.02em;
          color: var(--fg-3);
        }
        .cm-landing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        @media (max-width: 980px) {
          .cm-landing-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 620px) {
          .cm-landing-grid { grid-template-columns: 1fr; }
        }

        /* ── Empty state ─────────────────────────────────────────── */
        .cm-landing-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: clamp(32px, 5vw, 52px) 24px;
          background: var(--bg-2);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-2xl);
        }
        .cm-landing-empty__badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-pill);
          background: var(--ember-50);
          color: var(--ember-400);
          margin-bottom: 16px;
        }
        .cm-landing-empty__title {
          margin: 0;
          font: 600 clamp(17px, 2.2vw, 19px)/1.3 var(--font-sans);
          letter-spacing: -0.01em;
          color: var(--ink-400);
          text-wrap: balance;
        }
        .cm-landing-empty__text {
          margin: 8px 0 0;
          max-width: 52ch;
          font: 400 14.5px/1.65 var(--font-sans);
          color: var(--fg-2);
          text-wrap: pretty;
        }
        .cm-landing-empty__actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 22px;
        }
        .cm-landing-btn {
          display: inline-flex;
          align-items: center;
          height: 40px;
          padding-inline: 20px;
          border-radius: var(--radius-pill);
          border: 1px solid transparent;
          background: var(--ember-400);
          color: #fff;
          font: 600 14px/1 var(--font-sans);
          text-decoration: none;
          transition: background-color .15s var(--ease-standard),
                      border-color .15s var(--ease-standard),
                      color .15s var(--ease-standard);
        }
        .cm-landing-btn:hover { background: var(--ember-500); }
        .cm-landing-btn--ghost {
          background: transparent;
          border-color: var(--border-2);
          color: var(--ink-300);
        }
        .cm-landing-btn--ghost:hover {
          background: transparent;
          border-color: var(--ink-400);
          color: var(--ink-400);
        }

        /* ── Recently held ───────────────────────────────────────── */
        .cm-landing-past { margin-top: clamp(40px, 6vw, 64px); }
        .cm-landing-past__head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-2);
          margin-bottom: 12px;
        }
        .cm-landing-past__title {
          margin: 0;
          font: 600 clamp(17px, 2.4vw, 21px)/1.2 var(--font-sans);
          letter-spacing: -0.015em;
          color: var(--ink-400);
        }
        .cm-landing-past__all {
          flex-shrink: 0;
          font: 500 13px/1 var(--font-sans);
          color: var(--fg-3);
          text-decoration: none;
          transition: color .15s var(--ease-standard);
        }
        .cm-landing-past__all:hover { color: var(--ink-400); }
        @media (max-width: 620px) {
          /* A wrapped two-line heading next to a right-aligned link reads as a
             broken column on narrow screens — stack them instead. */
          .cm-landing-past__head {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
        .cm-landing-past__note {
          margin: 0 0 18px;
          font: 400 13.5px/1.6 var(--font-sans);
          color: var(--fg-3);
          max-width: 70ch;
        }

        /* ── Related + footer link ───────────────────────────────── */
        .cm-landing-related { margin-top: clamp(36px, 5vw, 56px); }
        .cm-landing-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .cm-landing-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-1);
          color: var(--fg-2);
          font: 500 13px/1 var(--font-sans);
          text-decoration: none;
          transition: border-color .15s var(--ease-standard), color .15s var(--ease-standard);
        }
        .cm-landing-chip:hover { border-color: var(--ink-400); color: var(--ink-400); }
        .cm-landing-chip.is-live { color: var(--ink-300); border-color: var(--border-2); }
        .cm-landing-chip__count {
          min-width: 18px;
          padding-inline: 5px;
          border-radius: var(--radius-pill);
          background: var(--ember-50);
          color: var(--ember-500);
          font: 600 11px/18px var(--font-sans);
          text-align: center;
        }
        /* Card layout — same object as the catalog band on the home page, so
           a topic looks identical wherever the visitor meets it. */
        .cm-landing-cat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .cm-landing-cat {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          background: var(--bone-50);
          border: 1px solid var(--border-1);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xs);
          text-decoration: none;
          color: inherit;
          transition: border-color .2s var(--ease-standard),
                      transform .2s var(--ease-standard),
                      box-shadow .2s var(--ease-standard);
        }
        .cm-landing-cat:hover {
          border-color: var(--border-2);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        .cm-landing-cat__icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          background: var(--ember-50);
          color: var(--ember-500);
        }
        .cm-landing-cat__icon img { width: 20px; height: 20px; object-fit: contain; }
        .cm-landing-cat__text { flex: 1; min-width: 0; display: block; }
        .cm-landing-cat__name {
          display: block;
          font: 600 14px/1.2 var(--font-sans);
          letter-spacing: -0.005em;
          color: var(--ink-400);
        }
        .cm-landing-cat__count {
          display: block;
          margin-top: 4px;
          font: 500 11px/1.4 var(--font-mono);
          color: var(--fg-3);
        }
        @media (max-width: 980px) {
          .cm-landing-cat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 620px) {
          .cm-landing-cat-grid { grid-template-columns: 1fr; }
          .cm-landing-cat { padding: 14px; }
        }

        .cm-landing-all { margin-top: clamp(28px, 4vw, 40px); }
        .cm-landing-all-link {
          display: inline-flex;
          align-items: center;
          font: 600 14px/1 var(--font-sans);
          color: var(--ember-500);
          text-decoration: none;
        }
        .cm-landing-all-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
