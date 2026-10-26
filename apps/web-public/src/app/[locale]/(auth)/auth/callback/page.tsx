"use client";

/**
 * OAuth Callback Page
 * Обрабатывает редирект от backend после OAuth авторизации (Google/LinkedIn)
 *
 * URL параметры: accessToken, refreshToken, isOnboardingCompleted (см. docs/ONBOARDING_COMPLETED_FIELD.md)
 */

import { Suspense } from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { useRouter, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { useLocale, useT } from "@eventflow/i18n/react";
import { withLocalePath } from "@shared/lib/i18n-routing";

import { useOAuthCallback } from "./useOAuthCallback";
import { useOAuthPayload } from "./useOAuthPayload";

/**
 * Внутренний компонент с логикой callback
 * Вынесен отдельно для использования useSearchParams внутри Suspense
 */
function CallbackHandler(): React.JSX.Element {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthPayload = useOAuthPayload(searchParams);

  const errorParam = searchParams.get("error");

  useOAuthCallback({
    isReady: oauthPayload.isReady,
    cookieSession: oauthPayload.cookieSession,
    accessToken: oauthPayload.accessToken,
    refreshToken: oauthPayload.refreshToken,
    isOnboardingCompleted: oauthPayload.isOnboardingCompleted,
  });

  // Обработка ошибки OAuth
  if (errorParam) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger-soft)]">
          <svg
            className="h-8 w-8 text-[var(--danger)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-ink-400">
          {t("public.auth.oauth.errorTitle")}
        </h2>
        <p className="mb-6 text-ink-100">
          {errorParam === "oauth_failed"
            ? t("public.auth.oauth.failedDescription")
            : t("public.auth.oauth.genericError", { error: errorParam })}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-ember-400 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-ember-500"
        >
          {t("public.auth.oauth.backToLogin")}
        </Link>
      </div>
    );
  }

  if (!oauthPayload.isReady) {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-ember-400" />
        <p className="mt-4 text-ink-100">{t("public.auth.oauth.preparing")}</p>
      </div>
    );
  }

  // Проверяем наличие токенов
  if (
    !oauthPayload.cookieSession &&
    (!oauthPayload.accessToken || !oauthPayload.refreshToken)
  ) {
    // Редирект на логин с ошибкой
    if (typeof window !== "undefined") {
      router.replace(withLocalePath("/login?error=oauth_failed", locale));
    }
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-ember-400" />
        <p className="mt-4 text-ink-100">
          {t("public.auth.oauth.redirecting")}
        </p>
      </div>
    );
  }

  // Обработка OAuth callback в процессе
  return (
    <div className="text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-ember-400" />
      <p className="mt-4 text-lg font-medium text-ink-400">
        {t("public.auth.oauth.completing")}
      </p>
      <p className="mt-2 text-sm text-ink-100">
        {t("public.auth.oauth.pleaseWait")}
      </p>
    </div>
  );
}

/**
 * OAuth Callback Page
 */
export default function AuthCallbackPage(): React.JSX.Element {
  const t = useT();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.08),transparent_50%)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-80"
          >
            <Image
              src="/assets/logo.svg"
              alt="EVENTFLOW"
              width={160}
              height={42}
              priority
              className="mx-auto"
            />
          </Link>
        </div>

        <div className="rounded-xl border border-bone-300/60 bg-white p-8 shadow-lg">
          <Suspense
            fallback={
              <div className="text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-ember-400" />
                <p className="mt-4 text-ink-100">{t("common.loading")}</p>
              </div>
            }
          >
            <CallbackHandler />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
