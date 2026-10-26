"use client";

import { useT } from "@eventflow/i18n/react";
import { ArrowUpRight, BarChart3, Users } from "lucide-react";

import { organizerAppUrl } from "@shared/config";
import { usePlatformStatsQuery } from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { Button, PageSection, buttonStyles } from "@shared/ui";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

const DEMO_STATS = {
  activeEvents: 12,
  openTickets: 5,
  newParticipants: 128,
  newParticipantsChange: "+18% MoM",
  conversionRate: 42,
};

const DEMO_ACTIVITY = [
  {
    id: "1",
    titleKey: "public.landing.organizersHero.activity.registration",
    timeKey: "public.landing.organizersHero.activity.fiveMinutesAgo",
  },
  {
    id: "2",
    titleKey: "public.landing.organizersHero.activity.eventCreated",
    timeKey: "public.landing.organizersHero.activity.thirtyMinutesAgo",
  },
];

 
export function OrganizersHero(): React.ReactNode {
  const t = useT();
  const { data: stats } = usePlatformStatsQuery({
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const activeEvents = stats?.activeEvents.value ?? DEMO_STATS.activeEvents;
  const activeEventsChange = stats
    ? `+${stats.activeEvents.change} ${stats.activeEvents.period}`
    : t("public.landing.organizersHero.stats.activeEventsChange");

  const newParticipants =
    stats?.newParticipants.value ?? DEMO_STATS.newParticipants;
  const newParticipantsChange = stats
    ? `+${stats.newParticipants.changePercent}% ${stats.newParticipants.changeType}`
    : DEMO_STATS.newParticipantsChange;

  const conversionRate =
    stats?.registrationConversion.value ?? DEMO_STATS.conversionRate;
  const conversionDescription =
    stats?.registrationConversion.description ??
    t("public.landing.organizersHero.stats.conversionDescription");
  const openTicketsChange = t(
    "public.landing.organizersHero.stats.openTicketsChange"
  );

  const activityItems = DEMO_ACTIVITY;

  return (
    <PageSection
      className="relative w-full border-b border-bone-300/70 bg-white py-20 sm:py-24"
      containerClassName="grid gap-12 lg:grid-cols-[1.1fr_minmax(0,1fr)] lg:items-center"
    >
      <div className="space-y-8">
        <span className="inline-flex items-center rounded-full border border-bone-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink-100">
          {t("public.landing.organizersHero.eyebrow")}
        </span>
        <div className="space-y-5">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink-400 sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
            {t("public.landing.organizersHero.titleLine1")}
            <br />
            <span className="text-ember-500">
              {t("public.landing.organizersHero.titleLine2")}
            </span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-ink-100 sm:text-lg">
            {t("public.landing.organizersHero.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={organizerAppUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonStyles({ size: "lg" }), "rounded-full")}
          >
            <span className="inline-flex items-center justify-center whitespace-nowrap">
              {t("public.landing.organizersHero.openWorkspace")}
            </span>
            <span className="inline-flex shrink-0 items-center justify-center">
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </span>
          </a>
          <Link
            href="/about#organizers"
            className={cn(
              buttonStyles({ variant: "outline", size: "lg" }),
              "rounded-full border-bone-300 text-ink-200 hover:bg-bone-100"
            )}
          >
            {t("public.landing.organizersHero.howItWorks")}
          </Link>
        </div>
        <dl className="mt-2 grid gap-6 border-t border-bone-300/70 pt-8 text-sm text-ink-100 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-100">
              {t("public.landing.organizersHero.stats.activeEvents")}
            </dt>
            <dd className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-400">
              {activeEvents}
            </dd>
            <p className="mt-0.5 text-xs text-forest-600">
              {activeEventsChange}
            </p>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-100">
              {t("public.landing.organizersHero.stats.newParticipants")}
            </dt>
            <dd className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-400">
              {newParticipants}
            </dd>
            <p className="mt-0.5 text-xs text-forest-600">
              {newParticipantsChange}
            </p>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-ink-100">
              {t("public.landing.organizersHero.stats.registrationConversion")}
            </dt>
            <dd className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-400">
              {conversionRate}%
            </dd>
            <p className="mt-0.5 text-xs text-ink-100">
              {conversionDescription}
            </p>
          </div>
        </dl>
      </div>

      {/* Right side: dashboard mock — solid surface, no glass */}
      <div className="relative w-full max-w-md lg:justify-self-end">
        <div className="rounded-xl border border-bone-300/70 bg-bone-100/50 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3">
            <header className="flex items-center justify-between gap-3 rounded-xl border border-bone-300/70 bg-white px-4 py-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-100">
                  {t("public.landing.organizersHero.dashboard.title")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink-400">
                  {t("public.landing.organizersHero.dashboard.summary")}
                </p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                className="rounded-full bg-bone-200 text-xs text-ink-200"
                leftIcon={<BarChart3 className="h-3.5 w-3.5" aria-hidden />}
              >
                {t("public.landing.organizersHero.dashboard.report")}
              </Button>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-bone-300/70 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-100">
                  {t("public.landing.organizersHero.stats.activeEvents")}
                </p>
                <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink-400">
                  {activeEvents}
                </p>
                <p className="mt-0.5 text-[11px] text-forest-600">
                  {activeEventsChange}
                </p>
              </div>
              <div className="rounded-xl border border-bone-300/70 bg-white px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-100">
                  {t("public.landing.organizersHero.dashboard.openTickets")}
                </p>
                <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink-400">
                  {DEMO_STATS.openTickets}
                </p>
                <p className="mt-0.5 text-[11px] text-rose-600">
                  {openTicketsChange}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-bone-300/70 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-ink-100">
                    {t("public.landing.organizersHero.dashboard.teamActivity")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-100">
                    {t(
                      "public.landing.organizersHero.dashboard.teamActivityDescription"
                    )}
                  </p>
                </div>
                <Users className="h-4 w-4 text-ink-50" aria-hidden />
              </div>
              <ul className="mt-3 space-y-1 text-xs text-ink-200">
                {activityItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-bone-100 px-3 py-2"
                  >
                    <span>{t(item.titleKey)}</span>
                    <span className="shrink-0 text-[11px] text-ink-100">
                      {t(item.timeKey)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
