"use client";

import { useMemo, useState } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { getCityLabel, plural } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  Ticket,
  X,
  Building2,
} from "lucide-react";

import { formatUtcToLocalDate, formatUtcToLocalTime } from "@shared/lib/date";
import {
  useUserCalendarQuery,
  useCalendarEventsQuery,
  type CalendarDay,
  type CalendarRole,
  type CalendarEventItem,
} from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { EVENTS_PLURAL, TRIPS_PLURAL } from "@shared/lib/plurals";
import { Button, MotionFadeIn } from "@shared/ui";
import {
  ProfileErrorState,
  ProfileLoadingState,
  ProfileTabs,
  type ProfileTabItem,
} from "@widgets/profile/layout";
import { ProfilePageHeader } from "@widgets/profile/page-header";

// ============================================================================
// Конфигурация фильтров и стилей
// ============================================================================

const filterOptions: Array<{ id: CalendarRole | "all"; labelKey: string }> = [
  { id: "all", labelKey: "public.profile.calendar.filters.all" },
  { id: "SPEAKER", labelKey: "public.profile.calendar.filters.speaker" },
  { id: "PARTICIPANT", labelKey: "public.profile.calendar.filters.participant" },
  { id: "MENTOR", labelKey: "public.profile.calendar.filters.mentor" },
];

type CalendarFilter = (typeof filterOptions)[number]["id"];

/** Стили для дней в зависимости от типа активности */
const getDayStyles = (day: CalendarDay): string => {
  if (day.hasSpeakerEvents) {
    return "border-ember-200 bg-ember-50 text-ember-500";
  }
  if (day.hasParticipantEvents) {
    return "border-forest-200 bg-forest-50 text-forest-600";
  }
  if (day.hasMentorEvents) {
    return "border-bone-400 bg-bone-200 text-ink-300";
  }
  if (day.hasTravel) {
    return "border-forest-200 bg-forest-50 text-forest-500";
  }
  if (day.hasPreparation) {
    return "border-forest-200 bg-forest-50 text-forest-500";
  }
  return "border-bone-300/60 bg-bone-50 text-ink-100";
};

/** Цвета точек-индикаторов */
const getDotColor = (day: CalendarDay): string => {
  if (day.hasSpeakerEvents) return "bg-ember-500";
  if (day.hasParticipantEvents) return "bg-forest-600";
  if (day.hasMentorEvents) return "bg-ink-300";
  if (day.hasTravel) return "bg-forest-500";
  return "bg-ink-50";
};

/** Стили для роли события */
const roleStyles: Record<CalendarRole, { labelKey: string; className: string }> = {
  SPEAKER: {
    labelKey: "public.profile.eventsPage.roles.speaker",
    className: "bg-ember-50 text-ember-500",
  },
  PARTICIPANT: {
    labelKey: "public.profile.eventsPage.roles.participant",
    className: "bg-forest-50 text-forest-600",
  },
  MENTOR: {
    labelKey: "public.profile.eventsPage.roles.mentor",
    className: "bg-bone-200 text-ink-300",
  },
};

/** Легенда календаря */
const calendarLegend = [
  {
    id: "speaker",
    labelKey: "public.profile.calendar.filters.speaker",
    className: "border-ember-200 bg-ember-50",
  },
  {
    id: "participant",
    labelKey: "public.profile.calendar.filters.participant",
    className: "border-forest-200 bg-forest-50",
  },
  {
    id: "mentor",
    labelKey: "public.profile.calendar.filters.mentor",
    className: "border-bone-400 bg-bone-200",
  },
  {
    id: "travel",
    labelKey: "public.profile.calendar.travel",
    className: "border-forest-200 bg-forest-50",
  },
];

const weekdayKeys = [
  "public.profile.calendar.weekdays.mon",
  "public.profile.calendar.weekdays.tue",
  "public.profile.calendar.weekdays.wed",
  "public.profile.calendar.weekdays.thu",
  "public.profile.calendar.weekdays.fri",
  "public.profile.calendar.weekdays.sat",
  "public.profile.calendar.weekdays.sun",
];

// ============================================================================
// Утилиты
// ============================================================================

function formatCalendarDate(dateStr: string): string {
  return formatUtcToLocalDate(dateStr, {
    day: "numeric",
    month: "long",
  });
}

function formatTime(startDate: string, endDate?: string): string {
  const startTime = formatUtcToLocalTime(startDate, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (endDate) {
    const endTime = formatUtcToLocalTime(endDate, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startTime} – ${endTime}`;
  }
  return startTime;
}

/**
 * Генерирует сетку календаря с пустыми ячейками для выравнивания
 */
function generateCalendarGrid(
  year: number,
  month: number,
  days: CalendarDay[]
) {
  // Создаём карту дней для быстрого доступа
  const daysMap = new Map<number, CalendarDay>();
  days.forEach((day) => {
    daysMap.set(day.day, day);
  });

  // Определяем первый день месяца (0 = воскресенье, 1 = понедельник, ...)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  // Преобразуем в понедельник = 0
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Количество дней в месяце
  const daysInMonth = new Date(year, month, 0).getDate();

  const weeks: Array<Array<CalendarDay | null>> = [];
  let currentWeek: Array<CalendarDay | null> = [];

  // Добавляем пустые ячейки в начало
  for (let i = 0; i < startOffset; i++) {
    currentWeek.push(null);
  }

  // Добавляем дни месяца
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dayData = daysMap.get(dayNum);
    currentWeek.push(
      dayData || {
        date: `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
        day: dayNum,
        activities: [],
        hasSpeakerEvents: false,
        hasParticipantEvents: false,
        hasMentorEvents: false,
        hasTravel: false,
        hasPreparation: false,
      }
    );

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Добавляем пустые ячейки в конец последней недели
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

// ============================================================================
// Компонент
// ============================================================================

// eslint-disable-next-line complexity -- Сложный UI компонент календаря
export function ProfileCalendarSection(): React.ReactNode {
  const locale = useLocale();
  const t = useT();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Получаем календарь из API
  const {
    data: calendarData,
    isLoading,
    error,
    refetch,
  } = useUserCalendarQuery({
    year,
    month,
    role: filter !== "all" ? filter : undefined,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Получаем события на выбранную дату
  const { data: eventsData, isLoading: eventsLoading } = useCalendarEventsQuery(
    {
      date: selectedDate || "",
      role: filter !== "all" ? filter : undefined,
      enabled: !!selectedDate,
    }
  );

  // Генерируем сетку календаря
  const calendarWeeks = useMemo(() => {
    if (!calendarData) return [];
    return generateCalendarGrid(year, month, calendarData.days);
  }, [calendarData, year, month]);

  // Фильтруем все события для списка
  const allEvents = useMemo(() => {
    if (!calendarData) return [];
    return calendarData.days
      .flatMap((day) => day.activities)
      .filter(
        (activity, index, self) =>
          index === self.findIndex((a) => a.eventId === activity.eventId)
      );
  }, [calendarData]);

  const handleRetry = (): void => {
    void refetch();
  };

  const handleDayClick = (day: CalendarDay): void => {
    if (day.activities.length > 0) {
      setSelectedDate(selectedDate === day.date ? null : day.date);
    }
  };

  // Loading state
  if (isLoading) {
    return <ProfileLoadingState title={t("public.profile.calendar.loading")} />;
  }

  // Error state
  if (error || !calendarData) {
    return (
      <ProfileErrorState
        title={t("public.profile.calendar.loadErrorTitle")}
        description={t("public.profile.calendar.loadErrorDescription")}
        onRetry={handleRetry}
        retryLabel={t("actions.retry")}
      />
    );
  }

  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(calendarData.year, calendarData.month - 1, 1));
  const monthSubtitle = `${plural(locale, calendarData.eventsCount, EVENTS_PLURAL)} · ${plural(
    locale,
    calendarData.travelsCount,
    TRIPS_PLURAL,
  )}`;

  const filterTabItems: ProfileTabItem<CalendarFilter>[] = filterOptions.map(
    (option) => ({ id: option.id, label: t(option.labelKey) })
  );

  const filterChips = (
    <ProfileTabs<CalendarFilter>
      items={filterTabItems}
      value={filter}
      onChange={(value) => {
        setFilter(value);
        setSelectedDate(null);
      }}
    />
  );

  return (
    <div className="space-y-8">
      <ProfilePageHeader
        icon={CalendarDays}
        eyebrow={t("public.profile.calendar.badge")}
        title={t("public.profile.calendar.title")}
        description={t("public.profile.calendar.description")}
        actions={filterChips}
      />

      {/* Календарь */}
      <MotionFadeIn
        direction="up"
        delay={0.15}
        className="space-y-6 rounded-2xl border border-bone-300/60 bg-bone-50 p-5 shadow-[0_1px_2px_rgba(14,14,13,0.04),0_4px_12px_rgba(14,14,13,0.04)] md:p-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-100">
              {monthSubtitle}
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-ink-400 sm:text-[22px]">
              {monthTitle}
            </h3>
          </div>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold uppercase tracking-[0.26em] text-ink-50">
          {weekdayKeys.map((dayKey) => (
            <span key={dayKey}>{t(dayKey)}</span>
          ))}
        </div>

        {/* Сетка календаря */}
        <div className="space-y-3">
          {calendarWeeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-3">
              {week.map((cell, cellIndex) => {
                if (!cell) {
                  return <span key={`empty-${weekIndex}-${cellIndex}`} />;
                }

                const hasEvents = cell.activities.length > 0;
                const isSelected = selectedDate === cell.date;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => handleDayClick(cell)}
                    disabled={!hasEvents}
                    className={cn(
                      "group relative rounded-md border py-3.5 text-center text-sm font-semibold transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2",
                      getDayStyles(cell),
                      hasEvents && "cursor-pointer hover:border-ink-300/60",
                      isSelected && "ring-2 ring-ember-400 ring-offset-2",
                      !hasEvents && "cursor-default"
                    )}
                  >
                    <span className="block">{cell.day}</span>

                    {/* Индикаторы-точки */}
                    {hasEvents && (
                      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                        {Array.from({
                          length: Math.min(cell.activities.length, 3),
                        }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 w-1 rounded-full transition-all duration-200",
                              getDotColor(cell),
                              isSelected && "h-1.5 w-1.5"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Легенда */}
        <div className="grid gap-2 text-xs text-ink-100 sm:grid-cols-2 lg:grid-cols-4">
          {calendarLegend.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-3 w-3 rounded-full border",
                  item.className
                )}
                aria-hidden
              />
              {t(item.labelKey)}
            </div>
          ))}
        </div>
      </MotionFadeIn>

      {/* Попап с событиями выбранного дня */}
      {selectedDate && (
        <SelectedDayEvents
          date={selectedDate}
          events={eventsData?.events || []}
          isLoading={eventsLoading}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Список всех событий месяца */}
      <MotionFadeIn
        direction="up"
        delay={0.2}
        aria-labelledby="calendar-events-heading"
      >
        <div className="section-heading-accent mb-6">
          <h2
            id="calendar-events-heading"
            className="text-lg font-bold text-ink-400 sm:text-xl"
          >
            {t("public.profile.calendar.monthEvents")}
          </h2>
          <p className="section-subtitle">
            {t("public.profile.calendar.monthEventsDescription")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allEvents.length > 0 ? (
            allEvents.map((activity) => (
              <EventActivityCard key={activity.eventId} activity={activity} />
            ))
          ) : (
            <div className="empty-state-container col-span-full flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-bone-200">
                <CalendarDays className="size-7 text-ink-50" aria-hidden />
              </div>
              <p className="text-sm font-medium text-ink-100">
                {t("public.profile.calendar.noFilteredEvents")}
              </p>
            </div>
          )}
        </div>
      </MotionFadeIn>
    </div>
  );
}

// ============================================================================
// Вспомогательные компоненты
// ============================================================================

interface SelectedDayEventsProps {
  date: string;
  events: CalendarEventItem[];
  isLoading: boolean;
  onClose: () => void;
}

function SelectedDayEvents({
  date,
  events,
  isLoading,
  onClose,
}: SelectedDayEventsProps): React.ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <MotionFadeIn direction="none">
      <div
        className={cn(
          "rounded-xl border border-bone-300/60 bg-bone-50 p-6",
          "shadow-[0_4px_24px_rgba(0,0,0,0.08),0_24px_48px_rgba(0,0,0,0.12)]",
          "md:p-8"
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-100">
              {t("public.profile.calendar.selectedDateEvents")}
            </p>
            <h3 className="mt-1 text-xl font-bold text-ink-400 md:text-2xl">
              {formatCalendarDate(date)}
            </h3>
            <p className="mt-1 text-sm text-ink-100">
              {plural(locale, events.length, EVENTS_PLURAL)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2 hover:bg-bone-200"
            aria-label={t("actions.close")}
          >
            <X className="h-5 w-5 text-ink-100" aria-hidden />
          </button>
        </div>

        {/* eslint-disable-next-line no-nested-ternary -- Состояния loading/data/empty */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="h-8 w-8 animate-spin text-ember-400"
              aria-hidden
            />
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard key={event.eventId} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-bone-300 bg-bone-100/50 py-12 text-center">
            <CalendarDays className="h-10 w-10 text-ink-50" aria-hidden />
            <p className="text-sm font-medium text-ink-100">
              {t("public.profile.calendar.noEventsOnDate")}
            </p>
          </div>
        )}
      </div>
    </MotionFadeIn>
  );
}

interface EventCardProps {
  event: CalendarEventItem;
}

function EventCard({ event }: EventCardProps): React.ReactNode {
  const t = useT();
  const roleStyle = roleStyles[event.role];
  const localizedCity = event.city ? getCityLabel(t)(event.city) : null;
  const locationText =
    [event.venue, localizedCity].filter(Boolean).join(", ") ||
    t("public.events.formats.online");

  return (
    <Link
      href={`/events/${event.eventSlug ?? event.slug ?? event.eventId}`}
      className={cn(
        "group flex flex-col rounded-xl border border-bone-300/50 bg-bone-50 p-5",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        "transition-all duration-300 hover:-translate-y-0.5 hover:border-bone-400/80",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold",
              roleStyle.className
            )}
          >
            {t(roleStyle.labelKey)}
          </span>
          <h4 className="mt-2 line-clamp-2 text-lg font-semibold text-ink-400 transition-colors group-hover:text-ember-500">
            {event.title}
          </h4>
          {event.shortDescription && (
            <p className="mt-1 line-clamp-2 text-sm text-ink-100">
              {event.shortDescription}
            </p>
          )}
        </div>
        <ChevronRight
          className="size-5 shrink-0 text-ink-50 transition-transform group-hover:translate-x-0.5 group-hover:text-ember-400"
          aria-hidden
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-100">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-4 shrink-0 text-ember-400" aria-hidden />
          {formatTime(event.startDate, event.endDate)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4 shrink-0 text-ember-400" aria-hidden />
          {locationText}
        </span>
        {event.organizationName && (
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-4 shrink-0 text-ember-400" aria-hidden />
            {event.organizationName}
          </span>
        )}
      </div>
    </Link>
  );
}

interface EventActivityCardProps {
  activity: CalendarDay["activities"][0];
}

function EventActivityCard({
  activity,
}: EventActivityCardProps): React.ReactNode {
  const t = useT();
  const roleStyle = roleStyles[activity.role];
  const isTravel = activity.dayType === "TRAVEL";
  const accentClass = isTravel
    ? "from-forest-500 to-forest-400 shadow-forest-500/20"
    : "from-ember-400 to-ember-300 shadow-ember-400/20";

  return (
    <Link
      href={`/events/${activity.eventSlug ?? activity.slug ?? activity.eventId}`}
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-bone-300/50 bg-bone-50 p-5",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)]",
        "transition-all duration-300 ease-out hover:border-bone-400/80",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_24px_48px_rgba(0,0,0,0.12)] hover:-translate-y-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-bone-50 shadow-md",
            accentClass
          )}
          aria-hidden
        >
          <Ticket className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-100">
            {isTravel
              ? t("public.profile.calendar.travel")
              : t("public.profile.calendar.event")}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-ink-400 transition-colors group-hover:text-ember-500">
            {activity.eventTitle}
          </h3>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-bone-200 pt-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            roleStyle.className
          )}
        >
          {t(roleStyle.labelKey)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-100 group-hover:text-ember-500">
          {t("public.events.details")}
          <ChevronRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}
