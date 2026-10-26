"use client";

import { useEffect, useMemo, useState } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { useParams, useSearchParams } from "next/navigation";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  Loader2,
  MapPin,
  Share2,
  Ticket,
  Video,
} from "lucide-react";

import { Spinner } from "@shared/ui/spinner";
import { useReducedMotion } from "@shared/lib/hooks/useReducedMotion";
import { crossfade, pressSpring } from "@shared/lib/motion/spring-presets";

import type { Translator } from "@eventflow/i18n";
import { formatNumber, plural } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import { isActiveRegistration } from "@entities/event";
import { mapPublicEventToDesignEvent } from "@entities/event/lib";
import { ApiError } from "@shared/lib";
import { formatUtcToLocalDateTime } from "@shared/lib/date";
import { extractTextFromBlocks } from "@shared/lib/richText";
import {
  useAuthReadyState,
  usePublicEventQuery,
  useCanRegisterQuery,
  useRegisterForEventMutation,
  useRegistrationQuestionsQuery,
} from "@shared/lib/hooks";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { MINUTES_SHORT_PLURAL, QUESTIONS_PLURAL } from "@shared/lib/plurals";
import { resolveAvatarUrl } from "@shared/lib/utils";
import { Container } from "@shared/ui/container";
import { DesignIcon, EventPoster, Eyebrow } from "@shared/ui/design-system";
import type { DesignEvent } from "@shared/ui/design-system";
import { TicketCheckoutSection } from "@widgets/events/registration";

import type { PublicEvent, PublicEventDetail } from "@shared/api/eventService";

import { HostAvatar } from "./_host-avatar";
import "./_styles.css";

interface RegisterCtaButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  loadingLabel: string;
  idleLabel: string;
}

function RegisterCtaButton({
  onClick,
  disabled,
  isLoading,
  loadingLabel,
  idleLabel,
}: RegisterCtaButtonProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={isLoading || undefined}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={pressSpring}
      className="cm-reg-cta cm-reg-cta--full"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.span
            key="loading"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={crossfade}
            className="inline-flex items-center justify-center gap-2"
          >
            <Spinner size="sm" tone="current" />
            {loadingLabel}
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={crossfade}
            className="inline-flex items-center justify-center gap-2"
          >
            {idleLabel}
            <span aria-hidden>→</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

type RegistrationMode = "SIMPLE" | "QUESTIONS" | "TEST";

const pickLang = (locale: string): "en" | "ru" | "uz" =>
  locale === "ru" ? "ru" : locale === "uz" ? "uz" : "en";

const tl = (
  lang: "en" | "ru" | "uz",
  bag: { en: string; ru: string; uz: string },
): string => bag[lang] ?? bag.en;

const L = {
  date: { en: "Date", ru: "Дата", uz: "Sana" },
  time: { en: "Time", ru: "Время", uz: "Vaqt" },
  location: { en: "Location", ru: "Место", uz: "Joy" },
  hostedBy: { en: "Hosted by", ru: "Организатор", uz: "Tashkilotchi" },
  free: { en: "Free entry", ru: "Бесплатно", uz: "Bepul" },
  freeMeta: {
    en: "no charge",
    ru: "оплата не требуется",
    uz: "to‘lovsiz",
  },
  feesIncluded: {
    en: "all fees included",
    ru: "все сборы включены",
    uz: "barcha to‘lovlar kiritilgan",
  },
  youreIn: { en: "You’re in", ru: "Вы в списке", uz: "Siz ro‘yxatdasiz" },
  pending: {
    en: "Request sent",
    ru: "Заявка отправлена",
    uz: "So‘rov yuborildi",
  },
  countdown: { en: "Starts", ru: "Начало", uz: "Boshlanish" },
  happeningNow: {
    en: "Happening now",
    ru: "Уже идёт",
    uz: "Hozir bo‘lmoqda",
  },
  ended: { en: "Already ended", ru: "Уже завершилось", uz: "Tugagan" },
  inDays: { en: "in {n}d", ru: "через {n} дн.", uz: "{n} kun keyin" },
  inHours: { en: "in {n}h", ru: "через {n} ч.", uz: "{n} soat keyin" },
  inMinutes: { en: "in {n}m", ru: "через {n} мин.", uz: "{n} daq. keyin" },
  addToCal: {
    en: "Add to calendar",
    ru: "В календарь",
    uz: "Kalendarga",
  },
  myTicket: { en: "My ticket", ru: "Мой билет", uz: "Mening biletim" },
  getDirections: {
    en: "Get directions",
    ru: "Открыть на карте",
    uz: "Yo‘nalish",
  },
  openLink: {
    en: "Open online link",
    ru: "Открыть ссылку",
    uz: "Onlayn havola",
  },
  share: { en: "Share", ru: "Поделиться", uz: "Ulashish" },
  shared: { en: "Link copied", ru: "Ссылка скопирована", uz: "Havola nusxalandi" },
  emailSent: {
    en: "We’ve sent a confirmation to your email.",
    ru: "Подтверждение отправлено на вашу почту.",
    uz: "Tasdiq elektron pochtaga yuborildi.",
  },
  pendingNote: {
    en: "The organizer will review your request and notify you.",
    ru: "Организатор рассмотрит заявку и сообщит о решении.",
    uz: "Tashkilotchi so‘rovingizni ko‘rib chiqib javob beradi.",
  },
  whatsNext: {
    en: "What happens next",
    ru: "Что дальше",
    uz: "Keyin nima bo‘ladi",
  },
  reasonNotFound: {
    en: "Registration unavailable",
    ru: "Регистрация недоступна",
    uz: "Roʻyxatga olish mavjud emas",
  },
  reasonPrivate: {
    en: "Registration for private events is not available.",
    ru: "Регистрация на приватное мероприятие недоступна.",
    uz: "Yopiq tadbirga roʻyxatdan oʻtish mavjud emas.",
  },
  reasonNotPublished: {
    en: "This event is not open for registration yet.",
    ru: "Мероприятие пока недоступно для регистрации.",
    uz: "Tadbir hozircha roʻyxatdan oʻtish uchun ochiq emas.",
  },
  reasonDeadlinePassed: {
    en: "Registration is closed.",
    ru: "Регистрация закрыта.",
    uz: "Roʻyxatga olish yopilgan.",
  },
  reasonCapacityFull: {
    en: "Registration is full — all seats are taken.",
    ru: "Регистрация закрыта — все места заняты.",
    uz: "Roʻyxatga olish toʻla — barcha joylar band.",
  },
  reasonManuallyClosed: {
    en: "Registration has been closed by the organizer.",
    ru: "Регистрация закрыта организатором.",
    uz: "Roʻyxatga olish tashkilotchi tomonidan yopildi.",
  },
  reasonHelpDeadline: {
    en: "The organizer closed registration before the event date. Browse other upcoming events on the platform.",
    ru: "Организатор закрыл регистрацию до старта мероприятия. Посмотрите другие предстоящие события на платформе.",
    uz: "Tashkilotchi roʻyxatga olishni tadbir boshlanishidan oldin yopdi. Platformadagi boshqa tadbirlarni koʻring.",
  },
  reasonHelpCapacity: {
    en: "All seats have been claimed. Save the event to be the first to know if more spots open up.",
    ru: "Все места заняты. Сохраните событие, чтобы первыми узнать о новых местах.",
    uz: "Barcha joylar band. Yangi joylar paydo boʻlsa birinchi bilish uchun tadbirni saqlang.",
  },
  reasonHelpPrivate: {
    en: "This event is private. You need an invitation from the organizer to join.",
    ru: "Это приватное мероприятие. Чтобы попасть, нужно приглашение от организатора.",
    uz: "Bu yopiq tadbir. Qoʻshilish uchun tashkilotchidan taklifnoma kerak.",
  },
  reasonHelpNotPublished: {
    en: "Registration is not open yet. Check back later or follow the organizer for updates.",
    ru: "Регистрация ещё не открыта. Загляните позже или подпишитесь на организатора, чтобы получать обновления.",
    uz: "Roʻyxatga olish hali ochilmagan. Keyinroq qayting yoki yangiliklar uchun tashkilotchini kuzating.",
  },
  reasonHelpManuallyClosed: {
    en: "The organizer has paused new sign-ups. Follow them or check back later — registration may reopen.",
    ru: "Организатор временно приостановил приём заявок. Подпишитесь или загляните позже — регистрация может открыться снова.",
    uz: "Tashkilotchi yangi arizalarni vaqtinchalik to‘xtatdi. Obuna bo‘ling yoki keyinroq qayting — ro‘yxatga olish qayta ochilishi mumkin.",
  },
  browseEvents: {
    en: "Browse other events",
    ru: "Смотреть другие события",
    uz: "Boshqa tadbirlar",
  },
};

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const toIcsDateTime = (iso: string): string => {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
};

const escapeIcs = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/[;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

interface IcsInput {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  start: string;
  end?: string;
}
const buildIcs = (e: IcsInput): string => {
  const start = toIcsDateTime(e.start);
  const end = e.end
    ? toIcsDateTime(e.end)
    : toIcsDateTime(
        new Date(new Date(e.start).getTime() + 60 * 60 * 1000).toISOString(),
      );
  const stamp = toIcsDateTime(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eventflow//Public//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@eventflow`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    e.description ? `DESCRIPTION:${escapeIcs(e.description)}` : "",
    e.location ? `LOCATION:${escapeIcs(e.location)}` : "",
    e.url ? `URL:${e.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
};

const formatRelative = (
  startIso: string,
  endIso: string | undefined,
  lang: "en" | "ru" | "uz",
): string => {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + 60 * 60 * 1000;
  const now = Date.now();
  if (now >= end) return tl(lang, L.ended);
  if (now >= start) return tl(lang, L.happeningNow);
  const diff = start - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (days >= 1) return tl(lang, L.inDays).replace("{n}", String(days));
  if (hours >= 1) return tl(lang, L.inHours).replace("{n}", String(hours));
  return tl(lang, L.inMinutes).replace("{n}", String(mins));
};

// HostAvatar moved to `./_host-avatar` so the questions/ subroute can
// reuse the same logo-with-initials-fallback (previously it inlined a
// plain initials-only avatar and the org logo silently disappeared).

/* eslint-disable complexity, max-lines-per-function -- единая страница регистрации со множеством состояний */
export default function EventRegisterPage(): React.ReactNode {
  const locale = useLocale();
  const lang = pickLang(locale);
  const t = useT();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;

  // `?done=1` arrives after a successful question-flow submission. Treat the
  // user as registered immediately so we show the celebration instead of
  // re-rendering the form for a brief moment.
  // Also: a previous attempt may have hit a 409 "already registered" — in
  // that case we cached the slug in sessionStorage so reloads land directly
  // on the success state without showing the Register CTA again.
  const justRegistered = searchParams.get("done") === "1";
  const [isRegistered, setIsRegistered] = useState(() => {
    if (justRegistered) return true;
    if (typeof window === "undefined") return false;
    try {
      const memo = window.sessionStorage.getItem(`reg:${slug}`);
      return memo === "1";
    } catch {
      return false;
    }
  });
  const markRegistered = (): void => {
    setIsRegistered(true);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(`reg:${slug}`, "1");
      } catch {
        /* storage may be disabled */
      }
    }
  };
  const urlInviteCode = searchParams.get("inviteCode") ?? "";
  const [inviteCode, setInviteCode] = useState("");
  const effectiveInviteCode = (inviteCode || urlInviteCode).trim();

  // `null` until hydration — isAuthenticated() reads localStorage and is
  // always false on the server. Anything but an explicit `false` keeps the
  // logged-in href, so the SSR markup and the first client render agree.
  const authState = useAuthReadyState();
  const isSignedOut = authState === false;

  // The event is looked up with the code from the link only. The typed code is
  // sent with the registration itself: keying the lookup on it refetched the
  // event per keystroke, and a partial code 404'd the whole form away.
  const { data: event, isLoading: isEventLoading } = usePublicEventQuery(slug, {
    bySlug: true,
    inviteCode: urlInviteCode,
  });

  const {
    data: canRegisterData,
    isLoading: isCanRegisterLoading,
    isFetched: isCanRegisterFetched,
  } = useCanRegisterQuery(event?.id ?? "", {
    enabled: !!event?.id,
    inviteCode: urlInviteCode || undefined,
  });

  const registrationMode = (event?.registrationMode ??
    "SIMPLE") as RegistrationMode;
  const needsQuestions =
    registrationMode === "QUESTIONS" || registrationMode === "TEST";

  const { data: questions = [], isLoading: isQuestionsLoading } =
    useRegistrationQuestionsQuery(event?.id ?? "", {
      enabled: !!event?.id && needsQuestions,
    });

  const isAlreadyRegisteredErrorLike = (error: unknown): boolean => {
    const msg = String(
      (error as { message?: unknown })?.message ?? "",
    ).toLowerCase();
    const status =
      error instanceof ApiError ? error.status : undefined;
    return (
      status === 409 ||
      msg.includes("already registered") ||
      msg.includes("уже зарегистрирован")
    );
  };

  const registerMutation = useRegisterForEventMutation({
    onSuccess: () => {
      markRegistered();
    },
    onError: (error) => {
      if (isAlreadyRegisteredErrorLike(error)) {
        markRegistered();
      }
    },
  });

  const isInviteOnly =
    canRegisterData?.accessType === "INVITE_ONLY" ||
    canRegisterData?.requiresInviteCode === true;

  const designEvent = useMemo(
    () =>
      event
        ? mapPublicEventToDesignEvent(event as PublicEvent, {
            locale,
            timeZone: event.timezone,
          })
        : null,
    [event, locale],
  );

  const handleRegister = (): void => {
    if (!event) return;
    if (isInviteOnly && !effectiveInviteCode) return;
    // Sent for any closed event: a PRIVATE link carries the personal
    // invitation token in the same `inviteCode` param.
    registerMutation.mutate({
      eventId: event.id,
      inviteCode: effectiveInviteCode || undefined,
    });
  };

  const isInviteOnly403 =
    registerMutation.isError &&
    registerMutation.error instanceof ApiError &&
    registerMutation.error.status === 403;

  // Hold the page on a loader until BOTH event and can-register have settled
  // (resolved or errored). This prevents flashing the "Register" CTA to a
  // user who is already registered.
  const isStateUnknown =
    isEventLoading || (Boolean(event?.id) && !isCanRegisterFetched);

  if (isStateUnknown) {
    return (
      <div className="cm-reg-loading">
        <Loader2 className="cm-reg-spinner" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="cm-reg">
        <Container size="wide">
          <div className="cm-reg-empty">
            <h1 className="cm-reg-empty__title">
              {t("public.events.registration.notFoundTitle")}
            </h1>
            <p className="cm-reg-empty__lede">
              {t("public.events.registration.notFoundDescription")}
            </p>
            <Link href="/events" className="cm-reg-cta">
              {t("public.events.registration.backToEvents")}
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const isUserRegistered =
    isRegistered ||
    isActiveRegistration(event.myRegistration) ||
    (canRegisterData?.isRegistered ?? false);

  const isRequestEvent = canRegisterData?.accessType === "REQUEST";
  const registrationStatus = event?.myRegistration?.status as
    | string
    | undefined;
  const isPendingApproval =
    isRequestEvent &&
    (registrationStatus === "PENDING" ||
      (isRegistered && !registrationStatus));

  if (isUserRegistered) {
    return (
      <RegisteredScreen
        event={event}
        designEvent={designEvent}
        lang={lang}
        locale={locale}
        slug={slug}
        isPendingApproval={isPendingApproval}
        t={t}
      />
    );
  }

  const formatDate = (dateStr: string): string =>
    formatUtcToLocalDateTime(dateStr, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const formatTime = (dateStr: string): string =>
    formatUtcToLocalDateTime(dateStr, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const canRegister = canRegisterData?.canRegister ?? true;
  const registrationReasonCode = canRegisterData?.reasonCode;
  const registrationReason = (() => {
    switch (registrationReasonCode) {
      case "PRIVATE":
        return tl(lang, L.reasonPrivate);
      case "NOT_PUBLISHED":
        return tl(lang, L.reasonNotPublished);
      case "DEADLINE_PASSED":
        return tl(lang, L.reasonDeadlinePassed);
      case "CAPACITY_FULL":
        return tl(lang, L.reasonCapacityFull);
      case "MANUALLY_CLOSED":
        return tl(lang, L.reasonManuallyClosed);
      default:
        // Fall back to the server-provided message (currently always Russian)
        // so unknown new codes don't leave the user with an empty card.
        return canRegisterData?.reason;
    }
  })();
  const registrationHelp = (() => {
    switch (registrationReasonCode) {
      case "PRIVATE":
        return tl(lang, L.reasonHelpPrivate);
      case "NOT_PUBLISHED":
        return tl(lang, L.reasonHelpNotPublished);
      case "DEADLINE_PASSED":
        return tl(lang, L.reasonHelpDeadline);
      case "CAPACITY_FULL":
        return tl(lang, L.reasonHelpCapacity);
      case "MANUALLY_CLOSED":
        return tl(lang, L.reasonHelpManuallyClosed);
      default:
        return null;
    }
  })();
  const registrationIcon: "flag" | "shield" | "users" | "calendar" =
    registrationReasonCode === "PRIVATE"
      ? "shield"
      : registrationReasonCode === "CAPACITY_FULL"
        ? "users"
        : registrationReasonCode === "NOT_PUBLISHED"
          ? "calendar"
          : "flag";
  const showQuestionsBlock =
    canRegister && needsQuestions && !isQuestionsLoading && questions.length > 0;
  const showSimpleCta =
    canRegister &&
    (!needsQuestions || (!isQuestionsLoading && questions.length === 0));

  // Step plan — only show steps that produce a real UI block
  const hasRealQuestions =
    needsQuestions && !isQuestionsLoading && questions.length > 0;
  // Rough read-and-answer budget (~25s per question) so the gate can promise
  // a duration instead of an unknown number of screens.
  const estimatedMinutes = Math.max(
    1,
    Math.round((questions.length * 25) / 60),
  );
  const steps: Array<{ id: string; label: string }> = [];
  if (isInviteOnly) {
    steps.push({
      id: "verify",
      label: tl(lang, {
        en: "Verify invite",
        ru: "Код приглашения",
        uz: "Taklif kodi",
      }),
    });
  }
  if (hasRealQuestions) {
    steps.push({
      id: "questions",
      label: tl(lang, {
        en: "Questions",
        ru: "Вопросы",
        uz: "Savollar",
      }),
    });
  }
  steps.push({
    id: "confirm",
    label: tl(lang, {
      en: "Confirm",
      ru: "Подтверждение",
      uz: "Tasdiqlash",
    }),
  });
  const activeStepId =
    isInviteOnly && !effectiveInviteCode
      ? "verify"
      : hasRealQuestions
        ? "questions"
        : "confirm";

  const capacityLabel = event.maxParticipants
    ? `${(event.registrationsCount ?? 0).toLocaleString()} / ${event.maxParticipants.toLocaleString()}`
    : null;

  const eventHref = `/events/${event.slug ?? slug}`;
  const questionsPath = isInviteOnly
    ? withLocalePath(
        `/events/${event.slug ?? event.id}/register/questions?inviteCode=${encodeURIComponent(effectiveInviteCode)}`,
        locale,
      )
    : withLocalePath(
        `/events/${event.slug ?? event.id}/register/questions`,
        locale,
      );
  const registerPath = withLocalePath(
    isInviteOnly
      ? `/events/${event.slug ?? slug}/register?inviteCode=${encodeURIComponent(effectiveInviteCode)}`
      : `/events/${event.slug ?? slug}/register`,
    locale,
  );
  const loginHref = (next: string): string =>
    `/login?redirect=${encodeURIComponent(next)}`;
  // Signed-out attendees used to walk into a wall: the questions route showed
  // its own "sign in first" gate, and the simple CTA fired a 401 that surfaced
  // as a generic error. Send them straight to login and back.
  const questionsHref = isSignedOut ? loginHref(questionsPath) : questionsPath;

  return (
    <div className="cm-reg">
      <Container size="wide">
        <Link href={eventHref} className="cm-reg-back">
          <span aria-hidden>←</span>
          {t("public.events.registration.backToEvent")}
        </Link>

        {/* Everything above the action is a cost. The lede repeats the event
            page the attendee just came from, and date/time/place are one dim
            line instead of a three-cell grid — the CTA has to fit on the
            first screen of a phone. */}
        <div className="cm-reg-hero">
          <Eyebrow>{t("public.events.registration.title")}</Eyebrow>
          <h1 className="cm-reg-hero__title">{event.title}</h1>
          <p className="cm-reg-factline">
            <span>{formatDate(event.startDate)}</span>
            <span aria-hidden>·</span>
            <span>{formatTime(event.startDate)}</span>
            <span aria-hidden>·</span>
            <span>{event.location ?? event.venue ?? event.city ?? "—"}</span>
          </p>
        </div>

        {/* Two steps are already spelled out by the gate card below — the rail
            only earns its rows once an invite code adds a third. */}
        {steps.length > 2 ? (
          <ol className="cm-reg-steps" aria-label={t("public.events.registration.title")}>
            {steps.map((s, i) => {
              const idx = i + 1;
              const activeIndex = steps.findIndex((x) => x.id === activeStepId);
              const state =
                i < activeIndex
                  ? "done"
                  : i === activeIndex
                  ? "active"
                  : "todo";
              return (
                <li key={s.id} className={`cm-reg-step is-${state}`}>
                  <span className="cm-reg-step__num">{idx}</span>
                  <span className="cm-reg-step__label">{s.label}</span>
                </li>
              );
            })}
          </ol>
        ) : null}

        <div className="cm-reg-grid">
          <main className="cm-reg-main">
            {!canRegister && registrationReason ? (
              <section className="cm-reg-blocked" aria-live="polite">
                <div className="cm-reg-blocked__icon" aria-hidden>
                  <DesignIcon
                    name={registrationIcon}
                    size={28}
                    stroke={1.6}
                  />
                </div>
                <Eyebrow>{tl(lang, L.reasonNotFound)}</Eyebrow>
                <h2 className="cm-reg-blocked__title">
                  {registrationReason}
                </h2>
                {registrationHelp ? (
                  <p className="cm-reg-blocked__lede">{registrationHelp}</p>
                ) : null}
                <div className="cm-reg-blocked__actions">
                  <Link href={eventHref} className="cm-reg-blocked__cta">
                    <span aria-hidden>←</span>
                    {t("public.events.registration.backToEvent")}
                  </Link>
                  <Link
                    href={withLocalePath("/events", locale)}
                    className="cm-reg-blocked__alt"
                  >
                    {tl(lang, L.browseEvents)}
                  </Link>
                </div>
              </section>
            ) : null}


            {canRegister && isInviteOnly ? (
              <section className="cm-reg-section">
                <div className="cm-reg-section__head">
                  <Eyebrow>
                    {t("public.events.registration.inviteCodeLabel")}
                  </Eyebrow>
                  <h2 className="cm-reg-section__title">
                    {t("public.events.registration.inviteOnlyHint")}
                  </h2>
                </div>
                <div className="cm-reg-field">
                  <label htmlFor="invite-code" className="cm-reg-field__label">
                    {t("public.events.registration.inviteCodeLabel")}
                  </label>
                  <input
                    id="invite-code"
                    type="text"
                    value={inviteCode || urlInviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder={t(
                      "public.events.registration.inviteCodePlaceholder",
                    )}
                    className="cm-reg-input"
                    autoComplete="off"
                  />
                </div>
              </section>
            ) : null}

            {canRegister && needsQuestions && isQuestionsLoading ? (
              <div className="cm-reg-skeleton" aria-hidden>
                <span />
                <span />
                <span />
              </div>
            ) : null}

            {showQuestionsBlock ? (
              <section className="cm-reg-section cm-reg-section--gate">
                <span className="cm-reg-section__flag">
                  {t("public.events.registration.notRegisteredYet")}
                </span>
                <h2 className="cm-reg-section__title">
                  {registrationMode === "TEST"
                    ? t("public.events.registration.questionsGateTitleTest", {
                        questions: plural(
                          locale,
                          questions.length,
                          QUESTIONS_PLURAL,
                        ),
                      })
                    : t("public.events.registration.questionsGateTitle", {
                        questions: plural(
                          locale,
                          questions.length,
                          QUESTIONS_PLURAL,
                        ),
                      })}
                </h2>
                <p className="cm-reg-helper">
                  {t("public.events.registration.questionsGateMeta", {
                    time: plural(
                      locale,
                      estimatedMinutes,
                      MINUTES_SHORT_PLURAL,
                    ),
                  })}
                </p>

                {isInviteOnly && !effectiveInviteCode ? (
                  <p className="cm-reg-helper cm-reg-helper--warn">
                    {t(
                      "public.events.registration.inviteCodeRequiredForQuestions",
                    )}
                  </p>
                ) : (
                  <Link
                    href={questionsHref}
                    className="cm-reg-cta cm-reg-cta--full"
                  >
                    {t("public.events.registration.goToQuestions")}
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </section>
            ) : null}

            {showSimpleCta ? (
              <section className="cm-reg-section">
                <div className="cm-reg-section__head">
                  <Eyebrow>
                    {tl(lang, {
                      en: "Final step",
                      ru: "Последний шаг",
                      uz: "Yakuniy qadam",
                    })}
                  </Eyebrow>
                  <h2 className="cm-reg-section__title">
                    {isRequestEvent
                      ? tl(lang, {
                          en: "Send a request to join",
                          ru: "Отправить заявку на участие",
                          uz: "Ishtirok uchun so‘rov yuboring",
                        })
                      : tl(lang, {
                          en: "Confirm your registration",
                          ru: "Подтвердите регистрацию",
                          uz: "Ro‘yxatdan o‘tishni tasdiqlang",
                        })}
                  </h2>
                  <p className="cm-reg-helper">
                    {isRequestEvent
                      ? tl(lang, {
                          en: "Organizer will review your request and notify you.",
                          ru: "Организатор рассмотрит вашу заявку и сообщит о решении.",
                          uz: "Tashkilotchi so‘rovingizni ko‘rib chiqib, javob beradi.",
                        })
                      : tl(lang, {
                          en: "We’ll send a confirmation and a reminder closer to the date.",
                          ru: "Мы отправим подтверждение и напомним ближе к дате.",
                          uz: "Tasdiqni va yaqinlashganda eslatma yuboramiz.",
                        })}
                  </p>
                </div>
                {isSignedOut ? (
                  <Link
                    href={loginHref(registerPath)}
                    className="cm-reg-cta cm-reg-cta--full"
                  >
                    {t("public.events.registration.register")}
                    <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <RegisterCtaButton
                    onClick={handleRegister}
                    disabled={
                      registerMutation.isPending ||
                      isCanRegisterLoading ||
                      (isInviteOnly && !effectiveInviteCode)
                    }
                    isLoading={registerMutation.isPending}
                    loadingLabel={t("public.events.registration.registering")}
                    idleLabel={t("public.events.registration.register")}
                  />
                )}

                {(() => {
                  if (!registerMutation.isError) return null;
                  // Already-registered: we have already flipped state to
                  // success above; nothing to render here.
                  if (isAlreadyRegisteredErrorLike(registerMutation.error)) {
                    return null;
                  }
                  return (
                    <p
                      className="cm-reg-helper cm-reg-helper--err"
                      role="alert"
                    >
                      {isInviteOnly403
                        ? t("public.events.registration.inviteOnlyError")
                        : t("public.events.registration.genericError")}
                    </p>
                  );
                })()}

                <p className="cm-reg-terms">
                  {t("public.events.registration.termsPrefix")}{" "}
                  <Link href="/terms" className="cm-reg-terms__link">
                    {t("public.auth.terms")}
                  </Link>
                </p>
              </section>
            ) : null}
          </main>

          {/* `--after`: on phones the action (questions gate / confirm CTA)
              leads and the event card follows as context. */}
          <aside className="cm-reg-aside cm-reg-aside--after">
            <div className="cm-reg-card">
              {designEvent ? (
                <div className="cm-reg-card__poster">
                  <EventPoster event={designEvent} />
                </div>
              ) : null}
              <div className="cm-reg-card__body">
                <div className="cm-reg-card__title">{event.title}</div>
                {event.shortDescription ? (
                  <p className="cm-reg-card__lede">{event.shortDescription}</p>
                ) : null}

                <div className="cm-reg-card__price-row">
                  {event.type === "PAID" && event.price ? (
                    <>
                      <span className="cm-reg-card__price">
                        {formatNumber(Number(event.price), locale)}
                      </span>
                      <span className="cm-reg-card__currency">
                        {event.currency ||
                          t("public.events.registration.sum")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="cm-reg-card__price">
                        {tl(lang, L.free)}
                      </span>
                      <span className="cm-reg-card__currency">
                        {tl(lang, L.freeMeta)}
                      </span>
                    </>
                  )}
                </div>

                {capacityLabel && event.maxParticipants ? (
                  <div className="cm-reg-card__capacity">
                    <div className="cm-reg-card__capacity-track">
                      <div
                        className="cm-reg-card__capacity-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            ((event.registrationsCount ?? 0) /
                              (event.maxParticipants || 1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="cm-reg-card__capacity-label">
                      {capacityLabel}
                      <span> · </span>
                      {t("public.events.capacity.ofSeats", {
                        count: event.maxParticipants,
                      })}
                    </div>
                  </div>
                ) : null}

                {event.organization?.name ? (
                  <div className="cm-reg-card__host">
                    <HostAvatar
                      name={event.organization.name}
                      logoUrl={resolveAvatarUrl(event.organization.logoUrl)}
                    />
                    <div>
                      <div className="cm-reg-card__host-label">
                        {tl(lang, L.hostedBy)}
                      </div>
                      <div className="cm-reg-card__host-name">
                        {event.organization.name}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
/* eslint-enable complexity, max-lines-per-function */

/* ============================================================================
   Registered (success) screen — rich Lu.ma/Eventbrite-style confirmation.
   ========================================================================== */

interface RegisteredScreenProps {
  event: PublicEventDetail;
  designEvent: DesignEvent | null;
  lang: "en" | "ru" | "uz";
  locale: string;
  slug: string;
  isPendingApproval: boolean;
  t: Translator;
}

/* eslint-disable complexity, max-lines-per-function -- celebratory screen with several optional sections */
function RegisteredScreen({
  event,
  designEvent,
  lang,
  locale,
  slug,
  isPendingApproval,
  t,
}: RegisteredScreenProps): React.ReactNode {
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  // Refresh countdown every minute
  // eslint-disable-next-line no-restricted-syntax -- countdown tick interval, локальный UI-эффект
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 60_000);
    return (): void => window.clearInterval(id);
  }, []);

  const eventUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/events/${event.slug ?? slug}`
      : `/events/${event.slug ?? slug}`;

  const icsHref = useMemo(() => {
    // The API returns `description` as a BlockNote array, not a string —
    // pass that straight to escapeIcs and it throws "s.replace is not a
    // function", crashing the whole RegisteredScreen.
    const descriptionText =
      extractTextFromBlocks(event.shortDescription ?? event.description) ||
      undefined;
    const ics = buildIcs({
      uid: event.id,
      title: event.title,
      description: descriptionText,
      location:
        event.location ??
        event.venue ??
        event.city ??
        event.onlineUrl ??
        undefined,
      url: eventUrl,
      start: event.startDate,
      end: event.endDate,
    });
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  }, [event, eventUrl]);

  const dateLabel = formatUtcToLocalDateTime(event.startDate, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = formatUtcToLocalDateTime(event.startDate, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const locationLabel =
    event.location ?? event.venue ?? event.city ?? event.onlineUrl ?? "—";

  const relativeLabel = formatRelative(
    event.startDate,
    event.endDate,
    lang,
  );
  // Touch the tick var so the countdown re-renders.
  void tick;

  const onShare = async (): Promise<void> => {
    const data: ShareData = {
      title: event.title,
      text: event.shortDescription ?? event.title,
      url: eventUrl,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const mapsUrl =
    event.latitude && event.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${event.latitude},${event.longitude}`,
        )}`
      : event.address || event.venue
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [event.address, event.venue, event.city]
              .filter(Boolean)
              .join(", "),
          )}`
        : null;
  const onlineUrl =
    typeof event.onlineUrl === "string" && event.onlineUrl.trim()
      ? event.onlineUrl.trim()
      : null;
  const isOnline =
    String(event.format ?? "").toUpperCase() === "ONLINE" ||
    Boolean(onlineUrl);

  return (
    <div className="cm-reg">
      <Container size="wide">
        <Link
          href={`/events/${event.slug ?? slug}`}
          className="cm-reg-back"
        >
          <span aria-hidden>←</span>
          {t("public.events.registration.backToEvent")}
        </Link>

        <div className="cm-reg-confirmation">
          <div className="cm-reg-confirmation__poster">
            {designEvent ? <EventPoster event={designEvent} /> : null}
            <div className="cm-reg-confirmation__poster-overlay" />
            <div className="cm-reg-confirmation__poster-stamp">
              <div
                className={`cm-reg-confirmation__check${
                  isPendingApproval ? " is-pending" : ""
                }`}
                aria-hidden
              >
                <Check size={28} strokeWidth={2.4} />
              </div>
              <div className="cm-reg-confirmation__stamp-text">
                <Eyebrow color="rgba(255,255,255,0.78)">
                  {isPendingApproval
                    ? tl(lang, L.pending)
                    : tl(lang, L.youreIn)}
                </Eyebrow>
                <div className="cm-reg-confirmation__countdown">
                  {relativeLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="cm-reg-confirmation__body">
            <h1 className="cm-reg-confirmation__title">{event.title}</h1>
            <p className="cm-reg-confirmation__lede">
              {isPendingApproval
                ? tl(lang, L.pendingNote)
                : tl(lang, L.emailSent)}
            </p>

            {/* P-15: чекаут билета — только для платных событий (M-4). */}
            {event.type === "PAID" ? (
              <TicketCheckoutSection event={event} />
            ) : null}

            <div className="cm-reg-confirmation__meta">
              <div className="cm-reg-meta__cell">
                <div className="cm-reg-meta__label">{tl(lang, L.date)}</div>
                <div className="cm-reg-meta__value">{dateLabel}</div>
              </div>
              <div className="cm-reg-meta__cell">
                <div className="cm-reg-meta__label">{tl(lang, L.time)}</div>
                <div className="cm-reg-meta__value">{timeLabel}</div>
              </div>
              <div className="cm-reg-meta__cell">
                <div className="cm-reg-meta__label">
                  {tl(lang, L.location)}
                </div>
                <div className="cm-reg-meta__value">{locationLabel}</div>
              </div>
            </div>

            <div className="cm-reg-confirmation__actions">
              <Link
                href="/profile/events"
                className="cm-reg-action cm-reg-action--primary"
              >
                <Ticket size={18} strokeWidth={1.8} aria-hidden />
                <span>{tl(lang, L.myTicket)}</span>
              </Link>
              <a
                href={icsHref}
                download={`${event.slug ?? event.id}.ics`}
                className="cm-reg-action"
              >
                <CalendarPlus size={18} strokeWidth={1.8} aria-hidden />
                <span>{tl(lang, L.addToCal)}</span>
              </a>
              {isOnline && onlineUrl ? (
                <a
                  href={onlineUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cm-reg-action"
                >
                  <Video size={18} strokeWidth={1.8} aria-hidden />
                  <span>{tl(lang, L.openLink)}</span>
                </a>
              ) : mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cm-reg-action"
                >
                  <MapPin size={18} strokeWidth={1.8} aria-hidden />
                  <span>{tl(lang, L.getDirections)}</span>
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void onShare();
                }}
                className="cm-reg-action"
              >
                <Share2 size={18} strokeWidth={1.8} aria-hidden />
                <span>{copied ? tl(lang, L.shared) : tl(lang, L.share)}</span>
              </button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
/* eslint-enable complexity, max-lines-per-function */
