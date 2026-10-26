# API календаря активности пользователя

Документация для endpoints управления календарём активности простого пользователя.

---

## Обзор

Календарь активности показывает все события пользователя с визуализацией по типам:

- **Выступаю/веду** (SPEAKER) — оранжевый цвет
- **Участвую** (PARTICIPANT) — зелёный цвет  
- **Менторю** (MENTOR) — фиолетовый цвет
- **Перелёт/дорога** (TRAVEL) — голубой цвет
- **Подготовка** (PREPARATION) — светло-фиолетовый цвет

---

## Модель данных

### ParticipantRole (enum)

```typescript
enum ParticipantRole {
  PARTICIPANT = 'PARTICIPANT', // Участник
  SPEAKER = 'SPEAKER',         // Выступаю/веду
  MENTOR = 'MENTOR',           // Ментор
}
```

### CalendarDayType (enum)

```typescript
enum CalendarDayType {
  EVENT = 'EVENT',           // День события
  TRAVEL = 'TRAVEL',         // День перелёта/дороги
  PREPARATION = 'PREPARATION', // День подготовки
}
```

### Поля в Registration

```prisma
model Registration {
  // ... базовые поля
  role              ParticipantRole @default(PARTICIPANT)
  travelStartDate   DateTime?       @db.Date
  travelEndDate     DateTime?       @db.Date
  preparationDays   Int             @default(0)
}
```

---

## Endpoints

### 1. Получить календарь на месяц

**Endpoint:** `GET /api/v1/account/me/calendar`

**Описание:** Возвращает календарь активности пользователя на указанный месяц.

**Query Parameters:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| year | number | Да | Год (2020-2100) |
| month | number | Да | Месяц (1-12) |
| role | ParticipantRole | Нет | Фильтр по роли участника |

**Request Example:**

```bash
GET /api/v1/account/me/calendar?year=2025&month=3
Authorization: Bearer YOUR_TOKEN

# С фильтром по роли
GET /api/v1/account/me/calendar?year=2025&month=3&role=SPEAKER
```

**Response (200 OK):**

```json
{
  "year": 2025,
  "month": 3,
  "eventsCount": 4,
  "travelsCount": 2,
  "days": [
    {
      "date": "2025-03-05",
      "day": 5,
      "activities": [
        {
          "registrationId": "uuid",
          "eventId": "uuid",
          "eventTitle": "Private Briefing: корпоративная безопасность",
          "role": "SPEAKER",
          "dayType": "EVENT"
        }
      ],
      "hasSpeakerEvents": true,
      "hasParticipantEvents": false,
      "hasMentorEvents": false,
      "hasTravel": false,
      "hasPreparation": false
    },
    {
      "date": "2025-03-06",
      "day": 6,
      "activities": [
        {
          "registrationId": "uuid",
          "eventId": "uuid",
          "eventTitle": "Tech Conference 2025",
          "role": "PARTICIPANT",
          "dayType": "EVENT"
        }
      ],
      "hasSpeakerEvents": false,
      "hasParticipantEvents": true,
      "hasMentorEvents": false,
      "hasTravel": false,
      "hasPreparation": false
    }
  ]
}
```

---

### 2. Получить события на дату

**Endpoint:** `GET /api/v1/account/me/calendar/events`

**Описание:** Возвращает список событий пользователя на указанную дату.

**Query Parameters:**

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| date | string (YYYY-MM-DD) | Да | Дата |
| role | ParticipantRole | Нет | Фильтр по роли участника |

**Request Example:**

```bash
GET /api/v1/account/me/calendar/events?date=2025-03-05
Authorization: Bearer YOUR_TOKEN
```

**Response (200 OK):**

```json
{
  "date": "2025-03-05",
  "count": 1,
  "events": [
    {
      "registrationId": "uuid",
      "eventId": "uuid",
      "title": "Private Briefing: корпоративная безопасность",
      "shortDescription": "Фасилитация сессий, согласование дорожной карты внедрения",
      "role": "SPEAKER",
      "dayType": "EVENT",
      "format": "OFFLINE",
      "startDate": "2025-03-05T09:30:00.000Z",
      "endDate": "2025-03-05T15:00:00.000Z",
      "venue": "HQ Eventflow",
      "city": "Москва",
      "organizationName": "Eventflow Inc"
    }
  ]
}
```

---

### 3. Зарегистрироваться на событие

**Endpoint:** `POST /api/v1/events/:eventId/register`

**Описание:** Регистрация пользователя на событие с указанием роли и дат для календаря.

**Request Body:**

```json
{
  "role": "SPEAKER",
  "travelStartDate": "2025-03-04",
  "travelEndDate": "2025-03-04",
  "preparationDays": 2,
  "answers": [
    {
      "questionId": "uuid",
      "answer": "Ответ на вопрос"
    }
  ]
}
```

| Поле | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| role | ParticipantRole | Нет | Роль участника (по умолчанию PARTICIPANT) |
| travelStartDate | string (YYYY-MM-DD) | Нет | Дата начала перелёта |
| travelEndDate | string (YYYY-MM-DD) | Нет | Дата окончания перелёта |
| preparationDays | number (0-30) | Нет | Кол-во дней подготовки до события |
| answers | AnswerDto[] | Нет | Ответы на вопросы регистрации |

---

### 4. Обновить регистрацию

**Endpoint:** `PATCH /api/v1/registrations/:id`

**Описание:** Обновление роли, дат перелёта и дней подготовки для существующей регистрации.

**Request Body:**

```json
{
  "role": "MENTOR",
  "travelStartDate": "2025-03-03",
  "travelEndDate": "2025-03-04",
  "preparationDays": 3
}
```

**Убрать даты перелёта:**

```json
{
  "travelStartDate": null,
  "travelEndDate": null
}
```

---

## Логика отображения в календаре

### Определение типа дня

Для каждого дня определяется тип активности:

1. **EVENT** — если дата попадает в диапазон `[event.startDate, event.endDate]`
2. **TRAVEL** — если дата попадает в диапазон `[travelStartDate, travelEndDate]`
3. **PREPARATION** — если дата попадает в диапазон за `preparationDays` дней до `event.startDate`

### Приоритет отображения

Если на одну дату попадает несколько типов активности, все они включаются в `activities` массив дня.

Флаги в `CalendarDayDto`:
- `hasSpeakerEvents` — есть события где пользователь выступает
- `hasParticipantEvents` — есть события где пользователь участвует
- `hasMentorEvents` — есть события где пользователь менторит
- `hasTravel` — есть перелёты/дорога
- `hasPreparation` — есть дни подготовки

---

## Примеры использования

### JavaScript (fetch)

```javascript
// Получить календарь на март 2025
const response = await fetch(
  'http://localhost:3000/api/v1/account/me/calendar?year=2025&month=3',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);

const calendar = await response.json();
console.log(`Событий: ${calendar.eventsCount}, Перелётов: ${calendar.travelsCount}`);

// Обработка дней
calendar.days.forEach(day => {
  if (day.hasSpeakerEvents) {
    console.log(`${day.date}: Выступаю`);
  }
  if (day.hasParticipantEvents) {
    console.log(`${day.date}: Участвую`);
  }
  if (day.hasTravel) {
    console.log(`${day.date}: Перелёт`);
  }
});
```

### Получение событий при клике на день

```javascript
async function onDayClick(date) {
  const response = await fetch(
    `http://localhost:3000/api/v1/account/me/calendar/events?date=${date}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  showEventsList(data.events);
}
```

---

## Миграция базы данных

```sql
-- CreateEnum: ParticipantRole
CREATE TYPE "ParticipantRole" AS ENUM ('PARTICIPANT', 'SPEAKER', 'MENTOR');

-- AlterTable: Registration
ALTER TABLE "registrations" ADD COLUMN "role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT';
ALTER TABLE "registrations" ADD COLUMN "travel_start_date" DATE;
ALTER TABLE "registrations" ADD COLUMN "travel_end_date" DATE;
ALTER TABLE "registrations" ADD COLUMN "preparation_days" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "registrations_role_idx" ON "registrations"("role");
```

Для применения:

```bash
npx prisma migrate deploy
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешное выполнение |
| 400 | Некорректные параметры запроса |
| 401 | Не авторизован |
| 403 | Доступ запрещен (неверная роль) |
| 404 | Регистрация не найдена |

---

## Фильтрация

### По роли

```
GET /account/me/calendar?year=2025&month=3&role=SPEAKER
```

Возвращает только события, где пользователь выступает.

Доступные значения:
- `PARTICIPANT` — участник
- `SPEAKER` — спикер/ведущий
- `MENTOR` — ментор

