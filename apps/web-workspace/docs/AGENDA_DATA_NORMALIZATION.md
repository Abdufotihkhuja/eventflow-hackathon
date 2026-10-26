# Нормализация данных агенды (Agenda Data Normalization)

## Проблема

API возвращает данные элементов программы в формате, отличающемся от ожидаемого:

### Формат данных с API:

```json
{
  "id": "5b7388e2-7e66-48d8-87c6-290c287c20d3",
  "date": "2026-01-16T00:00:00.000Z",        // ISO datetime вместо YYYY-MM-DD
  "startTime": "1970-01-01T09:00:00.000Z",   // ISO datetime
  "speakers": [                               // Полные объекты Speaker
    {
      "id": "31977e14-e54d-4f5b-868b-3b0b75825c92",
      "name": "Abdufotihkhuja Ravshankhujaev",
      "position": "CTO",
      "company": "FinTech",
      "bio": "...",
      "avatarUrl": null,
      "linkedinUrl": "...",
      // ... другие поля
    }
  ]
}
```

### Ожидаемый формат в UI:

```typescript
{
  date: "2026-01-16",                    // YYYY-MM-DD
  startTime: "1970-01-01T09:00:00.000Z", // ISO datetime (ok)
  speakers: [                            // Только id и name
    { id: "...", name: "..." }
  ]
}
```

## Решение

### 1. Добавлена функция нормализации даты

```typescript
/**
 * Извлекает дату в формате YYYY-MM-DD из ISO datetime
 */
function extractDateFromISO(isoDateTime: string): string {
  try {
    const date = new Date(isoDateTime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}
```

### 2. Нормализация данных при получении из API

В компоненте `AgendaManager`:

```typescript
// API возвращает массив напрямую - нормализуем данные
const agendaItems = (data ?? []).map(item => ({
  ...item,
  // Нормализуем date из ISO datetime в YYYY-MM-DD
  date: extractDateFromISO(item.date),
  // Нормализуем speakers - берём только id и name
  speakers: item.speakers.map(s => ({
    id: s.id,
    name: s.name,
  })),
}))
```

### 3. Обновлены типы

В `agenda.types.ts` добавлены комментарии, описывающие реальный формат данных:

```typescript
/**
 * Элемент программы события
 * Backend контракт:
 * - date приходит как ISO datetime ("2026-01-16T00:00:00.000Z"), нормализуется в YYYY-MM-DD
 * - startTime приходит как ISO datetime ("1970-01-01T09:00:00.000Z")
 * - speakers приходит как массив полных объектов Speaker, нормализуется в { id, name }
 */
export type AgendaItem = {
  date: string // ISO datetime от API, нормализуется в YYYY-MM-DD в UI
  startTime: string // ISO datetime от API
  speakers: Array<{ id: string; name: string }> // Нормализуется из полных объектов
  // ...
}
```

## Примеры

### До нормализации (данные с API):

```typescript
const apiData = {
  id: "5b7388e2-7e66-48d8-87c6-290c287c20d3",
  date: "2026-01-16T00:00:00.000Z",
  startTime: "1970-01-01T09:00:00.000Z",
  speakers: [
    {
      id: "31977e14-e54d-4f5b-868b-3b0b75825c92",
      name: "Abdufotihkhuja Ravshankhujaev",
      position: "CTO",
      company: "FinTech",
      // ... много других полей
    }
  ]
}
```

### После нормализации (в UI):

```typescript
const normalizedData = {
  id: "5b7388e2-7e66-48d8-87c6-290c287c20d3",
  date: "2026-01-16",                      // ✅ Нормализовано
  startTime: "1970-01-01T09:00:00.000Z",   // ✅ Без изменений
  speakers: [
    {
      id: "31977e14-e54d-4f5b-868b-3b0b75825c92",
      name: "Abdufotihkhuja Ravshankhujaev"  // ✅ Только id и name
    }
  ]
}
```

## Что нормализуется

### 1. **Поле `date`**

- **От API**: `"2026-01-16T00:00:00.000Z"` (ISO datetime)
- **В UI**: `"2026-01-16"` (YYYY-MM-DD)
- **Причина**: Для группировки по дням и отображения в селекторе

### 2. **Поле `speakers`**

- **От API**: Полные объекты `Speaker` с множеством полей
- **В UI**: Только `{ id: string, name: string }`
- **Причина**: Для отображения в списке и чекбоксах достаточно id и name

### 3. **Поле `startTime`**

- **От API**: `"1970-01-01T09:00:00.000Z"` (ISO datetime)
- **В UI**: Остаётся без изменений
- **Причина**: Используется функция `extractTimeFromISO()` для извлечения времени

## Преимущества нормализации

1. **Единообразие**: Данные всегда в ожидаемом формате
2. **Простота**: UI компоненты работают с простыми типами
3. **Производительность**: Меньше данных для хранения в состоянии
4. **Типобезопасность**: TypeScript корректно проверяет типы

## Обратная совместимость

Нормализация происходит **только на клиенте**, API остаётся без изменений:

- **API отправка** (POST/PATCH): Отправляем `date` как `"2026-01-16"` (строка)
- **API получение** (GET): Получаем `date` как ISO datetime, нормализуем в UI

## Измененные файлы

- `src/api/services/agenda.types.ts` — обновлены комментарии к типам
- `src/features/events/ui/agenda-manager/agenda-manager.tsx` — добавлена нормализация данных

## Связанные функции

```typescript
// Извлечение даты (новая)
extractDateFromISO(isoDateTime: string): string

// Извлечение времени (существующая)
extractTimeFromISO(isoDateTime: string): string

// Конвертация времени в ISO (существующая)
timeToISO(time: string): string

// Вычисление времени окончания (существующая)
calculateEndTime(startTime: string, duration: number): string
```

## Тестирование

### Проверка нормализации даты:

```typescript
extractDateFromISO("2026-01-16T00:00:00.000Z") // "2026-01-16" ✅
extractDateFromISO("2026-12-31T23:59:59.999Z") // "2026-12-31" ✅
```

### Проверка нормализации speakers:

```typescript
const apiSpeakers = [
  {
    id: "uuid-1",
    name: "John Doe",
    position: "CEO",
    company: "ACME",
    // ... много других полей
  }
]

const normalized = apiSpeakers.map(s => ({ id: s.id, name: s.name }))
// [{ id: "uuid-1", name: "John Doe" }] ✅
```
