# Примеры Использования Dashboard

## Базовый пример

Дашборд автоматически загружает и отображает статистику:

```tsx
import { DashboardPage } from '@pages/dashboard'

export default function HomePage() {
  return (
    <div className="p-8">
      <DashboardPage />
    </div>
  )
}
```

## Использование хука статистики

Получение статистических данных для использования в других компонентах:

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'

export function StatsWidget() {
  const { data: stats, isLoading, error } = useMonthlyStatsQuery()

  if (isLoading) return <div>Загрузка...</div>
  if (error) return <div>Ошибка: {error.message}</div>
  if (!stats) return null

  return (
    <div>
      <h2>Месячная статистика</h2>
      <p>Прибыль: ₽{stats.revenue.toLocaleString('ru-RU')}</p>
      <p>Подписки: {stats.subscriptions}</p>
      <p>Просмотры: {stats.eventViews}</p>
      <p>Участники: {stats.participants}</p>
    </div>
  )
}
```

## Использование с фильтрами по датам

Получение статистики за конкретный месяц и год:

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'
import { useState } from 'react'

export function StatsWithDateFilter() {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())

  const { data: stats } = useMonthlyStatsQuery({ month, year })

  if (!stats) return null

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <select value={month} onChange={e => setMonth(+e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2024, i).toLocaleString('ru-RU', { month: 'long' })}
            </option>
          ))}
        </select>

        <select value={year} onChange={e => setYear(+e.target.value)}>
          {Array.from({ length: 5 }, (_, i) => (
            <option key={i} value={new Date().getFullYear() - i}>
              {new Date().getFullYear() - i}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>Прибыль: ₽{stats.revenue.toLocaleString('ru-RU')}</div>
        <div>Подписки: {stats.subscriptions}</div>
        <div>Просмотры: {stats.eventViews}</div>
        <div>Участники: {stats.participants}</div>
      </div>
    </div>
  )
}
```

## Использование с дополнительной статистикой

Комбинирование хука с собственной логикой форматирования:

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'
import { formatCurrency, formatNumber, calculatePercentChange } from '@shared/lib'

export function DetailedStats() {
  const { data: stats } = useMonthlyStatsQuery()

  if (!stats) return null

  const metrics = [
    {
      label: 'Прибыль',
      value: formatCurrency(stats.revenue),
      previousValue: stats.previousMonthRevenue,
    },
    {
      label: 'Подписки',
      value: formatNumber(stats.subscriptions),
      previousValue: stats.previousMonthSubscriptions,
    },
    {
      label: 'Просмотры',
      value: formatNumber(stats.eventViews),
      previousValue: stats.previousMonthEventViews,
    },
    {
      label: 'Участники',
      value: formatNumber(stats.participants),
      previousValue: stats.previousMonthParticipants,
    },
  ]

  return (
    <div className="space-y-4">
      {metrics.map(metric => {
        const percentChange = metric.previousValue
          ? calculatePercentChange(+metric.value, metric.previousValue)
          : 0

        return (
          <div key={metric.label} className="flex justify-between items-center p-4 border rounded">
            <span className="font-medium">{metric.label}</span>
            <div className="text-right">
              <div className="text-lg font-bold">{metric.value}</div>
              <div className={`text-sm ${percentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {percentChange > 0 ? '+' : ''}
                {percentChange}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

## Использование StatCard компонента

Прямое использование компонента карточки со своими данными:

```tsx
import { StatCard } from '@features/dashboard'
import { DollarSign, TrendingUp } from 'lucide-react'

export function CustomStatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard
        label="Прибыль"
        value="₽125,000"
        delta="+27% MoM"
        trend="up"
        icon={DollarSign}
        changePercent={27}
      />

      <StatCard
        label="Процесс конверсии"
        value="42%"
        delta="-5% MoM"
        trend="down"
        icon={TrendingUp}
        changePercent={-5}
      />
    </div>
  )
}
```

## Использование в Real-time Dashboard

Обновление статистики каждые 30 секунд:

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'
import { useEffect } from 'react'

export function RealtimeDashboard() {
  const queryResult = useMonthlyStatsQuery()

  useEffect(() => {
    const interval = setInterval(() => {
      queryResult.refetch()
    }, 30000) // 30 секунд

    return () => clearInterval(interval)
  }, [queryResult])

  if (queryResult.isLoading) return <div>Загрузка...</div>
  if (!queryResult.data) return null

  // Отобразить статистику
  return <div>{/* ... */}</div>
}
```

## Проверка доступа к Admin Dashboard

Только администраторы могут видеть полную статистику:

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'
import { useAuth } from '@entities/auth'

export function AdminDashboard() {
  const { user } = useAuth()
  const { data: stats } = useMonthlyStatsQuery()

  if (user?.role !== 'admin') {
    return <div>У вас нет доступа к этой странице</div>
  }

  if (!stats) return null

  return (
    <div className="p-8">
      <h1>Admin Statistics</h1>
      {/* Отобразить полную статистику */}
    </div>
  )
}
```

## Использование с Error Boundary

Обработка ошибок при загрузке статистики:

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'
import { Component, ReactNode } from 'react'

class StatsErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-red-600">Ошибка загрузки статистики</div>
    }

    return this.props.children
  }
}

export function SafeStatsWidget() {
  return (
    <StatsErrorBoundary>
      <StatsDisplay />
    </StatsErrorBoundary>
  )
}

function StatsDisplay() {
  const { data: stats, error } = useMonthlyStatsQuery()

  if (error) throw error
  if (!stats) return null

  return <div>{/* Отобразить статистику */}</div>
}
```

## Экспорт статистики в CSV

Загрузка статистики в CSV файл:

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'

export function ExportStats() {
  const { data: stats } = useMonthlyStatsQuery()

  const handleExport = () => {
    if (!stats) return

    const csv = [
      ['Метрика', 'Значение'],
      ['Прибыль', stats.revenue],
      ['Подписки', stats.subscriptions],
      ['Просмотры', stats.eventViews],
      ['Участники', stats.participants],
    ]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stats-${new Date().toISOString()}.csv`
    a.click()
  }

  return (
    <button onClick={handleExport} className="px-4 py-2 bg-blue-600 text-white rounded">
      Скачать CSV
    </button>
  )
}
```

## Использование с TanStack Query DevTools

Отладка с DevTools (только в development):

```tsx
import { useMonthlyStatsQuery } from '@features/dashboard'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

## Документация по Типам

### `MonthlyStatsResponse`

```ts
interface MonthlyStatsResponse {
  // Текущий месяц
  revenue: number // Прибыль в рублях
  subscriptions: number // Активные подписки
  eventViews: number // Просмотры событий
  registeredParticipants: number // Зарегистрировавшиеся участники
  participants: number // Люди, участвовавшие в событиях

  // Предыдущий месяц (для сравнения)
  previousMonthRevenue?: number
  previousMonthSubscriptions?: number
  previousMonthEventViews?: number
  previousMonthRegisteredParticipants?: number
  previousMonthParticipants?: number
}
```

### `StatsParams`

```ts
interface StatsParams {
  month?: number // 1-12
  year?: number // 2024, 2025, etc
}
```

### `StatCardProps`

```ts
type StatCardProps = {
  label: string // Название метрики
  value: string | number // Значение (отформатировано)
  delta: string // Текст с изменением
  trend: 'up' | 'down' | 'neutral' // Тип тренда
  icon: React.ComponentType<{ className?: string }> // Иконка
  changePercent: number // % изменение
}
```

## Советы для Разработки

1. **Используй mock данные** во время разработки:

   ```tsx
   import { mockMonthlyStats } from '@features/dashboard/lib'

   const stats = mockMonthlyStats
   ```

2. **Кэширование автоматическое** - хук сам управляет кэшем (5 мин staleTime)

3. **Ошибки обрабатываются** - используй `error` из хука для обработки

4. **Параллельные запросы** - можно использовать несколько `useMonthlyStatsQuery` с разными параметрами

5. **Оптимизация** - компонент мемоизирован через `useMemo` в DashboardPage

## Нужна помощь?

См. документацию в:

- `src/features/dashboard/README.md` - главная документация фичи
- `src/api/services/statsService.ts` - реализация сервиса
- `src/pages/dashboard/ui/dashboard-page.tsx` - использование на странице
