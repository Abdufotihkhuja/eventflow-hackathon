/**
 * Shared React Query client. Caching + dedup + retry here is what powers the
 * loading/empty/error states (app/states.jsx) and keeps the app from
 * over-fetching. Auth errors are not retried (the transport handles 401).
 */
import { hashKey, QueryClient, type QueryKey } from "@tanstack/react-query";

import { ApiError } from "./transport";

let activeScope = "anonymous";
let scopeGeneration = 0;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: (queryKey: QueryKey) =>
        hashKey(["eventflow-scope", activeScope, scopeGeneration, queryKey]),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // We don't wire NetInfo into React Query's onlineManager, so its online
      // detection is unreliable (it can wrongly pause fetches as "offline",
      // leaving queries stuck pending). The app doesn't support offline anyway,
      // so always run fetches and let the transport surface real failures.
      networkMode: "always",
      retry: (failureCount, error) => {
        // Never retry auth/permission/not-found — only transient failures.
        if (error instanceof ApiError && error.status < 500 && error.status !== 0) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      networkMode: "always",
      retry: false,
    },
  },
});

/** Open a cache generation isolated from every previous account scope. */
export function rotateQueryScope(scope: string): number {
  activeScope = scope;
  scopeGeneration += 1;
  void queryClient.cancelQueries();
  queryClient.getMutationCache().clear();
  queryClient.clear();
  return scopeGeneration;
}

export function getQueryScopeGeneration(): Readonly<{
  scope: string;
  generation: number;
}> {
  return { scope: activeScope, generation: scopeGeneration };
}
