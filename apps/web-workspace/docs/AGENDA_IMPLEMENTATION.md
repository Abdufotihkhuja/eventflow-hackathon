# Реализация функционала "Программа мероприятия" (Agenda)

## Обзор

Реализован полноценный функционал управления программой мероприятия (agenda) с интеграцией API. Пользователи могут создавать, редактировать, удалять и изменять порядок пунктов программы.

## API Эндпоинты

Используются следующие эндпоинты из Swagger API:

- `GET /api/v1/events/{eventId}/agenda` - Получить программу события
- `POST /api/v1/events/{eventId}/agenda` - Создать пункт программы
- `PATCH /api/v1/events/{eventId}/agenda/{id}` - Обновить пункт программы
- `DELETE /api/v1/events/{eventId}/agenda/{id}` - Удалить пункт программы
- `PATCH /api/v1/events/{eventId}/agenda/reorder` - Изменить порядок программы

## Архитектура

### 1. API Layer (`src/api/services/`)

#### `agendaService.ts`
- Сервис для работы с agenda API
- Использует `apiClient` для выполнения запросов
- Экспортирует методы для всех CRUD операций

#### `agenda.types.ts`
```typescript
export type AgendaItem = {
  id: string
  eventId: string
  title: string
  description?: string
  type: AgendaItemType
  startTime: string // ISO datetime
  endTime: string // ISO datetime
  duration: number // в минутах
  location?: string
  speakerIds?: string[]
  order: number
  createdAt: string
  updatedAt: string
}

export type AgendaItemType = 
  | 'presentation' 
  | 'workshop' 
  | 'break' 
  | 'networking' 
  | 'panel' 
  | 'keynote'
  | 'qa'
  | 'other'
```

### 2. Feature Layer (`src/features/events/`)

#### `api/use-agenda.ts`
Хуки для работы с agenda через TanStack Query:

- `useAgendaQuery(eventId)` - Получить список пунктов программы
- `useCreateAgendaItem(eventId)` - Создать новый пункт
- `useUpdateAgendaItem(eventId)` - Обновить существующий пункт
- `useDeleteAgendaItem(eventId)` - Удалить пункт
- `useReorderAgenda(eventId)` - Изменить порядок пунктов

**Особенности:**
- Автоматическая инвалидация кэша после мутаций
- Оптимистичные обновления (можно добавить)
- Обработка ошибок
- Типобезопасность

#### `ui/agenda-manager/agenda-manager.tsx`
Основной компонент для управления программой мероприятия.

**Возможности:**
- Просмотр списка пунктов программы
- Добавление новых пунктов
- Редактирование существующих пунктов
- Удаление пунктов
- Привязка спикеров к пунктам
- Валидация данных
- Индикация загрузки и ошибок

**Ключевые особенности:**
- Работа с ISO datetime (startTime/endTime)
- Автоматическое вычисление endTime на основе duration
- Конвертация между временем (HH:MM) и ISO datetime
- Состояние редактирования для каждого пункта
- Поддержка создания новых пунктов локально до сохранения

### 3. Pages Layer (`src/pages/my-events/details/`)

#### `ui/tabs/event-agenda-tab.tsx`
Вкладка "Программа" на странице деталей события.

**Функциональность:**
- Загружает данные события
- Передает спикеров в AgendaManager
- Отображает описание раздела

#### `ui/event-details-page.tsx`
Обновлена для включения новой вкладки:
- Добавлен тип `'agenda'` в `TabType`
- Добавлена вкладка с иконкой Clock
- Добавлен рендеринг `EventAgendaTab`

### 4. Обновленные типы

#### `event.types.ts`
Обновлен тип `AgendaItem` для соответствия API:
```typescript
export type AgendaItem = {
  id: string
  eventId: string
  title: string
  description?: string
  type: 'presentation' | 'workshop' | 'break' | 'networking' | 'panel' | 'keynote' | 'qa' | 'other'
  startTime: string // ISO datetime
  endTime: string // ISO datetime
  duration: number // в минутах (вычисляемое)
  location?: string
  speakerIds?: string[]
  order: number
  createdAt: string
  updatedAt: string
}
```

## Функциональность

### Создание пункта программы

1. Пользователь нажимает "Добавить пункт"
2. Создается новый пункт с дефолтными значениями (время 09:00, длительность 60 мин)
3. Пункт переходит в режим редактирования
4. После заполнения и нажатия "Сохранить" отправляется POST запрос
5. Кэш обновляется автоматически

### Редактирование пункта

1. Пользователь нажимает "Редактировать"
2. Пункт переходит в режим редактирования
3. Изменения сохраняются локально
4. При нажатии "Сохранить" отправляется PATCH запрос
5. При нажатии "Отмена" изменения отменяются

### Удаление пункта

1. Пользователь нажимает кнопку удаления
2. Показывается подтверждение
3. При подтверждении отправляется DELETE запрос
4. Пункт удаляется из списка

### Привязка спикеров

- Спикеры подгружаются из события
- Можно выбрать несколько спикеров для одного пункта
- Спикеры отображаются в компактном виде в списке

## Работа со временем

### Конвертация времени
```typescript
// Из HH:MM в ISO datetime относительно даты события
function timeToISO(time: string, eventStartDate: string): string {
  const eventDate = new Date(eventStartDate)
  const [hours, minutes] = time.split(':').map(Number)
  
  const dateTime = new Date(eventDate)
  dateTime.setHours(hours, minutes, 0, 0)
  
  return dateTime.toISOString()
}

// Из ISO datetime в HH:MM
function isoToTime(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  return date.toTimeString().slice(0, 5)
}
```

### Вычисление времени окончания
```typescript
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  return end.toISOString()
}
```

## UI/UX

### Типы пунктов программы
- **Основной доклад** (keynote) - фиолетовый
- **Презентация** (presentation) - синий
- **Воркшоп** (workshop) - зелёный
- **Панельная дискуссия** (panel) - индиго
- **Нетворкинг** (networking) - янтарный
- **Перерыв** (break) - серый
- **Вопросы и ответы** (qa) - бирюзовый
- **Другое** (other) - серый

### Индикаторы состояния
- Loader при загрузке данных
- Loader при сохранении ("Сохранение...")
- Disabled состояние кнопок во время операций
- Сообщения об ошибках

### Валидация
- Название обязательно
- Время начала обязательно
- Длительность должна быть от 1 до 1440 минут
- Тип обязателен

## Интеграция с формами создания/редактирования

Старый компонент `AgendaField` (локальное управление через форму) оставлен для обратной совместимости, но не используется в новой реализации.

Новый подход:
- Agenda управляется отдельно через API после создания события
- Доступно во вкладке "Программа" на странице деталей события
- Не зависит от формы редактирования события

## Будущие улучшения

1. **Drag & Drop** - Изменение порядка перетаскиванием
2. **Массовые операции** - Удаление нескольких пунктов
3. **Шаблоны** - Готовые шаблоны программ
4. **Импорт/Экспорт** - CSV, JSON
5. **Конфликты** - Проверка пересечения времени
6. **Оптимистичные обновления** - Мгновенный UI feedback
7. **Копирование пунктов** - Дублирование существующих
8. **История изменений** - Отслеживание правок

## Связанные файлы

### API
- `src/api/services/agendaService.ts`
- `src/api/services/agenda.types.ts`
- `src/api/services/event.types.ts`

### Features
- `src/features/events/api/use-agenda.ts`
- `src/features/events/ui/agenda-manager/agenda-manager.tsx`
- `src/features/events/ui/agenda-manager/index.ts`
- `src/features/events/index.ts`

### Pages
- `src/pages/my-events/details/ui/tabs/event-agenda-tab.tsx`
- `src/pages/my-events/details/ui/event-details-page.tsx`
- `src/pages/my-events/details/ui/tabs/event-overview-tab.tsx`

## Тестирование

### Ручное тестирование
1. Создайте событие
2. Перейдите на вкладку "Программа"
3. Добавьте несколько пунктов программы
4. Отредактируйте существующий пункт
5. Удалите пункт
6. Привяжите спикеров к пункту
7. Проверьте отображение в overview tab

### Проверка API
- Проверьте Network tab в DevTools
- Убедитесь что запросы идут на правильные эндпоинты
- Проверьте формат отправляемых данных
- Убедитесь в корректной обработке ошибок

## Заметки

- Все даты/время работают в ISO 8601 формате
- Часовой пояс учитывается автоматически браузером
- Duration вычисляется автоматически из startTime и endTime
- Order управляется API автоматически при создании
- Reorder функция готова, но UI для drag&drop пока не реализован
