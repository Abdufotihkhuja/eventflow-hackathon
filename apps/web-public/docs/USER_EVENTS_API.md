# API: Мои события (User Events)

## Описание

API для страницы профиля пользователя `/profile/events` — список всех мероприятий, на которые пользователь зарегистрирован.

## Endpoints

### GET /api/v1/my-registrations

Получить список регистраций текущего пользователя с фильтрами.

#### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `page` | number | Нет | Номер страницы (по умолчанию: 1) |
| `limit` | number | Нет | Количество записей на странице (по умолчанию: 10) |
| `filter` | enum | Нет | Фильтр по статусу (по умолчанию: ALL) |
| `search` | string | Нет | Поиск по названию события |

#### Фильтры (filter)

| Значение | Описание |
|----------|----------|
| `ALL` | Все события |
| `APPROVED` | Подтверждённые |
| `PENDING` | Ожидают подтверждения |
| `ATTENDED` | Посещённые (есть check-in) |
| `CANCELLED` | Отменённые (CANCELLED + REJECTED) |

#### Пример запроса

```http
GET /api/v1/my-registrations?filter=APPROVED&page=1&limit=10
Authorization: Bearer <access_token>
```

#### Пример ответа

```json
{
  "data": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "userId": "uuid",
      "status": "APPROVED",
      "role": "PARTICIPANT",
      "qrCode": "unique-qr-code",
      "travelStartDate": "2025-06-14",
      "travelEndDate": "2025-06-16",
      "preparationDays": 2,
      "createdAt": "2025-06-01T10:00:00Z",
      "updatedAt": "2025-06-01T10:00:00Z",
      "event": {
        "id": "uuid",
        "title": "Tech Conference 2025",
        "coverImage": "/uploads/event.jpg",
        "shortDescription": "Конференция по технологиям",
        "startDate": "2025-06-15T10:00:00Z",
        "endDate": "2025-06-15T18:00:00Z",
        "format": "OFFLINE",
        "venue": "Конференц-центр",
        "city": "Ташкент",
        "status": "PUBLISHED"
      },
      "attendances": [
        {
          "id": "uuid",
          "checkInAt": "2025-06-15T09:30:00Z",
          "checkInDate": "2025-06-15"
        }
      ],
      "certificate": {
        "id": "uuid",
        "certificateUrl": "/certificates/cert.pdf",
        "generatedAt": "2025-06-16T10:00:00Z"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

## Как узнать, зарегистрирован ли пользователь на конкретное мероприятие

При запросе публичного события передавать заголовок `Authorization: Bearer <accessToken>`. В ответе **GET /api/v1/public/events/:id** и **GET /api/v1/public/events/by-slug/:slug** приходит поле **`myRegistration`**:

- `myRegistration === null` — не зарегистрирован (или запрос без токена / не USER).
- `myRegistration` — объект `{ id, status, eventId }`; **`status`**: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.

Один запрос даёт и событие, и факт регистрации. Альтернатива: наличие события в списке **GET /api/v1/my-registrations** по `eventId`.

---

## Типы доступа к событию (EventAccessType)

При создании события организатор выбирает тип доступа:

| Тип | Описание | Статус регистрации |
|-----|----------|-------------------|
| `OPEN` | Открытая регистрация | Автоматически APPROVED |
| `REQUEST` | По запросу | PENDING (требует одобрения) |
| `INVITE_ONLY` | Только по приглашению | APPROVED (с проверкой кода) |

### Регистрация на INVITE_ONLY событие

```http
POST /api/v1/events/:eventId/register?inviteCode=EVT-ABC123
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "PARTICIPANT"
}
```

---

## Типы оплаты события (EventType)

| Тип | Описание |
|-----|----------|
| `FREE` | Бесплатное событие |
| `PAID` | Платное событие |

---

## Создание события с настройками доступа

```http
POST /api/v1/events
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Private Workshop",
  "type": "FREE",
  "accessType": "INVITE_ONLY",
  "format": "OFFLINE",
  "startDate": "2025-07-01T10:00:00Z",
  "endDate": "2025-07-01T14:00:00Z",
  "venue": "Офис",
  "city": "Ташкент"
}
```

#### Ответ для INVITE_ONLY события

```json
{
  "id": "uuid",
  "title": "Private Workshop",
  "type": "FREE",
  "accessType": "INVITE_ONLY",
  "inviteCode": "EVT-ABC12345",
  ...
}
```

### Регенерация кода приглашения

```http
POST /api/v1/events/:id/regenerate-invite-code
Authorization: Bearer <access_token>
```

---

## Проверка возможности регистрации

```http
GET /api/v1/public/events/:id/can-register
```

#### Ответ

```json
{
  "canRegister": true,
  "accessType": "OPEN",
  "requiresInviteCode": false
}
```

или

```json
{
  "canRegister": true,
  "accessType": "INVITE_ONLY",
  "requiresInviteCode": true
}
```

или

```json
{
  "canRegister": false,
  "reason": "Достигнут лимит участников",
  "accessType": "OPEN",
  "requiresInviteCode": false
}
```

