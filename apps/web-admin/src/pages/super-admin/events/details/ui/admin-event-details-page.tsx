/**
 * Детальная страница события для супер-админа: полная картина по событию —
 * KPI-агрегаты (регистрации/чек-ины/сертификаты/просмотры), программа,
 * спикеры, участники, комментарии, системные данные и переводы.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDateTime } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import { toast } from "sonner";

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  CalendarRange,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  MapPin,
  MessageCircle,
  Mic2,
  Users,
  Video,
} from "lucide-react";

import { MEDIA_BASE_URL, PUBLIC_SITE_URL } from "@api/config";
import {
  ACCESS_TYPE_LABEL_KEYS,
  EVENT_FORMAT_LABEL_KEYS,
  EVENT_STATUS_LABEL_KEYS,
} from "@entities/event";
import {
  useAdminEventQuery,
  useFeaturedEventMutation,
  FeaturedEventToggle,
} from "@features/super-admin";
import { EventInfoCard } from "@features/events";
import {
  getBannerTemplateGradient,
  isBannerTemplate,
} from "@features/events/lib/banner-templates";
import { EventLocationMap } from "@features/events/ui/event-location-map";
import { cn } from "@shared/lib/cn";
import { getDescriptionText } from "@shared/lib";
import {
  Badge,
  Button,
  Card,
  LoadingState,
  StatusPill,
  statusPillTone,
} from "@shared/ui";

import { EventParticipantsTab } from "./tabs/event-participants-tab";
import { EventCommentsTab } from "./tabs/event-comments-tab";
import { AdminEventActionsMenu } from "./admin-event-actions-menu";
import { EventProgramSection } from "./event-program-section";
import { EventSpeakersSection } from "./event-speakers-section";
import { EventStatsRow } from "./event-stats-row";

type TabType = "overview" | "program" | "speakers" | "participants" | "comments";

const VERIFICATION_LABEL_KEYS: Record<string, string> = {
  PENDING: "profile.verification.pending",
  APPROVED: "profile.verification.verified",
  REJECTED: "profile.verification.rejected",
};

const APP_LOCALES = ["ru", "uz", "en"] as const;

const getMediaUrl = (url: string) => {
  if (!url || url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${MEDIA_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function AdminEventDetailsPage() {
  const t = useT();
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const {
    data: event,
    isLoading,
    isError,
    error,
  } = useAdminEventQuery(id ?? "");
  const toggleFeatured = useFeaturedEventMutation();

  if (isLoading) {
    return <LoadingState label={t("events.details.loading")} />;
  }

  if (isError || !event) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-sm font-semibold text-foreground">
          {error?.message ?? t("events.details.notFound")}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/events">
            <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
            {t("events.details.backToList")}
          </Link>
        </Button>
      </div>
    );
  }

  const publicUrl =
    event.slug && (event.status === "PUBLISHED" || event.status === "COMPLETED")
      ? `${PUBLIC_SITE_URL.replace(/\/$/, "")}/events/${event.slug}`
      : null;

  const tabs = [
    {
      id: "overview" as TabType,
      label: t("events.tabs.overview"),
      icon: Calendar,
    },
    {
      id: "program" as TabType,
      label: t("events.tabs.agenda"),
      icon: CalendarRange,
      badge: event.agendaItems?.length ?? 0,
    },
    {
      id: "speakers" as TabType,
      label: t("events.tabs.speakers"),
      icon: Mic2,
      badge: event.speakers?.length ?? 0,
    },
    {
      id: "participants" as TabType,
      label: t("events.tabs.participants"),
      icon: Users,
      badge: event._count.registrations,
    },
    ...(event.commentsEnabled
      ? [
          {
            id: "comments" as TabType,
            label: t("events.tabs.comments"),
            icon: MessageCircle,
            badge: event.stats?.commentsCount,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/admin/events">
            <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
            {t("admin.actions.back")}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={statusPillTone(event.status)}>
                {t(
                  EVENT_STATUS_LABEL_KEYS[
                    event.status as keyof typeof EVENT_STATUS_LABEL_KEYS
                  ],
                )}
              </StatusPill>
              {event.isFeatured && (
                <Badge variant="secondary">
                  {t("admin.events.fields.featuredEvent")}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {t(
                  EVENT_FORMAT_LABEL_KEYS[
                    event.format as keyof typeof EVENT_FORMAT_LABEL_KEYS
                  ],
                )}
                {" · "}
                {t(
                  ACCESS_TYPE_LABEL_KEYS[
                    event.accessType as keyof typeof ACCESS_TYPE_LABEL_KEYS
                  ],
                )}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {event.title}
            </h1>
            {event.description && (
              <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                {getDescriptionText(event.description)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1">
            {publicUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 size-4" aria-hidden="true" />
                  {t("admin.events.details.publicPage")}
                </a>
              </Button>
            )}
            <FeaturedEventToggle
              isFeatured={event.isFeatured}
              onToggle={() => toggleFeatured.mutate(event.id)}
              isPending={toggleFeatured.isPending}
            />
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/events/${event.id}/edit`}>
                <Edit className="mr-1.5 size-4" aria-hidden="true" />
                {t("admin.actions.edit")}
              </Link>
            </Button>
            <AdminEventActionsMenu event={event} />
          </div>
        </div>
      </div>

      {/* KPI-агрегаты */}
      <EventStatsRow event={event} locale={locale} />

      {/* Organization Info */}
      <Card>
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                <Link
                  to={`/admin/organizations?search=${encodeURIComponent(event.organization.companyName)}`}
                  className="underline-offset-2 hover:underline"
                >
                  {event.organization.companyName}
                </Link>
              </h3>
              <StatusPill tone={statusPillTone(event.organization.verificationStatus)}>
                {t(
                  VERIFICATION_LABEL_KEYS[
                    event.organization.verificationStatus
                  ],
                )}
              </StatusPill>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {event.organization.email}
            </p>
          </div>
        </div>
      </Card>

      <EventInfoCard
        startDate={event.startDate}
        endDate={event.endDate}
        format={event.format}
        accessType={event.accessType}
        registrationsCount={event._count.registrations}
        maxParticipants={event.maxParticipants}
        registrationDeadline={event.registrationDeadline}
        type={event.type}
        inviteCode={event.inviteCode}
        price={event.price}
        currency={event.currency}
      />

      {/* Tabs */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-muted/50">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition",
                    activeTab === tab.id
                      ? "border-foreground bg-background text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {"badge" in tab && tab.badge !== undefined && (
                    <Badge variant="secondary" className="ml-1">
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <OverviewTab event={event} locale={locale} publicUrl={publicUrl} />
          )}
          {activeTab === "program" && (
            <EventProgramSection items={event.agendaItems ?? []} locale={locale} />
          )}
          {activeTab === "speakers" && (
            <EventSpeakersSection speakers={event.speakers ?? []} />
          )}
          {activeTab === "participants" && (
            <EventParticipantsTab
              eventId={event.id}
              event={{
                registrationMode: event.registrationMode,
                minTestScore: event.minTestScore,
                maxTestScore: event.maxTestScore,
              }}
            />
          )}
          {activeTab === "comments" && (
            <EventCommentsTab
              eventId={event.id}
              commentsEnabled={event.commentsEnabled ?? false}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

// Overview Tab для AdminEvent
function OverviewTab({
  event,
  locale,
  publicUrl,
}: {
  event: NonNullable<ReturnType<typeof useAdminEventQuery>["data"]>;
  locale: string;
  publicUrl: string | null;
}) {
  const t = useT();
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      {event.coverImage && (
        <div className="overflow-hidden rounded-lg">
          {isBannerTemplate(event.coverImage) ? (
            <div
              className={cn(
                "h-64 w-full",
                getBannerTemplateGradient(event.coverImage) ?? "bg-muted",
              )}
            />
          ) : (
            <img
              src={getMediaUrl(event.coverImage)}
              alt={event.title}
              className="h-64 w-full object-cover"
            />
          )}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t("admin.events.sections.description")}
          </h3>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {getDescriptionText(event.description)}
          </p>
        </div>
      )}

      {/* Short Description */}
      {event.shortDescription && (
        <div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t("admin.events.fields.shortDescription")}
          </h3>
          <p className="text-muted-foreground">{event.shortDescription}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Dates */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Calendar className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">
                {t("admin.events.sections.dateTime")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("admin.events.fields.start")}:{" "}
                {formatDateTime(startDate, locale)}
              </p>
              {endDate && (
                <p className="text-sm text-muted-foreground">
                  {t("admin.events.fields.end")}:{" "}
                  {formatDateTime(endDate, locale)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            {event.format === "ONLINE" ? (
              <Video className="mt-1 size-5 shrink-0 text-info" />
            ) : (
              <MapPin className="mt-1 size-5 shrink-0 text-success" />
            )}
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">
                {t("admin.events.sections.venue")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  EVENT_FORMAT_LABEL_KEYS[
                    event.format as keyof typeof EVENT_FORMAT_LABEL_KEYS
                  ],
                )}
              </p>
              {event.venue && (
                <p className="text-sm text-muted-foreground">{event.venue}</p>
              )}
              {event.address && (
                <p className="text-sm text-muted-foreground">{event.address}</p>
              )}
              {event.city && (
                <p className="text-sm text-muted-foreground">{event.city}</p>
              )}
              {event.onlineUrl && (
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-sm text-info hover:underline"
                >
                  {t("admin.events.fields.meetingLink")}
                </a>
              )}
            </div>
          </div>
        </div>

        {event.latitude != null && event.longitude != null && (
          <EventLocationMap
            latitude={event.latitude}
            longitude={event.longitude}
            caption={event.venue ?? event.address ?? undefined}
            className="w-full"
          />
        )}

        {/* Participants */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Users className="mt-1 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">
                {t("admin.events.fields.registered")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("admin.events.fields.registered")}:{" "}
                {event._count.registrations}
                {event.maxParticipants
                  ? ` ${t("admin.events.fields.outOf")} ${event.maxParticipants}`
                  : ""}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {event.registrationOpen === false
                  ? t("admin.events.details.registrationClosed")
                  : t("admin.events.details.registrationOpen")}
              </p>
            </div>
          </div>
        </div>

        {/* Price */}
        {event.price && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Banknote className="mt-1 size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">
                  {t("admin.events.fields.price")}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {event.price.toLocaleString()} {event.currency}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Deadline */}
        {event.registrationDeadline && (
          <div className="rounded-lg border border-border bg-warning-soft p-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-1 size-5 shrink-0 text-warning" />
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">
                  {t("admin.events.fields.registrationDeadline")}
                </p>
                <p className="text-sm font-semibold text-warning-soft-foreground">
                  {formatDateTime(event.registrationDeadline, locale)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {event.rejectionReason && (
          <div className="rounded-lg border border-border bg-danger-soft p-4 md:col-span-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-destructive" aria-hidden />
              <div>
                <p className="mb-1 text-sm font-medium text-destructive">
                  {t("admin.events.fields.rejectionReason")}
                </p>
                <p className="text-sm text-destructive">{event.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System info */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t("admin.events.sections.systemInfo")}
        </h3>
        <dl className="space-y-2">
          <SystemInfoRow label="ID" value={event.id} mono copyable />
          <SystemInfoRow
            label={t("admin.events.fields.organizationId")}
            value={event.organizationId}
            mono
            copyable
          />
          {event.slug && (
            <SystemInfoRow
              label={t("admin.events.details.slug")}
              value={event.slug}
              mono
              copyable
            />
          )}
          {publicUrl && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <dt className="shrink-0 text-muted-foreground">
                {t("admin.events.details.publicPage")}
              </dt>
              <dd className="min-w-0">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate font-mono text-xs font-medium text-foreground underline-offset-2 hover:underline"
                >
                  <span className="truncate">{publicUrl}</span>
                  <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                </a>
              </dd>
            </div>
          )}
          <SystemInfoRow
            label={t("events.info.accessType")}
            value={
              ACCESS_TYPE_LABEL_KEYS[
                event.accessType as keyof typeof ACCESS_TYPE_LABEL_KEYS
              ]
                ? t(
                    ACCESS_TYPE_LABEL_KEYS[
                      event.accessType as keyof typeof ACCESS_TYPE_LABEL_KEYS
                    ],
                  )
                : event.accessType
            }
          />
          {event.inviteCode && (
            <SystemInfoRow
              label={t("admin.events.fields.inviteCode")}
              value={event.inviteCode}
              mono
              copyable
            />
          )}
          <SystemInfoRow
            label={t("admin.events.details.views")}
            value={(event.viewsCount ?? 0).toLocaleString(locale)}
          />
          <SystemInfoRow
            label={t("admin.events.fields.createdAt")}
            value={formatDateTime(event.createdAt, locale)}
          />
          <SystemInfoRow
            label={t("admin.events.fields.updatedAt")}
            value={formatDateTime(event.updatedAt, locale)}
          />
          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="shrink-0 text-muted-foreground">
              {t("admin.events.details.translations")}
            </dt>
            <dd
              className="flex items-center gap-1.5"
              title={t("admin.events.details.translationsHint")}
            >
              {APP_LOCALES.map((code) => {
                const filled = Boolean(
                  event.translations?.title?.[code]?.trim(),
                );
                return (
                  <span
                    key={code}
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                      filled
                        ? "bg-success-soft text-success-soft-foreground"
                        : "bg-muted text-muted-foreground line-through",
                    )}
                  >
                    {code}
                  </span>
                );
              })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// Строка «Системной информации»: label — dt, значение — dd (mono для идентификаторов),
// опциональная кнопка копирования.
function SystemInfoRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const t = useT();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("admin.toasts.copied"));
    } catch {
      toast.error(t("admin.toasts.copyError"));
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        <span className={cn("truncate font-medium", mono && "font-mono text-xs")}>
          {value}
        </span>
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
            aria-label={t("admin.actions.copy")}
            title={t("admin.actions.copy")}
          >
            <Copy className="size-3.5" />
          </Button>
        )}
      </dd>
    </div>
  );
}
