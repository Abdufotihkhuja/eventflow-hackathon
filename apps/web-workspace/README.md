# EventFlow Web Workspace

Organizer workspace application built with Vite and React.

## What Lives Here

- organizer dashboard and authenticated workspace flows
- event, places, users, followers, blog, check-in, and task management pages
- workspace-specific API services and TanStack Query hooks
- shared workspace UI, layouts, and router configuration

## Run Locally

From the monorepo root:

```bash
npm run dev --workspace @eventflow/web-workspace
```

Or inside this folder:

```bash
npm run dev
```

Typical local URL is `http://app.localhost` when the full platform runs through the root Docker/dev setup.

## Working Docs

- App docs: [docs/README.md](docs/README.md)
- Shared repo guide: [AGENTS.md](../../AGENTS.md)
- Platform overview: [README.md](../../README.md)

## Notes

- `apps/web-workspace/docs/` contains app-specific implementation and integration docs.
- `apps/web-workspace/tasks/` is reserved for active task notes only.
- This app uses the current workspace stack from the repo, not the default Vite template.
