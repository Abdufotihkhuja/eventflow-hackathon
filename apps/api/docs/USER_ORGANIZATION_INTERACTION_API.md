# API взаимодействия пользователей с организаторами

Документация для новых endpoints, позволяющих пользователям взаимодействовать с организаторами: подписки, заявки на связь, просмотр профиля и событий.

---

## Подписки на организаторов (Followers)

### Подписаться на организатора

**Endpoint:** `POST /organizations/:id/follow`

**Роли:** `USER`

**Описание:** Подписаться на организатора для получения обновлений о его мероприятиях.

**Path параметры:**
- `id` (UUID, обязательный) — ID организации

**Ответы:**
- `204 No Content` — Подписка успешно создана
- `404 Not Found` — Организация не найдена
- `409 Conflict` — Уже подписаны на этого организатора

**Пример:**
```bash
curl -X POST https://api.eventflow.com/organizations/123e4567-e89b-12d3-a456-426614174000/follow \
  -H "Authorization: Bearer {token}"
```

---

### Отписаться от организатора

**Endpoint:** `DELETE /organizations/:id/unfollow`

**Роли:** `USER`

**Описание:** Отписаться от организатора.

**Path параметры:**
- `id` (UUID, обязательный) — ID организации

**Ответы:**
- `204 No Content` — Подписка успешно удалена
- `404 Not Found` — Подписка не найдена

**Пример:**
```bash
curl -X DELETE https://api.eventflow.com/organizations/123e4567-e89b-12d3-a456-426614174000/unfollow \
  -H "Authorization: Bearer {token}"
```

---

### Проверить статус подписки

**Endpoint:** `GET /organizations/:id/is-following`

**Роли:** `USER`

**Описание:** Проверить, подписан ли текущий пользователь на организатора.

**Path параметры:**
- `id` (UUID, обязательный) — ID организации

**Ответ:**
```json
{
  "isFollowing": true
}
```

**Пример:**
```bash
curl https://api.eventflow.com/organizations/123e4567-e89b-12d3-a456-426614174000/is-following \
  -H "Authorization: Bearer {token}"
```

---

### Получить список подписок пользователя

**Endpoint:** `GET /account/me/following-organizations`

**Роли:** `USER`

**Описание:** Получить список организаторов, на которых подписан текущий пользователь.

**Query параметры:**
- `page` (integer, опционально, по умолчанию: 1) — Номер страницы
- `limit` (integer, опционально, по умолчанию: 10) — Количество записей на странице (1-100)

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "EventFlow",
      "companyName": "ООО EventFlow",
      "logoUrl": "https://example.com/logo.jpg",
      "description": "Организация мероприятий",
      "website": "https://eventflow.com",
      "verificationStatus": "APPROVED",
      "followedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

**Пример:**
```bash
curl https://api.eventflow.com/account/me/following-organizations?page=1&limit=10 \
  -H "Authorization: Bearer {token}"
```

---

### Получить список подписчиков (для организаторов)

**Endpoint:** `GET /organizations/followers`

**Роли:** `ORGANIZATION`, `MEMBER`

**Описание:** Получить список подписчиков организации с возможностью поиска.

**Query параметры:**
- `page` (integer, опционально, по умолчанию: 1) — Номер страницы
- `limit` (integer, опционально, по умолчанию: 10) — Количество записей на странице (1-100)
- `search` (string, опционально) — Поиск по имени пользователя

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Иван",
      "lastName": "Иванов",
      "avatarUrl": "https://example.com/avatar.jpg",
      "followedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

**Пример:**
```bash
curl https://api.eventflow.com/organizations/followers?page=1&search=Иван \
  -H "Authorization: Bearer {token}"
```

---

### Получить статистику подписчиков (для организаторов)

**Endpoint:** `GET /organizations/followers/stats`

**Роли:** `ORGANIZATION`, `MEMBER`

**Описание:** Получить статистику подписчиков организации.

**Ответ:**
```json
{
  "total": 150,
  "last7Days": 5,
  "last30Days": 25
}
```

**Пример:**
```bash
curl https://api.eventflow.com/organizations/followers/stats \
  -H "Authorization: Bearer {token}"
```

---

## Заявки на связь (Contact Requests)

### Отправить заявку на связь

**Endpoint:** `POST /organizations/:id/contact`

**Роли:** `USER`

**Описание:** Отправить заявку на связь с организатором. Организатору придет email уведомление.

**Path параметры:**
- `id` (UUID, обязательный) — ID организации

**Body:**
```json
{
  "phone": "+998901234567",
  "message": "Хочу узнать подробнее о вашем мероприятии"
}
```

**Поля:**
- `phone` (string, обязательный) — Номер телефона в международном формате
- `message` (string, опционально) — Сообщение для организатора

**Ответы:**
- `201 Created` — Заявка успешно отправлена
- `404 Not Found` — Организация не найдена

**Пример:**
```bash
curl -X POST https://api.eventflow.com/organizations/123e4567-e89b-12d3-a456-426614174000/contact \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+998901234567",
    "message": "Хочу узнать подробнее о вашем мероприятии"
  }'
```

---

### Получить список заявок (для организаторов)

**Endpoint:** `GET /organizations/contacts`

**Роли:** `ORGANIZATION`, `MEMBER`

**Описание:** Получить список заявок на связь с фильтрацией и поиском.

**Query параметры:**
- `page` (integer, опционально, по умолчанию: 1) — Номер страницы
- `limit` (integer, опционально, по умолчанию: 10) — Количество записей на странице (1-100)
- `status` (enum, опционально) — Фильтр по статусу: `NEW`, `IN_PROGRESS`, `CLOSED`
- `search` (string, опционально) — Поиск по имени пользователя или телефону

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "firstName": "Иван",
        "lastName": "Иванов",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "phone": "+998901234567",
      "message": "Хочу узнать подробнее о вашем мероприятии",
      "status": "NEW",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Пример:**
```bash
curl https://api.eventflow.com/organizations/contacts?status=NEW&page=1 \
  -H "Authorization: Bearer {token}"
```

---

### Получить статистику заявок (для организаторов)

**Endpoint:** `GET /organizations/contacts/stats`

**Роли:** `ORGANIZATION`, `MEMBER`

**Описание:** Получить статистику заявок по статусам.

**Ответ:**
```json
{
  "total": 50,
  "new": 15,
  "inProgress": 20,
  "closed": 15
}
```

**Пример:**
```bash
curl https://api.eventflow.com/organizations/contacts/stats \
  -H "Authorization: Bearer {token}"
```

---

### Получить заявку по ID (для организаторов)

**Endpoint:** `GET /organizations/contacts/:id`

**Роли:** `ORGANIZATION`, `MEMBER`

**Описание:** Получить детальную информацию о заявке.

**Path параметры:**
- `id` (UUID, обязательный) — ID заявки

**Ответ:**
```json
{
  "id": "uuid",
  "user": {
    "id": "uuid",
    "firstName": "Иван",
    "lastName": "Иванов",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "phone": "+998901234567",
  "message": "Хочу узнать подробнее о вашем мероприятии",
  "status": "NEW",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Ответы:**
- `200 OK` — Заявка найдена
- `404 Not Found` — Заявка не найдена

**Пример:**
```bash
curl https://api.eventflow.com/organizations/contacts/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer {token}"
```

---

### Обновить статус заявки (для организаторов)

**Endpoint:** `PATCH /organizations/contacts/:id/status`

**Роли:** `ORGANIZATION`, `MEMBER`

**Описание:** Изменить статус заявки.

**Path параметры:**
- `id` (UUID, обязательный) — ID заявки

**Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

**Поля:**
- `status` (enum, обязательный) — Новый статус: `NEW`, `IN_PROGRESS`, `CLOSED`

**Ответ:** Обновленная заявка (см. формат выше)

**Ответы:**
- `200 OK` — Статус обновлен
- `404 Not Found` — Заявка не найдена

**Пример:**
```bash
curl -X PATCH https://api.eventflow.com/organizations/contacts/123e4567-e89b-12d3-a456-426614174000/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

---

## Публичный профиль организатора

### Получить публичный профиль

**Endpoint:** `GET /organizations/:id/public`

**Роли:** `USER`

**Описание:** Получить публичную информацию об организаторе.

**Path параметры:**
- `id` (UUID, обязательный) — ID организации

**Ответ:**
```json
{
  "id": "uuid",
  "name": "EventFlow",
  "companyName": "ООО EventFlow",
  "description": "Организация мероприятий",
  "logoUrl": "https://example.com/logo.jpg",
  "website": "https://eventflow.com",
  "address": "Москва, ул. Примерная, 123",
  "followersCount": 150,
  "eventsCount": 25,
  "verificationStatus": "APPROVED",
  "verifiedAt": "2024-01-15T10:00:00Z",
  "isFollowing": true
}
```

**Поля:**
- `followersCount` — Количество подписчиков
- `eventsCount` — Количество опубликованных событий
- `isFollowing` — Подписан ли текущий пользователь

**Ответы:**
- `200 OK` — Профиль найден
- `404 Not Found` — Организация не найдена

**Пример:**
```bash
curl https://api.eventflow.com/organizations/123e4567-e89b-12d3-a456-426614174000/public \
  -H "Authorization: Bearer {token}"
```

---

## События организатора

### Получить список событий организатора

**Endpoint:** `GET /organizations/:id/events`

**Роли:** `USER`

**Описание:** Получить список опубликованных событий организатора с разделением на предстоящие и прошедшие.

**Path параметры:**
- `id` (UUID, обязательный) — ID организации

**Query параметры:**
- `page` (integer, опционально, по умолчанию: 1) — Номер страницы
- `limit` (integer, опционально, по умолчанию: 10) — Количество записей на странице (1-100)
- `status` (enum, опционально) — Фильтр по времени:
  - `upcoming` — Предстоящие события (startDate >= now)
  - `past` — Прошедшие события (endDate < now)

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Tech Conference 2025",
      "description": "Описание мероприятия...",
      "shortDescription": "Краткое описание",
      "coverImage": "https://example.com/cover.jpg",
      "type": "FREE",
      "accessType": "OPEN",
      "format": "HYBRID",
      "status": "PUBLISHED",
      "startDate": "2025-06-15T10:00:00Z",
      "endDate": "2025-06-15T18:00:00Z",
      "venue": "Конференц-зал",
      "address": "Москва, ул. Примерная, 123",
      "city": "Москва",
      "onlineUrl": "https://zoom.us/...",
      "price": null,
      "currency": "UZS",
      "maxParticipants": 100,
      "organization": {
        "id": "uuid",
        "companyName": "EventFlow",
        "logoUrl": "https://example.com/logo.jpg"
      },
      "_count": {
        "registrations": 45
      }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

**Сортировка:**
- Предстоящие (`upcoming`): по возрастанию даты (сначала ближайшие)
- Прошедшие (`past`): по убыванию даты (сначала недавние)

**Пример:**
```bash
# Получить предстоящие события
curl https://api.eventflow.com/organizations/123e4567-e89b-12d3-a456-426614174000/events?status=upcoming \
  -H "Authorization: Bearer {token}"

# Получить прошедшие события
curl https://api.eventflow.com/organizations/123e4567-e89b-12d3-a456-426614174000/events?status=past&page=1 \
  -H "Authorization: Bearer {token}"
```

---

## Email уведомления

### Уведомление о новой заявке на связь

При создании заявки на связь организатору автоматически отправляется email уведомление со следующей информацией:

- Имя пользователя
- Контактный телефон
- Сообщение (если указано)
- Ссылка на админ-панель для просмотра заявок

**Тема письма:** "Новая заявка на связь от пользователя"

**Шаблон:** `contact-request.hbs`

---

## Модели данных

### UserFollowing
```prisma
model UserFollowing {
  id             String   @id @default(uuid())
  userId         String
  organizationId String
  createdAt      DateTime @default(now())
  
  user         User         @relation(...)
  organization Organization @relation(...)
  
  @@unique([userId, organizationId])
}
```

### ContactRequest
```prisma
model ContactRequest {
  id             String               @id @default(uuid())
  userId         String
  organizationId String
  phone          String
  message        String?
  status         ContactRequestStatus @default(NEW)
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  
  user         User         @relation(...)
  organization Organization @relation(...)
}

enum ContactRequestStatus {
  NEW
  IN_PROGRESS
  CLOSED
}
```

---

## Безопасность

### Аутентификация
Все endpoints требуют JWT токен в заголовке `Authorization: Bearer {token}`.

### Авторизация
- Endpoints для пользователей: роль `USER`
- Endpoints для организаторов: роли `ORGANIZATION` или `MEMBER`

### Валидация
- Номера телефонов проверяются на соответствие международному формату
- UUID валидируются с помощью `ParseUUIDPipe`
- Pagination ограничена: `page >= 1`, `limit: 1-100`

### Приватность
В публичном профиле организатора **не возвращаются**:
- Email
- Телефон
- ИНН
- Хеш пароля

---

## Примеры использования

### Пользовательский flow

1. Пользователь просматривает публичный профиль организатора
2. Видит количество подписчиков и событий
3. Подписывается на организатора
4. Просматривает предстоящие события
5. При необходимости отправляет заявку на связь

```bash
# 1. Получить профиль
curl https://api.eventflow.com/organizations/{id}/public \
  -H "Authorization: Bearer {token}"

# 2. Подписаться
curl -X POST https://api.eventflow.com/organizations/{id}/follow \
  -H "Authorization: Bearer {token}"

# 3. Посмотреть события
curl https://api.eventflow.com/organizations/{id}/events?status=upcoming \
  -H "Authorization: Bearer {token}"

# 4. Отправить заявку
curl -X POST https://api.eventflow.com/organizations/{id}/contact \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998901234567", "message": "Вопрос по мероприятию"}'
```

### Организаторский flow

1. Организатор просматривает свою статистику подписчиков
2. Видит список новых заявок на связь
3. Обновляет статус заявок
4. Связывается с пользователями

```bash
# 1. Статистика подписчиков
curl https://api.eventflow.com/organizations/followers/stats \
  -H "Authorization: Bearer {token}"

# 2. Список новых заявок
curl https://api.eventflow.com/organizations/contacts?status=NEW \
  -H "Authorization: Bearer {token}"

# 3. Обновить статус
curl -X PATCH https://api.eventflow.com/organizations/contacts/{id}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

---

## Swagger документация

Все endpoints автоматически документируются в Swagger UI:
- **URL:** `{base_url}/api/docs`
- **Теги:**
  - `organizations/followers` — Подписки
  - `organizations/contacts` — Заявки на связь
  - `organizations` — Публичный профиль
  - `events` — События организатора
