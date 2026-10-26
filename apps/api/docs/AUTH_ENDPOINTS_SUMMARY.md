# Auth endpoints summary

## Current client paths

- Personal native/API registration: `POST /api/v1/auth/user/register`.
- Personal web registration: `POST /api/v1/auth/web/register`, returning no
  bearer credentials and writing host-only HttpOnly cookies.
- Web refresh/logout: `/api/v1/auth/web/refresh` and `/web/logout`, protected by
  exact-Origin signed double-submit CSRF.
- Web CSRF bootstrap: `GET /api/v1/auth/web/csrf`.
- Mobile OAuth exchange: `POST /api/v1/auth/oauth/mobile/exchange` with a
  single-use two-minute code.
- Legacy organization registration: compatibility route with sticky deny.
- Organization creation: audited super-admin provisioning only.

Email is not an identity key. Every authenticated command resolves the live
Account and selected scope; client version or actor type does not bypass policy.
