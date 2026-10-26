# EventFlow API

NestJS backend for the EventFlow platform.

## What Lives Here

- REST API for public, organizer, account, and super-admin flows
- Prisma schema, migrations, and backend seed/backfill scripts
- Swagger/OpenAPI export and contract-facing backend documentation
- background jobs, uploads, mail, IAM migration, and platform integrations

## Run Locally

From the monorepo root:

```bash
npm run start:dev --workspace @eventflow/api
```

Or inside this folder:

```bash
npm run start:dev
```

Common local endpoints:

- API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs.json`

## Common Commands

```bash
npm run lint
npm run test
npm run openapi:export
npm run migrate:dev
npm run db:generate
```

Docker helpers:

```bash
npm run docker:dev
npm run docker:dev:logs
npm run docker:dev:down
```

## Working Docs

- App docs index: [docs/README.md](docs/README.md)
- Backend rules: [.cursor/rules/backend.mdc](.cursor/rules/backend.mdc)
- Platform overview: [README.md](../../README.md)
- Shared agent guide: [AGENTS.md](../../AGENTS.md)

## Notes

- `apps/api/docs/` stores backend, API, deployment, and integration-facing documentation for this app.
- `apps/api/tasks/` is reserved for active task notes only.
- Historical scaffold and prompt files have been removed from the working docs surface.
