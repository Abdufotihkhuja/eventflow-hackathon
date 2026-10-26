import {
  hashKey,
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

let activeScope = "anonymous";
let scopeGeneration = 0;

/**
 * Централизованная конфигурация для TanStack Query
 * Используется во всем приложении через QueryClientProvider
 */
export const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: (queryKey: QueryKey) =>
          hashKey(["eventflow-scope", activeScope, scopeGeneration, queryKey]),
        staleTime: 1000 * 60, // 1 minute
        gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        console.error("Query error:", error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        console.error("Mutation error:", error);
      },
    }),
  });
};

// Singleton instance для использования в компонентах
export const queryClient = createQueryClient();

export function rotatePublicQueryScope(scope: "anonymous" | "personal"): number {
  activeScope = scope;
  scopeGeneration += 1;
  void queryClient.cancelQueries();
  queryClient.getMutationCache().clear();
  queryClient.clear();
  return scopeGeneration;
}

export function getPublicQueryScopeGeneration(): Readonly<{
  scope: string;
  generation: number;
}> {
  return { scope: activeScope, generation: scopeGeneration };
}
