"use client";

import { useMemo, useState } from "react";

import { plural } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import {
  AlertCircle,
  Filter,
  Grid3X3,
  LayoutList,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { mapPublicEventToDesignEvent } from "@entities/event/lib";
import { parseUtcIso } from "@shared/lib/date";
import { usePublicEventsQuery } from "@shared/lib/hooks";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { EVENTS_FOUND_PLURAL } from "@shared/lib/plurals";
import { cn } from "@shared/lib/utils";
import { Button, Input, Surface } from "@shared/ui";
import { CalmEventCard } from "@shared/ui/design-system";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileLoadingState,
} from "@widgets/profile/layout";

import type {
  EventFormat as ApiEventFormat,
  EventPaymentType,
  PublicEvent,
} from "@shared/api/eventService";

type EventFormat = ApiEventFormat | "all";
type EventType = EventPaymentType | "all";
type ViewMode = "grid" | "list";

function getViewContainerClassName(viewMode: ViewMode): string {
  return viewMode === "grid"
    ? "grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
    : "flex flex-col gap-4";
}

/**
 * Сортировка событий по дате начала (UTC с API, ближайшие первые)
 */
function sortByStartDate(events: PublicEvent[]): PublicEvent[] {
  return [...events].sort(
    (a, b) =>
      parseUtcIso(a.startDate).getTime() - parseUtcIso(b.startDate).getTime()
  );
}

const formatOptions: Array<{ id: EventFormat; labelKey: string }> = [
  { id: "all", labelKey: "public.profile.eventsCatalog.filters.allFormats" },
  { id: "OFFLINE", labelKey: "public.events.formats.offline" },
  { id: "ONLINE", labelKey: "public.events.formats.online" },
  { id: "HYBRID", labelKey: "public.events.formats.hybrid" },
];

const typeOptions: Array<{ id: EventType; labelKey: string }> = [
  { id: "all", labelKey: "public.profile.eventsCatalog.filters.allTypes" },
  { id: "FREE", labelKey: "public.events.pricing.free" },
  { id: "PAID", labelKey: "public.events.pricing.paid" },
];

// eslint-disable-next-line complexity
export function ProfileEventsCatalog(): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<EventFormat>("all");
  const [typeFilter, setTypeFilter] = useState<EventType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Загрузка событий через API
  const { data, isLoading, error } = usePublicEventsQuery({
    params: {
      limit: 50,
      format: formatFilter === "all" ? undefined : formatFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      search: searchQuery.trim() || undefined,
    },
  });

  // Сортировка по дате начала
  const filteredEvents = useMemo(() => {
    if (!data?.items) return [];
    return sortByStartDate(data.items);
  }, [data?.items]);

  const hasActiveFilters =
    formatFilter !== "all" || typeFilter !== "all" || searchQuery.trim() !== "";

  const clearFilters = (): void => {
    setSearchQuery("");
    setFormatFilter("all");
    setTypeFilter("all");
  };

  return (
    <section className="space-y-6">
      <Surface
        variant="solid"
        radius="xl"
        padding="lg"
        className="space-y-6 border border-bone-300/60"
      >
        {/* Заголовок и поиск */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-100">
              {t("public.profile.eventsCatalog.badge")}
            </p>
            <h2 className="text-xl font-bold tracking-tight text-ink-400 sm:text-[22px]">
              {t("public.profile.eventsCatalog.title")}
            </h2>
            <p className="text-sm text-ink-100">
              {plural(locale, filteredEvents.length, EVENTS_FOUND_PLURAL)}
            </p>
          </div>

          {/* Поиск и переключатель вида */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 md:flex-none md:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-50"
                aria-hidden
              />
              <Input
                type="text"
                placeholder={t("public.events.hero.searchDefaultPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-50 hover:text-ink-200"
                  aria-label={t("public.profile.eventsCatalog.clearSearch")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            {/* Переключатель фильтров (мобильный) */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors lg:hidden",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50",
                showFilters || hasActiveFilters
                  ? "border-[var(--border-2)] bg-bone-100 text-ink-400"
                  : "border-[var(--border-2)] bg-bone-50 text-ink-400 hover:bg-bone-100"
              )}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {t("public.events.hero.filters")}
              {hasActiveFilters && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ember-50 px-1.5 text-[10px] font-bold text-ember-500">
                  {(formatFilter !== "all" ? 1 : 0) +
                    (typeFilter !== "all" ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Переключатель вида */}
            <div
              className="hidden items-center gap-0.5 rounded-md border border-[var(--border-2)] bg-bone-50 p-0.5 md:flex"
              role="group"
              aria-label={t("public.profile.eventsCatalog.viewMode") ?? "View"}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-[5px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bone-50",
                  viewMode === "grid"
                    ? "bg-bone-200 text-ink-400"
                    : "text-ink-100 hover:text-ink-300"
                )}
                aria-pressed={viewMode === "grid"}
                aria-label={t("public.profile.eventsCatalog.gridView")}
              >
                <Grid3X3 className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-[5px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bone-50",
                  viewMode === "list"
                    ? "bg-bone-200 text-ink-400"
                    : "text-ink-100 hover:text-ink-300"
                )}
                aria-pressed={viewMode === "list"}
                aria-label={t("public.profile.eventsCatalog.listView")}
              >
                <LayoutList className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        {/* Фильтры (десктоп + мобильный раскрывающийся) */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-3",
            !showFilters && "hidden lg:flex"
          )}
        >
          <div className="flex flex-wrap gap-1.5">
            {formatOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFormatFilter(option.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50",
                  formatFilter === option.id
                    ? "border-ink-400 bg-ink-400 text-bone-50"
                    : "border-[var(--border-2)] bg-bone-50 text-ink-200 hover:border-[var(--border-strong)] hover:text-ink-400"
                )}
                aria-pressed={formatFilter === option.id}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>

          <div className="hidden h-6 w-px bg-bone-300 lg:block" aria-hidden />

          <div className="flex flex-wrap gap-1.5">
            {typeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTypeFilter(option.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50",
                  typeFilter === option.id
                    ? "border-ink-400 bg-ink-400 text-bone-50"
                    : "border-[var(--border-2)] bg-bone-50 text-ink-200 hover:border-[var(--border-strong)] hover:text-ink-400"
                )}
                aria-pressed={typeFilter === option.id}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <Button
              variant="link"
              size="sm"
              onClick={clearFilters}
              leftIcon={<X className="h-3.5 w-3.5" aria-hidden />}
            >
              {t("actions.reset")}
            </Button>
          )}
        </div>
      </Surface>

      {/* Состояние загрузки */}
      {isLoading && (
        <ProfileLoadingState
          title={t("public.profile.eventsCatalog.loading") ?? "Loading..."}
        />
      )}

      {/* Состояние ошибки */}
      {error && !isLoading && (
        <ProfileErrorState
          title={t("public.profile.eventsCatalog.loadError")}
        />
      )}

      {/* Список событий — CalmEventCard, идентичный карточкам /en/events */}
      {!isLoading && !error && filteredEvents.length > 0 && (
        <div className={cn(getViewContainerClassName(viewMode))}>
          {filteredEvents.map((event) => (
            <CalmEventCard
              key={event.id}
              event={mapPublicEventToDesignEvent(event, {
                locale,
                freeLabel: t("public.events.pricing.free"),
              })}
              variant={viewMode === "list" ? "list" : "default"}
              href={withLocalePath(`/events/${event.slug ?? event.id}`, locale)}
            />
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && !error && filteredEvents.length === 0 && (
        <EmptyState searchQuery={searchQuery} onClear={clearFilters} />
      )}

      {/* Кнопка загрузить ещё */}
      {!isLoading &&
        !error &&
        filteredEvents.length > 6 &&
        data &&
        data.page < data.totalPages && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" size="lg">
              {t("public.profile.eventsCatalog.showAll")}
            </Button>
          </div>
        )}
    </section>
  );
}

/** Обёртка для совместимости: PublicEvent → CalmEventCard (сетка). Используется в слайдере рекомендаций. */
export function EventCardGrid({ event }: { event: PublicEvent }): React.ReactNode {
  const locale = useLocale();
  const t = useT();
  return (
    <CalmEventCard
      event={mapPublicEventToDesignEvent(event, {
        locale,
        freeLabel: t("public.events.pricing.free"),
      })}
      href={withLocalePath(`/events/${event.slug ?? event.id}`, locale)}
    />
  );
}

interface EmptyStateProps {
  searchQuery: string;
  onClear: () => void;
}

function EmptyState({
  searchQuery,
  onClear,
}: EmptyStateProps): React.ReactNode {
  const t = useT();

  return (
    <Surface
      variant="glass"
      radius="4xl"
      padding="lg"
      className="flex flex-col items-center gap-4 border border-dashed border-ink-400/20 bg-bone-50/80 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bone-200">
        <Search className="h-7 w-7 text-ink-50" aria-hidden />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink-400">
          {t("public.profile.eventsCatalog.emptyTitle")}
        </h3>
        <p className="mt-1 text-sm text-ink-100">
          {searchQuery
            ? t("public.profile.eventsCatalog.emptySearch", {
                query: searchQuery,
              })
            : t("public.profile.eventsCatalog.emptyDefault")}
        </p>
      </div>
      <Button variant="outline" size="md" onClick={onClear}>
        {t("public.profile.eventsCatalog.resetFilters")}
      </Button>
    </Surface>
  );
}
