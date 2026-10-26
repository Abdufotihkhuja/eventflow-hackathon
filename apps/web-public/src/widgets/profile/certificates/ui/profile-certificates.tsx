"use client";

import { useState } from "react";

import { useT } from "@eventflow/i18n/react";
import {
  ArrowDownToLine,
  Award,
  BadgeCheck,
  CalendarCheck,
  Clock,
  ExternalLink,
  Grid3X3,
  LayoutList,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import {
  certificatesService,
  CERTIFICATE_PDF_EXTENSION,
} from "@shared/api/certificatesService";
import { formatUtcToLocalDate } from "@shared/lib/date";
import {
  useCertificatesQuery,
  type Certificate,
  type EventCertificate,
} from "@shared/lib/hooks";
import { cn } from "@shared/lib/utils";
import { Button, Input } from "@shared/ui";
import {
  ProfileEmptyState,
  ProfileErrorState,
  ProfileLoadingState,
  ProfileStatTile,
} from "@widgets/profile/layout";
import { ProfilePageHeader } from "@widgets/profile/page-header";

const iconMap = {
  shield: ShieldCheck,
  sparkles: Sparkles,
  bookmark: BadgeCheck,
} as const;

type ViewMode = "grid" | "list";

function formatEventDate(isoDate: string): string {
  return formatUtcToLocalDate(isoDate, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openInNewTab(url: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.open(url, "_blank", "noopener") !== null;
}

// eslint-disable-next-line complexity -- UI компонент с состояниями loading/error/empty/data
export function ProfileCertificatesSection(): React.ReactNode {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<
    string | null
  >(null);
  const [openingCertificateId, setOpeningCertificateId] = useState<
    string | null
  >(null);

  const {
    data: certificatesData,
    isLoading: isLoadingCertificates,
    isError: isErrorCertificates,
  } = useCertificatesQuery({
    params: searchQuery ? { search: searchQuery } : undefined,
  });

  const stats = certificatesData?.stats ?? {
    totalCertificates: 0,
    verifiedCertificates: 0,
    totalTrainingHours: 0,
  };
  const certificates = certificatesData?.certificates ?? [];
  const eventCertificates = certificatesData?.eventCertificates ?? [];

  const openLink = (url: string): void => {
    if (!openInNewTab(url)) {
      toast.error(
        t("public.profile.certificates.toasts.openLinkError")
      );
    }
  };

  const downloadUserCertificate = (downloadUrl?: string): void => {
    if (!downloadUrl) {
      toast.error(t("public.profile.certificates.toasts.fileUnavailable"));
      return;
    }

    if (!openInNewTab(downloadUrl)) {
      toast.error(
        t("public.profile.certificates.toasts.openPdfError")
      );
    }
  };

  const downloadEventCertificate = async (
    certificateId: string,
    eventTitle: string
  ): Promise<void> => {
    setDownloadingCertificateId(certificateId);
    try {
      const blob = await certificatesService.downloadEventCertificate(
        certificateId
      );
      const safeName =
        eventTitle
          .replace(/\s+/g, "-")
          .replace(/[^\wа-яё-]/gi, "")
          .slice(0, 40) || "certificate";
      downloadBlobAsFile(
        blob,
        `certificate-${safeName}${CERTIFICATE_PDF_EXTENSION}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("public.profile.certificates.toasts.downloadError")
      );
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  const openEventCertificatePdf = async (
    certificateId: string,
    _eventTitle: string
  ): Promise<void> => {
    setOpeningCertificateId(certificateId);
    try {
      const blob = await certificatesService.downloadEventCertificate(
        certificateId
      );
      const url = URL.createObjectURL(blob);
      const opened = openInNewTab(url);

      if (!opened) {
        URL.revokeObjectURL(url);
        toast.error(
          t("public.profile.certificates.toasts.openPdfError")
        );
        return;
      }

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("public.profile.certificates.toasts.openCertificateError")
      );
    } finally {
      setOpeningCertificateId(null);
    }
  };

  const headerActions = (
    <>
      <div className="relative w-full min-w-0 md:w-60">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-50"
          aria-hidden
        />
        <Input
          type="search"
          placeholder={t("public.profile.certificates.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
          aria-label={t("public.profile.certificates.searchAria")}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-50 transition-colors hover:bg-bone-200 hover:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
            aria-label={t("public.profile.certificates.clearSearch")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <div
        className="hidden shrink-0 items-center gap-0.5 rounded-xl border border-bone-300/70 bg-bone-50 p-1 md:flex"
        role="group"
        aria-label={t("public.profile.certificates.viewMode")}
      >
        <button
          type="button"
          onClick={() => setViewMode("grid")}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            viewMode === "grid"
              ? "bg-ember-50 text-ember-600"
              : "text-ink-100 hover:bg-bone-200/60 hover:text-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
          )}
          aria-label={t("public.profile.eventsCatalog.gridView")}
          aria-pressed={viewMode === "grid"}
        >
          <Grid3X3 className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            viewMode === "list"
              ? "bg-ember-50 text-ember-600"
              : "text-ink-100 hover:bg-bone-200/60 hover:text-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400"
          )}
          aria-label={t("public.profile.eventsCatalog.listView")}
          aria-pressed={viewMode === "list"}
        >
          <LayoutList className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </>
  );

  const statsItems = [
    {
      labelKey: "public.profile.certificates.stats.events",
      value: eventCertificates.length,
      icon: CalendarCheck,
      tone: "ember" as const,
    },
    {
      labelKey: "public.profile.certificates.stats.total",
      value: stats.totalCertificates,
      icon: Award,
      tone: "ember" as const,
    },
    {
      labelKey: "public.profile.certificates.stats.verified",
      value: stats.verifiedCertificates,
      icon: BadgeCheck,
      tone: "forest" as const,
    },
    {
      labelKey: "public.profile.certificates.stats.hours",
      value: stats.totalTrainingHours,
      icon: Clock,
      tone: "forest" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <ProfilePageHeader
        icon={Award}
        eyebrow={t("public.profile.certificates.badge")}
        title={t("public.profile.certificates.title")}
        description={t("public.profile.certificates.description")}
        actions={headerActions}
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statsItems.map((item) => (
          <ProfileStatTile
            key={item.labelKey}
            icon={item.icon}
            value={
              isLoadingCertificates ? (
                <Loader2
                  className="h-5 w-5 animate-spin text-ink-50"
                  aria-hidden
                />
              ) : (
                item.value
              )
            }
            label={t(item.labelKey)}
            tone={item.tone}
          />
        ))}
      </div>

      {/* Сертификаты за мероприятия */}
      <section className="space-y-5">
        <h2 className="section-heading-accent text-base font-semibold text-ink-400">
          {t("public.profile.certificates.eventCertificates")}
        </h2>
        {isLoadingCertificates ? (
          <ProfileLoadingState
            title={t("public.profile.certificates.loading")}
          />
        ) : eventCertificates.length > 0 ? (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-4"
            )}
          >
            {eventCertificates.map((cert) =>
              viewMode === "grid" ? (
                <EventCertificateCard
                  key={cert.id}
                  certificate={cert}
                  isDownloading={downloadingCertificateId === cert.id}
                  isOpening={openingCertificateId === cert.id}
                  onDownload={() => {
                    void downloadEventCertificate(cert.id, cert.eventName);
                  }}
                  onOpenPdf={() => {
                    void openEventCertificatePdf(cert.id, cert.eventName);
                  }}
                />
              ) : (
                <EventCertificateCardList
                  key={cert.id}
                  certificate={cert}
                  isDownloading={downloadingCertificateId === cert.id}
                  isOpening={openingCertificateId === cert.id}
                  onDownload={() => {
                    void downloadEventCertificate(cert.id, cert.eventName);
                  }}
                  onOpenPdf={() => {
                    void openEventCertificatePdf(cert.id, cert.eventName);
                  }}
                />
              )
            )}
          </div>
        ) : (
          <ProfileEmptyState
            icon={CalendarCheck}
            title={t("public.profile.certificates.noEventCertificatesTitle")}
            description={t(
              "public.profile.certificates.noEventCertificatesDescription"
            )}
          />
        )}
      </section>

      {/* Мои добавленные сертификаты */}
      <section className="space-y-5">
        <h2 className="section-heading-accent text-base font-semibold text-ink-400">
          {t("public.profile.certificates.manualCertificates")}
        </h2>

      {/* Loading state */}
      {isLoadingCertificates && (
        <ProfileLoadingState
          title={t("public.profile.certificates.loading")}
        />
      )}

      {/* Error state */}
      {isErrorCertificates && (
        <ProfileErrorState
          title={t("public.profile.certificates.loadErrorTitle")}
          description={t("public.profile.certificates.loadErrorDescription")}
        />
      )}

      {/* Certificates */}
      {!isLoadingCertificates && !isErrorCertificates && (
        <>
          {certificates.length > 0 ? (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid gap-6 md:grid-cols-2"
                  : "flex flex-col gap-4"
              )}
            >
              {certificates.map((certificate) =>
                viewMode === "grid" ? (
                  <CertificateCardGrid
                    key={certificate.id}
                    certificate={certificate}
                    onVerify={() =>
                      certificate.verificationUrl &&
                      openLink(certificate.verificationUrl)
                    }
                    onDownload={() =>
                      downloadUserCertificate(certificate.downloadUrl)
                    }
                  />
                ) : (
                  <CertificateCardList
                    key={certificate.id}
                    certificate={certificate}
                    onVerify={() =>
                      certificate.verificationUrl &&
                      openLink(certificate.verificationUrl)
                    }
                    onDownload={() =>
                      downloadUserCertificate(certificate.downloadUrl)
                    }
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              searchQuery={searchQuery}
              onClear={() => setSearchQuery("")}
            />
          )}
        </>
      )}
      </section>
    </div>
  );
}

interface EventCertificateCardProps {
  certificate: EventCertificate;
  isDownloading: boolean;
  isOpening: boolean;
  onDownload: () => void;
  onOpenPdf: () => void;
}

function EventCertificateCard({
  certificate,
  isDownloading,
  isOpening,
  onDownload,
  onOpenPdf,
}: EventCertificateCardProps): React.ReactNode {
  const t = useT();
  const verifyHref = `/certificates/verify?code=${encodeURIComponent(certificate.verificationCode)}`;
  const isBusy = isDownloading || isOpening;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-bone-300/60 bg-bone-50",
        "shadow-[0_1px_2px_rgba(14,14,13,0.04),0_4px_12px_rgba(14,14,13,0.04)] transition-shadow duration-200",
        "hover:border-bone-400 hover:shadow-[0_2px_6px_rgba(14,14,13,0.05),0_14px_32px_rgba(14,14,13,0.08)]",
        "focus-within:ring-2 focus-within:ring-ember-400/20 focus-within:ring-offset-2"
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ember-50 text-ember-500"
            aria-hidden
          >
            <FileText className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-semibold text-ink-400">
              {certificate.eventName}
            </h3>
            <p className="mt-1 text-sm text-ink-100">
              {t("public.profile.certificates.eventDate", {
                date: formatEventDate(certificate.eventDate),
              })}
            </p>
            <p className="mt-0.5 text-xs text-ink-50">
              {t("public.profile.certificates.issuedAt", {
                date: formatEventDate(certificate.generatedAt),
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="shadow-[var(--shadow-glow-warm)]"
            leftIcon={
              isOpening ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-4 w-4" aria-hidden />
              )
            }
            onClick={onOpenPdf}
            disabled={isBusy}
          >
            {isOpening
              ? t("public.profile.certificates.opening")
              : t("public.profile.certificates.openPdf")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2"
            leftIcon={
              isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ArrowDownToLine className="h-4 w-4" aria-hidden />
              )
            }
            onClick={onDownload}
            disabled={isBusy}
          >
            {isDownloading
              ? t("public.profile.certificates.downloading")
              : t("public.profile.certificates.download")}
          </Button>
          <a
            href={verifyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-bone-300 bg-bone-100 px-3 py-2 text-xs font-medium text-ink-100 transition hover:bg-bone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t("public.profile.certificates.verifyAuthenticity")}
          </a>
        </div>
      </div>
    </article>
  );
}

function EventCertificateCardList({
  certificate,
  isDownloading,
  isOpening,
  onDownload,
  onOpenPdf,
}: EventCertificateCardProps): React.ReactNode {
  const t = useT();
  const verifyHref = `/certificates/verify?code=${encodeURIComponent(certificate.verificationCode)}`;
  const isBusy = isDownloading || isOpening;

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-bone-300/60 bg-bone-50 p-5 md:flex-row md:items-center md:gap-6",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
        "focus-within:ring-2 focus-within:ring-ember-400/20 focus-within:ring-offset-2"
      )}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ember-50 text-ember-500 md:h-16 md:w-16"
        aria-hidden
      >
        <FileText className="h-7 w-7 md:h-8 md:w-8" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="line-clamp-2 text-lg font-semibold text-ink-400">
          {certificate.eventName}
        </h3>
        <p className="text-sm text-ink-100">
          {formatEventDate(certificate.eventDate)} ·{" "}
          {t("public.profile.certificates.issuedAt", {
            date: formatEventDate(certificate.generatedAt),
          })}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          className="shadow-[var(--shadow-glow-warm)]"
          leftIcon={
            isOpening ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileText className="h-4 w-4" aria-hidden />
            )
          }
          onClick={onOpenPdf}
          disabled={isBusy}
        >
          {isOpening ? "..." : t("public.profile.certificates.openPdf")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={
            isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowDownToLine className="h-4 w-4" aria-hidden />
            )
          }
          onClick={onDownload}
          disabled={isBusy}
        >
          {isDownloading ? "..." : t("public.profile.certificates.download")}
        </Button>
        <a
          href={verifyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-bone-300 bg-bone-100 px-3 py-2 text-xs font-medium text-ink-100 transition hover:bg-bone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {t("public.profile.certificates.verify")}
        </a>
      </div>
    </article>
  );
}

interface CertificateCardProps {
  certificate: Certificate;
  onVerify: () => void;
  onDownload: () => void;
}

function CertificateCardGrid({
  certificate,
  onVerify,
  onDownload,
}: CertificateCardProps): React.ReactNode {
  const t = useT();
  const Icon = iconMap[certificate.icon ?? "shield"];
  const accent =
    certificate.accent ?? "from-ember-400/90 via-ember-300/80 to-[var(--warning-soft)]/70";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-bone-300/60 bg-bone-50",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
        "focus-within:ring-2 focus-within:ring-ember-400/20 focus-within:ring-offset-2"
      )}
    >
      {/* Gradient background */}
      <div
        className={cn("absolute inset-0 bg-linear-to-br opacity-90", accent)}
      />

      {/* Content */}
      <div className="relative flex flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-bone-50/70">
              {certificate.issuer}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-bone-50">
              {certificate.title}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-bone-50/30 bg-bone-50/15 text-bone-50 backdrop-blur">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        </div>

        {certificate.description && (
          <p className="text-sm leading-relaxed text-bone-50/85">
            {certificate.description}
          </p>
        )}

        {/* Meta */}
        <div className="grid gap-3 text-sm text-bone-50/80 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-bone-50/60">
              {t("public.profile.certificates.issueDate")}
            </p>
            <p className="mt-0.5 font-medium">
                {formatEventDate(certificate.issueDate)}
              </p>
          </div>
          {certificate.hours && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-bone-50/60">
                {t("public.profile.certificates.trainingHours")}
              </p>
              <p className="mt-0.5 font-medium">{certificate.hours}</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-bone-50/60">
              Credential ID
            </p>
            <p className="mt-0.5 font-mono text-xs">
              {certificate.credentialId}
            </p>
          </div>
        </div>

        {/* Skills */}
        {certificate.skills && certificate.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {certificate.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex rounded-full border border-bone-50/30 bg-bone-50/15 px-3 py-1 text-xs font-medium text-bone-50 backdrop-blur"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t border-bone-50/20 pt-4">
          {certificate.verificationUrl && (
            <Button
              variant="glass"
              size="md"
              className="bg-bone-50/95 text-ink-400 hover:bg-bone-50 focus-visible:ring-2 focus-visible:ring-bone-50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              leftIcon={<ExternalLink className="h-4 w-4" aria-hidden />}
              onClick={onVerify}
            >
              {t("public.profile.certificates.verify")}
            </Button>
          )}
          {certificate.downloadUrl && (
            <Button
              variant="subtle"
              size="md"
              className="bg-bone-50/15 text-bone-50 hover:bg-bone-50/25 focus-visible:ring-2 focus-visible:ring-bone-50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              leftIcon={<ArrowDownToLine className="h-4 w-4" aria-hidden />}
              onClick={onDownload}
            >
              {t("public.profile.certificates.downloadPdf")}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function CertificateCardList({
  certificate,
  onVerify,
  onDownload,
}: CertificateCardProps): React.ReactNode {
  const t = useT();
  const Icon = iconMap[certificate.icon ?? "shield"];
  const accent =
    certificate.accent ?? "from-ember-400/90 via-ember-300/80 to-[var(--warning-soft)]/70";

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-bone-300/60 bg-bone-50 p-5 md:flex-row md:items-center md:gap-6",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
        "focus-within:ring-2 focus-within:ring-ember-400/20 focus-within:ring-offset-2"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-bone-50",
          accent
        )}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-50">
            {certificate.issuer}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-ink-400">
            {certificate.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-ink-100">
          <span>{formatEventDate(certificate.issueDate)}</span>
          {certificate.hours && (
            <span>
              {t("public.profile.certificates.hours", {
                count: certificate.hours,
              })}
            </span>
          )}
          <span className="font-mono text-xs">{certificate.credentialId}</span>
        </div>

        {certificate.skills && certificate.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {certificate.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="inline-flex rounded-full bg-bone-200 px-2.5 py-1 text-xs font-medium text-ink-100"
              >
                {skill}
              </span>
            ))}
            {certificate.skills.length > 3 && (
              <span className="inline-flex rounded-full bg-bone-200 px-2.5 py-1 text-xs font-medium text-ink-50">
                +{certificate.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-2">
        {certificate.verificationUrl && (
          <Button
            variant="outline"
            size="sm"
            className="focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2"
            onClick={onVerify}
          >
            {t("public.profile.certificates.verify")}
          </Button>
        )}
        {certificate.downloadUrl && (
          <Button
            variant="subtle"
            size="sm"
            className="focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2"
            leftIcon={<ArrowDownToLine className="h-4 w-4" aria-hidden />}
            onClick={onDownload}
          >
            PDF
          </Button>
        )}
      </div>
    </article>
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
    <ProfileEmptyState
      icon={Search}
      title={
        searchQuery
          ? t("public.profile.certificates.emptySearchTitle")
          : t("public.profile.certificates.emptyTitle")
      }
      description={
        searchQuery
          ? t("public.profile.certificates.emptySearchDescription", {
              query: searchQuery,
            })
          : t("public.profile.certificates.emptyDescription")
      }
      action={
        searchQuery ? (
          <Button variant="secondary" size="md" onClick={onClear}>
            {t("public.profile.articles.resetSearch")}
          </Button>
        ) : undefined
      }
    />
  );
}
