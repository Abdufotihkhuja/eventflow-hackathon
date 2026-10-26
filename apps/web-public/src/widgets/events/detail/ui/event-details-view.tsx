"use client";

import {
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { formatDate, formatDateTime, toIntlLocale } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Facebook,
  Globe2,
  Instagram,
  Linkedin,
  MapPin,
  Monitor,
  Send,
  Ticket,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { extractTextFromBlocks } from "@shared/lib/richText";
import {
  formatEventPeriod,
  formatEventPrice,
  getEventAccessLabel,
  getEventFormatLabel,
  getEventPricingLabel,
  isActiveRegistration,
  normalizeSpeakers,
  EventImage,
} from "@entities/event";
import { groupByOverlap } from "@entities/event/lib/agenda-overlap";
import { useEventDetailsQuery } from "@features/event/details";
import { isAuthenticated } from "@shared/lib/apiClient";
import { parseUtcIso, toLocalDateKey } from "@shared/lib/date";
import { resolveAvatarUrl, resolveMediaUrl } from "@shared/lib/utils";
import {
  usePublicEventsQuery,
  useCanRegisterQuery,
  useIsFollowingQuery,
  useFollowOrganizationMutation,
  useUnfollowOrganizationMutation,
  getOrganizationFollowErrorMessage,
} from "@shared/lib/hooks";
import {
  BlogContentBlocks,
  Button,
  CommentsSection,
  PageSection,
  Pill,
  type PillProps,
  SafeImage,
  SectionHeading,
  Surface,
  YandexMapEmbed,
  buttonStyles,
} from "@shared/ui";

import { OrganizerFollowButton } from "./organizer-follow-button";

import type { BlockNoteContentBlock } from "@entities/blog";
import type {
  AgendaSpeaker,
  EventDetail,
  EventFaq,
  EventGalleryImage,
  EventHighlight,
  EventResource,
  EventRoom,
  EventScheduleItem,
  EventSpeaker,
  EventSpeakerSocial,
  ScheduleItemType,
} from "@entities/event";
import type { ApiError } from "@shared/lib";
import type { Translator } from "@eventflow/i18n";
import type { PublicEvent } from "@shared/lib/hooks";
import type { UseQueryResult } from "@tanstack/react-query";

/** Безопасный текст для рендера: API может вернуть строку или TipTap/BlockNote блоки */
function toSafeText(value: unknown): string {
  return extractTextFromBlocks(value);
}

/** Тон баннера типа доступа: открытое — success, по запросу — warning, по приглашению — accent, приватное — glass */
function getAccessPillTone(access: EventDetail["access"]): PillProps["tone"] {
  switch (access) {
    case "open":
      return "success";
    case "request":
      return "warning";
    case "invite":
      return "accent";
    case "private":
      return "glass";
    default:
      return "glass";
  }
}

interface EventDetailsViewProps {
  slug: string;
  initialEvent: EventDetail;
  inviteCode?: string;
}

interface SidebarMetaItem {
  id: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}

interface CtaLink {
  label: string;
  href: string;
  variant: "primary" | "outline";
}

interface ScheduleGroup {
  dateKey: string;
  dateLabel: string;
  items: EventScheduleItem[];
}

const SCHEDULE_TYPE_LABEL_KEYS: Record<ScheduleItemType, string> = {
  keynote: "public.events.detail.scheduleTypes.keynote",
  workshop: "public.events.detail.scheduleTypes.workshop",
  panel: "public.events.detail.scheduleTypes.panel",
  break: "public.events.detail.scheduleTypes.break",
  networking: "public.events.detail.scheduleTypes.networking",
  registration: "public.events.detail.scheduleTypes.registration",
  presentation: "public.events.detail.scheduleTypes.presentation",
  qa: "public.events.detail.scheduleTypes.qa",
  other: "public.events.detail.scheduleTypes.other",
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const SOCIAL_META: Partial<Record<
  EventSpeakerSocial["platform"],
  { label?: string; labelKey?: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
>> = {
  linkedin: { label: "LinkedIn", Icon: Linkedin },
  instagram: { label: "Instagram", Icon: Instagram },
  facebook: { label: "Facebook", Icon: Facebook },
  telegram: { label: "Telegram", Icon: Send },
  website: { labelKey: "public.events.detail.social.website", Icon: Globe2 },
};

function createScheduleFormatters(
  locale: string,
  eventTimezone: string | undefined
) {
  const timezone = eventTimezone ?? undefined;
  const dateFormatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "numeric",
    month: "long",
    timeZone: timezone,
  });
  const timeFormatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });

  return {
    formatDate: (date: Date) =>
      Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date),
    formatTime: (date: Date) =>
      Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date),
    /** YYYY-MM-DD в таймзоне события для группировки */
    toDateKey: (date: Date): string => {
      if (Number.isNaN(date.getTime())) return "";
      if (timezone) {
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .format(date)
          .replace(/\//g, "-");
      }
      return toLocalDateKey(date);
    },
  };
}

function groupScheduleItems(
  items: EventScheduleItem[],
  eventTimezone: string | undefined,
  locale: string
): ScheduleGroup[] {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return [];
  }

  const { formatDate, toDateKey } = createScheduleFormatters(
    locale,
    eventTimezone
  );
  const groups = new Map<string, EventScheduleItem[]>();

  items.forEach((item) => {
    const date = parseUtcIso(item.startTime);
    if (Number.isNaN(date.getTime())) return;
    const dateKey = toDateKey(date);
    if (!dateKey) return;
    const bucket = groups.get(dateKey);
    if (bucket) bucket.push(item);
    else groups.set(dateKey, [item]);
  });

  return Array.from(groups.entries())
    .map(([dateKey, groupItems]) => {
      const firstStart = groupItems[0]
        ? parseUtcIso(groupItems[0].startTime)
        : null;
      return {
        dateKey,
        dateLabel: firstStart ? formatDate(firstStart) : dateKey,
        items: groupItems.sort(
          (a, b) =>
            parseUtcIso(a.startTime).getTime() -
            parseUtcIso(b.startTime).getTime()
        ),
      };
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function formatTimeRange(
  item: EventScheduleItem,
  eventTimezone: string | undefined,
  locale: string
): string {
  const { formatTime } = createScheduleFormatters(locale, eventTimezone);
  const start = parseUtcIso(item.startTime);
  const startStr = formatTime(start);
  if (!item.endTime) return startStr;
  const end = parseUtcIso(item.endTime);
  return `${startStr} – ${formatTime(end)}`;
}

function getSpeakerDisplayName(speaker: {
  firstName: string;
  lastName: string;
}): string {
  return (
    [speaker.firstName, speaker.lastName].filter(Boolean).join(" ").trim() ||
    ""
  );
}

function formatSpeakerLine(speaker: AgendaSpeaker): string {
  const name = getSpeakerDisplayName(speaker);
  const parts = [speaker.position, speaker.company].filter(Boolean);
  return parts.length > 0 ? `${name} · ${parts.join(", ")}` : name;
}

function normalizeSpeakerBio(rawBio: string): string | null {
  const trimmed = rawBio.trim();
  if (!trimmed) return null;

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !EMAIL_RE.test(line));

  const uniqueLines = Array.from(new Set(lines));
  const text = uniqueLines.join("\n").trim();
  if (!text) return null;

  // Если био после чистки выглядит как набор e-mail/мусор — не показываем.
  if (!/[А-Яа-яA-Za-z]/.test(text)) return null;

  return text;
}

function buildCtaLinks(
  event: EventDetail,
  t: ReturnType<typeof useT>,
  isRegistered?: boolean,
  inviteCode?: string
): CtaLink[] {
  if (isRegistered) {
    return [
      {
        label: t("public.profile.myEvents"),
        href: "/profile/events",
        variant: "primary",
      },
    ];
  }

  const isPastEvent = event.endDate
    ? parseUtcIso(event.endDate).getTime() < Date.now()
    : parseUtcIso(event.startDate).getTime() < Date.now();

  if (isPastEvent) {
    if (event.secondaryCta) {
      return [
        {
          label: event.secondaryCta.label,
          href: event.secondaryCta.href,
          variant: "primary",
        },
      ];
    }
    return [];
  }

  const registerPath = `/events/${event.slug ?? event.id}/register`;
  const registerHref = inviteCode
    ? `${registerPath}?inviteCode=${encodeURIComponent(inviteCode)}`
    : registerPath;
  const primary = event.primaryCta ?? {
    label: t("public.events.registration.register"),
    href: registerHref,
  };

  const links: CtaLink[] = [
    {
      label: primary.label,
      href: inviteCode ? registerHref : primary.href,
      variant: "primary",
    },
  ];

  if (event.secondaryCta) {
    links.push({
      label: event.secondaryCta.label,
      href: event.secondaryCta.href,
      variant: "outline",
    });
  }

  return links;
}

function buildSidebarMeta(
  event: EventDetail,
  t: Translator,
  locale: string
): SidebarMetaItem[] {
  const items: SidebarMetaItem[] = [
    {
      id: "period",
      icon: CalendarDays,
      label: t("public.events.when"),
      value: formatEventPeriod(
        event.startDate,
        event.endDate,
        event.logistics?.timezone,
        locale
      ),
    },
    {
      id: "location",
      icon: MapPin,
      label: t("public.events.location"),
      value: event.location ?? t("public.events.formats.online"),
    },
    {
      id: "format",
      icon: Globe2,
      label: t("public.events.format"),
      value: getEventFormatLabel(event.format, t),
    },
    {
      id: "access",
      icon: Users,
      label: t("public.events.accessLabel"),
      value: getEventAccessLabel(event.access, t),
    },
    {
      id: "pricing",
      icon: Ticket,
      label: getEventPricingLabel(event.pricing, t),
      value: formatEventPrice(
        event.pricing,
        event.price,
        event.currency,
        locale,
        t
      ),
    },
  ];

  if (event.registrationsCount !== undefined) {
    items.push({
      id: "participants",
      icon: Users,
      label: t("public.events.participants"),
      value: event.capacity
        ? `${event.registrationsCount} / ${event.capacity}`
        : String(event.registrationsCount),
    });
  }

  if (event.logistics?.registrationDeadline) {
    const deadlineDate = parseUtcIso(event.logistics.registrationDeadline);
    items.push({
      id: "deadline",
      icon: Clock3,
      label: t("public.events.registrationDeadline"),
      value: formatDate(deadlineDate, locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: event.logistics?.timezone,
      }),
    });
  }

  return items;
}

export function EventDetailsView({
  slug,
  initialEvent,
  inviteCode,
}: EventDetailsViewProps): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const queryResult: UseQueryResult<EventDetail, ApiError> =
    useEventDetailsQuery({
      slug,
      inviteCode,
      initialData: initialEvent,
      staleTime: isAuthenticated() ? 0 : 1000 * 60 * 5,
    });

  const event = useMemo(() => {
    const api = queryResult.data ?? initialEvent;
    if (api === initialEvent) return api;
    // При refetch api может прийти в сыром API-формате: accessType/format в верхнем регистре,
    // относительные coverImage/logoUrl и без нормализованных imageUrl/heroImage.
    const raw = api as EventDetail & {
      accessType?: string;
      format?: string;
      coverImage?: string;
    };
    const accessMap: Record<string, EventDetail["access"]> = {
      OPEN: "open",
      REQUEST: "request",
      INVITE_ONLY: "invite",
      PRIVATE: "private",
    };
    const access =
      raw.access ??
      (raw.accessType ? accessMap[raw.accessType] : undefined) ??
      initialEvent.access;
    const formatMap: Record<string, EventDetail["format"]> = {
      ONLINE: "online",
      OFFLINE: "offline",
      HYBRID: "hybrid",
    };
    const format =
      (raw.format ? formatMap[raw.format] : undefined) ?? initialEvent.format;
    return {
      ...initialEvent,
      ...api,
      access,
      format,
      primaryCta: raw.primaryCta ?? initialEvent.primaryCta,
      secondaryCta: raw.secondaryCta ?? initialEvent.secondaryCta,
      logistics: raw.logistics ?? initialEvent.logistics,
      schedule: raw.schedule ?? initialEvent.schedule,
      imageUrl: resolveMediaUrl(
        (raw.imageUrl as string | undefined) ??
          (raw.coverImage as string | undefined) ??
          initialEvent.imageUrl
      ),
      heroImage: resolveMediaUrl(
        (raw.heroImage as string | undefined) ??
          (raw.imageUrl as string | undefined) ??
          (raw.coverImage as string | undefined) ??
          initialEvent.heroImage ??
          initialEvent.imageUrl
      ),
      organization: raw.organization
        ? {
            ...(initialEvent.organization ?? {}),
            ...(raw.organization as NonNullable<EventDetail["organization"]>),
            logoUrl: resolveMediaUrl(
              (raw.organization as NonNullable<EventDetail["organization"]>)
                .logoUrl
            ),
          }
        : initialEvent.organization,
      speakers: normalizeSpeakers(
        (raw as unknown as Record<string, unknown>).speakers as unknown[]
      ),
    } as EventDetail;
  }, [queryResult.data, initialEvent]);

  const isLoading = queryResult.isLoading && !queryResult.data;
  const queryError = queryResult.error ?? null;

  const { data: canRegisterData } = useCanRegisterQuery(event?.id ?? "", {
    enabled: !!event?.id && isAuthenticated(),
    inviteCode,
  });
  const isRegistered =
    isActiveRegistration(event?.myRegistration) ||
    (canRegisterData?.isRegistered ?? false);

  const organizationId = event.organization?.id ?? "";
  const isFollowingQuery = useIsFollowingQuery(organizationId);
  const followMutation = useFollowOrganizationMutation();
  const unfollowMutation = useUnfollowOrganizationMutation();
  const isFollowLoading =
    followMutation.isPending || unfollowMutation.isPending;
  const isFollowing = isFollowingQuery.data?.isFollowing ?? false;
  const handleFollow = (): void => {
    if (!organizationId) return;
    if (!isAuthenticated()) {
      toast.error(t("public.organizer.toasts.signInToFollow"));
      return;
    }
    followMutation.mutate(organizationId, {
      onError: (err) => toast.error(getOrganizationFollowErrorMessage(err)),
    });
  };
  const handleUnfollow = (): void => {
    if (!organizationId) return;
    if (!isAuthenticated()) {
      toast.error(t("public.organizer.toasts.signInToFollow"));
      return;
    }
    unfollowMutation.mutate(organizationId, {
      onError: (err) => toast.error(getOrganizationFollowErrorMessage(err)),
    });
  };

  // Schedule grouping moved into AgendaCard so the room-tabs filter can
  // re-group filtered items independently per click.
  const ctaLinks = useMemo(
    () => buildCtaLinks(event, t, isRegistered, inviteCode),
    [event, t, isRegistered, inviteCode]
  );
  const sidebarMeta = useMemo(
    () => buildSidebarMeta(event, t, locale),
    [event, t, locale]
  );

  const relatedQuery = usePublicEventsQuery({
    params: { limit: 18, filter: "upcoming" },
  });

  const relatedListItems = useMemo<PublicEvent[]>(() => {
    const items = relatedQuery.data?.items ?? [];
    const organizerId = event.organization?.id;

    const sameOrganizer =
      organizerId && items.length > 0
        ? items.filter((item) => item.organization?.id === organizerId)
        : [];

    const base = sameOrganizer.length > 0 ? sameOrganizer : items;

    return base.filter((item) => item.id !== event.id).slice(0, 3);
  }, [relatedQuery.data, event.id, event.organization?.id]);

  return (
    <div className="flex flex-col">
      <PageSection
        className="bg-background"
        containerClassName="grid min-w-0 gap-10 lg:grid-cols-[1fr_380px]"
      >
        <div className="flex min-w-0 flex-col gap-10">
          <EventHeader
            event={event}
            ctaLinks={ctaLinks}
            isRegistered={isRegistered}
            followState={
              organizationId
                ? {
                    organizationId,
                    isFollowing,
                    isFollowLoading,
                    onFollow: handleFollow,
                    onUnfollow: handleUnfollow,
                  }
                : undefined
            }
          />

          <div className="lg:hidden">
            <EventSidebarCard
              event={event}
              ctaLinks={ctaLinks}
              meta={sidebarMeta}
              isRegistered={isRegistered}
            />
          </div>

          <AboutCard event={event} />
          <LocationMapCard event={event} />
          <HighlightsCard highlights={event.highlights} />
          <GalleryCard images={event.gallery} />
          <AgendaCard
            schedule={event.schedule}
            rooms={event.rooms ?? []}
            eventTimezone={event.logistics?.timezone}
          />
          <SpeakersCard speakers={event.speakers} />
          <ResourcesFaqCard resources={event.resources} faqs={event.faqs} />
          <CommentsSection resource="event" entityId={event.id} />
          <FinalCtaCard
            title={event.title}
            ctaLinks={ctaLinks}
            isRegistered={isRegistered}
          />

          <RelatedEventsCard
            isLoading={relatedQuery.isLoading}
            items={relatedListItems}
            currentEvent={event}
          />
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-24 self-start">
          <EventSidebarCard
            event={event}
            ctaLinks={ctaLinks}
            meta={sidebarMeta}
            isRegistered={isRegistered}
          />
        </aside>
      </PageSection>

      <ErrorBanner hasError={Boolean(queryError)} />
      <LoadingBanner isLoading={isLoading} />
    </div>
  );
}

interface FollowState {
  organizationId: string;
  isFollowing: boolean;
  isFollowLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}

interface EventHeaderProps {
  event: EventDetail;
  ctaLinks: CtaLink[];
  isRegistered?: boolean;
  followState?: FollowState;
}

function EventHeader({
  event,
  ctaLinks,
  isRegistered,
  followState,
}: EventHeaderProps): ReactNode {
  const t = useT();
  const heroImageSrc = event.heroImage ?? event.imageUrl;
  const heroImageAlt = event.heroImageAlt ?? event.title;
  const showFollow = Boolean(followState?.organizationId);

  return (
    <Surface
      variant="glass"
      radius="4xl"
      padding="lg"
      className="overflow-hidden rounded-xl sm:rounded-[28px]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill
              tone="brand"
              className="px-4 py-2 text-[11px] tracking-[0.26em]"
            >
              {toSafeText(event.heroBadge)}
            </Pill>
            <Pill
              tone={getAccessPillTone(event.access)}
              className="px-4 py-2 text-[11px]"
              aria-label={t("public.events.detail.accessTypeAria", {
                access: getEventAccessLabel(event.access),
              })}
            >
              {getEventAccessLabel(event.access)}
            </Pill>
            {isRegistered && (
              <Pill tone="success" className="px-4 py-2 text-[11px]">
                {t("public.events.detail.registeredPill")}
              </Pill>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {event.organization?.name && (
              <span className="text-sm font-medium text-ink-100">
                {t("public.events.organizer")}:{" "}
                {event.organization?.id ? (
                  <Link
                    href={`/organizers/${event.organization.id}`}
                    className="font-semibold text-ink-400 underline decoration-ember-400/50 underline-offset-2 transition hover:text-ember-500 hover:decoration-ember-400"
                  >
                    {event.organization.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-ink-400">
                    {event.organization.name}
                  </span>
                )}
              </span>
            )}
            {showFollow && followState && (
              <OrganizerFollowButton
                isFollowing={followState.isFollowing}
                isLoading={followState.isFollowLoading}
                onFollow={followState.onFollow}
                onUnfollow={followState.onUnfollow}
                followLabel={t("public.organizer.follow")}
                unfollowLabel={t("public.organizer.unfollow")}
                ariaFollow={t("public.blog.article.followOrganizer")}
                ariaUnfollow={t("public.blog.article.unfollowOrganizer")}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold leading-tight text-ink-400 sm:text-4xl">
            {toSafeText(event.title)}
          </h1>
          {event.summary && (
            <p className="text-base leading-7 text-ink-100 whitespace-pre-line">
              {toSafeText(event.summary)}
            </p>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-bone-300/60 bg-bone-200">
          <div className="relative aspect-video w-full">
            <EventImage
              coverImage={heroImageSrc}
              alt={heroImageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 720px"
              className="object-cover"
              priority
            >
              <div className="absolute inset-0 bg-linear-to-t from-black/30 via-black/0 to-transparent" />
            </EventImage>
          </div>
        </div>

        {ctaLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {ctaLinks.map((cta) => (
              <Link
                key={`cta-header-${cta.href}`}
                href={cta.href}
                className={buttonStyles({ variant: cta.variant, size: "lg" })}
              >
                <span>{cta.label}</span>
                {cta.variant === "primary" && (
                  <ArrowRight aria-hidden className="h-4 w-4" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}

interface EventSidebarCardProps {
  event: EventDetail;
  ctaLinks: CtaLink[];
  meta: SidebarMetaItem[];
  isRegistered?: boolean;
}

function EventSidebarCard({
  event,
  ctaLinks,
  meta,
  isRegistered,
}: EventSidebarCardProps): ReactNode {
  const t = useT();
  const priceText = formatEventPrice(
    event.pricing,
    event.price,
    event.currency
  );

  return (
    <Surface
      variant="glassStrong"
      radius="4xl"
      padding="lg"
      className="min-w-0 space-y-6 rounded-xl sm:rounded-[28px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-ink-100">
            {t("public.events.detail.price")}
          </span>
          <span className="mt-1 text-2xl font-semibold text-ink-400">
            {priceText}
          </span>
        </div>
        {event.pricing === "free" && (
          <Pill tone="success">{t("public.events.pricing.free")}</Pill>
        )}
      </div>

      {isRegistered ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-forest-100 bg-forest-50/70 px-4 py-3">
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-forest-500"
              aria-hidden
            />
            <span className="text-sm font-medium text-forest-600">
              {t("public.events.detail.registeredMessage")}
            </span>
          </div>
          {ctaLinks.length > 0 && (
            <Link
              href={ctaLinks[0].href}
              className={buttonStyles({
                variant: "outline",
                size: "lg",
                className: "w-full",
              })}
            >
              <Ticket className="mr-2 h-5 w-5" aria-hidden />
              {t("public.profile.myEvents")}
            </Link>
          )}
        </div>
      ) : ctaLinks.length > 0 ? (
        <div className="flex flex-col gap-3">
          {ctaLinks.map((cta) => (
            <Link
              key={`cta-sidebar-${cta.href}`}
              href={cta.href}
              className={buttonStyles({
                variant: cta.variant,
                size: "lg",
                className: "w-full",
              })}
            >
              <span>{cta.label}</span>
              {cta.variant === "primary" && (
                <ArrowRight aria-hidden className="h-4 w-4" />
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-bone-100/80 p-4 text-sm text-ink-100">
          {t("public.events.detail.registrationUnavailable")}
        </div>
      )}

      <div className="space-y-4 border-t border-bone-300/60 pt-5">
        {meta.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ember-50 text-ember-500">
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-100">
                  {item.label}
                </span>
                <span className="text-sm font-medium text-ink-300">
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {(event.logistics?.onlineUrl || event.logistics?.mapUrl) && (
        <div className="space-y-2 border-t border-bone-300/60 pt-5">
          {event.logistics?.onlineUrl && (
            <Link
              href={event.logistics.onlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ember-500 transition hover:text-ember-400"
            >
              <Monitor aria-hidden className="h-4 w-4" />
              {t("public.events.detail.onlineLink")}
              <ExternalLink aria-hidden className="h-4 w-4" />
            </Link>
          )}
          {event.logistics?.mapUrl && (
            <Link
              href={event.logistics.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ember-500 transition hover:text-ember-400"
            >
              <MapPin aria-hidden className="h-4 w-4" />
              {t("public.events.detail.viewOnMap")}
              <ExternalLink aria-hidden className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </Surface>
  );
}

function LocationMapCard({ event }: { event: EventDetail }): ReactNode {
  const t = useT();
  const lat = event.logistics?.latitude?.trim();
  const lon = event.logistics?.longitude?.trim();
  const hasCoords = lat != null && lat !== "" && lon != null && lon !== "";
  if (!hasCoords) return null;

  const mapUrl = `https://yandex.ru/maps/?pt=${encodeURIComponent(lon)},${encodeURIComponent(lat)}&z=16&l=map`;
  const locationText =
    event.logistics?.venue ?? event.logistics?.address ?? event.location ?? "";

  return (
    <Surface variant="solid" radius="4xl" padding="lg">
      <SectionHeading
        eyebrow={t("public.events.detail.locationEyebrow")}
        title={t("public.events.detail.locationTitle")}
        description={
          locationText
            ? t("public.events.detail.locationDescription")
            : undefined
        }
      />
      {locationText && (
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-ink-200">
          <MapPin aria-hidden className="h-4 w-4 shrink-0" />
          {locationText}
          {event.logistics?.city && event.logistics.city !== locationText && (
            <span className="text-ink-100">, {event.logistics.city}</span>
          )}
        </p>
      )}
      {typeof process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY === "string" &&
      process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY.trim() !== "" ? (
        <div className="mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-bone-300/60 bg-bone-200 min-h-[240px]">
          <YandexMapEmbed
            latitude={lat}
            longitude={lon}
            className="h-full w-full"
          />
        </div>
      ) : (
        <Link
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block overflow-hidden rounded-xl border border-bone-300/60 bg-bone-200 transition hover:border-ember-200 hover:bg-bone-100"
        >
          <div className="relative flex aspect-16/10 w-full flex-col items-center justify-center gap-3 p-6">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ember-50 text-ember-500">
              <MapPin aria-hidden className="h-7 w-7" />
            </span>
            <span className="text-center text-sm font-semibold text-ink-200">
              {t("public.events.detail.showLocationOnMap")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ember-500">
              {t("public.events.detail.openInYandexMaps")}
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      )}
      <Link
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ember-500 transition hover:text-ember-400"
      >
        <ExternalLink aria-hidden className="h-4 w-4" />
        {t("public.events.detail.openInYandexMaps")}
      </Link>
    </Surface>
  );
}

function AboutCard({ event }: { event: EventDetail }): ReactNode {
  const t = useT();
  const blocks =
    (event.descriptionBlocks?.length ?? 0) > 0
      ? (event.descriptionBlocks as BlockNoteContentBlock[])
      : Array.isArray(event.description) && event.description.length > 0
        ? (event.description as BlockNoteContentBlock[])
        : null;
  const fallbackText =
    toSafeText(event.overviewDescription) ||
    toSafeText(event.description) ||
    toSafeText(event.summary);

  if (!blocks?.length && !fallbackText) return null;

  return (
    <Surface
      variant="solid"
      radius="4xl"
      padding="lg"
      className="min-w-0 rounded-xl sm:rounded-[28px]"
    >
      <SectionHeading
        eyebrow={t("public.events.detail.aboutEyebrow")}
        title={t("public.events.detail.detailsTitle")}
        description={undefined}
      />
      <div className="mt-6 min-w-0 break-words">
        {blocks?.length ? (
          <BlogContentBlocks
            blocks={blocks}
            className="prose-headings:font-bold prose-headings:text-ink-400 dark:prose-headings:text-bone-200 prose-p:text-ink-200 dark:prose-p:text-bone-400 prose-strong:font-semibold prose-strong:text-ink-400 dark:prose-strong:text-bone-200 prose-ul:my-4 prose-li:my-1 dark:prose-ul:text-bone-400"
          />
        ) : (
          <div className="text-sm leading-7 text-ink-200 whitespace-pre-line dark:text-bone-400">
            {fallbackText}
          </div>
        )}
      </div>
    </Surface>
  );
}

function HighlightsCard({
  highlights,
}: {
  highlights: EventHighlight[];
}): ReactNode {
  const t = useT();
  if (!highlights || highlights.length === 0) return null;

  return (
    <Surface variant="solid" radius="4xl" padding="lg">
      <SectionHeading
        eyebrow={t("public.events.detail.valueEyebrow")}
        title={t("public.events.detail.highlightsTitle")}
        description={t("public.events.detail.highlightsDescription")}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {highlights.map((h) => (
          <Surface key={h.id} variant="muted" radius="3xl" padding="md">
            <h3 className="text-base font-semibold text-ink-400">
              {h.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-100">
              {toSafeText(h.description)}
            </p>
          </Surface>
        ))}
      </div>
    </Surface>
  );
}

function GalleryCard({ images }: { images?: EventGalleryImage[] }): ReactNode {
  const t = useT();
  if (!images || images.length === 0) return null;

  return (
    <Surface variant="solid" radius="4xl" padding="lg">
      <SectionHeading
        eyebrow={t("public.events.detail.photoEyebrow")}
        title={t("public.events.detail.galleryTitle")}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img) => (
          <div
            key={img.src}
            className="relative overflow-hidden rounded-xl border border-bone-300/60 bg-bone-200"
          >
            <div className="relative aspect-4/3 w-full">
              <SafeImage
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function AgendaCard({
  schedule,
  rooms,
  eventTimezone,
}: {
  schedule: EventScheduleItem[];
  rooms: EventRoom[];
  eventTimezone?: string;
}): ReactNode {
  const locale = useLocale();
  const t = useT();

  // Single-select фильтры. null = «Все». Скрываются, если в событии
  // 0–1 залов / 0–1 дней — фильтр в этом случае избыточен.
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.sortOrder - b.sortOrder),
    [rooms]
  );
  const showRoomTabs = sortedRooms.length >= 2;

  // Все доступные дни события (не зависят от выбранного зала, чтобы
  // переключение зала не «прыгало» по списку дней).
  const allDays = useMemo(
    () => groupScheduleItems(schedule, eventTimezone, locale),
    [schedule, eventTimezone, locale]
  );
  const showDayTabs = allDays.length >= 2;

  // Если выбранный день стал недоступен — сбрасываем.
  const effectiveDateKey =
    selectedDateKey && allDays.some((d) => d.dateKey === selectedDateKey)
      ? selectedDateKey
      : null;

  const filteredSchedule = useMemo(() => {
    let items = schedule;
    if (selectedRoomId)
      items = items.filter((item) => item.roomId === selectedRoomId);
    return items;
  }, [schedule, selectedRoomId]);

  const groupedSchedule = useMemo(() => {
    const groups = groupScheduleItems(filteredSchedule, eventTimezone, locale);
    return effectiveDateKey
      ? groups.filter((g) => g.dateKey === effectiveDateKey)
      : groups;
  }, [filteredSchedule, eventTimezone, locale, effectiveDateKey]);

  const hasSchedule = groupedSchedule.length > 0;
  const hasActiveFilter =
    selectedRoomId !== null || effectiveDateKey !== null;
  const dayIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    allDays.forEach((d, idx) => map.set(d.dateKey, idx));
    return map;
  }, [allDays]);

  const resetFilters = (): void => {
    setSelectedRoomId(null);
    setSelectedDateKey(null);
  };

  const filterChipBase =
    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100";
  const filterChipActive =
    "bg-ember-400 text-white shadow-[0_4px_14px_rgba(234,107,55,0.25)] ring-1 ring-ember-500/20";
  const filterChipInactive =
    "bg-white/80 text-ink-200 ring-1 ring-bone-300/70 hover:-translate-y-px hover:bg-white hover:text-ember-600 hover:ring-ember-200 active:translate-y-0";

  const renderItem = (
    item: EventScheduleItem,
    options: { withTrackPill: boolean }
  ): ReactNode => {
    const typeLabel =
      item.type && SCHEDULE_TYPE_LABEL_KEYS[item.type]
        ? t(SCHEDULE_TYPE_LABEL_KEYS[item.type])
        : t(SCHEDULE_TYPE_LABEL_KEYS.other);
    const locationText = toSafeText(item.location);

    return (
      <Surface key={item.id} variant="muted" radius="4xl" padding="md">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-ember-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ember-600">
                {typeLabel}
              </span>
              {options.withTrackPill && locationText && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-200 ring-1 ring-bone-300/70">
                  {t("public.events.detail.parallel.trackLabel")} ·{" "}
                  {locationText}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-ink-200">
              {formatTimeRange(item, eventTimezone, locale)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-ink-400">
              {toSafeText(item.title)}
            </h3>
            {locationText && (
              <div className="flex items-center gap-2 text-sm text-ink-100">
                <MapPin aria-hidden className="h-4 w-4" />
                <span>{locationText}</span>
              </div>
            )}
            {toSafeText(item.description) && (
              <p className="text-sm leading-6 text-ink-100 whitespace-pre-line">
                {toSafeText(item.description)}
              </p>
            )}
          </div>

          {item.speakers && item.speakers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {item.speakers.map((speaker) => (
                <span
                  key={`${item.id}-${speaker.id}`}
                  className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-200"
                >
                  {formatSpeakerLine(speaker)}
                </span>
              ))}
            </div>
          )}
        </div>
      </Surface>
    );
  };

  return (
    <Surface variant="solid" radius="4xl" padding="lg">
      <SectionHeading
        eyebrow={t("public.events.detail.programEyebrow")}
        title={t("public.events.detail.scheduleTitle")}
        description={t("public.events.detail.scheduleDescription")}
      />

      {(showRoomTabs || showDayTabs) && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-bone-100/70 p-3 ring-1 ring-bone-300/60 sm:p-4">
          {showDayTabs && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-100 sm:min-w-[72px]">
                <CalendarDays aria-hidden className="h-3.5 w-3.5 text-ember-500" />
                {t("public.events.detail.dayTabs.label")}
              </span>
              <div
                role="tablist"
                aria-label={t("public.events.detail.dayTabs.aria")}
                className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={effectiveDateKey === null}
                  onClick={() => setSelectedDateKey(null)}
                  className={`${filterChipBase} shrink-0 ${
                    effectiveDateKey === null ? filterChipActive : filterChipInactive
                  }`}
                >
                  {t("public.events.detail.dayTabs.all")}
                </button>
                {allDays.map((day, idx) => {
                  const active = effectiveDateKey === day.dateKey;
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedDateKey(day.dateKey)}
                      className={`${filterChipBase} shrink-0 ${
                        active ? filterChipActive : filterChipInactive
                      }`}
                    >
                      <span className="font-semibold">
                        {t("public.events.detail.scheduleDay.label")} {idx + 1}
                      </span>
                      <span
                        aria-hidden
                        className={
                          active ? "text-white/70" : "text-ink-100/60"
                        }
                      >
                        ·
                      </span>
                      <span className={active ? "" : "text-ink-200"}>
                        {day.dateLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showRoomTabs && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-100 sm:min-w-[72px]">
                <MapPin aria-hidden className="h-3.5 w-3.5 text-ember-500" />
                {t("public.events.detail.roomTabs.label")}
              </span>
              <div
                role="tablist"
                aria-label={t("public.events.detail.roomTabs.aria")}
                className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedRoomId === null}
                  onClick={() => setSelectedRoomId(null)}
                  className={`${filterChipBase} shrink-0 ${
                    selectedRoomId === null ? filterChipActive : filterChipInactive
                  }`}
                >
                  {t("public.events.detail.roomTabs.all")}
                </button>
                {sortedRooms.map((room) => {
                  const active = selectedRoomId === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`${filterChipBase} shrink-0 ${
                        active ? filterChipActive : filterChipInactive
                      }`}
                    >
                      {room.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasActiveFilter && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-ink-100 transition hover:text-ember-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-300"
              >
                {t("public.events.detail.dayTabs.reset")}
              </button>
            </div>
          )}
        </div>
      )}

      {!hasSchedule ? (
        <div className="mt-6 rounded-xl bg-bone-100/80 p-6 text-sm text-ink-100">
          {hasActiveFilter
            ? selectedRoomId && effectiveDateKey
              ? t("public.events.detail.dayTabs.emptyForFilters")
              : effectiveDateKey
                ? t("public.events.detail.dayTabs.emptyForDay")
                : t("public.events.detail.roomTabs.emptyForRoom")
            : t("public.events.detail.scheduleEmpty")}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groupedSchedule.map((group) => {
            const slots = groupByOverlap(group.items);
            const dayIdx = dayIndexByKey.get(group.dateKey);
            return (
              <div key={group.dateKey} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-ember-50 px-3.5 py-1.5 ring-1 ring-ember-100">
                    <CalendarDays
                      aria-hidden
                      className="h-3.5 w-3.5 text-ember-500"
                    />
                    <span className="text-xs font-semibold text-ember-600">
                      {showDayTabs && typeof dayIdx === "number"
                        ? `${t("public.events.detail.scheduleDay.label")} ${dayIdx + 1} — ${group.dateLabel}`
                        : group.dateLabel}
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-bone-300/70" />
                </div>

                <div className="flex flex-col gap-4">
                  {slots.map((slot) => {
                    const firstItem = slot.items[0];
                    if (!firstItem) return null;
                    if (slot.items.length === 1) {
                      return renderItem(firstItem, {
                        withTrackPill: false,
                      });
                    }
                    const range = formatTimeRange(
                      {
                        ...firstItem,
                        startTime: new Date(slot.startMs).toISOString(),
                        endTime: new Date(slot.endMs).toISOString(),
                      },
                      eventTimezone,
                      locale
                    );
                    const slotKey = slot.items.map((i) => i.id).join("|");
                    const colsClass =
                      slot.items.length >= 3
                        ? "lg:grid-cols-3"
                        : "lg:grid-cols-2";
                    return (
                      <section
                        key={slotKey}
                        aria-label={t(
                          "public.events.detail.parallel.aria",
                          { range }
                        )}
                        className="rounded-xl bg-bone-100/60 p-3 sm:p-4 ring-1 ring-bone-300/60"
                      >
                        <header className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-200 ring-1 ring-bone-300/70">
                            {range}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-ember-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ember-600">
                            {t("public.events.detail.parallel.badge")}
                          </span>
                        </header>
                        <div
                          className={`grid gap-3 grid-cols-1 md:grid-cols-2 ${colsClass}`}
                        >
                          {slot.items.map((item) => (
                            <article key={item.id} className="h-full">
                              {renderItem(item, { withTrackPill: true })}
                            </article>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
}

function SpeakersCard({ speakers }: { speakers: EventSpeaker[] }): ReactNode {
  const t = useT();
  if (!speakers || speakers.length === 0) return null;

  return (
    <Surface variant="solid" radius="4xl" padding="lg">
      <SectionHeading
        eyebrow={t("public.events.detail.speakersEyebrow")}
        title={t("public.events.detail.speakersTitle")}
        description={t("public.events.detail.speakersDescription")}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {speakers.map((speaker) => (
          <SpeakerCard key={speaker.id} speaker={speaker} />
        ))}
      </div>
    </Surface>
  );
}

function SpeakerCard({ speaker }: { speaker: EventSpeaker }): ReactNode {
  const t = useT();
  const bio = speaker.bio ? normalizeSpeakerBio(speaker.bio) : null;
  const hasMeta = Boolean(speaker.role || speaker.company);

  return (
    <Surface
      variant="muted"
      radius="4xl"
      padding="md"
      className={[
        "group h-full",
        "border border-bone-300/60",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:bg-white",
        "hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
      ].join(" ")}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-4">
          <SpeakerAvatar speaker={speaker} />
          <div className="min-w-0 flex flex-col">
            <h3 className="text-base font-semibold leading-snug text-ink-400 line-clamp-2">
              {getSpeakerDisplayName(speaker)}
            </h3>
            {hasMeta ? (
              <p className="mt-1 text-sm font-medium text-ember-600">
                {speaker.role}
                {speaker.company ? ` · ${speaker.company}` : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-ink-100">
                {t("public.profile.eventsPage.roles.speaker")}
              </p>
            )}
          </div>
        </div>

        {bio ? (
          <details className="group/details">
            <summary className="cursor-pointer list-none">
              <p className="text-sm leading-6 text-ink-100 whitespace-pre-line line-clamp-4 group-open/details:line-clamp-none">
                {bio}
              </p>
              <span className="mt-3 inline-flex items-center text-sm font-semibold text-ember-600">
                <span className="group-open/details:hidden">
                  {t("public.events.details")}
                </span>
                <span className="hidden group-open/details:inline">
                  {t("public.events.detail.collapse")}
                </span>
              </span>
            </summary>
          </details>
        ) : null}

        {speaker.socials && speaker.socials.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {speaker.socials.map((social, index) => {
              const meta: {
                label?: string;
                labelKey?: string;
                Icon: ComponentType<SVGProps<SVGSVGElement>>;
              } = SOCIAL_META[social.platform] ?? {
                label: social.platform,
                Icon: Globe2,
              };
              const label = meta.labelKey ? t(meta.labelKey) : meta.label ?? social.platform;
              const Icon = meta.Icon;

              return (
                <Link
                  key={`${speaker.id}-${social.platform}-${index}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label}: ${getSpeakerDisplayName(speaker)}`}
                  className={[
                    "inline-flex items-center gap-2 rounded-full",
                    "border border-bone-300/60 bg-white px-3 py-2",
                    "text-xs font-semibold text-ink-200",
                    "transition-colors hover:border-ember-100 hover:bg-ember-50/60 hover:text-ember-600",
                  ].join(" ")}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  <span>{label}</span>
                  <ExternalLink
                    aria-hidden
                    className="h-4 w-4 text-ink-50"
                  />
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

function SpeakerAvatar({ speaker }: { speaker: EventSpeaker }): ReactNode {
  const avatarSrc = resolveAvatarUrl(speaker.avatarUrl);
  if (avatarSrc) {
    return (
      <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-bone-300 ring-1 ring-ink-400/5">
        <SafeImage
          src={avatarSrc}
          alt={getSpeakerDisplayName(speaker)}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
    );
  }

  const displayName = getSpeakerDisplayName(speaker);
  const initial = displayName.trim().slice(0, 1).toUpperCase();
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ember-50 text-lg font-semibold text-ember-600 ring-1 ring-ember-100/40">
      {initial}
    </div>
  );
}

function ResourcesFaqCard({
  resources,
  faqs,
}: {
  resources?: EventResource[];
  faqs?: EventFaq[];
}): ReactNode {
  const t = useT();
  const hasResources = Boolean(resources && resources.length > 0);
  const hasFaqs = Boolean(faqs && faqs.length > 0);
  if (!hasResources && !hasFaqs) return null;

  return (
    <Surface variant="solid" radius="4xl" padding="lg">
      <SectionHeading
        eyebrow={t("public.events.detail.usefulEyebrow")}
        title={t("public.events.detail.resourcesTitle")}
        description={t("public.events.detail.resourcesDescription")}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {hasResources && resources && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">
              {t("public.events.detail.materials")}
            </h3>
            <div className="flex flex-col gap-2">
              {resources.map((resource) => (
                <Link
                  key={resource.id}
                  href={resource.href}
                  target={
                    resource.href.startsWith("http") ? "_blank" : undefined
                  }
                  rel={
                    resource.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="flex items-center justify-between gap-4 rounded-xl border border-bone-300/60 bg-bone-100/70 px-4 py-3 text-sm text-ink-300 transition hover:bg-bone-100"
                >
                  <span className="font-medium">{resource.label}</span>
                  <ExternalLink
                    aria-hidden
                    className="h-4 w-4 text-ink-100"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        {hasFaqs && faqs && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-200">
              FAQ
            </h3>
            <div className="flex flex-col divide-y divide-bone-300/60 overflow-hidden rounded-xl border border-bone-300/60 bg-bone-100/70">
              {faqs.map((faq) => (
                <details key={faq.id} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink-400">
                    {faq.question}
                  </summary>
                  <div className="pt-2 text-sm leading-6 text-ink-100">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </Surface>
  );
}

function FinalCtaCard({
  title,
  ctaLinks,
  isRegistered,
}: {
  title: string;
  ctaLinks: CtaLink[];
  isRegistered?: boolean;
}): ReactNode {
  const t = useT();
  if (!ctaLinks || ctaLinks.length === 0) return null;

  return (
    <Surface variant="glass" radius="4xl" padding="lg">
      <div className="flex flex-col gap-4">
        <Pill
          tone={isRegistered ? "success" : "brand"}
          className="w-max px-4 py-2 text-[11px] tracking-[0.26em]"
        >
          {isRegistered
            ? t("public.events.detail.joinedPill")
            : t("public.events.detail.readyToJoin")}
        </Pill>
        <h2 className="text-2xl font-semibold text-ink-400 sm:text-3xl">
          {title}
        </h2>
        <p className="text-sm leading-6 text-ink-100">
          {isRegistered
            ? t("public.events.detail.joinedDescription")
            : t("public.events.detail.readyDescription")}
        </p>
        <div className="flex flex-wrap gap-3">
          {ctaLinks.map((cta) => (
            <Link
              key={`cta-final-${cta.href}`}
              href={cta.href}
              className={buttonStyles({
                variant: isRegistered ? "outline" : cta.variant,
                size: "lg",
              })}
            >
              {cta.label}
            </Link>
          ))}
        </div>
      </div>
    </Surface>
  );
}

function RelatedEventsCard({
  isLoading,
  items,
  currentEvent,
}: {
  isLoading: boolean;
  items: PublicEvent[];
  currentEvent: EventDetail;
}): ReactNode {
  const t = useT();
  if (!isLoading && (!items || items.length === 0)) return null;

  const organizerName = currentEvent.organization?.name;
  const title = organizerName
    ? t("public.events.detail.moreFromOrganizer", { organizer: organizerName })
    : t("public.events.detail.otherEvents");
  const description = organizerName
    ? t("public.events.detail.moreFromOrganizerDescription")
    : t("public.events.detail.otherEventsDescription");

  return (
    <Surface variant="solid" radius="4xl" padding="lg">
      <SectionHeading
        eyebrow={t("public.events.detail.moreEyebrow")}
        title={title}
        description={description}
      />

      <div className="mt-8">
        {isLoading && items.length === 0 ? (
          <div className="space-y-4">
            <div className="h-24 rounded-xl bg-bone-200" />
            <div className="h-24 rounded-xl bg-bone-200" />
            <div className="h-24 rounded-xl bg-bone-200" />
          </div>
        ) : (
          <div className="divide-y divide-bone-300/70 overflow-hidden rounded-xl border border-bone-300/60 bg-white">
            {items.map((item) => (
              <RelatedEventRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}

function RelatedEventRow({ item }: { item: PublicEvent }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const dateLabel = item.startDate
    ? formatDate(parseUtcIso(item.startDate), locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const eventHref = `/events/${item.slug ?? item.id}`;
  const organizerHref = item.organization?.id
    ? `/organizers/${item.organization.id}`
    : null;

  return (
    <div
      className={[
        "group flex items-center justify-between gap-6 px-6 py-5",
        "transition-colors hover:bg-bone-100/70",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <Link
          href={eventHref}
          className="block"
          aria-label={t("public.events.eventDetailsAria", {
            title: item.title,
          })}
        >
          <h3 className="text-base font-semibold leading-snug text-ink-400 line-clamp-2 group-hover:text-ember-600 transition-colors">
            {item.title}
          </h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-ember-600 font-semibold">{dateLabel}</span>
          <span className="text-bone-400">·</span>
          {item.organization?.name &&
            (organizerHref ? (
              <Link
                href={organizerHref}
                className="text-ink-100 transition hover:text-ember-500"
                onClick={(e) => e.stopPropagation()}
              >
                {item.organization.name}
              </Link>
            ) : (
              <span className="text-ink-100">{item.organization.name}</span>
            ))}
          {item.city ? (
            <>
              <span className="text-bone-400">·</span>
              <span className="text-ink-100">{item.city}</span>
            </>
          ) : null}
        </div>
      </div>

      <Link
        href={eventHref}
        className="hidden sm:flex items-center gap-3"
        aria-label={t("public.events.eventDetailsAria", {
          title: item.title,
        })}
      >
        <div className="relative h-16 w-28 overflow-hidden rounded-xl bg-bone-200 ring-1 ring-ink-400/5">
          <EventImage
            coverImage={item.coverImage}
            alt={item.title}
            sizes="112px"
            className="object-cover"
          >
            <div className="absolute inset-0 bg-linear-to-t from-black/18 via-black/0 to-transparent" />
          </EventImage>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ember-600 opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
          {t("public.events.details")}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}

function ErrorBanner({ hasError }: { hasError: boolean }): ReactNode {
  const t = useT();
  if (!hasError) return null;
  return (
    <div className="container pb-10 text-center text-sm text-[var(--danger)]">
      {t("public.events.detail.refreshError")}
    </div>
  );
}

function LoadingBanner({ isLoading }: { isLoading: boolean }): ReactNode {
  const t = useT();
  if (!isLoading) return null;
  return (
    <div className="container pb-10 text-center text-sm text-ink-100">
      {t("public.events.detail.refreshing")}
    </div>
  );
}
