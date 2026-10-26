# EventFlow Web Admin

Dedicated super-admin application for the EventFlow platform.

## What Lives Here

- super-admin dashboard and platform-level moderation flows
- admin-facing event, users, blog, places, registrations, and check-in pages
- admin SDK/API integrations and React Router based application shell
- shared admin layouts, widgets, and UI primitives for privileged users

## Run Locally

From the monorepo root:

```bash
npm run dev --workspace @eventflow/web-admin
```

Or inside this folder:

```bash
npm run dev
```

Typical local URL is `http://admin.localhost` when the full platform runs through the root dev setup.

## Working Surface

- This app currently does not keep a dedicated `docs/` folder.
- App-specific guidance lives in local module `README.md` files inside `src/`.
- Platform-level docs remain in [README.md](../../README.md) and [docs/README.md](../../docs/README.md).
- Shared agent guidance remains in [AGENTS.md](../../AGENTS.md).

## Notes

- `web-admin` is the dedicated replacement for the former super-admin screens that previously lived inside `web-workspace`.
- If this app grows its own long-form documentation, add `apps/web-admin/docs/README.md` instead of scattering top-level markdown files.
