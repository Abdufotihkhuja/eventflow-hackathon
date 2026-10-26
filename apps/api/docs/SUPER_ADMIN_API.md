# Super Admin API

API для управления системой супер-администратором.

## Базовый путь
`/api/v1/super-admin`

## Аутентификация
Все endpoints требуют JWT токен с ролью `SUPER_ADMIN`.

---

## Пользователи

### GET /users
Получить список всех пользователей с фильтрами.

### GET /users/:userId
Получить пользователя по ID.

**Ответ:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Иван Иванов",
  "phone": "+998901234567",
  "location": "Ташкент",
  "bio": "Описание...",
  "isEmailVerified": true,
  "isPublicProfile": true,
  "showEmail": false,
  "showPhone": false,
  "createdAt": "2025-01-05T10:00:00Z"
}
```

### PATCH /users/:userId
Редактировать пользователя (без изменения статуса).

**Body:**
```json
{
  "email": "newemail@example.com",
  "name": "Новое имя",
  "phone": "+998901234567",
  "location": "Новый город",
  "bio": "Новое описание",
  "isEmailVerified": true,
  "isPublicProfile": true,
  "showEmail": false,
  "showPhone": false
}
```

---

### GET /users (список)

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| page | number | Номер страницы (default: 1) |
| limit | number | Количество на странице (default: 20, max: 100) |
| search | string | Поиск по email или имени |
| isEmailVerified | boolean | Фильтр по верификации email |
| includeDeleted | boolean | Включить удалённых пользователей |

**Пример запроса:**
```http
GET /api/v1/super-admin/users?page=1&limit=10&search=test@mail.com&isEmailVerified=true
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Имя",
      "isEmailVerified": true,
      "createdAt": "2025-01-05T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

## Организации

### GET /organizations
Получить список всех организаций с фильтрами.

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| page | number | Номер страницы (default: 1) |
| limit | number | Количество на странице (default: 20, max: 100) |
| search | string | Поиск по названию, email или ИНН |
| verificationStatus | enum | Статус верификации: `PENDING`, `APPROVED`, `REJECTED` |

**Пример запроса:**
```http
GET /api/v1/super-admin/organizations?verificationStatus=PENDING&page=1
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "org@example.com",
      "name": "Организация",
      "companyName": "ООО Компания",
      "inn": "1234567890",
      "verificationStatus": "PENDING",
      "createdAt": "2025-01-05T10:00:00Z",
      "_count": {
        "members": 5,
        "events": 3
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### GET /organizations/:orgId
Получить организацию по ID.

**Ответ:**
```json
{
  "id": "uuid",
  "email": "org@example.com",
  "name": "Иван Петров",
  "companyName": "ООО Компания",
  "inn": "1234567890",
  "description": "Описание...",
  "phone": "+998901234567",
  "logoUrl": "https://example.com/logo.png",
  "verificationStatus": "APPROVED",
  "isEmailVerified": true,
  "createdAt": "2025-01-05T10:00:00Z",
  "_count": {
    "members": 5,
    "events": 3
  }
}
```

### PATCH /organizations/:orgId
Редактировать организацию (без изменения статуса верификации).

**Body:**
```json
{
  "email": "newemail@example.com",
  "name": "Новое имя представителя",
  "companyName": "Новое название компании",
  "inn": "9876543210",
  "description": "Новое описание",
  "phone": "+998901234567",
  "logoUrl": "https://example.com/newlogo.png",
  "isEmailVerified": true
}
```

### GET /organizations/pending
Получить организации ожидающие верификации (сортировка по дате создания ASC).

### POST /organizations/:orgId/approve
Одобрить организацию.

### POST /organizations/:orgId/reject
Отклонить организацию.

**Body:**
```json
{
  "reason": "Причина отклонения"
}
```

---

## События

### GET /events
Получить список всех событий с фильтрами.

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| page | number | Номер страницы (default: 1) |
| limit | number | Количество на странице (default: 20, max: 100) |
| search | string | Поиск по названию |
| status | enum | Статус: `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `CANCELLED`, `COMPLETED` |
| format | enum | Формат: `ONLINE`, `OFFLINE`, `HYBRID` |
| type | enum | Тип: `FREE`, `PAID` |
| organizationId | uuid | ID организации |

**Пример запроса:**
```http
GET /api/v1/super-admin/events?status=PENDING_REVIEW&page=1
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Мероприятие",
      "status": "PENDING_REVIEW",
      "format": "OFFLINE",
      "type": "FREE",
      "startDate": "2025-06-15T10:00:00Z",
      "endDate": "2025-06-15T18:00:00Z",
      "createdAt": "2025-01-05T10:00:00Z",
      "organization": {
        "id": "uuid",
        "name": "Организация",
        "companyName": "ООО Компания",
        "email": "org@example.com",
        "verificationStatus": "APPROVED"
      },
      "_count": {
        "registrations": 50
      }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

### GET /events/:eventId
Получить событие по ID.

**Ответ:**
```json
{
  "id": "uuid",
  "title": "Tech Conference 2025",
  "description": "Полное описание...",
  "shortDescription": "Краткое описание",
  "coverImage": "/uploads/image.jpg",
  "type": "FREE",
  "accessType": "OPEN",
  "format": "OFFLINE",
  "status": "PUBLISHED",
  "startDate": "2025-06-15T10:00:00Z",
  "endDate": "2025-06-15T18:00:00Z",
  "venue": "Конференц-зал",
  "address": "г. Ташкент, ул. Навои, 1",
  "city": "Ташкент",
  "maxParticipants": 100,
  "organization": {
    "id": "uuid",
    "name": "Организация",
    "companyName": "ООО Компания",
    "email": "org@example.com",
    "verificationStatus": "APPROVED"
  },
  "speakers": [...],
  "agendaItems": [...],
  "_count": {
    "registrations": 50
  }
}
```

### PATCH /events/:eventId
Редактировать событие (без изменения статуса).

**Body:**
```json
{
  "title": "Новое название",
  "description": "Новое описание",
  "shortDescription": "Новое краткое описание",
  "coverImage": "/uploads/newimage.jpg",
  "type": "PAID",
  "accessType": "REQUEST",
  "format": "HYBRID",
  "startDate": "2025-07-15T10:00:00Z",
  "endDate": "2025-07-15T18:00:00Z",
  "registrationDeadline": "2025-07-14T23:59:59Z",
  "venue": "Новое место",
  "address": "Новый адрес",
  "city": "Новый город",
  "onlineUrl": "https://zoom.us/j/123456789",
  "price": 100000,
  "currency": "UZS",
  "maxParticipants": 200
}
```

> **Важно:** Поле `status` не передаётся и не изменяется через этот endpoint. Для изменения статуса используйте approve/reject endpoints.

### GET /events/pending
Получить события ожидающие модерации (сортировка по дате обновления ASC).

### POST /events/:eventId/approve
Одобрить событие (опубликовать).

### POST /events/:eventId/reject
Отклонить событие (вернуть в черновик).

**Body:**
```json
{
  "reason": "Причина отклонения"
}
```

---

## Статусы

### Статусы верификации организаций (OrganizationVerificationStatus)
- `PENDING` - Ожидает проверки
- `APPROVED` - Одобрена
- `REJECTED` - Отклонена

### Статусы событий (EventStatus)
- `DRAFT` - Черновик
- `PENDING_REVIEW` - На модерации
- `PUBLISHED` - Опубликовано
- `CANCELLED` - Отменено
- `COMPLETED` - Завершено

### Форматы событий (EventFormat)
- `ONLINE` - Онлайн
- `OFFLINE` - Оффлайн
- `HYBRID` - Гибрид

### Типы событий (EventType)
- `FREE` - Бесплатное
- `PAID` - Платное

