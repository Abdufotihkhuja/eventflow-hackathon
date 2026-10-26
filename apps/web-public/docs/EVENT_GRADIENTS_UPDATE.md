# Обновление: Поддержка градиентов для обложек событий

## Обзор изменений

Добавлена полная поддержка градиентных обложек для событий вместо статичных изображений-шаблонов.

## Исправленные проблемы

### 1. Ссылки на события используют `id` вместо `slug`

**Проблема:** При клике на карточку события происходил переход на `/events/undefined`

**Решение:** Обновлены все ссылки для использования `event.id`:
- `src/widgets/profile/events-catalog/ui/profile-events-catalog.tsx`
- `src/widgets/profile/featured-events/ui/profile-featured-events-slider.tsx`

```tsx
// Было
<Link href={`/events/${event.slug}`}>

// Стало
<Link href={`/events/${event.id}`}>
```

### 2. Добавлена поддержка градиентных шаблонов

**Новые файлы:**

#### `src/entities/event/lib/image-templates.ts`
Содержит:
- Константы `BANNER_TEMPLATES`
- Типы `BannerTemplate`
- Маппинг градиентов `BANNER_TEMPLATE_GRADIENTS`
- Утилиты для обработки изображений

```typescript
export const BANNER_TEMPLATES = {
  PURPLE_SUNSET: "purple_sunset",
  OCEAN_BLUE: "ocean_blue",
  FOREST_GREEN: "forest_green",
  GOLDEN_HOUR: "golden_hour",
} as const;

export const BANNER_TEMPLATE_GRADIENTS: Record<BannerTemplate, string> = {
  purple_sunset: "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500",
  ocean_blue: "bg-gradient-to-r from-blue-600 to-purple-600",
  forest_green: "bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500",
  golden_hour: "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600",
};
```

#### `src/entities/event/ui/event-image.tsx`
Универсальный компонент для отображения обложки события:
- Автоматически определяет тип (изображение или градиент)
- Поддерживает children для наложения контента
- Полностью типизирован

```tsx
<EventImage
  coverImage={event.coverImage}
  alt={event.title}
  sizes="(max-width: 768px) 100vw, 33vw"
  className="object-cover"
>
  {/* Оверлеи, бейджи и т.д. */}
</EventImage>
```

## Типы обложек

### 1. Градиенты (новое!)
```json
{
  "coverImage": "template:purple_sunset"
}
```
Отображается как Tailwind градиент

### 2. Загруженные изображения
```json
{
  "coverImage": "/uploads/file.jpg"
}
```
Отображается как Next.js Image с полным URL

### 3. Внешние URL
```json
{
  "coverImage": "https://cdn.example.com/image.jpg"
}
```
Отображается как Next.js Image

## Функция processImageValue

Новая утилита для обработки `coverImage`:

```typescript
const result = processImageValue(event.coverImage);

if (result.type === "gradient") {
  // result.value содержит Tailwind класс
  // result.template содержит название шаблона
} else {
  // result.value содержит URL изображения
}
```

## Обновлённые компоненты

- ✅ `src/widgets/profile/events-catalog/ui/profile-events-catalog.tsx`
  - Используется `EventImage` вместо `Image`
  - Ссылки используют `event.id`

- ✅ `src/widgets/profile/featured-events/ui/profile-featured-events-slider.tsx`
  - Ссылки используют `event.id`

## Миграция существующих компонентов

### Было:
```tsx
import Image from "next/image";
import { getImageUrl } from "@entities/event";

const cardImage = getImageUrl(event.coverImage);

<Image
  src={cardImage}
  alt={event.title}
  fill
  className="object-cover"
/>
```

### Стало:
```tsx
import { EventImage } from "@entities/event/ui";

<EventImage
  coverImage={event.coverImage}
  alt={event.title}
  className="object-cover"
>
  {/* Опциональный контент поверх */}
</EventImage>
```

## Преимущества

1. **Производительность** - градиенты рендерятся мгновенно (без загрузки изображений)
2. **Консистентность** - единый стиль для всех событий без изображений
3. **Гибкость** - легко добавлять новые градиенты
4. **Типобезопасность** - все типизировано с TypeScript

## Дата обновления

15 января 2026
