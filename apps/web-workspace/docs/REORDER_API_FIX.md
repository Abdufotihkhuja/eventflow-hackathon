# Исправление Reorder API для всех сущностей

**Дата**: 22 января 2026  
**Версия**: 1.0

## Проблема

API эндпоинты для переупорядочивания (`/reorder`) использовали разные форматы запросов:
- ❌ **agenda** - использовал `itemIds` ✅ (правильно)
- ❌ **speakers** - использовал `speakerIds` (было неправильно, стало `itemIds`)
- ❌ **questions** - пробовали все варианты, ничего не работало

## Решение

Каждый `reorder` эндпоинт использует **свое имя поля**:

```json
// Agenda
{ "itemIds": ["uuid-1", "uuid-2", "uuid-3"] }

// Questions
{ "questionIds": ["uuid-1", "uuid-2", "uuid-3"] }

// Speakers
{ "speakerIds": ["uuid-1", "uuid-2", "uuid-3"] }
```

**Нет единого стандарта** - каждая сущность использует свое имя!

### Принцип работы

1. Передаешь массив ID всех элементов в нужном порядке
2. Backend обновляет `sortOrder` каждого элемента:
   - Первый в массиве → `sortOrder = 0`
   - Второй → `sortOrder = 1`
   - Третий → `sortOrder = 2`
   - и т.д.

---

## Изменения в коде

### 1. API Types

#### `registration.types.ts`
```typescript
// Добавлен новый тип
export type ReorderQuestionsRequest = {
  questionIds: string[]  // ⚠️ Для questions используется questionIds!
}
```

#### `speaker.types.ts`
```typescript
// Оставлен без изменений
export type ReorderSpeakersRequest = {
  speakerIds: string[]  // ⚠️ Для speakers используется speakerIds!
}
```

#### `agenda.types.ts`
```typescript
// Без изменений - уже был правильный формат
export type ReorderAgendaRequest = {
  itemIds: string[]
}
```

---

### 2. API Services

#### `registrationsService.ts`
```typescript
// Было
reorderQuestions: (eventId: string, questionIds: string[]) =>
  request({ data: questionIds })

// Стало
reorderQuestions: (eventId: string, data: ReorderQuestionsRequest) =>
  request<GetQuestionsResponse, ReorderQuestionsRequest>({
    method: 'PATCH',
    url: `${getQuestionsUrl(eventId)}/reorder`,
    data,
  })
```

#### `speakersService.ts`
```typescript
// Без изменений в сервисе
// Изменен только тип ReorderSpeakersRequest
```

#### `agendaService.ts`
```typescript
// Без изменений - уже было правильно
```

---

### 3. React Query Hooks

#### `use-questions.ts`
```typescript
// Было
mutationFn: (questionIds: string[]) =>
  registrationQuestionsService.reorderQuestions(eventId, questionIds)

// Стало
mutationFn: (data: { questionIds: string[] }) =>  // ⚠️ questionIds, не itemIds!
  registrationQuestionsService.reorderQuestions(eventId, data)
```

#### `use-speakers.ts`
```typescript
// Без изменений - уже было правильно
mutationFn: (data: { speakerIds: string[] }) =>  // ⚠️ speakerIds!
  speakersService.reorderSpeakers(eventId, data)
```

#### `use-agenda.ts`
```typescript
// Без изменений - уже было правильно
mutationFn: (data: { itemIds: string[] }) => 
  agendaService.reorderAgenda(eventId, data)
```

---

### 4. UI Components

#### `event-questions-tab.tsx`
```typescript
// Было
const questionIds = newOrder.map(q => q.id)
reorderQuestions.mutate(questionIds)

// Стало
const questionIds = newOrder.map(q => q.id)  // ⚠️ questionIds, не itemIds!
reorderQuestions.mutate({ questionIds })
```

---

## API Endpoints

### Questions ⚠️ использует `questionIds`
```http
PATCH /api/v1/events/{eventId}/questions/reorder
Content-Type: application/json

{
  "questionIds": ["uuid-3", "uuid-1", "uuid-2"]
}
```

### Speakers ⚠️ использует `speakerIds`
```http
PATCH /api/v1/events/{eventId}/speakers/reorder
Content-Type: application/json

{
  "speakerIds": ["uuid-3", "uuid-1", "uuid-2"]
}
```

### Agenda
```http
PATCH /api/v1/events/{eventId}/agenda/reorder
Content-Type: application/json

{
  "itemIds": ["uuid-3", "uuid-1", "uuid-2"]
}
```

---

## Тестирование

### Проверка Questions
1. Открыть событие → вкладка "Вопросы"
2. Перетащить вопросы в новом порядке
3. Проверить, что порядок сохраняется после перезагрузки

### Проверка Speakers
1. Открыть событие → вкладка "Спикеры"
2. Перетащить спикеров в новом порядке
3. Проверить, что порядок сохраняется после перезагрузки

### Проверка Agenda
1. Открыть событие → вкладка "Программа"
2. Перетащить пункты программы в новом порядке
3. Проверить, что порядок сохраняется после перезагрузки

---

## Проблемы при разработке

### Попытка 1: Массив напрямую
```json
["uuid-1", "uuid-2"]
```
**Ошибка**: `property 0 should not exist`

### Попытка 2: questionIds
```json
{ "questionIds": ["uuid-1", "uuid-2"] }
```
**Ошибка**: `property questionIds should not exist`

### Попытка 3: ids
```json
{ "ids": ["uuid-1", "uuid-2"] }
```
**Ошибка**: `property ids should not exist`

### Попытка 4: Query params
```
?ids=uuid1&ids=uuid2
```
**Ошибка**: `Validation failed (uuid is expected)`

### Решение: itemIds ✅
```json
{ "itemIds": ["uuid-1", "uuid-2"] }
```
**Работает!** - Единый формат для всех reorder эндпоинтов

---

## Выводы

1. **Отсутствие единообразия API** - каждый reorder эндпоинт использует свое имя поля:
   - Questions: `questionIds`
   - Agenda: `itemIds`
   - Speakers: `speakerIds`
2. **Типобезопасность** - строгая типизация с TypeScript помогает избежать ошибок
3. **Документация** - КРИТИЧЕСКИ важно проверять актуальную API документацию на https://eventflow.uz/api/docs
4. **Не предполагать** - всегда проверять реальную документацию вместо предположений о "едином формате"
5. **Тестировать** - проверять каждый эндпоинт отдельно, не полагаясь на то, что они работают одинаково

---

## Файлы изменены

- `src/api/services/registration.types.ts` - добавлен `ReorderQuestionsRequest`
- `src/api/services/speaker.types.ts` - оставлен `speakerIds`
- `src/api/services/registrationsService.ts` - обновлен метод `reorderQuestions`
- `src/features/events/api/use-questions.ts` - использует `questionIds`
- `src/features/events/api/use-speakers.ts` - использует `speakerIds`
- `src/pages/my-events/details/ui/tabs/event-questions-tab.tsx` - передает `questionIds`
- `docs/REGISTRATION_QUESTIONS_API.md` - обновлена документация

---

## Финальная таблица соответствия

| Endpoint | Field Name | Example |
|----------|------------|---------|
| `/events/{id}/agenda/reorder` | `itemIds` | `{ "itemIds": ["uuid1", "uuid2"] }` |
| `/events/{id}/questions/reorder` | `questionIds` | `{ "questionIds": ["uuid1", "uuid2"] }` |
| `/events/{id}/speakers/reorder` | `speakerIds` | `{ "speakerIds": ["uuid1", "uuid2"] }` |

**Вывод**: Backend НЕ использует единый стандарт. Каждая сущность имеет свое имя поля! 😅
