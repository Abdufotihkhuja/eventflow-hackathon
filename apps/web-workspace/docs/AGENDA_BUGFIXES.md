# Исправления ошибок в AgendaManager

## Исправленные проблемы

### 1. ❌ Не работает скрытие карточки после развертывания

**Проблема:**
После клика на карточку элемента программы она раскрывается, но повторный клик не закрывает её.

**Причина:**
Использовалась функция `setExpandedItem` напрямую, которая только устанавливает ID, но не переключает состояние.

```typescript
// ❌ Было:
onToggleExpand={setExpandedItem}

// При клике:
setExpandedItem(item.id)  // Всегда устанавливает ID, не проверяя текущее состояние
```

**Решение:**
Добавлена функция `toggleExpand`, которая проверяет текущее состояние и переключает его:

```typescript
// ✅ Стало:
const toggleExpand = (itemId: string) => {
  // Если элемент уже раскрыт - закрываем, иначе - открываем
  setExpandedItem(prev => (prev === itemId ? null : itemId))
}

onToggleExpand={toggleExpand}
```

**Результат:**
- Первый клик → раскрывает карточку
- Второй клик → закрывает карточку
- Клик на другую карточку → закрывает текущую и открывает новую

---

### 2. ❌ Изменения спикеров не сохраняются

**Проблема:**
При изменении спикеров (отметка/снятие галочек) изменения не отправляются на сервер или работают некорректно.

**Причина:**
При старте редактирования использовался shallow copy объекта, что приводило к мутации оригинального массива `speakers`:

```typescript
// ❌ Было:
const startEditing = (item: AgendaItem) => {
  setEditingItems(prev => ({
    ...prev,
    [item.id]: { ...item, isEditing: true },
    //            ^^^^^^ shallow copy - speakers по ссылке!
  }))
}
```

При изменении спикеров через `onCheckedChange`, мы изменяли оригинальный массив, а не копию, что могло приводить к непредсказуемому поведению.

**Решение:**
Добавлено глубокое копирование массива `speakers`:

```typescript
// ✅ Стало:
const startEditing = (item: AgendaItem) => {
  setEditingItems(prev => ({
    ...prev,
    [item.id]: {
      ...item,
      speakers: [...item.speakers],  // ✅ Новый массив
      isEditing: true,
    },
  }))
}
```

Также улучшена функция `updateEditingItem` для проверки существования элемента:

```typescript
// ✅ Добавлена проверка:
const updateEditingItem = (itemId, field, value) => {
  setEditingItems(prev => {
    if (!prev[itemId]) return prev  // ✅ Защита от undefined
    return {
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }
  })
}
```

**Результат:**
- Изменения спикеров корректно сохраняются в состоянии
- Отправляются на сервер при сохранении элемента программы
- Нет мутации оригинальных данных

---

### 3. ❌ Неправильное отображение сообщений об ошибках от API

**Проблема:**
Сообщения об ошибках от API не отображаются, хотя приходят корректно:

```json
{
  "message": "Дата должна быть в пределах дат мероприятия: 2026-01-16 - 2026-01-16",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Причина:**
Неправильная обработка структуры ошибки. Код пытался прочитать `error.response?.data?.message`, но после нормализации в `apiClient` ошибка имеет структуру:

```typescript
// ❌ Было:
const error = err as { response?: { data?: { message?: string } } }
const apiMessage = error.response?.data?.message  // undefined!
```

**Решение:**
Исправлена обработка ошибок с учетом нормализации `ApiError`:

```typescript
// ✅ Стало:
const error = err as {
  message?: string  // Основное сообщение (уже извлечено из data.message)
  details?: { 
    message?: string | string[]
    errors?: Record<string, string[]>
  }
}

if (Array.isArray(error.details?.message)) {
  // Множественные ошибки валидации
  error.details.message.forEach(msg => toast.error(msg))
} else if (error.message) {
  // Основное сообщение ошибки
  toast.error(error.message)  // ✅ "Дата должна быть в пределах..."
}
```

**Результат:**
- ✅ Сообщения об ошибках корректно отображаются
- ✅ Поддерживаются как единичные, так и множественные ошибки
- ✅ Учитывается нормализация `ApiError` из `apiClient`

---

### 4. ❌ Неправильный расчёт количества дней события

**Проблема:**
Для однодневного события (например, 16 января с 12:29 до 22:40) в программе отображаются два дня:
- День 1 — 16 января ✅
- День 2 — 17 января ❌ (не входит в даты события)

**Причина:**
Функция `getEventDays` создавала `Date` объекты напрямую из ISO datetime строк, которые содержат время:

```typescript
// ❌ Было:
const start = new Date(startDate)  // "2026-01-16T12:29:00.000Z"
const end = new Date(endDate)      // "2026-01-16T22:40:00.000Z"

// Устанавливаем время в 00:00
start.setHours(0, 0, 0, 0)
end.setHours(0, 0, 0, 0)
```

Проблема возникала из-за часовых поясов и некорректного парсинга дат с временем.

**Решение:**
Используем функцию `extractDateFromISO` для извлечения только даты перед созданием `Date` объектов:

```typescript
// ✅ Стало:
function getEventDays(startDate: string, endDate: string): string[] {
  // Извлекаем только дату (YYYY-MM-DD) из ISO datetime
  const startDateOnly = extractDateFromISO(startDate)  // "2026-01-16"
  const endDateOnly = extractDateFromISO(endDate)      // "2026-01-16"

  // Создаём Date объекты из строк YYYY-MM-DD
  const start = new Date(startDateOnly + 'T00:00:00')
  const end = new Date(endDateOnly + 'T00:00:00')
  // ...
}
```

**Результат:**
- ✅ Для однодневного события показывается только один день
- ✅ Для многодневных событий корректно показываются все дни
- ✅ Время в датах события не влияет на расчёт количества дней
- ✅ Нет проблем с часовыми поясами

**Пример:**
- Событие: 16.01.2026 (12:29) — 16.01.2026 (22:40) → 1 день ✅
- Событие: 16.01.2026 (09:00) — 18.01.2026 (18:00) → 3 дня ✅

---

## Дополнительные улучшения

### Проверка в updateEditingItem
Добавлена проверка существования элемента перед обновлением, что предотвращает ошибки при попытке обновить несуществующий элемент.

---

## Как проверить

### Проверка скрытия/раскрытия:
1. Откройте программу события
2. Кликните на элемент программы → должен раскрыться
3. Кликните еще раз → должен закрыться ✅
4. Кликните на другой элемент → предыдущий закроется, новый откроется ✅

### Проверка сохранения спикеров:
1. Откройте программу события
2. Нажмите "Редактировать" на элементе программы
3. Отметьте/снимите галочки со спикеров
4. Нажмите "Сохранить"
5. Откройте DevTools → Network → проверьте PATCH запрос
6. Убедитесь, что `speakerIds` отправляются корректно ✅

Пример запроса:
```json
{
  "date": "2026-01-16",
  "title": "Презентация",
  "startTime": "09:00",
  "duration": 60,
  "speakerIds": [
    "31977e14-e54d-4f5b-868b-3b0b75825c92"
  ]
}
```

---

## Измененные файлы

- `src/features/events/ui/agenda-manager/agenda-manager.tsx`
  - Добавлена функция `toggleExpand()`
  - Улучшена функция `startEditing()` (deep copy speakers)
  - Улучшена функция `updateEditingItem()` (проверка существования)

---

## Технические детали

### Нормализация ошибок API

В `apiClient` используется функция `normalizeApiError`, которая преобразует ошибки Axios в единый формат:

```typescript
// В config.ts:
function normalizeApiError(error: AxiosError<ApiErrorResponse>): ApiError {
  if (error.response) {
    const { status, data } = error.response
    return {
      status,
      message: data?.message ?? error.message,  // ✅ Извлекаем message
      isNetworkError: false,
      details: data,  // ✅ Сохраняем полные данные
    }
  }
  // ...
}
```

**Результат нормализации:**

```typescript
// От API:
{
  "message": "Дата должна быть в пределах дат мероприятия: 2026-01-16 - 2026-01-16",
  "error": "Bad Request",
  "statusCode": 400
}

// После normalizeApiError:
{
  status: 400,
  message: "Дата должна быть в пределах дат мероприятия: 2026-01-16 - 2026-01-16",
  isNetworkError: false,
  details: {
    message: "Дата должна быть в пределах...",
    error: "Bad Request",
    statusCode: 400
  }
}
```

Поэтому правильно читать `error.message`, а не `error.response.data.message`.

### Проблема с мутацией
React использует сравнение по ссылке для определения изменений. Если мы мутируем оригинальный массив, React может не обнаружить изменения:

```typescript
// ❌ Плохо:
const speakers = item.speakers  // Та же ссылка
speakers.push(newSpeaker)       // Мутация оригинала

// ✅ Хорошо:
const speakers = [...item.speakers]  // Новая ссылка
speakers.push(newSpeaker)            // Мутация копии
```

### Проверка в updateEditingItem
Без проверки существования элемента может возникнуть ошибка при попытке обновить undefined:

```typescript
// ❌ Может упасть:
{
  ...prev[itemId],  // Если prev[itemId] === undefined → ошибка
  [field]: value,
}

// ✅ Безопасно:
if (!prev[itemId]) return prev  // Выходим раньше
```
