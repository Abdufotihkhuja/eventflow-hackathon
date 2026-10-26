# MOBILE_API.md — EventFlow participant app contract (Stage 2)

> **Status:** FINAL (Stage-2 contract, frozen for Stage 3). Reconciled against the code actually shipped on branch `feat/mobile-api-participant`.
> **Audience:** the mobile engineer building the Expo / React Native **participant** app in Stage 3.
> **Scope:** participant (attendee) surface only — Discover, EventDetail, Register-free, Tickets, Certificates, Profile, Organizer, Auth. Organizer/workspace and super-admin surfaces are out of scope even where the SDK exposes them (e.g. `public.organizations.getMe/updateMe`, `account.certificates.createCertificate/updateCertificate/deleteCertificate`).

### Stage-2 backend status (what landed in this branch)

**Shipped & tested (contract is live):**
- **SDK wrappers added** so every participant call exists in the SDK — `sdk-public`: `auth.login`, `verification.{sendCode,verifyEmail,resendCode,resetPassword}`, `events.{getComments,postComment,likeComment,downloadMaterial}`, `categories.list`, `collections.{list,getById,getBySlug}`; `sdk-account`: `followingOrganizations.{follow,unfollow,isFollowing}`. (`events.canRegister`, registrations, certificates, profile, savedEvents already existed.)
- **Discover list geo+price** — `PublicEventItemDto` now returns `price, currency, venue, latitude, longitude` (additive; no migration).
- **Typed responses** for categories / collections / event-comments (were `unknown`; now real DTOs so the SDK is typed end-to-end).
- **Security (contract-relevant) landed:** public cert verify no longer returns `recipientEmail` (PII); register conflict is now a single non-enumerating message; `trust proxy` is bounded (`TRUST_PROXY_HOPS`, default 1) instead of `true`.
- **Contract regenerated** (`openapi.ts` refreshed from live controllers; the PLAN §1.2 "may be stale" caveat is resolved for this branch). `api-contracts` + both SDKs type-check clean; full API suite **561/561** green; tenant-guard ratchet green.

**Deferred to a named follow-up (does NOT change the contract below):** the heavier live-auth hardening — refresh-token hashing at rest, atomic rotation + reuse-detection, OTP brute-force lockout — and native OAuth deep-link (A5). Tracked in [`docs/participant-auth-hardening.md`](docs/participant-auth-hardening.md); must land before production participant traffic. Mobile builds against the auth contract as documented; these are internal and shape-stable.

## Preamble

**The SDK is the sole data layer.** The app talks to the backend **only** through the generated SDKs and the `ApiTransport` contract:

| Package | Role |
|---|---|
| `@eventflow/sdk-public` | `createPublicSdk(transport)` → auth, verification, events (+ comments/materials), categories, collections, registrations, public cert verify, public org profile, profile-options |
| `@eventflow/sdk-account` | `createAccountSdk(transport)` → account/me, certificates, saved-events, following-organizations, user-events, calendar, articles, saved-blog-posts, session |
| `@eventflow/api-contracts` | `ApiTransport` interface + the generated OpenAPI types every SDK method is typed against |

**No hand-rolled `fetch`/`axios` anywhere in `app/` or `shared/`.** If a screen needs a call the SDK does not expose, that is **contract drift** — STOP and report it (see §5). Do not bypass the SDK.

**The app implements ONE thing: the `ApiTransport`** (`packages/api-contracts/src/runtime.ts`):

```ts
interface ApiTransportRequest<TBody> {
  method: ApiMethod; url: string; params?: Record<string, unknown>;
  data?: TBody; headers?: Record<string, string>;
  skipAuth?: boolean; responseType?: 'json' | 'blob' | 'text';
}
type ApiTransport = <TResponse, TBody>(req: ApiTransportRequest<TBody>) => Promise<TResponse>;
```

The transport prepends the absolute API base URL, attaches the `Authorization: Bearer <access>` header unless `skipAuth` is set, handles the 401→refresh→retry-once cycle (§1), honors `responseType:'blob'` for PDFs, and `unwrapApiPayload` (exported from `api-contracts`) on JSON responses (envelopes vs paginated lists are auto-detected). `url` paths are already prefixed `/api/v1/...` by the SDK.

**Pin policy.** The app pins all three `@eventflow/*` packages to the **workspace version** (file/workspace dependency, exact match — not a semver range). Contracts, SDK, and the API are generated together; a version skew = silent type lies. See §5.

**Two deferred surfaces (Gate-1, binding — PLAN §0).** Both are deferred to named P2 milestones, never silently cut:

1. **PAYMENTS → P2 `payments-v1`.** No payment module exists in the backend. The app ships **RegisterFree end-to-end** and **gates `EventType.PAID` out of the Register CTA** (read-only "Tickets on web" / hide button) so no user reaches an unbacked flow. All payment/waitlist states are deferred with the backend (§3).
2. **PHONE OTP → P2 `auth-otp-v1`.** The design's 6-digit phone-OTP screen is **dropped**. Auth = **email/password + email verification** (a fully-backed drop-in; no participant capability lost). The OTP-retry interaction is dropped with the screen.

**UZS formatting.** Money amounts (`price`) are **integers in UZS**; there is **no server-formatted string**. The client formats (`priceLabel()`), e.g. `240000 → "240 000 UZS"`. `currency` is `'UZS'` (or `null` for free). `type === 'FREE'` ⇒ no price line.

**i18n.** Public localized fields accept a `locale` query param: **`'ru' | 'uz' | 'en'`** (confirmed in `PublicEventsQueryDto` and `CertificatesQuery`). The app's i18n catalog carries **uz/ru/en**; the backend public locale is restricted to those three. Pass the active app locale on every list/detail/comments/certificate call that accepts it. Where a call has no `locale` param, the server returns its default localization; the client falls back to `tx(record)` over the `translations` map embedded in the payload.

---

## 1. Auth & session

All auth lives in `sdk-public.auth` + `sdk-public.verification`. **Mobile sends and receives tokens in the JSON body** and stores them in `expo-secure-store`. The web frontends use httpOnly cookies; **mobile does NOT** — `refresh` and `logout` send the refresh token as a **request body field** (`refreshToken`), confirmed in `RefreshTokenDto` (`apps/api/src/modules/auth/dto/refresh-token.dto.ts`) and `AuthController.refreshTokens/logout` (`auth.controller.ts:295-319`). There is no cookie path for mobile.

### 1.1 Flows

| Flow | SDK method | Request DTO | Response DTO | Auth |
|---|---|---|---|---|
| Register (participant) | `public.auth.registerUser(body)` | `RegisterUserDto` `{firstName, lastName, email, password, passwordConfirm}` | `TokensResponseDto` + `emailVerificationRequired: true` | `@Public` |
| Send email code | `public.verification.sendCode(body)` | `SendVerificationCodeDto` `{email, type: VerificationCodeType}` | `{success}` *(verify)* | `@Public` |
| Verify email | `public.verification.verifyEmail(body)` | `VerifyCodeDto` `{email, code}` (code = 6 digits) | `{success}` *(verify)* | `@Public` |
| Resend code | `public.verification.resendCode(body)` | `SendVerificationCodeDto` `{email, type}` | `{success}` *(verify)* | `@Public` |
| Reset password | `public.verification.resetPassword(body)` | `ResetPasswordDto` `{email, code, newPassword}` | `{success}` *(verify)* | `@Public` |
| Login | `public.auth.login(body)` | `LoginDto` `{email, password}` | `TokensResponseDto` | `@Public` |
| Refresh | `public.auth.refresh(body)` | `RefreshTokenDto` `{refreshToken}` | `TokensResponseDto` | `@Public` |
| Logout | `public.auth.logout(body)` | `RefreshTokenDto` `{refreshToken}` | `void` (`{message}` on the wire) | `@Public` |
| Change password | `public.auth.changePassword(body)` | `ChangePasswordDto` `{currentPassword, newPassword}` *(verify field names)* | `{message}` | Bearer (USER) |

**Use `public.auth.login` (the unified `/auth/login`), NOT `loginUser`.** `login` resolves the actor by email across user/organization/legacy-staff and matches the design's single email+password screen (`auth.service.ts:198-263`). For the participant app, the resolved actor is always a `USER`. `loginUser` (`/auth/user/login`) also exists but is the legacy user-table-only path — prefer `login`.

**Password rule (client-validate before submit):** min 8 chars, ≥1 lowercase, ≥1 uppercase, ≥1 digit, ≥1 special `@$!%*?&` (`RegisterUserDto` `@Matches`). `passwordConfirm` must equal `password`.

**`VerificationCodeType` enum** (the `type` field): `EMAIL_VERIFICATION | PASSWORD_RESET | EMAIL_CHANGE` (`schema.prisma`). There is **no `LOGIN`/OTP member** — phone OTP is unbacked (§3). For sign-up email verification use `EMAIL_VERIFICATION`; for forgot-password use `PASSWORD_RESET`.

#### Examples

Register:
```jsonc
// → public.auth.registerUser
{ "firstName": "Jasur", "lastName": "Saidov", "email": "user@example.com",
  "password": "Qwer123$", "passwordConfirm": "Qwer123$" }
// ← 201
{ "accessToken": "eyJhbGc...", "refreshToken": "a3f...64hex", "emailVerificationRequired": true }
```

Verify email:
```jsonc
// → public.verification.verifyEmail
{ "email": "user@example.com", "code": "123456" }   // ← { "success": true }   (verify shape)
```

Login:
```jsonc
// → public.auth.login
{ "email": "user@example.com", "password": "Qwer123$" }
// ← 200
{ "accessToken": "eyJhbGc...", "refreshToken": "a3f...64hex" }
```

Refresh:
```jsonc
// → public.auth.refresh
{ "refreshToken": "a3f...64hex" }
// ← 200 (NEW pair — old refresh is now invalid)
{ "accessToken": "eyJ...new", "refreshToken": "b7c...new64hex" }
```

### 1.2 Token model

| Token | What it is | Lifetime | Where it lives in the response |
|---|---|---|---|
| **access** | Signed JWT (HS256), payload `{sub, type:'USER', email, accountId, actorKind, ...}` | **15m** (`auth.module.ts:29` `expiresIn:'15m'`; env `JWT_ACCESS_EXPIRATION`, default `15m`) | `TokensResponseDto.accessToken` |
| **refresh** | Opaque **64-byte hex** random string (NOT a JWT), one DB row per session | **7d** (`JWT_REFRESH_EXPIRATION`, default `7d`; `auth.service.ts:1124-1128`) | `TokensResponseDto.refreshToken` |

**Storage — `expo-secure-store` (two keys):**

| Key | Value |
|---|---|
| `ef.auth.access` | access JWT |
| `ef.auth.refresh` | refresh hex string |

*(Key names are a recommendation; today secure-store holds only `ef.lang`. Confirm final key names with the orchestrator.)*

**Rotation rules (`auth.service.ts:1020-1092`):**
- `refresh` is **single-use**: on `POST /auth/refresh` the server looks up the row, updates `lastUsedAt`, then **deletes the old row** and **issues a brand-new access+refresh pair**. The old refresh is dead after one use — the app MUST persist the new refresh from every refresh response.
- `logout` does `deleteMany({where:{token}})` — revokes that one session.
- Sessions are listable/revocable: `public.auth.getSessions()`, `terminateSession(id)`, `terminateAllSessions()` (no design screen; bonus surface; `getSessions`/`terminateAllSessions` read the current refresh from the `x-refresh-token` header — `auth.controller.ts:186,210`).

**401 handling — single-flight refresh → retry-once → logout-on-fail.** The transport implements:
1. Request returns **401** (expired/invalid access JWT).
2. A **single-flight** refresh runs (concurrent 401s share one in-flight `refresh()` promise — do not fire N refreshes).
3. On refresh success: persist the new pair, **retry the original request once** with the new access token.
4. On refresh failure (refresh expired/invalid → `401 Недействительный refresh token`, `auth.service.ts:1028-1029`): **clear both secure-store keys and route to Welcome/LogIn**. Do not loop.
5. Requests with `skipAuth:true` (all `@Public` auth/verification/discovery calls) never trigger the refresh cycle.

### 1.3 Security caveats — hardening tracked separately

The auth **contract is stable**; the following are hardening items (PLAN §6). The ones marked DEFERRED land separately (see [`docs/participant-auth-hardening.md`](docs/participant-auth-hardening.md)) and do **not** change the request/response shapes above. The mobile engineer builds against the contract as documented:

| Item | State | Note for mobile |
|---|---|---|
| Register **account enumeration** (distinct conflict messages) | **FIXED (Stage 2)** — single generic 409 "Этот email недоступен для регистрации" | The server no longer discloses account type/existence. Surface a generic "couldn't create account" on 409. |
| Public cert verify leaked `recipientEmail` | **FIXED (Stage 2 / F3)** — field removed from the response and the DB select | Verify returns name + validity + role/location only; no recipient email. |
| `trust proxy: true` (spoofable client IP) | **FIXED (Stage 2)** — bounded `TRUST_PROXY_HOPS` (default 1) | Server-side; no client change. |
| Refresh tokens stored **plaintext at rest** (server DB) | DEFERRED (hardening doc) | Server-side; no client change. Contract unchanged. |
| **No refresh reuse-detection** — rotation not atomic, no session-family revoke on replay | DEFERRED (hardening doc) | Client still treats refresh as single-use (persist the new one each time). |
| OTP/verify **brute-force lockout** (5-attempt counter resets per new code) | DEFERRED (hardening doc) | Throttle is 5/min on verify; client should debounce resend (server enforces 60s). |

---

## 2. Per-flow contracts

State legend maps every export in `app/states.jsx` (16 states) to an HTTP/SDK outcome. **DEFERRED** = the state belongs to a P2 surface (payments/waitlist) and is not built this release (§3).

### 2.0 Discover (list + EventsMap)

**Sequence:**
1. `public.events.getPublicEvents(query?: PublicEventsQuery)` → `PublicEventsResponse` (paginated).
2. (chips) `public.categories.list()` → `CategoriesResponse`.
3. (rails/collections, optional) `public.collections.list()` / `getBySlug(slug)`.

**Pagination/filtering (`PublicEventsQueryDto`):** `page` (≥1, default 1), `limit` (1–50, default 10), `search`, `city`, `cities` (comma OR-list), `format` (`EventFormat`), `type` (`EventType` — pass `FREE` to honor the paid-gate, §3), `filter` (`upcoming|past|all`, default `upcoming`), `featured` (bool), `category` (category slug), `locale` (`ru|uz|en`).

**Stage-2 list DTO geo+price (CONFIRMED).** `PublicEventItemDto` / the list select (`public.repository.ts:525-548`) now includes: `price`, `currency`, `venue`, `latitude`, `longitude` — alongside `id, slug, title, shortDescription, translations, coverImage, startDate, endDate, format, type, status, city, categories[], maxParticipants, isFeatured, organization`. **The list powers both the Discover cards (price line) AND `EventsMap` pins WITHOUT N detail fetches.** `latitude`/`longitude` are nullable (online events / no venue geo) → no pin for null coords.

**i18n / UZS:** pass `locale`; format `price` client-side (integers in UZS); `type==='FREE'` ⇒ "Free", no amount.

**State mapping:**

| State (`states.jsx`) | Outcome |
|---|---|
| `StListLoading` (`:27`) | `getPublicEvents` request pending |
| `StListEmpty` (`:30`) | **200** with empty `data: []` (no results for filters) → "No events match / Clear filters" |
| `StListError` (`:33`) | network/offline error or 5xx → Retry; filters preserved |
| `StListSuccess` (`:36`) | 200 with `data: [...]`, `total` populates the "N results" sub |

**Example:**
```jsonc
// → public.events.getPublicEvents
{ "page": 1, "limit": 10, "filter": "upcoming", "type": "FREE", "city": "Tashkent", "locale": "en" }
// ← 200
{ "data": [ { "id": "evt_…", "slug": "sunset-summit", "title": "Sunset Summit",
    "coverImage": "https://…", "startDate": "2026-07-04T15:00:00.000Z",
    "type": "FREE", "price": null, "currency": null,
    "city": "Tashkent", "venue": "Mirzo Ulugbek", "latitude": 41.31, "longitude": 69.28 } ],
  "total": 248, "page": 1, "limit": 10, "totalPages": 25 }
```

### 2.1 EventDetail (+ 6 tabs)

**Sequence:**
1. `public.events.getPublicEventById(id)` → `PublicEventResponse` **or** `public.events.getPublicEventBySlug(slug)` → `PublicEventBySlugResponse` (by-slug increments `viewsCount`). The detail payload **embeds** `speakers[]`, `agendaItems[]` (programme), venue scalar geo, description/meta/capacity, organization, and (with a Bearer token) the caller's `myRegistration`.
2. (sold-out / CTA gating) `public.events.canRegister(id)` → `CanRegisterResponse`.
3. (save) `account.savedEvents.checkSavedEvent(eventId)` → on tap `saveEvent(eventId)` / `unsaveEvent(eventId)`.
4. (follow org) `account.followingOrganizations.isFollowing(orgId)` → `follow(orgId)` / `unfollow(orgId)`.

**Tabs — data source per tab:**

| Tab | Source | SDK |
|---|---|---|
| **About** | embedded `description`, meta, capacity, who's-going | in detail payload |
| **Speakers** | embedded `speakers[]` | in detail payload (no separate call) |
| **Programme** | embedded `agendaItems[]` | in detail payload |
| **Venue** | embedded `latitude`/`longitude`/address (nullable) | in detail payload; null geo ⇒ no map pin |
| **Materials** | per-agenda-item file | `public.events.downloadMaterial(eventId, agendaItemId, fileUrl)` → **blob** (`responseType:'blob'`) |
| **Comments** | separate fetch (NOT embedded) | list `public.events.getComments(eventId, query?)`; post `postComment(eventId, body)` (Bearer); like `likeComment(eventId, commentId, body)` (Bearer) |

**`can-register` `reasonCode` values (`public.service.ts:408-420`):** `PRIVATE | NOT_PUBLISHED | DEADLINE_PASSED | CAPACITY_FULL | MANUALLY_CLOSED`. Response: `{canRegister, reason?, reasonCode?, accessType, requiresInviteCode}`. Success ⇒ `canRegister:true`, no `reasonCode`.

**State mapping:**

| State | Outcome |
|---|---|
| `StDetailLoading` (`:41`) | `getPublicEventById`/`BySlug` pending |
| `StDetailError` (`:55`) | **404** (not found) or **410 Gone** (deleted slug — `getEventBySlugForDeletedCheck`, `public.repository.ts:691`) → "This event isn't available / Back to Discover" |
| `StDetailSoldOut` (`:58`) | `canRegister` → `reasonCode === 'CAPACITY_FULL'`. **Render sold-out as TERMINAL** — the "Join waitlist" CTA is **DEFERRED** (waitlist unbacked, §3). |
| `StDetailRegistered` (`:78`) | detail payload returns a `myRegistration` (Bearer present) → "You're going", inline QR via `getQrCode`, View ticket; "Add to calendar" via `account.calendar` |

**Paid-gate (§3):** if `event.type === 'PAID'`, replace the Register CTA with a read-only "Tickets on web" (or hide it). Free path only.

**Example (detail):**
```jsonc
// → public.events.getPublicEventById("evt_123")  ← 200 (abridged)
{ "id": "evt_123", "slug": "sunset-summit", "title": "Sunset Summit",
  "type": "FREE", "price": null, "currency": null,
  "latitude": 41.31, "longitude": 69.28, "venue": "Mirzo Ulugbek",
  "speakers": [ { "id": "spk_1", "name": "…", "role": "…" } ],
  "agendaItems": [ { "id": "ag_1", "title": "Opening", "startsAt": "…" } ],
  "organization": { "id": "org_9", "name": "…" },
  "myRegistration": null }
// → public.events.canRegister("evt_123")  ← 200
{ "canRegister": true, "accessType": "PUBLIC", "requiresInviteCode": false }
```

### 2.2 Register-free

**Sequence (free events only — gate `PAID` out first):**
1. (re-check) `public.events.canRegister(eventId)` → if `!canRegister`, show the matching state (`CAPACITY_FULL`→sold-out terminal, `DEADLINE_PASSED`/`MANUALLY_CLOSED`→closed, `PRIVATE`/`requiresInviteCode`→needs invite).
2. `public.registrations.register(eventId, body: CreateRegistrationDto, options?: {inviteCode})` → `RegisterResponse`.

**Request DTO `CreateRegistrationDto`** (all optional): `answers?: [{questionId, answer}]`, `role?: ParticipantRole`, `travelStartDate?`, `travelEndDate?`, `preparationDays?` (0–30). The design's name/email/phone form fields map to **the user's profile**, not the register body — identity comes from the Bearer token (USER), not the request. Custom registration questions surface via `answers[]`. If the event carries a `FILE_UPLOAD` question, follow the pre-upload→`attachmentId` flow before submitting `answers` (PLAN §4-C1).

**Idempotency (`registrations.service.ts:110-131`):** registering twice while an active (`PENDING`/`APPROVED`) registration exists → **409 Conflict** ("Вы уже зарегистрированы"). A prior `CANCELLED`/`REJECTED` registration is **re-activated** (same row updated), so re-register is allowed only from those terminal states. Over-capacity → **400** ("Достигнут лимит участников") — guard with `canRegister` first to show sold-out instead of a raw 400. See §4.

**Response (`RegisterResponse`, `registrations.service.ts:307`):** the registration object `{id, status, qrCode, ticketNumber, ticketIssuedAt, eventId, userId, role, …}`. `status` enum: `PENDING | APPROVED | REJECTED | CANCELLED`. For an auto-approved free event the registration becomes the ticket (no separate Ticket entity).

**State mapping:** the design's `StRegProcessing/Error/Waitlist/Success(payment)` (`:103/:112/:115/:125`) are all **DEFERRED** (payments/waitlist, §3). On the **free** path there is no checkout: a successful `register` goes straight to **Confirmation** (§2.3). A free-path 409 (already registered) routes to the existing ticket; a 400 capacity race routes to `StDetailSoldOut` (terminal).

**Example:**
```jsonc
// → public.registrations.register("evt_123", { "answers": [], "role": "PARTICIPANT" })
// ← 201
{ "id": "reg_777", "status": "APPROVED", "ticketNumber": "EVF-260704-AB7K3X",
  "ticketIssuedAt": "2026-06-20T10:00:00.000Z", "eventId": "evt_123", "userId": "usr_1" }
```

### 2.3 Confirmation

**Sequence (free success):**
1. From `register` response, take `id` (registration id).
2. `public.registrations.getQrCode(id)` → `{ qrCode }` (see §2.5 — server-issued data-URL).

The design's "Confirmation" success+QR screen renders the real server QR. "Apple Wallet" is **client/3rd-party, no backend** → drop or treat as a local pass action. "Share" is client-side.

**State mapping:** `StRegSuccess` (`:125`) — note its copy ("Payment confirmed", "Add to Apple Wallet") is the **paid** variant and is **DEFERRED** with payments. The free path shows a "You're registered" success (reuse the success layout, drop the payment/Wallet copy).

### 2.4 Tickets (list)

**Sequence:**
1. `public.registrations.getMyRegistrations(query?: MyRegistrationsQuery)` → `MyRegistrationsResponse` (paginated; userId-scoped, Bearer USER).
2. (header stats, optional) `account.userEvents.getUserEventsStats()` → counts.

**Filtering:** `MyRegistrationsQuery.status` ∈ `ALL | APPROVED | PENDING | ATTENDED | CANCELLED` *(verify exact casing in generated types)*. The Upcoming/Past split is a **client** partition by event `startDate` vs now (no server param for it).

**State mapping:**

| State | Outcome |
|---|---|
| `StTixLoading` (`:138`) | `getMyRegistrations` pending |
| `StTixEmpty` (`:141`) | **200** empty `data: []` → "No tickets yet / Explore events" |
| `StTixError` (`:144`) | **offline** → render from **local cache**: "Saved tickets still work at the door — reconnect to sync". This is a **mobile local-cache** requirement (persist last-fetched registration + QR data-URL), NOT a backend call. Show Retry. |
| `StTixSuccess` (`:147`) | 200 with rows |

**Example:**
```jsonc
// → public.registrations.getMyRegistrations({ "status": "APPROVED" })  ← 200
{ "data": [ { "id": "reg_777", "status": "APPROVED", "ticketNumber": "EVF-260704-AB7K3X",
    "event": { "id": "evt_123", "title": "Sunset Summit", "startDate": "2026-07-04T15:00:00.000Z",
               "venue": "…", "city": "Tashkent" } } ],
  "total": 2, "page": 1, "limit": 10 }
```

### 2.5 TicketDetail / QR

**Sequence:**
1. `public.registrations.getQrCode(id)` → `{ qrCode }`.
2. (PDF) `public.registrations.downloadTicket(registrationId)` → **blob** (`responseType:'blob'`).
3. (cancel) `public.registrations.cancelRegistration(id)` → `CancelRegistrationResponse`.

**QR is server-issued, opaque, HMAC-signed — the app renders it, never fabricates it.** `GET /registrations/:id/qr` (Bearer, USER only, requires `status === APPROVED`) returns `{ qrCode }` where **`qrCode` is a base64 PNG data-URL** (`attendance.service.ts generateQrCode`). The data-URL encodes a check-in URL containing a **signed v2 payload** `v2.<base64url(body)>.<base64url(hmac-sha256)>` (`ticket-qr.service.ts:56-65,91-97`; body `{rid, ver, iat}`, HMAC over `TICKET_QR_SECRET`, `timingSafeEqual` verify, revocable via `qrPayloadVersion`). The app **MUST** render the returned `qrCode` data-URL directly in an `<Image>`; it must **NEVER** synthesize the prototype's `evflw:…` string (`ticket/[id].tsx:47`) — that is non-scannable and unsigned.

**Cancel preconditions (`registrations.service.ts:415-440`):** must own the registration; **cannot** cancel if already `CANCELLED`/`REJECTED` (→ 400). Success → `status: CANCELLED`.

**Buttons:** "Apple Wallet" → no backend (drop/local). "Save PDF" → `downloadTicket` blob. "Cancel" → `cancelRegistration`. "Share" → client.

**State mapping:** `StDetailRegistered` (`:78`) inline-QR variant uses the same `getQrCode`. Offline → render cached `qrCode` data-URL (the signed payload is verifiable offline by the scanner; the participant device only renders the image — §`StTixError`).

**Example:**
```jsonc
// → public.registrations.getQrCode("reg_777")  ← 200
{ "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg…" }
// → public.registrations.cancelRegistration("reg_777")  ← 200
{ "id": "reg_777", "status": "CANCELLED" }
```

### 2.6 Certificates

**Sequence:**
1. `account.certificates.getCertificates(query?: CertificatesQuery)` → `CertificatesResponse` (list; query `search?`, `filter? ('all'|'verified'|'unverified')`, `locale?`).
2. `account.certificates.getStats()` → `CertificatesStatsResponse` (header tiles).

Participant **only lists/downloads** — issuance is async + organizer-triggered (§4), no participant trigger. The app must NOT call `createCertificate/updateCertificate/deleteCertificate` (organizer surface).

**State mapping:** reuse `StList*` semantics — pending→loading, **200 empty `[]`**→empty ("no certificates yet"), error→retry, populated→grid.

**Example:**
```jsonc
// → account.certificates.getCertificates({ "filter": "all", "locale": "en" })  ← 200 (abridged)
{ "data": [ { "id": "cert_1", "eventName": "Sunset Summit", "eventDate": "2026-07-04",
    "verificationCode": "…", "url": "https://…/cert-….pdf" } ], "total": 3 }
```

### 2.7 CertificateDetail

**Sequence:**
1. `account.certificates.getCertificateById(id)` → `CertificateByIdResponse`.
2. (PDF) `account.certificates.downloadCertificate(id)` → **blob** (`GET /certificates/:id/download`, `responseType:'blob'`).

"Add to LinkedIn" / "Share" are client-only. The list DTO carries `eventName/eventDate/url/verificationCode`; richer fields (organizer/role/location) live only on the public-verify response and are a **P2 list-DTO addition** (PLAN §4-F2) — render with what the detail returns.

**State mapping:** `StDetailLoading`/`StDetailError` semantics (404 → not-found).

### 2.8 Profile

**Sequence:**
1. `account.account.getMe()` → `AccountProfileResponse` (identity — replaces the hardcoded "Jasur Saidov").
2. (stats) `account.userEvents.getUserEventsStats()` + `account.certificates.getStats()` + `account.savedEvents.getSavedEvents()` for Attended/Certs/Saved tiles.
3. (edit) `account.account.updateMe(body: UpdateProfileBody)`; avatar `uploadAvatar(file: File)` (FormData) / `deleteAvatar()`.
4. (saved) `account.savedEvents.getSavedEvents(query?)`; (following) `account.followingOrganizations.getFollowingOrganizations(query?)`.
5. (logout) `public.auth.logout({refreshToken})` then clear secure-store.
6. (language) local i18n only (`ef.lang`) — no backend.

**Drift / intentional drops:** "Payment methods" row → **no backend**, hide (§3). Appearance/home-city/interest prefs → no participant-prefs write route (P2), keep appearance local.

**State mapping:** `StDetailLoading`/`StDetailError` on `getMe`; 401 → refresh→retry→logout (§1.2).

**Example:**
```jsonc
// → account.account.getMe()  ← 200 (abridged)
{ "id": "usr_1", "firstName": "Jasur", "lastName": "Saidov", "email": "user@example.com",
  "avatarUrl": null, "isOnboardingCompleted": true }
```

### 2.9 Organizer

**Sequence:**
1. `public.organizations.getPublicProfile(id)` → `PublicOrganizationResponse` (name/handle/bio/stats + org events, per controller).
2. (follow) `account.followingOrganizations.isFollowing(orgId)` → `follow(orgId)` / `unfollow(orgId)`.

**Intentional drops:** "Rating (4.9)" and "Message/DM" have **no backend** (PLAN §4-B7) → render the profile without Rating; hide Message.

**State mapping:** `StDetailLoading`/`StDetailError` (404 → org not found).

---

## 3. Deferred surfaces (explicit, not silent)

| Surface | Milestone | Interim app behavior | States consequently DEFERRED |
|---|---|---|---|
| **Payments (Click / Payme)** | P2 `payments-v1` | Gate `EventType.PAID` out of the Register CTA — show read-only **"Tickets on web"** or hide the button. Discover may still **list** paid events (read-only), but no register path reaches checkout. Server-side pricing, verified webhooks, idempotency, issue-on-`paid` are P2 acceptance criteria (PLAN §4-D1). | `StRegProcessing` (`:103`), `StRegError` (`:112`), `StRegSuccess`-payment (`:125`, its "Payment confirmed"/Wallet copy) |
| **Phone OTP login** | P2 `auth-otp-v1` | OTP screen **dropped**. Use email/password + email verification (§1). Requires additive `VerificationCodeType.LOGIN` + UZ SMS provider + `/auth/otp/*` contract (none exist). | OTP-retry interaction (not a `states.jsx` export — lives in the dropped screen's resend timer) |
| **Waitlist** | P2 `waitlist-v1` | Render sold-out (`canRegister`→`CAPACITY_FULL`) as a **terminal** state with **no "Join waitlist" CTA**. No Waitlist model/route exists. | `StRegWaitlist` (`:115`); the "Join waitlist" CTA inside `StDetailSoldOut` (`:58`) |

**Also unbacked / client-only (drop or hide, not a state):** Apple Sign-In (Google + email only), Apple Wallet, organizer Rating/Message, saved payment methods, home-bell notifications.

**Every `states.jsx` export is now mapped:** `StList{Loading,Empty,Error,Success}` (§2.0), `StDetail{Loading,Error,SoldOut,Registered}` (§2.1), `StReg{Processing,Error,Waitlist,Success}` (DEFERRED, this §3 / §2.2), `StTix{Loading,Empty,Error,Success}` (§2.4).

---

## 4. Idempotency, webhooks, async

**Registration idempotency.** No client-supplied idempotency key. The server enforces uniqueness via the active-registration check (`registrations.service.ts:110-131`): a second `register` while `PENDING`/`APPROVED` exists → **409**; from `CANCELLED`/`REJECTED` it re-activates the same row. The app should:
- Treat **409** as "already registered" → navigate to the existing ticket (refetch `getMyRegistrations`), not an error toast.
- Guard the CTA with `canRegister` to avoid hitting a **400** capacity race; on a 400 race, show `StDetailSoldOut` (terminal).
- Debounce the Register button (prevent double-submit) since there is no client idempotency key.

**Certificate issuance is async (BullMQ, organizer-triggered).** Generation is enqueued by the organizer (`POST /events/:eventId/certificates/generate` → `queueService.enqueueCertificateGeneration`, `certificate-generation.service.ts:230`; job `certificate.batch`). The **participant never triggers issuance** — the app only lists (`getCertificates`/`getStats`), reads detail (`getCertificateById`), downloads (`downloadCertificate` blob), and the public verifier reads `certificates.verifyPublic`. A newly-eligible certificate simply **appears in the list** once the organizer's job completes; poll/refresh on pull-to-refresh, no participant-side job status to watch.

**Payments webhook→poll/notify.** Specced under `payments-v1`; **deferred** (§3). No client contract this release.

---

## 5. Versioning & drift policy

**Pin.** The app declares `@eventflow/sdk-public`, `@eventflow/sdk-account`, `@eventflow/api-contracts` at the **exact workspace version** (workspace/file dependency, not a `^`/`~` range). All three are generated together from the live controllers (`openapi:export` → `api-contracts generate`); a skew silently lies about types. (PLAN §1.2 notes CI does not yet gate drift and the checked-in `openapi.ts` may be stale — regenerate + diff before wiring.)

**Breaking change = any of:**
- a request/response **field removed or its type narrowed** (e.g. dropping `recipientEmail` from public verify — PLAN §4-F3 — is a breaking narrowing, not additive),
- a **method/route removed or renamed**,
- an **enum member removed** (`RegistrationStatus`, `reasonCode`, `VerificationCodeType`, `ParticipantRole`, `EventType`, `EventFormat`),
- a required request field **added**.
Additive changes (new optional field, new method, new enum member) are non-breaking. The Stage-2 list geo+price additions (§2.0) are additive.

**Drift rule — STOP, don't hand-roll.** If a screen needs a call the SDK does not expose (no matching method on `createPublicSdk`/`createAccountSdk`), **STOP and report contract drift to the orchestrator.** Do NOT add a raw `fetch`/`axios` or call the transport with a hand-written URL. The SDK is the contract; an absent method means the contract is incomplete, which is a backend/SDK task (PLAN §7 step 2), not a mobile workaround. Known absent-this-release surfaces already accounted for: payments, phone OTP, waitlist (§3).

---

### Appendix — `(verify)` items before finalizing

- Verification responses (`sendCode`/`verifyEmail`/`resendCode`/`resetPassword`) exact body shape — drafted as `{success}`; confirm against generated `OperationSuccessResponse` types.
- `ChangePasswordDto` exact field names (`currentPassword`/`newPassword`).
- `MyRegistrationsQuery.status` exact casing/enum (`ALL|APPROVED|PENDING|ATTENDED|CANCELLED`).
- `expo-secure-store` final key names (`ef.auth.access` / `ef.auth.refresh`).
- `AccountProfileResponse` / `PublicOrganizationResponse` / detail-payload exact field lists (read from generated types; do not invent fields).
