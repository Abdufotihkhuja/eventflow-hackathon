# Реализация Системы Статистики Дашборда

## 📋 Описание

Обновлена система отображения статистики на главном дашборде. Теперь показываются более важные и полезные метрики вместо активных событий и поддержки.

## 🎯 Новые Метрики

| Метрика | Описание | Иконка |
|---------|---------|--------|
| **Прибыль** | Ежемесячный доход в рублях | 💰 |
| **Подписки пользователей** | Количество активных подписок | 👥 |
| **Просмотры событий** | Сколько пользователей просмотрели событие (но не зарегистрировались) | 👁️ |
| **Участвовало в месяц** | Сколько людей участвовали в событиях за месяц | ✓ |

Каждая метрика:
- Показывает **текущее значение** (отформатировано)
- Показывает **процентное изменение** от предыдущего месяца
- Имеет **визуальный тренд** (↑ Рост, ↓ Снижение, — Стабильно)

## 🗂️ Структура файлов

### API Слой (`src/api/services/`)
```
src/api/services/
├── stats.types.ts           # Типы для API статистики
├── statsService.ts          # Сервис для запросов статистики
└── index.ts                 # Экспорты
```

### Features (`src/features/dashboard/`)
```
src/features/dashboard/
├── api/
│   ├── use-monthly-stats.ts # React Query хук
│   └── index.ts
├── ui/
│   ├── stat-card.tsx        # UI компонент карточки
│   └── index.ts
├── lib/
│   ├── stat-card.types.ts   # Типы компонента
│   ├── mock-stats.ts        # Mock данные для разработки
│   └── index.ts
├── index.ts                 # Публичный API
└── README.md               # Документация фичи
```

### Shared Utilities (`src/shared/lib/`)
```
src/shared/lib/
├── format.ts               # Функции форматирования (новый файл)
├── cn.ts                   # Класс комбинирования (существовал)
└── index.ts               # Экспорты
```

### Pages (`src/pages/dashboard/`)
```
src/pages/dashboard/ui/
└── dashboard-page.tsx      # Обновлена для использования новых компонентов
```

## 🔧 Реализованные Компоненты

### `StatCard` компонент
Универсальная карточка для отображения статистики:
```tsx
<StatCard
  label="Прибыль"
  value="₽125,000"
  delta="+27% MoM"
  trend="up"
  icon={DollarSign}
  changePercent={27}
/>
```

**Props:**
- `label` — название метрики
- `value` — текущее значение (уже отформатировано)
- `delta` — текст с изменением (опционально)
- `trend` — 'up' | 'down' | 'neutral'
- `icon` — React компонент иконки (lucide-react)
- `changePercent` — процент изменения

### `useMonthlyStatsQuery` хук
React Query хук для получения месячной статистики:
```tsx
const { data: stats, isLoading, error } = useMonthlyStatsQuery()

// Параметры (опциональны)
const { data } = useMonthlyStatsQuery({ month: 11, year: 2025 })
```

**Кэширование:**
- `staleTime`: 5 минут
- `gcTime` (formerly `cacheTime`): 10 минут

## 🛠️ Утилиты Форматирования

### `formatCurrency(amount, locale?, currency?)`
Форматирует число как рубли:
```ts
formatCurrency(125000)        // "₽125 000"
formatCurrency(125000, 'en-US', 'USD')  // "$125,000"
```

### `formatNumber(num, decimals?)`
Сокращает большие числа:
```ts
formatNumber(8932)     // "8.9K"
formatNumber(125000)   // "125K"
formatNumber(1000000)  // "1M"
```

### `calculatePercentChange(current, previous)`
Вычисляет процентное изменение:
```ts
calculatePercentChange(125000, 98500)  // 27
```

### `getTrendType(percentChange)`
Возвращает тип тренда:
```ts
getTrendType(27)   // "up"
getTrendType(-5)   // "down"
getTrendType(0)    // "neutral"
```

## 📡 API Интеграция

### Эндпоинт
```
GET /api/stats/monthly?month=11&year=2025
```

### Ответ
```ts
{
  revenue: 125000,
  subscriptions: 542,
  eventViews: 8932,
  registeredParticipants: 3421,
  participants: 2845,
  previousMonthRevenue: 98500,
  previousMonthSubscriptions: 458,
  previousMonthEventViews: 7214,
  previousMonthRegisteredParticipants: 2876,
  previousMonthParticipants: 2145
}
```

## 🧪 Mock Данные

Для локальной разработки используются mock данные в `src/features/dashboard/lib/mock-stats.ts`:

```ts
{
  revenue: 125000,           // +27% от прошлого месяца
  subscriptions: 542,        // +18% от прошлого месяца
  eventViews: 8932,          // +24% от прошлого месяца
  registeredParticipants: 3421, // +19% от прошлого месяца
  participants: 2845,        // +33% от прошлого месяца
}
```

## 📊 Визуальные Изменения

### До
- Активные события: 12
- Новые участники: 128
- Конверсия регистрации: 42%
- Открытые тикеты: 5

### После
- Прибыль: ₽125K ↑ +27% MoM
- Подписки пользователей: 542 ↑ +18% MoM
- Просмотры событий: 8.9K ↑ +24% MoM
- Участвовало в месяц: 2.8K ↑ +33% MoM

## 🎨 Дизайн

- **Адаптивная сетка**: 1 столбец на мобильных, 2 на планшетах, 4 на ПК
- **Интерактивность**: hover эффекты, плавные переходы
- **Темизация**: поддержка тёмного режима через TailwindCSS
- **Доступность**: ARIA атрибуты и семантический HTML

## 📦 Зависимости

- `@tanstack/react-query` — для запросов и кэширования
- `lucide-react` — иконки
- `class-variance-authority` — варианты компонентов (опционально)
- `tailwindcss` — стили

## 🚀 Использование в Компонентах

```tsx
import { DashboardPage } from '@pages/dashboard'

export function App() {
  return <DashboardPage />
}
```

Компонент автоматически загружает статистику и отображает её в карточках.

## 🔮 Возможные Улучшения

1. **Графики** — добавить Chart.js / Recharts для визуализации трендов
2. **Экспорт** — добавить экспорт статистики в CSV/PDF
3. **Фильтры** — позволить выбирать период (неделя, месяц, квартал, год)
4. **Сравнение** — сравнивать данные между разными периодами
5. **Уведомления** — алерты при значительных изменениях
6. **Детализация** — перейти на детальные отчёты по каждой метрике

## ✅ Чеклист Реализации

- [x] Создать типы API (MonthlyStatsResponse)
- [x] Создать сервис (statsService)
- [x] Создать React Query хук (useMonthlyStatsQuery)
- [x] Создать компонент StatCard
- [x] Создать утилиты форматирования
- [x] Обновить dashboard-page.tsx
- [x] Добавить mock данные
- [x] Документировать все компоненты
- [x] Проверить линтер
- [x] Соблюдать FSD архитектуру и типизацию

## 📚 Ссылки

- [React Query Documentation](https://tanstack.com/query/latest)
- [Lucide Icons](https://lucide.dev)
- [TailwindCSS](https://tailwindcss.com)

