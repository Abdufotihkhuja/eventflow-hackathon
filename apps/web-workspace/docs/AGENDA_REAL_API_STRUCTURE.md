# Реальная структура API программы мероприятия

## Дата: 21.01.2026

## Реальный формат данных от Backend

После анализа реального ответа от API выявлена окончательная структура данных:

### Response Example

```json
[
  {
    "id": "191c2cf7-1911-4bed-92ee-e5de0ae62919",
    "eventId": "370ff82d-0649-4e5f-b352-43ad400bbbf6",
    "title": "Networking Session",
    "description": null,
    "type": "NETWORKING",
    "startTime": "1970-01-01T12:52:00.000Z",  // ← ISO datetime (важно только время)
    "duration": 60,
    "location": null,
    "materials": [],
    "sortOrder": 1,
    "createdAt": "2026-01-21T17:45:14.902Z",
    "updatedAt": "2026-01-21T17:50:36.111Z",
    "speakers": []
  }
]
```

### Ключевые особенности

1. **startTime** - это **ISO datetime**, а НЕ просто строка HH:MM
   - Формат: `"1970-01-01T12:52:00.000Z"`
   - Используется epoch date `1970-01-01`
   - Важна только временная часть (HH:MM)

2. **Дополнительные поля**:
   - `description` - текстовое описание (nullable)
   - `location` - место проведения (nullable)
   - `materials` - массив материалов
   - `speakers` - массив спикеров

3. **Обязательные поля**:
   - `title` - название
   - `type` - тип активности (enum)
   - `startTime` - время начала (ISO datetime)
   - `duration` - длительность в минутах
   - `sortOrder` - порядок сортировки

## TypeScript типы

### Полная структура

```typescript
export const AgendaItemType = {
  KEYNOTE: 'KEYNOTE',
  PRESENTATION: 'PRESENTATION',
  WORKSHOP: 'WORKSHOP',
  PANEL: 'PANEL',
  NETWORKING: 'NETWORKING',
  BREAK: 'BREAK',
} as const

export type AgendaItemType = (typeof AgendaItemType)[keyof typeof AgendaItemType]

export type AgendaItem = {
  id: string
  eventId: string
  title: string
  description: string | null
  type: AgendaItemType
  startTime: string // ISO datetime: "1970-01-01T12:52:00.000Z"
  duration: number
  location: string | null
  materials: string[]
  sortOrder: number
  createdAt: string
  updatedAt: string
  speakers: Array<{ id: string; name: string }>
}

export type CreateAgendaItemRequest = {
  title: string
  type: AgendaItemType
  startTime: string // ISO datetime
  duration: number
  sortOrder: number
  description?: string
  location?: string
}
```

## Реализованная логика конвертации

### 1. Извлечение времени из ISO datetime

```typescript
function extractTimeFromISO(isoDateTime: string): string {
  try {
    const date = new Date(isoDateTime)
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  } catch {
    return '09:00'
  }
}

// "1970-01-01T12:52:00.000Z" → "12:52"
```

### 2. Конвертация HH:MM обратно в ISO datetime

```typescript
function timeToISO(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date('1970-01-01T00:00:00.000Z')
  date.setUTCHours(hours, minutes, 0, 0)
  return date.toISOString()
}

// "12:52" → "1970-01-01T12:52:00.000Z"
```

### 3. Вычисление времени окончания

```typescript
function calculateEndTime(startTime: string, duration: number): string {
  try {
    const date = new Date(startTime)
    date.setUTCMinutes(date.getUTCMinutes() + duration)
    return extractTimeFromISO(date.toISOString())
  } catch {
    return '10:00'
  }
}

// startTime: "1970-01-01T12:52:00.000Z", duration: 60
// → "13:52"
```

## Как это работает в UI

### Отображение времени

```typescript
// В списке
const displayStartTime = extractTimeFromISO(item.startTime)
const endTime = calculateEndTime(item.startTime, item.duration)

// Показываем пользователю: "12:52 - 13:52"
```

### Редактирование времени

```typescript
// Input type="time" работает с HH:MM
<Input
  type="time"
  value={extractTimeFromISO(editItem.startTime)} // ISO → HH:MM
  onChange={e => updateEditingItem(
    item.id, 
    'startTime', 
    timeToISO(e.target.value) // HH:MM → ISO
  )}
/>
```

### Сохранение на сервер

```typescript
const payload = {
  title: item.title.trim(),
  type: item.type,
  startTime: item.startTime, // Уже в ISO формате
  duration: item.duration,
  sortOrder: item.sortOrder,
  ...(item.description && { description: item.description }),
  ...(item.location && { location: item.location }),
}

// Отправляем на backend
await createMutation.mutateAsync(payload)
```

## Сортировка элементов

```typescript
const allItems = [...agendaItems, ...editingItems].sort((a, b) => {
  // Сначала по времени (ISO datetime)
  const timeA = new Date(a.startTime).getTime()
  const timeB = new Date(b.startTime).getTime()
  if (timeA !== timeB) return timeA - timeB
  
  // Затем по sortOrder
  return a.sortOrder - b.sortOrder
})
```

## API Request/Response Examples

### Создание элемента

**Request:**
```json
POST /api/v1/events/{eventId}/agenda
{
  "title": "Открытие конференции",
  "type": "KEYNOTE",
  "startTime": "1970-01-01T09:00:00.000Z",
  "duration": 60,
  "sortOrder": 1,
  "description": "Торжественное открытие",
  "location": "Главный зал"
}
```

**Response:**
```json
{
  "id": "uuid",
  "eventId": "uuid",
  "title": "Открытие конференции",
  "description": "Торжественное открытие",
  "type": "KEYNOTE",
  "startTime": "1970-01-01T09:00:00.000Z",
  "duration": 60,
  "location": "Главный зал",
  "materials": [],
  "sortOrder": 1,
  "speakers": [],
  "createdAt": "2026-01-21T...",
  "updatedAt": "2026-01-21T..."
}
```

### Получение списка

**Request:**
```
GET /api/v1/events/{eventId}/agenda
```

**Response:**
```json
[
  {
    "id": "...",
    "eventId": "...",
    "title": "Открытие",
    "description": null,
    "type": "KEYNOTE",
    "startTime": "1970-01-01T09:00:00.000Z",
    "duration": 60,
    "location": null,
    "materials": [],
    "sortOrder": 1,
    "speakers": [],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

## Почему используется epoch date?

Backend использует `1970-01-01` (Unix epoch) как базовую дату, потому что:
1. Дата события уже известна (хранится в событии)
2. Нужно хранить только время начала в пределах дня
3. Упрощает сравнение и сортировку по времени
4. Стандартный подход для "time-only" полей

## Важные замечания

### ✅ Правильно

```typescript
// Храним в состоянии ISO datetime
const [startTime, setStartTime] = useState('1970-01-01T09:00:00.000Z')

// Показываем пользователю HH:MM
const displayTime = extractTimeFromISO(startTime) // "09:00"

// Получаем из input, конвертируем в ISO
const handleChange = (value: string) => {
  setStartTime(timeToISO(value))
}
```

### ❌ Неправильно

```typescript
// НЕ храним просто строку HH:MM
const [startTime, setStartTime] = useState('09:00') // ❌

// НЕ отправляем HH:MM на backend
await api.post({ startTime: '09:00' }) // ❌
```

## Тестирование

### Тест кейсы

1. ✅ Создание с временем "09:00" → backend получает "1970-01-01T09:00:00.000Z"
2. ✅ Редактирование времени "10:30" → конвертируется в ISO
3. ✅ Отображение "1970-01-01T12:52:00.000Z" → показывается как "12:52"
4. ✅ Вычисление endTime: start "09:00" + duration 90 = end "10:30"
5. ✅ Сортировка по времени работает корректно

### Проверка в DevTools

```javascript
// В консоли браузера
const time = "12:52"
const iso = timeToISO(time)
console.log(iso) // "1970-01-01T12:52:00.000Z"

const extracted = extractTimeFromISO(iso)
console.log(extracted) // "12:52"
```

## Связанные файлы

- `src/api/services/agenda.types.ts` - типы с ISO datetime
- `src/api/services/event.types.ts` - типы событий
- `src/features/events/ui/agenda-manager/agenda-manager.tsx` - логика конвертации
- `src/pages/my-events/details/ui/tabs/event-overview-tab.tsx` - отображение

## Итог

✅ **Финальная реализация полностью соответствует реальному API:**
- Правильная структура данных с ISO datetime
- Корректная конвертация туда-обратно
- Поддержка всех полей из backend
- Работающая сортировка и вычисления
