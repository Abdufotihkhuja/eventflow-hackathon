# API Surfaces

EventFlow still uses one backend application and one OpenAPI document, but the contract is already segmented into future-ready surfaces:

- `@eventflow/api-contracts` public surface: [public.ts](../packages/api-contracts/src/public.ts)
- `@eventflow/api-contracts` account surface: [account.ts](../packages/api-contracts/src/account.ts)
- `@eventflow/api-contracts` workspace surface: [workspace.ts](../packages/api-contracts/src/workspace.ts)
- `@eventflow/api-contracts` admin surface: [admin.ts](../packages/api-contracts/src/admin.ts)

## Public API

Anonymous and public-facing endpoints:

- public event catalog and event detail pages
- public organizations and blog surfaces
- public media URLs
- verification and public certificate flows

Client package:

- [sdk-public](../packages/sdk-public/src/index.ts)

## Account API

Authenticated person-centric surface for future mobile and account web flows:

- `GET /api/v1/session/me`
- `GET/PATCH/DELETE /api/v1/account/me`
- `POST/DELETE /api/v1/account/me/avatar`
- `PATCH /api/v1/account/me/privacy`
- `GET /api/v1/account/me/export`
- `POST /api/v1/account/me/complete-onboarding`
- `POST /api/v1/account/me/complete-profile-info`
- `GET /api/v1/account/me/calendar`
- `GET /api/v1/account/me/calendar/events`
- `GET|POST|PATCH|DELETE /api/v1/account/me/certificates/*`
- `GET|POST|DELETE /api/v1/account/me/articles/*`
- `GET /api/v1/account/me/events`
- `GET /api/v1/account/me/events/stats`
- account/session bootstrap
- person-oriented authenticated flows that should not depend on workspace UI semantics

Client package:

- [sdk-account](../packages/sdk-account/src/index.ts)

## Workspace API

Organizer and member operations:

- `GET/PATCH/DELETE /api/v1/workspace/me`
- `POST/DELETE /api/v1/workspace/me/logo`
- `POST /api/v1/workspace/me/complete-onboarding`
- `POST /api/v1/workspace/me/complete-company-info`
- `GET/PATCH /api/v1/workspace/members/me`
- `PATCH /api/v1/workspace/members/me/privacy`
- `POST/DELETE /api/v1/workspace/members/me/avatar`
- `POST /api/v1/workspace/members/me/complete-onboarding`
- `GET /api/v1/workspace/members/me/permissions`
- events
- registrations
- tickets
- certificates
- uploads

Client package:

- [sdk-workspace](../packages/sdk-workspace/src/index.ts)

## Admin API

Platform-admin operations remain on the same backend URLs, but are isolated as their own contract surface:

- `/api/v1/super-admin/*`
- categories
- collections
- verification codes
- system stats

Client package:

- [sdk-admin](../packages/sdk-admin/src/index.ts)

## Why This Is Mobile-Ready

The backend is still a modular monolith, but the following pieces are already in place for a mobile client:

- one source of truth contract via OpenAPI
- segmented generated contracts by surface
- dedicated `account` SDK surface
- account-centric session model through `GET /api/v1/session/me`
- account-owned personal endpoints under `/api/v1/account/me/*`
