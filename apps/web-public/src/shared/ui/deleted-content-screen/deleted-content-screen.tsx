"use client";

import { formatDate } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import { FileX2, Home, Calendar, FileText } from "lucide-react";

import { withLocalePath } from "@shared/lib/i18n-routing";
import { MotionFadeIn } from "@shared/ui/motion";
import { buttonStyles } from "@shared/ui/button";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { Surface } from "@shared/ui/surface";

export interface DeletedContentScreenProps {
  /** Причина удаления от супер-админа (если указана) */
  message?: string | null;
  /** Тип контента для выбора дефолтного текста и навигации */
  contentType: "event" | "article";
  /** Дата удаления (ISO 8601), опционально для отображения */
  deletedAt?: string | null;
}

/**
 * Экран 410 Gone — удалённый контент.
 * Показывает текст (deletionReason) или дефолтное сообщение на размытом фоне.
 */
export function DeletedContentScreen({
  message,
  contentType,
  deletedAt,
}: DeletedContentScreenProps): React.ReactNode {
  const locale = useLocale();
  const t = useT();
  const homePath = withLocalePath("/", locale);
  const eventsPath = withLocalePath("/events", locale);
  const blogPath = withLocalePath("/blog", locale);
  const displayMessage =
    message?.trim() ||
    t(
      contentType === "event"
        ? "public.deletedContent.defaultEvent"
        : "public.deletedContent.defaultArticle"
    );

  const formattedDate = deletedAt
    ? formatDate(new Date(deletedAt), locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-16">
      <div className="relative z-10 w-full max-w-2xl">
        <MotionFadeIn direction="up">
          <Surface variant="glassStrong" radius="3xl" padding="lg">
            {/* Иконка 410 Gone */}
            <div className="mb-8 flex justify-center">
              <div
                className="border border-[var(--border-1)] bg-white shadow-xs flex h-20 w-20 items-center justify-center rounded-xl"
                aria-hidden
              >
                <FileX2 className="h-10 w-10 text-ink-100" />
              </div>
            </div>

            {/* Заголовок */}
            <div className="mb-6 text-center">
              <span
                className="text-ember-500 inline-block text-5xl font-black tracking-tighter md:text-6xl"
                aria-hidden
              >
                410
              </span>
              <MotionFadeIn direction="up" delay={0.2}>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink-400 md:text-3xl">
                  {t("public.deletedContent.title")}
                </h2>
              </MotionFadeIn>
            </div>

            {/* Сообщение (deletionReason или дефолт) */}
            <MotionFadeIn direction="up" delay={0.2}>
              <div className="mb-8 space-y-3 text-center">
                <p className="mx-auto max-w-lg text-base leading-relaxed text-ink-100 md:text-lg">
                  {displayMessage}
                </p>
                {formattedDate && (
                  <p className="text-sm text-ink-100">
                    {t("public.deletedContent.deletedAt", {
                      date: formattedDate,
                    })}
                  </p>
                )}
              </div>
            </MotionFadeIn>

            {/* Кнопки навигации */}
            <MotionFadeIn direction="up" delay={0.3}>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:flex-wrap">
                <Link
                  href={homePath}
                  className={buttonStyles({ variant: "primary", size: "lg" })}
                >
                  <Home className="h-5 w-5" />
                  <span>{t("public.deletedContent.home")}</span>
                </Link>
                {contentType === "event" ? (
                  <Link
                    href={eventsPath}
                    className={buttonStyles({
                      variant: "secondary",
                      size: "lg",
                    })}
                  >
                    <Calendar className="h-5 w-5" />
                    <span>{t("public.deletedContent.eventCatalog")}</span>
                  </Link>
                ) : (
                  <Link
                    href={blogPath}
                    className={buttonStyles({
                      variant: "secondary",
                      size: "lg",
                    })}
                  >
                    <FileText className="h-5 w-5" />
                    <span>{t("public.deletedContent.blog")}</span>
                  </Link>
                )}
              </div>
            </MotionFadeIn>

            {/* Дополнительные ссылки */}
            <MotionFadeIn direction="none" delay={0.4}>
              <div className="mt-10 border-t border-bone-300/60 pt-8">
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href={eventsPath}
                    className="link-underline rounded-lg px-3 py-1.5 text-sm text-ink-200 transition-colors hover:bg-bone-200/80 hover:text-ink-400"
                  >
                    {t("public.deletedContent.allEvents")}
                  </Link>
                  <Link
                    href={blogPath}
                    className="link-underline rounded-lg px-3 py-1.5 text-sm text-ink-200 transition-colors hover:bg-bone-200/80 hover:text-ink-400"
                  >
                    {t("public.notFound.blog")}
                  </Link>
                </div>
              </div>
            </MotionFadeIn>
          </Surface>
        </MotionFadeIn>
      </div>
    </div>
  );
}
