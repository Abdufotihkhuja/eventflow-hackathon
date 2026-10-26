# EventFlow Platform (President Tech Award 2026 snapshot)

EventFlow is an event platform for Uzbekistan: public event discovery and registration, an organizer workspace (participants, check-in, certificates, badges, tasks, billing) and a platform admin panel.

This repository is a source-available snapshot published for the **President Tech Award** hackathon. It is **not open source**. Use is limited to building, presenting and judging a hackathon project until 1 December 2026, with no commercial use and no production deployment. Read [LICENSE](LICENSE) before you start. Third-party components keep their own licenses, see [NOTICE](NOTICE).

Production infrastructure, deployment tooling and internal business documents are not part of this snapshot.

## Apps

- `apps/api` — NestJS 11 + Prisma 7 backend
- `apps/worker` — background jobs (BullMQ)
- `apps/web-public` — Next.js public web
- `apps/web-workspace` — Vite + React organizer workspace
- `apps/web-admin` — super-admin web app
- `apps/mobile` — Expo mobile app

## Packages

- `packages/api-contracts` — generated OpenAPI contracts
- `packages/sdk-public`, `sdk-account`, `sdk-workspace`, `sdk-admin` — typed SDKs
- `packages/i18n` — uz / ru / en messages
- `packages/ui-tokens`, `packages/eslint-config`, `packages/tsconfig`

## Local run

Requires Node 20–22, **npm 10** (`engine-strict=true` in `.npmrc`) and Docker.

```bash
corepack enable   # picks npm from packageManager
cp .env.example .env
npm install
npm run docker:up
```

Local domains:

- Public web: `http://localhost`
- Workspace web: `http://app.localhost`
- Admin web: `http://admin.localhost`
- API: `http://api.localhost`
- OpenAPI JSON: `http://api.localhost/api/docs.json`
- Mail catcher (Mailpit): `http://localhost:8025`

Direct container ports for debugging:

- API: `http://localhost:3000`
- Public web: `http://localhost:3001`
- Workspace web: `http://localhost:3002`
- Admin web: `http://localhost:3003`

External integrations (OAuth, payments, translation, push, maps) stay disabled until you put your own sandbox credentials into `.env`.

## Checks

```bash
npm run build
npm run type-check
npm run lint
npm run test
npm run contracts:generate
```

## Storage

- Host uploads dir: `./storage/uploads`
- Container uploads dir: `/data/uploads`
- Public URL prefix: `/uploads/*`

## Documentation

- [Docs Index](docs/README.md)
- [AI Agent Guide](AGENTS.md)
- [API App Guide](apps/api/README.md)
- [Public Web Guide](apps/web-public/README.md)
- [Workspace Web Guide](apps/web-workspace/README.md)
- [Admin Web Guide](apps/web-admin/README.md)
- [API Surfaces](docs/api-surfaces.md)
- [Auth Session Model](docs/auth-session-model.md)

## License

Copyright (c) 2026 Eventflow AI. All rights reserved. Licensed under the [EventFlow Hackathon License 1.0](LICENSE).
