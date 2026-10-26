"use client";

import { useEffect, useState } from "react";

import type { ReadonlyURLSearchParams } from "next/navigation";

export interface OAuthPayload {
  isReady: boolean;
  cookieSession: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  isOnboardingCompleted: string | null;
}

export function useOAuthPayload(
  searchParams: ReadonlyURLSearchParams
): OAuthPayload {
  const [oauthPayload, setOAuthPayload] = useState<OAuthPayload>({
    isReady: false,
    cookieSession: false,
    accessToken: null,
    refreshToken: null,
    isOnboardingCompleted: null,
  });

  // eslint-disable-next-line no-restricted-syntax -- URL fragment parsing and history sanitization require a browser-side effect.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
    const queryParams = currentUrl.searchParams;

    const accessToken =
      hashParams.get("accessToken") ?? queryParams.get("accessToken");
    const refreshToken =
      hashParams.get("refreshToken") ?? queryParams.get("refreshToken");
    const isOnboardingCompleted =
      hashParams.get("isOnboardingCompleted") ??
      queryParams.get("isOnboardingCompleted");

    const shouldSanitizeUrl =
      currentUrl.hash.length > 0 ||
      queryParams.has("accessToken") ||
      queryParams.has("refreshToken") ||
      queryParams.has("isOnboardingCompleted") ||
      queryParams.has("isNewUser");

    if (shouldSanitizeUrl) {
      queryParams.delete("accessToken");
      queryParams.delete("refreshToken");
      queryParams.delete("isOnboardingCompleted");
      queryParams.delete("isNewUser");

      const sanitizedSearch = queryParams.toString();
      const sanitizedUrl = `${currentUrl.pathname}${sanitizedSearch ? `?${sanitizedSearch}` : ""}`;
      window.history.replaceState(window.history.state, "", sanitizedUrl);
    }

    setOAuthPayload({
      isReady: true,
      cookieSession: queryParams.get("oauth") === "success",
      accessToken,
      refreshToken,
      isOnboardingCompleted,
    });
  }, [searchParams]);

  return oauthPayload;
}
