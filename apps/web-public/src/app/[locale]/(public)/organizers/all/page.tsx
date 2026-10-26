import Image from "next/image";

import { createTranslator, type Locale, plural } from "@eventflow/i18n";
import { fallbackLocale, normalizeLocale } from "@shared/lib/i18n-routing";
import { breadcrumbSchema, itemListSchema } from "@shared/lib/json-ld";
import { EVENTS_PLURAL } from "@shared/lib/plurals";
import {
  fetchPublicOrganizersServer,
  type PublicOrganizerSummary,
} from "@shared/lib/server-data";
import { buildPageMetadata } from "@shared/lib/seo";
import { resolveMediaUrl } from "@shared/lib/utils";
import { Container } from "@shared/ui/container";
import { Eyebrow } from "@shared/ui/design-system";
import { JsonLd } from "@shared/ui/json-ld";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

import type { Metadata } from "next";

/**
 * `/organizers/all` — public directory of every organization that has
 * events on EVENTFLOW. SSR'd with Breadcrumb + ItemList JSON-LD so it
 * lands as a discoverable hub for Google and AI engines.
 *
 * (Note: `/organizers` is occupied by a `noindex` B2B landing that pitches
 * EVENTFLOW to potential organizers — different audience, different
 * intent, so the public directory lives at this nested path.)
 */

interface OrganizersHubProps {
  params: Promise<{ locale: string }>;
}

interface PageStrings {
  title: string;
  description: string;
  heading: string;
  intro: string;
  emptyText: string;
  upcomingLabel: (count: number) => string;
  pastLabel: (count: number) => string;
  totalLabel: (count: number) => string;
  breadcrumbLabel: string;
}

function strings(locale: Locale): PageStrings {
  if (locale === "ru") {
    return {
      title: "Организаторы событий в Узбекистане",
      description:
        "Верифицированные организаторы мероприятий в Узбекистане: компании, агентства, образовательные центры. Профили и афиша на EVENTFLOW.",
      heading: "Организаторы",
      intro:
        "Верифицированные компании и команды на EVENTFLOW. Откройте профиль, чтобы посмотреть афишу или связаться напрямую.",
      emptyText: "Пока нет верифицированных организаторов.",
      upcomingLabel: (n) => `${plural("ru", n, EVENTS_PLURAL)} впереди`,
      pastLabel: (n) => `${plural("ru", n, EVENTS_PLURAL)} прошло`,
      totalLabel: (n) => `${plural("ru", n, EVENTS_PLURAL)} всего`,
      breadcrumbLabel: "Организаторы",
    };
  }
  if (locale === "uz") {
    return {
      title: "Oʻzbekistondagi tadbir tashkilotchilari",
      description:
        "Oʻzbekistondagi verifikatsiyalangan tadbir tashkilotchilari: kompaniyalar, agentliklar, taʼlim markazlari. Profillar va afisha — EVENTFLOW da.",
      heading: "Tashkilotchilar",
      intro:
        "EVENTFLOW dagi verifikatsiyalangan kompaniyalar va jamoalar. Afishani koʻrish yoki toʻgʻridan-toʻgʻri bogʻlanish uchun profilni oching.",
      emptyText: "Hozircha verifikatsiyalangan tashkilotchilar yoʻq.",
      upcomingLabel: (n) => `${plural("uz", n, EVENTS_PLURAL)} kelmoqda`,
      pastLabel: (n) => `${plural("uz", n, EVENTS_PLURAL)} oʻtgan`,
      totalLabel: (n) => `Jami ${plural("uz", n, EVENTS_PLURAL)}`,
      breadcrumbLabel: "Tashkilotchilar",
    };
  }
  return {
    title: "Event organizers in Uzbekistan",
    description:
      "Verified event organizers across Uzbekistan: companies, agencies, education centers. Profiles and schedules on EVENTFLOW.",
    heading: "Organizers",
    intro:
      "Verified companies and teams on EVENTFLOW. Open a profile to see their schedule or reach them directly.",
    emptyText: "No verified organizers yet.",
    upcomingLabel: (n) => `${plural("en", n, EVENTS_PLURAL)} upcoming`,
    pastLabel: (n) => `${plural("en", n, EVENTS_PLURAL)} past`,
    totalLabel: (n) => `${plural("en", n, EVENTS_PLURAL)} total`,
    breadcrumbLabel: "Organizers",
  };
}

export async function generateMetadata({
  params,
}: OrganizersHubProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const s = strings(locale);
  return buildPageMetadata({
    locale,
    path: "/organizers/all",
    title: s.title,
    description: s.description,
  });
}

export default async function OrganizersHub({
  params,
}: OrganizersHubProps): Promise<React.ReactNode> {
  const { locale: localeParam } = await params;
  const locale = normalizeLocale(localeParam) ?? fallbackLocale;
  const t = createTranslator(locale);
  const s = strings(locale);

  const organizers = await fetchPublicOrganizersServer(locale);

  const breadcrumb = breadcrumbSchema(
    [
      { name: t("public.navigation.home"), path: "/" },
      { name: s.breadcrumbLabel, path: "/organizers/all" },
    ],
    locale,
  );
  const itemList = itemListSchema(
    organizers.map((o) => ({ name: o.name, path: `/organizers/${o.id}` })),
    locale,
  );

  return (
    <>
      <JsonLd data={[breadcrumb, itemList]} />
      <div className="organizers-hub">
        <Container size="wide">
          <header className="organizers-hub__header">
            <Eyebrow style={{ marginBottom: 8 }}>{s.title}</Eyebrow>
            <h1 className="organizers-hub__heading">{s.heading}</h1>
            <p className="organizers-hub__intro">{s.intro}</p>
          </header>

          {organizers.length === 0 ? (
            <p className="organizers-hub__empty">{s.emptyText}</p>
          ) : (
            <ul className="organizers-hub__grid">
              {organizers.map((org) => (
                <OrganizerCard key={org.id} org={org} strings={s} />
              ))}
            </ul>
          )}
        </Container>

        <style>{`
          .organizers-hub {
            background: var(--bg-1);
            color: var(--fg-1);
            padding-block: clamp(28px, 4vw, 40px) clamp(56px, 8vw, 96px);
          }
          .organizers-hub__header {
            padding-bottom: 18px;
            border-bottom: 2px solid var(--ink-400);
            margin-bottom: clamp(20px, 3vw, 28px);
          }
          .organizers-hub__heading {
            margin: 0;
            font: 700 clamp(26px, 4.5vw, 38px) / 1.05 var(--font-sans);
            letter-spacing: -0.025em;
            color: var(--ink-400);
            text-wrap: balance;
          }
          .organizers-hub__intro {
            margin: 10px 0 0;
            font: 400 15px/1.6 var(--font-sans);
            color: var(--fg-2);
            max-width: 70ch;
            text-wrap: pretty;
          }
          .organizers-hub__grid {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }
          @media (max-width: 980px) {
            .organizers-hub__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 620px) {
            .organizers-hub__grid { grid-template-columns: 1fr; }
          }
          .organizers-hub__empty {
            padding: clamp(40px, 6vw, 64px) 28px;
            background: var(--bg-2);
            border: 1px solid var(--border-1);
            border-radius: var(--radius-xl);
            text-align: center;
            color: var(--fg-2);
            font: 400 14.5px/1.6 var(--font-sans);
          }
          .org-card {
            display: flex;
            gap: 14px;
            align-items: flex-start;
            padding: 16px;
            border: 1px solid var(--border-1);
            border-radius: var(--radius-lg);
            background: var(--bg-2);
            color: inherit;
            text-decoration: none;
            transition: border-color .15s var(--ease-standard), transform .15s var(--ease-standard);
          }
          .org-card:hover {
            border-color: var(--ink-400);
            transform: translateY(-1px);
          }
          .org-card__logo {
            flex-shrink: 0;
            width: 44px;
            height: 44px;
            border-radius: var(--radius-md);
            background: var(--bg-1);
            border: 1px solid var(--border-1);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            font: 600 16px/1 var(--font-sans);
            color: var(--ink-400);
          }
          .org-card__logo img { width: 100%; height: 100%; object-fit: cover; }
          .org-card__body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
          .org-card__name {
            margin: 0;
            font: 600 15px/1.3 var(--font-sans);
            color: var(--ink-400);
            text-wrap: balance;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .org-card__meta {
            margin: 0;
            font: 400 12.5px/1.4 var(--font-mono, monospace);
            color: var(--fg-2);
            letter-spacing: 0.01em;
          }
          .org-card__upcoming { color: var(--ember-500); font-weight: 600; }
        `}</style>
      </div>
    </>
  );
}

interface OrganizerCardProps {
  org: PublicOrganizerSummary;
  strings: PageStrings;
}

function OrganizerCard({ org, strings: s }: OrganizerCardProps): React.ReactNode {
  const logoSrc = org.logoUrl ? resolveMediaUrl(org.logoUrl) : undefined;
  const initials = org.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <li>
      <Link href={`/organizers/${org.id}`} className="org-card">
        <div className="org-card__logo" aria-hidden="true">
          {logoSrc ? (
            <Image src={logoSrc} alt="" width={44} height={44} unoptimized />
          ) : (
            <span>{initials || "·"}</span>
          )}
        </div>
        <div className="org-card__body">
          <p className="org-card__name">{org.name}</p>
          {/*
            Single total — includes both upcoming and past visible events
            (API counts PUBLISHED + COMPLETED; cancelled / draft excluded).
            When at least one is upcoming the badge goes ember to signal
            "active right now"; pure-past orgs keep the muted style. Hidden
            entirely when the org has no public events at all, so a card
            never has to print "0 events".
          */}
          {org.eventCount > 0 ? (
            <p className="org-card__meta">
              <span
                className={
                  org.upcomingCount > 0 ? "org-card__upcoming" : undefined
                }
              >
                {s.totalLabel(org.eventCount)}
              </span>
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
