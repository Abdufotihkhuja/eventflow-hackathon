# ProtectedLayout Widget

## Описание

`ProtectedLayout` — это единый layout-компонент для всех защищенных страниц приложения. Он оборачивает страницы в `AdminLayout` с настроенными sidebar и navbar, а также управляет заголовками, breadcrumbs и действиями для каждого маршрута.

## Особенности

- **Единая точка управления** sidebar и navbar для всех защищенных маршрутов
- **Автоматическая конфигурация** title, description, breadcrumbs на основе текущего роута
- **Централизованная навигация** — меню sidebar определено один раз
- **Условные действия** — кнопка "Создать событие" отображается только на нужных страницах
- **Темный sidebar** с фирменным желто-оранжевым градиентом
- **Светлый navbar** и контентная область

## Использование

### В роутинге

```tsx
import { ProtectedLayout } from '@widgets/protected-layout'

export const router = createBrowserRouter([
  // Защищенные маршруты с общим layout
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/events', element: <EventsPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
```

### На страницах

Страницы, обернутые в `ProtectedLayout`, должны возвращать только свой контент без layout компонентов:

```tsx
export function DashboardPage() {
  return (
    <>
      <section>Контент страницы</section>
    </>
  )
}
```

## Конфигурация маршрутов

Для добавления новой страницы в защищенный layout:

1. Добавьте роут в `router.tsx`:

```tsx
{ path: '/my-page', element: <MyPage /> }
```

2. Добавьте пункт в sidebar в `protected-layout.tsx`:

```tsx
const navigation: NavigationGroup[] = [
  {
    label: 'Мой раздел',
    items: [
      {
        href: '/my-page',
        label: 'Моя страница',
        icon: <Icon className="h-4 w-4" />,
      },
    ],
  },
]
```

3. Добавьте конфигурацию в `routeConfig`:

```tsx
const routeConfig = {
  '/my-page': {
    title: 'Моя страница',
    description: 'Описание',
    breadcrumbs: [{ label: 'Главная', href: '/' }, { label: 'Моя страница' }],
    showCreateButton: false, // опционально
  },
}
```

## Структура

```
protected-layout/
├── ui/
│   └── protected-layout.tsx  # Основной компонент
├── index.ts                   # Публичный API
└── README.md                  # Документация
```

## Зависимости

- `@widgets/admin-layout` — базовый layout с sidebar и navbar
- `react-router-dom` — для роутинга и navigation
- `lucide-react` — иконки для меню

## Дизайн

- **Sidebar**: темный градиент (slate-950 → slate-900) с фирменным желто-оранжевым акцентом
- **Navbar**: светлый (white/80 с backdrop-blur) с градиентными заголовками
- **Content**: светлый градиент (slate-50 → white → slate-100)
- **Логотип**: `/logo.svg` с градиентной рамкой
