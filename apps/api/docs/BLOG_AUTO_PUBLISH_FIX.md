# Исправление: Автоматическая публикация одобренных статей

## Проблема

Одобренные супер-админом статьи (статус `APPROVED`) не отображались в публичном API, потому что публичный эндпоинт возвращал только статьи со статусом `PUBLISHED`.

Требовался дополнительный ручной шаг от организации - вызвать `POST /blog-posts/:id/publish` для публикации одобренной статьи.

## Решение

### 1. Изменения в коде

Методы одобрения статей теперь автоматически публикуют статью:

- **BlogService.approve()** - устанавливает статус `PUBLISHED` с `publishedAt`
- **SuperAdminService.approveBlogPost()** - устанавливает статус `PUBLISHED` с `publishedAt`

**Workflow:**
- **Было:** `PENDING_REVIEW` → одобрение → `APPROVED` → публикация вручную → `PUBLISHED`
- **Стало:** `PENDING_REVIEW` → одобрение → **`PUBLISHED`** (сразу)

### 2. Миграция базы данных

Для обновления существующих одобренных статей выполните SQL-миграцию:

```bash
# Если база в Docker
docker exec -i eventflow-postgres psql -U eventflow -d eventflow_db < prisma/migrations/20260128_auto_publish_approved_blogs.sql

# Если база локально
psql -h localhost -U eventflow -d eventflow_db -f prisma/migrations/20260128_auto_publish_approved_blogs.sql

# Или через Prisma CLI (если настроен доступ)
npx prisma db execute --file prisma/migrations/20260128_auto_publish_approved_blogs.sql
```

### 3. Содержимое миграции

```sql
UPDATE "BlogPost"
SET 
  status = 'PUBLISHED',
  "published_at" = COALESCE("reviewed_at", NOW())
WHERE status = 'APPROVED';
```

## Результат

✅ Одобренные статьи автоматически становятся опубликованными  
✅ Публичный API (`GET /api/v1/blog`) сразу возвращает одобренные статьи  
✅ Упрощён workflow для организаций

## Обратная совместимость

Метод `POST /blog-posts/:id/publish` сохранён для случаев, если в базе остались статьи со статусом `APPROVED` (после применения миграции таких быть не должно).

## Проверка

После применения миграции проверьте:

```bash
curl https://eventflow.uz/api/v1/blog?page=1&limit=9
```

Должны вернуться опубликованные статьи.
