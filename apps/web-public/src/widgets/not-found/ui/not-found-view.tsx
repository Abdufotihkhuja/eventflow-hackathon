"use client";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Calendar, Search } from "lucide-react";

import { withLocalePath } from "@shared/lib/i18n-routing";
import {
  fadeIn,
  fadeInUp,
  scaleIn,
  createStaggerContainer,
} from "@shared/lib/motion";
import { Button, buttonStyles } from "@shared/ui/button";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { Surface } from "@shared/ui/surface";

const pageContainer = createStaggerContainer(0.1);

/**
 * 404 Not Found Page
 * Отображается когда пользователь попадает на несуществующую страницу
 *
 * `extra` renders under the navigation buttons; the event 404 puts the
 * invite-code field there.
 */
export function NotFoundView({ extra }: { extra?: ReactNode }): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const homePath = withLocalePath("/", locale);
  const eventsPath = withLocalePath("/events", locale);
  const pastEventsPath = withLocalePath("/events/past", locale);
  const blogPath = withLocalePath("/blog", locale);
  const aboutPath = withLocalePath("/about", locale);

  const handleGoBack = (): void => {
    router.back();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-16">
      {/* Основной контент */}
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div variants={pageContainer} initial="hidden" animate="visible">
          <Surface variant="glassStrong" radius="3xl" padding="lg">
            {/* 404 число с градиентом */}
            <motion.div variants={scaleIn} className="mb-8 text-center">
              <h1
                className="text-ember-500 text-[120px] font-black leading-none tracking-tighter md:text-[160px]"
                aria-label={t("public.notFound.aria404")}
              >
                404
              </h1>
            </motion.div>

            {/* Заголовок и описание */}
            <motion.div
              variants={fadeInUp}
              className="mb-10 space-y-3 text-center"
            >
              <h2 className="text-2xl font-bold tracking-tight text-ink-400 md:text-3xl">
                {t("public.notFound.title")}
              </h2>
              <p className="mx-auto max-w-md text-base text-ink-100 md:text-lg">
                {t("public.notFound.description")}
              </p>
            </motion.div>

            {/* Кнопки навигации */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <Link
                href={homePath}
                className={buttonStyles({ variant: "primary", size: "lg" })}
              >
                <Home className="h-5 w-5" />
                <span>{t("public.notFound.home")}</span>
              </Link>

              <Button
                variant="glass"
                size="lg"
                leftIcon={<ArrowLeft className="h-5 w-5" />}
                onClick={handleGoBack}
              >
                {t("public.notFound.back")}
              </Button>

              <Link
                href={eventsPath}
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                <Calendar className="h-5 w-5" />
                <span>{t("public.notFound.events")}</span>
              </Link>
            </motion.div>

            {extra}

            {/* Дополнительные ссылки */}
            <motion.div
              variants={fadeIn}
              className="mt-10 border-t border-bone-300/60 pt-8"
            >
              <div className="text-center">
                <p className="mb-4 text-sm font-medium text-ink-100">
                  {t("public.notFound.popularSections")}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href={eventsPath}
                    className="link-underline rounded-lg px-3 py-1.5 text-sm text-ink-200 transition-colors hover:bg-bone-200/80 hover:text-ink-400"
                  >
                    {t("public.notFound.allEvents")}
                  </Link>
                  <Link
                    href={pastEventsPath}
                    className="link-underline rounded-lg px-3 py-1.5 text-sm text-ink-200 transition-colors hover:bg-bone-200/80 hover:text-ink-400"
                  >
                    {t("public.notFound.pastEvents")}
                  </Link>
                  <Link
                    href={blogPath}
                    className="link-underline rounded-lg px-3 py-1.5 text-sm text-ink-200 transition-colors hover:bg-bone-200/80 hover:text-ink-400"
                  >
                    {t("public.notFound.blog")}
                  </Link>
                  <Link
                    href={aboutPath}
                    className="link-underline rounded-lg px-3 py-1.5 text-sm text-ink-200 transition-colors hover:bg-bone-200/80 hover:text-ink-400"
                  >
                    {t("public.notFound.about")}
                  </Link>
                </div>
              </div>
            </motion.div>
          </Surface>

          {/* Декоративная иконка поиска */}
          <motion.div
            variants={fadeIn}
            className="mx-auto mt-8 flex items-center justify-center"
          >
            <motion.div
              className="border border-[var(--border-1)] bg-white shadow-xs flex h-14 w-14 items-center justify-center rounded-xl"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            >
              <Search className="h-6 w-6 text-ink-50" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
