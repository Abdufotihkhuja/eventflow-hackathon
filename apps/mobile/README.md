# @eventflow/mobile

EventFlow participant (attendee) app — Expo + Expo Router, mirroring the
`web-public` FSD mental model so web engineers move over with the same map.

```
app/        Expo Router routes (= URLs / deep links / push targets)
entities/   domain models + data hooks (event, registration, certificate, catalog, profile)
shared/     cross-feature primitives (providers, theme, lib, query-client, api, auth, i18n, ui)
```

## Stack

Expo SDK 54 (React 19, pinned 19.1.0) · Expo Router · TypeScript (strict) ·
Reanimated. Styling is **pure JS tokens** from `@eventflow/ui-tokens` (`shared/theme`:
`type()`, palettes, `StyleSheet`) — **no NativeWind / `className`** (its Metro CSS
transform dead-locked this monorepo, so it was removed; `metro.config.js` /
`babel.config.js` are plain). The data layer runs through the generated
`@eventflow/sdk-public` / `sdk-account` over a single `ApiTransport`
(`shared/api`); session tokens live in `expo-secure-store`.

### Wired to the live API

Auth (welcome / signup / login / verify, secure-store + refresh), Discover,
Event detail (long page + scroll-spy sub-nav, register CTA, comments, inline QR),
Tickets list + Ticket detail (server-issued QR — never fabricated — + cancel),
Certificates (stats + event certificates), Profile (identity, participation
stats, language, logout). `app/index.tsx` routes by session
(authenticated → Discover, else Welcome). See `MOBILE_API.md` (repo root) for the
participant contract.

## Commands

```bash
npm run start -w @eventflow/mobile        # Expo dev server (iOS/Android/web)
npm run type-check -w @eventflow/mobile   # tsc --noEmit
npm run lint -w @eventflow/mobile         # eslint .
npm run test -w @eventflow/mobile         # jest (jest-expo + RNTL)
npm run export:web -w @eventflow/mobile   # static web bundle (build smoke test)
```

`@eventflow/ui-tokens` must be built first (`npm run build:packages` at the
repo root) so Metro and `tailwind.config.js` can resolve its `dist`.
