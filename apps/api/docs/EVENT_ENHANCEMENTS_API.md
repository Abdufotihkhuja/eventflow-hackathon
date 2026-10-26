# API расширенных возможностей для мероприятий

Документация новых возможностей API для работы с мероприятиями: комментарии, сохранённые события, теги и фильтрация.

## Содержание

- [Обзор изменений](#обзор-изменений)
- [Система тегов](#система-тегов)
- [Комментарии к мероприятиям](#комментарии-к-мероприятиям)
- [Сохранённые мероприятия](#сохранённые-мероприятия)
- [Фильтрация по организатору](#фильтрация-по-организатору)
- [Управление комментариями организатором](#управление-комментариями-организатором)

---

## Обзор изменений

### Новые возможности

1. **Система тегов**
   - Предустановленные теги (Форматы, Аудитория, Темы)
   - Кастомные теги организаций
   - Максимум 3 тега на мероприятие
   - Фильтрация по тегам в каталоге

2. **Система комментариев**
   - Комментарии к мероприятиям с поддержкой ответов (replies)
   - Лайки и дизлайки для комментариев
   - Управление включением/выключением комментариев организатором

3. **Сохранённые мероприятия**
   - Пользователи могут добавлять мероприятия в избранное
   - Просмотр списка сохранённых мероприятий

4. **Фильтрация**
   - Фильтр по ID организатора для получения всех его мероприятий
   - Фильтр по тегам (slugs через запятую)

### Новые таблицы в БД

- `event_tags` — теги мероприятий (системные + кастомные)
- `event_tag_assignments` — связь мероприятие-теги (many-to-many)
- `event_comments` — комментарии к мероприятиям
- `event_comment_likes` — лайки/дизлайки комментариев
- `saved_events` — сохранённые мероприятия пользователей

### Новые enum в БД

- `TagCategory` — категории тегов (FORMAT, AUDIENCE, TOPIC, CUSTOM)

### Изменения в существующих таблицах

- `events` — добавлено поле `commentsEnabled` (boolean, по умолчанию true)

---

## Система тегов

### Обзор

Гибридная система тегов для категоризации мероприятий:
- **14 предустановленных тегов** по 3 категориям
- **Кастомные теги** организаций
- **Максимум 3 тега** на мероприятие
- **Фильтрация** в каталоге по slug

### Предустановленные теги

#### FORMAT (Форматы мероприятий)
- Конференция (`conference`)
- Воркшоп (`workshop`)
- Вебинар (`webinar`)
- Нетворкинг (`networking`)
- Хакатон (`hackathon`)

#### AUDIENCE (Целевая аудитория)
- Для начинающих (`for-beginners`)
- Для профессионалов (`for-professionals`)
- Для студентов (`for-students`)
- Для бизнеса (`for-business`)

#### TOPIC (Темы)
- Технологии (`technologies`)
- Дизайн (`design`)
- Менеджмент (`management`)
- Продажи (`sales`)
- Стартапы (`startups`)

### Эндпоинты

#### Получить все доступные теги

```http
GET /api/v1/events/tags?category=FORMAT
```

**Доступ:** Публичный (опционально с авторизацией)

**Ответ 200:**
```json
[
  {
    "id": "uuid",
    "name": "Конференция",
    "slug": "conference",
    "category": "FORMAT",
    "isSystem": true,
    "organizationId": null,
    "_count": { "events": 42 }
  }
]
```

#### Назначить теги мероприятию

```http
PUT /api/v1/events/:id/tags
Authorization: Bearer {token}

{
  "tagIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Доступ:** ORGANIZATION, MEMBER (с правами)

**Валидация:** Максимум 3 тега

#### Создать кастомный тег

```http
POST /api/v1/organizations/tags
Authorization: Bearer {token}

{
  "name": "Искусственный интеллект"
}
```

**Автоматическая генерация slug:** `iskusstvennyi-intellekt`

#### Фильтрация по тегам

```http
GET /api/v1/public/events?tags=conference,for-professionals
```

**Работает по принципу OR** — возвращает мероприятия с любым из указанных тегов.

### Подробная документация

Полная документация: [`docs/EVENT_TAGS_API.md`](EVENT_TAGS_API.md)

---

## Комментарии к мероприятиям

### Модель данных

```typescript
{
  id: string;
  eventId: string;
  userId: string;
  parentId?: string; // Для ответов на комментарии
  content: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Связанные данные
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  replies: Comment[]; // Ответы на комментарий
  likesCount: number;
  dislikesCount: number;
  userLikeStatus: boolean | null; // true = лайк, false = дизлайк, null = нет реакции
}
```

### Эндпоинты

#### 1. Создать комментарий

```http
POST /api/v1/events/:eventId/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Отличное мероприятие! Спасибо организаторам!",
  "parentId": "123e4567-e89b-12d3-a456-426614174000" // Опционально, для ответа
}
```

**Доступ:** USER

**Ответ 201:**
```json
{
  "id": "456e7890-f12g-34h5-i678-901234567890",
  "eventId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-id",
  "parentId": null,
  "content": "Отличное мероприятие! Спасибо организаторам!",
  "createdAt": "2025-01-25T10:00:00Z",
  "updatedAt": "2025-01-25T10:00:00Z"
}
```

**Ошибки:**
- `400 Bad Request` — комментарии отключены для мероприятия
- `403 Forbidden` — только пользователи могут оставлять комментарии
- `404 Not Found` — мероприятие не найдено или родительский комментарий не существует

---

#### 2. Получить комментарии к мероприятию

```http
GET /api/v1/events/:eventId/comments?page=1&limit=20
```

**Доступ:** публичный (Bearer token опционален для получения userLikeStatus)

**Параметры:**
- `page` (number, default: 1) — номер страницы
- `limit` (number, default: 20) — количество комментариев на странице

**Ответ 200:**
```json
{
  "data": [
    {
      "id": "comment-id",
      "eventId": "event-id",
      "userId": "user-id",
      "content": "Отличное мероприятие!",
      "createdAt": "2025-01-25T10:00:00Z",
      "updatedAt": "2025-01-25T10:00:00Z",
      "user": {
        "id": "user-id",
        "firstName": "Иван",
        "lastName": "Иванов",
        "avatarUrl": "/uploads/avatar.jpg"
      },
      "likesCount": 15,
      "dislikesCount": 2,
      "userLikeStatus": true,
      "replies": [
        {
          "id": "reply-id",
          "parentId": "comment-id",
          "content": "Согласен!",
          "user": { ... },
          "likesCount": 5,
          "dislikesCount": 0,
          "userLikeStatus": null
        }
      ]
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

#### 3. Обновить комментарий

```http
PATCH /api/v1/events/:eventId/comments/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Обновлённый текст комментария"
}
```

**Доступ:** USER (только автор комментария)

**Ответ 200:**
```json
{
  "id": "comment-id",
  "content": "Обновлённый текст комментария",
  "updatedAt": "2025-01-25T11:00:00Z"
}
```

**Ошибки:**
- `403 Forbidden` — вы можете редактировать только свои комментарии
- `404 Not Found` — комментарий не найден

---

#### 4. Удалить комментарий

```http
DELETE /api/v1/events/:eventId/comments/:id
Authorization: Bearer {token}
```

**Доступ:** USER (только автор комментария)

**Ответ 200:**
```json
{
  "message": "Комментарий удалён"
}
```

**Примечание:** При удалении комментария также удаляются все его ответы (cascade delete).

---

#### 5. Поставить лайк/дизлайк

```http
POST /api/v1/events/:eventId/comments/:id/like
Authorization: Bearer {token}
Content-Type: application/json

{
  "isLike": true  // true = лайк, false = дизлайк
}
```

**Доступ:** USER

**Логика:**
- Если реакция уже поставлена и совпадает — удаляется (toggle)
- Если реакция уже поставлена, но отличается — меняется на новую
- Если реакции нет — создаётся новая

**Ответ 200:**
```json
{
  "likes": 16,
  "dislikes": 2
}
```

---

## Сохранённые мероприятия

### Эндпоинты

#### 1. Сохранить мероприятие

```http
POST /api/v1/account/me/saved-events/:eventId
Authorization: Bearer {token}
```

**Доступ:** USER

**Ответ 201:**
```json
{
  "id": "saved-event-id",
  "userId": "user-id",
  "eventId": "event-id",
  "savedAt": "2025-01-25T10:00:00Z"
}
```

**Ошибки:**
- `403 Forbidden` — только пользователи могут сохранять мероприятия
- `404 Not Found` — мероприятие не найдено или не опубликовано
- `409 Conflict` — мероприятие уже в избранном

---

#### 2. Удалить из сохранённых

```http
DELETE /api/v1/account/me/saved-events/:eventId
Authorization: Bearer {token}
```

**Доступ:** USER

**Ответ 200:**
```json
{
  "message": "Мероприятие удалено из избранного"
}
```

**Ошибки:**
- `404 Not Found` — мероприятие не найдено в избранном

---

#### 3. Получить сохранённые мероприятия

```http
GET /api/v1/account/me/saved-events?page=1&limit=10
Authorization: Bearer {token}
```

**Доступ:** USER

**Параметры:**
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Ответ 200:**
```json
{
  "data": [
    {
      "id": "saved-event-id",
      "userId": "user-id",
      "eventId": "event-id",
      "savedAt": "2025-01-25T10:00:00Z",
      "event": {
        "id": "event-id",
        "title": "Tech Conference 2025",
        "startDate": "2025-06-15T10:00:00Z",
        "coverImage": "/uploads/cover.jpg",
        "organization": {
          "id": "org-id",
          "companyName": "Tech Corp",
          "logoUrl": "/uploads/logo.jpg"
        },
        "_count": {
          "registrations": 150
        }
      }
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

#### 4. Проверить, сохранено ли мероприятие

```http
GET /api/v1/account/me/saved-events/:eventId/check
Authorization: Bearer {token}
```

**Доступ:** USER

**Ответ 200:**
```json
{
  "isSaved": true
}
```

---

## Фильтрация по организатору

### Получить мероприятия конкретного организатора

```http
GET /api/v1/public/events?organizationId={id}&page=1&limit=10
```

**Доступ:** публичный

**Параметры:**
- `organizationId` (UUID) — ID организатора
- Все остальные параметры фильтрации (city, type, format и т.д.) также доступны

**Ответ 200:**
```json
{
  "data": [
    {
      "id": "event-id",
      "title": "Tech Conference 2025",
      "organizationId": "org-id",
      "organization": {
        "id": "org-id",
        "companyName": "Tech Corp",
        "logoUrl": "/uploads/logo.jpg"
      },
      ...
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

**Пример использования:**
- Страница профиля организатора с его мероприятиями
- Фильтр "Только мероприятия от этого организатора"

---

## Управление комментариями организатором

### Включить/выключить комментарии для мероприятия

При создании или обновлении мероприятия используйте поле `commentsEnabled`:

```http
PATCH /api/v1/events/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "commentsEnabled": false
}
```

**Доступ:** ORGANIZATION, MEMBER (с правами на редактирование)

**Ответ 200:**
```json
{
  "id": "event-id",
  "title": "Tech Conference 2025",
  "commentsEnabled": false,
  ...
}
```

**Примечание:**
- По умолчанию комментарии включены (`commentsEnabled: true`)
- При отключении комментариев существующие комментарии НЕ удаляются
- Пользователи не смогут добавлять новые комментарии, но смогут просматривать существующие

---

## Примеры использования

### Frontend: Отображение комментариев с ответами

```typescript
// 1. Получить комментарии
const response = await fetch(`/api/v1/events/${eventId}/comments?page=1&limit=20`, {
  headers: {
    'Authorization': `Bearer ${token}` // Опционально
  }
});
const { data: comments } = await response.json();

// 2. Отобразить комментарии с ответами
comments.forEach(comment => {
  console.log(`${comment.user.firstName}: ${comment.content}`);
  console.log(`👍 ${comment.likesCount} 👎 ${comment.dislikesCount}`);
  
  comment.replies.forEach(reply => {
    console.log(`  └─ ${reply.user.firstName}: ${reply.content}`);
  });
});
```

### Frontend: Кнопка "Сохранить"

```typescript
// 1. Проверить, сохранено ли мероприятие
const checkResponse = await fetch(`/api/v1/account/me/saved-events/${eventId}/check`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { isSaved } = await checkResponse.json();

// 2. Сохранить/удалить из сохранённых
const method = isSaved ? 'DELETE' : 'POST';
await fetch(`/api/v1/account/me/saved-events/${eventId}`, {
  method,
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Frontend: Фильтр по организатору

```typescript
// На странице организатора показать только его мероприятия
const response = await fetch(
  `/api/v1/public/events?organizationId=${organizerId}&page=1&limit=10`
);
const { data: events } = await response.json();
```

---

## Миграция базы данных

Для применения изменений в базе данных выполните:

```bash
npx prisma migrate dev --name add_event_comments_and_saved_events
```

Или, если база недоступна, примените миграцию в продакшене:

```bash
npx prisma migrate deploy
```

---

## Права доступа

| Действие | USER | ORGANIZATION | MEMBER | SUPER_ADMIN |
|----------|------|--------------|--------|-------------|
| Создать комментарий | ✅ | ❌ | ❌ | ❌ |
| Читать комментарии | ✅ (публично) | ✅ (публично) | ✅ (публично) | ✅ (публично) |
| Редактировать свой комментарий | ✅ | ❌ | ❌ | ❌ |
| Удалить свой комментарий | ✅ | ❌ | ❌ | ❌ |
| Ставить лайки | ✅ | ❌ | ❌ | ❌ |
| Сохранять мероприятия | ✅ | ❌ | ❌ | ❌ |
| Управлять настройкой комментариев | ❌ | ✅ | ✅ (с правами) | ❌ |

---

## Особенности реализации

### Комментарии

1. **Древовидная структура:**
   - Только один уровень вложенности (комментарий → ответы)
   - Ответ на ответ не поддерживается

2. **Удаление:**
   - Cascade delete: при удалении комментария удаляются все ответы
   - При удалении пользователя его комментарии также удаляются

3. **Оптимизация:**
   - Подсчёт лайков/дизлайков происходит при запросе (не хранится в БД)
   - Рекомендуется добавить Redis кэширование для популярных мероприятий

### Сохранённые мероприятия

1. **Уникальность:**
   - Constraint `@@unique([userId, eventId])` предотвращает дубликаты

2. **Сортировка:**
   - По дате сохранения (savedAt) в обратном порядке

3. **Cascade delete:**
   - При удалении пользователя удаляются его сохранённые мероприятия
   - При удалении мероприятия удаляются все записи о сохранении

---

## Roadmap (возможные улучшения)

- [ ] Модерация комментариев организатором
- [ ] Уведомления о новых комментариях
- [ ] Прикрепление изображений к комментариям
- [ ] Упоминания пользователей (@username)
- [ ] Отчёты о неприемлемом контенте
- [ ] Пагинация ответов на комментарии
- [ ] Экспорт списка сохранённых мероприятий
