# Архитектура новых модулей API мероприятий

## Общая схема модулей

```
EventsModule
├── EventsController (основной контроллер)
│   ├── EventsService
│   └── EventsRepository → Prisma (events)
│
├── CommentsController (NEW)
│   ├── CommentsService
│   │   ├── EventsService (проверка доступа)
│   │   └── CommentsRepository → Prisma (event_comments, event_comment_likes)
│   └── Routes:
│       ├── POST   /events/:eventId/comments
│       ├── GET    /events/:eventId/comments
│       ├── PATCH  /events/:eventId/comments/:id
│       ├── DELETE /events/:eventId/comments/:id
│       └── POST   /events/:eventId/comments/:id/like
│
└── AccountSavedEventsController
    ├── SavedEventsService
    │   ├── EventsService (проверка существования)
    │   └── SavedEventsRepository → Prisma (saved_events)
    └── Routes:
        ├── POST   /account/me/saved-events/:eventId
        ├── DELETE /account/me/saved-events/:eventId
        ├── GET    /account/me/saved-events
        └── GET    /account/me/saved-events/:eventId/check
```

---

## Схема базы данных

```
┌─────────────────────┐
│       events        │
│─────────────────────│
│ id (PK)             │
│ organizationId (FK) │
│ title               │
│ ...                 │
│ commentsEnabled  ←──┼── NEW FIELD
└─────────────┬───────┘
              │ 1:N
              ↓
┌─────────────────────────┐
│    event_comments       │
│─────────────────────────│
│ id (PK)                 │
│ eventId (FK) ───────────┘
│ userId (FK)  ───────────┐
│ parentId (FK, nullable) │ Self-reference для replies
│ content                 │
└─────────────┬───────────┘
              │ 1:N
              ↓
┌─────────────────────────┐
│  event_comment_likes    │
│─────────────────────────│
│ commentId (FK, PK)      │
│ userId (FK, PK)         │
│ isLike (boolean)        │
└─────────────────────────┘

┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)             │
└─────────────┬───────┘
              │ 1:N
              ↓
┌─────────────────────────┐
│     saved_events        │
│─────────────────────────│
│ id (PK)                 │
│ userId (FK) ────────────┘
│ eventId (FK) ───────────┐
│ savedAt                 │
│ UNIQUE(userId, eventId) │
└─────────────────────────┘
              │
              └──────────→ events.id (FK)
```

---

## Поток данных: Создание комментария

```
1. Client Request
   POST /events/{eventId}/comments
   Body: { content: "...", parentId?: "..." }
   Headers: Authorization: Bearer {token}
   
   ↓

2. CommentsController
   @UseGuards(JwtAuthGuard)
   - Извлекает user из JWT
   - Валидирует DTO
   
   ↓

3. CommentsService
   ├─→ EventsService.findPublicById(eventId)
   │   └─→ Проверка: мероприятие опубликовано
   │
   ├─→ Проверка: user.type === USER
   │
   ├─→ Проверка: event.commentsEnabled === true
   │
   └─→ Если parentId:
       └─→ CommentsRepository.findById(parentId)
           └─→ Проверка: существует и принадлежит тому же событию
   
   ↓

4. CommentsRepository
   prisma.eventComment.create({
     data: {
       content,
       event: { connect: { id: eventId } },
       user: { connect: { id: userId } },
       parent: { connect: { id: parentId } }
     }
   })
   
   ↓

5. Response
   201 Created
   { id, eventId, userId, content, createdAt, ... }
```

---

## Поток данных: Получение комментариев

```
1. Client Request
   GET /events/{eventId}/comments?page=1&limit=20
   Headers: Authorization: Bearer {token} (опционально)
   
   ↓

2. CommentsController
   @Public()
   - Если токен присутствует → извлекает userId
   - Валидирует query params
   
   ↓

3. CommentsService
   └─→ EventsService.findPublicById(eventId)
       └─→ Проверка: мероприятие существует
   
   ↓

4. CommentsRepository
   ├─→ prisma.eventComment.findMany({
   │     where: { eventId, parentId: null },
   │     include: {
   │       user: { select: { firstName, lastName, avatarUrl } },
   │       replies: { include: { user, _count } },
   │       _count: { likes, replies }
   │     }
   │   })
   │
   └─→ Для каждого комментария:
       ├─→ Подсчёт лайков: count({ isLike: true })
       ├─→ Подсчёт дизлайков: count({ isLike: false })
       └─→ Если userId: получить userLikeStatus
   
   ↓

5. Response
   200 OK
   {
     data: [{ comment, replies: [...], likesCount, dislikesCount, userLikeStatus }],
     total, page, limit, totalPages
   }
```

---

## Поток данных: Toggle лайк

```
1. Client Request
   POST /events/{eventId}/comments/{id}/like
   Body: { isLike: true }
   Headers: Authorization: Bearer {token}
   
   ↓

2. CommentsController
   @UseGuards(JwtAuthGuard)
   
   ↓

3. CommentsService
   ├─→ Проверка: user.type === USER
   └─→ CommentsRepository.findById(commentId)
       └─→ Проверка: комментарий существует
   
   ↓

4. CommentsRepository.toggleLike(commentId, userId, isLike)
   
   existing = findUnique({ commentId_userId })
   
   IF existing:
     IF existing.isLike === isLike:
       → DELETE (убрать реакцию)
     ELSE:
       → UPDATE (сменить реакцию)
   ELSE:
     → CREATE (добавить реакцию)
   
   ↓

5. CommentsRepository.getLikesCounts(commentId)
   ├─→ count({ isLike: true })
   └─→ count({ isLike: false })
   
   ↓

6. Response
   200 OK
   { likes: 15, dislikes: 2 }
```

---

## Поток данных: Сохранить мероприятие

```
1. Client Request
   POST /account/me/saved-events/{eventId}
   Headers: Authorization: Bearer {token}
   
   ↓

2. AccountSavedEventsController
   @UseGuards(JwtAuthGuard)
   
   ↓

3. SavedEventsService
   ├─→ Проверка: user.type === USER
   │
   ├─→ EventsService.findPublicById(eventId)
   │   └─→ Проверка: мероприятие опубликовано
   │
   └─→ SavedEventsRepository.exists(userId, eventId)
       └─→ Проверка: ещё не сохранено (иначе 409 Conflict)
   
   ↓

4. SavedEventsRepository
   prisma.savedEvent.create({
     data: {
       user: { connect: { id: userId } },
       event: { connect: { id: eventId } }
     }
   })
   
   ↓

5. Response
   201 Created
   { id, userId, eventId, savedAt }
```

---

## Безопасность

### Проверки прав доступа

```
┌────────────────────────────────────────────────────────────┐
│ Действие                    │ USER │ ORG │ MEMBER │ ADMIN │
├────────────────────────────────────────────────────────────┤
│ Создать комментарий         │  ✅  │ ❌  │   ❌   │  ❌   │
│ Читать комментарии          │  ✅  │ ✅  │   ✅   │  ✅   │
│ Редактировать свой комм.    │  ✅  │ ❌  │   ❌   │  ❌   │
│ Удалить свой комм.          │  ✅  │ ❌  │   ❌   │  ❌   │
│ Ставить лайки               │  ✅  │ ❌  │   ❌   │  ❌   │
│ Сохранять мероприятия       │  ✅  │ ❌  │   ❌   │  ❌   │
│ Управлять commentsEnabled   │  ❌  │ ✅  │   ✅*  │  ❌   │
└────────────────────────────────────────────────────────────┘
* С соответствующими permissions
```

### Валидация входных данных

```typescript
CreateCommentDto:
  - content: string, max 2000 символов, обязательное
  - parentId: UUID, опциональное

UpdateCommentDto:
  - content: string, max 2000 символов, обязательное

ToggleLikeDto:
  - isLike: boolean, обязательное

CommentQueryDto:
  - page: number, min 1
  - limit: number, min 1
```

---

## Индексы базы данных

```sql
-- event_comments
CREATE INDEX idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX idx_event_comments_parent_id ON event_comments(parent_id);
CREATE INDEX idx_event_comments_created_at ON event_comments(created_at);

-- event_comment_likes
CREATE INDEX idx_event_comment_likes_comment_id ON event_comment_likes(comment_id);
CREATE INDEX idx_event_comment_likes_user_id ON event_comment_likes(user_id);

-- saved_events
CREATE INDEX idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX idx_saved_events_saved_at ON saved_events(saved_at);

-- Уникальные ограничения
ALTER TABLE saved_events ADD CONSTRAINT unique_user_event UNIQUE(user_id, event_id);
ALTER TABLE event_comment_likes ADD CONSTRAINT pk_comment_user PRIMARY KEY(comment_id, user_id);
```

---

## Обработка ошибок

### Комментарии

| Код | Ошибка | Сценарий |
|-----|--------|----------|
| 400 | Bad Request | Комментарии отключены для мероприятия |
| 400 | Bad Request | Родительский комментарий из другого мероприятия |
| 403 | Forbidden | Пользователь не типа USER |
| 403 | Forbidden | Попытка редактировать чужой комментарий |
| 404 | Not Found | Мероприятие не найдено |
| 404 | Not Found | Родительский комментарий не найден |

### Сохранённые мероприятия

| Код | Ошибка | Сценарий |
|-----|--------|----------|
| 403 | Forbidden | Пользователь не типа USER |
| 404 | Not Found | Мероприятие не найдено или не опубликовано |
| 404 | Not Found | Мероприятие не в избранном (при удалении) |
| 409 | Conflict | Мероприятие уже сохранено |

---

## Оптимизация производительности

### 1. Пагинация

```typescript
// Комментарии: по 20 на странице
GET /events/{eventId}/comments?page=1&limit=20

// Сохранённые: по 10 на странице
GET /account/me/saved-events?page=1&limit=10
```

### 2. Использование include вместо N+1 запросов

```typescript
// ✅ Правильно: 1 запрос
prisma.eventComment.findMany({
  include: {
    user: true,
    replies: { include: { user: true } },
    _count: { select: { likes: true } }
  }
});

// ❌ Неправильно: N+1 запросов
const comments = await prisma.eventComment.findMany();
for (const comment of comments) {
  comment.user = await prisma.user.findUnique({ where: { id: comment.userId } });
  comment.replies = await prisma.eventComment.findMany({ where: { parentId: comment.id } });
}
```

### 3. Подсчёт реакций

```typescript
// Текущая реализация: подсчёт при запросе
const likesCount = await prisma.eventCommentLike.count({
  where: { commentId, isLike: true }
});

// Рекомендуемая оптимизация для популярных мероприятий:
// - Redis кэш с TTL 1 минута
// - Денормализация (добавить likesCount в event_comments)
// - Обновление через triggers или background jobs
```

---

## Масштабируемость

### Текущие ограничения

- Подсчёт лайков происходит в реальном времени (может быть медленным для популярных комментариев)
- Одноуровневая структура ответов (ответ на ответ не поддерживается)

### Рекомендации для больших нагрузок

1. **Кэширование:**
   - Redis для счётчиков лайков
   - Redis для списка комментариев популярных мероприятий

2. **Денормализация:**
   - Хранить `likesCount`, `dislikesCount` в таблице комментариев
   - Обновлять через triggers или background jobs

3. **Пагинация ответов:**
   - Если у комментария > 10 ответов → показывать первые 3 + "Показать ещё"

4. **Rate Limiting:**
   - Ограничить количество комментариев от одного пользователя (например, 1 в минуту)

---

## Мониторинг метрик

### Ключевые метрики

```
Комментарии:
- Среднее время ответа GET /comments: < 200ms
- Количество комментариев в день
- Топ мероприятий по количеству комментариев
- Соотношение лайков к дизлайкам

Сохранённые мероприятия:
- Количество сохранений в день
- Топ сохраняемых мероприятий
- Процент пользователей, использующих избранное

Ошибки:
- Количество 403 (неавторизованный доступ)
- Количество 409 (дубликаты)
```

---

## Диаграмма последовательности: Создание комментария с ответом

```
User        Controller      Service         Repository      Database
 │              │              │                │               │
 │──POST────────>│              │                │               │
 │  comment     │              │                │               │
 │              │──validate────>│                │               │
 │              │  DTO          │                │               │
 │              │              │──checkEvent────>│               │
 │              │              │                │──SELECT───────>│
 │              │              │                │<──event────────│
 │              │              │<──event─────────│               │
 │              │              │                │               │
 │              │              │──checkUser─────>│               │
 │              │              │<──valid─────────│               │
 │              │              │                │               │
 │              │              │──create────────>│               │
 │              │              │                │──INSERT───────>│
 │              │              │                │<──comment─────│
 │              │              │<──comment───────│               │
 │              │<──comment────│                │               │
 │<──201────────│              │                │               │
 │  { comment } │              │                │               │
```

---

Эта архитектура обеспечивает:
- ✅ Разделение ответственности (SOLID)
- ✅ Масштабируемость
- ✅ Безопасность
- ✅ Производительность
- ✅ Простоту тестирования
