"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import {
  formatPublishDate,
  formatReadTime,
  getCategoryLabel,
} from "@entities/blog";
import { mapPublicEventsToDesignEvents } from "@entities/event/lib";
import { isAuthenticated } from "@shared/lib/apiClient";
import { withLocalePath } from "@shared/lib/i18n-routing";
import {
  getOrganizationFollowErrorMessage,
  useActiveSection,
  useBlogPostsQuery,
  useBodyScrollLock,
  useContactOrganizationMutation,
  useEscapeKey,
  useFollowOrganizationMutation,
  useOrganizationEventsQuery,
  useOrganizationPublicProfileQuery,
  useOrganizationPublicStatsQuery,
  useUnfollowOrganizationMutation,
} from "@shared/lib/hooks";
import { resolveMediaUrl } from "@shared/lib/utils";
import { Container } from "@shared/ui/container";
import {
  CalmBlogCard,
  type CalmBlogCardData,
  CalmEventCard,
  DesignIcon,
  Eyebrow,
  ItalicAccent,
} from "@shared/ui/design-system";
import { LocalizedLink } from "@shared/ui/localized-link";

import { toast } from "sonner";

import type { Locale } from "@eventflow/i18n";
import type { BlogPost } from "@entities/blog";

// ----------------------------------------------------------------------------
// i18n helpers (for marketing copy without dictionary keys)
// ----------------------------------------------------------------------------

const pickLang = (locale: Locale): "en" | "ru" | "uz" => {
  if (locale === "ru") return "ru";
  if (locale === "uz") return "uz";
  return "en";
};

const tx = (
  lang: "en" | "ru" | "uz",
  bag: { en: string; ru?: string; uz?: string },
): string =>
  (lang === "ru" ? bag.ru : lang === "uz" ? bag.uz : bag.en) ?? bag.en;

// ----------------------------------------------------------------------------
// Sticky in-page navigation
// ----------------------------------------------------------------------------

interface SectionDef {
  id: string;
  label: { en: string; ru: string; uz?: string };
}

const SECTIONS: SectionDef[] = [
  { id: "about", label: { en: "About", ru: "О нас", uz: "Biz haqimizda" } },
  { id: "events", label: { en: "Events", ru: "События", uz: "Tadbirlar" } },
  { id: "blog", label: { en: "Editorial", ru: "Журнал", uz: "Maqolalar" } },
  { id: "contact", label: { en: "Contact", ru: "Связь", uz: "Aloqa" } },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

// ----------------------------------------------------------------------------
// Main page
// ----------------------------------------------------------------------------

interface OrganizerPublicPageProps {
  organizationId: string;
}

export function OrganizerPublicPage({
  organizationId,
}: OrganizerPublicPageProps): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const lang = pickLang(locale);
  const router = useRouter();
  const isAuth = typeof window !== "undefined" && isAuthenticated();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${locale}/organizers`);
    }
  }, [router, locale]);

  const profileQuery = useOrganizationPublicProfileQuery(organizationId);
  const profileFailed = profileQuery.isError;
  // Stats is a lightweight public fallback used only when the (also public)
  // profile request fails — keeps name/logo/event-count visible.
  const statsQuery = useOrganizationPublicStatsQuery(organizationId, {
    enabled: profileFailed,
  });

  const profile = profileQuery.data;
  const stats = statsQuery.data;
  const isLoadingProfile = profileQuery.isLoading && !profileFailed;
  const isLoadingStats = profileFailed && statsQuery.isLoading;
  const statsError = profileFailed && statsQuery.isError;
  const refetchStats = statsQuery.refetch;

  const name = profile?.name ?? stats?.name ?? "";
  const logoUrl = resolveMediaUrl(profile?.logoUrl ?? stats?.logoUrl) ?? null;
  const coverUrl = resolveMediaUrl(profile?.coverUrl) ?? null;
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const logoLoadFailed = logoUrl !== null && failedLogoUrl === logoUrl;
  const coverLoadFailed = coverUrl !== null && failedCoverUrl === coverUrl;
  const verified = profile?.verified ?? false;
  const eventsCount = profile?.eventsCount ?? stats?.totalEvents ?? 0;
  const followersCount = profile?.followersCount ?? 0;
  const description = profile?.description;
  const website = profile?.website;
  const city = profile?.city;
  const country = profile?.country;
  const isFollowing = profile?.isFollowing ?? false;

  const [eventsTab, setEventsTab] = useState<"upcoming" | "past">("upcoming");
  const [contactOpen, setContactOpen] = useState(false);

  const followMutation = useFollowOrganizationMutation();
  const unfollowMutation = useUnfollowOrganizationMutation();

  const [activeSection, setActiveSection] = useActiveSection(
    SECTION_IDS,
    "about",
  );

  // Keep --public-header-h in sync with the live landing header. A static
  // value in globals.css can't capture every state — the header subtly
  // reflows on auth resolve (login pill → avatar chip), on breakpoint
  // changes, and on web-font swap. The fallback 73px is right *most* of
  // the time but even ±2px shows up as either an ember-coloured cover
  // peeking between header bottom and sub-nav top OR a 1–2px nav slice
  // clipped behind the header. Event-detail page already runs the same
  // pattern (calm-event-details-view.tsx); this brings the organizer
  // profile to parity.
  // eslint-disable-next-line no-restricted-syntax -- DOM measurement of the global landing header
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.header-layer");
    if (!header) return;
    const sync = (): void => {
      document.documentElement.style.setProperty(
        "--public-header-h",
        `${Math.round(header.getBoundingClientRect().height)}px`,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      // Reset to the globals.css default so this page's last measurement
      // does not leak into other routes after navigation.
      document.documentElement.style.removeProperty("--public-header-h");
    };
  }, []);

  const handleNavClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  const handleFollowToggle = useCallback(() => {
    if (!isAuth) {
      toast.info(t("public.organizer.toasts.signInToFollow"));
      return;
    }
    if (isFollowing) {
      unfollowMutation.mutate(organizationId, {
        onError: (e) => toast.error(getOrganizationFollowErrorMessage(e)),
      });
    } else {
      followMutation.mutate(organizationId, {
        onError: (e) => toast.error(getOrganizationFollowErrorMessage(e)),
      });
    }
  }, [
    isAuth,
    isFollowing,
    organizationId,
    followMutation,
    unfollowMutation,
    t,
  ]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("public.organizer.shareTitle", { name }),
          url,
        });
      } catch {
        /* user cancelled */
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success(t("public.organizer.toasts.linkCopied"));
  }, [name, t]);

  if (isLoadingProfile || isLoadingStats) {
    return <OrganizerSkeleton />;
  }

  if (!name) {
    return (
      <OrganizerEmptyState
        message={
          statsError
            ? t("public.organizer.loadError")
            : t("public.organizer.notFound")
        }
        retryLabel={
          statsError
            ? statsQuery.isFetching
              ? t("common.loading")
              : t("actions.retry")
            : undefined
        }
        onRetry={statsError ? () => void refetchStats() : undefined}
        retryDisabled={statsQuery.isFetching}
        backLabel={t("public.organizer.backToOrganizers")}
      />
    );
  }

  const showCoverImage = coverUrl !== null && !coverLoadFailed;
  const followBusy =
    followMutation.isPending || unfollowMutation.isPending;
  const websiteHref = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : null;
  const websiteLabel = website?.replace(/^https?:\/\//, "");
  const locationLabel = [city, country].filter(Boolean).join(", ");

  return (
    <div
      style={{
        background: "var(--bg-1)",
        color: "var(--fg-1)",
        paddingBottom: 96,
      }}
    >
      {/* ============================================================ */}
      {/* HERO — full-bleed cover band + masthead overlay              */}
      {/* ============================================================ */}
      <header
        style={{
          position: "relative",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--border-1)",
        }}
      >
        {/* Cover band */}
        <div
          className="cm-org-cover"
          style={{
            position: "relative",
            height: 240,
            overflow: "hidden",
            background: showCoverImage
              ? "var(--bone-200)"
              : "var(--ember-50)",
          }}
        >
          {showCoverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              aria-hidden
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              loading="eager"
              decoding="async"
              onError={() => setFailedCoverUrl(coverUrl)}
            />
          ) : (
            <CoverFallback name={name} />
          )}
          {/* Top scrim so the back chip stays readable on light covers */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(28,25,23,0.28) 0%, rgba(28,25,23,0) 32%, rgba(28,25,23,0) 70%, rgba(28,25,23,0.18) 100%)",
              pointerEvents: "none",
            }}
          />
          {/* Back chip */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 0,
              right: 0,
              pointerEvents: "none",
            }}
          >
            <Container size="wide">
              <button
                type="button"
                onClick={handleBack}
                style={{
                  pointerEvents: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(28,25,23,0.72)",
                  border: "1px solid rgba(251,251,250,0.18)",
                  color: "var(--bone-50)",
                  font: "600 12px/1 var(--font-sans)",
                  letterSpacing: "0.01em",
                  cursor: "pointer",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                <DesignIcon name="arrow" size={12} stroke={2.4} style={{ transform: "scaleX(-1)" }} />
                {tx(lang, { en: "Back", ru: "Назад", uz: "Orqaga" })}
              </button>
            </Container>
          </div>
        </div>

        {/* Masthead — sits fully on bg-2 so name + eyebrow always have a
            clean background. Only the logo tile dips into the cover band. */}
        <Container size="wide">
          <div
            className="cm-org-masthead"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 24,
              alignItems: "center",
              paddingTop: 20,
              paddingBottom: 28,
              position: "relative",
            }}
          >
            {/* Logo tile — pulled up so it overlaps the cover band */}
            <div
              style={{
                position: "relative",
                width: 128,
                height: 128,
                marginTop: -76,
                marginBottom: -8,
                borderRadius: 16,
                overflow: "hidden",
                background: "var(--bone-50)",
                border: "1px solid var(--border-1)",
                boxShadow: "var(--shadow-md)",
                flexShrink: 0,
              }}
              className="cm-org-logo"
            >
              {logoUrl && !logoLoadFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  loading="eager"
                  decoding="async"
                  onError={() => setFailedLogoUrl(logoUrl)}
                />
              ) : (
                <LogoMonogram name={name} />
              )}
              {verified && (
                <span
                  title={tx(lang, {
                    en: "Verified organization",
                    ru: "Подтверждённая организация",
                    uz: "Tasdiqlangan tashkilot",
                  })}
                  style={{
                    position: "absolute",
                    bottom: 6,
                    right: 6,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--ember-400)",
                    color: "var(--bone-50)",
                    border: "2px solid var(--bone-50)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  <DesignIcon name="check" size={12} stroke={2.6} />
                </span>
              )}
            </div>

            {/* Identity */}
            <div style={{ minWidth: 0, paddingBottom: 8 }}>
              <Eyebrow style={{ marginBottom: 10 }}>
                {tx(lang, {
                  en: "Organizer profile",
                  ru: "Профиль организатора",
                  uz: "Tashkilotchi profili",
                })}
                {verified ? (
                  <>
                    {" · "}
                    <span style={{ color: "var(--ember-500)" }}>
                      {tx(lang, {
                        en: "Verified",
                        ru: "Подтверждён",
                        uz: "Tasdiqlangan",
                      })}
                    </span>
                  </>
                ) : null}
              </Eyebrow>
              <h1
                className="cm-org-title"
                style={{
                  font: "800 44px/1.05 var(--font-sans)",
                  letterSpacing: "-0.03em",
                  margin: 0,
                  color: "var(--ink-400)",
                  textWrap: "balance",
                }}
              >
                {name}
              </h1>
              {locationLabel ? (
                <div
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    font: "500 13px/1 var(--font-mono)",
                    letterSpacing: "0.04em",
                    color: "var(--fg-2)",
                  }}
                >
                  <DesignIcon name="pin" size={14} stroke={1.8} style={{ color: "var(--ember-500)" }} />
                  {locationLabel}
                </div>
              ) : null}
            </div>

            {/* Action cluster */}
            <div
              className="cm-org-actions"
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                paddingBottom: 8,
                justifyContent: "flex-end",
              }}
            >
              {isAuth ? (
                <>
                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={followBusy}
                    style={{
                      background: isFollowing
                        ? "transparent"
                        : "var(--ember-400)",
                      color: isFollowing
                        ? "var(--ink-400)"
                        : "var(--bone-50)",
                      border: isFollowing
                        ? "1px solid var(--ink-400)"
                        : "1px solid var(--ember-400)",
                      font: "600 13px/1 var(--font-sans)",
                      padding: "12px 20px",
                      borderRadius: 999,
                      cursor: followBusy ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: followBusy ? 0.7 : 1,
                      transition: "background 200ms, color 200ms",
                    }}
                  >
                    <DesignIcon
                      name={isFollowing ? "check" : "users"}
                      size={14}
                      stroke={2.2}
                    />
                    {followBusy
                      ? "…"
                      : isFollowing
                        ? t("public.organizer.unfollow")
                        : t("public.organizer.follow")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    style={{
                      background: "transparent",
                      color: "var(--ink-400)",
                      border: "1px solid var(--border-2)",
                      font: "600 13px/1 var(--font-sans)",
                      padding: "12px 20px",
                      borderRadius: 999,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <DesignIcon name="mail" size={14} stroke={2} />
                    {t("public.organizer.contact")}
                  </button>
                </>
              ) : (
                <LocalizedLink
                  href="/login"
                  style={{
                    background: "var(--ember-400)",
                    color: "var(--bone-50)",
                    border: "1px solid var(--ember-400)",
                    font: "600 13px/1 var(--font-sans)",
                    padding: "12px 20px",
                    borderRadius: 999,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <DesignIcon name="users" size={14} stroke={2.2} />
                  {t("public.organizer.signInToFollow")}
                </LocalizedLink>
              )}
              <button
                type="button"
                onClick={() => void handleShare()}
                aria-label={t("actions.share")}
                className="cm-org-share-btn"
                style={{
                  background: "transparent",
                  color: "var(--fg-2)",
                  border: "1px solid var(--border-1)",
                  font: "600 13px/1 var(--font-sans)",
                  padding: "12px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <DesignIcon name="compass" size={14} stroke={2} />
                <span className="cm-org-share-label">
                  {t("actions.share")}
                </span>
              </button>
            </div>
          </div>
        </Container>

        {/* Stat strip */}
        <Container size="wide">
          <div
            className="cm-org-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
              borderTop: "1px solid var(--border-1)",
              borderBottom: "1px solid var(--border-1)",
              marginTop: 8,
            }}
          >
            <StatCell
              label={tx(lang, {
                en: "Events hosted",
                ru: "Проведено событий",
                uz: "Oʻtkazilgan tadbirlar",
              })}
              value={eventsCount.toLocaleString()}
            />
            <StatCell
              label={t("public.organizer.followers")}
              value={profile ? followersCount.toLocaleString() : "—"}
              muted={!profile}
              border
            />
            <StatCell
              label={tx(lang, {
                en: "Status",
                ru: "Статус",
                uz: "Holat",
              })}
              value={
                verified
                  ? tx(lang, {
                      en: "Verified",
                      ru: "Подтверждён",
                      uz: "Tasdiqlangan",
                    })
                  : tx(lang, {
                      en: "Listed host",
                      ru: "В каталоге",
                      uz: "Katalogda",
                    })
              }
              accent={verified ? "var(--ember-500)" : undefined}
              border
            />
          </div>
        </Container>
      </header>

      {/* ============================================================ */}
      {/* Sticky in-page nav                                            */}
      {/* ============================================================ */}
      {/*
        Two subtleties below:

        1) `top: calc(var(--public-header-h) - 1px)` parks the sub-nav 1px
           UNDER the bottom of the live header instead of exactly at its
           edge. Sub-pixel header heights (e.g. 73.5px on retina) used to
           round to a value that overshot the real bottom by half a pixel,
           rendering as a 1px hairline gap between header and nav. The nav
           has an opaque `var(--bg-1)` background, so a 1px overlap is
           visually invisible — it just paints over the header's bottom
           border. Robust against any future rounding or zoom quirk.

        2) `padding: 16px 0` on the inner <ul> (was 12px). `overflow-x: auto`
           on a scrollable pill row implicitly enables vertical clipping, so
           the global focus-visible outline (`2px ember + 2px offset` = 4px
           reach beyond the pill border) was being chopped off the top/bottom
           of the focused pill. 16px gives the outline enough breathing room
           to render unclipped while keeping horizontal scrolling on mobile.
      */}
      <nav
        style={{
          position: "sticky",
          top: "calc(var(--public-header-h) - 1px)",
          zIndex: 5,
          background: "var(--bg-1)",
          borderBottom: "1px solid var(--border-1)",
        }}
      >
        <Container size="wide">
          <ul
            style={{
              display: "flex",
              gap: 6,
              listStyle: "none",
              margin: 0,
              padding: "16px 0",
              overflowX: "auto",
            }}
          >
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={handleNavClick(s.id)}
                    style={{
                      display: "inline-block",
                      padding: "8px 14px",
                      borderRadius: 999,
                      font: "600 13px/1 var(--font-sans)",
                      color: active ? "var(--bone-100)" : "var(--fg-2)",
                      background: active ? "var(--ink-400)" : "transparent",
                      border: `1px solid ${
                        active ? "var(--ink-400)" : "var(--border-1)"
                      }`,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx(lang, s.label)}
                  </a>
                </li>
              );
            })}
          </ul>
        </Container>
      </nav>

      {/* ============================================================ */}
      {/* About                                                         */}
      {/* ============================================================ */}
      <Container size="wide">
        <section
          id="about"
          style={{ scrollMarginTop: 140, padding: "48px 0 16px" }}
        >
          <div
            className="cm-org-about"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 48,
              alignItems: "start",
            }}
          >
            <div>
              <Eyebrow style={{ marginBottom: 14 }}>
                {tx(lang, {
                  en: "About the organizer",
                  ru: "Об организаторе",
                  uz: "Tashkilotchi haqida",
                })}
              </Eyebrow>
              <h2
                style={{
                  font: "700 28px/1.1 var(--font-sans)",
                  letterSpacing: "-0.025em",
                  color: "var(--ink-400)",
                  margin: "0 0 20px",
                  textWrap: "balance",
                }}
              >
                {tx(lang, {
                  en: "Who is behind ",
                  ru: "Кто стоит ",
                  uz: "Tadbirlar ortida ",
                })}
                <ItalicAccent>
                  {tx(lang, {
                    en: "the events",
                    ru: "за событиями",
                    uz: "kim turibdi",
                  })}
                </ItalicAccent>
              </h2>
              <p
                style={{
                  font: "400 17px/1.65 var(--font-sans)",
                  color: "var(--fg-2)",
                  margin: 0,
                  textWrap: "pretty",
                }}
              >
                {description ??
                  tx(lang, {
                    en: "This organizer keeps their public bio private for now. Their events still speak loud — see what's coming below.",
                    ru: "Организатор пока не добавил описание. Зато его события говорят сами за себя — смотрите ниже.",
                    uz: "Tashkilotchi hozircha tavsif qoʻshmagan. Tadbirlari oʻzi haqida hammasini soʻzlab beradi — pastga qarang.",
                  })}
              </p>

              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 22,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 999,
                    background: "var(--bone-50)",
                    border: "1px solid var(--border-1)",
                    color: "var(--ink-400)",
                    font: "600 13px/1 var(--font-sans)",
                    textDecoration: "none",
                  }}
                >
                  <DesignIcon
                    name="compass"
                    size={14}
                    stroke={2}
                    style={{ color: "var(--ember-500)" }}
                  />
                  {websiteLabel}
                  <DesignIcon
                    name="arrow"
                    size={12}
                    stroke={2}
                    style={{ color: "var(--fg-3)" }}
                  />
                </a>
              ) : null}
            </div>

            {/* Side info card */}
            <aside
              className="cm-org-aside"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-1)",
                borderRadius: 12,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div>
                <Eyebrow>
                  {tx(lang, {
                    en: "Quick facts",
                    ru: "Кратко",
                    uz: "Qisqa",
                  })}
                </Eyebrow>
              </div>
              <FactRow
                icon="calendar"
                label={tx(lang, {
                  en: "Events",
                  ru: "Событий",
                  uz: "Tadbirlar",
                })}
                value={eventsCount.toLocaleString()}
              />
              {locationLabel ? (
                <FactRow
                  icon="pin"
                  label={tx(lang, {
                    en: "Based in",
                    ru: "Локация",
                    uz: "Joy",
                  })}
                  value={locationLabel}
                />
              ) : null}
              {websiteLabel ? (
                <FactRow icon="compass" label="Web" value={websiteLabel} />
              ) : null}
              <FactRow
                icon={verified ? "shield" : "flag"}
                label={tx(lang, {
                  en: "Verification",
                  ru: "Верификация",
                  uz: "Tasdiq",
                })}
                value={
                  verified
                    ? tx(lang, {
                        en: "Verified by Eventflow",
                        ru: "Подтверждено Eventflow",
                        uz: "Eventflow tasdiqlagan",
                      })
                    : tx(lang, {
                        en: "Not yet verified",
                        ru: "Ещё не подтверждена",
                        uz: "Hali tasdiqlanmagan",
                      })
                }
                valueColor={verified ? "var(--ember-500)" : undefined}
              />
            </aside>
          </div>
        </section>
      </Container>

      {/* ============================================================ */}
      {/* Events                                                        */}
      {/* ============================================================ */}
      <Container size="wide">
        <section
          id="events"
          style={{ scrollMarginTop: 140, padding: "48px 0 16px" }}
        >
          <SectionBlockHeader
            kicker={tx(lang, {
              en: "Programme",
              ru: "Программа",
              uz: "Dastur",
            })}
            title={
              <>
                {tx(lang, {
                  en: "Events from ",
                  ru: "События от ",
                  uz: "Tashkilotchi ",
                })}
                <ItalicAccent>{name}</ItalicAccent>
              </>
            }
            right={
              <SegmentedToggle
                value={eventsTab}
                options={[
                  {
                    value: "upcoming",
                    label: t("public.events.hero.upcoming"),
                  },
                  { value: "past", label: t("public.events.hero.past") },
                ]}
                onChange={(v) => setEventsTab(v as "upcoming" | "past")}
              />
            }
          />
          <OrganizerEventsList
            organizationId={organizationId}
            eventsTab={eventsTab}
            locale={locale}
          />
        </section>
      </Container>

      {/* ============================================================ */}
      {/* Editorial / Blog                                              */}
      {/* ============================================================ */}
      <Container size="wide">
        <section
          id="blog"
          style={{ scrollMarginTop: 140, padding: "48px 0 16px" }}
        >
          <OrganizerBlogSection
            organizationId={organizationId}
            lang={lang}
            locale={locale}
            organizationName={name}
          />
        </section>
      </Container>

      {/* ============================================================ */}
      {/* Contact band — final CTA                                      */}
      {/* ============================================================ */}
      <Container size="wide">
        <section
          id="contact"
          style={{ scrollMarginTop: 140, padding: "56px 0 0" }}
        >
          <div
            className="cm-org-contact-band"
            style={{
              background: "var(--ink-400)",
              color: "var(--bone-100)",
              borderRadius: 18,
              padding: "48px 48px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 32,
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: -60,
                top: -60,
                width: 320,
                height: 320,
                background:
                  "radial-gradient(circle, rgba(234,88,12,0.45) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", maxWidth: 640 }}>
              <Eyebrow color="rgba(251,251,250,0.7)">
                {tx(lang, {
                  en: "Working together",
                  ru: "Работа вместе",
                  uz: "Hamkorlik",
                })}
              </Eyebrow>
              <div
                style={{
                  font: "700 32px/1.15 var(--font-sans)",
                  letterSpacing: "-0.025em",
                  marginTop: 14,
                  textWrap: "balance",
                }}
              >
                {tx(lang, {
                  en: "Have a project for ",
                  ru: "Есть идея для ",
                  uz: "Loyiha bormi ",
                })}
                <ItalicAccent color="var(--ember-300)">{name}</ItalicAccent>?
              </div>
              <p
                style={{
                  font: "400 15px/1.6 var(--font-sans)",
                  color: "rgba(251,251,250,0.7)",
                  marginTop: 12,
                  marginBottom: 0,
                  maxWidth: 520,
                }}
              >
                {tx(lang, {
                  en: "Send a short brief — partnership, sponsorship, speaking, content collaboration. The team replies within a few business days.",
                  ru: "Опишите коротко: партнёрство, спонсорство, выступление, контент-коллаборация. Команда отвечает в течение нескольких рабочих дней.",
                  uz: "Qisqacha tasvirlab bering: hamkorlik, homiylik, maʼruza yoki kontent. Jamoa bir necha ish kuni ichida javob beradi.",
                })}
              </p>
            </div>
            <div
              className="cm-org-contact-actions"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
                minWidth: 220,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isAuth) {
                    toast.info(t("public.organizer.toasts.signInToFollow"));
                    return;
                  }
                  setContactOpen(true);
                }}
                style={{
                  background: "var(--ember-400)",
                  color: "var(--bone-50)",
                  border: "none",
                  font: "600 14px/1 var(--font-sans)",
                  padding: "15px 26px",
                  borderRadius: 999,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <DesignIcon name="mail" size={15} stroke={2} />
                {t("public.organizer.contact")}
              </button>
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "transparent",
                    color: "var(--bone-100)",
                    border: "1px solid rgba(251,251,250,0.3)",
                    font: "600 14px/1 var(--font-sans)",
                    padding: "15px 26px",
                    borderRadius: 999,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <DesignIcon name="compass" size={14} stroke={2} />
                  {tx(lang, {
                    en: "Visit website",
                    ru: "Открыть сайт",
                    uz: "Saytga oʻtish",
                  })}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </Container>

      {/* Contact modal */}
      {contactOpen && (
        <OrganizerContactModal
          organizationId={organizationId}
          organizationName={name}
          onClose={() => setContactOpen(false)}
          lang={lang}
        />
      )}

      <style>{`
        .cm-org-masthead { padding-left: 0; padding-right: 0; }

        /* ============================================================ */
        /* Tablet (≤ 1024px) — keep most multi-column layouts but        */
        /* tighten spacing, drop the about-aside to one column          */
        /* ============================================================ */
        @media (max-width: 1024px) {
          .cm-org-cover { height: 200px !important; }
          .cm-org-title { font-size: 36px !important; }
          .cm-org-masthead {
            grid-template-columns: 96px 1fr !important;
            grid-template-areas:
              "logo identity"
              "actions actions" !important;
            align-items: center !important;
            gap: 16px 20px !important;
            padding-top: 16px !important;
            padding-bottom: 22px !important;
          }
          .cm-org-logo {
            grid-area: logo;
            width: 96px !important;
            height: 96px !important;
            margin-top: -56px !important;
            margin-bottom: 0 !important;
          }
          .cm-org-masthead > div:nth-child(2) { grid-area: identity; }
          .cm-org-actions {
            grid-area: actions;
            justify-content: flex-start !important;
            padding-top: 8px;
            border-top: 1px solid var(--border-1);
          }
          .cm-org-about {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .cm-org-aside { order: -1; }
          .cm-org-contact-band {
            grid-template-columns: 1fr !important;
            padding: 36px 32px !important;
          }
          .cm-org-contact-actions {
            min-width: 0 !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
          }
          .cm-org-contact-actions > * { flex: 1 1 200px; }
        }

        /* ============================================================ */
        /* Phone (≤ 640px) — single-column stat strip, smaller hero,    */
        /* hide cover scrim less aggressively                            */
        /* ============================================================ */
        @media (max-width: 640px) {
          .cm-org-cover { height: 160px !important; }
          .cm-org-title { font-size: 28px !important; }
          .cm-org-masthead {
            grid-template-columns: 1fr !important;
            grid-template-areas:
              "logo"
              "identity"
              "actions" !important;
            padding-top: 0 !important;
          }
          .cm-org-logo {
            width: 84px !important;
            height: 84px !important;
            border-radius: 14px !important;
            margin-top: -48px !important;
            margin-bottom: 4px !important;
          }
          .cm-org-actions {
            justify-content: stretch !important;
            padding-top: 14px;
            margin-top: 4px;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .cm-org-actions > *:first-child { grid-column: 1 / -1; }
          .cm-org-actions > * {
            justify-content: center;
            white-space: nowrap;
          }
          .cm-org-stats {
            grid-template-columns: 1fr !important;
          }
          .cm-org-stats > * + * {
            border-top: 1px solid var(--border-1);
            border-left: none !important;
          }
          .cm-org-stats > * { padding: 16px 20px !important; }
          .cm-org-contact-band {
            padding: 32px 22px !important;
            border-radius: 14px !important;
          }
          .cm-org-contact-actions { flex-direction: column !important; }
          .cm-org-contact-actions > * { flex: 1 0 auto; }
        }

        /* ============================================================ */
        /* Phone landscape / very narrow — clamp section paddings        */
        /* ============================================================ */
        @media (max-width: 480px) {
          .cm-org-aside { padding: 18px !important; }
        }
      `}</style>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Building blocks
// ----------------------------------------------------------------------------

function StatCell({
  label,
  value,
  accent,
  muted,
  border,
}: {
  label: string;
  value: string;
  accent?: string;
  muted?: boolean;
  border?: boolean;
}): React.ReactNode {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderLeft: border ? "1px solid var(--border-1)" : undefined,
      }}
    >
      <div
        style={{
          font: "500 10px/1 var(--font-mono)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          font: "700 24px/1 var(--font-sans)",
          letterSpacing: "-0.02em",
          color: muted ? "var(--fg-3)" : accent ?? "var(--ink-400)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionBlockHeader({
  kicker,
  title,
  right,
}: {
  kicker: string;
  title: React.ReactNode;
  right?: React.ReactNode;
}): React.ReactNode {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 24,
        paddingBottom: 14,
        borderBottom: "2px solid var(--ink-400)",
      }}
    >
      <div>
        <Eyebrow style={{ marginBottom: 8 }}>{kicker}</Eyebrow>
        <h2
          style={{
            font: "700 28px/1.05 var(--font-sans)",
            letterSpacing: "-0.025em",
            margin: 0,
            color: "var(--ink-400)",
            textWrap: "balance",
          }}
        >
          {title}
        </h2>
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

function SegmentedToggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}): React.ReactNode {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        padding: 4,
        borderRadius: 999,
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: active ? "var(--ink-400)" : "transparent",
              color: active ? "var(--bone-100)" : "var(--fg-2)",
              font: "600 13px/1 var(--font-sans)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 200ms, color 200ms",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FactRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ComponentProps<typeof DesignIcon>["name"];
  label: string;
  value: string;
  valueColor?: string;
}): React.ReactNode {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--ember-50)",
          color: "var(--ember-500)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DesignIcon name={icon} size={15} stroke={1.8} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            font: "500 10px/1 var(--font-mono)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            font: "600 14px/1.3 var(--font-sans)",
            color: valueColor ?? "var(--fg-1)",
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function CoverFallback({ name }: { name: string }): React.ReactNode {
  // Stable hue from name — keeps the same fallback across renders.
  let hue = 0;
  for (let i = 0; i < name.length; i++) hue = (hue * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(135deg, hsl(${hue} 70% 90%), hsl(${(hue + 40) % 360} 65% 78%))`,
      }}
    >
      {/* subtle dotted overlay for texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(28,25,23,0.08) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          opacity: 0.6,
        }}
      />
    </div>
  );
}

function LogoMonogram({ name }: { name: string }): React.ReactNode {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "·";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, var(--ember-300), var(--ember-500))",
        color: "var(--bone-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        font: "700 36px/1 var(--font-sans)",
        letterSpacing: "-0.02em",
      }}
    >
      {initials}
    </div>
  );
}

function EmptyEventsCard({
  title,
}: {
  title: string;
}): React.ReactNode {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px dashed var(--border-2)",
        borderRadius: 12,
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "var(--ember-50)",
          color: "var(--ember-500)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DesignIcon name="calendar" size={22} stroke={1.7} />
      </span>
      <div
        style={{
          font: "600 15px/1.3 var(--font-sans)",
          color: "var(--fg-2)",
          textWrap: "balance",
        }}
      >
        {title}
      </div>
    </div>
  );
}

function OrganizerSkeleton(): React.ReactNode {
  return (
    <div style={{ background: "var(--bg-1)", paddingBottom: 80 }}>
      <div
        style={{
          height: 240,
          background:
            "linear-gradient(90deg, var(--bone-200) 0%, var(--bone-300) 50%, var(--bone-200) 100%)",
          backgroundSize: "200% 100%",
          animation: "cm-shimmer 1.6s linear infinite",
        }}
      />
      <Container size="wide">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "128px 1fr",
            gap: 24,
            paddingTop: 20,
            paddingBottom: 32,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: 16,
              background: "var(--bone-300)",
              marginTop: -76,
              marginBottom: -8,
              border: "4px solid var(--bg-1)",
            }}
          />
          <div>
            <div
              style={{
                width: 280,
                height: 36,
                background: "var(--bone-300)",
                borderRadius: 8,
                marginBottom: 12,
              }}
            />
            <div
              style={{
                width: 180,
                height: 16,
                background: "var(--bone-200)",
                borderRadius: 6,
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            border: "1px solid var(--border-1)",
            borderLeft: "none",
            borderRight: "none",
            marginBottom: 64,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                padding: "20px 24px",
                borderLeft: i ? "1px solid var(--border-1)" : undefined,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 10,
                  background: "var(--bone-200)",
                  borderRadius: 4,
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  width: 60,
                  height: 22,
                  background: "var(--bone-300)",
                  borderRadius: 4,
                }}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                aspectRatio: "4/3",
                background: "var(--bone-200)",
                borderRadius: 8,
              }}
            />
          ))}
        </div>
      </Container>
      <style>{`
        @keyframes cm-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}

function OrganizerEmptyState({
  message,
  retryLabel,
  onRetry,
  retryDisabled,
  backLabel,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  backLabel: string;
}): React.ReactNode {
  return (
    <div
      style={{
        minHeight: "60vh",
        background: "var(--bg-1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-1)",
          borderRadius: 14,
          padding: 40,
          textAlign: "center",
          maxWidth: 480,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "var(--ember-50)",
            color: "var(--ember-500)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <DesignIcon name="flag" size={26} stroke={1.6} />
        </span>
        <p
          style={{
            font: "500 16px/1.5 var(--font-sans)",
            color: "var(--fg-1)",
            margin: "0 0 24px",
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {onRetry && retryLabel ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryDisabled}
              style={{
                background: "var(--ember-400)",
                color: "var(--bone-50)",
                border: "none",
                font: "600 13px/1 var(--font-sans)",
                padding: "12px 20px",
                borderRadius: 999,
                cursor: retryDisabled ? "wait" : "pointer",
                opacity: retryDisabled ? 0.7 : 1,
              }}
            >
              {retryLabel}
            </button>
          ) : null}
          <LocalizedLink
            href="/organizers"
            style={{
              background: "transparent",
              color: "var(--ink-400)",
              border: "1px solid var(--border-2)",
              font: "600 13px/1 var(--font-sans)",
              padding: "12px 20px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            {backLabel}
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Events list (auth-only)
// ----------------------------------------------------------------------------

function OrganizerEventsList({
  organizationId,
  eventsTab,
  locale,
}: {
  organizationId: string;
  eventsTab: "upcoming" | "past";
  locale: Locale;
}): React.ReactNode {
  const t = useT();
  const { data, isLoading } = useOrganizationEventsQuery(organizationId, {
    params: { status: eventsTab, limit: 12 },
    enabled: true,
  });

  const events = useMemo(() => {
    if (!data?.items) return [];
    return mapPublicEventsToDesignEvents(data.items, { locale });
  }, [data?.items, locale]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
        className="cm-org-event-grid"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              aspectRatio: "4/3",
              background:
                "linear-gradient(90deg, var(--bone-200) 0%, var(--bone-300) 50%, var(--bone-200) 100%)",
              backgroundSize: "200% 100%",
              animation: "cm-shimmer 1.6s linear infinite",
              borderRadius: 8,
            }}
          />
        ))}
        <style>{`
          @keyframes cm-shimmer {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
          @media (max-width: 1024px) {
            .cm-org-event-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 640px) {
            .cm-org-event-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyEventsCard
        title={
          eventsTab === "upcoming"
            ? t("public.organizer.noUpcomingEvents")
            : t("public.organizer.noPastEvents")
        }
      />
    );
  }

  return (
    <div
      className="cm-org-event-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
      }}
    >
      {events.map((ev) => (
        <CalmEventCard
          key={ev.id}
          event={ev}
          href={withLocalePath(`/events/${ev.slug ?? ev.id}`, locale)}
        />
      ))}
      <style>{`
        @media (max-width: 1024px) {
          .cm-org-event-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .cm-org-event-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Blog section
// ----------------------------------------------------------------------------

function postToCalmCard(post: BlogPost): CalmBlogCardData {
  return {
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    categoryLabel: getCategoryLabel(post.category),
    date: formatPublishDate(post.publishedAt),
    readTime: formatReadTime(post.readTime),
    authorName: post.author.name,
    authorAvatar: post.author.avatar,
    trending: post.trending,
  };
}

function OrganizerBlogSection({
  organizationId,
  lang,
  locale,
  organizationName,
}: {
  organizationId: string;
  lang: "en" | "ru" | "uz";
  locale: Locale;
  organizationName: string;
}): React.ReactNode {
  const t = useT();
  const { data, isLoading } = useBlogPostsQuery({ organizationId }, 1, 6);

  const posts: BlogPost[] = data?.posts ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <SectionBlockHeader
        kicker={tx(lang, {
          en: "Editorial",
          ru: "Журнал",
          uz: "Maqolalar",
        })}
        title={
          <>
            {tx(lang, {
              en: "From the ",
              ru: "От ",
              uz: "",
            })}
            <ItalicAccent>
              {tx(lang, {
                en: "newsroom",
                ru: "редакции",
                uz: "muharririyat",
              })}
            </ItalicAccent>
          </>
        }
        right={
          total > 0 ? (
            <span
              style={{
                font: "500 11px/1.4 var(--font-mono)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--fg-3)",
              }}
            >
              {t("public.organizer.blogTotal", { total })}
            </span>
          ) : null
        }
      />
      {isLoading ? (
        <div
          className="cm-org-blog-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                aspectRatio: "4/3",
                background:
                  "linear-gradient(90deg, var(--bone-200) 0%, var(--bone-300) 50%, var(--bone-200) 100%)",
                backgroundSize: "200% 100%",
                animation: "cm-shimmer 1.6s linear infinite",
                borderRadius: 8,
              }}
            />
          ))}
          <style>{`
            @keyframes cm-shimmer {
              0% { background-position: 100% 0; }
              100% { background-position: -100% 0; }
            }
            @media (max-width: 1024px) {
              .cm-org-blog-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 640px) {
              .cm-org-blog-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      ) : posts.length === 0 ? (
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px dashed var(--border-2)",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--ember-50)",
              color: "var(--ember-500)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DesignIcon name="book" size={22} stroke={1.7} />
          </span>
          <div
            style={{
              font: "600 15px/1.3 var(--font-sans)",
              color: "var(--fg-2)",
              maxWidth: 360,
              textWrap: "balance",
            }}
          >
            {t("public.organizer.noArticles")}
          </div>
        </div>
      ) : (
        <div
          className="cm-org-blog-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {posts.map((post) => (
            <CalmBlogCard
              key={post.id}
              post={postToCalmCard(post)}
              href={withLocalePath(`/blog/${post.slug}`, locale)}
              trendingLabel={tx(lang, {
                en: "Trending",
                ru: "В тренде",
                uz: "Trendda",
              })}
            />
          ))}
          <style>{`
            @media (max-width: 1024px) {
              .cm-org-blog-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 640px) {
              .cm-org-blog-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      )}
      {/* Suppress noise of `organizationName` linting — used by parent header but not here */}
      {organizationName ? null : null}
    </>
  );
}

// ----------------------------------------------------------------------------
// Contact modal — Calm Marketplace styled
// ----------------------------------------------------------------------------

function OrganizerContactModal({
  organizationId,
  organizationName,
  onClose,
  lang,
}: {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
  lang: "en" | "ru" | "uz";
}): React.ReactNode {
  const t = useT();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useBodyScrollLock({ enabled: true });
  useEscapeKey({ enabled: true, onEscape: onClose });

  const contactMutation = useContactOrganizationMutation();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = phone.trim();
      if (!trimmed) {
        toast.error(t("public.organizer.contactPhoneRequired"));
        return;
      }
      contactMutation.mutate(
        {
          organizationId,
          data: { phone: trimmed, message: message.trim() || undefined },
        },
        {
          onSuccess: () => {
            toast.success(t("public.organizer.contactSent"));
            setPhone("");
            setMessage("");
            onClose();
          },
          onError: (err) => {
            toast.error(
              err instanceof Error
                ? err.message
                : t("public.organizer.contactSendError"),
            );
          },
        },
      );
    },
    [organizationId, phone, message, contactMutation, onClose, t],
  );

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    background: "var(--bg-1)",
    border: "1px solid var(--border-1)",
    font: "400 14px/1.4 var(--font-sans)",
    color: "var(--fg-1)",
    outline: "none",
  };

  return (
    // Backdrop. Click-to-close is supplementary; Escape (useEscapeKey) and the
    // close button provide the keyboard path.
    <div
      onClick={handleBackdrop}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(28,25,23,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-organizer-title"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-1)",
          border: "1px solid var(--border-1)",
          borderRadius: 16,
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Eyebrow>
              {tx(lang, {
                en: "Contact",
                ru: "Связь",
                uz: "Aloqa",
              })}
            </Eyebrow>
            <h2
              id="contact-organizer-title"
              style={{
                font: "700 18px/1.2 var(--font-sans)",
                color: "var(--ink-400)",
                margin: "6px 0 0",
                letterSpacing: "-0.015em",
              }}
            >
              {t("public.organizer.contactTitle", { name: organizationName })}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "transparent",
              border: "1px solid var(--border-1)",
              color: "var(--fg-2)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <label
            htmlFor="contact-phone"
            style={{
              display: "block",
              font: "500 12px/1 var(--font-sans)",
              color: "var(--fg-2)",
              marginBottom: 8,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {t("public.organizer.phone")}{" "}
            <span style={{ color: "var(--ember-500)" }}>*</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 000 00 00"
            disabled={contactMutation.isPending}
            required
            style={inputBase}
          />
          <label
            htmlFor="contact-message"
            style={{
              display: "block",
              font: "500 12px/1 var(--font-sans)",
              color: "var(--fg-2)",
              margin: "20px 0 8px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {t("public.organizer.message")}
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("public.organizer.messagePlaceholder")}
            rows={4}
            disabled={contactMutation.isPending}
            style={{ ...inputBase, resize: "vertical", minHeight: 96 }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={contactMutation.isPending}
              style={{
                background: "transparent",
                color: "var(--ink-400)",
                border: "1px solid var(--border-2)",
                padding: "12px 18px",
                borderRadius: 999,
                font: "600 13px/1 var(--font-sans)",
                cursor: "pointer",
              }}
            >
              {t("actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={contactMutation.isPending}
              style={{
                background: "var(--ember-400)",
                color: "var(--bone-50)",
                border: "none",
                padding: "12px 18px",
                borderRadius: 999,
                font: "600 13px/1 var(--font-sans)",
                cursor: contactMutation.isPending ? "wait" : "pointer",
                opacity: contactMutation.isPending ? 0.7 : 1,
              }}
            >
              {contactMutation.isPending
                ? t("public.organizer.sending")
                : t("public.organizer.sendRequest")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
