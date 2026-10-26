# API Спикеров мероприятия (Speakers)

## Обзор

API для управления спикерами мероприятия - докладчиками, ведущими и экспертами.

**Base URL**: `/api/v1/events/:eventId/speakers`

**Требуется авторизация**: Да (JWT Bearer Token)

---

## Endpoints

### 1. Создать спикера

**POST** `/api/v1/events/:eventId/speakers`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

```json
{
  "firstName": "Иван",
  "lastName": "Иванов",
  "position": "Senior Developer",
  "company": "Google",
  "bio": "Краткая информация о спикере...",
  "avatarUrl": "/uploads/avatar.jpg",
  "linkedinUrl": "https://linkedin.com/in/username",
  "instagramUrl": "https://instagram.com/username",
  "facebookUrl": "https://facebook.com/username",
  "xUrl": "https://x.com/username",
  "websiteUrl": "https://example.com",
  "sortOrder": 0
}
```

#### Поля

| Поле          | Тип    | Обязательно | Описание                             |
| ------------- | ------ | ----------- | ------------------------------------ |
| `firstName`   | string | Да          | Имя спикера (макс. 200 символов)     |
| `lastName`    | string | Да          | Фамилия спикера (макс. 200 символов) |
| `position`    | string | Да          | Должность (макс. 200 символов)       |
| `company`     | string | Нет         | Компания (макс. 200 символов)        |
| `bio`         | string | Нет         | Биография (макс. 2000 символов)      |
| `avatarUrl`   | string | Нет         | URL фото спикера                     |
| `linkedinUrl`   | string | Нет         | LinkedIn профиль                     |
| `instagramUrl`  | string | Нет         | Instagram профиль                    |
| `facebookUrl`   | string | Нет         | Facebook профиль                     |
| `xUrl`          | string | Нет         | X (Twitter) профиль                  |
| `websiteUrl`    | string | Нет         | Личный сайт                          |
| `sortOrder`   | number | Нет         | Порядок отображения                  |

#### Response 201

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "firstName": "Иван",
  "lastName": "Иванов",
  "position": "Senior Developer",
  "company": "Google",
  "bio": "Краткая информация о спикере...",
  "avatarUrl": "/uploads/avatar.jpg",
  "linkedinUrl": "https://linkedin.com/in/username",
  "instagramUrl": "https://instagram.com/username",
  "facebookUrl": "https://facebook.com/username",
  "xUrl": "https://x.com/username",
  "websiteUrl": "https://example.com",
  "sortOrder": 0,
  "createdAt": "2026-01-19T12:00:00.000Z",
  "updatedAt": "2026-01-19T12:00:00.000Z"
}
```

---

### 2. Получить всех спикеров события

**GET** `/api/v1/events/:eventId/speakers`

**Права доступа**: `EVENTS_READ`

#### Response 200

```json
[
  {
    "id": "uuid",
    "eventId": "uuid",
    "firstName": "Иван",
    "lastName": "Иванов",
    "position": "Senior Developer",
    "company": "Google",
    "bio": "Краткая информация о спикере...",
    "avatarUrl": "/uploads/avatar.jpg",
    "linkedinUrl": "https://linkedin.com/in/username",
    "instagramUrl": "https://instagram.com/username",
    "facebookUrl": "https://facebook.com/username",
    "xUrl": "https://x.com/username",
    "websiteUrl": "https://example.com",
    "sortOrder": 0,
    "createdAt": "2026-01-19T12:00:00.000Z",
    "updatedAt": "2026-01-19T12:00:00.000Z"
  }
]
```

---

### 3. Получить спикера по ID

**GET** `/api/v1/events/:eventId/speakers/:id`

**Права доступа**: `EVENTS_READ`

#### Response 200

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "firstName": "Иван",
  "lastName": "Иванов",
  "position": "Senior Developer",
  "company": "Google",
  ...
}
```

---

### 4. Обновить спикера

**PATCH** `/api/v1/events/:eventId/speakers/:id`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

Все поля опциональны:

```json
{
  "firstName": "Иван",
  "lastName": "Петрович Иванов",
  "position": "Lead Developer",
  "bio": "Обновлённая биография..."
}
```

#### Response 200

```json
{
  "id": "uuid",
  "firstName": "Иван",
  "lastName": "Петрович Иванов",
  "position": "Lead Developer",
  "bio": "Обновлённая биография...",
  ...
}
```

---

### 5. Удалить спикера

**DELETE** `/api/v1/events/:eventId/speakers/:id`

**Права доступа**: `EVENTS_UPDATE`

#### Response 200

```json
{
  "message": "Спикер удалён"
}
```

---

### 6. Изменить порядок спикеров

**PATCH** `/api/v1/events/:eventId/speakers/reorder`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

```json
{
  "speakerIds": ["uuid3", "uuid1", "uuid2"]
}
```

#### Response 200

```json
[
  {
    "id": "uuid3",
    "sortOrder": 0,
    ...
  },
  {
    "id": "uuid1",
    "sortOrder": 1,
    ...
  }
]
```

---

## Ошибки

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["name should not be empty"],
  "error": "Bad Request"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Нет доступа к этому мероприятию",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Спикер не найден",
  "error": "Not Found"
}
```

---

## Примеры использования

### Создание спикера

```bash
curl -X POST http://localhost:3000/api/v1/events/{eventId}/speakers \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Анна",
    "lastName": "Смирнова",
    "position": "CTO",
    "company": "Tech Innovations",
    "bio": "15 лет опыта в разработке enterprise решений",
    "linkedinUrl": "https://linkedin.com/in/anna-smirnova"
  }'
```

### Привязка спикера к пункту программы

После создания спикера используйте его UUID в Agenda API:

```bash
curl -X POST http://localhost:3000/api/v1/events/{eventId}/agenda \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Инновации в AI",
    "type": "PRESENTATION",
    "startTime": "11:00",
    "duration": 60,
    "speakerIds": ["{speaker-uuid}"]
  }'
```

---

## Примечания

1. **Связь с Agenda**: Спикеры привязываются к пунктам программы через поле `speakerIds` в Agenda API.

2. **Сортировка**: По умолчанию спикеры сортируются по `sortOrder` ASC.

3. **Аватары**: URL аватаров должны быть загружены отдельно через upload API.

4. **Доступ**: Только организация-владелец события может управлять спикерами.

---

## Связанные API

- [Agenda API](./AGENDA_API.md) - Программа мероприятия
