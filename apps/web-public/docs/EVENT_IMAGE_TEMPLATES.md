# Обработка изображений событий

## Обзор

API возвращает изображения событий в трёх форматах:

1. **Шаблоны** - `"template:название"` (например, `"template:purple_sunset"`)
2. **Относительные пути** - `"/uploads/файл.jpg"` (загруженные файлы)
3. **Абсолютные URL** - `"https://example.com/image.jpg"` (редко используется)

## Типизация

### PublicEvent Interface

```typescript
export interface PublicEvent {
  // ...
  /**
   * Путь к изображению обложки события
   * Может быть в следующих форматах:
   * - "template:purple_sunset" - шаблон изображения
   * - "/uploads/file.jpg" - относительный путь к загруженному файлу
   * - "https://example.com/image.jpg" - абсолютный URL (редко)
   */
  coverImage?: string;
  // ...
}
```

## Функция getImageUrl

### Сигнатура

```typescript
export function getImageUrl(
  coverImage?: string | null,
  fallback = "/images/image.png"
): string
```

### Параметры

- `coverImage` - Путь к изображению, шаблон или абсолютный URL
- `fallback` - Fallback изображение (по умолчанию `/images/image.png`)

### Возвращаемое значение

Всегда возвращает валидный URL изображения (никогда не `undefined`)

### Логика обработки

1. **Если `coverImage` не указан** → возвращает `fallback`
2. **Если начинается с `"template:"`** → ищет в `IMAGE_TEMPLATES`
3. **Если начинается с `"http://"` или `"https://"`** → возвращает как есть
4. **Иначе** → добавляет базовый URL `https://eventflow.uz`

## Шаблоны изображений

Текущие доступные шаблоны:

```typescript
const IMAGE_TEMPLATES: Record<string, string> = {
  purple_sunset: "/images/image.png",
  blue_gradient: "/images/image1.png",
  green_nature: "/images/image2.png",
  orange_tech: "/images/image.png",
  default: "/images/image.png",
};
```

### Добавление нового шаблона

1. Добавьте изображение в `public/images/`
2. Обновите `IMAGE_TEMPLATES` в `src/entities/event/lib/adapters.ts`
3. Согласуйте название с backend командой

## Примеры использования

### В компонентах

```tsx
import { getImageUrl } from "@entities/event";

function EventCard({ event }) {
  const imageUrl = getImageUrl(event.coverImage);
  
  return (
    <Image
      src={imageUrl}
      alt={event.title}
      fill
      className="object-cover"
    />
  );
}
```

### Примеры входных данных

```typescript
// Шаблон
getImageUrl("template:purple_sunset")
// → "/images/image.png"

// Относительный путь
getImageUrl("/uploads/0f2b90cf-1d22-479c-b97d-48bef91d36ee.jpg")
// → "https://eventflow.uz/uploads/0f2b90cf-1d22-479c-b97d-48bef91d36ee.jpg"

// Абсолютный URL
getImageUrl("https://cdn.example.com/image.jpg")
// → "https://cdn.example.com/image.jpg"

// Пустое значение
getImageUrl(null)
// → "/images/image.png"

// Несуществующий шаблон
getImageUrl("template:unknown")
// → "/images/image.png" (default)
```

## API Response Example

```json
{
  "items": [
    {
      "id": "370ff82d-0649-4e5f-b352-43ad400bbbf6",
      "title": "Check Activity",
      "coverImage": "template:purple_sunset",
      "startDate": "2026-01-16T12:29:00.000Z",
      "format": "ONLINE",
      "type": "FREE",
      "organization": {
        "id": "51ab402b-3aa4-4a38-b9cc-3d0759f3fbd9",
        "name": "Test OOO"
      }
    },
    {
      "id": "99678186-0eca-4306-ace8-b8ea7bdf69bc",
      "title": "Test Event",
      "coverImage": "/uploads/0f2b90cf-1d22-479c-b97d-48bef91d36ee.jpg",
      "startDate": "2026-01-20T14:07:00.000Z",
      "format": "OFFLINE",
      "type": "FREE",
      "organization": {
        "id": "51ab402b-3aa4-4a38-b9cc-3d0759f3fbd9",
        "name": "Test OOO"
      }
    }
  ]
}
```

## Обновлённые файлы

- `src/entities/event/lib/adapters.ts` - добавлена обработка шаблонов
- `src/shared/api/eventService.ts` - улучшена документация типа `coverImage`
- `docs/EVENT_IMAGE_TEMPLATES.md` - документация (этот файл)

## Дата обновления

15 января 2026
