# Обновление API программы мероприятия (Agenda)

## Дата: 21.01.2026

## Проблема

Frontend использовал расширенную структуру данных для программы мероприятия (agenda), которая не соответствовала реальному backend API:

**Старая структура (Frontend):**
```typescript
type AgendaItem = {
  id: string
  eventId: string
  title: string
  description?: string
  type: 'presentation' | 'workshop' | 'break' | 'networking' | ...
  startTime: string // ISO datetime
  endTime: string // ISO datetime
  duration: number
  location?: string
  speakerIds?: string[]
  order: number
  createdAt: string
  updatedAt: string
}
```

**Реальный backend контракт:**
```typescript
POST /api/v1/events/{eventId}/agenda
{
  "date": "2026-01-22",      // День проведения (YYYY-MM-DD)
  "startTime": "10:00",      // Время начала (HH:MM)
  "endTime": "11:30",        // Время окончания (HH:MM)
  "title": "Открытие",
  "sortOrder": 1
}
```

## Реализованные изменения

### 1. Обновлены типы данных

**Файлы:**
- `src/api/services/agenda.types.ts`
- `src/api/services/event.types.ts`

**Изменения:**
- Удалены поля: `description`, `type`, `location`, `speakerIds`, `duration`, `order`
- Добавлены поля: `date` (YYYY-MM-DD), `sortOrder`
- Изменён формат времени: с ISO datetime на HH:MM

**Новая структура:**
```typescript
export type AgendaItem = {
  id: string
  eventId: string
  title: string
  date: string // Формат: YYYY-MM-DD
  startTime: string // Формат: HH:MM
  endTime: string // Формат: HH:MM
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CreateAgendaItemRequest = {
  title: string
  date: string
  startTime: string
  endTime: string
  sortOrder: number
}
```

### 2. Обновлён UI компонент AgendaManager

**Файл:** `src/features/events/ui/agenda-manager/agenda-manager.tsx`

**Изменения:**
- Удалены поля для типа, описания, местоположения, спикеров
- Добавлено поле для выбора даты
- Упрощена форма редактирования
- Обновлена логика расчёта длительности (работает с HH:MM форматом)
- Удалены константы `AGENDA_TYPE_LABELS` и `AGENDA_TYPE_COLORS`

**Основные функции:**
- `extractDate()` - извлекает дату YYYY-MM-DD из ISO строки
- `calculateDuration()` - вычисляет длительность из HH:MM формата
- Автоматическое вычисление `sortOrder` для новых элементов

### 3. Упрощён EventAgendaTab

**Файл:** `src/pages/my-events/details/ui/tabs/event-agenda-tab.tsx`

**Изменения:**
- Убрана передача списка спикеров в `AgendaManager`
- Упрощён props компонента

### 4. Обновлено отображение в EventOverviewTab

**Файл:** `src/pages/my-events/details/ui/tabs/event-overview-tab.tsx`

**Изменения:**
- Удалены хелперы `getAgendaIcon()`, `AGENDA_TYPE_LABELS`, `formatTime()`
- Обновлена функция `calculateDuration()` для работы с HH:MM
- Упрощено отображение элементов программы (без типа, описания, локации, спикеров)
- Удалены неиспользуемые импорты иконок

## API эндпоинты

```typescript
// Получить программу
GET /api/v1/events/{eventId}/agenda

// Создать элемент
POST /api/v1/events/{eventId}/agenda
Body: CreateAgendaItemRequest

// Обновить элемент
PATCH /api/v1/events/{eventId}/agenda/{itemId}
Body: Partial<CreateAgendaItemRequest>

// Удалить элемент
DELETE /api/v1/events/{eventId}/agenda/{itemId}

// Изменить порядок
PATCH /api/v1/events/{eventId}/agenda/reorder
Body: { itemIds: string[] }
```

## Совместимость

### Обратная совместимость
❌ Изменения **не обратно совместимы** со старой структурой данных

### Миграция данных
Если на backend были данные со старой структурой, требуется миграция:
- Конвертация ISO datetime в date + time
- Удаление неиспользуемых полей
- Переименование `order` в `sortOrder`

## Тестирование

Необходимо протестировать:
- ✅ Создание новых элементов программы
- ✅ Редактирование существующих элементов
- ✅ Удаление элементов
- ✅ Отображение программы на странице обзора события
- ⚠️ Сортировка элементов (по date, startTime, sortOrder)
- ⚠️ Валидация времени (endTime > startTime)

## Возможные улучшения

1. **Валидация на frontend:**
   - Проверка что `endTime` больше `startTime`
   - Проверка что дата не раньше даты начала события

2. **UX улучшения:**
   - Drag & drop для изменения порядка
   - Автоматическая подсветка конфликтующих по времени элементов
   - Визуальная timeline для программы

3. **Функциональность:**
   - Возможность дублирования элемента
   - Bulk операции (массовое удаление/перемещение)
   - Экспорт программы в различные форматы

## Связанные файлы

- `src/api/services/agenda.types.ts` - типы API
- `src/api/services/agendaService.ts` - сервис для запросов
- `src/api/services/event.types.ts` - типы событий
- `src/entities/event/index.ts` - реэкспорт типов
- `src/features/events/api/use-agenda.ts` - React Query хуки
- `src/features/events/ui/agenda-manager/` - UI компонент управления
- `src/pages/my-events/details/ui/tabs/event-agenda-tab.tsx` - вкладка программы
- `src/pages/my-events/details/ui/tabs/event-overview-tab.tsx` - отображение в обзоре

## Авторы
- Дата обновления: 21.01.2026
- Причина: Приведение frontend в соответствие с backend API
