# Public API

Публичный API для отображения статистики и событий на landing page и публичных страницах.

**Все endpoints доступны без авторизации.**

Для **GET события по ID** и **GET события по slug** при авторизованном пользователе фронт передаёт заголовок `Authorization: Bearer <accessToken>`. Тогда в ответ добавляется поле **`myRegistration`** — регистрация текущего пользователя на это событие (или `null`, если не зарегистрирован). Без токена поле всё равно присутствует и равно `null`. По `myRegistration != null` фронт определяет, зарегистрирован ли пользователь на событие (страницы регистрации и вопросов).

## Endpoints

### 1. Получить статистику платформы

```
GET /api/v1/public/stats
```

**Описание:** Возвращает общую статистику EventFlow для landing page.

#### Response 200

```json
{
  "activeEvents": {
    "value": 12,
    "change": 3,
    "period": "за неделю"
  },
  "newParticipants": {
    "value": 128,
    "changePercent": 18,
    "changeType": "MoM"
  },
  "registrationConversion": {
    "value": 42,
    "description": "по всем событиям"
  },
  "totalOrganizations": 50,
  "totalParticipants": 1500,
  "totalEvents": 200
}
```

#### Описание полей

| Поле | Описание |
|------|----------|
| `activeEvents.value` | Количество активных событий |
| `activeEvents.change` | Новых событий за неделю |
| `newParticipants.value` | Новые участники за текущий месяц |
| `newParticipants.changePercent` | Изменение Month-over-Month в % |
| `registrationConversion.value` | Конверсия регистрации в % |
| `totalOrganizations` | Всего верифицированных организаций |
| `totalParticipants` | Всего участников на платформе |
| `totalEvents` | Всего опубликованных событий |

---

### 2. Получить статистику организации

```
GET /api/v1/public/organizations/:id/stats
```

**Описание:** Возвращает публичную статистику конкретной организации.

#### Path параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | UUID | ID организации |

#### Response 200

```json
{
  "id": "uuid",
  "name": "EventFlow Inc.",
  "logoUrl": "https://...",
  "activeEvents": {
    "value": 12,
    "change": 3,
    "period": "за неделю"
  },
  "newParticipants": {
    "value": 128,
    "changePercent": 18,
    "changeType": "MoM"
  },
  "registrationConversion": {
    "value": 42,
    "description": "по всем событиям"
  },
  "totalEvents": 15,
  "totalParticipants": 450
}
```

#### Response 404

```json
{
  "statusCode": 404,
  "message": "Организация не найдена"
}
```

---

### 3. Получить список публичных событий

```
GET /api/v1/public/events
```

**Описание:** Возвращает список опубликованных событий с фильтрацией и пагинацией.

#### Query параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `page` | number | 1 | Номер страницы |
| `limit` | number | 10 | Количество на странице (макс. 50) |
| `search` | string | - | Поисковый запрос (по названию и описанию) |
| `city` | string | - | Фильтр по городу |
| `format` | enum | - | Формат: `ONLINE`, `OFFLINE`, `HYBRID` |
| `type` | enum | - | Тип: `FREE`, `PAID` |
| `filter` | string | upcoming | `upcoming` - предстоящие, `past` - прошедшие, `all` - все |

#### Response 200

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Tech Conference 2025",
      "shortDescription": "Описание события...",
      "coverImage": "https://...",
      "startDate": "2025-06-15T10:00:00Z",
      "endDate": "2025-06-15T18:00:00Z",
      "format": "OFFLINE",
      "type": "FREE",
      "city": "Ташкент",
      "maxParticipants": 100,
      "registrationsCount": 45,
      "organization": {
        "id": "uuid",
        "name": "EventFlow Inc.",
        "logoUrl": "https://..."
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### 4. Получить событие по ID

```
GET /api/v1/public/events/:id
```

**Описание:** Возвращает подробную информацию о событии. Без авторизации доступен всем. При передаче заголовка `Authorization: Bearer <accessToken>` в ответ добавляется поле `myRegistration` (регистрация текущего пользователя на это событие или `null`).

#### Заголовки (опционально)

| Заголовок | Описание |
|-----------|----------|
| `Authorization` | `Bearer <access_token>` — при наличии валидного токена в ответ добавляется `myRegistration` |

#### Path параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | UUID | ID события |

#### Response 200

```json
{
  "id": "uuid",
  "title": "Tech Conference 2025",
  "description": "Полное описание...",
  "shortDescription": "Краткое описание",
  "coverImage": "https://...",
  "startDate": "2025-06-15T10:00:00Z",
  "endDate": "2025-06-15T18:00:00Z",
  "format": "OFFLINE",
  "type": "FREE",
  "accessType": "OPEN",
  "city": "Ташкент",
  "venue": "IT Park",
  "address": "ул. Примерная, 123",
  "maxParticipants": 100,
  "registrationsCount": 45,
  "registrationMode": "QUESTIONS",
  "testEvaluationType": null,
  "minTestScore": null,
  "maxTestScore": null,
  "organization": {
    "id": "uuid",
    "name": "EventFlow Inc.",
    "logoUrl": "https://...",
    "description": "Описание организации"
  },
  "speakers": [
    {
      "id": "uuid",
      "firstName": "Иван",
      "lastName": "Иванов",
      "position": "CTO",
      "company": "Tech Corp",
      "avatarUrl": "https://..."
    }
  ],
  "agendaItems": [
    {
      "id": "uuid",
      "title": "Открытие",
      "type": "KEYNOTE",
      "startTime": "10:00:00",
      "duration": 30
    }
  ],
  "myRegistration": null
}
```

При авторизованном запросе и наличии регистрации пользователя на событие поле `myRegistration` заполняется:

```json
"myRegistration": {
  "id": "uuid",
  "status": "APPROVED",
  "eventId": "uuid"
}
```

| Поле `myRegistration` | Тип | Описание |
|------------------------|-----|----------|
| `myRegistration` | object \| null | Регистрация текущего пользователя на событие; `null` без токена, при невалидном токене или если пользователь не зарегистрирован. Только для пользователей типа USER. |
| `myRegistration.id` | string | ID регистрации |
| `myRegistration.status` | string | Статус: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `myRegistration.eventId` | string | ID события |

#### Поля для формы регистрации (вопросы / тест)

| Поле | Тип | Описание |
|------|-----|----------|
| `registrationMode` | enum | `QUESTIONS` — уточняющие вопросы (или регистрация без вопросов, если список пуст); `TEST` — тест с проверкой ответов |
| `testEvaluationType` | enum \| null | Только при `registrationMode === "TEST"`: `AUTO_REJECT` — не прошёл тест = отклонён; `EVALUATION` — все допускаются, результаты видны организатору |
| `minTestScore` | number \| null | Минимальный балл для прохождения теста (при режиме TEST) |
| `maxTestScore` | number \| null | Максимальный балл теста (при режиме TEST) |

**Логика для фронта:** по `registrationMode` показать форму: при `TEST` — тест (обязательные ответы, проверка по баллам); при `QUESTIONS` — запросить `GET /api/v1/events/:eventId/questions/public` и показать форму вопросов, либо только кнопку регистрации, если массив вопросов пустой.

#### Response 404

```json
{
  "statusCode": 404,
  "message": "Событие не найдено"
}
```

---

### 5. Получить событие по slug

```
GET /api/v1/public/events/by-slug/:slug
```

**Описание:** То же, что и получение события по ID, но по SEO-friendly slug. Поддерживает опциональный заголовок `Authorization: Bearer <access_token>` и поле `myRegistration` в ответе (см. п. 4).

| Параметр | Тип | Описание |
|----------|-----|----------|
| `slug` | string | Slug события (например, `tech-conference-2025`) |

---

## Примеры cURL

```bash
# Статистика платформы
curl -X GET "http://localhost:3000/api/v1/public/stats"

# Статистика организации
curl -X GET "http://localhost:3000/api/v1/public/organizations/ORG_UUID/stats"

# Список событий (предстоящие)
curl -X GET "http://localhost:3000/api/v1/public/events?page=1&limit=10&filter=upcoming"

# Поиск событий по городу
curl -X GET "http://localhost:3000/api/v1/public/events?city=Ташкент&format=OFFLINE"

# Получить событие (без авторизации)
curl -X GET "http://localhost:3000/api/v1/public/events/EVENT_UUID"

# Получить событие с информацией о регистрации текущего пользователя
curl -X GET "http://localhost:3000/api/v1/public/events/EVENT_UUID" \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Получить событие по slug
curl -X GET "http://localhost:3000/api/v1/public/events/by-slug/tech-conference-2025"
```

---

## Примечания

- Все endpoints публичные и не требуют авторизации
- Для **GET /api/v1/public/events/:id** и **GET /api/v1/public/events/by-slug/:slug** при передаче валидного `Authorization: Bearer <token>` в ответ добавляется **myRegistration** (регистрация текущего пользователя на событие или `null`). Учитываются только пользователи типа USER
- Показываются только события верифицированных организаций
- **События по приглашению (INVITE_ONLY)** не попадают в публичный список и не отдаются по GET по id/slug — для анонима возвращается 404. Такие события видны только приглашённым пользователям в разделе «Мои события» профиля (GET `/api/v1/registrations/my-registrations`).
- Статистика участников рассчитывается только по одобренным регистрациям
- MoM (Month-over-Month) — сравнение текущего месяца с предыдущим

