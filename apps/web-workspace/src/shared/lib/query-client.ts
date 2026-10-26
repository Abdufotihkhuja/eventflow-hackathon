import { hashKey, QueryClient, type QueryKey } from '@tanstack/react-query'

let activeScope = 'anonymous'
let scopeGeneration = 0

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: (queryKey: QueryKey) =>
        hashKey(['eventflow-scope', activeScope, scopeGeneration, queryKey]),
      staleTime: 60 * 1000, // 1 минута
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
})

export function clearAppQueryCache(): void {
  rotateAppQueryScope(activeScope)
}

export function rotateAppQueryScope(scope: string): number {
  activeScope = scope
  scopeGeneration += 1
  void queryClient.cancelQueries()
  queryClient.getMutationCache().clear()
  queryClient.clear()
  return scopeGeneration
}

export function getAppQueryScopeGeneration(): Readonly<{
  scope: string
  generation: number
}> {
  return { scope: activeScope, generation: scopeGeneration }
}
