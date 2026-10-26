# API приглашений спикеров (Speaker Invitations)

## Обзор

API для приглашения спикеров на мероприятия. Позволяет организаторам отправлять приглашения по email, а приглашенным пользователям - принимать или отклонять их.

**Base URL**: `/api/v1`

---

## Endpoints для организаторов

### 1. Отправить приглашение спикеру

**POST** `/events/:eventId/speakers/invite`

**Права доступа**: `EVENTS_UPDATE`

Отправляет приглашение спикеру по email. Создает запись Speaker со статусом PENDING и генерирует токен приглашения.

#### Request Parameters

| Параметр  | Тип  | Описание               |
| --------- | ---- | ---------------------- |
| `eventId` | UUID | ID мероприятия (в URL) |

#### Request Body

```json
{
  "email": "speaker@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "position": "Senior Developer",
  "company": "Google",
  "bio": "Краткая информация о спикере...",
  "linkedinUrl": "https://linkedin.com/in/username",
  "instagramUrl": "https://instagram.com/username",
  "facebookUrl": "https://facebook.com/username",
  "xUrl": "https://x.com/username",
  "websiteUrl": "https://example.com"
}
```

#### Поля

| Поле          | Тип    | Обязательно | Описание                             |
| ------------- | ------ | ----------- | ------------------------------------ |
| `email`       | string | Да          | Email для отправки приглашения       |
| `firstName`   | string | Да          | Имя спикера (макс. 200 символов)     |
| `lastName`    | string | Да          | Фамилия спикера (макс. 200 символов) |
| `position`    | string | Да          | Должность (макс. 200 символов)       |
| `company`     | string | Нет         | Компания (макс. 200 символов)        |
| `bio`         | string | Нет         | Биография (макс. 2000 символов)      |
| `linkedinUrl`   | string | Нет         | LinkedIn профиль (валидный URL)      |
| `instagramUrl`  | string | Нет         | Instagram профиль (валидный URL)     |
| `facebookUrl`   | string | Нет         | Facebook профиль (валидный URL)     |
| `xUrl`          | string | Нет         | X (Twitter) профиль (валидный URL)   |
| `websiteUrl`    | string | Нет         | Личный сайт (валидный URL)           |

#### Response 201

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "userId": null,
  "firstName": "Иван",
  "lastName": "Иванов",
  "position": "Senior Developer",
  "company": "Google",
  "bio": "Краткая информация о спикере...",
  "avatarUrl": null,
  "linkedinUrl": "https://linkedin.com/in/username",
  "instagramUrl": "https://instagram.com/username",
  "facebookUrl": "https://facebook.com/username",
  "xUrl": "https://x.com/username",
  "websiteUrl": "https://example.com",
  "invitationStatus": "PENDING",
  "invitationToken": "1a2b3c...",
  "tokenExpiresAt": "2026-01-21T17:03:22.000Z",
  "invitedEmail": "speaker@example.com",
  "sortOrder": 0,
  "createdAt": "2026-01-19T17:03:22.000Z",
  "updatedAt": "2026-01-19T17:03:22.000Z"
}
```

#### Response 409 (Conflict)

```json
{
  "statusCode": 409,
  "message": "Спикер с таким email уже приглашен",
  "error": "Conflict"
}
```

#### Response 400 (Email отправить не удалось)

```json
{
  "statusCode": 400,
  "message": "Не удалось отправить приглашение. Проверьте корректность email адреса.",
  "error": "Bad Request"
}
```

---

### 2. Повторно отправить приглашение

**POST** `/events/:eventId/speakers/:speakerId/resend-invitation`

**Права доступа**: `EVENTS_UPDATE`

Повторно отправляет приглашение спикеру. Генерирует новый токен.

#### Request Parameters

| Параметр    | Тип  | Описание       |
| ----------- | ---- | -------------- |
| `eventId`   | UUID | ID мероприятия |
| `speakerId` | UUID | ID спикера     |

#### Response 200

```json
{
  "message": "Приглашение отправлено повторно"
}
```

#### Response 400 (Неверный статус)

```json
{
  "statusCode": 400,
  "message": "Можно повторно отправить только ожидающее приглашение",
  "error": "Bad Request"
}
```

---

## Публичные endpoints

### 3. Получить информацию о приглашении

**GET** `/speakers/invitation/:token`

**Авторизация**: Не требуется (публичный endpoint)

Получает информацию о приглашении по токену из email.

#### Request Parameters

| Параметр | Тип    | Описание                           |
| -------- | ------ | ---------------------------------- |
| `token`  | string | Токен приглашения из email (в URL) |

#### Response 200

```json
{
  "speakerId": "uuid",
  "eventId": "uuid",
  "eventTitle": "Tech Conference 2026",
  "eventStartDate": "2026-06-15T10:00:00.000Z",
  "eventEndDate": "2026-06-15T18:00:00.000Z",
  "organizationName": "Google",
  "role": "SPEAKER"
}
```

#### Response 404

```json
{
  "statusCode": 404,
  "message": "Приглашение не найдено",
  "error": "Not Found"
}
```

#### Response 400 (Срок истек)

```json
{
  "statusCode": 400,
  "message": "Срок действия приглашения истек",
  "error": "Bad Request"
}
```

#### Response 400 (Уже обработано)

```json
{
  "statusCode": 400,
  "message": "Приглашение уже обработано",
  "error": "Bad Request"
}
```

---

## Endpoints для приглашенных спикеров

### 4. Принять приглашение

**POST** `/speakers/invitation/accept`

**Авторизация**: JWT (только User тип)

Принимает приглашение спикера. Создает Registration с role=SPEAKER и связывает Speaker с User.

#### Request Body

```json
{
  "token": "1a2b3c4d5e6f7g8h9i0j..."
}
```

#### Поля

| Поле    | Тип    | Обязательно | Описание                   |
| ------- | ------ | ----------- | -------------------------- |
| `token` | string | Да          | Токен приглашения из email |

#### Response 200

```json
{
  "message": "Приглашение принято"
}
```

#### Response 400 (Email не совпадает)

```json
{
  "statusCode": 400,
  "message": "Email не совпадает с приглашенным",
  "error": "Bad Request"
}
```

#### Response 404

```json
{
  "statusCode": 404,
  "message": "Пользователь не найден",
  "error": "Not Found"
}
```

**Примечание**: После принятия приглашения:

1. Создается/обновляется Registration с `role=SPEAKER` и `status=APPROVED`
2. Speaker.userId заполняется ID текущего пользователя
3. Speaker.invitationStatus меняется на ACCEPTED
4. Токен удаляется (invitationToken и tokenExpiresAt = null)
5. Событие появляется в календаре пользователя с фильтром "Выступаю"

---

### 5. Отклонить приглашение

**POST** `/speakers/invitation/reject`

**Авторизация**: JWT (только User тип)

Отклоняет приглашение спикера. Registration НЕ создается.

#### Request Body

```json
{
  "token": "1a2b3c4d5e6f7g8h9i0j...",
  "reason": "К сожалению, в указанные даты у меня другие обязательства"
}
```

#### Поля

| Поле     | Тип    | Обязательно | Описание                                |
| -------- | ------ | ----------- | --------------------------------------- |
| `token`  | string | Да          | Токен приглашения из email              |
| `reason` | string | Нет         | Причина отклонения (макс. 500 символов) |

#### Response 200

```json
{
  "message": "Приглашение отклонено"
}
```

**Примечание**: После отклонения:

1. Speaker.invitationStatus меняется на REJECTED
2. Токен удаляется
3. Причина отклонения сохраняется в Speaker.bio (если указана)
4. Registration НЕ создается

---

## Статусы приглашений

| Статус     | Описание                                |
| ---------- | --------------------------------------- |
| `NONE`     | Спикер добавлен вручную без приглашения |
| `PENDING`  | Приглашение отправлено, ожидает ответа  |
| `ACCEPTED` | Приглашение принято                     |
| `REJECTED` | Приглашение отклонено                   |

---

## Flow приглашения

### Сценарий 1: Существующий пользователь

1. Организатор отправляет приглашение: `POST /events/:id/speakers/invite`
2. Система проверяет существование User с указанным email
3. Создается Speaker со статусом PENDING
4. Отправляется email с токеном и ссылками
5. Спикер получает email и кликает "Принять"
6. Спикер авторизуется в системе (если еще не авторизован)
7. Спикер принимает приглашение: `POST /speakers/invitation/accept`
8. Создается Registration с role=SPEAKER
9. Speaker связывается с User (userId заполняется)
10. Событие появляется в календаре спикера

### Сценарий 2: Новый пользователь

1. Организатор отправляет приглашение
2. Система не находит User с указанным email
3. В email указывается, что требуется регистрация
4. Спикер кликает "Принять" и попадает на страницу регистрации
5. Спикер регистрируется: `POST /auth/register`
6. После регистрации автоматически переходит к принятию приглашения
7. Принимает приглашение (шаги 7-10 из сценария 1)

---

## Примеры использования

### Пример 1: Отправка приглашения

```bash
curl -X POST http://localhost:3000/api/v1/events/event-uuid/speakers/invite \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "position": "Lead Developer",
    "company": "TechCorp",
    "bio": "Experienced developer with 10+ years...",
    "linkedinUrl": "https://linkedin.com/in/johndoe"
  }'
```

### Пример 2: Получение информации о приглашении

```bash
curl -X GET http://localhost:3000/api/v1/speakers/invitation/TOKEN_FROM_EMAIL
```

### Пример 3: Принятие приглашения

```bash
curl -X POST http://localhost:3000/api/v1/speakers/invitation/accept \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL"
  }'
```

### Пример 4: Отклонение приглашения

```bash
curl -X POST http://localhost:3000/api/v1/speakers/invitation/reject \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "reason": "Schedule conflict"
  }'
```

---

## Особенности реализации

### Гибридная архитектура

- **Speaker модель** — для публичного отображения информации о спикере на странице события
- **Registration с role=SPEAKER** — для связи User с событием и отображения в календаре
- **Связь Speaker ↔ User** через поле `userId` (nullable)

### Получение данных спикера

Если `Speaker.userId != null`:

- Имя берется из `User.firstName + User.lastName`
- Аватар из `User.avatarUrl`
- Био из `User.bio` (если не указано в Speaker.bio)

Если `Speaker.userId == null`:

- Все данные берутся из полей Speaker модели
- Используется для ручного добавления спикеров

### Срок действия приглашения

- Токен действителен **48 часов** с момента отправки
- После истечения срока требуется повторная отправка
- При повторной отправке генерируется новый токен

### Безопасность

- Email спикера проверяется на соответствие с User.email при принятии
- Нельзя принять приглашение чужим аккаунтом
- Токены уникальны и одноразовые
- После обработки (принятие/отклонение) токен удаляется
