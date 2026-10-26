"use client";

import { useT } from "@eventflow/i18n/react";
import { BarChart3, CheckCircle2, Clock3, Headphones } from "lucide-react";

import { PageSection, SectionHeading } from "@shared/ui";

const metrics = [
  {
    id: "time",
    labelKey: "public.landing.organizersMetrics.metrics.timeLabel",
    value: "-40%",
    helperKey: "public.landing.organizersMetrics.metrics.timeHelper",
    icon: Clock3,
  },
  {
    id: "support",
    labelKey: "public.landing.organizersMetrics.metrics.supportLabel",
    value: "-35%",
    helperKey: "public.landing.organizersMetrics.metrics.supportHelper",
    icon: Headphones,
  },
  {
    id: "conversion",
    labelKey: "public.landing.organizersMetrics.metrics.conversionLabel",
    value: "+18%",
    helperKey: "public.landing.organizersMetrics.metrics.conversionHelper",
    icon: BarChart3,
  },
  {
    id: "nps",
    labelKey: "public.landing.organizersMetrics.metrics.npsLabel",
    value: "94%",
    helperKey: "public.landing.organizersMetrics.metrics.npsHelper",
    icon: CheckCircle2,
  },
] as const;

export function OrganizersMetrics(): React.ReactNode {
  const t = useT();

  return (
    <PageSection
      aria-label={t("public.landing.organizersMetrics.ariaLabel")}
      className="border-b border-bone-300/70 bg-bone-100/40 py-16 sm:py-20 md:py-24"
      containerClassName="flex flex-col gap-10 sm:gap-12"
    >
      <SectionHeading
        eyebrow={t("public.landing.organizersMetrics.eyebrow")}
        title={t("public.landing.organizersMetrics.title")}
        description={t("public.landing.organizersMetrics.description")}
        align="left"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex flex-col gap-3 rounded-xl border border-bone-300/70 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-ember-50 text-ember-500">
                <metric.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-100">
                {t(metric.labelKey)}
              </span>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-ink-400">
              {metric.value}
            </p>
            <p className="text-xs leading-5 text-ink-100">
              {t(metric.helperKey)}
            </p>
          </div>
        ))}
      </div>
    </PageSection>
  );
}
