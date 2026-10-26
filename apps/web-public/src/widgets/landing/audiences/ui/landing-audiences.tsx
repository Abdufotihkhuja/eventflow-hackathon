"use client";

import { useT } from "@eventflow/i18n/react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { getLandingAudiences } from "@shared/config";
import { fadeInUp, createStaggerContainer } from "@shared/lib/motion";
import { cn } from "@shared/lib/utils";
import { PageSection } from "@shared/ui";

const gridContainer = createStaggerContainer(0.12);

export function LandingAudiences(): React.ReactNode {
  const t = useT();
  const landingAudiences = getLandingAudiences(t);

  return (
    <PageSection
      id="organizers"
      className="py-14 sm:py-20 md:py-24"
      containerClassName="flex flex-col gap-8 sm:gap-12"
    >
      <motion.div
        variants={gridContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "200px" }}
        className="grid gap-5 sm:gap-6 lg:grid-cols-2"
      >
        {landingAudiences.map(
          ({ id, title, description, highlights, icon: Icon }, index) => (
            <motion.article
              key={id}
              variants={fadeInUp}
              className={cn(
                "relative flex flex-col gap-6 rounded-xl border border-bone-300/70 bg-white p-6 sm:p-8",
                "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                "transition-colors duration-200 hover:border-bone-400"
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                    index === 0
                      ? "bg-ember-50 text-ember-500"
                      : "bg-bone-200 text-ink-200"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold tracking-tight text-ink-400 sm:text-xl">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-100 sm:text-[15px]">
                    {description}
                  </p>
                </div>
              </div>

              <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {highlights.map((highlight) => (
                  <li
                    key={highlight.label}
                    className="flex items-start gap-2.5 text-sm text-ink-200"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-ember-500"
                      aria-hidden
                    />
                    <span>
                      {highlight.label}
                      {highlight.srOnly ? (
                        <span className="sr-only"> {highlight.srOnly}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.article>
          )
        )}
      </motion.div>
    </PageSection>
  );
}
