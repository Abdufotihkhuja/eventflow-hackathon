# Каталог прошедших событий

## Обзор

Реализован полноценный каталог прошедших мероприятий с поддержкой всех фильтров API и навигацией между текущими и прошедшими событиями.

## Структура реализации

### 1. API-сервис (`shared/api/eventService.ts`)

**Добавлено:**
- Тип `EventTimeFilter = "upcoming" | "past" | "all"`
- Параметр `filter?: EventTimeFilter` в `PublicEventsParams`
- Поддержка параметра `filter` в `buildEventsQueryParams()`

**Примеры использования API:**

```typescript
// Предстоящие события (по умолчанию)
eventService.getPublicEvents();

// Прошедшие события
eventService.getPublicEvents({ filter: "past" });

// Все события
eventService.getPublicEvents({ filter: "all" });

// Прошедшие события с фильтрами
eventService.getPublicEvents({
  filter: "past",
  city: "Tashkent",
  format: "OFFLINE",
  limit: 50
});
```

### 2. Новая страница `/events/past`

**Файл:** `src/app/(public)/events/past/page.tsx`

- Server Component, поддерживает query-параметр `?query=...` для начального поиска
- Использует `PastEventsPage` widget для отображения

### 3. Виджет `PastEventsPage`

**Файл:** `src/widgets/events/layout/past-events-page.tsx`

**Функциональность:**
- Загрузка прошедших событий через `usePublicEventsQuery({ params: { filter: "past" } })`
- Клиентская фильтрация по поисковому запросу
- Поддержка фильтров (онлайн/офлайн, сертификаты, командные, и т.д.)
- Loading и Error states
- Переиспользует `EventsCatalog` для отображения сетки событий

### 4. Hero-секция для прошедших событий

**Файл:** `src/widgets/events/hero/ui/past-events-hero.tsx`

**Особенности:**
- Уникальный дизайн с фиолетовой цветовой схемой (отличается от предстоящих)
- Поисковая форма с автодополнением
- Фильтры с визуальной индикацией активных
- Навигационная кнопка "← Предстоящие события"
- Счётчик найденных/доступных мероприятий

### 5. Обновлённый Hero для текущих событий

**Файл:** `src/widgets/events/hero/ui/events-hero.tsx`

**Добавлено:**
- Навигационная кнопка "Архив прошедших событий →"

## Поддерживаемые фильтры

### Временные фильтры (API)
- `upcoming` - предстоящие события (endDate >= now), по умолчанию
- `past` - прошедшие события (endDate < now), включая COMPLETED
- `all` - все события

### Дополнительные фильтры (API)
- `city` - город проведения
- `format` - ONLINE, OFFLINE, HYBRID
- `type` - FREE, PAID
- `search` - поиск по названию
- `page`, `limit` - пагинация

### Клиентские фильтры (UI)
- Онлайн и гибрид
- Офлайн-площадки
- С сертификатом участия
- Командные и индивидуальные
- Безлимит или с лимитом мест
- Открытые и по приглашению
- Бесплатные и платные

## Навигация

### Из предстоящих в прошедшие:
`/events` → кнопка "Архив прошедших событий →" → `/events/past`

### Из прошедших в предстоящие:
`/events/past` → кнопка "← Предстоящие события" → `/events`

## Дизайн-система

### Цветовая схема предстоящих событий:
- Градиенты: оранжево-жёлтые оттенки
- Pill tone: `brand`
- Акцентный цвет: `brand-500`

### Цветовая схема прошедших событий:
- Градиенты: фиолетовые оттенки
- Pill tone: `neutral`
- Акцентный цвет: `purple-*`
- Визуальное отличие для быстрого распознавания

## Архитектура

### FSD-слои:
```
app/(public)/events/past/page.tsx          # Роут
├── widgets/events/layout/past-events-page # Страница-виджет
│   ├── widgets/events/hero/past-events-hero # Hero-секция
│   └── widgets/events/catalog/events-catalog # Сетка событий
├── features/event/search                   # Поисковая форма
├── entities/event                          # Адаптеры и типы
└── shared/api/eventService                # API-клиент
```

### Переиспользование компонентов:
- `EventsCatalog` - общий для текущих и прошедших
- `EventCard` - карточка события
- `EventsSearchForm` - форма поиска
- `usePublicEventsQuery` - хук запросов

## Примеры использования

### Открыть каталог прошедших событий:
```
/events/past
```

### Поиск с начальным запросом:
```
/events/past?query=хакатон
```

### Программный переход:
```tsx
import Link from "next/link";

<Link href="/events/past">
  <Button>Посмотреть прошедшие события</Button>
</Link>
```

## Производительность

- **SSR**: Начальный HTML рендерится на сервере
- **TanStack Query**: Кеширование, авто-рефетч, оптимистичные обновления
- **Stale time**: 5 минут для списков событий
- **Client-side filtering**: Мгновенная фильтрация без запросов к серверу

## Доступность

- Семантичная разметка (heading hierarchy)
- ARIA-атрибуты на интерактивных элементах
- Keyboard navigation
- Screen reader support

## Будущие улучшения

- [ ] Пагинация для больших списков
- [ ] Infinite scroll
- [ ] Сортировка по дате/популярности
- [ ] Фильтр по диапазону дат
- [ ] Экспорт списка событий
- [ ] Сохранение фильтров в URL query params
- [ ] Добавление метаданных для SEO

## Связанные файлы

- API: `src/shared/api/eventService.ts`
- Хуки: `src/shared/lib/hooks/usePublicEventsQuery.ts`
- Типы: `src/entities/event/model/types.ts`
- Страница: `src/app/(public)/events/past/page.tsx`
- Виджеты: `src/widgets/events/`
