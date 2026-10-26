"use client";

import { useT } from "@eventflow/i18n/react";
import { ArrowUpRight, PhoneCall } from "lucide-react";

import { organizerAppUrl } from "@shared/config";
import { cn } from "@shared/lib/utils";
import { Button, PageSection, buttonStyles } from "@shared/ui";

export function OrganizersCta(): React.ReactNode {
  const t = useT();

  return (
    <section className="relative bg-ink-400 text-white">
      <PageSection
        className="py-16 sm:py-20"
        containerClassName="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="max-w-2xl space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-50">
            {t("public.landing.organizerCta.eyebrow")}
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("public.landing.organizerCta.title")}
          </h2>
          <p className="text-base leading-7 text-bone-400">
            {t("public.landing.organizerCta.description")}
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto">
          <a
            href={organizerAppUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonStyles({ size: "lg" }),
              "w-full rounded-full bg-white text-ink-400 hover:bg-bone-200 sm:w-auto"
            )}
          >
            <span className="inline-flex items-center justify-center whitespace-nowrap">
              {t("public.landing.organizerCta.createEventButton")}
            </span>
            <span className="inline-flex shrink-0 items-center justify-center">
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </span>
          </a>
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
            leftIcon={<PhoneCall className="h-4 w-4" aria-hidden />}
          >
            {t("public.landing.organizerCta.scheduleCallButton")}
          </Button>
          <p className="text-xs text-ink-50 sm:max-w-[260px] sm:text-right">
            {t("public.landing.organizerCta.caption")}
          </p>
        </div>
      </PageSection>
    </section>
  );
}
