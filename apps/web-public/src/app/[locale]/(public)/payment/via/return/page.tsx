"use client";

/**
 * Возврат покупателя с платёжной страницы VIA (M-5).
 *
 * Браузерный редирект — только ТРИГГЕР проверки: факт оплаты бэкенд
 * перепроверяет серверным запросом статуса инвойса у VIA
 * (useViaConfirmQuery). Никакие параметры возврата не трактуются как
 * доказательство оплаты. Визуальный прецедент — /check-in.
 */

import { Suspense } from "react";

import { useSearchParams } from "next/navigation";

import { useLocale, useT } from "@eventflow/i18n/react";
import { CheckCircle2, Clock, Loader2, LogIn, XCircle } from "lucide-react";

import { useAuthReadyState, useViaConfirmQuery } from "@shared/lib/hooks";
import { withLocalePath } from "@shared/lib/i18n-routing";
import { cn } from "@shared/lib/utils";
import { Button, buttonStyles, PageSection } from "@shared/ui";
import { LocalizedLink } from "@shared/ui/localized-link";

import type { ViaPaymentConfirmation } from "@shared/api/registrationService";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ReturnCard({
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
      aria-labelledby="via-return-heading"
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
          id="via-return-heading"
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

function ReturnActions({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
      {children}
    </div>
  );
}

/** Билет + мои мероприятия (успешная оплата). */
function PaidActions({ eventId }: { eventId: string | null }): React.ReactNode {
  const t = useT();

  return (
    <ReturnActions>
      {eventId ? (
        <LocalizedLink
          href={`/profile/tickets/${eventId}`}
          className={buttonStyles({ variant: "primary" })}
        >
          {t("checkout.ticket.via.openTicket")}
        </LocalizedLink>
      ) : null}
      <LocalizedLink
        href="/profile/events"
        className={buttonStyles({ variant: "secondary" })}
      >
        {t("checkout.ticket.via.myEvents")}
      </LocalizedLink>
    </ReturnActions>
  );
}

function VerifyingState(): React.ReactNode {
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
        {t("checkout.ticket.via.verifying")}
      </p>
    </div>
  );
}

/** Разбор итога серверной сверки на визуальные состояния. */
function ConfirmationResult({
  result,
  onRetry,
}: {
  result: ViaPaymentConfirmation;
  onRetry: () => void;
}): React.ReactNode {
  const t = useT();

  if (result.paid) {
    return (
      <ReturnCard
        icon={<CheckCircle2 className="size-8" aria-hidden />}
        title={t("checkout.ticket.via.paidTitle")}
        body={t("checkout.ticket.via.paidBody")}
      >
        <PaidActions eventId={result.eventId} />
      </ReturnCard>
    );
  }

  if (
    result.invoiceStatus === "EXPIRED" ||
    result.invoiceStatus === "CANCEL" ||
    result.orderStatus === "EXPIRED" ||
    result.orderStatus === "CANCELLED"
  ) {
    return (
      <ReturnCard
        icon={<XCircle className="size-8" aria-hidden />}
        title={t("checkout.ticket.via.closedTitle")}
        body={t("checkout.ticket.via.closedBody")}
      >
        <ReturnActions>
          <LocalizedLink
            href="/profile/events"
            className={buttonStyles({ variant: "secondary" })}
          >
            {t("checkout.ticket.via.myEvents")}
          </LocalizedLink>
        </ReturnActions>
      </ReturnCard>
    );
  }

  // OPEN/DRAFT/UNKNOWN: оплата ещё не видна — банк мог не провести платёж
  // мгновенно; честно предлагаем перепроверить.
  return (
    <ReturnCard
      icon={<Clock className="size-8" aria-hidden />}
      title={t("checkout.ticket.via.pendingTitle")}
      body={t("checkout.ticket.via.pendingBody")}
    >
      <ReturnActions>
        <Button variant="primary" onClick={onRetry}>
          {t("checkout.ticket.via.recheck")}
        </Button>
        <LocalizedLink
          href="/profile/events"
          className={buttonStyles({ variant: "secondary" })}
        >
          {t("checkout.ticket.via.myEvents")}
        </LocalizedLink>
      </ReturnActions>
    </ReturnCard>
  );
}

function ViaReturnContent(): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("registrationId")?.trim() ?? "";
  const isValidId = UUID_RE.test(registrationId);
  // null до гидрации — нейтральный спиннер вместо sign-in gate (SSR).
  const isUserAuthenticated = useAuthReadyState();

  const confirm = useViaConfirmQuery(
    isValidId && isUserAuthenticated === true ? registrationId : null
  );

  if (!isValidId) {
    return (
      <PageSection className="py-12 sm:py-16">
        <ReturnCard
          icon={<XCircle className="size-8" aria-hidden />}
          title={t("checkout.ticket.via.invalidLinkTitle")}
          body={t("checkout.ticket.via.invalidLinkBody")}
        >
          <ReturnActions>
            <LocalizedLink
              href="/events"
              className={buttonStyles({ variant: "secondary" })}
            >
              {t("checkout.ticket.via.browseEvents")}
            </LocalizedLink>
          </ReturnActions>
        </ReturnCard>
      </PageSection>
    );
  }

  if (isUserAuthenticated === null) {
    return <ViaReturnFallback />;
  }

  if (!isUserAuthenticated) {
    const loginHref = `/login?redirect=${encodeURIComponent(
      withLocalePath(
        `/payment/via/return?registrationId=${registrationId}`,
        locale
      )
    )}`;
    return (
      <PageSection className="py-12 sm:py-16">
        <ReturnCard
          icon={<LogIn className="size-8" aria-hidden />}
          title={t("checkout.ticket.via.loginTitle")}
          body={t("checkout.ticket.via.loginBody")}
        >
          <ReturnActions>
            <LocalizedLink
              href={loginHref}
              className={buttonStyles({ variant: "primary" })}
            >
              {t("checkout.ticket.via.loginCta")}
            </LocalizedLink>
          </ReturnActions>
        </ReturnCard>
      </PageSection>
    );
  }

  if (confirm.isSuccess) {
    return (
      <PageSection className="py-12 sm:py-16">
        <ConfirmationResult
          result={confirm.data}
          onRetry={() => void confirm.refetch()}
        />
      </PageSection>
    );
  }

  if (confirm.isError) {
    return (
      <PageSection className="py-12 sm:py-16">
        <ReturnCard
          icon={<XCircle className="size-8" aria-hidden />}
          title={t("checkout.ticket.via.errorTitle")}
          body={t("checkout.ticket.via.errorBody")}
        >
          <ReturnActions>
            <Button variant="primary" onClick={() => void confirm.refetch()}>
              {t("checkout.ticket.via.recheck")}
            </Button>
          </ReturnActions>
        </ReturnCard>
      </PageSection>
    );
  }

  return (
    <PageSection>
      <VerifyingState />
    </PageSection>
  );
}

function ViaReturnFallback(): React.ReactNode {
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

export default function ViaReturnPage(): React.ReactNode {
  const t = useT();

  return (
    <section
      className="min-h-screen w-full"
      aria-label={t("checkout.ticket.via.returnMetaTitle")}
      style={{
        background:
          "linear-gradient(180deg, var(--ember-50) 0%, rgba(255,255,255,0) 100%)",
      }}
    >
      <Suspense fallback={<ViaReturnFallback />}>
        <ViaReturnContent />
      </Suspense>
    </section>
  );
}
