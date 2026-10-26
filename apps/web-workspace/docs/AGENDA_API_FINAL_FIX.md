# Финальное исправление API программы мероприятия

## Дата: 21.01.2026

## Проблема

После первой попытки интеграции с backend API получали ошибку 400:

```json
{
  "message": [
    "property date should not exist",
    "property endTime should not exist",
    "type must be one of the following values: KEYNOTE, PRESENTATION, WORKSHOP, PANEL, NETWORKING, BREAK",
    "duration must not be less than 1",
    "duration must be an integer number"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

Это показало, что реальный backend контракт отличается от первоначальных предположений.

## Реальный Backend контракт

```typescript
POST /api/v1/events/{eventId}/agenda
{
  "title": "Открытие",
  "type": "KEYNOTE",           // enum: KEYNOTE, PRESENTATION, WORKSHOP, PANEL, NETWORKING, BREAK
  "startTime": "10:00",        // HH:MM
  "duration": 90,              // Длительность в минутах (минимум 1)
  "sortOrder": 1
}
```

**Ключевые отличия:**
- ❌ НЕТ поля `date`
- ❌ НЕТ поля `endTime`
- ✅ ЕСТЬ поле `type` (обязательное, enum)
- ✅ ЕСТЬ поле `duration` (обязательное, integer >= 1)
- ✅ Время окончания вычисляется на frontend: `endTime = startTime + duration`

## Реализованные изменения

### 1. Обновлены типы данных

**Файлы:**
- `src/api/services/agenda.types.ts`
- `src/api/services/event.types.ts`

**Новая структура:**

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
  type: AgendaItemType
  startTime: string // HH:MM
  duration: number // Минуты
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateAgendaItemRequest = {
  title: string
  type: AgendaItemType
  startTime: string
  duration: number
  sortOrder: number
}
```

### 2. Полностью переписан AgendaManager с улучшенным UX

**Файл:** `src/features/events/ui/agenda-manager/agenda-manager.tsx`

**Улучшения UX/UI:**

#### ✨ Визуальные улучшения
- **Цветные иконки** для каждого типа активности (доклады, воркшопы, перерывы)
- **Badge с типом** активности для быстрого распознавания
- **Анимации** при раскрытии/сворачивании карточек
- **Ring-эффект** при редактировании для фокуса внимания
- **Hover-эффекты** на интерактивных элементах

#### 🎯 UX паттерны
- **Empty state** с призывом к действию
- **Inline редактирование** с развёрнутой формой
- **Автофокус** на поле названия при создании
- **Вычисляемое время окончания** отображается в реальном времени
- **Подсказки** для полей (например, для sortOrder)

#### ⚡ Обработка ошибок и feedback
- **Toast уведомления** через `sonner`:
  - Успешное создание/обновление
  - Успешное удаление
  - Ошибки валидации от API
  - Множественные ошибки (массив)
  
- **Frontend валидация**:
  - Название обязательно
  - Длительность >= 1 минута
  
- **Состояния загрузки**:
  - Skeleton при загрузке списка
  - Spinner на кнопках при сохранении/удалении
  - Disabled состояния во время операций

#### 🎨 UI компоненты

```typescript
// Конфигурация типов с иконками и цветами
const AGENDA_TYPE_CONFIG = {
  KEYNOTE: {
    label: 'Основной доклад',
    icon: Mic2,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  PRESENTATION: {
    label: 'Презентация',
    icon: Presentation,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  // ... и т.д.
}
```

#### 🔧 Функциональность

- **Автоматический sortOrder** для новых элементов
- **Сортировка по времени** с fallback на sortOrder
- **Confirm диалог** при удалении
- **Раскрывающиеся карточки** для компактного отображения
- **Двойной режим**: просмотр/редактирование

### 3. Обновлено отображение в EventOverviewTab

**Файл:** `src/pages/my-events/details/ui/tabs/event-overview-tab.tsx`

**Изменения:**
- Добавлены иконки типов активности
- Вычисление `endTime` на основе `startTime + duration`
- Badge с типом активности
- Улучшенная типизация через импорт `AgendaItemType`

## Примеры использования

### Создание элемента

```typescript
const payload = {
  title: 'Открытие конференции',
  type: 'KEYNOTE',
  startTime: '09:00',
  duration: 60,
  sortOrder: 1
}

await createMutation.mutateAsync(payload)
```

### Обработка ошибок

```typescript
try {
  await saveItem(editItem)
} catch (err: unknown) {
  const error = err as { response?: { data?: { message?: string | string[] } } }
  const apiMessage = error.response?.data?.message
  
  if (Array.isArray(apiMessage)) {
    // Множественные ошибки валидации
    apiMessage.forEach(msg => toast.error(msg))
  } else if (typeof apiMessage === 'string') {
    toast.error(apiMessage)
  } else {
    toast.error('Не удалось сохранить пункт программы')
  }
}
```

## API эндпоинты

```typescript
// Получить программу
GET /api/v1/events/{eventId}/agenda
Response: AgendaItem[]

// Создать элемент
POST /api/v1/events/{eventId}/agenda
Body: CreateAgendaItemRequest
Response: AgendaItem

// Обновить элемент
PATCH /api/v1/events/{eventId}/agenda/{itemId}
Body: Partial<CreateAgendaItemRequest>
Response: AgendaItem

// Удалить элемент
DELETE /api/v1/events/{eventId}/agenda/{itemId}
Response: void

// Изменить порядок
PATCH /api/v1/events/{eventId}/agenda/reorder
Body: { itemIds: string[] }
Response: AgendaItem[]
```

## Валидация

### Frontend валидация
- `title` - не пустая строка (trim)
- `duration` - >= 1 минута
- `type` - один из допустимых enum значений
- `startTime` - формат HH:MM (через input type="time")

### Backend валидация (из ошибок)
- `type` - должен быть одним из: KEYNOTE, PRESENTATION, WORKSHOP, PANEL, NETWORKING, BREAK
- `duration` - должен быть integer >= 1
- `date` - не должен существовать
- `endTime` - не должен существовать

## Тестирование

### ✅ Протестировано
- Создание новых элементов программы
- Редактирование существующих элементов
- Удаление элементов
- Отображение программы на странице обзора
- Сортировка элементов (по startTime, затем sortOrder)
- Обработка ошибок валидации от API
- Toast уведомления

### ⚠️ Требует тестирования
- Производительность с большим количеством элементов (100+)
- Одновременное редактирование несколькими пользователями
- Изменение порядка через drag & drop (TODO)

## UX/UI Best Practices применённые в проекте

### 1. Feedback и Visibility
- ✅ Мгновенный feedback через toast
- ✅ Состояния загрузки на всех асинхронных операциях
- ✅ Визуальная индикация редактируемого элемента (ring)
- ✅ Hover состояния для интерактивных элементов

### 2. Error Prevention
- ✅ Frontend валидация перед отправкой
- ✅ Disabled состояния во время операций
- ✅ Confirm диалог для деструктивных действий
- ✅ Подсказки для сложных полей

### 3. Consistency
- ✅ Единый стиль карточек
- ✅ Консистентные цвета для типов активности
- ✅ Единообразные кнопки действий
- ✅ Стандартные иконки из lucide-react

### 4. Efficiency
- ✅ Inline редактирование (без модальных окон)
- ✅ Автофокус на главном поле
- ✅ Автоматический sortOrder
- ✅ Вычисление endTime в реальном времени

### 5. Aesthetics
- ✅ Современный минималистичный дизайн
- ✅ Плавные анимации и transition
- ✅ Цветовая кодировка типов
- ✅ Правильная типографика и spacing

## Возможные улучшения

1. **Drag & Drop** для изменения порядка элементов
2. **Bulk операции** (массовое удаление/редактирование)
3. **Timeline view** для визуализации программы на временной шкале
4. **Конфликты времени** - автоматическая проверка пересечений
5. **Шаблоны программы** - сохранение и повторное использование
6. **Экспорт** в PDF/iCal формат
7. **Копирование элементов** для быстрого создания похожих пунктов

## Связанные файлы

- `src/api/services/agenda.types.ts` - типы API
- `src/api/services/agendaService.ts` - сервис для запросов
- `src/api/services/event.types.ts` - типы событий
- `src/entities/event/index.ts` - реэкспорт типов
- `src/features/events/api/use-agenda.ts` - React Query хуки
- `src/features/events/ui/agenda-manager/agenda-manager.tsx` - UI компонент управления
- `src/pages/my-events/details/ui/tabs/event-agenda-tab.tsx` - вкладка программы
- `src/pages/my-events/details/ui/tabs/event-overview-tab.tsx` - отображение в обзоре

## Зависимости

- `sonner` - для toast уведомлений
- `lucide-react` - для иконок
- `@tanstack/react-query` - для управления запросами
- `shadcn/ui` - UI компоненты

## Итог

Реализована полная интеграция с backend API с соблюдением лучших практик UI/UX:
- ✅ Корректная структура данных
- ✅ Полная обработка ошибок с визуальным feedback
- ✅ Современный и интуитивный интерфейс
- ✅ Валидация на frontend и обработка backend валидации
- ✅ Плавные анимации и transitions
- ✅ Accessibility через semantic HTML и ARIA
