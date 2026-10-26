/**
 * Social sign-in (Google / LinkedIn) — parity with the web login.
 *
 * Flow: open the backend's `/auth/<provider>?platform=mobile` endpoint in an
 * in-app browser (ASWebAuthenticationSession on iOS, Custom Tab on Android).
 * The backend runs the full OAuth dance server-side and redirects back to the
 * app's deep link with a short-lived, single-use code. The code is exchanged
 * over POST, so bearer tokens never appear in browser history or redirect URLs.
 *
 * The OAuth provider console configs are unchanged — providers still redirect
 * to the API callback; only the API's final redirect targets the app scheme
 * (added additively behind `?platform=mobile`). NOTE: the deep-link return is a
 * native standalone/dev-build feature; in Expo Go and the web preview the round
 * trip does not complete.
 *
 * expo-web-browser is bundled with the Expo runtime (works in Expo Go, no dev
 * build — like expo-camera); it is intentionally not in package.json yet (see
 * the vendored-deps follow-up), imported via the workspace node_modules.
 */
import * as WebBrowser from "expo-web-browser";

import { env } from "@shared/config/env";
import { apiTransport } from "@shared/api/transport";

export type OAuthProvider = "google" | "linkedin";

export interface OAuthResultTokens {
  accessToken: string;
  refreshToken: string;
  isOnboardingCompleted: boolean;
  isNewUser: boolean;
}

/** Must match the API's hardcoded MOBILE_OAUTH_REDIRECT and app.config scheme. */
const RETURN_URL = "eventflow://auth/callback";

/** Dismiss any lingering auth session view (recommended once on app start). */
export function warmUpOAuth(): void {
  void WebBrowser.warmUpAsync();
}

/**
 * Runs the provider OAuth flow. Resolves with tokens on success, or `null` when
 * the user cancels/dismisses the browser or the redirect carried no tokens.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
): Promise<OAuthResultTokens | null> {
  const authUrl = `${env.apiUrl}/api/v1/auth/${provider}?type=user&platform=mobile`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, RETURN_URL);
  if (result.type !== "success" || !result.url) return null;
  const code = new URL(result.url).searchParams.get("code");
  if (!code) return null;
  return apiTransport<OAuthResultTokens>({
    method: "POST",
    url: "/api/v1/auth/oauth/mobile/exchange",
    data: { code },
    skipAuth: true,
  });
}
