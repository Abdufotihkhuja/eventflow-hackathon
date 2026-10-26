"use client";

import { Suspense } from "react";

import { useSearchParams } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  XCircle,
} from "lucide-react";

import { ApiError } from "@shared/lib";
import {
  useAuthReadyState,
  useSelfCheckInMutation,
  useSelfCheckInOnMount,
} from "@shared/lib/hooks";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { cn } from "@shared/lib/utils";
import { Button, buttonStyles, PageSection } from "@shared/ui";
import { LocalizedLink } from "@shared/ui/localized-link";

import type {
  SelfCheckInAlreadyUsedErrorData,
  SelfCheckInResult,
} from "@shared/api";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatCheckInTime(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Общая спокойная карточка состояния (визуальный прецедент —
// --- certificates/verify: белая карточка, ember-плитка иконки) ---
function CheckInCard({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}): React.ReactNode {
  return (
    <article
      className={cn(
        "mx-auto max-w-md overflow-hidden rounded-xl",
        "border border-bone-300 bg-white shadow-[0_2px_8px_rgba(24,24,27,0.06)]",
        "dark:border-bone-400 dark:bg-white dark:shadow-lg",
        "p-6 sm:p-8"
      )}
      aria-labelledby="check-in-heading"
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "mb-4 flex size-14 items-center justify-center rounded-xl",
            "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
          )}
        >
          {icon}
        </div>
        <h1
          id="check-in-heading"
          className="text-xl font-bold text-ink-400 dark:text-ink-400"
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-100 dark:text-ink-100">{body}</p>
        {children}
      </div>
    </article>
  );
}

function CheckInActions({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
      {children}
    </div>
  );
}

// --- Билет + мои мероприятия (success и already_used) ---
function TicketActions({ eventId }: { eventId: string }): React.ReactNode {
  const t = useT();

  return (
    <CheckInActions>
      <LocalizedLink
        href={`/profile/tickets/${eventId}`}
        className={buttonStyles({ variant: "primary" })}
      >
        {t("public.checkIn.openTicket")}
      </LocalizedLink>
      <LocalizedLink
        href="/profile/events"
        className={buttonStyles({ variant: "secondary" })}
      >
        {t("public.checkIn.myEvents")}
      </LocalizedLink>
    </CheckInActions>
  );
}

// --- Гость либо 401: инлайн sign-in gate без принудительного редиректа ---
function SignInGate({ eventId }: { eventId: string }): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const loginHref = `/login?redirect=${encodeURIComponent(
    withLocalePath(`/check-in?eventId=${eventId}`, locale)
  )}`;

  return (
    <CheckInCard
      icon={<LogIn className="size-8" aria-hidden />}
      title={t("public.checkIn.loginTitle")}
      body={t("public.checkIn.loginBody")}
    >
      <CheckInActions>
        <LocalizedLink
          href={loginHref}
          className={buttonStyles({ variant: "primary" })}
        >
          {t("public.checkIn.loginCta")}
        </LocalizedLink>
      </CheckInActions>
    </CheckInCard>
  );
}

// --- Мутация в полёте ---
function CheckInWorking(): React.ReactNode {
  const t = useT();

  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-16"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "flex size-16 items-center justify-center rounded-xl",
          "bg-ember-50 text-ember-400 dark:bg-ember-400/25 dark:text-ember-300"
        )}
      >
        <Loader2 className="size-9 animate-spin" aria-hidden />
      </div>
      <p className="text-lg font-medium text-ink-100 dark:text-ink-50">
        {t("public.checkIn.working")}
      </p>
    </div>
  );
}

// --- 201: отметка записана ---
function CheckInSuccess({ result }: { result: SelfCheckInResult }): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const time = formatCheckInTime(result.attendance.checkInAt, locale);

  return (
    <CheckInCard
      icon={<CheckCircle2 className="size-8" aria-hidden />}
      title={t("public.checkIn.successTitle")}
      body={t("public.checkIn.successBody", { event: result.event.title })}
    >
      {time ? (
        <p className="mt-3 text-sm font-semibold text-ink-400 dark:text-ink-400">
          {t("public.checkIn.checkedInAt", { time })}
        </p>
      ) : null}
      <TicketActions eventId={result.event.id} />
    </CheckInCard>
  );
}

// --- 409 already_used: спокойное инфо-состояние, не ошибка ---
function CheckInAlreadyUsed({
  error,
  eventId,
}: {
  error: ApiError;
  eventId: string;
}): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  // Сервер присылает details.lastCheckInAt — показываем время, только
  // если поле реально пришло (safe-cast + runtime-проверка).
  const data = error.data as Partial<SelfCheckInAlreadyUsedErrorData>;
  const lastCheckInAt = data.details?.lastCheckInAt;
  const time =
    typeof lastCheckInAt === "string"
      ? formatCheckInTime(lastCheckInAt, locale)
      : null;

  return (
    <CheckInCard
      icon={<CheckCircle2 className="size-8" aria-hidden />}
      title={t("public.checkIn.alreadyTitle")}
      body={t("public.checkIn.alreadyBody")}
    >
      {time ? (
        <p className="mt-3 text-sm font-semibold text-ink-400 dark:text-ink-400">
          {t("public.checkIn.checkedInAt", { time })}
        </p>
      ) : null}
      <TicketActions eventId={eventId} />
    </CheckInCard>
  );
}

// --- Отметка недоступна (регистрация/окно события): одна secondary-ссылка ---
function CheckInBlocked({
  icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}): React.ReactNode {
  return (
    <CheckInCard icon={icon} title={title} body={body}>
      <CheckInActions>
        <LocalizedLink
          href={ctaHref}
          className={buttonStyles({ variant: "secondary" })}
        >
          {ctaLabel}
        </LocalizedLink>
      </CheckInActions>
    </CheckInCard>
  );
}

// --- Неизвестная ошибка: generic + retry ---
function CheckInGenericError({ onRetry }: { onRetry: () => void }): React.ReactNode {
  const t = useT();

  return (
    <CheckInCard
      icon={<XCircle className="size-8" aria-hidden />}
      title={t("public.checkIn.errorTitle")}
      body={t("public.checkIn.errorBody")}
    >
      <CheckInActions>
        <Button variant="primary" onClick={onRetry}>
          {t("public.checkIn.retry")}
        </Button>
      </CheckInActions>
    </CheckInCard>
  );
}

// --- Ветвление ошибок строго по error.data.code (не по тексту message) ---
function CheckInError({
  error,
  eventId,
  onRetry,
}: {
  error: Error;
  eventId: string;
  onRetry: () => void;
}): React.ReactNode {
  const t = useT();

  if (!(error instanceof ApiError)) {
    return <CheckInGenericError onRetry={onRetry} />;
  }

  if (error.status === 401) {
    return <SignInGate eventId={eventId} />;
  }

  switch (error.data.code) {
    case "already_used":
      return <CheckInAlreadyUsed error={error} eventId={eventId} />;
    case "not_registered":
      return (
        <CheckInBlocked
          icon={<XCircle className="size-8" aria-hidden />}
          title={t("public.checkIn.notRegisteredTitle")}
          body={t("public.checkIn.notRegisteredBody")}
          ctaHref="/events"
          ctaLabel={t("public.checkIn.browseEvents")}
        />
      );
    case "pending_review":
      return (
        <CheckInBlocked
          icon={<Clock className="size-8" aria-hidden />}
          title={t("public.checkIn.pendingTitle")}
          body={t("public.checkIn.pendingBody")}
          ctaHref="/profile/events"
          ctaLabel={t("public.checkIn.myEvents")}
        />
      );
    case "rejected":
    case "cancelled":
    case "not_approved":
      return (
        <CheckInBlocked
          icon={<XCircle className="size-8" aria-hidden />}
          title={t("public.checkIn.declinedTitle")}
          body={t("public.checkIn.declinedBody")}
          ctaHref="/profile/events"
          ctaLabel={t("public.checkIn.myEvents")}
        />
      );
    case "event_not_started":
      return (
        <CheckInBlocked
          icon={<Clock className="size-8" aria-hidden />}
          title={t("public.checkIn.notStartedTitle")}
          body={t("public.checkIn.notStartedBody")}
          ctaHref="/profile/events"
          ctaLabel={t("public.checkIn.myEvents")}
        />
      );
    case "expired":
      return (
        <CheckInBlocked
          icon={<Clock className="size-8" aria-hidden />}
          title={t("public.checkIn.endedTitle")}
          body={t("public.checkIn.endedBody")}
          ctaHref="/profile/events"
          ctaLabel={t("public.checkIn.myEvents")}
        />
      );
    case "event_not_found":
      return (
        <CheckInBlocked
          icon={<XCircle className="size-8" aria-hidden />}
          title={t("public.checkIn.eventNotFoundTitle")}
          body={t("public.checkIn.eventNotFoundBody")}
          ctaHref="/events"
          ctaLabel={t("public.checkIn.browseEvents")}
        />
      );
    default:
      return <CheckInGenericError onRetry={onRetry} />;
  }
}

function CheckInContent(): React.ReactNode {
  const t = useT();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId")?.trim() ?? "";
  const isValidEventId = UUID_RE.test(eventId);
  // null до гидрации: SSR-разметка показывает нейтральный спиннер, а не
  // sign-in gate (isAuthenticated() на сервере всегда false).
  const isUserAuthenticated = useAuthReadyState();

  const mutation = useSelfCheckInMutation();
  const { mutate } = mutation;
  // Авто-запуск ровно один раз на mount — side-effect инкапсулирован в хуке.
  useSelfCheckInOnMount(
    eventId,
    isValidEventId && isUserAuthenticated === true,
    mutate,
  );

  if (!isValidEventId) {
    return (
      <PageSection className="py-12 sm:py-16">
        <CheckInCard
          icon={<XCircle className="size-8" aria-hidden />}
          title={t("public.checkIn.invalidLinkTitle")}
          body={t("public.checkIn.invalidLinkBody")}
        >
          <CheckInActions>
            <LocalizedLink
              href="/events"
              className={buttonStyles({ variant: "secondary" })}
            >
              {t("public.checkIn.browseEvents")}
            </LocalizedLink>
          </CheckInActions>
        </CheckInCard>
      </PageSection>
    );
  }

  if (isUserAuthenticated === null) {
    return <CheckInFallback />;
  }

  if (!isUserAuthenticated) {
    return (
      <PageSection className="py-12 sm:py-16">
        <SignInGate eventId={eventId} />
      </PageSection>
    );
  }

  if (mutation.isSuccess) {
    return (
      <PageSection className="py-12 sm:py-16">
        <CheckInSuccess result={mutation.data} />
      </PageSection>
    );
  }

  if (mutation.isError) {
    return (
      <PageSection className="py-12 sm:py-16">
        <CheckInError
          error={mutation.error}
          eventId={eventId}
          onRetry={() => mutate(eventId)}
        />
      </PageSection>
    );
  }

  // idle (эффект ещё не выстрелил) + pending
  return (
    <PageSection>
      <CheckInWorking />
    </PageSection>
  );
}

function CheckInFallback(): React.ReactNode {
  const t = useT();

  return (
    <PageSection>
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-12 animate-spin text-ember-400" aria-hidden />
        <p className="text-ink-100 dark:text-ink-50">{t("common.loading")}</p>
      </div>
    </PageSection>
  );
}

export default function CheckInPage(): React.ReactNode {
  const t = useT();

  return (
    <section
      className="min-h-screen w-full"
      aria-label={t("public.checkIn.title")}
      style={{
        background:
          "linear-gradient(180deg, var(--ember-50) 0%, rgba(255,255,255,0) 100%)",
      }}
    >
      <Suspense fallback={<CheckInFallback />}>
        <CheckInContent />
      </Suspense>
    </section>
  );
}
