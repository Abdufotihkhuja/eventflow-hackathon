# OAuth integration guide

## Backend contract

- Provider redirect URIs point to the API host under `/api/v1/auth`.
- Web success writes Secure HttpOnly access/refresh cookies plus a signed CSRF
  cookie, then redirects with non-secret onboarding metadata only.
- Mobile success issues a random single-use exchange code. The encrypted token
  payload has a two-minute TTL and is consumed through
  `POST /api/v1/auth/oauth/mobile/exchange`.
- OAuth `state` is nonce-bound to a one-use HttpOnly cookie.

Never introduce access or refresh tokens into a redirect URL. The public client
may still parse the historical format solely for deployed-client compatibility.
