# QR Ticket Card — Итоговый отчёт по улучшениям

## 📋 Что было сделано

Реализована адаптивная система отображения QR-билетов в Hero-секции лендинга с учётом трёх сценариев пользователя, согласно лучшим практикам UI/UX.

---

## ✨ Реализованные компоненты

### 1. **HeroShowcaseGuest** — Для неавторизованных

📍 `src/widgets/landing/hero/ui/hero-showcase-guest.tsx`

**Функционал:**

- Превью QR-билета с размытием (blur overlay)
- Overlay с призывом к действию "Войти" / "Создать аккаунт"
- Социальное доказательство: "12 800+ участников"
- Список преимуществ с иконками
- Индикатор LIVE для создания urgency

**UX-цель:** Показать ценность продукта → стимулировать регистрацию

---

### 2. **HeroShowcaseEmpty** — Для авторизованных без билетов

📍 `src/widgets/landing/hero/ui/hero-showcase-empty.tsx`

**Функционал:**

- Empty state с позитивным посылом "Ваш первый билет ждёт вас"
- Яркая иконка-иллюстрация билета с градиентом
- CTA кнопка "Найти мероприятия" → `/events`
- Блок "Что вас ждёт" с preview функций

**UX-цель:** Направить на страницу каталога мероприятий

---

### 3. **HeroShowcaseTicket** — Для авторизованных с билетами

📍 `src/widgets/landing/hero/ui/hero-showcase-ticket.tsx`

**Функционал:**

- Реальный QR-билет на ближайшее мероприятие
- Таймер обратного отсчёта (обновляется каждую минуту)
- Полная информация: название, дата, время, формат, локация
- Статус участника: зарегистрирован/подтверждён/посетил/отменён
- Кнопки действий: "Экспорт QR" и "Добавить в календарь"
- Индикатор LIVE для текущих событий
- Hover-эффекты на QR-коде

**UX-цель:** Предоставить быстрый доступ к билету и связанным функциям

---

### 4. **Типы данных**

📍 `src/entities/event/model/ticket-types.ts`

```typescript
export type ParticipantStatus =
  | "registered" // Зарегистрирован
  | "confirmed" // Подтверждён
  | "attended" // Посетил
  | "cancelled"; // Отменён

export interface EventTicket {
  qrCode: string;
  participantStatus: ParticipantStatus;
  event: {
    title: string;
    startDate: string;
    endDate?: string;
    format: "online" | "offline" | "hybrid";
    location?: string;
    imageUrl?: string;
    isLive?: boolean;
  };
  participant: {
    name: string;
    email: string;
  };
  registeredAt: string;
}
```

---

## 🎯 Логика условного рендеринга

📍 `src/widgets/landing/hero/ui/landing-hero.tsx`

```typescript
function HeroShowcase(): React.ReactNode {
  // TODO: Заменить на реальные данные из auth-контекста
  const isAuthenticated = false;
  const userTickets: EventTicket[] = [];

  // Сценарий 1: Неавторизованный → показываем превью с CTA
  if (!isAuthenticated) {
    return <HeroShowcaseGuest />;
  }

  // Сценарий 2: Авторизован, но нет билетов → пустое состояние
  if (userTickets.length === 0) {
    return <HeroShowcaseEmpty />;
  }

  // Сценарий 3: Авторизован + есть билеты → реальный билет
  return <HeroShowcaseTicket ticket={userTickets[0]} />;
}
```

---

## 🎨 Дизайн-решения

### Градиенты

- **QR-контейнер:** `linear-gradient(brand-200/80 → white → brand-500/40)`
- **Декоративные блики:** Радиальные градиенты с размытием `blur-2xl`/`blur-3xl`
- **Hover-эффект:** Дополнительный слой с `opacity-0 → opacity-20`

### Цветовая семантика статусов

- `registered` → синий (#3B82F6)
- `confirmed` → бренд-оранжевый (#FF6F00)
- `attended` → зелёный (#10B981)
- `cancelled` → серый (neutral-300)

### Анимации

- Таймер обновляется каждую минуту
- Hover-трансформация QR-кода: `duration-500ms`
- Shadow-эффекты с плавными переходами

---

## ♿ Accessibility

✅ **Реализовано:**

- Все декоративные иконки с `aria-hidden`
- Кнопки с явными `aria-label` (где нужно)
- Семантические HTML-элементы
- Focus states на всех интерактивных элементах
- Цветовой контраст соответствует WCAG AA

---

## 📱 Адаптивность

| Breakpoint                  | Особенности                                     |
| --------------------------- | ----------------------------------------------- |
| **< 640px (Mobile)**        | Кнопки в колонку, QR 176px, padding `p-6`       |
| **640px - 1024px (Tablet)** | Кнопки в ряд, QR 176px                          |
| **> 1024px (Desktop)**      | Showcase справа от Hero-текста, max-width 448px |

---

## 🔌 Интеграция (TODO для следующего этапа)

### 1. Подключить Auth-провайдер

```typescript
// Вариант A: Context API
const { isAuthenticated } = useAuth();

// Вариант B: TanStack Query
const { data: user } = useCurrentUser();
const isAuthenticated = !!user;
```

### 2. Подключить API билетов

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
export function useUserTickets() {
  return useQuery({
    queryKey: ["tickets", "my"],
    queryFn: getUserTickets,
    staleTime: 2 * 60 * 1000,
    enabled: !!useCurrentUser().data,
  });
}
```

### 3. Реализовать экспорт в Wallet

**Apple Wallet (PassKit):**

```typescript
async function exportToAppleWallet(ticket: EventTicket) {
  const response = await fetch("/api/wallet/apple", {
    method: "POST",
    body: JSON.stringify(ticket),
  });
  const { passUrl } = await response.json();
  window.location.href = passUrl;
}
```

**Google Wallet API:**

```typescript
async function exportToGoogleWallet(ticket: EventTicket) {
  const response = await fetch("/api/wallet/google", {
    method: "POST",
    body: JSON.stringify(ticket),
  });
  const { walletUrl } = await response.json();
  window.open(walletUrl, "_blank");
}
```

### 4. Генерация .ics файлов

```typescript
function generateICS(ticket: EventTicket): string {
  const { event } = ticket;
  const dtstart =
    new Date(event.startDate).toISOString().replace(/[-:]/g, "").split(".")[0] +
    "Z";
  const dtend =
    new Date(event.endDate || event.startDate)
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0] + "Z";

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Eventflow//QR Tickets//EN
BEGIN:VEVENT
UID:${ticket.qrCode}@eventflow.uz
DTSTAMP:${dtstart}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${event.title}
DESCRIPTION:QR-код для входа: ${ticket.qrCode}
LOCATION:${event.location || "Онлайн"}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

function handleAddToCalendar(ticket: EventTicket): void {
  const icsContent = generateICS(ticket);
  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${ticket.event.title.replace(/\s+/g, "-")}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## 📊 Метрики для отслеживания

### Для неавторизованных (Guest)

- **CTR на "Войти"** — основная конверсионная метрика
- **CTR на "Создать аккаунт"** — альтернативная конверсия
- **Bounce rate** — отказы после просмотра

### Для авторизованных без билетов (Empty)

- **CTR на "Найти мероприятия"** — переход в каталог
- **Event registration rate** — процент зарегистрировавшихся

### Для авторизованных с билетами (Ticket)

- **"Экспорт QR" click rate** — использование Wallet
- **"Добавить в календарь" click rate** — использование календаря
- **Repeat engagement** — повторные визиты на страницу

---

## 🧪 Тестирование

### Unit-тесты (рекомендуется)

```typescript
// formatTimeUntil
describe("formatTimeUntil", () => {
  it('должен вернуть "Через 7 дней" для события через неделю', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(formatTimeUntil(future.toISOString())).toBe("Через 7 дней");
  });
});

// formatEventDate
describe("formatEventDate", () => {
  it("должен корректно форматировать дату и время", () => {
    const date = "2025-12-15T10:00:00Z";
    expect(formatEventDate(date)).toMatch(/15 декабря/);
  });
});
```

### Integration-тесты

- Условный рендеринг при разных состояниях auth
- Переключение между компонентами

### E2E-тесты (Playwright)

- Воронка: Landing → Вход → Регистрация на событие → Получение билета
- Экспорт QR-кода
- Добавление в календарь

---

## 📚 Документация

Создана подробная документация:

- **HERO_SHOWCASE_UX.md** — UX-принципы, архитектура, примеры интеграции
- **QR_TICKET_CARD_SUMMARY.md** (этот файл) — итоговый отчёт

---

## ✅ Чеклист завершения

- [x] Создан компонент `HeroShowcaseGuest` для неавторизованных
- [x] Создан компонент `HeroShowcaseEmpty` для пустого состояния
- [x] Создан компонент `HeroShowcaseTicket` для отображения билета
- [x] Реализована логика условного рендеринга в `HeroShowcase`
- [x] Определены типы `EventTicket` и `ParticipantStatus`
- [x] Добавлен таймер обратного отсчёта с авто-обновлением
- [x] Реализованы hover-эффекты и анимации
- [x] Обеспечена адаптивность для всех breakpoints
- [x] Соблюдены стандарты accessibility (WCAG AA)
- [x] Проект успешно собирается (`npm run build` ✅)
- [x] Создана документация с примерами интеграции
- [ ] **TODO:** Подключить реальный auth-провайдер
- [ ] **TODO:** Подключить API билетов
- [ ] **TODO:** Реализовать экспорт в Apple/Google Wallet
- [ ] **TODO:** Реализовать генерацию .ics файлов
- [ ] **TODO:** Добавить аналитику (tracking events)
- [ ] **TODO:** Написать тесты

---

## 🚀 Следующие шаги

1. **Интеграция с Backend API:**
   - Эндпоинт `/api/tickets/my` для получения билетов пользователя
   - Эндпоинт `/api/wallet/apple` для генерации Apple Pass
   - Эндпоинт `/api/wallet/google` для генерации Google Pass

2. **Добавить аналитику:**

   ```typescript
   // Пример с Google Analytics
   gtag("event", "hero_showcase_cta_clicked", {
     user_type: isAuthenticated ? "authenticated" : "guest",
     has_tickets: userTickets.length > 0,
   });
   ```

3. **A/B-тестирование:**
   - Тестировать разные варианты текста CTA
   - Сравнить варианты с/без социального доказательства
   - Оптимизировать расположение элементов

4. **Оптимизация производительности:**
   - Lazy load компонентов Showcase
   - Оптимизация изображений и градиентов
   - Мемоизация тяжёлых вычислений

---

## 📝 Примечания

- **Дата создания:** 25 ноября 2025
- **Версия:** 1.0.0
- **Статус:** ✅ Готово к интеграции
- **Автор:** Eventflow Development Team

---

**Контакты для вопросов:**

- GitHub Issues: [eventflow/issues](https://github.com/eventflow/issues)
- Email: dev@eventflow.uz
