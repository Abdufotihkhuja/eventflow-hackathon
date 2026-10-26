# Обновление типов API под реальную структуру

**Дата:** 15 января 2026  
**Задача:** Синхронизация типов фронтенда с фактической структурой API  
**Статус:** ✅ Завершено

---

## 🎯 Проблема

Типы TypeScript не соответствовали реальной структуре ответа API. Это приводило к ошибкам при работе с данными.

## 📋 Выявленные расхождения

### Структура ответа

**Было (ожидалось):**
```typescript
interface PublicEventsResponse {
  data: PublicEvent[];
  meta: PaginationMeta;
}
```

**Стало (реальный API):**
```typescript
interface PublicEventsResponse {
  items: PublicEvent[];  // ❗ items вместо data
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### Поля события

| Поле (ожидалось) | Поле (реальное) | Тип |
|------------------|-----------------|-----|
| `imageUrl` | `coverImage` | string |
| `organizer` | `organization` | object |
| `capacity` | `maxParticipants` | number |
| `registeredCount` | `registrationsCount` | number |
| `isFree` | `type` | "FREE" \| "PAID" |
| `isFeatured` | ✅ `isFeatured` | boolean |

---

## ✅ Выполненные изменения

### 1. Обновлены типы API

**Файл:** `src/shared/api/eventService.ts`

```typescript
// Было
export interface PublicEventOrganizer {
  id: string;
  name: string;
  logo?: string;
}

// Стало
export interface PublicEventOrganization {
  id: string;
  name: string;
  logoUrl?: string;  // ❗ logoUrl вместо logo
}

// Было
export interface PublicEvent {
  imageUrl?: string;
  organizer: PublicEventOrganizer;
  capacity?: number;
  registeredCount?: number;
  isFree: boolean;
  // ...
}

// Стало
export interface PublicEvent {
  coverImage?: string;  // ❗ coverImage
  organization: PublicEventOrganization;  // ❗ organization
  maxParticipants?: number;  // ❗ maxParticipants
  registrationsCount?: number;  // ❗ registrationsCount
  type: EventPaymentType;  // ❗ type вместо isFree
  isFeatured?: boolean;  // ✅ новое поле
  city?: string;  // ✅ новое поле
  // ...
}
```

### 2. Обновлены адаптеры

**Файл:** `src/entities/event/lib/adapters.ts`

```typescript
export function adaptPublicEventToEvent(apiEvent: PublicEvent): Event {
  // Объединяем city и location
  const locationText = apiEvent.city 
    ? `${apiEvent.city}${apiEvent.location ? `, ${apiEvent.location}` : ""}`
    : (apiEvent.location ?? apiEvent.address);

  return {
    // ...
    location: locationText,
    capacity: apiEvent.maxParticipants,  // ❗ maxParticipants
    imageUrl: apiEvent.coverImage,  // ❗ coverImage
    isHighlighted: apiEvent.isFeatured ?? false,  // ❗ isFeatured
    pricing: apiEvent.type === "FREE" ? "free" : "paid",  // ❗ type
  };
}
```

### 3. Обновлены компоненты

**Обновлённые файлы:**
- ✅ `src/widgets/events/layout/events-page.tsx`
- ✅ `src/widgets/events/layout/past-events-page.tsx`
- ✅ `src/widgets/landing/featured-events/ui/landing-featured-events.tsx`
- ✅ `src/widgets/profile/events-catalog/ui/profile-events-catalog.tsx`
- ✅ `src/widgets/profile/featured-events/ui/profile-featured-events-slider.tsx`
- ✅ `src/app/(public)/events/[slug]/page.tsx`
- ✅ `src/app/(public)/events/[slug]/register/page.tsx`

**Изменения:**
```typescript
// Было
eventsResponse?.data
event.imageUrl
event.capacity
event.isFree

// Стало
eventsResponse?.items  // ❗ items
event.coverImage  // ❗ coverImage
event.maxParticipants  // ❗ maxParticipants
event.type === "FREE"  // ❗ type
```

### 4. Обновлены экспорты

**Файл:** `src/shared/api/index.ts`

```typescript
// Было
export { type PublicEventOrganizer } from "./eventService";

// Стало
export { type PublicEventOrganization } from "./eventService";
```

---

## 📊 Реальная структура API

### Пример ответа `/api/v1/public/events?filter=past`

```json
{
  "items": [
    {
      "id": "3d82e768-c6cd-4702-8b21-e2cf1e624ede",
      "title": "TISS Hack",
      "coverImage": "/uploads/6c49e424-cea4-4eaf-83e0-e5db1ce857bf.jpg",
      "startDate": "2026-01-07T05:00:00.000Z",
      "endDate": "2026-01-08T13:00:00.000Z",
      "format": "OFFLINE",
      "type": "FREE",
      "status": "PUBLISHED",
      "city": "Tashkent",
      "maxParticipants": 3,
      "registrationsCount": 0,
      "isFeatured": false,
      "organization": {
        "id": "cf281ee8-7af6-44e2-b59e-8d70a6676f14",
        "name": "TISS",
        "logoUrl": "/uploads/3304e9ee-ff15-479d-8830-896179e40615.png"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

---

## 🔧 Миграция существующего кода

### Checklist для разработчиков

Если вы используете API событий, обновите код:

- [ ] `data` → `items`
- [ ] `imageUrl` → `coverImage`
- [ ] `organizer` → `organization`
- [ ] `capacity` → `maxParticipants`
- [ ] `registeredCount` → `registrationsCount`
- [ ] `isFree` → `type === "FREE"`
- [ ] `meta.total` → `total` (прямо в response)

### Примеры миграции

#### 1. Получение списка событий

```typescript
// ❌ Было
const { data } = usePublicEventsQuery();
const events = data?.data ?? [];

// ✅ Стало
const { data } = usePublicEventsQuery();
const events = data?.items ?? [];
```

#### 2. Отображение изображения

```tsx
// ❌ Было
<Image src={event.imageUrl} alt={event.title} />

// ✅ Стало
<Image src={event.coverImage} alt={event.title} />
```

#### 3. Проверка бесплатности

```tsx
// ❌ Было
{event.isFree ? "Бесплатно" : `${event.price} сум`}

// ✅ Стало
{event.type === "FREE" ? "Бесплатно" : `${event.price} сум`}
```

#### 4. Вместимость

```tsx
// ❌ Было
<span>до {event.capacity} человек</span>

// ✅ Стало
<span>до {event.maxParticipants} человек</span>
```

#### 5. Организатор

```tsx
// ❌ Было
<span>{event.organizer.name}</span>
<Image src={event.organizer.logo} />

// ✅ Стало
<span>{event.organization.name}</span>
<Image src={event.organization.logoUrl} />
```

---

## ✅ Проверки

### TypeScript
```bash
$ npm run type-check
✅ No errors
```

### Обновлённые компоненты

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| EventsPage | ✅ | items вместо data |
| PastEventsPage | ✅ | items вместо data |
| EventsCatalog | ✅ | Адаптер обновлён |
| LandingFeaturedEvents | ✅ | items вместо data |
| ProfileEventsCatalog | ✅ | coverImage, type, maxParticipants |
| ProfileFeaturedEventsSlider | ✅ | coverImage, type, maxParticipants |
| EventDetailPage | ✅ | coverImage, type, maxParticipants |
| EventRegisterPage | ✅ | coverImage, type |

---

## 🚀 Тестирование

### Ручное тестирование

1. **Предстоящие события:**
```bash
GET https://eventflow.uz/api/v1/public/events?limit=10
```

2. **Прошедшие события:**
```bash
GET https://eventflow.uz/api/v1/public/events?filter=past&limit=50
```

3. **Проверка UI:**
- [ ] Изображения отображаются
- [ ] Цены корректны (FREE/PAID)
- [ ] Вместимость показывается правильно
- [ ] Организатор отображается
- [ ] Город показывается

---

## 📝 Документация API

### Эндпоинты

```
GET /api/v1/public/events
Query params:
  - filter: "upcoming" | "past" | "all"
  - city: string
  - format: "ONLINE" | "OFFLINE" | "HYBRID"
  - type: "FREE" | "PAID"
  - search: string
  - page: number
  - limit: number

Response:
{
  items: PublicEvent[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

---

## 🔮 Дальнейшие улучшения

### Рекомендации

1. **Валидация с Zod:**
```typescript
import { z } from "zod";

const PublicEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  coverImage: z.string().optional(),
  type: z.enum(["FREE", "PAID"]),
  // ...
});
```

2. **Runtime проверка:**
```typescript
export async function getPublicEvents(params) {
  const response = await apiGet(...);
  return PublicEventSchema.parse(response);
}
```

3. **Автогенерация типов:**
- Использовать OpenAPI/Swagger для генерации типов
- Синхронизация через CI/CD

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте, что используете обновлённые типы
2. Убедитесь, что адаптеры применяются
3. Проверьте консоль браузера на ошибки
4. Обратитесь к [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**Итог:** Все типы синхронизированы с реальным API. TypeScript теперь корректно проверяет типы, что предотвратит ошибки в runtime. ✅
