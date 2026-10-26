# Auth Session Model

EventFlow uses an account-centric session model.

## Primary Session Bootstrap

All new clients should treat this endpoint as the primary authenticated bootstrap:

- `GET /api/v1/session/me`

The response is the canonical session read model and returns:

- `currentAccount`
- `activeWorkspace`
- `memberships[]`
- `platformRole?`
- `actorType`

## Current Profile Surfaces

Authenticated profile surfaces currently exposed by the platform:

- `GET /api/v1/account/me`
- `GET /api/v1/workspace/me`

These surfaces carry domain-specific profile data, while `/api/v1/session/me`
is the canonical session entrypoint for deciding which surface to read next.

## Login Endpoints

Current login endpoints:

- `POST /api/v1/auth/user/login`
- `POST /api/v1/auth/organization/login`
- `POST /api/v1/auth/member/login`
- `POST /api/v1/auth/superadmin/login`

After login or refresh, web clients should bootstrap from `GET /api/v1/session/me`.

## Session Payload Rules

JWTs may carry account-centric metadata when available:

- `accountId`
- `actorKind`
- `activeWorkspaceId`
- `platformRole`

Client applications should prefer the session read model over token-derived branching.

## Current Limitation

`Organization` is still the system-of-record business entity and also serves as
the current `activeWorkspace` read-model source.

That is intentional for this cycle. A dedicated `Workspace` table is explicitly
postponed until after launch to avoid a risky rewrite.
