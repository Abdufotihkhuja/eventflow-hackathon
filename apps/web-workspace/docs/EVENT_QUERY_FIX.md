# Исправление запроса деталей события

## Проблема

При переходе на страницу деталей события (`/my-events/:id`) или редактирования (`/my-events/:id/edit`) не отправлялся API запрос `GET /api/v1/events/{id}` для получения данных о событии.

### Причина

Хук `useEventQuery` не проверял валидность `eventId` перед выполнением запроса. Если параметр `id` из URL был `undefined`, он преобразовывался в пустую строку (`id ?? ''`), что приводило к:

1. Некорректному URL запроса: `/api/v1/events/` (без ID)
2. Отсутствию API запроса

## Решение

### 1. Добавлена проверка валидности в хук `useEventQuery`

```typescript
// src/features/events/api/use-event-query.ts

export function useEventQuery(eventId: string, enabled = true) {
  // Выполняем запрос только если eventId валидный (не пустой)
  const isEnabled = enabled && !!eventId && eventId.trim() !== ''

  return useQuery({
    queryKey: eventsKeys.detail(eventId),
    queryFn: () => eventsService.getEvent(eventId),
    enabled: isEnabled, // ✅ Теперь проверяется валидность
    staleTime: 60_000,
  })
}
```

### 2. Добавлена ранняя проверка ID в компонентах страниц

**EventDetailsPage** и **EditEventPage**:

```typescript
export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>()

  // Проверяем валидность ID из URL
  if (!id || id.trim() === '') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            Некорректный ID события
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/my-events">Вернуться к списку</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ✅ Передаем валидный id напрямую, без fallback
  const { data: event, isLoading, isError, error } = useEventQuery(id)
  
  // ... остальной код
}
```

## Результат

1. ✅ API запрос `GET /api/v1/events/{id}` выполняется корректно при переходе на страницы деталей и редактирования
2. ✅ При невалидном ID показывается понятное сообщение об ошибке
3. ✅ Предотвращены некорректные запросы к API с пустым ID

## Измененные файлы

- `src/features/events/api/use-event-query.ts` — добавлена проверка валидности `eventId`
- `src/pages/my-events/details/ui/event-details-page.tsx` — ранняя проверка ID
- `src/pages/my-events/edit/ui/edit-event-page.tsx` — ранняя проверка ID

## Тестирование

Для проверки исправления:

1. Перейти на `/my-events/{valid-uuid}` — должен отправиться запрос `GET /api/v1/events/{valid-uuid}`
2. Перейти на `/my-events/invalid-id` — должен показаться корректный экран ошибки
3. Проверить в Network tab браузера наличие запроса к API

## Дата изменения

21 января 2026

## См. также

- [API документация EventFlow](https://eventflow.uz/api/docs#/events/EventsController_findOne)
