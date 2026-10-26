# Profile Widgets

Виджеты для раздела профиля, организованные согласно Feature-Sliced Design.

## Структура

```
widgets/profile/
├── navigation/       # Компонент навигации профиля
├── about/           # Секция "Обзор профиля"
├── events/          # Секция "События"
├── calendar/        # Секция "Календарь"
├── certificates/    # Секция "Сертификаты"
└── articles/        # Секция "Статьи"
```

## Принципы организации

### 1. Layout в App Router

Структура layout (sidebar, контейнер, общая обертка) находится в `app/(public)/profile/layout.tsx`, а не в widgets. Это соответствует принципам FSD, где app-слой управляет общей структурой страниц.

```tsx
// app/(public)/profile/layout.tsx
export default function ProfileLayout({ children }) {
  return (
    <div className="bg-neutral-50 py-10">
      <div className="mx-auto flex max-w-6xl gap-8">
        <aside>
          {/* Sidebar с навигацией */}
          <ProfileNavigation />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
```

### 2. Widgets содержат только UI

Каждый виджет профиля содержит только контент секции без внешних layout-оберток:

- ❌ Нет `<section>` с background и padding
- ❌ Нет `.container` оберток
- ✅ Только контент секции в простом `<div>`

```tsx
// Правильно ✅
export function ProfileAboutSection() {
  return <div className="space-y-6">{/* Контент секции */}</div>;
}

// Неправильно ❌
export function ProfileAboutSection() {
  return (
    <section className="bg-neutral-50 py-16">
      <div className="container">{/* Контент секции */}</div>
    </section>
  );
}
```

### 3. Navigation вынесен отдельно

Компонент навигации вынесен в отдельный виджет `widgets/profile/navigation`, что позволяет:

- Переиспользовать его в других местах (например, мобильное меню)
- Тестировать изолированно
- Легко модифицировать логику навигации

## Использование

### В страницах

```tsx
// app/(public)/profile/events/page.tsx
import { ProfileEventsSection } from "@widgets/profile/events";

export default function ProfileEventsPage() {
  return <ProfileEventsSection />;
}
```

### Layout автоматически оборачивает

Layout автоматически применяется ко всем страницам в `app/(public)/profile/*`:

- Добавляет sidebar с навигацией
- Применяет общие стили и структуру
- Управляет responsive поведением

## Преимущества новой структуры

1. **Соответствие FSD** - layout в app, UI компоненты в widgets
2. **Чистота ответственности** - widgets не знают о layout
3. **Переиспользуемость** - виджеты можно использовать в других контекстах
4. **Тестируемость** - каждый компонент тестируется изолированно
5. **Гибкость** - легко менять layout без изменения виджетов

## Миграция со старой структуры

Старая структура (удалена):

- ❌ `widgets/profile/layout/profile-page.tsx` - содержал sidebar и структуру

Новая структура:

- ✅ `app/(public)/profile/layout.tsx` - содержит sidebar и структуру
- ✅ `widgets/profile/navigation` - переиспользуемая навигация
- ✅ Виджеты без layout-оберток
