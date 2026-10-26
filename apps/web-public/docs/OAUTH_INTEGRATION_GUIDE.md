# OAuth integration guide

## Current transport contract

- Google and LinkedIn OAuth support personal users only.
- Provider callbacks target the API host, for example
  `https://api.eventflow.uz/api/v1/auth/google/callback`.
- A web callback writes Secure HttpOnly access/refresh cookies and redirects to
  `/auth/callback?oauth=success&isOnboardingCompleted=<boolean>`.
- The public callback bootstraps the readable CSRF value through
  `GET /api/v1/auth/web/csrf`; bearer credentials are not placed in a new URL.
- A native callback redirects to `eventflow://auth/callback?code=<opaque-code>`.
  The app exchanges the single-use, two-minute code at
  `POST /api/v1/auth/oauth/mobile/exchange`.

Legacy URL token parsing remains only for already-deployed clients. Do not add
new query- or fragment-based access/refresh token redirects.

## Routing

- `isOnboardingCompleted=true` routes to the personal application.
- `false` routes to `/complete-profile`.
- `isNewUser=true` is optional metadata and is not an authorization signal.
