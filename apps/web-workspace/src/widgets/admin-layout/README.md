# Admin Layout Widget

Современный адаптивный layout для админ-панели с улучшенным UI/UX.

## Компоненты

### AdminLayout

Основной компонент layout'а, объединяющий Sidebar, Navbar и контент.

### AdminSidebar

Улучшенный боковой сайдбар с современным дизайном и плавными анимациями.

#### Ключевые улучшения UI/UX:

1. **Визуальные индикаторы**
   - Вертикальная полоска слева для активного пункта меню
   - Subtle градиенты для улучшения визуальной иерархии
   - Плавные переходы между состояниями

2. **Микроанимации**
   - Иконки масштабируются при hover (scale-110)
   - Кнопки реагируют на нажатие (active:scale-[0.98])
   - Плавное появление индикаторов при hover

3. **Современный дизайн**
   - Минималистичные иконки без тяжелых box'ов
   - Улучшенная типографика с правильными размерами и весами
   - Gradient фон для логотипа с тенью и ring эффектом
   - Backdrop blur для footer'а

4. **Адаптивность**
   - Плавное сворачивание (280px → 68px)
   - Tooltips в свернутом состоянии
   - Мобильная версия через Sheet компонент

5. **Кастомный скроллбар**
   - Тонкий стильный скроллбар (6px)
   - Прозрачный track
   - Hover эффекты

#### Пример использования:

```tsx
import { AdminLayout, type NavigationGroup } from '@widgets/admin-layout'

const navigation: NavigationGroup[] = [
  {
    items: [
      {
        href: '/dashboard',
        label: 'Панель',
        icon: <LayoutDashboard className="h-4 w-4" />,
        end: true,
      },
    ],
  },
  {
    label: 'Управление',
    items: [
      {
        href: '/my-events',
        label: 'Мои события',
        icon: <CalendarDays className="h-4 w-4" />,
        badge: 12,
      },
    ],
  },
]

export function Page() {
  return (
    <AdminLayout
      title="Заголовок страницы"
      description="Описание"
      breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Текущая страница' }]}
      navigation={navigation}
      userName="Иван Иванов"
      userEmail="ivan@example.com"
      notificationCount={3}
      onLogout={() => console.log('Logout')}
      sidebarFooter={
        <div>
          <p className="font-semibold">💡 Подсказка</p>
          <p className="mt-1">Используйте ⌘K для поиска</p>
        </div>
      }
    >
      {/* Контент страницы */}
    </AdminLayout>
  )
}
```

## Типы

### NavigationItem

```typescript
type NavigationItem = {
  href: string
  label: string
  icon?: ReactNode
  end?: boolean
  badge?: string | number
  disabled?: boolean
}
```

### NavigationGroup

```typescript
type NavigationGroup = {
  label?: string // Опциональный заголовок группы
  items: NavigationItem[]
}
```

### BreadcrumbItem

```typescript
type BreadcrumbItem = {
  label: string
  href?: string // Если нет href, элемент не кликабелен
}
```

## Особенности

- **Автоматическое состояние**: Sidebar запоминает развернутое/свернутое состояние
- **Доступность**: Полная поддержка ARIA атрибутов и keyboard navigation
- **Производительность**: Все анимации через CSS transitions
- **Мобильная адаптация**: Sheet компонент для мобильных устройств
- **Типобезопасность**: Полная типизация на TypeScript

## Стилизация

Компонент использует Tailwind CSS и shadcn/ui. Основные цвета берутся из CSS переменных:

- `--primary` - основной цвет для активных элементов
- `--muted` - приглушенные элементы
- `--border` - границы
- `--destructive` - кнопка выхода

## Горячие клавиши

Рекомендуется добавить поддержку горячих клавиш:

- `⌘K` или `Ctrl+K` - Поиск
- `[` - Свернуть/развернуть sidebar
- `Esc` - Закрыть мобильный sidebar
