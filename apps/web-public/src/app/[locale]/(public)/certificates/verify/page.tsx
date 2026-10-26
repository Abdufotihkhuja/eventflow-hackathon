"use client";

import { useCallback, useState, Suspense } from "react";

import { useSearchParams } from "next/navigation";

import { useMutation } from "@tanstack/react-query";
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  QrCode,
  User,
  XCircle,
} from "lucide-react";

import { useT } from "@eventflow/i18n/react";
import { certificatesService } from "@shared/api";
import { formatUtcToLocalDate } from "@shared/lib/date";
import { useVerifyCertificateOnCode } from "@shared/lib/hooks";
import { cn, resolveMediaUrl } from "@shared/lib/utils";
import { Button, Input, PageSection } from "@shared/ui";

import type {
  CertificateVerifyPayload,
  VerifyCertificateResponse,
} from "@shared/api";

function formatCertificateDate(dateStr: string): string {
  return formatUtcToLocalDate(dateStr, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// --- Успешная верификация: белая карточка, чёрный и оранжевый текст ---
function VerifyResultValid({
  certificate,
}: {
  certificate: CertificateVerifyPayload;
}) {
  const t = useT();

  return (
    <article
      className={cn(
        "relative mx-auto max-w-lg overflow-hidden rounded-xl",
        "border border-bone-300 bg-white",
        "shadow-[0_2px_8px_rgba(24,24,27,0.06),0_0_0_1px_rgba(24,24,27,0.04)]",
        "dark:border-bone-400 dark:bg-white dark:shadow-lg"
      )}
      aria-labelledby="verify-result-heading"
      aria-describedby="verify-result-desc"
    >
      <div className="p-8 sm:p-10">
        <div className="mb-6 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <div
            className={cn(
              "mb-4 flex size-16 shrink-0 items-center justify-center rounded-xl",
              "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500",
              "sm:mb-0 sm:mr-5"
            )}
          >
            <CheckCircle2 className="size-9" aria-hidden />
          </div>
          <div className="flex-1">
            <span
              className={cn(
                "inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                "bg-ember-400 text-white dark:bg-ember-400 dark:text-white"
              )}
            >
              {t("public.certificates.verify.validBadge")}
            </span>
            <h2
              id="verify-result-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-ink-400 dark:text-ink-400 sm:text-xl"
            >
              {t("public.certificates.verify.validTitle")}
            </h2>
            <p
              id="verify-result-desc"
              className="mt-1 text-sm text-ink-100 dark:text-ink-100"
            >
              {t("public.certificates.verify.checkedBy")}
            </p>
          </div>
        </div>

        <dl className="space-y-4 border-t border-bone-300 pt-6 dark:border-bone-300">
          <div className="flex gap-4">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
              )}
            >
              <Calendar className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-ink-100 dark:text-ink-100">
                {t("public.certificates.verify.event")}
              </dt>
              <dd className="mt-0.5 font-semibold text-ink-400 dark:text-ink-400">
                {certificate.eventName.trim()}
              </dd>
            </div>
          </div>
          <div className="flex gap-4">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
              )}
            >
              <User className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-ink-100 dark:text-ink-100">
                {t("public.certificates.verify.participant")}
              </dt>
              <dd className="mt-0.5 font-semibold text-ink-400 dark:text-ink-400">
                {certificate.recipientName}
              </dd>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
                )}
              >
                <Calendar className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-100 dark:text-ink-100">
                  {t("public.certificates.verify.issuedAt")}
                </dt>
                <dd className="mt-0.5 text-ink-200 dark:text-ink-200">
                  {formatCertificateDate(certificate.issuedAt)}
                </dd>
              </div>
            </div>
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
                )}
              >
                <Calendar className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-100 dark:text-ink-100">
                  {t("public.certificates.verify.eventDate")}
                </dt>
                <dd className="mt-0.5 text-ink-200 dark:text-ink-200">
                  {formatCertificateDate(certificate.eventDate)}
                </dd>
              </div>
            </div>
          </div>

          {certificate.organizerName && (
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl",
                  "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
                )}
              >
                {certificate.organizerLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(certificate.organizerLogoUrl) ?? ""}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <Building2 className="size-5" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-100 dark:text-ink-100">
                  {t("public.certificates.verify.organizer")}
                </dt>
                <dd className="mt-0.5 font-semibold text-ink-400 dark:text-ink-400">
                  {certificate.organizerName}
                </dd>
              </div>
            </div>
          )}

          {certificate.recipientRole && (
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
                )}
              >
                <Award className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-100 dark:text-ink-100">
                  {t("public.certificates.verify.recipientRole")}
                </dt>
                <dd className="mt-0.5 text-ink-200 dark:text-ink-200">
                  {certificate.recipientRole}
                </dd>
              </div>
            </div>
          )}

          {certificate.eventLocation && (
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
                )}
              >
                <MapPin className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wider text-ink-100 dark:text-ink-100">
                  {t("public.certificates.verify.location")}
                </dt>
                <dd className="mt-0.5 text-ink-200 dark:text-ink-200">
                  {certificate.eventLocation}
                </dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}

// --- Неуспешная верификация: белая карточка, чёрный и оранжевый текст ---
function VerifyResultInvalid() {
  const t = useT();

  return (
    <article
      className={cn(
        "mx-auto max-w-md overflow-hidden rounded-xl",
        "border border-bone-300 bg-white shadow-[0_2px_8px_rgba(24,24,27,0.06)]",
        "dark:border-bone-400 dark:bg-white dark:shadow-lg",
        "p-6 sm:p-8"
      )}
      aria-labelledby="verify-invalid-heading"
    >
      <div className="flex gap-4">
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-xl",
            "bg-ember-50 text-ember-500 dark:bg-ember-50 dark:text-ember-500"
          )}
        >
          <XCircle className="size-8" aria-hidden />
        </div>
        <div>
          <h2
            id="verify-invalid-heading"
            className="text-xl font-bold text-ink-400 dark:text-ink-400"
          >
            {t("public.certificates.verify.notFoundTitle")}
          </h2>
          <p className="mt-2 text-sm text-ink-100 dark:text-ink-100">
            {t("public.certificates.verify.notFoundDescription")}
          </p>
        </div>
      </div>
    </article>
  );
}

// --- Ошибка сети: белая карточка ---
function VerifyResultError({ onRetry }: { onRetry: () => void }) {
  const t = useT();

  return (
    <article
      className={cn(
        "mx-auto max-w-md overflow-hidden rounded-xl",
        "border border-bone-300 bg-white p-6 shadow-[0_2px_8px_rgba(24,24,27,0.06)]",
        "dark:border-bone-400 dark:bg-white dark:shadow-lg"
      )}
    >
      <p className="text-ink-200 dark:text-ink-200">
        {t("public.certificates.verify.networkError")}
      </p>
      <Button
        variant="primary"
        className="mt-5 rounded-xl focus-visible:ring-2 focus-visible:ring-ember-300 focus-visible:ring-offset-2"
        onClick={onRetry}
      >
        {t("actions.retry")}
      </Button>
    </article>
  );
}

// --- Форма ввода кода (нет code в URL) ---
function VerifyNoCodeForm({
  manualCode,
  setManualCode,
  onSubmit,
  isSubmitting,
}: {
  manualCode: string;
  setManualCode: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const t = useT();

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-8 flex flex-col items-center text-center">
        <div
          className={cn(
            "mb-5 flex size-20 items-center justify-center rounded-xl",
            "bg-ember-50 text-ember-500 dark:bg-ember-400/25 dark:text-ember-300"
          )}
        >
          <QrCode className="size-11" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-400 dark:text-white sm:text-3xl">
          {t("public.certificates.verify.formTitle")}
        </h1>
        <p className="mt-3 max-w-sm text-ink-100 dark:text-ink-50">
          {t("public.certificates.verify.formDescription")}
        </p>
      </header>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
        aria-label={t("public.certificates.verify.formAria")}
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="verify-code"
            className="text-sm font-semibold text-ink-200 dark:text-bone-400"
          >
            {t("public.certificates.verify.codeLabel")}
          </label>
          <Input
            id="verify-code"
            type="text"
            placeholder={t("public.certificates.verify.codePlaceholder")}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            aria-describedby="verify-hint"
            autoComplete="off"
            className="rounded-xl"
          />
          <p
            id="verify-hint"
            className="text-xs text-ink-100 dark:text-ink-50"
          >
            {t("public.certificates.verify.codeHint")}
          </p>
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={!manualCode.trim() || isSubmitting}
          className="rounded-xl focus-visible:ring-2 focus-visible:ring-ember-300 focus-visible:ring-offset-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              {t("public.certificates.verify.checking")}
            </>
          ) : (
            t("public.certificates.verify.check")
          )}
        </Button>
      </form>
    </div>
  );
}

// --- Загрузка ---
function VerifyLoading() {
  const t = useT();

  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-16"
      role="status"
      aria-live="polite"
      aria-label={t("public.certificates.verify.loadingAria")}
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
        {t("public.certificates.verify.loadingTitle")}
      </p>
      <p className="text-sm text-ink-100 dark:text-ink-50">
        {t("public.certificates.verify.loadingDescription")}
      </p>
    </div>
  );
}

function VerifyCertificateContent(): React.ReactNode {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code")?.trim() ?? "";
  const [manualCode, setManualCode] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: { code?: string; certificateId?: string }) =>
      certificatesService.verifyCertificatePublic(payload),
  });

  const runVerify = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      mutation.mutate({ code: trimmed });
    },
    [mutation]
  );

  useVerifyCertificateOnCode(codeFromUrl, runVerify);

  const _hasCode = Boolean(codeFromUrl || manualCode.trim());
  const codeToUse = codeFromUrl || manualCode.trim();

  if (codeToUse && mutation.isPending) {
    return (
      <PageSection>
        <VerifyLoading />
      </PageSection>
    );
  }

  if (codeToUse && mutation.isSuccess) {
    const res = mutation.data as VerifyCertificateResponse;
    if (res.valid && res.certificate) {
      return (
        <PageSection className="py-12 sm:py-16">
          <VerifyResultValid certificate={res.certificate} />
        </PageSection>
      );
    }
    return (
      <PageSection className="py-12 sm:py-16">
        <VerifyResultInvalid />
      </PageSection>
    );
  }

  if (codeToUse && mutation.isError) {
    return (
      <PageSection className="py-12 sm:py-16">
        <VerifyResultError onRetry={() => runVerify(codeToUse)} />
      </PageSection>
    );
  }

  return (
    <PageSection className="py-12 sm:py-20">
      <VerifyNoCodeForm
        manualCode={manualCode}
        setManualCode={setManualCode}
        onSubmit={() => runVerify(manualCode)}
        isSubmitting={mutation.isPending}
      />
    </PageSection>
  );
}

function VerifyFallback(): React.ReactNode {
  const t = useT();

  return (
    <PageSection>
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-12 animate-spin text-ember-400" aria-hidden />
        <p className="text-ink-100 dark:text-ink-50">
          {t("common.loading")}
        </p>
      </div>
    </PageSection>
  );
}

export default function CertificateVerifyPage(): React.ReactNode {
  const t = useT();

  return (
    <section
      className="min-h-screen w-full"
      aria-label={t("public.certificates.verify.pageAria")}
      style={{
        background:
          "linear-gradient(180deg, var(--ember-50) 0%, rgba(255,255,255,0) 100%)",
      }}
    >
      <Suspense fallback={<VerifyFallback />}>
        <VerifyCertificateContent />
      </Suspense>
    </section>
  );
}
