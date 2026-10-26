"use client";

import { useLocale, useT } from "@eventflow/i18n/react";
import { Plus, Ticket, BarChart3, Users } from "lucide-react";

import { organizerAppUrl } from "@shared/config";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { PageSection } from "@shared/ui";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

const primaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-400";
const outlineButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-400";

const features = [
  {
    icon: Ticket,
    titleKey: "public.landing.organizerCta.features.ticketingTitle",
    descriptionKey: "public.landing.organizerCta.features.ticketingDescription",
  },
  {
    icon: BarChart3,
    titleKey: "public.landing.organizerCta.features.reportsTitle",
    descriptionKey: "public.landing.organizerCta.features.reportsDescription",
  },
  {
    icon: Users,
    titleKey: "public.landing.organizerCta.features.qrTitle",
    descriptionKey: "public.landing.organizerCta.features.qrDescription",
  },
] as const;

export function LandingOrganizerCta(): React.ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <section className="relative bg-ink-400 text-white">
      <PageSection className="py-20 sm:py-24" containerClassName="max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[44px] lg:leading-[1.1]">
                {t("public.landing.organizerCta.title")}
              </h2>
              <p className="max-w-xl text-base leading-7 text-bone-400">
                {t("public.landing.organizerCta.description")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={organizerAppUrl}
                target="_blank"
                rel="noreferrer"
                className={`${primaryButtonClass} bg-white text-ink-400 hover:bg-bone-200`}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                {t("public.landing.organizerCta.createEventButton")}
              </a>
              <Link
                href={withLocalePath("/organizers", locale)}
                className={`${outlineButtonClass} border-white/25 text-white hover:border-white/40 hover:bg-white/5`}
              >
                {t("public.landing.organizerCta.organizersLink")}
              </Link>
            </div>

            <p className="text-sm text-ink-50">
              {t("public.landing.organizerCta.organizersCount")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.titleKey}
                className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-white">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-sm leading-relaxed text-bone-400">
                    {t(feature.descriptionKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageSection>
    </section>
  );
}
