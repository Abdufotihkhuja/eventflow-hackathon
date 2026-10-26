# Обновление типов API для статистики посещаемости

## Дата: 2026-01-15

### Endpoint
```
GET /api/v1/events/{eventId}/attendance/stats
```

### Структура ответа API

**Фактический ответ:**
```json
{
  "totalRegistrations": 1,
  "totalAttended": 0,
  "attendanceByDate": []
}
```

**С данными по датам:**
```json
{
  "totalRegistrations": 50,
  "totalAttended": 45,
  "attendanceByDate": [
    {
      "date": "2026-01-20",
      "totalRegistrations": 50,
      "totalAttended": 45,
      "attendanceRate": 90.0
    },
    {
      "date": "2026-01-21",
      "totalRegistrations": 50,
      "totalAttended": 42,
      "attendanceRate": 84.0
    }
  ]
}
```

### Обновления типов

#### 1. Новый тип `AttendanceByDate`

```typescript
export type AttendanceByDate = {
  date: string // ISO date (YYYY-MM-DD)
  totalRegistrations: number
  totalAttended: number
  attendanceRate: number // процент посещаемости
}
```

#### 2. Обновленный тип `GetAttendanceStatsResponse`

**Было (устаревшее):**
```typescript
export type GetAttendanceStatsResponse = {
  eventId: string
  totalDays: number
  dailySummaries: DailyAttendanceSummary[]
  overallRate: number
  topAttendees: {...}[]
}
```

**Стало (актуальное):**
```typescript
export type GetAttendanceStatsResponse = {
  totalRegistrations: number // Общее количество зарегистрированных
  totalAttended: number // Общее количество посетивших
  attendanceByDate: AttendanceByDate[] // Статистика по датам
}
```

### Изменения в компонентах

#### Файл: `event-attendance-tab.tsx`

**Обновлено использование полей:**

1. **Группировка записей:**
   - `record.participantId` → `record.registrationId`

2. **Проверка посещаемости:**
   - `record.attended` → `record.status === 'present'`

3. **Статистические карточки:**

**Было:**
```typescript
<Card>
  <p>Всего дней</p>
  <p>{statsData?.totalDays ?? dates.length}</p>
</Card>
<Card>
  <p>Средняя посещаемость</p>
  <p>{statsData?.overallRate}%</p>
</Card>
```

**Стало:**
```typescript
<Card>
  <p>Зарегистрировано</p>
  <p>{statsData?.totalRegistrations ?? participantIds.length}</p>
</Card>
<Card>
  <p>Посетили</p>
  <p>{statsData?.totalAttended ?? 0}</p>
</Card>
<Card>
  <p>Процент посещаемости</p>
  <p>
    {Math.round(
      (statsData.totalAttended / statsData.totalRegistrations) * 100
    )}%
  </p>
</Card>
```

4. **Отображение информации об участнике:**
   - Теперь показывается имя и email из `registration` объекта
   - Fallback на короткий ID если данных нет

### Использование в коде

**Хук для получения статистики:**
```typescript
import { useAttendanceStatsQuery } from '@features/events/api'

const { data: statsData, isLoading } = useAttendanceStatsQuery(eventId)

// Доступные поля:
statsData?.totalRegistrations // Общее кол-во зарегистрированных
statsData?.totalAttended // Общее кол-во посетивших
statsData?.attendanceByDate // Массив со статистикой по датам

// Пример расчета процента:
const attendanceRate = statsData
  ? (statsData.totalAttended / statsData.totalRegistrations) * 100
  : 0
```

**Работа с attendanceByDate:**
```typescript
statsData?.attendanceByDate.map(dayStats => ({
  date: dayStats.date,
  attended: dayStats.totalAttended,
  rate: dayStats.attendanceRate,
}))
```

### Экспорты

Обновлены экспорты в:
- `src/api/services/index.ts`
- `src/api/index.ts`

Добавлен экспорт нового типа:
```typescript
export type { AttendanceByDate } from './attendance.types'
```

### Поля статуса посещаемости

Используйте константу `AttendanceStatus`:
```typescript
export const AttendanceStatus = {
  PRESENT: 'present',   // Присутствовал
  ABSENT: 'absent',     // Отсутствовал
  LATE: 'late',        // Опоздал
  EXCUSED: 'excused',  // Уважительная причина
} as const
```

**Проверка в коде:**
```typescript
const isPresent = record.status === 'present'
const isAbsent = record.status === 'absent'
```

### Миграция

Если вы использовали старые поля статистики:

1. Замените `statsData.totalDays` на расчет из `attendanceByDate.length`
2. Замените `statsData.overallRate` на расчет `(totalAttended / totalRegistrations) * 100`
3. Замените `statsData.dailySummaries` на `statsData.attendanceByDate`
4. Замените `record.attended` на `record.status === 'present'`
5. Замените `record.participantId` на `record.registrationId`

### Пример полной миграции

**До:**
```typescript
const stats = useAttendanceStatsQuery(eventId)
const totalDays = stats.data?.totalDays
const rate = stats.data?.overallRate
const summaries = stats.data?.dailySummaries
```

**После:**
```typescript
const stats = useAttendanceStatsQuery(eventId)
const totalRegistrations = stats.data?.totalRegistrations
const totalAttended = stats.data?.totalAttended
const rate = totalRegistrations
  ? (totalAttended / totalRegistrations) * 100
  : 0
const byDate = stats.data?.attendanceByDate
```

## Тестирование

После обновления проверьте:
1. ✅ Загрузку статистики посещаемости
2. ✅ Отображение общего количества зарегистрированных
3. ✅ Отображение количества посетивших
4. ✅ Расчет процента посещаемости
5. ✅ Статистику по датам (если есть данные)
6. ✅ Отображение имен участников в таблице
7. ✅ Корректность статусов присутствия (present/absent/late/excused)

## Заметки

- Все изменения обратно совместимы на уровне типов TypeScript
- Компонент обновлен для работы с новой структурой API
- Добавлена поддержка дополнительных статусов (late, excused)
- Улучшено отображение информации об участниках
