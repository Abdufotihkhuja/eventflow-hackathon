"use client";

import { useMemo } from "react";

import {
  AlertCircle,
  Loader2,
  Star,
} from "lucide-react";

import { parseUtcIso } from "@shared/lib/date";
import { useFeaturedEventsQuery } from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { Surface } from "@shared/ui";
import { EventCardGrid } from "@widgets/profile/events-catalog";

import type { PublicEvent } from "@shared/api/eventService";

/**
 * Сортировка событий по дате начала (UTC с API, ближайшие первые)
 */
function sortByStartDate(events: PublicEvent[]): PublicEvent[] {
  return [...events].sort(
    (a, b) =>
      parseUtcIso(a.startDate).getTime() - parseUtcIso(b.startDate).getTime()
  );
}

export function ProfileFeaturedEventsSlider(): React.ReactNode {
  const { data, isLoading, error } = useFeaturedEventsQuery({ limit: 10 });

  const featuredEvents = useMemo(() => {
    if (!data?.items) return [];
    return sortByStartDate(data.items);
  }, [data?.items]);

  // Состояние загрузки
  if (isLoading) {
    return (
      <section className="space-y-6">
        <header>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-ink-100">
            <Star className="h-4 w-4 text-ember-400" aria-hidden />
            Рекомендуем
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-400 md:text-3xl">
            Топовые события
          </h2>
        </header>
        <Surface variant="glassStrong" radius="4xl" padding="lg">
          <div className="flex h-80 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-ember-400" />
          </div>
        </Surface>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <header>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-ink-100">
            <Star className="h-4 w-4 text-ember-400" aria-hidden />
            Рекомендуем
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-400 md:text-3xl">
            Топовые события
          </h2>
        </header>
        <Surface
          variant="glass"
          radius="4xl"
          padding="lg"
          className="border border-[var(--danger-soft)] bg-[var(--danger-soft)]/50"
        >
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-[var(--danger)]" />
            <p className="text-sm text-[var(--danger)]">
              Не удалось загрузить события. Попробуйте позже.
            </p>
          </div>
        </Surface>
      </section>
    );
  }

  if (featuredEvents.length === 0) return null;

  return (
    <section className="space-y-6">
      <header>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-ink-100">
          <Star className="h-4 w-4 text-ember-400" aria-hidden />
          Рекомендуем
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ink-400 md:text-3xl">
          Топовые события
        </h2>
        <p className="mt-2 text-sm text-ink-100">
          Отборные мероприятия, которые нельзя пропустить
        </p>
      </header>

      {/* Сетка 3 колонки — те же карточки, что в каталоге */}
      <div
        className={cn(
          "grid gap-4",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {featuredEvents.map((event) => (
          <EventCardGrid key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
