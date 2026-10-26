# Hero Showcase — Adaptive UX Implementation

## Обзор

Реализовано адаптивное отображение карточки QR-билета в Hero-секции с учётом состояния пользователя. Применены лучшие практики UI/UX для конверсионной воронки.

## 🎯 Сценарии использования

### 1️⃣ Неавторизованный пользователь → `HeroShowcaseGuest`

**Цель:** Показать ценность продукта и стимулировать регистрацию

**Что видит пользователь:**

- ✅ Превью функционала с размытием (blur overlay)
- ✅ Индикатор Live для создания FOMO (fear of missing out)
- ✅ Чёткий CTA: "Войти" (primary) + "Создать аккаунт" (secondary)
- ✅ Социальное доказательство: "12 800+ участников уже используют QR-билеты"
- ✅ Список преимуществ с иконками

**UX-принципы:**

- **Progressive disclosure** — показываем функцию, но не весь контент
- **Social proof** — доверие через количество пользователей
- **Clear CTA hierarchy** — два варианта действия с приоритетом

**Конверсионная метрика:** CTR на кнопку "Войти"

---

### 2️⃣ Авторизован, нет билетов → `HeroShowcaseEmpty`

**Цель:** Направить на поиск мероприятий

**Что видит пользователь:**

- ✅ Empty state с позитивным посылом: "Ваш первый билет ждёт вас"
- ✅ Иконка-иллюстрация билета с градиентом
- ✅ CTA: "Найти мероприятия" → переход на `/events`
- ✅ Список "Что вас ждёт" с конкретными преимуществами

**UX-принципы:**

- **Empty state best practices** — не просто "нет данных", а приглашение к действию
- **Visual hierarchy** — большая яркая иконка привлекает внимание
- **Feature preview** — показываем, что получит пользователь после регистрации

**Конверсионная метрика:** CTR на "Найти мероприятия"

---

### 3️⃣ Авторизован + есть билеты → `HeroShowcaseTicket`

**Цель:** Показать реальный билет, обеспечить быстрый доступ к функциям

**Что видит пользователь:**

- ✅ Реальный QR-билет на ближайшее мероприятие
- ✅ Таймер обратного отсчёта: "Через 7 дней"
- ✅ Полная информация: название, дата, время, локация
- ✅ Статус участника: зарегистрирован/подтверждён/посетил
- ✅ Кнопки действий: "Экспорт" + "Календарь"
- ✅ Индикатор Live для текущих мероприятий

**UX-принципы:**

- **Contextual information** — всё необходимое для участия в одном месте
- **Just-in-time actions** — кнопки экспорта и календаря под рукой
- **Real-time updates** — таймер обновляется каждую минуту
- **Visual feedback** — hover-эффекты на QR-коде

**Метрики:** Engagement rate, использование кнопок экспорта/календаря

---

## 🏗️ Архитектура

### Компоненты

```
widgets/landing/hero/ui/
├── landing-hero.tsx              # Главный компонент с логикой
├── hero-showcase-guest.tsx       # Для неавторизованных
├── hero-showcase-empty.tsx       # Для авторизованных без билетов
└── hero-showcase-ticket.tsx      # Для авторизованных с билетами

entities/event/model/
└── ticket-types.ts               # Типы для билетов
```

### Логика условного рендеринга

```typescript
function HeroShowcase(): React.ReactNode {
  const isAuthenticated = useAuth().isAuthenticated;
  const userTickets = useTickets().upcoming;

  // Сценарий 1: Гость
  if (!isAuthenticated) {
    return <HeroShowcaseGuest />;
  }

  // Сценарий 2: Пустое состояние
  if (userTickets.length === 0) {
    return <HeroShowcaseEmpty />;
  }

  // Сценарий 3: С билетами
  return <HeroShowcaseTicket ticket={userTickets[0]} />;
}
```

---

## 🔌 Интеграция с Auth

### Пример с Context API

```typescript
// src/shared/lib/providers.tsx
import { createContext, useContext } from "react";

interface AuthContext {
  isAuthenticated: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthContext | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// В landing-hero.tsx
const { isAuthenticated } = useAuth();
```

### Пример с TanStack Query

```typescript
// src/shared/api/authService.ts
export async function getCurrentUser(): Promise<User | null> {
  const response = await apiClient.get<User>("/api/auth/me");
  return response.data;
}

// src/shared/lib/hooks/useCurrentUser.ts
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@shared/api/authService";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "current-user"],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: false,
  });
}

// В landing-hero.tsx
const { data: user, isLoading } = useCurrentUser();
const isAuthenticated = !!user;
```

---

## 🎫 Интеграция с билетами

### Пример с TanStack Query

```typescript
// src/shared/api/ticketsService.ts
export async function getUserTickets(): Promise<EventTicket[]> {
  const response = await apiClient.get<EventTicket[]>("/api/tickets/my");
  return response.data.sort(
    (a, b) =>
      new Date(a.event.startDate).getTime() -
      new Date(b.event.startDate).getTime()
  );
}

// src/shared/lib/hooks/useUserTickets.ts
import { useQuery } from "@tanstack/react-query";
import { getUserTickets } from "@shared/api/ticketsService";

export function useUserTickets() {
  return useQuery({
    queryKey: ["tickets", "my"],
    queryFn: getUserTickets,
    staleTime: 2 * 60 * 1000, // 2 минуты
    enabled: !!useCurrentUser().data, // только для авторизованных
  });
}

// В landing-hero.tsx
const { data: userTickets = [] } = useUserTickets();
const upcomingTickets = userTickets.filter(
  (t) => new Date(t.event.startDate) > new Date()
);
```

---

## 📊 A/B-тестирование

### Вариант А: Текущая реализация

- Гости видят размытый QR с CTA
- Социальное доказательство

### Вариант Б: Агрессивный

- Гости видят полноэкранный модал с регистрацией
- Без возможности закрыть первые 3 секунды

### Вариант В: Мягкий

- Гости видят просто список преимуществ
- QR не показываем вообще

### Метрики для сравнения

- Conversion rate (регистрация)
- Bounce rate
- Time on page
- Click-through rate на CTA

---

## 🎨 Дизайн-токены

### Градиенты

```css
/* QR-контейнер */
background: linear-gradient(to bottom right,
  rgba(255, 176, 67, 0.8),
  white,
  rgba(255, 111, 0, 0.4)
);

/* Декоративные блики */
bg-[radial-gradient(circle_at_left, rgba(255,176,67,0.28), transparent_60%)]
```

### Анимации

```css
/* Hover на QR */
transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1);
hover:shadow-[0_40px_96px_rgba(15,23,42,0.16)]

/* Таймер */
update-interval: 60000ms; /* каждую минуту */
```

---

## ♿ Accessibility

- ✅ Все иконки имеют `aria-hidden`
- ✅ Кнопки с явными `aria-label`
- ✅ Статус билета объявляется скрин-ридерам
- ✅ Focus states на всех интерактивных элементах
- ✅ Цветовой контраст соответствует WCAG AA

---

## 📱 Адаптивность

### Mobile (< 640px)

- Кнопки "Экспорт" и "Календарь" в колонку
- QR-код 176px (размер `size-44`)
- Padding уменьшен до `p-6`

### Tablet (640px - 1024px)

- Кнопки в ряд
- QR-код остаётся 176px

### Desktop (> 1024px)

- Showcase справа от текста Hero
- Максимальная ширина `max-w-md` (448px)

---

## 🚀 Следующие шаги

### Для полной интеграции:

1. **Подключить Auth-провайдер**

   ```typescript
   const { isAuthenticated } = useAuth();
   ```

2. **Подключить API билетов**

   ```typescript
   const { data: tickets } = useUserTickets();
   ```

3. **Реализовать экспорт в Wallet**
   - Apple Wallet (PassKit)
   - Google Wallet API

4. **Генерация .ics файлов**

   ```typescript
   function generateICS(ticket: EventTicket): string { ... }
   ```

5. **Аналитика**

   ```typescript
   trackEvent("hero_showcase_cta_clicked", {
     variant: isAuthenticated ? "empty" : "guest",
   });
   ```

6. **Тесты**
   - Unit-тесты для форматирования дат
   - Integration-тесты для условного рендеринга
   - E2E-тесты для воронки регистрации

---

## 📚 Дополнительные материалы

- [Empty States Best Practices](https://www.nngroup.com/articles/empty-state-ux/)
- [Progressive Disclosure in UX](https://www.interaction-design.org/literature/article/progressive-disclosure)
- [Social Proof Psychology](https://www.nngroup.com/articles/social-proof-ux/)
- [Apple Wallet PassKit](https://developer.apple.com/wallet/)
- [Google Wallet API](https://developers.google.com/wallet)

---

**Автор:** Eventflow Team  
**Дата:** Ноябрь 2025  
**Версия:** 1.0.0
