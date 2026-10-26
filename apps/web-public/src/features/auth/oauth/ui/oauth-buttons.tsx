"use client";

/**
 * OAuth кнопки для авторизации через Google и LinkedIn
 */

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@shared/ui/button";

import { getEnabledOAuthProviders } from "../model/provider-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const OAUTH_BASE_PATH = "/api/v1/auth";
const ENABLED_PROVIDERS = getEnabledOAuthProviders();

/** URL, на который бэкенд должен редиректить после OAuth (eventflow.uz или app.eventflow.uz) */
const getRedirectUrl = (): string =>
  typeof window !== "undefined"
    ? window.location.origin
    : "";

/**
 * Типы пользователя для OAuth
 */
type OAuthUserType = "user" | "organization";

interface OAuthButtonsProps {
  /**
   * Тип пользователя для OAuth (по умолчанию "user")
   */
  type?: OAuthUserType;
  /**
   * Отключить кнопки
   */
  disabled?: boolean;
}

/**
 * Google Logo SVG Component
 */
const GoogleLogo = (): React.JSX.Element => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * LinkedIn Logo SVG Component
 */
const LinkedInLogo = (): React.JSX.Element => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      fill="#0A66C2"
    />
  </svg>
);

/**
 * OAuth кнопки для авторизации
 *
 * @example
 * // Для пользователей (по умолчанию)
 * <OAuthButtons />
 *
 * @example
 * // Для организаций
 * <OAuthButtons type="organization" />
 */
export function OAuthButtons({
  type = "user",
  disabled = false,
}: OAuthButtonsProps): React.JSX.Element {
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "linkedin" | null
  >(null);

  if (ENABLED_PROVIDERS.length === 0) {
    return <></>;
  }

  /**
   * Обработчик OAuth авторизации через Google
   */
  const handleGoogleAuth = (): void => {
    setLoadingProvider("google");
    const redirectUrl = getRedirectUrl();
    const params = new URLSearchParams({ type });
    if (redirectUrl) params.set("redirectUrl", redirectUrl);
    window.location.href = `${API_URL}${OAUTH_BASE_PATH}/google?${params.toString()}`;
  };

  /**
   * Обработчик OAuth авторизации через LinkedIn
   */
  const handleLinkedInAuth = (): void => {
    setLoadingProvider("linkedin");
    const redirectUrl = getRedirectUrl();
    const params = new URLSearchParams({ type });
    if (redirectUrl) params.set("redirectUrl", redirectUrl);
    window.location.href = `${API_URL}${OAUTH_BASE_PATH}/linkedin?${params.toString()}`;
  };

  const isLoading = loadingProvider !== null;

  return (
    <div
      className={`grid gap-3 ${
        ENABLED_PROVIDERS.length > 1
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1"
      }`}
    >
      {ENABLED_PROVIDERS.includes("google") ? (
        <Button
          variant="secondary"
          size="lg"
          onClick={handleGoogleAuth}
          disabled={disabled || isLoading}
          leftIcon={
            loadingProvider === "google" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleLogo />
            )
          }
          className="w-full"
        >
          Google
        </Button>
      ) : null}
      {ENABLED_PROVIDERS.includes("linkedin") ? (
        <Button
          variant="secondary"
          size="lg"
          onClick={handleLinkedInAuth}
          disabled={disabled || isLoading}
          leftIcon={
            loadingProvider === "linkedin" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LinkedInLogo />
            )
          }
          className="w-full"
        >
          LinkedIn
        </Button>
      ) : null}
    </div>
  );
}
