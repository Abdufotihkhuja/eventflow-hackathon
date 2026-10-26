# EventFlow Web Public

Public-facing Next.js application for the EventFlow platform.

## What Lives Here

- public event catalog and event details
- auth and onboarding pages for public/account flows
- profile-facing pages and public certificates flows
- shared public widgets, API hooks, and UI primitives for `web-public`

## Run Locally

From the monorepo root:

```bash
npm run dev --workspace @eventflow/web-public
```

Or inside this folder:

```bash
npm run dev
```

Typical local URL is `http://localhost` when the full platform runs through the root Docker/dev setup.

## Working Docs

- App docs: [docs/README.md](docs/README.md)
- Shared repo guide: [AGENTS.md](../../AGENTS.md)
- Platform overview: [README.md](../../README.md)

## Notes

- Treat `apps/web-public/docs/` as the source for app-specific docs.
- Treat `apps/web-public/tasks/` as a place for active task notes only.
- Historical scaffold/prompt docs have been removed from the working docs surface.
