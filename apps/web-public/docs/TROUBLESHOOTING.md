# Public Web Troubleshooting Note

This troubleshooting file previously assumed a standalone PM2-managed frontend host.

That no longer matches the production model. For production incidents, start from the repo-root stack:

- `docs/deployment.md`
- `npm run docker:prod:logs`
- `npm run health:prod`
- `npm run smoke:prod`
- `npm run release:check`

If app-specific frontend troubleshooting needs to be documented again, it should reference the root production stack rather than PM2 or per-app server setup.
