/**
 * One-way bridge from the transport (low-level, no React) to the auth context
 * (React state + navigation). When a refresh ultimately fails, the transport
 * calls `emitSessionExpired()`; the AuthProvider registers a handler that clears
 * session state and routes back to Welcome. This avoids a circular import
 * between `transport.ts` and `auth-context.tsx`.
 */
type Handler = () => void;

let handler: Handler | null = null;

export function onSessionExpired(fn: Handler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export function emitSessionExpired(): void {
  handler?.();
}
