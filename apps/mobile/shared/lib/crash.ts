/**
 * Crash reporting seam (FND-19). Provider-agnostic: no SDK/DSN is baked in, so
 * the provider stays an infra choice. Register one once chosen (e.g. Sentry)
 * via `setCrashReporter`; the global JS error handler and the app ErrorBoundary
 * forward to it. Until a provider is set it no-ops in production and logs in dev.
 *
 * NEVER attach PII (email, tokens, names) to a report — pass only safe context.
 *
 * To activate Sentry later:
 *   import * as Sentry from "@sentry/react-native";
 *   Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, sendDefaultPii: false });
 *   setCrashReporter((e, ctx) => Sentry.captureException(e, { extra: ctx }));
 */
type CrashContext = Record<string, string | number | boolean>;
type Reporter = (error: unknown, context?: CrashContext) => void;

let reporter: Reporter | null = null;

/** Wire an actual provider. Pass null to detach. */
export function setCrashReporter(fn: Reporter | null): void {
  reporter = fn;
}

/** Report a caught error. Best-effort — a crash reporter must never crash the app. */
export function captureException(error: unknown, context?: CrashContext): void {
  try {
    if (reporter) {
      reporter(error, context);
    } else if (__DEV__) {
      // Dev visibility only — no production logging (keeps the no-PII-in-logs rule).
      console.error("[crash]", error, context ?? "");
    }
  } catch {
    /* swallow — reporting must never throw */
  }
}

interface GlobalErrorUtils {
  ErrorUtils?: {
    getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
    setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  };
}

let installed = false;

/** Route uncaught JS errors to `captureException` (call once at app boot). */
export function installCrashHandlers(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as unknown as GlobalErrorUtils;
  const prev = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    captureException(error, { fatal: !!isFatal });
    prev?.(error, isFatal); // preserve RN's default (redbox in dev / native crash)
  });
}
