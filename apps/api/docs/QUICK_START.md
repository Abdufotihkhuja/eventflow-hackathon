# API Production Quick Start Note

This quick-start document used to describe an API-only production deploy.

Do not use `apps/api` deploy shortcuts for production anymore. EventFlow now ships from the repository root as one stack.

Use:

1. `cp .env.example .env`
2. fill the production values described in `docs/deployment.md`
3. run `npm run docker:prod:up` from the repository root
4. verify with `npm run health:prod`, `npm run smoke:prod`, and `npm run release:check`

For the active production flow, see `docs/deployment.md`.
