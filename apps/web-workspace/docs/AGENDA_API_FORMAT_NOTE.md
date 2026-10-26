# Важная особенность API программы мероприятия

## Дата: 21.01.2026

## ⚠️ Асимметрия форматов времени

Backend API имеет **разные форматы** для GET и POST/PATCH запросов:

### 📥 GET (Response) - ISO datetime

Backend **возвращает** время в ISO datetime формате:

```json
{
  "id": "...",
  "startTime": "1970-01-01T12:52:00.000Z",
  "duration": 60,
  ...
}
```

### 📤 POST/PATCH (Request) - HH:MM

Backend **ожидает** время в формате HH:MM:

```json
{
  "title": "Открытие",
  "type": "KEYNOTE",
  "startTime": "09:00",  // ← Формат HH:MM, не ISO!
  "duration": 60,
  ...
}
```

### ❌ Ошибка при отправке ISO

Если отправить ISO datetime:

```json
POST /api/v1/events/{eventId}/agenda
{
  "startTime": "1970-01-01T09:00:00.000Z"  // ❌ Неправильно
}
```

Получите ошибку 400:

```json
{
  "message": ["Время должно быть в формате HH:MM"],
  "error": "Bad Request",
  "statusCode": 400
}
```

## ✅ Правильная реализация

### Frontend логика

```typescript
// 1. Храним внутри компонента в ISO формате
const [item, setItem] = useState({
  startTime: "1970-01-01T09:00:00.000Z", // ISO формат
  // ...
})

// 2. Показываем пользователю HH:MM
const displayTime = extractTimeFromISO(item.startTime) // "09:00"

// 3. При сохранении конвертируем ISO -> HH:MM
const payload = {
  startTime: extractTimeFromISO(item.startTime), // "09:00"
  // ...
}

await api.post('/agenda', payload)
```

### Функция конвертации

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

// Примеры:
extractTimeFromISO("1970-01-01T09:00:00.000Z") // "09:00"
extractTimeFromISO("1970-01-01T14:30:00.000Z") // "14:30"
```

## 📋 Полный цикл данных

### Создание нового элемента

```typescript
// 1. Пользователь вводит время в input type="time"
<input type="time" value="12:30" />

// 2. Frontend конвертирует HH:MM -> ISO для внутреннего хранения
const startTime = timeToISO("12:30") // "1970-01-01T12:30:00.000Z"

// 3. При сохранении конвертируем обратно ISO -> HH:MM
const payload = {
  startTime: extractTimeFromISO(startTime), // "12:30"
}

// 4. Отправляем на backend
POST /api/v1/events/{eventId}/agenda
{ "startTime": "12:30", ... }
```

### Получение существующих элементов

```typescript
// 1. Backend возвращает ISO
GET /api/v1/events/{eventId}/agenda
[{ "startTime": "1970-01-01T12:30:00.000Z", ... }]

// 2. Frontend сохраняет как есть (ISO)
const items = response.data // ISO формат

// 3. Для отображения конвертируем ISO -> HH:MM
const displayTime = extractTimeFromISO(item.startTime) // "12:30"
```

### Редактирование элемента

```typescript
// 1. Элемент уже в ISO формате (из GET запроса)
const item = { startTime: "1970-01-01T14:00:00.000Z", ... }

// 2. Пользователь меняет время в input
<input 
  type="time" 
  value={extractTimeFromISO(item.startTime)} // "14:00"
  onChange={e => setItem({
    ...item,
    startTime: timeToISO(e.target.value) // "14:30" -> ISO
  })}
/>

// 3. При сохранении конвертируем ISO -> HH:MM
const payload = {
  startTime: extractTimeFromISO(item.startTime), // "14:30"
}

// 4. Отправляем на backend
PATCH /api/v1/events/{eventId}/agenda/{itemId}
{ "startTime": "14:30", ... }
```

## 🔍 Почему такая асимметрия?

### Гипотеза

Backend использует разные подходы для:
- **Хранения** - ISO datetime (с базой данных)
- **Валидации input** - HH:MM (простая валидация)

### Возможные причины

1. **Legacy код** - изначально было HH:MM, позже добавили ISO для хранения
2. **Разные валидаторы** - для input используется простой regex `^\d{2}:\d{2}$`
3. **DTOs** - разные Data Transfer Objects для Request и Response

## 📝 Рекомендации для backend

Для консистентности API рекомендуется:

### Вариант 1: Везде ISO datetime
```typescript
// Request и Response
{ "startTime": "1970-01-01T09:00:00.000Z" }
```

### Вариант 2: Везде HH:MM
```typescript
// Request и Response
{ "startTime": "09:00" }
```

### Вариант 3: Документировать асимметрию
Если изменение невозможно, добавить в API документацию:
```
POST/PATCH: startTime format - HH:MM
GET: startTime format - ISO 8601 datetime
```

## ✅ Текущее решение в коде

В `src/features/events/ui/agenda-manager/agenda-manager.tsx`:

```typescript
const saveItem = async (item: LocalAgendaItem) => {
  // ...validation...

  // Backend ожидает startTime в формате HH:MM, а не ISO datetime
  const startTimeHHMM = extractTimeFromISO(item.startTime)

  const payload = {
    title: item.title.trim(),
    type: item.type,
    startTime: startTimeHHMM, // ← Конвертируем ISO -> HH:MM
    duration: item.duration,
    sortOrder: item.sortOrder,
    // ...
  }

  // Отправляем на backend
  if (item.isNew) {
    await createMutation.mutateAsync(payload)
  } else {
    await updateMutation.mutateAsync({ itemId: item.id, data: payload })
  }
}
```

## 🧪 Тестирование

### Тест кейс 1: Создание
```typescript
// Input
const userInput = "14:30"

// Internal storage
const internal = timeToISO(userInput) // "1970-01-01T14:30:00.000Z"

// API request
const request = { startTime: extractTimeFromISO(internal) } // "14:30"

// ✅ Backend принимает
```

### Тест кейс 2: Чтение
```typescript
// API response
const response = { startTime: "1970-01-01T14:30:00.000Z" }

// Display to user
const display = extractTimeFromISO(response.startTime) // "14:30"

// ✅ Пользователь видит правильное время
```

### Тест кейс 3: Редактирование
```typescript
// Loaded from API
const loaded = { startTime: "1970-01-01T14:30:00.000Z" }

// User edits
const edited = { startTime: timeToISO("15:00") } // ISO

// Save to API
const request = { startTime: extractTimeFromISO(edited.startTime) } // "15:00"

// ✅ Цикл завершён успешно
```

## 📚 Связанные файлы

- `src/features/events/ui/agenda-manager/agenda-manager.tsx` - реализация конвертации
- `src/api/services/agenda.types.ts` - типы (комментарии о формате)
- `docs/AGENDA_REAL_API_STRUCTURE.md` - общая документация API

## 🎯 Итог

**Важно помнить:**
- 📥 **GET возвращает** ISO datetime: `"1970-01-01T12:52:00.000Z"`
- 📤 **POST/PATCH ожидают** HH:MM: `"12:52"`
- 🔄 **Всегда конвертируй** перед отправкой: `extractTimeFromISO()`
- ✅ **Внутри компонента** храни ISO для консистентности
