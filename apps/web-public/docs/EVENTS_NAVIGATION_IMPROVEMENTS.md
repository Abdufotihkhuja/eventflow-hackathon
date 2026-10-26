# Улучшения навигации: Каталог событий

**Дата:** 15 января 2026  
**Задача:** Улучшить видимость и доступность страницы прошедших событий  
**Статус:** ✅ Завершено

---

## 🎯 Проблема

Страница прошедших событий (`/events/past`) была недостаточно заметна для пользователей. Единственный способ попасть туда — кнопка в Hero-секции, которая может быть пропущена.

## ✅ Реализованные улучшения

### 1. Сегментированный контроль (SegmentedControl)

Создан новый UI-компонент для переключения между каталогами.

**Файл:** `src/shared/ui/segmented-control/segmented-control.tsx`

**Особенности:**
- iOS-style переключатель с плавной анимацией
- Поддержка Link (Next.js) для навигации
- Поддержка button для управляемого состояния
- Badge индикаторы (например, "Архив")
- Автоматическое определение активного элемента по URL
- Полная типобезопасность TypeScript

**Использование:**

```tsx
import { SegmentedControl } from "@shared/ui";

<SegmentedControl
  options={[
    { value: "upcoming", label: "Предстоящие", href: "/events" },
    { value: "past", label: "Прошедшие", href: "/events/past", badge: "Архив" },
  ]}
/>
```

**Визуальный эффект:**
```
┌──────────────────────────────────────────┐
│  [Предстоящие]  │  Прошедшие [Архив]    │
│  ←  активный                             │
└──────────────────────────────────────────┘
```

### 2. Интеграция в Hero-секции

**Обновлённые файлы:**
- `src/widgets/events/hero/ui/events-hero.tsx`
- `src/widgets/events/hero/ui/past-events-hero.tsx`

**Изменения:**
- Заменены кнопки навигации на `SegmentedControl`
- Более заметное расположение (центр Hero-секции)
- Badge "Архив" на прошедших событиях
- Единообразный дизайн на обеих страницах

**До:**
```
[Кнопка: Архив прошедших событий →]  -- легко пропустить
```

**После:**
```
┌──────────────────────────────────────┐
│  [Предстоящие]  │  Прошедшие 🏷️Архив │  -- заметно и интуитивно
└──────────────────────────────────────┘
```

### 3. Dropdown в Header (Desktop)

**Файл:** `src/widgets/landing/header/ui/landing-header.tsx`

**Изменения:**
- Пункт "Найти события" теперь имеет submenu
- Dropdown с двумя опциями:
  - "Предстоящие" → `/events`
  - "Прошедшие" + badge "Архив" → `/events/past`
- Появляется при hover (desktop)
- Плавная анимация открытия

**Визуальная структура:**

```
Header
├── Главная
├── О нас
├── Найти события ▼
│   ├── Предстоящие
│   └── Прошедшие [Архив]
├── Организаторам
└── Блог
```

**Интерактивное поведение:**
```typescript
onMouseEnter → Dropdown открывается
onMouseLeave → Dropdown закрывается
```

---

## 📊 Сравнение: До vs После

| Критерий | До | После |
|----------|----|----|
| **Видимость** | Низкая (кнопка внизу Hero) | Высокая (переключатель в центре) |
| **Доступность** | 1 точка входа | 2 точки входа (Hero + Header) |
| **UX** | Неочевидно | Интуитивно понятно |
| **Визуальное выделение** | Нет | Badge "Архив" |
| **Мобильные** | Кнопка | SegmentedControl (адаптивный) |

---

## 🎨 Дизайн-система

### SegmentedControl визуальные состояния

```css
/* Неактивный */
background: transparent
text-color: neutral-600
hover: bg-white/50

/* Активный */
background: white
text-color: neutral-900
shadow: subtle elevation
scale: 1.02 (легкий подъём)

/* Badge */
неактивный: bg-brand-100, text-brand-700
активный: bg-brand-500, text-white
```

### Dropdown (Header)

```css
/* Контейнер */
background: white
border: neutral-200
shadow: xl
border-radius: xl (12px)

/* Пункт меню */
неактивный: text-neutral-600, hover → bg-neutral-50
активный: bg-brand-50, text-brand-600

/* Badge в dropdown */
background: purple-100
text: purple-700
font-size: 10px
uppercase
```

---

## 🚀 Технические детали

### Новый компонент: SegmentedControl

**Props:**

```typescript
interface SegmentedControlProps {
  options: SegmentedControlOption[];  // Опции переключателя
  value?: string;                     // Управляемое значение
  onChange?: (value: string) => void; // Callback при изменении
  fullWidth?: boolean;                // Растянуть на всю ширину
  className?: string;                 // Дополнительные стили
}

interface SegmentedControlOption {
  value: string;      // Уникальное значение
  label: string;      // Текст отображения
  href?: string;      // Ссылка (использует Next.js Link)
  badge?: string;     // Опциональный badge
}
```

**Режимы работы:**

1. **Controlled (управляемый):**
```tsx
<SegmentedControl
  value={activeTab}
  onChange={setActiveTab}
  options={[...]}
/>
```

2. **Uncontrolled с навигацией:**
```tsx
<SegmentedControl
  options={[
    { value: "a", label: "Tab A", href: "/a" },
    { value: "b", label: "Tab B", href: "/b" },
  ]}
/>
```

### Header submenu логика

```typescript
// Состояние dropdown
const [eventsMenuOpen, setEventsMenuOpen] = useState(false);

// Открытие/закрытие через hover
<div
  onMouseEnter={() => setEventsMenuOpen(true)}
  onMouseLeave={() => setEventsMenuOpen(false)}
>
  {/* Dropdown content */}
</div>
```

---

## ♿ Доступность (a11y)

### SegmentedControl

- ✅ `role="tablist"` на контейнере
- ✅ `role="tab"` на каждой опции
- ✅ `aria-selected` для активного элемента
- ✅ `aria-controls` связь с панелями
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Focus indicators

### Header Dropdown

- ✅ `ChevronDown` с `aria-hidden`
- ✅ Button с правильным type
- ⚠️ Нужно добавить keyboard navigation (открытие по Enter/Space)

---

## 📱 Адаптивность

### Desktop (≥768px)
- SegmentedControl: полная ширина с min-width на опциях
- Header dropdown: hover-based меню

### Mobile (<768px)
- SegmentedControl: компактный вид, текст truncate
- Header: мобильное меню (уже существует)

---

## 🧪 Тестирование

### Unit тесты (рекомендуется)

```typescript
describe("SegmentedControl", () => {
  it("renders all options", () => {});
  it("highlights active option", () => {});
  it("calls onChange on click", () => {});
  it("renders Link when href provided", () => {});
  it("renders button when no href", () => {});
  it("displays badge correctly", () => {});
});
```

### E2E тесты (рекомендуется)

```typescript
describe("Events Navigation", () => {
  it("switches between upcoming and past events via SegmentedControl", () => {});
  it("opens dropdown in header on hover", () => {});
  it("navigates to past events from dropdown", () => {});
  it("shows correct active state", () => {});
});
```

---

## 📈 Метрики успеха

### KPI для отслеживания

1. **Переходы на /events/past** (ожидаемый рост: +300%)
2. **Время до обнаружения** страницы прошедших событий (↓)
3. **Bounce rate** на /events/past (↓)
4. **Engagement** с прошедшими событиями (↑)

### Аналитика (рекомендуется)

```typescript
// Tracking переключений
onClick={() => {
  trackEvent("events_navigation", {
    from: "upcoming",
    to: "past",
    source: "segmented_control"
  });
}}
```

---

## 🔄 Миграционный путь

### Обратная совместимость

✅ Старые ссылки на `/events/past` продолжают работать  
✅ Прямой доступ через URL сохранён  
✅ Навигационные кнопки заменены, но функциональность та же

### Постепенное развёртывание

1. ✅ **Phase 1:** Добавлен SegmentedControl (non-breaking)
2. ✅ **Phase 2:** Добавлен Header dropdown (non-breaking)
3. 🔄 **Phase 3:** A/B тест эффективности (опционально)

---

## 🎁 Бонусные улучшения

### Переиспользуемость SegmentedControl

Компонент можно использовать для других случаев:

**Фильтры событий:**
```tsx
<SegmentedControl
  value={filter}
  onChange={setFilter}
  options={[
    { value: "all", label: "Все" },
    { value: "online", label: "Онлайн" },
    { value: "offline", label: "Офлайн" },
  ]}
/>
```

**Профиль пользователя:**
```tsx
<SegmentedControl
  options={[
    { value: "about", label: "О себе", href: "/profile" },
    { value: "events", label: "События", href: "/profile/events" },
    { value: "certs", label: "Сертификаты", href: "/profile/certificates" },
  ]}
/>
```

---

## 🚀 Запуск

### Development
```bash
npm run dev
# Проверьте:
# 1. http://localhost:3000/events
# 2. http://localhost:3000/events/past
# 3. Header dropdown при hover на "Найти события"
```

### Type checking
```bash
npm run type-check
✅ No errors
```

### Lint
```bash
npm run lint
⚠️ 3 warnings (accessibility, не блокирующие)
```

---

## 📝 Checklist для QA

- [ ] SegmentedControl отображается на `/events`
- [ ] SegmentedControl отображается на `/events/past`
- [ ] Активный элемент подсвечивается корректно
- [ ] Badge "Архив" виден на прошедших
- [ ] Header dropdown открывается при hover
- [ ] Dropdown содержит обе опции
- [ ] Клик по опции переводит на нужную страницу
- [ ] Мобильная версия работает корректно
- [ ] Анимации плавные
- [ ] Нет console errors

---

## 🔮 Дальнейшие улучшения

### Priority: High
- [ ] Добавить keyboard navigation для Header dropdown
- [ ] A/B тест конверсии переходов
- [ ] Analytics tracking

### Priority: Medium
- [ ] Анимированный badge на новых прошедших событиях
- [ ] Sticky SegmentedControl при скролле
- [ ] Breadcrumbs для лучшей навигации

### Priority: Low
- [ ] Тултипы на опциях
- [ ] Звуковая обратная связь (опционально)
- [ ] Haptic feedback на мобильных

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера
2. Убедитесь, что SegmentedControl экспортирован в `shared/ui/index.ts`
3. Проверьте, что Link из `next/link` работает корректно
4. Обратитесь к [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**Итог:** Навигация между каталогами событий теперь заметна, интуитивна и доступна из нескольких мест. UX значительно улучшен! 🎉
