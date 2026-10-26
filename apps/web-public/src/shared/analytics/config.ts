/**
 * Analytics is environment-driven: each tag is enabled only when its ID is set
 * via env. So dev/stage/prod each control their own tags through their own
 * `.env` (prod → real IDs, stage → test IDs or empty, dev → empty) — dev/stage
 * traffic never pollutes the production GTM / Metrika counters.
 *
 * `NEXT_PUBLIC_*` are inlined at build time, so these are read from the build
 * environment (see Dockerfile.prod ARGs / docker-compose build args).
 */

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() || "";
export const YM_ID = process.env.NEXT_PUBLIC_YM_ID?.trim() || "";

/** Explicit kill-switch — overrides everything when set to "false". */
const FORCED_OFF = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false";

/** Each tag activates only when its ID is present (and not force-disabled). */
export const GTM_ENABLED = !FORCED_OFF && GTM_ID !== "";
export const YM_ENABLED = !FORCED_OFF && YM_ID !== "";

/** True when any analytics is active — used by the SPA route tracker / dataLayer. */
export const ANALYTICS_ENABLED = GTM_ENABLED || YM_ENABLED;
