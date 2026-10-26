"use client";

/**
 * Premium e-ticket card — dark glass pass design.
 *
 * Принимает full {@link EventTicketViewModel} с бэкенда и рендерит
 * responsive premium-карточку: organization logo top-left, info-блок,
 * QR-секция справа (на mobile — снизу), action-кнопки и footer
 * "Organized through Eventflow".
 *
 * Состояния билета: active / checked_in / used. Endpoint возвращает
 * ticket только для APPROVED регистраций, поэтому состояния
 * cancelled/rejected/pending здесь не рендерятся (они идут как 404).
 */

import * as React from "react";

import Image from "next/image";

import { getCityLabel, type Translator } from "@eventflow/i18n";
import { useT } from "@eventflow/i18n/react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Loader2,
  MapPin,
  Monitor,
  ScanLine,
  Share2,
  ShieldCheck,
  Ticket as TicketIcon,
  User as UserIcon,
} from "lucide-react";
import QRCodeSVG from "react-qr-code";
import { toast } from "sonner";

import { registrationService } from "@shared/api/registrationService";
import {
  formatUtcToLocalDate,
  formatUtcToLocalTime,
  parseUtcIso,
} from "@shared/lib/date";
import { resolveMediaUrl, cn } from "@shared/lib/utils";
import { Button } from "@shared/ui";

import type { EventTicketViewModel } from "@shared/api/ticketsService";

// ============================================================================
// Public components
// ============================================================================

export interface PremiumTicketCardProps {
  data: EventTicketViewModel;
  className?: string;
}

export function PremiumTicketCard({
  data,
  className,
}: PremiumTicketCardProps): React.ReactNode {
  const t = useT();
  const { organization, event, attendee, ticket } = data;

  const accent = sanitizeHexColor(organization.accentColor) ?? "var(--ticket-accent)";
  // Brand color overrides the dark gradient origin only; secondary stop is
  // derived to keep depth on the card. If brandColor is not a valid #RRGGBB
  // (or absent), we fall back to the default premium dark theme so the card
  // never looks "broken" for unbranded organizations.
  const brandBg = sanitizeHexColor(organization.brandColor);
  const themeStyle: React.CSSProperties = {
    ["--ticket-accent" as string]: accent,
    ...(brandBg
      ? {
          ["--ticket-bg-from" as string]: brandBg,
          ["--ticket-bg-to" as string]: lightenHex(brandBg, 0.18),
        }
      : {}),
  };

  const onCopyTicketNumber = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ticket.number);
      toast.success(t("ticket.actions.copySuccess"));
    } catch {
      toast.error(t("ticket.actions.copyError"));
    }
  }, [ticket.number, t]);

  return (
    <article
      data-ticket-theme="premium"
      data-ticket-status={ticket.status}
      aria-label={t("ticket.aria.cardLabel", {
        event: event.title,
        number: ticket.number,
      })}
      className={cn(
        "ticket-glow ticket-transition-shadow duration-200",
        "relative isolate overflow-hidden rounded-xl",
        "bg-[linear-gradient(135deg,var(--ticket-bg-from)_0%,var(--ticket-bg-to)_100%)]",
        "text-[color:var(--ticket-fg)]",
        "ring-1 ring-[color:var(--ticket-border)]",
        "px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10",
        "min-h-[420px] lg:min-h-[460px]",
        className
      )}
      style={themeStyle}
    >
      {/* Decorative glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl no-print"
        style={{ background: "var(--ticket-accent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full opacity-15 blur-3xl no-print"
        style={{ background: "var(--ticket-violet)" }}
      />

      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
        <div className="min-w-0">
          <PremiumTicketHeader organization={organization} t={t} />

          <h1 className="mt-7 text-[clamp(1.75rem,3vw+1rem,2.75rem)] font-bold leading-tight tracking-tight">
            {event.title}
          </h1>
          <div
            aria-hidden
            className="mt-3 h-[3px] w-12 rounded-full"
            style={{ background: "var(--ticket-accent)" }}
          />

          <SectionLabel className="mt-7">
            {t("ticket.label.eventInfo")}
          </SectionLabel>

          <dl className="mt-3 space-y-2.5">
            <InfoRow
              icon={<Calendar className="h-4 w-4" aria-hidden />}
              label={t("ticket.label.date")}
              value={formatUtcToLocalDate(event.startDate, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" aria-hidden />}
              label={t("ticket.label.time")}
              value={formatTimeRange(event.startDate, event.endDate)}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" aria-hidden />}
              label={t("ticket.label.location")}
              value={
                [event.venue, event.city ? getCityLabel(t)(event.city) : null]
                  .filter(Boolean)
                  .join(", ") || t("ticket.label.locationOnline")
              }
            />
            <InfoRow
              icon={<Monitor className="h-4 w-4" aria-hidden />}
              label={t("ticket.label.format")}
              value={t(`ticket.format.${event.format.toLowerCase()}` as never, {
                defaultValue: event.format,
              } as never) as string}
            />
            <InfoRow
              icon={<UserIcon className="h-4 w-4" aria-hidden />}
              label={t("ticket.label.attendee")}
              value={attendee.fullName}
            />
            <InfoRow
              icon={<TicketIcon className="h-4 w-4" aria-hidden />}
              label={t("ticket.label.number")}
              value={
                <button
                  type="button"
                  onClick={() => void onCopyTicketNumber()}
                  className={cn(
                    "group inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-wider",
                    "rounded-md px-1.5 py-0.5 -mx-1.5",
                    "transition hover:bg-white/5 focus-visible:bg-white/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ticket-accent)]"
                  )}
                  aria-label={t("ticket.actions.copyAria", {
                    number: ticket.number,
                  })}
                >
                  <span>{ticket.number}</span>
                  <Copy
                    className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-70 group-focus-visible:opacity-70"
                    aria-hidden
                  />
                </button>
              }
            />
          </dl>
        </div>

        <PremiumTicketQrSection data={data} t={t} />
      </div>

      <PremiumTicketActions data={data} className="mt-8" t={t} />

      <PremiumTicketFooter ticket={ticket} t={t} className="mt-8" />
    </article>
  );
}

// ============================================================================
// Skeleton (loading state)
// ============================================================================

export function PremiumTicketSkeleton(): React.ReactNode {
  return (
    <div
      data-ticket-theme="premium"
      role="status"
      aria-busy="true"
      aria-label="Loading ticket"
      className={cn(
        "ticket-glow",
        "relative isolate overflow-hidden rounded-xl",
        "bg-[linear-gradient(135deg,var(--ticket-bg-from)_0%,var(--ticket-bg-to)_100%)]",
        "ring-1 ring-[color:var(--ticket-border)]",
        "px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10 min-h-[420px] lg:min-h-[460px]"
      )}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-5">
          <SkeletonBlock className="h-12 w-48" />
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-3 w-12" />
          <div className="space-y-3 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="flex gap-3" key={i}>
                <SkeletonBlock className="h-6 w-6 rounded-full" />
                <SkeletonBlock className="h-6 w-24" />
                <SkeletonBlock className="h-6 flex-1 max-w-xs" />
              </div>
            ))}
          </div>
        </div>
        <SkeletonBlock className="h-56 w-56 rounded-xl lg:h-60 lg:w-60" />
      </div>
    </div>
  );
}

// ============================================================================
// Empty / not-issued state
// ============================================================================

export interface PremiumTicketEmptyProps {
  reason: "not_registered" | "pending" | "cancelled" | "unknown";
  message?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export function PremiumTicketEmpty({
  reason,
  message,
  onPrimaryAction,
  primaryActionLabel,
}: PremiumTicketEmptyProps): React.ReactNode {
  const t = useT();
  const titleKey =
    reason === "pending"
      ? "ticket.empty.pendingTitle"
      : reason === "cancelled"
        ? "ticket.empty.cancelledTitle"
        : reason === "not_registered"
          ? "ticket.empty.notRegisteredTitle"
          : "ticket.empty.unknownTitle";
  const bodyKey =
    reason === "pending"
      ? "ticket.empty.pendingBody"
      : reason === "cancelled"
        ? "ticket.empty.cancelledBody"
        : reason === "not_registered"
          ? "ticket.empty.notRegisteredBody"
          : "ticket.empty.unknownBody";

  return (
    <div
      data-ticket-theme="premium"
      className={cn(
        "ticket-glow",
        "relative overflow-hidden rounded-xl text-center",
        "bg-[linear-gradient(135deg,var(--ticket-bg-from)_0%,var(--ticket-bg-to)_100%)]",
        "text-[color:var(--ticket-fg)] ring-1 ring-[color:var(--ticket-border)]",
        "px-8 py-12"
      )}
    >
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl"
        style={{ background: "rgba(0, 229, 255, 0.12)" }}
      >
        <TicketIcon
          className="h-7 w-7"
          aria-hidden
          style={{ color: "var(--ticket-accent)" }}
        />
      </div>
      <h2 className="mt-5 text-xl font-semibold">{t(titleKey)}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--ticket-fg-muted)]">
        {message ?? t(bodyKey)}
      </p>
      {onPrimaryAction ? (
        <Button onClick={onPrimaryAction} className="mt-6" variant="primary">
          {primaryActionLabel ?? t("ticket.empty.primaryActionDefault")}
        </Button>
      ) : null}
    </div>
  );
}

// ============================================================================
// Internal sub-components
// ============================================================================

interface TFn {
  (key: string, vars?: Record<string, string | number>): string;
}

function PremiumTicketHeader({
  organization,
  t,
}: {
  organization: EventTicketViewModel["organization"];
  t: TFn;
}): React.ReactNode {
  const logoSrc = organization.logoUrl
    ? resolveMediaUrl(organization.logoUrl)
    : undefined;
  const initials = computeInitials(organization.name);

  return (
    <header className="flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-[color:var(--ticket-border)]">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt={organization.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span
            className="text-base font-bold"
            style={{ color: "var(--ticket-accent)" }}
          >
            {initials}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold leading-tight">
          {organization.name}
        </p>
        <p
          className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--ticket-accent)" }}
        >
          {t("ticket.label.eTicket")}
        </p>
      </div>
    </header>
  );
}

function PremiumTicketQrSection({
  data,
  t,
}: {
  data: EventTicketViewModel;
  t: TFn;
}): React.ReactNode {
  const { ticket } = data;
  const isUsed = ticket.status === "used";
  const showQr = !!ticket.qrPayload;

  return (
    <aside className="mx-auto flex w-full max-w-xs flex-col items-center lg:w-[260px]">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--ticket-accent)" }}
      >
        {t("ticket.label.qrTitle")}
      </p>
      <div
        className={cn(
          "ticket-qr-glow relative aspect-square w-full rounded-xl bg-white p-4",
          "transition-opacity",
          (!showQr || isUsed) && "opacity-60"
        )}
      >
        {showQr && ticket.qrPayload ? (
          <QRCodeSVG
            value={ticket.qrCheckInUrl ?? ticket.qrPayload}
            level="H"
            bgColor="#ffffff"
            fgColor="#0b1020"
            className="h-full w-full"
            title={t("ticket.aria.qrTitle", { number: ticket.number })}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-ink-50" aria-hidden />
            <p className="text-xs font-medium text-ink-100">
              {t("ticket.qr.usedPlaceholder")}
            </p>
          </div>
        )}
      </div>
      <div
        className={cn(
          "mt-4 inline-flex items-center gap-2 text-sm",
          isUsed
            ? "text-[color:var(--ticket-fg-muted)]"
            : "text-[color:var(--ticket-fg)]"
        )}
      >
        <ScanLine className="h-4 w-4" aria-hidden />
        <span>
          {ticket.status === "checked_in"
            ? t("ticket.qr.checkedIn")
            : ticket.status === "used"
              ? t("ticket.qr.used")
              : t("ticket.qr.instruction")}
        </span>
      </div>
    </aside>
  );
}

function PremiumTicketActions({
  data,
  t,
  className,
}: {
  data: EventTicketViewModel;
  t: TFn;
  className?: string;
}): React.ReactNode {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async (): Promise<void> => {
    setDownloading(true);
    try {
      const blob = await registrationService.downloadTicketAsBlob(
        data.ticket.id,
        "branded"
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eventflow-ticket-${data.ticket.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("ticket.actions.downloadError")
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    const shareData = {
      title: data.event.title,
      text: t("ticket.actions.shareText", { event: data.event.title }),
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/events/${data.event.slug}`
          : "",
    };
    try {
      if (
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" ||
          navigator.canShare(shareData))
      ) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success(t("ticket.actions.linkCopied"));
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error(t("ticket.actions.shareError"));
      }
    }
  };

  const handleAddToCalendar = (): void => {
    const start = parseUtcIso(data.event.startDate);
    const end = data.event.endDate
      ? parseUtcIso(data.event.endDate)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date): string =>
      `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
    const cityLabelForCalendar = data.event.city
      ? getCityLabel(t as unknown as Translator)(data.event.city)
      : null;
    const location =
      [data.event.venue, cityLabelForCalendar].filter(Boolean).join(", ") ||
      "";
    const url =
      "https://www.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(data.event.title)}` +
      `&dates=${fmt(start)}/${fmt(end)}` +
      `&location=${encodeURIComponent(location)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "no-print flex flex-wrap gap-2 sm:gap-3",
        className
      )}
    >
      <Button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        leftIcon={
          downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )
        }
      >
        {downloading
          ? t("ticket.actions.downloading")
          : t("ticket.actions.download")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleAddToCalendar}
        leftIcon={<Calendar className="h-4 w-4" aria-hidden />}
      >
        {t("ticket.actions.addToCalendar")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleShare()}
        leftIcon={<Share2 className="h-4 w-4" aria-hidden />}
      >
        {t("ticket.actions.share")}
      </Button>
    </div>
  );
}

function PremiumTicketFooter({
  ticket,
  t,
  className,
}: {
  ticket: EventTicketViewModel["ticket"];
  t: TFn;
  className?: string;
}): React.ReactNode {
  return (
    <footer
      className={cn(
        "flex flex-col gap-3 border-t border-[color:var(--ticket-divider)] pt-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="inline-flex items-center gap-2 text-xs text-[color:var(--ticket-fg-muted)]">
        <ShieldCheck
          className="h-4 w-4"
          aria-hidden
          style={{ color: "var(--ticket-accent)" }}
        />
        {ticket.securityLabel || t("ticket.security.line")}
      </p>
      <p className="text-xs text-[color:var(--ticket-fg-muted)]">
        {t("ticket.poweredBy")}{" "}
        <span
          className="font-semibold"
          style={{ color: "var(--ticket-accent)" }}
        >
          Eventflow
        </span>
      </p>
    </footer>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: "rgba(0, 229, 255, 0.12)", color: "var(--ticket-accent)" }}
      >
        {icon}
      </span>
      <dt
        className="w-[88px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ticket-fg-muted)] sm:w-[110px]"
      >
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug">
        {value}
      </dd>
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactNode {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]",
        className
      )}
      style={{ color: "var(--ticket-violet)" }}
    >
      {children}
    </p>
  );
}

function SkeletonBlock({ className }: { className?: string }): React.ReactNode {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/8",
        className
      )}
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimeRange(startIso: string, endIso?: string | null): string {
  const start = formatUtcToLocalTime(startIso, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (!endIso) return start;
  const end = formatUtcToLocalTime(endIso, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return start === end ? start : `${start} – ${end}`;
}

function computeInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "•"
  );
}

function sanitizeHexColor(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : undefined;
}

/**
 * Lightens a `#RRGGBB` color toward white by `amount` (0–1). Used to derive
 * the gradient's second stop so a single brandColor still feels like a card
 * with depth rather than a flat block.
 */
function lightenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c: number): number =>
    Math.min(255, Math.round(c + (255 - c) * amount));
  return `#${[blend(r), blend(g), blend(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}
