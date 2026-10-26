# SegmentedControl Component

Универсальный компонент переключателя в стиле iOS для Next.js + TypeScript.

## Описание

`SegmentedControl` — это современный UI-компонент для переключения между несколькими опциями. Поддерживает как навигацию (через Next.js Link), так и управляемое состояние (через onChange).

## Импорт

```typescript
import { SegmentedControl } from "@shared/ui";
```

## API

### Props

```typescript
interface SegmentedControlProps {
  /** Массив опций для отображения */
  options: SegmentedControlOption[];
  
  /** Текущее активное значение (для управляемого режима) */
  value?: string;
  
  /** Callback при изменении значения */
  onChange?: (value: string) => void;
  
  /** Растянуть на всю ширину контейнера */
  fullWidth?: boolean;
  
  /** Дополнительные CSS классы */
  className?: string;
}

interface SegmentedControlOption {
  /** Уникальное значение опции */
  value: string;
  
  /** Текст для отображения */
  label: string;
  
  /** URL для навигации (использует Next.js Link) */
  href?: string;
  
  /** Опциональный badge рядом с label */
  badge?: string;
}
```

## Примеры использования

### 1. Навигация между страницами (Uncontrolled)

```tsx
<SegmentedControl
  options={[
    { value: "upcoming", label: "Предстоящие", href: "/events" },
    { value: "past", label: "Прошедшие", href: "/events/past", badge: "Архив" },
  ]}
/>
```

**Поведение:** Автоматически определяет активный элемент по текущему pathname.

### 2. Управляемое состояние (Controlled)

```tsx
const [activeView, setActiveView] = useState("grid");

<SegmentedControl
  value={activeView}
  onChange={setActiveView}
  options={[
    { value: "grid", label: "Сетка" },
    { value: "list", label: "Список" },
  ]}
/>
```

**Поведение:** Использует переданные `value` и `onChange` для управления состоянием.

### 3. Фильтры с badge

```tsx
<SegmentedControl
  value={filter}
  onChange={setFilter}
  options={[
    { value: "all", label: "Все" },
    { value: "new", label: "Новые", badge: "12" },
    { value: "popular", label: "Популярные" },
  ]}
  fullWidth
/>
```

### 4. Табы профиля

```tsx
<SegmentedControl
  options={[
    { value: "about", label: "О себе", href: "/profile" },
    { value: "events", label: "События", href: "/profile/events" },
    { value: "certs", label: "Сертификаты", href: "/profile/certificates", badge: "3" },
  ]}
  fullWidth
/>
```

## Визуальные состояния

### Неактивный элемент
```css
background: transparent
text-color: text-neutral-600
transition: all 200ms

hover:
  text-color: text-neutral-900
  background: bg-white/50
```

### Активный элемент
```css
background: bg-white
text-color: text-neutral-900
shadow: [0_1px_3px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)]
scale: 1.02
```

### Badge
```css
неактивный:
  background: bg-brand-100
  text-color: text-brand-700

активный:
  background: bg-brand-500
  text-color: text-white
  
font-size: 10px
font-weight: bold
uppercase
```

## Доступность

- ✅ `role="tablist"` на контейнере
- ✅ `role="tab"` на каждой опции
- ✅ `aria-selected` для активного элемента
- ✅ `aria-controls` связь с контентом
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Focus indicators

## Адаптивность

```typescript
// Desktop
min-width: 120px (на каждую опцию)

// Mobile
min-width: 0 (растягивается)
text-overflow: truncate
```

### Использование `fullWidth`

```tsx
// Desktop: опции занимают минимум 120px
<SegmentedControl options={...} />

// Mobile: опции растягиваются на всю ширину
<SegmentedControl options={...} fullWidth />
```

## Внутренняя логика

### Определение активного элемента

```typescript
// 1. Если передан value - используем его
const activeValue = value;

// 2. Если есть href - сравниваем с pathname
const activeValue = options.find(opt => 
  opt.href && pathname === opt.href
)?.value;

// 3. Fallback на первую опцию
const activeValue = options[0]?.value;
```

### Рендеринг элементов

```typescript
// Если есть href → Next.js Link
if (option.href) {
  return <Link href={option.href} {...props}>{content}</Link>;
}

// Иначе → button
return <button type="button" onClick={...} {...props}>{content}</button>;
```

## Кастомизация

### Цвета

```tsx
// Через Tailwind config
// tailwind.config.js
theme: {
  extend: {
    colors: {
      brand: {
        100: "#FFF7ED",
        500: "#F97316",
      }
    }
  }
}
```

### Размеры

```tsx
// Через className prop
<SegmentedControl
  options={...}
  className="text-base py-3 px-6"  // Увеличить размер
/>
```

## Производительность

- ✅ Минимальное количество ре-рендеров
- ✅ useMemo для классов (внутри компонента)
- ✅ Нет лишних useEffect
- ✅ Оптимизированные анимации (GPU-accelerated)

## TypeScript

Полная типобезопасность:

```typescript
// Типы опций
type OptionValue = "a" | "b" | "c";

const options: SegmentedControlOption[] = [
  { value: "a" as OptionValue, label: "Option A" },
  // ...
];

const [value, setValue] = useState<OptionValue>("a");

<SegmentedControl<OptionValue>
  value={value}
  onChange={setValue}
  options={options}
/>
```

## Тестирование

### Unit тесты

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentedControl } from "./segmented-control";

describe("SegmentedControl", () => {
  it("renders all options", () => {
    render(<SegmentedControl options={[...]} />);
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });

  it("calls onChange on click", () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={[...]} onChange={onChange} />);
    
    fireEvent.click(screen.getByText("Option 2"));
    expect(onChange).toHaveBeenCalledWith("option2");
  });

  it("highlights active option", () => {
    render(<SegmentedControl value="a" options={[...]} />);
    
    const activeEl = screen.getByText("Option A");
    expect(activeEl).toHaveAttribute("aria-selected", "true");
  });
});
```

## Troubleshooting

### Badge не отображается

**Проблема:** Badge prop передан, но не виден.

**Решение:** Убедитесь, что Tailwind классы `bg-brand-*` определены в конфиге.

### Активный элемент не подсвечивается

**Проблема:** При использовании href активный элемент не определяется.

**Решение:** Убедитесь, что `usePathname()` возвращает корректный путь.

```tsx
import { usePathname } from "next/navigation";

const pathname = usePathname();
console.log("Current path:", pathname); // Проверка
```

### onClick не срабатывает

**Проблема:** В режиме с href onClick не вызывается.

**Решение:** Это ожидаемое поведение. Если есть href, компонент использует Link, а не button с onClick. Используйте router events для отслеживания навигации.

## Примеры из реальных проектов

### EventFlow: Переключение каталогов

```tsx
<SegmentedControl
  options={[
    { 
      value: "upcoming", 
      label: "Предстоящие", 
      href: "/events" 
    },
    { 
      value: "past", 
      label: "Прошедшие", 
      href: "/events/past", 
      badge: "Архив" 
    },
  ]}
/>
```

### Dashboard: Вид данных

```tsx
const [view, setView] = useState<"chart" | "table">("chart");

<SegmentedControl
  value={view}
  onChange={setView}
  options={[
    { value: "chart", label: "График" },
    { value: "table", label: "Таблица" },
  ]}
/>

{view === "chart" ? <Chart /> : <Table />}
```

## Альтернативы

| Компонент | Когда использовать |
|-----------|-------------------|
| **SegmentedControl** | 2-4 опции, переключение режимов/видов |
| **Tabs** | 3+ опций, сложное содержимое под табами |
| **Radio Group** | Форма, нужна стандартная семантика |
| **Select/Dropdown** | 5+ опций, экономия места |

## Roadmap

- [ ] Поддержка иконок в опциях
- [ ] Вертикальная ориентация
- [ ] Анимация перехода между опциями (sliding indicator)
- [ ] Поддержка disabled опций
- [ ] Dark mode варианты

---

**См. также:**
