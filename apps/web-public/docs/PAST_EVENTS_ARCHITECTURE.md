# Архитектура: Каталог прошедших событий

## Общая схема

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  URL: /events/past?query=хакатон                            │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────┐             │
│  │   Page (Server Component)                  │             │
│  │   src/app/(public)/events/past/page.tsx    │             │
│  └─────────────────┬──────────────────────────┘             │
│                    │ delegates to                            │
│                    ▼                                         │
│  ┌────────────────────────────────────────────┐             │
│  │   PastEventsPage (Client Component)        │             │
│  │   src/widgets/events/layout/               │             │
│  │                                             │             │
│  │   ┌─────────────────────────────────────┐  │             │
│  │   │  usePublicEventsQuery({             │  │             │
│  │   │    params: { filter: "past" }       │  │             │
│  │   │  })                                  │  │             │
│  │   └──────────────┬──────────────────────┘  │             │
│  │                  │                          │             │
│  │                  ▼                          │             │
│  │   ┌─────────────────────────────────────┐  │             │
│  │   │  Client-side Filtering & Search     │  │             │
│  │   │  (searchTerm, appliedFilters)       │  │             │
│  │   └──────────────┬──────────────────────┘  │             │
│  │                  │                          │             │
│  │      ┌───────────┴─────────────┐           │             │
│  │      ▼                          ▼           │             │
│  │  ┌────────────┐        ┌────────────────┐  │             │
│  │  │ PastEvents │        │  EventsCatalog │  │             │
│  │  │    Hero    │        │   (Grid View)  │  │             │
│  │  │            │        │                │  │             │
│  │  │ • Search   │        │  • EventCard[] │  │             │
│  │  │ • Filters  │        │  • Empty State │  │             │
│  │  │ • Nav Btn  │        │  • Title       │  │             │
│  │  └────────────┘        └────────────────┘  │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │ API Request
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (API Server)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GET /api/v1/public/events?filter=past&limit=50             │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────┐             │
│  │   Events Controller                        │             │
│  │   • Validate params                        │             │
│  │   • Filter by: endDate < now               │             │
│  │   • Apply city, format, type filters       │             │
│  └─────────────────┬──────────────────────────┘             │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────┐             │
│  │   Database (PostgreSQL)                    │             │
│  │                                             │             │
│  │   SELECT * FROM events                     │             │
│  │   WHERE end_date < NOW()                   │             │
│  │   AND status = 'COMPLETED'                 │             │
│  │   ORDER BY end_date DESC                   │             │
│  │   LIMIT 50                                 │             │
│  └─────────────────┬──────────────────────────┘             │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────┐             │
│  │   Response                                 │             │
│  │   {                                        │             │
│  │     data: PublicEvent[],                   │             │
│  │     meta: { total, page, limit }           │             │
│  │   }                                        │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Слои FSD

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 6: app                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  (public)/events/past/page.tsx                          │ │
│ │  • Server Component                                     │ │
│ │  • Handles searchParams                                 │ │
│ │  • Renders PastEventsPage widget                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: widgets                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  events/layout/past-events-page.tsx                     │ │
│ │  • Client Component                                     │ │
│ │  • Manages search & filter state                        │ │
│ │  • Fetches data via usePublicEventsQuery                │ │
│ │  • Composes Hero + Catalog                              │ │
│ └───────────────┬───────────────────┬─────────────────────┘ │
│                 │                   │                        │
│                 ▼                   ▼                        │
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │ events/hero/        │  │ events/catalog/     │           │
│ │ past-events-hero    │  │ events-catalog      │           │
│ │                     │  │                     │           │
│ │ • Search form       │  │ • Grid layout       │           │
│ │ • Filter buttons    │  │ • EventCard loop    │           │
│ │ • Navigation        │  │ • Empty state       │           │
│ └─────────────────────┘  └─────────────────────┘           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: features                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  event/search/EventsSearchForm                          │ │
│ │  • Text input with debounce                             │ │
│ │  • onSearch callback                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: entities                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  event/                                                 │ │
│ │  • Types: Event, EventDetail                            │ │
│ │  • Adapters: adaptPublicEventsToEvents()                │ │
│ │  • Formatters: getEventFormatLabel(), etc               │ │
│ │  • UI: EventCard                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: shared                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  api/eventService.ts                                    │ │
│ │  • API functions: getPublicEvents()                     │ │
│ │  • Types: PublicEventsParams, EventTimeFilter           │ │
│ │  • Query keys: EVENT_QUERY_KEYS                         │ │
│ │                                                         │ │
│ │  lib/hooks/usePublicEventsQuery.ts                      │ │
│ │  • TanStack Query wrapper                               │ │
│ │  • Caching, staleTime, retry logic                      │ │
│ │                                                         │ │
│ │  ui/                                                    │ │
│ │  • Button, Surface, Pill, etc                           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Поток данных

### 1. Инициализация страницы

```
User navigates to /events/past
         │
         ▼
Server renders page.tsx
         │
         ▼
Hydration: PastEventsPage becomes interactive
         │
         ▼
usePublicEventsQuery executes
         │
         ▼
Checks TanStack Query cache
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  Cache     Cache
  HIT       MISS
    │         │
    │         ▼
    │    Fetch from API
    │         │
    └────┬────┘
         │
         ▼
Data available in component
```

### 2. Фильтрация событий

```
API Data (50 events)
         │
         ▼
adaptPublicEventsToEvents()  <-- Entities layer
         │
         ▼
Local Events Array
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Search    Filters
Filter    Active?
         │
         ▼
Filtered Events Array
         │
         ▼
Render in EventsCatalog
```

### 3. Обработка действий пользователя

```
User types in search box
         │
         ▼
EventsSearchForm onChange
         │
         ▼
onSearch callback
         │
         ▼
setSearchTerm in PastEventsPage
         │
         ▼
useMemo recalculates filteredEvents
         │
         ▼
Re-render EventsCatalog with new data
```

## Кеширование и оптимизация

### TanStack Query Cache Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Query Key: ["events", "list", { filter: "past", limit: 50 }]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  State: success                                              │
│  Data: { data: Event[], meta: PaginationMeta }              │
│  Stale: false                                                │
│  Age: 2 min 30 sec / 5 min                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Background Refetch: disabled                        │    │
│  │ Retry on Error: 3 attempts                          │    │
│  │ Cache Time: 5 minutes (staleTime)                   │    │
│  │ GC Time: 5 minutes after last observer              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Client-side Filter Performance

```
Initial Load (50 events)
         │
         ▼
Store in memory: allEvents
         │
         ▼
User applies filter
         │
         ▼
useMemo recalculation (O(n) scan)
         │
         ▼
filteredEvents (subset)
         │
         ▼
Instant re-render (no API call)
```

## Типобезопасность

### Type Flow

```typescript
// API Response
interface PublicEventsResponse {
  data: PublicEvent[];          // <-- From API
  meta: PaginationMeta;
}
         │
         ▼
// Adapter (entities layer)
function adaptPublicEventsToEvents(
  events: PublicEvent[]         // <-- API type
): Event[]                      // <-- Internal type
         │
         ▼
// Component Props
interface EventsCatalogProps {
  events: Event[];              // <-- Internal type
  searchTerm: string;
}
         │
         ▼
// Render
<EventCard event={event} />     // <-- Fully typed
```

## Состояние компонента

### PastEventsPage State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                      Component State                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  searchTerm: string                 (useState)               │
│  appliedFilters: string[]           (useState)               │
│                                                              │
│  eventsResponse: {                  (usePublicEventsQuery)   │
│    data: PublicEvent[],                                      │
│    meta: PaginationMeta                                      │
│  }                                                           │
│                                                              │
│  isLoading: boolean                 (from query)             │
│  error: Error | null                (from query)             │
│                                                              │
│  allEvents: Event[]                 (useMemo)                │
│  filteredEvents: Event[]            (useMemo)                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Навигация между каталогами

```
┌─────────────────────┐           ┌─────────────────────┐
│   /events           │           │   /events/past      │
│   (Upcoming)        │◄─────────►│   (Past)            │
│                     │           │                     │
│  • Orange theme     │           │  • Purple theme     │
│  • filter=upcoming  │           │  • filter=past      │
│  • "→ Archive" btn  │           │  • "← Upcoming" btn │
└─────────────────────┘           └─────────────────────┘
         │                                 │
         └────────┬────────────────────────┘
                  │
                  ▼
         Shared Components:
         • EventsCatalog
         • EventCard
         • EventsSearchForm
```

## Расширяемость

### Добавление нового фильтра

1. **API-уровень:**
```typescript
// shared/api/eventService.ts
export interface PublicEventsParams {
  // ...existing
  newFilter?: "value1" | "value2";
}
```

2. **Query-builder:**
```typescript
function buildEventsQueryParams(params) {
  // ...
  addParam("newFilter", params.newFilter);
}
```

3. **UI-уровень:**
```typescript
// widgets/events/hero/past-events-hero.tsx
const FILTER_HIGHLIGHTS = [
  // ...existing
  { id: "newFilter-value1", label: "New Filter" },
];
```

4. **Фильтрация:**
```typescript
// widgets/events/layout/past-events-page.tsx
case "newFilter-value1":
  return event.someField === "value1";
```

---

**Заключение:** Архитектура спроектирована по принципу слоёв (FSD), с чёткими границами ответственности и возможностью масштабирования без breaking changes.
