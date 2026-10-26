# API "Мои события" (User Events)

API для получения списка событий, на которые пользователь зарегистрировался.

## Эндпоинты

### 1. Получить список событий со статистикой

```
GET /api/v1/account/me/events
```

**Требуется**: Авторизация (JWT токен пользователя)

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `page` | number | 1 | Номер страницы |
| `limit` | number | 10 | Количество элементов на странице |
| `filter` | enum | ALL | Фильтр событий |
| `search` | string | - | Поиск по названию события |

**Доступные фильтры:**

| Фильтр | Описание |
|--------|----------|
| `ALL` | Все события |
| `APPROVED` | Подтверждённые регистрации |
| `PENDING` | Ожидающие подтверждения |
| `ATTENDED` | Посещённые (есть хотя бы один check-in) |
| `CANCELLED` | Отменённые (CANCELLED + REJECTED) |

**Пример запроса:**

```bash
curl -X GET "http://localhost:3000/api/v1/account/me/events?filter=APPROVED&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Пример ответа:**

```json
{
  "data": [
    {
      "id": "uuid",
      "status": "APPROVED",
      "role": "PARTICIPANT",
      "qrCode": "unique-qr-code",
      "rejectionReason": null,
      "createdAt": "2025-01-06T10:00:00.000Z",
      "event": {
        "id": "uuid",
        "title": "Tech Conference 2025",
        "coverImage": "/uploads/event-cover.jpg",
        "shortDescription": "Крупнейшая IT-конференция года",
        "startDate": "2025-06-15T10:00:00.000Z",
        "endDate": "2025-06-17T18:00:00.000Z",
        "format": "OFFLINE",
        "venue": "Expo Center",
        "city": "Москва",
        "status": "PUBLISHED",
        "organizationName": "TechOrg"
      },
      "attendances": [
        {
          "id": "uuid",
          "checkInAt": "2025-06-15T09:30:00.000Z",
          "checkInDate": "2025-06-15"
        }
      ],
      "certificate": {
        "id": "uuid",
        "certificateUrl": "/uploads/certificates/cert.pdf",
        "generatedAt": "2025-06-18T10:00:00.000Z"
      },
      "isAttended": true,
      "isPastEvent": false
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "totalEvents": 25,
    "approvedEvents": 18,
    "pendingEvents": 3,
    "attendedEvents": 12,
    "cancelledEvents": 4,
    "certificatesCount": 5
  }
}
```

---

### 2. Получить статистику событий

```
GET /api/v1/account/me/events/stats
```

**Требуется**: Авторизация (JWT токен пользователя)

Быстрый эндпоинт для получения только статистики без списка событий.

**Пример ответа:**

```json
{
  "totalEvents": 25,
  "approvedEvents": 18,
  "pendingEvents": 3,
  "attendedEvents": 12,
  "cancelledEvents": 4,
  "certificatesCount": 5
}
```

---

## Описание полей ответа

### UserEventItemDto

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string | ID регистрации |
| `status` | enum | Статус: PENDING, APPROVED, REJECTED, CANCELLED |
| `role` | enum | Роль: PARTICIPANT, SPEAKER, MENTOR |
| `qrCode` | string | QR-код для чек-ина |
| `rejectionReason` | string? | Причина отклонения (если есть) |
| `createdAt` | date | Дата регистрации |
| `event` | object | Информация о событии |
| `attendances` | array | Записи о посещении (чек-ины) |
| `certificate` | object? | Сертификат (если есть) |
| `isAttended` | boolean | Был ли чек-ин на событии |
| `isPastEvent` | boolean | Прошло ли событие |

### UserEventsStatsDto

| Поле | Тип | Описание |
|------|-----|----------|
| `totalEvents` | number | Общее количество регистраций |
| `approvedEvents` | number | Подтверждённые |
| `pendingEvents` | number | Ожидающие |
| `attendedEvents` | number | Посещённые |
| `cancelledEvents` | number | Отменённые |
| `certificatesCount` | number | Количество сертификатов пользователя |

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 401 | Не авторизован |
| 403 | Доступно только для пользователей (не организации/member) |

