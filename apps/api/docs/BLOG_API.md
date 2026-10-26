# Blog API Documentation

## Обзор

API для управления статьями блога организаторов с системой модерации супер-админом.

## Workflow статей

```
DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED
                      ↘ REJECTED → DRAFT
```

1. **DRAFT** — черновик (можно редактировать)
2. **PENDING_REVIEW** — на модерации (нельзя редактировать)
3. **APPROVED** — одобрена (можно опубликовать)
4. **REJECTED** — отклонена (вернуть в DRAFT для редактирования)
5. **PUBLISHED** — опубликована (видна пользователям)

## Endpoints

### Организатор (ORGANIZATION, MEMBER)

#### Создать статью

```
POST /api/v1/blog-posts
```

**Headers:**

- `Authorization: Bearer <token>`

**Body:**

```json
{
  "title": "Как организовать успешную конференцию",
  "content": [
    {
      "id": "block-1",
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Контент статьи..." }]
    }
  ],
  "shortDescription": "Практические советы по организации IT-конференций",
  "coverImage": "https://example.com/images/cover.jpg",
  "commentsEnabled": true,
  "tagIds": ["uuid-1", "uuid-2"]
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "title": "Как организовать успешную конференцию",
  "slug": "kak-organizovat-uspeshnuyu-konferentsiyu",
  "status": "DRAFT",
  "readingTime": 5,
  ...
}
```

#### Получить список статей организации

```
GET /api/v1/blog-posts?page=1&limit=10&status=DRAFT&search=конференция
```

**Query Parameters:**

- `page` — номер страницы (default: 1)
- `limit` — количество на странице (default: 10, max: 50)
- `status` — фильтр по статусу (DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED)
- `search` — поиск по заголовку
- `tagId` — фильтр по тегу
- `sortBy` — сортировка (createdAt, publishedAt, likesCount, viewsCount)
- `sortOrder` — порядок (asc, desc)

#### Получить статью по ID

```
GET /api/v1/blog-posts/:id
```

#### Обновить статью

```
PATCH /api/v1/blog-posts/:id
```

**Ограничения:**

- Нельзя редактировать статьи в статусе `PENDING_REVIEW`
- При редактировании `PUBLISHED` статьи она возвращается в `DRAFT`

#### Удалить статью

```
DELETE /api/v1/blog-posts/:id
```

#### Отправить на модерацию

```
POST /api/v1/blog-posts/:id/submit
```

**Требования:**

- Статья должна быть в статусе `DRAFT`

#### Опубликовать статью

```
POST /api/v1/blog-posts/:id/publish
```

**Требования:**

- Статья должна быть в статусе `APPROVED`

#### Снять с публикации

```
POST /api/v1/blog-posts/:id/unpublish
```

---

### Супер-админ

#### Получить статьи на модерации

```
GET /api/v1/super-admin/blog-posts/pending?page=1&limit=20
```

#### Получить статью для модерации

```
GET /api/v1/super-admin/blog-posts/:postId
```

#### Одобрить статью

```
POST /api/v1/super-admin/blog-posts/:postId/approve
```

**Действия:**

- Меняет статус на `APPROVED`
- Отправляет email уведомление организатору

#### Отклонить статью

```
POST /api/v1/super-admin/blog-posts/:postId/reject
```

**Body:**

```json
{
  "reason": "Статья содержит рекламный контент"
}
```

**Действия:**

- Меняет статус на `REJECTED`
- Сохраняет причину отклонения
- Отправляет email уведомление организатору

---

### Публичный API

#### Получить список опубликованных статей

```
GET /api/v1/blog?page=1&limit=10&tagId=uuid&organizationId=uuid
```

#### Получить статью по slug

```
GET /api/v1/blog/by-slug/:slug
```

#### Получить статью по ID

```
GET /api/v1/blog/:id
```

---

### Лайки (только для USER)

#### Поставить лайк

```
POST /api/v1/blog/:postId/like
```

**Response:**

```json
{
  "success": true,
  "likesCount": 42
}
```

#### Убрать лайк

```
DELETE /api/v1/blog/:postId/like
```

#### Проверить статус лайка

```
GET /api/v1/blog/:postId/like/check
```

**Response:**

```json
{
  "liked": true
}
```

---

### Комментарии (только для USER)

#### Создать комментарий

```
POST /api/v1/blog/:postId/comments
```

**Body:**

```json
{
  "content": "Отличная статья!",
  "parentId": "uuid-of-parent-comment" // опционально, для ответов
}
```

**Ограничения:**

- Максимум 1 уровень вложенности (нельзя отвечать на ответы)
- Комментарии должны быть включены (`commentsEnabled: true`)

#### Получить комментарии

```
GET /api/v1/blog/:postId/comments?page=1&limit=20
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "content": "Отличная статья!",
      "user": {
        "id": "uuid",
        "firstName": "Иван",
        "lastName": "Иванов",
        "avatarUrl": "..."
      },
      "likesCount": 5,
      "dislikesCount": 1,
      "userLike": true, // null если не лайкал
      "replies": [
        {
          "id": "uuid",
          "content": "Согласен!",
          ...
        }
      ],
      "createdAt": "2026-01-25T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

#### Редактировать комментарий

```
PATCH /api/v1/blog/:postId/comments/:commentId
```

**Body:**

```json
{
  "content": "Обновлённый комментарий"
}
```

#### Удалить комментарий

```
DELETE /api/v1/blog/:postId/comments/:commentId
```

#### Лайк/дизлайк комментария

```
POST /api/v1/blog/:postId/comments/:commentId/like
```

**Body:**

```json
{
  "isLike": true // true = лайк, false = дизлайк
}
```

**Поведение:**

- Повторный клик с тем же значением убирает реакцию
- Клик с другим значением меняет реакцию

---

### Сохранённые статьи (только для USER)

#### Сохранить статью

```
POST /api/v1/account/me/saved-blog-posts/:postId
```

#### Удалить из сохранённых

```
DELETE /api/v1/account/me/saved-blog-posts/:postId
```

#### Получить сохранённые статьи

```
GET /api/v1/account/me/saved-blog-posts?page=1&limit=10
```

#### Проверить статус сохранения

```
GET /api/v1/account/me/saved-blog-posts/:postId/check
```

**Response:**

```json
{
  "saved": true
}
```

---

## Модель данных

### BlogPost

| Поле             | Тип      | Описание                                             |
| ---------------- | -------- | ---------------------------------------------------- |
| id               | UUID     | ID статьи                                            |
| organizationId   | UUID     | ID организации                                       |
| title            | string   | Заголовок (max 200)                                  |
| slug             | string   | URL-friendly slug (уникальный)                       |
| content          | JSON     | BlockNote документ                                   |
| shortDescription | string   | Краткое описание (max 500)                           |
| coverImage       | string   | URL обложки                                          |
| status           | enum     | DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED |
| commentsEnabled  | boolean  | Разрешены ли комментарии                             |
| readingTime      | int      | Время чтения (минуты, авто)                          |
| rejectionMessage | string   | Причина отклонения                                   |
| reviewedAt       | datetime | Когда рассмотрена модератором                        |
| publishedAt      | datetime | Когда опубликована                                   |
| likesCount       | int      | Количество лайков                                    |
| commentsCount    | int      | Количество комментариев                              |
| viewsCount       | int      | Количество просмотров                                |

---

## BlockNote Integration

Контент статей хранится в формате BlockNote JSON:

```json
[
  {
    "id": "unique-block-id",
    "type": "paragraph",
    "props": {},
    "content": [
      {
        "type": "text",
        "text": "Hello, World!",
        "styles": {
          "bold": true
        }
      }
    ],
    "children": []
  }
]
```

**Поддерживаемые типы блоков:**

- paragraph
- heading (level 1-6)
- bulletListItem
- numberedListItem
- checkListItem
- quote
- codeBlock

**Валидация:**

- Максимальный размер документа: 500KB
- Максимальное количество блоков: 1000
- Максимальная глубина вложенности: 10

---

## Права доступа (Permissions)

| Код          | Описание                    |
| ------------ | --------------------------- |
| blog:create  | Создание статей             |
| blog:read    | Просмотр статей организации |
| blog:update  | Редактирование статей       |
| blog:delete  | Удаление статей             |
| blog:publish | Публикация статей           |
| blog:submit  | Отправка на модерацию       |

---

## Email уведомления

### Статья одобрена

Отправляется организатору когда супер-админ одобряет статью.

**Шаблон:** `blog-post-approved.hbs`

### Статья отклонена

Отправляется организатору когда супер-админ отклоняет статью.

**Шаблон:** `blog-post-rejected.hbs`

Содержит:

- Заголовок статьи
- Причину отклонения
- Ссылку на редактирование

---

## Ошибки

| Код | Сообщение                                    |
| --- | -------------------------------------------- |
| 400 | Невалидная структура BlockNote документа     |
| 400 | Контент статьи не может быть пустым          |
| 400 | Можно отправить на модерацию только черновик |
| 400 | Можно опубликовать только одобренную статью  |
| 400 | Нельзя редактировать статью на модерации     |
| 403 | Только организаторы могут управлять статьями |
| 403 | Комментарии к этой статье отключены          |
| 404 | Статья не найдена                            |
| 409 | Статья уже лайкнута / Статья уже сохранена   |
