# Исправление API программы события (Agenda)

**Дата:** 20 января 2026  
**Проблема:** При переходе на вкладку "Программа" в деталях события отображался экран ошибки "Что-то пошло не так"

## Описание проблемы

При запросе к эндпоинту `GET /api/v1/events/{eventId}/agenda` сервер возвращает пустой массив `[]` вместо ожидаемого объекта `{ items: [] }`. Это приводило к двум ошибкам:

1. **Несоответствие типов:** TypeScript ожидал `GetAgendaResponse = { items: AgendaItem[] }`, но получал массив напрямую
2. **Ошибка React:** Компонент `AgendaManager` использовал `FormLabel` и `FormDescription` из shadcn/ui, которые требуют `FormProvider`, но компонент не был обёрнут в форму

## Внесённые изменения

### 1. Обновление типов API

**Файл:** `src/api/services/agenda.types.ts`

```typescript
// Было:
export type GetAgendaResponse = {
  items: AgendaItem[]
}

// Стало:
// API возвращает массив напрямую, а не объект с полем items
export type GetAgendaResponse = AgendaItem[]
```

### 2. Обновление сервиса

**Файл:** `src/api/services/agendaService.ts`

```typescript
// Обновлён метод reorderAgenda для использования нового типа
reorderAgenda: (eventId: string, data: ReorderAgendaRequest) =>
  request<AgendaItem[], ReorderAgendaRequest>({
    method: 'PATCH',
    url: `${getAgendaUrl(eventId)}/reorder`,
    data,
  }),
```

### 3. Упрощение хука useAgendaQuery

**Файл:** `src/features/events/api/use-agenda.ts`

```typescript
// Удалена обёртка для нормализации данных, так как теперь тип соответствует реальному ответу
export function useAgendaQuery(eventId: string) {
  return useQuery({
    queryKey: agendaKeys.list(eventId),
    queryFn: () => agendaService.getAgenda(eventId),
    enabled: !!eventId,
    staleTime: 60_000,
  })
}
```

### 4. Обновление компонента AgendaManager

**Файл:** `src/features/events/ui/agenda-manager/agenda-manager.tsx`

#### a) Исправление извлечения данных

```typescript
// Было:
const agendaItems = Array.isArray(data) ? data : (data?.items ?? [])

// Стало:
const agendaItems = data ?? []
```

#### b) Замена компонентов формы на обычные HTML элементы

```typescript
// Было:
import { Button, Card, FormDescription, FormLabel, Input, Badge } from '@shared/ui'

<FormLabel>Программа мероприятия</FormLabel>
<FormDescription>Создайте расписание с указанием времени и спикеров</FormDescription>

// Стало:
import { Button, Card, Input, Badge } from '@shared/ui'

<h3 className="text-sm font-medium text-slate-900">Программа мероприятия</h3>
<p className="text-sm text-slate-600">Создайте расписание с указанием времени и спикеров</p>
```

## Результат

✅ Вкладка "Программа" теперь корректно отображается  
✅ При пустой программе показывается состояние "Программа не создана" с кнопкой "Добавить первый пункт"  
✅ Нет ошибок TypeScript и React  
✅ Компонент работает без зависимости от FormProvider

## Скриншот

![Исправленная вкладка Программа](./.playwright-mcp/agenda-tab-fixed.png)

## Связанные файлы

- `src/api/services/agenda.types.ts` — типы API
- `src/api/services/agendaService.ts` — сервис для работы с API
- `src/features/events/api/use-agenda.ts` — React Query хуки
- `src/features/events/ui/agenda-manager/agenda-manager.tsx` — компонент управления программой
- `src/pages/my-events/details/ui/tabs/event-agenda-tab.tsx` — вкладка программы на странице события
