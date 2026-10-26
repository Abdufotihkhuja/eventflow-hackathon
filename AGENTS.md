# EventFlow Agent Guide

This file is the shared entry point for AI agents working in this repository.
Use it together with app-local Cursor rules in `apps/*/.cursor/rules` and the nearest app-level `README.md` or `docs/README.md`.

## Repository shape

EventFlow is a monorepo built with `npm workspaces`.

- `apps/api` — NestJS 11 + Prisma 7 backend
- `apps/web-public` — Next.js 15 public web app
- `apps/web-workspace` — Vite + React 19 organizer workspace
- `apps/web-admin` — dedicated admin web app
- `apps/worker` — background jobs
- `packages/api-contracts` and `packages/sdk-*` — generated contracts and typed SDKs

## Core rules for all agents

- Prefer small, targeted changes over broad refactors.
- Do not rewrite existing architecture into a template from another project.
- Keep backward compatibility unless the task explicitly allows a breaking change.
- When API contracts change, update the related OpenAPI/contracts/docs in the same task when practical.
- Do not invent new frameworks, state managers, or folder structures when the app already has a clear pattern.
- Keep comments and docs factual; remove or rewrite outdated guidance instead of layering contradictions on top.

## Documentation and task placement

EventFlow uses scoped documentation, not a single global docs folder.

- Use root `docs/` for cross-workspace, platform-level, deployment, or monorepo-wide documentation.
- Use `apps/<app>/docs/` for app-specific implementation notes, guides, and technical docs.
- Use `apps/<app>/tasks/` for app-specific plans, TODOs, checklists, and temporary execution notes.
- Leave `README.md` files in place.
- Do not mass-move historical markdown files unless the task explicitly asks for cleanup.

## Backend rules

Inside `apps/api`:

- The backend is a modular monolith. Keep changes inside the relevant module.
- Current stack: NestJS 11, Prisma 7, PostgreSQL, JWT auth, Swagger/OpenAPI, BullMQ.
- Existing modules may use `dto/`, `application/`, `repository`, and nested feature folders such as `events/agenda` or `boards/tasks`. Follow the local pattern of the module you touch.
- Prefer repository/service layering where it already exists; do not force repositories into modules that currently work directly through services and Prisma.
- Preserve compatibility around the IAM migration and account-centric session model, especially `GET /api/v1/session/me` and legacy auth flows.

## Public web rules

Inside `apps/web-public`:

- This app uses Next.js App Router, React 19, TypeScript strict, TanStack Query, React Hook Form, and Zod.
- Reuse existing `shared`, `entities`, `features`, and `widgets` patterns.
- TanStack Query is the default client-state layer for server data.
- `useEffect` is allowed only when it is genuinely needed for browser-only behavior, subscriptions, timers, or imperative integrations. Do not ban it blindly, but prefer server components, query primitives, and derived state when possible.
- Keep UI consistent with the existing design system in `src/shared/ui` and current tokens/styles instead of importing a new component library.

## Workspace web rules

Inside `apps/web-workspace`:

- This app uses Vite, React 19, React Router DOM 7, TanStack Query, React Hook Form, Zod, Tailwind, Radix, and Mantine.
- Routing is built with `createBrowserRouter`; prefer lazy page loading and route-level error handling.
- Keep using TanStack Query for async server state. Do not introduce RTK Query or Redux unless explicitly requested.
- The workspace already mixes Tailwind utilities with Mantine/Radix-based components. Extend that ecosystem instead of replacing it.
- The React Compiler is enabled; avoid cargo-cult memoization.

## Generated contracts

Before hand-writing new API types or duplicate clients, check:

- `packages/api-contracts`
- `packages/sdk-public`
- `packages/sdk-account`
- `packages/sdk-workspace`
- `packages/sdk-admin`

Prefer updating generated contracts when the source API changes.

## Verification

Use the smallest relevant verification command for the area you changed.

- For automated coverage in this repository, prefer unit tests only.
- Do not introduce integration tests, end-to-end tests, or browser automation as a required layer unless the user explicitly asks for them.
- When adding tests, target the smallest risky unit: service, hook, utility, mapper, guard, or controller behavior in isolation.

- Root: `npm run build`, `npm run type-check`
- API: `npm run lint --workspace @eventflow/api`, `npm run test --workspace @eventflow/api`
- Public web: `npm run lint --workspace @eventflow/web-public`, `npm run type-check --workspace @eventflow/web-public`
- Workspace web: `npm run lint --workspace @eventflow/web-workspace`

## When updating agent rules

- Keep `AGENTS.md` and app-local `.cursor/rules` aligned.
- Remove guidance that is demonstrably false for the current codebase.
- Prefer explicit, repo-specific instructions over generic “senior developer” boilerplate.
