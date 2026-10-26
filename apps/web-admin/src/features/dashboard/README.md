# Dashboard Feature

Модуль для отображения главной статистики платформы EventFlow.

## Содержимое

### API

- `use-monthly-stats.ts` — React Query хук для получения месячной статистики

### Components

- `StatCard` — компонент карточки статистики с поддержкой трендов

### Types

- `stat-card.types.ts` — типы для компонента StatCard
- `stats.types.ts` (в `/src/api/services/`) — типы API ответа

### Utilities

- `mock-stats.ts` — примеры данных для разработки

## Использование

```tsx
import { useMonthlyStatsQuery, StatCard } from '@features/dashboard'
import { formatCurrency, formatNumber } from '@shared/lib'

export function Dashboard() {
  const { data: stats } = useMonthlyStatsQuery()

  if (!stats) return null

  return (
    <StatCard
      label="Прибыль"
      value={formatCurrency(stats.revenue)}
      delta={`+${percentChange}% MoM`}
      trend="up"
      icon={DollarSign}
      changePercent={percentChange}
    />
  )
}
```

## API

### `useMonthlyStatsQuery(params?: StatsParams)`

Получает месячную статистику.

**Параметры:**

- `params.month` — месяц (1-12), по умолчанию текущий
- `params.year` — год, по умолчанию текущий

**Возвращает:**

```ts
{
  revenue: number              // Прибыль в рублях
  subscriptions: number        // Количество подписок
  eventViews: number          // Просмотры событий
  registeredParticipants: number  // Зарегистрировавшиеся участники
  participants: number        // Участвовавшие люди
  previousMonth*: number      // Данные предыдущего месяца для сравнения
}
```

### Форматирование

**`formatCurrency(amount: number)`**

- Форматирует число как рубли: `125000 → ₽125 000`

**`formatNumber(num: number, decimals?: number)`**

- Сокращает большие числа: `8932 → 8.9K`, `125000 → 125K`, `1000000 → 1M`

**`calculatePercentChange(current: number, previous: number)`**

- Вычисляет процентное изменение: `(current - previous) / previous * 100`

**`getTrendType(percentChange: number)`**

- Возвращает тип тренда: `'up' | 'down' | 'neutral'`

## Данные

Каждая метрика показывает:

- **Название** — что это за метрика
- **Значение** — текущее значение (отформатировано)
- **Дельта** — изменение от предыдущего месяца в %
- **Тренд** — визуальный индикатор (↑ Рост, ↓ Снижение, — Стабильно)
- **Процент** — точное значение изменения в %

## Эндпоинты API

```
GET /api/stats/monthly?month=11&year=2025
```

Возвращает месячную статистику для указанного периода.
