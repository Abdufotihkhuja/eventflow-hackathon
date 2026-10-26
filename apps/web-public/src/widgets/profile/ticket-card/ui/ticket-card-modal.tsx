"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";

import { getCityLabel } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import {
  AlertCircle,
  CalendarPlus,
  Download,
  Loader2,
  QrCode,
  Share2,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { registrationService } from "@shared/api/registrationService";
import {
  formatUtcToLocalDate,
  formatUtcToLocalTime,
  parseUtcIso,
} from "@shared/lib/date";
import { useRegistrationQrQuery } from "@shared/lib/hooks";

import type { UserEventItem } from "@shared/api/userEventsService";

import "./ticket-card-modal.css";

// ============================================================================
// Types & i18n helpers
// ============================================================================

interface TicketCardModalProps {
  eventItem: UserEventItem;
  onClose: () => void;
}

type Lang = "en" | "ru" | "uz";

const pickLang = (locale: string): Lang =>
  locale === "ru" ? "ru" : locale === "uz" ? "uz" : "en";

const tl = (lang: Lang, bag: { en: string; ru: string; uz: string }): string =>
  bag[lang] ?? bag.en;

const L = {
  brand: { en: "EVENTFLOW · TICKET", ru: "EVENTFLOW · БИЛЕТ", uz: "EVENTFLOW · BILET" },
  done: { en: "Done", ru: "Готово", uz: "Tayyor" },
  ready: {
    en: "Your ticket is ready",
    ru: "Ваш билет готов",
    uz: "Biletingiz tayyor",
  },
  pending: {
    en: "Pending approval",
    ru: "Ожидает подтверждения",
    uz: "Tasdiqlash kutilmoqda",
  },
  rejected: {
    en: "Registration declined",
    ru: "Регистрация отклонена",
    uz: "Ro‘yxatdan o‘tish rad etildi",
  },
  scan: {
    en: "Scan at the door",
    ru: "Покажите на входе",
    uz: "Eshikda ko‘rsating",
  },
  qrLater: {
    en: "QR will appear closer to the date",
    ru: "QR появится ближе к дате",
    uz: "QR tadbir kuni paydo bo‘ladi",
  },
  qrError: {
    en: "Couldn’t load the QR",
    ru: "Не удалось загрузить QR",
    uz: "QR-ni yuklab bo‘lmadi",
  },
  retry: { en: "Retry", ru: "Повторить", uz: "Qayta urinish" },
  pendingNote: {
    en: "QR becomes available after the organizer approves your request.",
    ru: "QR станет доступен после одобрения организатором.",
    uz: "Tashkilotchi tasdiqlagandan so‘ng QR ochiladi.",
  },
  rejectedNote: {
    en: "Unfortunately, the organizer declined your registration.",
    ru: "К сожалению, организатор отклонил вашу регистрацию.",
    uz: "Afsuski, tashkilotchi ro‘yxatdan o‘tishingizni rad etdi.",
  },
  name: { en: "Name", ru: "Имя", uz: "Ism" },
  doors: { en: "Doors", ru: "Вход", uz: "Kirish" },
  location: { en: "Location", ru: "Место", uz: "Joy" },
  type: { en: "Type", ru: "Тип", uz: "Turi" },
  organizer: { en: "Organizer", ru: "Организатор", uz: "Tashkilotchi" },
  date: { en: "Date", ru: "Дата", uz: "Sana" },
  ticketNumber: { en: "Ticket", ru: "Билет", uz: "Bilet" },
  participant: {
    en: "Participant",
    ru: "Участник",
    uz: "Ishtirokchi",
  },
  speaker: { en: "Speaker", ru: "Спикер", uz: "Ma’ruzachi" },
  mentor: { en: "Mentor", ru: "Ментор", uz: "Mentor" },
  online: { en: "Online", ru: "Онлайн", uz: "Onlayn" },
  download: { en: "Save PDF", ru: "Сохранить PDF", uz: "PDF saqlash" },
  share: { en: "Share", ru: "Поделиться", uz: "Ulashish" },
  addToCal: {
    en: "Add to calendar",
    ru: "В календарь",
    uz: "Kalendarga",
  },
  shareText: {
    en: "Going to {title}",
    ru: "Иду на {title}",
    uz: "{title} tadbiriga boraman",
  },
  linkCopied: {
    en: "Link copied",
    ru: "Ссылка скопирована",
    uz: "Havola nusxalandi",
  },
  shareError: {
    en: "Couldn’t share",
    ru: "Не удалось поделиться",
    uz: "Ulashib bo‘lmadi",
  },
  bright: {
    en: "Tap to brighten",
    ru: "Нажмите, чтобы увеличить яркость",
    uz: "Yorqinligini oshirish uchun bosing",
  },
  downloadError: {
    en: "Couldn’t download",
    ru: "Не удалось скачать",
    uz: "Yuklab bo‘lmadi",
  },
  saveHint: {
    en: "Save the ticket — it works without internet at the entry.",
    ru: "Сохраните билет — он работает без интернета на входе.",
    uz: "Biletni saqlang — kirishda internetsiz ham ishlaydi.",
  },
};

// ============================================================================
// Component
// ============================================================================

/* eslint-disable complexity, max-lines-per-function -- ticket modal: many states, inline localization */
export function TicketCardModal({
  eventItem,
  onClose,
}: TicketCardModalProps): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const lang = pickLang(locale);
  const { event, role, status } = eventItem;

  const isApproved = status === "APPROVED" || status === "ATTENDED";

  const {
    data: qrData,
    isLoading: qrLoading,
    isError: qrError,
    refetch: refetchQr,
  } = useRegistrationQrQuery(eventItem.id, {
    enabled: !!eventItem.id && isApproved,
  });

  const qrCode = qrData?.qrCode ?? eventItem.qrCode;
  const ticketNumber =
    qrData?.ticketNumber ??
    (eventItem as { ticketNumber?: string | null }).ticketNumber ??
    `EVF-${eventItem.id.slice(0, 6).toUpperCase()}`;

  const [downloading, setDownloading] = useState(false);
  const [isBright, setIsBright] = useState(false);

  // Lock body scroll while modal is open + close on Escape
  // eslint-disable-next-line no-restricted-syntax -- modal lifecycle: body scroll lock + Escape handler
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return (): void => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const formattedDate = formatUtcToLocalDate(event.startDate, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const formattedTime = formatUtcToLocalTime(event.startDate, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const localizedCity = event.city ? getCityLabel(t)(event.city) : null;
  const venueLabel =
    event.venue ?? localizedCity ?? tl(lang, L.online);

  const subtitle = useMemo(
    () =>
      [formattedDate, formattedTime, venueLabel]
        .filter(Boolean)
        .join(" · "),
    [formattedDate, formattedTime, venueLabel],
  );

  const roleLabel =
    role === "SPEAKER"
      ? tl(lang, L.speaker)
      : role === "MENTOR"
        ? tl(lang, L.mentor)
        : tl(lang, L.participant);

  const handleDownload = async (): Promise<void> => {
    setDownloading(true);
    try {
      const blob = await registrationService.downloadTicketAsBlob(
        eventItem.id,
        "branded",
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${event.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tl(lang, L.downloadError),
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/events/${event.slug ?? event.id}`
        : "";
    const data: ShareData = {
      title: event.title,
      text: tl(lang, L.shareText).replace("{title}", event.title),
      url,
    };
    try {
      const canNative =
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" ||
          navigator.canShare(data));
      if (canNative) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(tl(lang, L.linkCopied));
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast.error(tl(lang, L.shareError));
      }
    }
  };

  const handleAddToCalendar = (): void => {
    const startDate = parseUtcIso(event.startDate);
    const endDate = event.endDate
      ? parseUtcIso(event.endDate)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date): string =>
      `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title,
    )}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${encodeURIComponent(
      event.shortDescription ?? "",
    )}&location=${encodeURIComponent(event.venue ?? localizedCity ?? "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ── QR area state ────────────────────────────────────────────
  let qrBody: React.ReactNode;
  if (!isApproved) {
    qrBody = (
      <div className="cm-ticket-qr-empty">
        <QrCode size={28} strokeWidth={1.6} aria-hidden />
        <p>
          {status === "PENDING"
            ? tl(lang, L.pendingNote)
            : tl(lang, L.rejectedNote)}
        </p>
      </div>
    );
  } else if (qrLoading) {
    qrBody = (
      <div className="cm-ticket-qr-empty">
        <Loader2 size={28} strokeWidth={1.6} className="cm-ticket-spinner" />
      </div>
    );
  } else if (qrError) {
    qrBody = (
      <div className="cm-ticket-qr-empty">
        <AlertCircle size={28} strokeWidth={1.6} aria-hidden />
        <p>{tl(lang, L.qrError)}</p>
        <button
          type="button"
          onClick={() => {
            void refetchQr();
          }}
          className="cm-ticket-retry"
        >
          {tl(lang, L.retry)}
        </button>
      </div>
    );
  } else if (qrCode) {
    qrBody = (
      <Image
        src={qrCode}
        alt="QR"
        width={208}
        height={208}
        className="cm-ticket-qr-image"
        unoptimized
      />
    );
  } else {
    qrBody = (
      <div className="cm-ticket-qr-empty">
        <QrCode size={28} strokeWidth={1.6} aria-hidden />
        <p>{tl(lang, L.qrLater)}</p>
      </div>
    );
  }

  return (
    <div
      className="cm-ticket-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="cm-ticket-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <header className="cm-ticket-topbar">
          <button
            type="button"
            onClick={onClose}
            className="cm-ticket-done"
          >
            <span aria-hidden>←</span>
            {tl(lang, L.done)}
          </button>
          <div className="cm-ticket-brand">{tl(lang, L.brand)}</div>
          <button
            type="button"
            onClick={onClose}
            className="cm-ticket-close"
            aria-label={tl(lang, L.done)}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </header>

        {/* Heading */}
        <div className="cm-ticket-heading">
          <div
            className={`cm-ticket-eyebrow${
              status === "PENDING"
                ? " is-pending"
                : status === "REJECTED"
                  ? " is-rejected"
                  : ""
            }`}
          >
            {status === "PENDING"
              ? tl(lang, L.pending)
              : status === "REJECTED"
                ? tl(lang, L.rejected)
                : tl(lang, L.ready)}
          </div>
          <h1 className="cm-ticket-title">{event.title}</h1>
          <p className="cm-ticket-subtitle">{subtitle}</p>
        </div>

        {/* The ticket card */}
        <div className={`cm-ticket-card${isBright ? " is-bright" : ""}`}>
          <div className="cm-ticket-qr-zone">
            {isApproved && qrCode ? (
              <button
                type="button"
                className="cm-ticket-qr-frame is-interactive"
                onClick={() => setIsBright((v) => !v)}
                aria-label={tl(lang, L.bright)}
                aria-pressed={isBright}
              >
                {qrBody}
                <span className="cm-ticket-qr-bright-hint" aria-hidden>
                  <Sun size={12} strokeWidth={2} />
                  {tl(lang, L.bright)}
                </span>
              </button>
            ) : (
              <div className="cm-ticket-qr-frame">{qrBody}</div>
            )}
            {isApproved ? (
              <>
                <div className="cm-ticket-scan">{tl(lang, L.scan)}</div>
                <div className="cm-ticket-number">{ticketNumber}</div>
              </>
            ) : null}
          </div>

          {/* Cutout */}
          <div className="cm-ticket-cutout" aria-hidden>
            <span className="cm-ticket-cutout-notch cm-ticket-cutout-notch--l" />
            <span className="cm-ticket-cutout-line" />
            <span className="cm-ticket-cutout-notch cm-ticket-cutout-notch--r" />
          </div>

          {/* Detail grid */}
          <div className="cm-ticket-grid">
            <div className="cm-ticket-cell">
              <div className="cm-ticket-cell__label">{tl(lang, L.name)}</div>
              <div className="cm-ticket-cell__value">
                {qrData?.userName ?? "—"}
              </div>
            </div>
            <div className="cm-ticket-cell">
              <div className="cm-ticket-cell__label">{tl(lang, L.doors)}</div>
              <div className="cm-ticket-cell__value">{formattedTime}</div>
            </div>
            <div className="cm-ticket-cell">
              <div className="cm-ticket-cell__label">
                {tl(lang, L.location)}
              </div>
              <div className="cm-ticket-cell__value">{venueLabel}</div>
            </div>
            <div className="cm-ticket-cell">
              <div className="cm-ticket-cell__label">{tl(lang, L.type)}</div>
              <div className="cm-ticket-cell__value">{roleLabel}</div>
            </div>
            {event.organizationName ? (
              <div className="cm-ticket-cell cm-ticket-cell--full">
                <div className="cm-ticket-cell__label">
                  {tl(lang, L.organizer)}
                </div>
                <div className="cm-ticket-cell__value">
                  {event.organizationName}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="cm-ticket-actions">
          <button
            type="button"
            onClick={() => {
              void handleDownload();
            }}
            disabled={downloading || !isApproved}
            className="cm-ticket-action"
          >
            {downloading ? (
              <Loader2
                size={18}
                strokeWidth={1.8}
                className="cm-ticket-spinner"
                aria-hidden
              />
            ) : (
              <Download size={18} strokeWidth={1.8} aria-hidden />
            )}
            <span>{tl(lang, L.download)}</span>
          </button>
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="cm-ticket-action"
          >
            <CalendarPlus size={18} strokeWidth={1.8} aria-hidden />
            <span>{tl(lang, L.addToCal)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void handleShare();
            }}
            className="cm-ticket-action"
          >
            <Share2 size={18} strokeWidth={1.8} aria-hidden />
            <span>{tl(lang, L.share)}</span>
          </button>
        </div>

        {isApproved ? (
          <p className="cm-ticket-hint">{tl(lang, L.saveHint)}</p>
        ) : null}
      </div>
    </div>
  );
}
/* eslint-enable complexity, max-lines-per-function */
