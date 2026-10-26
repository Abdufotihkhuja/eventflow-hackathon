# Исправление отображения изображений в профиле пользователя

## Проблема

На странице профиля пользователя не отображались изображения событий. Это происходило потому, что:

1. API возвращает относительные пути к изображениям (например, `/uploads/events/123.jpg`)
2. Next.js Image компонент требует полные URL для внешних изображений
3. Функция `getImageUrl` существовала в `adapters.ts`, но не была экспортирована

## Решение

### 1. Экспортирована и улучшена функция `getImageUrl`

**Файл:** `src/entities/event/lib/adapters.ts`

Функция `getImageUrl` теперь экспортируется, всегда возвращает валидный URL и имеет встроенный fallback:

```typescript
export function getImageUrl(
  coverImage?: string | null,
  fallback = "/images/image.png"
): string {
  // Если изображение не указано, возвращаем fallback
  if (!coverImage) return fallback;
  
  // Если уже полный URL, возвращаем как есть
  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return coverImage;
  }
  
  // Если относительный путь, добавляем базовый URL
  return `${IMAGE_BASE_URL}${coverImage.startsWith("/") ? "" : "/"}${coverImage}`;
}
```

**Ключевые улучшения:**
- Функция теперь всегда возвращает `string` (не `undefined`)
- Встроенный fallback по умолчанию: `/images/image.png`
- Поддержка `null` значений
- Возможность переопределить fallback изображение

### 2. Обновлены компоненты профиля

Функция `getImageUrl` теперь используется во всех компонентах профиля:

#### `src/widgets/profile/events/ui/profile-events.tsx`
- Добавлен импорт: `import { getImageUrl } from "@entities/event";`
- Изменено: `const cardImage = getImageUrl(event.coverImage);` (fallback встроен в функцию)

#### `src/widgets/profile/events-catalog/ui/profile-events-catalog.tsx`
- Добавлен импорт: `import { formatEventPeriod, getImageUrl } from "@entities/event/lib";`
- Обновлены функции `EventCardGrid` и `EventCardList`

#### `src/widgets/profile/featured-events/ui/profile-featured-events-slider.tsx`
- Добавлен импорт: `import { formatEventPeriod, getImageUrl } from "@entities/event/lib";`
- Обновлена функция `SlideItem`

#### `src/app/(public)/events/[slug]/register/page.tsx`
- Добавлен импорт: `import { getImageUrl } from "@entities/event";`
- Упрощена логика отображения изображения

## Результат

Теперь все изображения событий в профиле пользователя отображаются корректно:
- ✅ Карточки событий в разделе "Мои события"
- ✅ Каталог событий
- ✅ Слайдер избранных событий
- ✅ Страница регистрации на событие

## Технические детали

- Базовый URL: `https://eventflow.uz`
- Функция автоматически определяет, является ли путь относительным или абсолютным
- Fallback изображение: `/images/image.png`
- Все изменения прошли проверку линтера без ошибок

## История изменений

### v3 - 15 января 2026 (поддержка шаблонов)
- Добавлена поддержка шаблонов изображений (формат: `"template:название"`)
- Улучшена типизация `PublicEvent.coverImage` с документацией форматов
- Создана документация `EVENT_IMAGE_TEMPLATES.md`
- Функция корректно обрабатывает три формата: шаблоны, относительные пути, абсолютные URL

### v2 - 15 января 2026 (исправление)
- Функция `getImageUrl` теперь всегда возвращает валидный URL (не `undefined`)
- Добавлен встроенный fallback для упрощения использования
- Убрана необходимость в дублировании `?? "/images/image.png"` в компонентах
- Улучшена обработка `null` значений

### v1 - 15 января 2026 (первая версия)
- Первоначальная реализация с экспортом `getImageUrl`

## Смотрите также

- [EVENT_IMAGE_TEMPLATES.md](./EVENT_IMAGE_TEMPLATES.md) - Подробная документация по обработке изображений
