# Исправление: Базовый URL для медиафайлов

**Дата:** 26 января 2026

## Проблема

При отображении изображений блога (обложки, логотипы организаций) картинки не показывались, так как в API возвращаются относительные пути вида `/uploads/blog/image.jpg`, а не полные URL.

## Решение

Использована существующая функция `getMediaUrl()` из `@api/config`, которая автоматически добавляет базовый URL к относительным путям изображений.

### Функция getMediaUrl

```typescript
// src/api/config.ts
export const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_URL ?? 'https://eventflow.uz';

export function getMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  // Если уже полный URL — возвращаем как есть
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Добавляем базовый URL
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
```

## Исправленные компоненты

### 1. ImageUpload (компонент загрузки)
**Файл:** `src/shared/ui/image-upload.tsx`

```typescript
import { getMediaUrl } from "@api/config";

// В компоненте:
const displayUrl = getMediaUrl(value) || previewUrl;
```

### 2. BlogPostCard (карточка статьи)
**Файл:** `src/features/blog/ui/blog-post-card.tsx`

```typescript
import { getMediaUrl } from "@api/config";

// Для обложки:
<img src={getMediaUrl(post.coverImage)} alt={post.title} />

// Для логотипа организации:
<img src={getMediaUrl(post.organization.logoUrl)} alt={post.organization.name} />
```

### 3. BlogPostPage (страница статьи)
**Файл:** `src/pages/blog/details/ui/blog-post-page.tsx`

```typescript
import { getMediaUrl } from "@api/config";

// Для обложки:
<img src={getMediaUrl(post.coverImage)} alt={post.title} />

// Для логотипа:
<img src={getMediaUrl(post.organization.logoUrl)} alt={post.organization.name} />
```

### 4. MyBlogPostPage (управление статьей)
**Файл:** `src/pages/my-blog/details/ui/my-blog-post-page.tsx`

```typescript
import { getMediaUrl } from "@api/config";

// Аналогично для coverImage и logoUrl
```

### 5. SuperAdmin BlogPosts Columns (таблица админа)
**Файл:** `src/pages/super-admin/blog-posts/ui/blog-posts-columns.tsx`

```typescript
import { getMediaUrl } from "@api/config";

// В колонках таблицы:
<img src={getMediaUrl(coverImage)} />
<img src={getMediaUrl(org.logoUrl)} />
```

## Как это работает

1. **Относительный путь**
   - Приходит: `/uploads/blog/cover-123.jpg`
   - Преобразуется: `https://eventflow.uz/uploads/blog/cover-123.jpg`

2. **Абсолютный URL**
   - Приходит: `https://example.com/image.jpg`
   - Возвращается как есть: `https://example.com/image.jpg`

3. **Пустое значение**
   - Приходит: `null` или `undefined`
   - Возвращается: `undefined`

## Конфигурация

Базовый URL настраивается через переменную окружения:

```env
# .env
VITE_MEDIA_URL=https://eventflow.uz
```

По умолчанию используется `https://eventflow.uz`.

## Примеры использования

### В компоненте
```tsx
import { getMediaUrl } from "@api/config";

function MyComponent({ imageUrl }: { imageUrl?: string }) {
  return (
    <img 
      src={getMediaUrl(imageUrl)} 
      alt="Image" 
    />
  );
}
```

### В стилях (не рекомендуется)
Для CSS background-image нужно использовать inline styles:
```tsx
<div 
  style={{ 
    backgroundImage: `url(${getMediaUrl(imageUrl)})` 
  }} 
/>
```

## Проверка

После исправления проверьте:
- ✅ Обложки статей отображаются в списках
- ✅ Обложка отображается на странице статьи
- ✅ Логотипы организаций отображаются
- ✅ Превью в форме редактирования работает
- ✅ Таблица супер админа показывает изображения

## Альтернативные подходы (не использованы)

### 1. Преобразование на бэкенде
Бэкенд мог бы отдавать полные URL сразу. Но это потребовало бы изменения API.

### 2. Axios interceptor
Можно было добавить interceptor, который преобразует все URL в ответах. Но это менее явно и может привести к побочным эффектам.

### 3. Wrapper компонент
Можно создать `<Image>` компонент, который автоматически применяет `getMediaUrl`. Но это добавляет лишний уровень абстракции.

## Рекомендации

1. **Всегда используйте getMediaUrl** для изображений, приходящих с бэкенда
2. **Не используйте напрямую** `MEDIA_BASE_URL` для конкатенации строк
3. **Проверяйте null/undefined** перед передачей в `getMediaUrl` (функция безопасна, но лучше быть явным)
4. **Для внешних URL** функция работает корректно (не изменяет их)

---

**Статус:** ✅ Исправлено  
**Автор:** EventFlow Team
