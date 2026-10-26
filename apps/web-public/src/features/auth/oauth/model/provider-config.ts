export type OAuthProvider = "google" | "linkedin";

const KNOWN_PROVIDERS: OAuthProvider[] = ["google", "linkedin"];

export function getEnabledOAuthProviders(): OAuthProvider[] {
  const configuredProviders = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS?.trim();

  if (configuredProviders) {
    const parsedProviders = configuredProviders
      .split(",")
      .map((provider) => provider.trim().toLowerCase())
      .filter((provider): provider is OAuthProvider =>
        KNOWN_PROVIDERS.includes(provider as OAuthProvider),
      );

    return Array.from(new Set(parsedProviders));
  }

  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return [...KNOWN_PROVIDERS];
}

export function hasEnabledOAuthProviders(): boolean {
  return getEnabledOAuthProviders().length > 0;
}
