"use client";

import { useMemo, type ReactNode } from "react";
import type { Locale } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { withLocalePath } from "@shared/lib/i18n-routing";

import { CalendarX, ChevronRight, RefreshCw } from "lucide-react";

import { adaptPublicEventsToEvents } from "@entities/event/lib";
import { EventCard } from "@entities/event/ui";
import { PUBLIC_EVENTS_MAX_LIMIT } from "@shared/api/eventService";
import { usePublicEventsQuery } from "@shared/lib/hooks/useEventsQuery";
import { cn } from "@shared/lib/utils";
import { Button, MotionFadeIn } from "@shared/ui";

/** Сколько карточек показывать в блоке на лендинге (данные из одного запроса с limit 50) */
const EVENTS_DISPLAY_LIMIT = 12;

/**
 * Скелетон для карточки события — соответствует новому дизайну
 */
function EventCardSkeleton(): ReactNode {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-bone-300/50 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Соотношение сторон как у EventCard (16/10) — без layout shift */}
      <div className="aspect-16/10 bg-bone-200" />
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded-lg bg-bone-200" />
          <div className="h-4 w-3/4 rounded-lg bg-bone-200" />
        </div>
        {/* Meta */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="size-3.5 rounded-full bg-bone-200" />
            <div className="h-3 w-24 rounded-lg bg-bone-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3.5 rounded-full bg-bone-200" />
            <div className="h-3 w-32 rounded-lg bg-bone-200" />
          </div>
        </div>
        {/* Organizer */}
        <div className="pt-3 border-t border-bone-200">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-bone-200" />
            <div className="h-3 w-20 rounded-lg bg-bone-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Пустое состояние когда нет событий
 */
function EmptyState({ locale }: { locale: Locale }): ReactNode {
  const t = useT();

  return (
    <div className="empty-state-container col-span-full flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-bone-300/60">
        <CalendarX className="size-10 text-ink-50" aria-hidden />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink-400">
          {t("public.landing.featuredEvents.emptyTitle")}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-100">
          {t("public.landing.featuredEvents.emptyDescription")}{" "}
          <Link
            href={withLocalePath("/events", locale)}
            className="font-medium text-ember-500 underline-offset-2 hover:underline"
          >
            {t("public.landing.featuredEvents.catalogLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Состояние ошибки загрузки с повторной попыткой
 */
function ErrorState({
  onRetry,
  isRetrying,
  locale,
}: {
  onRetry: () => void;
  isRetrying: boolean;
  locale: Locale;
}): ReactNode {
  const t = useT();

  return (
    <div className="empty-state-container col-span-full flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-bone-300/60">
        <RefreshCw
          className={cn(
            "size-10 text-ink-50",
            isRetrying && "animate-spin"
          )}
          aria-hidden
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink-400">
          {t("public.landing.featuredEvents.loadErrorTitle")}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-100">
          {t("public.landing.featuredEvents.loadingErrorDescription")}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => onRetry()}
        disabled={isRetrying}
        className="rounded-full px-6"
      >
        {isRetrying
          ? t("public.landing.featuredEvents.retrying")
          : t("public.landing.featuredEvents.retry")}
      </Button>
    </div>
  );
}

export function LandingFeaturedEvents(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { data, isLoading, isError, refetch, isRefetching } =
    usePublicEventsQuery({
      params: { limit: PUBLIC_EVENTS_MAX_LIMIT },
      staleTime: 5 * 60 * 1000,
    });

  const featuredEvents = useMemo(() => {
    if (!data?.items || data.items.length === 0) {
      return [];
    }
    return adaptPublicEventsToEvents(data.items).slice(0, EVENTS_DISPLAY_LIMIT);
  }, [data?.items]);

  const hasEvents = featuredEvents.length > 0;
  const totalEvents = data?.total ?? 0;
  const hasMoreEvents = totalEvents > EVENTS_DISPLAY_LIMIT;

  return (
    <>
      {/* Section Header */}
      <div className="mb-8">
        <div className="section-heading-accent mb-2 flex items-center justify-between">
          <Link
            href={withLocalePath("/events", locale)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-lg py-1 pr-1",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2"
            )}
          >
              <h2
                id="events-heading"
                className="text-lg font-bold text-ink-400 transition-colors group-hover:text-ember-500 sm:text-xl"
              >
                {t("public.landing.featuredEvents.title")}
              </h2>
            {totalEvents > 0 && (
              <span className="rounded-full bg-bone-200 px-2.5 py-0.5 text-xs font-medium text-ink-100">
                {totalEvents}
              </span>
            )}
            <ChevronRight
              className="size-4 text-ink-50 transition-all duration-200 group-hover:translate-x-1 group-hover:text-ember-400"
              aria-hidden
            />
          </Link>
        </div>
        <p className="section-subtitle">
          {t("public.landing.featuredEvents.subtitle")}
        </p>
      </div>

      {/* Events Grid — 3 колонки на десктопе, картинки хорошо видны */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </>
        )}

        {!isLoading && isError && (
          <ErrorState
            onRetry={() => void refetch()}
            isRetrying={isRefetching}
            locale={locale}
          />
        )}

        {!isLoading && !isError && !hasEvents && <EmptyState locale={locale} />}

        {!isLoading &&
          !isError &&
          hasEvents &&
          featuredEvents.map((event, index) => (
            <MotionFadeIn key={event.id} direction="up" delay={index * 0.05}>
              <EventCard event={event} />
            </MotionFadeIn>
          ))}
      </div>

      {/* Show more button - only if more than limit */}
      {hasEvents && hasMoreEvents && (
        <div className="mt-10 flex justify-center">
          <Link href={withLocalePath("/events", locale)}>
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "rounded-full px-8",
                "transition-all duration-200",
                "hover:shadow-md hover:scale-[1.02]",
                "active:scale-[0.98]"
              )}
            >
              {t("public.landing.featuredEvents.showMore")}
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}
