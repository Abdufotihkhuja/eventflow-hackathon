# Оптимизация запросов событий

## Проблема

При загрузке страницы "Мои события" (`/my-events`) происходило дублирование API запросов:

1. `GET /api/v1/events?page=1&limit=1` — запрос для получения количества событий (badge в навигации)
2. `GET /api/v1/events` — запрос для получения полного списка событий (основной контент страницы)

Оба запроса выполнялись одновременно, что создавало избыточную нагрузку на сервер и замедляло загрузку.

## Причина

Хук `useEventsCountQuery()` использовался в `protected-layout.tsx` для отображения badge с количеством событий в боковой навигации. Этот хук делал отдельный API запрос только для получения поля `total`.

```typescript
// Старая реализация (делала отдельный API запрос)
export function useEventsCountQuery() {
  return useQuery({
    queryKey: [...eventsKeys.all, 'count'] as const,
    queryFn: async () => {
      const response = await eventsService.getEvents({ page: 1, limit: 1 })
      return response.total
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
```

## Решение

Хук `useEventsCountQuery()` был переработан для чтения данных из кеша TanStack Query вместо выполнения отдельного API запроса:

```typescript
// Новая реализация (читает из кеша, без API запроса)
export function useEventsCountQuery() {
  const queryClient = useQueryClient()

  // Ищем в кеше любой успешный запрос событий
  const cachedData = queryClient
    .getQueryCache()
    .findAll({ queryKey: eventsKeys.lists(), type: 'active' })
    .map(query => query.state.data)
    .find(data => data && typeof data === 'object' && 'total' in data)

  return {
    data: cachedData ? (cachedData as { total: number }).total : undefined,
  }
}
```

## Преимущества

1. **Нет дублирующихся запросов** — API запрос выполняется только один раз
2. **Быстрая загрузка** — badge обновляется мгновенно из кеша
3. **Меньше нагрузки на сервер** — экономия трафика и ресурсов
4. **Автоматическая синхронизация** — badge обновляется при любом изменении кеша событий

## Поведение

- **При первой загрузке**: badge не отображается до загрузки событий
- **После загрузки событий**: badge показывает актуальное количество
- **При обновлении событий**: badge автоматически обновляется (создание/удаление/фильтрация)

## Файлы

- `src/features/events/api/use-events-count-query.ts` — обновленный хук
- `src/widgets/protected-layout/ui/protected-layout.tsx` — использование хука для badge

## Дата изменения

21 января 2026
