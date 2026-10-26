# React Portal Implementation

## Дата: 3 января 2026

## Проблема

Модальные окна и toast-уведомления рендерились внутри родительских контейнеров, что приводило к:

- Ограничению overlay фона (не покрывал весь экран)
- Проблемам с `z-index` и stacking context
- Ограничениям от родительских `overflow: hidden`
- Неправильному позиционированию fixed элементов

## Решение

Реализован **React Portal** для рендеринга overlay элементов напрямую в `body`, минуя все родительские ограничения.

---

## Реализованные компоненты

### 1. usePortal Hook

**Путь:** `src/shared/lib/hooks/usePortal.ts`

```typescript
usePortal(id?: string): HTMLElement | null
```

**Функционал:**

- Создает или находит portal элемент в DOM
- Автоматически добавляет в `document.body`
- Переиспользует существующие portal элементы
- Корректно очищается при размонтировании

### 2. Portal Component

**Путь:** `src/shared/ui/portal/portal.tsx`

```tsx
<Portal id="portal-root">{children}</Portal>
```

**Особенности:**

- Использует `ReactDOM.createPortal`
- SSR-safe (проверка mounted состояния)
- Настраиваемый id для множественных порталов
- Типобезопасен

---

## Использование

### В модальных окнах

**До:**

```tsx
function Modal() {
  return (
    <div className="fixed inset-0 z-50">
      {/* Ограничивается родительским контейнером */}
    </div>
  );
}
```

**После:**

```tsx
import { Portal } from "@shared/ui";

function Modal() {
  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        {/* Рендерится напрямую в body */}
      </div>
    </Portal>
  );
}
```

### В Toast уведомлениях

```tsx
<Portal id="toast-portal">
  <div className="fixed right-4 top-4 z-50">
    {toasts.map((toast) => (
      <Toast key={toast.id} {...toast} />
    ))}
  </div>
</Portal>
```

---

## Обновленные компоненты

### 1. DeleteConfirmModal

**Файл:** `src/widgets/profile/settings/ui/profile-settings.tsx`

**Изменения:**

- ✅ Обернут в `<Portal>`
- ✅ Добавлен `useBodyScrollLock` для блокировки скролла
- ✅ Добавлен `useEscapeKey` для закрытия по ESC
- ✅ Улучшена accessibility (role, aria-modal, aria-labelledby)

### 2. ToastContainer

**Файл:** `src/shared/ui/toast/toast.tsx`

**Изменения:**

- ✅ Обернут в `<Portal id="toast-portal">`
- ✅ Добавлена проверка на пустой массив тостов
- ✅ Корректное позиционирование поверх всего контента

---

## Преимущества

### 1. Корректное отображение

- ✅ Overlay фон покрывает весь экран
- ✅ Модалки не ограничиваются родительскими контейнерами
- ✅ z-index работает предсказуемо

### 2. Лучший UX

- ✅ Блокировка скролла при открытии модалок
- ✅ Закрытие по ESC
- ✅ Правильная фокус-ловушка

### 3. Производительность

- ✅ Переиспользование portal элементов
- ✅ Оптимизированный re-render
- ✅ SSR-безопасность

### 4. Доступность

- ✅ Правильные ARIA атрибуты
- ✅ role="dialog" и aria-modal
- ✅ Keyboard navigation

---

## API

### Portal Props

```typescript
interface PortalProps {
  children: React.ReactNode;
  id?: string; // default: "portal-root"
}
```

### usePortal Hook

```typescript
function usePortal(id?: string): HTMLElement | null;
```

**Параметры:**

- `id` - уникальный идентификатор portal элемента

**Возвращает:**

- HTML элемент для рендеринга или `null`

---

## Примеры использования

### Кастомная модалка

```tsx
import { Portal, useBodyScrollLock, useEscapeKey } from "@shared/lib";

function CustomModal({ isOpen, onClose, children }) {
  useBodyScrollLock({ enabled: isOpen });
  useEscapeKey({ enabled: isOpen, onEscape: onClose });

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()}>{children}</div>
      </div>
    </Portal>
  );
}
```

### Tooltip с Portal

```tsx
function Tooltip({ children, content }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
      {isOpen && (
        <Portal id="tooltip-portal">
          <div className="fixed z-50">{content}</div>
        </Portal>
      )}
    </>
  );
}
```

---

## Технические детали

### SSR Compatibility

- ✅ Проверка `mounted` состояния
- ✅ Рендер только на клиенте
- ✅ Hydration без конфликтов

### Performance

- Portal элементы создаются один раз
- Переиспользуются между компонентами
- Автоматическая очистка при размонтировании

### Browser Support

- ✅ Все современные браузеры
- ✅ IE11+ (с полифиллами)

---

## Следующие шаги

### Рекомендуется портировать на Portal:

- [ ] Модальное окно редактирования профиля
- [ ] Dropdown меню (опционально)
- [ ] Confirmation dialogs
- [ ] Popover компоненты
- [ ] Image lightbox
- [ ] Context меню

---

## Заметки для разработчиков

1. **Всегда используйте Portal для:**
   - Модальных окон
   - Toast уведомлений
   - Tooltips
   - Dropdowns (если нужен overflow: visible)
   - Любых overlay элементов

2. **Добавляйте обработчики:**
   - `useBodyScrollLock` для модальных окон
   - `useEscapeKey` для закрытия по ESC
   - Click outside для закрытия

3. **Accessibility обязательна:**
   - `role="dialog"` для модальных окон
   - `aria-modal="true"`
   - `aria-labelledby` для заголовков
   - Focus trap

---

**Автор:** EventFlow Team
**Версия:** 1.0
