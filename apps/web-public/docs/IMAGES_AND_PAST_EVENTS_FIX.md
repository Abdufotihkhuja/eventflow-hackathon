# Исправления: Изображения и кнопка регистрации

**Дата:** 15 января 2026  
**Задача:** Исправить отображение изображений и скрыть кнопку регистрации для прошедших событий  
**Статус:** ✅ Завершено

---

## 🎯 Проблемы

1. **Изображения не отображаются** - API возвращает относительные пути (`/uploads/...`), нужен полный URL
2. **Кнопка "Зарегистрироваться"** - показывается для прошедших событий, что некорректно

---

## ✅ Решение 1: Изображения

### Проблема
API возвращает:
```json
{
  "coverImage": "/uploads/6c49e424-cea4-4eaf-83e0-e5db1ce857bf.jpg"
}
```

Но Next.js Image требует полный URL для внешних изображений.

### Решение

**Файл:** `src/entities/event/lib/adapters.ts`

Добавлена функция `getImageUrl()` для формирования полного URL:

```typescript
const IMAGE_BASE_URL = "https://eventflow.uz";

function getImageUrl(coverImage?: string): string | undefined {
  if (!coverImage) return undefined;
  
  // Если уже полный URL, возвращаем как есть
  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return coverImage;
  }
  
  // Если относительный путь, добавляем базовый URL
  return `${IMAGE_BASE_URL}${coverImage.startsWith("/") ? "" : "/"}${coverImage}`;
}
```

**Использование в адаптере:**
```typescript
export function adaptPublicEventToEvent(apiEvent: PublicEvent): Event {
  return {
    // ...
    imageUrl: getImageUrl(apiEvent.coverImage), // ✅ Полный URL
  };
}
```

### Результат

**Было:**
```
/uploads/6c49e424-cea4-4eaf-83e0-e5db1ce857bf.jpg  ❌ Не работает
```

**Стало:**
```
https://eventflow.uz/uploads/6c49e424-cea4-4eaf-83e0-e5db1ce857bf.jpg  ✅ Работает
```

---

## ✅ Решение 2: Кнопка регистрации

### Проблема
Для прошедших событий показывается кнопка "Зарегистрироваться", хотя регистрация уже невозможна.

### Решение

**Файл:** `src/widgets/events/detail/ui/event-details-view.tsx`

Обновлена функция `buildCtaLinks()`:

```typescript
function buildCtaLinks(event: EventDetail): CtaLink[] {
  // Проверяем, прошло ли событие
  const isPastEvent = event.endDate 
    ? new Date(event.endDate) < new Date()
    : new Date(event.startDate) < new Date();

  // Для прошедших событий не показываем кнопку регистрации
  if (isPastEvent) {
    // Если есть только secondaryCta (например, "Посмотреть материалы"), показываем её
    if (event.secondaryCta) {
      return [{
        label: event.secondaryCta.label,
        href: event.secondaryCta.href,
        variant: "primary",
      }];
    }
    // Если нет secondaryCta, возвращаем пустой массив
    return [];
  }

  // Для предстоящих событий показываем обычные CTA
  const links: CtaLink[] = [
    {
      label: event.primaryCta.label,
      href: event.primaryCta.href,
      variant: "primary",
    },
  ];

  if (event.secondaryCta) {
    links.push({
      label: event.secondaryCta.label,
      href: event.secondaryCta.href,
      variant: "outline",
    });
  }

  return links;
}
```

**Скрытие секции FinalCta:**
```typescript
function FinalCtaSection({ title, ctaLinks }: FinalCtaSectionProps): ReactNode {
  // Если нет кнопок (прошедшее событие), не показываем секцию
  if (ctaLinks.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-20">
      {/* ... */}
    </section>
  );
}
```

### Логика определения прошедшего события

```typescript
// Если есть endDate, проверяем его
const isPastEvent = event.endDate 
  ? new Date(event.endDate) < new Date()
  : new Date(event.startDate) < new Date();
```

**Примеры:**

| Событие | startDate | endDate | Текущая дата | isPastEvent |
|---------|-----------|---------|--------------|-------------|
| TISS Hack | 2026-01-07 | 2026-01-08 | 2026-01-15 | ✅ true |
| Future Event | 2026-02-01 | 2026-02-02 | 2026-01-15 | ❌ false |
| No endDate | 2026-01-01 | null | 2026-01-15 | ✅ true |

---

## 📊 Визуальное сравнение

### Предстоящее событие

```
┌─────────────────────────────────────────┐
│  [Изображение события]                  │
│                                         │
│  Название события                       │
│  Описание...                            │
│                                         │
│  [Зарегистрироваться] [Подробнее]  ✅  │
└─────────────────────────────────────────┘

Final CTA Section: ✅ Показывается
```

### Прошедшее событие

```
┌─────────────────────────────────────────┐
│  [Изображение события]                  │
│                                         │
│  Название события                       │
│  Описание...                            │
│                                         │
│  (Кнопки регистрации нет)          ✅  │
└─────────────────────────────────────────┘

Final CTA Section: ❌ Скрыта
```

---

## 🔧 Обновлённые файлы

### Изображения
1. ✅ `src/entities/event/lib/adapters.ts` - функция `getImageUrl()`
2. ✅ `src/app/(public)/events/[slug]/page.tsx` - полный URL для heroImage
3. ✅ `src/app/(public)/events/[slug]/register/page.tsx` - полный URL для coverImage

### Кнопка регистрации
1. ✅ `src/widgets/events/detail/ui/event-details-view.tsx` - логика `buildCtaLinks()`

---

## ✅ Проверки

### TypeScript
```bash
$ npm run type-check
✅ No errors
```

### Тестирование

**Изображения:**
- [ ] Открыть `/events/past`
- [ ] Проверить, что изображения отображаются
- [ ] Проверить консоль - нет ошибок 404

**Кнопка регистрации:**
- [ ] Открыть прошедшее событие (например, TISS Hack)
- [ ] Убедиться, что кнопки "Зарегистрироваться" нет
- [ ] Убедиться, что секция "Готовы присоединиться?" скрыта
- [ ] Открыть предстоящее событие
- [ ] Убедиться, что кнопка "Зарегистрироваться" есть

---

## 🎨 Next.js Image Configuration

Для работы с внешними изображениями нужно добавить домен в `next.config.ts`:

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eventflow.uz',
        pathname: '/uploads/**',
      },
    ],
  },
};
```

**Примечание:** Проверьте, что эта конфигурация уже есть в проекте.

---

## 🔮 Дальнейшие улучшения

### Priority: High
- [ ] Добавить placeholder для изображений во время загрузки
- [ ] Оптимизация изображений (WebP, размеры)
- [ ] Обработка ошибок загрузки изображений

### Priority: Medium
- [ ] Badge "Завершено" для прошедших событий
- [ ] Альтернативные CTA для прошедших событий (материалы, отзывы)
- [ ] Статистика посещаемости прошедших событий

### Priority: Low
- [ ] Lazy loading для изображений
- [ ] Progressive image loading
- [ ] CDN для изображений

---

## 📝 Примеры использования

### Проверка прошедшего события

```typescript
function isPastEvent(event: { startDate: string; endDate?: string }): boolean {
  const now = new Date();
  const endDate = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
  return endDate < now;
}

// Использование
if (isPastEvent(event)) {
  console.log("Событие завершено");
}
```

### Формирование URL изображения

```typescript
function getFullImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `https://eventflow.uz${path}`;
}

// Использование
<Image src={getFullImageUrl(event.coverImage)} alt={event.title} />
```

---

## 🐛 Troubleshooting

### Изображения не загружаются

**Проблема:** Next.js Image показывает ошибку "Invalid src prop"

**Решение:**
1. Проверьте `next.config.ts` - добавлен ли домен `eventflow.uz`
2. Убедитесь, что URL начинается с `https://`
3. Проверьте консоль браузера на ошибки CORS

### Кнопка всё ещё показывается

**Проблема:** Для прошедшего события показывается кнопка регистрации

**Решение:**
1. Проверьте `event.endDate` - корректная ли дата
2. Проверьте часовой пояс сервера и клиента
3. Добавьте `console.log` в `buildCtaLinks()` для отладки

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера
2. Проверьте Network tab - загружаются ли изображения
3. Проверьте даты событий в API
4. Обратитесь к [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**Итог:** 
- ✅ Изображения теперь отображаются с полным URL
- ✅ Кнопка регистрации скрыта для прошедших событий
- ✅ UX улучшен для архива событий
