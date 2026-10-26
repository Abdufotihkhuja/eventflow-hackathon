"use client";

import { useState } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { formatDate, formatDateTime, getCityLabel } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  Loader2,
  MapPin,
  Ticket,
  X,
  Award,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import { EventImage } from "@entities/event/ui";
import { formatUtcToLocalDate, parseUtcIso } from "@shared/lib/date";
import {
  useUserEventsQuery,
  useCancelRegistrationMutation,
  type UserEventItem,
  type UserEventFilter,
  type UserEventsStats,
} from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/ui";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileLoadingState,
  ProfileStatTile,
  ProfileTabs,
  type ProfileTabItem,
} from "@widgets/profile/layout";
import { ProfilePageHeader } from "@widgets/profile/page-header";
import { TicketCardModal } from "@widgets/profile/ticket-card";

// ============================================================================
// Конфигурация фильтров (табы в стиле OpenSea)
// ============================================================================

interface FilterOption {
  id: UserEventFilter;
  labelKey: string;
  shortLabelKey: string;
  statsKey?: keyof UserEventsStats;
}

const filterOptions: FilterOption[] = [
  {
    id: "ALL",
    labelKey: "public.profile.eventsPage.filters.all",
    shortLabelKey: "public.profile.eventsPage.filters.allShort",
    statsKey: "totalEvents",
  },
  {
    id: "APPROVED",
    labelKey: "public.profile.eventsPage.filters.approved",
    shortLabelKey: "public.profile.eventsPage.filters.approvedShort",
    statsKey: "approvedEvents",
  },
  {
    id: "PENDING",
    labelKey: "public.profile.eventsPage.filters.pending",
    shortLabelKey: "public.profile.eventsPage.filters.pendingShort",
  },
  {
    id: "ATTENDED",
    labelKey: "public.profile.eventsPage.filters.attended",
    shortLabelKey: "public.profile.eventsPage.filters.attendedShort",
    statsKey: "attendedEvents",
  },
  {
    id: "CANCELLED",
    labelKey: "public.profile.eventsPage.filters.cancelled",
    shortLabelKey: "public.profile.eventsPage.filters.cancelledShort",
  },
];

const statusConfig: Record<
  string,
  { labelKey: string; tone: string; bg: string; dot: string }
> = {
  APPROVED: {
    labelKey: "public.profile.eventsPage.status.approved",
    tone: "text-forest-600",
    bg: "bg-forest-50",
    dot: "bg-forest-500",
  },
  PENDING: {
    labelKey: "public.profile.eventsPage.status.pending",
    tone: "text-ember-500",
    bg: "bg-ember-50",
    dot: "bg-ember-400 animate-pulse",
  },
  ATTENDED: {
    labelKey: "public.profile.eventsPage.status.attended",
    tone: "text-forest-500",
    bg: "bg-forest-50",
    dot: "bg-forest-400",
  },
  CANCELLED: {
    labelKey: "public.profile.eventsPage.status.cancelled",
    tone: "text-ink-100",
    bg: "bg-bone-200",
    dot: "bg-ink-50",
  },
  REJECTED: {
    labelKey: "public.profile.eventsPage.status.rejected",
    tone: "text-[var(--danger)]",
    bg: "bg-[var(--danger-soft)]",
    dot: "bg-[var(--danger)]",
  },
  WAITLISTED: {
    labelKey: "public.profile.eventsPage.status.waitlisted",
    tone: "text-forest-500",
    bg: "bg-forest-50",
    dot: "bg-forest-400",
  },
};

const roleConfig: Record<
  string,
  { labelKey: string; className: string; accent: string }
> = {
  PARTICIPANT: {
    labelKey: "public.profile.eventsPage.roles.participant",
    className: "bg-forest-50 text-forest-600 border-forest-100",
    accent: "text-forest-600",
  },
  SPEAKER: {
    labelKey: "public.profile.eventsPage.roles.speaker",
    className: "bg-ember-50 text-ember-500 border-ember-100",
    accent: "text-ember-500",
  },
  MENTOR: {
    labelKey: "public.profile.eventsPage.roles.mentor",
    className: "bg-bone-200 text-ink-300 border-bone-300",
    accent: "text-ink-300",
  },
};

// ============================================================================
// Main Component
// ============================================================================

// eslint-disable-next-line complexity -- UI компонент с множеством состояний и фильтров
export function ProfileEventsSection(): React.ReactNode {
  const t = useT();
  const [filter, setFilter] = useState<UserEventFilter>("ALL");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [cancelEventItem, setCancelEventItem] = useState<UserEventItem | null>(
    null
  );

  // Получаем события из нового API
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useUserEventsQuery({
    params: { filter: filter !== "ALL" ? filter : undefined },
  });

  const events = eventsData?.data ?? [];
  const stats = eventsData?.stats;

  const handleRetry = (): void => {
    void refetch();
  };

  const handleCancelRequest = (eventItem: UserEventItem): void => {
    setCancelEventItem(eventItem);
  };

  const handleCancelSuccess = (): void => {
    setCancelEventItem(null);
    toast.success(t("public.profile.eventsPage.cancelSuccessTitle"), {
      description: t("public.profile.eventsPage.cancelSuccessDescription"),
    });
  };

  let content: React.ReactNode;
  if (isLoading) {
    content = <LoadingState />;
  } else if (error) {
    content = <ErrorState onRetry={handleRetry} />;
  } else if (events.length > 0) {
    content = (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((eventItem) => (
          <EventCard
            key={eventItem.id}
            eventItem={eventItem}
            onShowQr={() => setSelectedEventId(eventItem.id)}
            onCancelRequest={() => handleCancelRequest(eventItem)}
          />
        ))}
      </div>
    );
  } else {
    content = <EmptyState filter={filter} />;
  }

  return (
    <div className="space-y-8">
      <ProfilePageHeader
        icon={Ticket}
        eyebrow={t("public.profile.myEvents")}
        title={t("public.profile.eventsPage.title")}
        description={t("public.profile.eventsPage.description")}
      />

      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Табы фильтров */}
      <EventFilterTabs
        activeFilter={filter}
        onFilterChange={setFilter}
        stats={stats}
      />

      {/* Контент */}
      {content}

      {/* Ticket Modal */}
      {selectedEventId && (
        <TicketCardModal
          eventItem={events.find((e) => e.id === selectedEventId) ?? events[0]}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {/* Cancel Registration Modal */}
      {cancelEventItem && (
        <CancelRegistrationModal
          eventItem={cancelEventItem}
          onClose={() => setCancelEventItem(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
}

// ============================================================================
// Event Filter Tabs Component (OpenSea style)
// ============================================================================

interface EventFilterTabsProps {
  activeFilter: UserEventFilter;
  onFilterChange: (filter: UserEventFilter) => void;
  stats?: UserEventsStats;
}

function EventFilterTabs({
  activeFilter,
  onFilterChange,
  stats,
}: EventFilterTabsProps): React.ReactNode {
  const t = useT();

  const items: ProfileTabItem<UserEventFilter>[] = filterOptions.map((option) => {
    const count =
      option.statsKey && stats ? stats[option.statsKey] : undefined;
    return {
      id: option.id,
      label: t(option.labelKey),
      shortLabel: t(option.shortLabelKey),
      badge: count !== undefined && count > 0 ? count : undefined,
    };
  });

  return (
    <ProfileTabs<UserEventFilter>
      items={items}
      value={activeFilter}
      onChange={onFilterChange}
    />
  );
}

// ============================================================================
// Stats Cards Component
// ============================================================================

interface StatsCardsProps {
  stats: UserEventsStats;
}

function StatsCards({ stats }: StatsCardsProps): React.ReactNode {
  const t = useT();
  const statItems = [
    {
      label: t("public.profile.eventsPage.stats.total"),
      value: stats.totalEvents,
      icon: Ticket,
      tone: "ember" as const,
    },
    {
      label: t("public.profile.eventsPage.stats.approved"),
      value: stats.approvedEvents,
      icon: CheckCircle2,
      tone: "forest" as const,
    },
    {
      label: t("public.profile.eventsPage.stats.attended"),
      value: stats.attendedEvents,
      icon: MapPin,
      tone: "forest" as const,
    },
    {
      label: t("public.profile.eventsPage.stats.certificates"),
      value: stats.certificatesCount,
      icon: Award,
      tone: "ember" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {statItems.map((item) => (
        <ProfileStatTile
          key={item.label}
          icon={item.icon}
          value={item.value}
          label={item.label}
          tone={item.tone}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState(): React.ReactNode {
  const t = useT();
  return <ProfileLoadingState title={t("public.profile.eventsPage.loading")} />;
}

// ============================================================================
// Error State
// ============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps): React.ReactNode {
  const t = useT();
  return (
    <ProfileErrorState
      title={t("public.profile.eventsPage.loadErrorTitle")}
      description={t("public.profile.eventsPage.loadErrorDescription")}
      onRetry={onRetry}
      retryLabel={t("actions.retry")}
    />
  );
}

// ============================================================================
// Event Card
// ============================================================================

interface EventCardProps {
  eventItem: UserEventItem;
  onShowQr: () => void;
  onCancelRequest: () => void;
}

function EventCard({
  eventItem,
  onShowQr,
  onCancelRequest,
}: EventCardProps): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const { event, status, role, certificate, isAttended, isPastEvent } =
    eventItem;

  const canCancel =
    (status === "PENDING" || status === "APPROVED") && !isPastEvent;
  const statusStyles = statusConfig[status] ?? statusConfig.PENDING;
  const roleStyles = roleConfig[role] ?? roleConfig.PARTICIPANT;

  const eventHref = `/events/${event.slug ?? event.id}`;
  const cityLabel = event.city ? getCityLabel(t)(event.city) : null;
  const showActions =
    canCancel ||
    status === "APPROVED" ||
    status === "ATTENDED" ||
    status === "PENDING";

  const startDate = parseUtcIso(event.startDate);
  const dateStamp = formatDate(startDate, locale, {
    day: "numeric",
    month: "short",
  });
  const longStamp = `${formatDate(startDate, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })} · ${formatDateTime(startDate, locale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg border border-[var(--border-1)] bg-[var(--bg-2)]",
        "transition-[box-shadow] duration-200 ease-[var(--ease-standard)]",
        "hover:shadow-[var(--shadow-md)]",
        "focus-within:ring-2 focus-within:ring-ember-400/40 focus-within:ring-offset-2"
      )}
    >
      <Link
        href={eventHref}
        aria-label={t("public.events.eventDetailsAria", { title: event.title })}
        className="flex flex-1 flex-col focus-visible:outline-none"
      >
        {/* Cover — mirrors CalmEventCard.default from /events */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <EventImage
            coverImage={event.coverImage ?? undefined}
            alt={event.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 34vw"
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-ink-400/55 via-ink-400/10 to-transparent"
          />

          {/* Date stamp — top-right (mono on ink-400/90 + backdrop-blur, like EventPoster) */}
          <div className="absolute right-3 top-3">
            <span
              className={cn(
                "inline-flex items-center rounded-[4px] px-2.5 py-1.5 text-[10px] font-medium tracking-normal backdrop-blur-md",
                "[font-family:var(--font-mono)]",
                status === "REJECTED" || status === "CANCELLED"
                  ? "bg-ink-400/90 text-bone-50/80 line-through decoration-bone-50/60"
                  : status === "PENDING"
                    ? "bg-ember-400 text-bone-50"
                    : "bg-ink-400/90 text-bone-50"
              )}
            >
              {dateStamp}
            </span>
          </div>

          {/* Bottom row — organizer + city (Manrope 11px / mono 10px, like EventPoster) */}
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
            <span className="min-w-0 truncate text-[11px] font-medium leading-[1.3] text-bone-100/85">
              {event.organizationName ?? ""}
            </span>
            {cityLabel && (
              <span className="min-w-0 truncate text-[10px] leading-none text-bone-100/75 [font-family:var(--font-mono)]">
                · {cityLabel}
              </span>
            )}
          </div>
        </div>

        {/* Body — mirrors CalmEventCard.default body rhythm */}
        <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
          {/* Mono date + role accent (CalmEventCard puts category here on ember-500) */}
          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] leading-none [font-family:var(--font-mono)] text-ink-100">
            <span>{longStamp}</span>
            <span
              className={cn(
                "shrink-0 font-semibold",
                roleStyles.accent ?? "text-ember-500"
              )}
            >
              {t(roleStyles.labelKey)}
            </span>
          </div>

          {/* Title — 17/700, tight, balanced, no hover ember (matches CalmEventCard) */}
          <h3 className="mb-1.5 line-clamp-2 text-[17px] font-bold leading-[1.25] text-ink-400 [letter-spacing:-0.015em] [text-wrap:balance]">
            {event.title}
          </h3>

          {(event.venue || cityLabel) && (
            <p className="mb-3.5 line-clamp-1 text-[13px] leading-[1.4] text-ink-200">
              {event.venue ?? cityLabel}
            </p>
          )}

          {certificate?.certificateUrl && (
            <a
              href={certificate.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="mb-3.5 inline-flex items-center gap-1.5 self-start rounded-md border border-ember-100 bg-ember-50 px-2.5 py-1 text-[11px] font-semibold text-ember-600 transition-colors hover:bg-ember-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2"
              aria-label={t(
                "public.profile.eventsPage.certificateDownloadAria"
              )}
            >
              <Award className="h-3.5 w-3.5" aria-hidden />
              {t("public.profile.eventsPage.certificateAvailable")}
              <Download className="h-3 w-3" aria-hidden />
            </a>
          )}

          {/* Status footer — dashed border-1 (matches CalmEventCard's price footer) */}
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-[var(--border-1)] pt-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[13px] font-semibold leading-none",
                statusStyles.tone
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  statusStyles.dot
                )}
              />
              {t(statusStyles.labelKey)}
            </span>
            {isAttended && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold leading-none text-forest-600 [font-family:var(--font-mono)]">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {t("public.profile.eventsPage.status.attended")}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Actions row — outside the link so buttons keep their own click target */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-[var(--border-1)] px-4 py-3">
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<XCircle className="h-4 w-4" aria-hidden />}
              onClick={onCancelRequest}
              className="text-[var(--danger)] hover:bg-[var(--danger-soft)]/60 hover:text-[var(--danger)]"
            >
              {t("actions.cancel")}
            </Button>
          )}
          {(status === "APPROVED" ||
            status === "ATTENDED" ||
            status === "PENDING") && (
            <Button
              variant={
                status === "APPROVED" || status === "ATTENDED"
                  ? "primary"
                  : "secondary"
              }
              size="sm"
              leftIcon={<Ticket className="h-4 w-4" aria-hidden />}
              onClick={onShowQr}
              aria-label={
                status === "PENDING"
                  ? t("public.profile.eventsPage.ticketPendingTitle")
                  : t("public.profile.eventsPage.showTicket")
              }
            >
              {t("public.profile.eventsPage.ticket")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  filter: UserEventFilter;
}

function EmptyState({ filter }: EmptyStateProps): React.ReactNode {
  const t = useT();
  const filterLabel =
    filterOptions.find((f) => f.id === filter)?.labelKey ?? filter;

  return (
    <ProfileEmptyState
      icon={Filter}
      title={t("public.profile.eventsPage.emptyTitle")}
      description={
        filter === "ALL"
          ? t("public.profile.eventsPage.emptyAll")
          : t("public.profile.eventsPage.emptyFiltered", {
              filter: t(filterLabel),
            })
      }
      action={
        <Link href="/events">
          <Button>{t("public.profile.dashboard.findEvent")}</Button>
        </Link>
      }
    />
  );
}

// ============================================================================
// Cancel Registration Modal
// ============================================================================

interface CancelRegistrationModalProps {
  eventItem: UserEventItem;
  onClose: () => void;
  onSuccess: () => void;
}

function CancelRegistrationModal({
  eventItem,
  onClose,
  onSuccess,
}: CancelRegistrationModalProps): React.ReactNode {
  const t = useT();

  const { mutate: cancelRegistration, isPending } =
    useCancelRegistrationMutation({
      onSuccess: () => {
        onSuccess();
      },
      onError: (err) => {
        toast.error(t("common.error"), {
          description: err.message || t("public.profile.eventsPage.cancelError"),
        });
      },
    });

  const handleConfirm = (): void => {
    cancelRegistration({
      registrationId: eventItem.id,
      eventId: eventItem.event.id,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-400/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md animate-in zoom-in-95 rounded-xl bg-bone-50 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-50 transition hover:bg-bone-200 hover:text-ink-100 disabled:opacity-50"
          aria-label={t("actions.close")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger-soft)]">
            <AlertTriangle className="h-7 w-7 text-[var(--danger)]" aria-hidden />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-ink-400">
            {t("public.profile.eventsPage.cancelTitle")}
          </h3>
          <p className="mt-2 text-sm text-ink-100">
            {t("public.profile.eventsPage.cancelDescription")}
          </p>
        </div>

        {/* Event info */}
        <div className="mt-6 rounded-xl bg-bone-100 p-4">
          <p className="font-medium text-ink-400">
            {eventItem.event.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-100">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {formatUtcToLocalDate(eventItem.event.startDate, {
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {eventItem.event.venue ??
                (eventItem.event.city ? getCityLabel(t)(eventItem.event.city) : null) ??
                t("public.events.formats.online")}
            </span>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 rounded-xl border border-[var(--warning-soft)] bg-ember-50 p-3">
          <p className="text-xs text-[var(--warning)]">
            {t("public.profile.eventsPage.cancelWarning")}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="flex-1"
          >
            {t("actions.back")}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={isPending}
            loadingLabel={t("public.profile.eventsPage.cancelling")}
            className="flex-1"
          >
            {t("public.profile.eventsPage.confirmCancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
