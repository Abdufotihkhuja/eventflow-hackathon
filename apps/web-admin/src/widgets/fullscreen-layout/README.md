# Fullscreen Layout

Специализированный layout для полноэкранных компонентов, таких как kanban-доска, timeline, и других.

## Использование

```tsx
// В роутере
{
  element: <ProtectedRoute element={<FullscreenLayout />} />,
  errorElement: withSuspense(<ErrorPage />),
  children: [
    {
      path: '/tasks/boards/:boardId',
      element: withSuspense(<BoardDetailPage />),
    },
  ],
}
```

## Особенности

- Занимает 100% viewport (h-screen w-screen)
- Скрывает scroll-барчики
- Используется `Outlet` из React Router для вложенных маршрутов
- Оптимизирован для больших экранов

## Отличия от ProtectedLayout

| Параметр      | ProtectedLayout     | FullscreenLayout |
| ------------- | ------------------- | ---------------- |
| Sidebar       | Да                  | Нет              |
| Header bar    | Да                  | Нет              |
| Max width     | Ограничена          | 100% экрана      |
| Scroll        | Разрешен            | Скрыт            |
| Использование | Большинство страниц | Kanban, Timeline |
