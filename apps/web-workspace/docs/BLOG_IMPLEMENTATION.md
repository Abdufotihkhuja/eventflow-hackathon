# Модуль блога

Полноценная система управления блогом с поддержкой модерации, комментариев, лайков и сохранения статей.

## Обзор

Модуль блога предоставляет организаторам возможность создавать и публиковать статьи, а пользователям — читать, комментировать и взаимодействовать с контентом. Система включает модерацию контента, Rich Text редактор с поддержкой изображений, таблиц и других элементов форматирования.

## Архитектура

### API Layer (`src/api/services/`)

#### Типы (`blog.types.ts`)

**Статусы статей:**
- `DRAFT` — черновик
- `PENDING_REVIEW` — на модерации
- `APPROVED` — одобрено модератором
- `REJECTED` — отклонено модератором
- `PUBLISHED` — опубликовано

**Основные типы:**
- `BlogPost` — полная статья
- `BlogPostPreview` — краткая версия для списков
- `BlogComment` — комментарий к статье
- `BlogTag` — тег статьи
- `ContentBlock` — блок контента (Tiptap/BlockNote JSON)

#### Сервисы (`blogService.ts`)

**1. blogPostsService** — управление статьями (организатор)
```typescript
create(data: CreateBlogPostDto): Promise<BlogPost>
getAll(params?: GetBlogPostsParams): Promise<BlogPostsResponse>
getById(id: string): Promise<BlogPost>
update(id: string, data: UpdateBlogPostDto): Promise<BlogPost>
delete(id: string): Promise<void>
submit(id: string): Promise<BlogPost> // отправить на модерацию
publish(id: string): Promise<BlogPost> // опубликовать
unpublish(id: string): Promise<BlogPost> // снять с публикации
```

**2. publicBlogService** — публичный доступ к статьям
```typescript
getAll(params?: GetPublishedBlogPostsParams): Promise<BlogPostsResponse>
getBySlug(slug: string): Promise<BlogPost>
getById(id: string): Promise<BlogPost>
```

**3. blogCommentsService** — комментарии
```typescript
create(postId: string, data: CreateCommentDto): Promise<BlogComment>
getAll(postId: string, params?: GetCommentsParams): Promise<CommentsResponse>
update(postId: string, commentId: string, data: UpdateCommentDto): Promise<BlogComment>
delete(postId: string, commentId: string): Promise<void>
toggleLike(postId: string, commentId: string): Promise<void>
```

**4. blogLikesService** — лайки статей
```typescript
like(postId: string): Promise<void>
unlike(postId: string): Promise<void>
check(postId: string): Promise<LikeCheckResponse>
```

**5. savedBlogPostsService** — сохранённые статьи
```typescript
getAll(params?: { page?: number; limit?: number }): Promise<BlogPostsResponse>
save(postId: string): Promise<void>
unsave(postId: string): Promise<void>
check(postId: string): Promise<SaveCheckResponse>
```

### Features Layer (`src/features/blog/`)

#### API Hooks (`api/`)

**Управление статьями (организатор):**
- `useBlogPosts(params)` — список статей организации
- `useBlogPost(id)` — получение статьи по ID
- `useCreateBlogPost()` — создание статьи
- `useUpdateBlogPost()` — обновление статьи
- `useDeleteBlogPost()` — удаление статьи
- `useSubmitBlogPost()` — отправка на модерацию
- `usePublishBlogPost()` — публикация статьи
- `useUnpublishBlogPost()` — снятие с публикации

**Публичный доступ:**
- `usePublishedBlogPosts(params)` — список опубликованных статей
- `useBlogPostBySlug(slug)` — статья по slug
- `usePublicBlogPost(id)` — статья по ID

**Комментарии:**
- `useBlogComments(postId, params)` — список комментариев
- `useCreateComment()` — создание комментария
- `useUpdateComment()` — обновление комментария
- `useDeleteComment()` — удаление комментария
- `useToggleCommentLike()` — лайк/дизлайк комментария

**Лайки и сохранение:**
- `useToggleBlogLike()` — переключение лайка статьи
- `useToggleSaveBlogPost()` — сохранение/удаление из сохранённых
- `useBlogLikeCheck(postId)` — проверка лайка
- `useSavedBlogPostCheck(postId)` — проверка сохранения

#### UI Components (`ui/`)

**BlogPostCard** — карточка статьи для списков
- Обложка, заголовок, краткое описание
- Теги, автор, дата
- Счётчики просмотров, лайков, комментариев
- Действия: лайк, сохранение

**BlogPostsList** — список статей с пагинацией
- Сетка карточек (responsive)
- Пагинация
- Skeleton загрузки
- Empty state

**BlogCommentItem** — элемент комментария
- Аватар, имя автора, дата
- Редактирование/удаление (для автора)
- Лайки комментариев

**BlogCommentsSection** — секция комментариев
- Форма добавления комментария
- Список комментариев
- Лайки, редактирование, удаление

### Pages Layer (`src/pages/`)

#### Страницы управления (`my-blog/`)

**MyBlogPage** (`/my-blog`)
- Список статей организации
- Фильтры: поиск, статус, сортировка
- Отображение статусов статей
- Переход к созданию/редактированию

**BlogEditorPage** (`/my-blog/new`, `/my-blog/:id/edit`)
- Rich Text редактор (BlockNote)
- Поля: заголовок, обложка, описание, теги
- Настройки: комментарии вкл/выкл
- Действия: сохранить, сохранить и отправить на модерацию
- Отображение причины отклонения (если статус REJECTED)

**MyBlogPostPage** (`/my-blog/:id`)
- Просмотр статьи с полными данными
- Статус и статистика
- Действия: редактировать, удалить, отправить на модерацию, опубликовать, снять с публикации
- Отображение причины отклонения

#### Публичные страницы (`blog/`)

**BlogListPage** (`/blog`)
- Список опубликованных статей
- Фильтры: поиск, сортировка
- Лайки и сохранение (для авторизованных)

**BlogPostPage** (`/blog/:slug`)
- Полный просмотр статьи
- Обложка, содержание, теги
- Действия: лайк, сохранение, поделиться
- Секция комментариев (если включены)
- Счётчики просмотров, лайков

**SavedBlogPage** (`/saved-blog`)
- Список сохранённых статей пользователя
- Те же возможности, что и в BlogListPage

### Shared UI Components (`src/shared/ui/`)

**BlogStatusBadge** — badge для статусов статей
- Цветовая индикация статуса
- Dark mode поддержка

**RichTextEditor** — редактор контента
- Используется существующий компонент на базе BlockNote
- Поддержка изображений, таблиц, форматирования
- Read-only режим для просмотра

## Роутинг

### Публичные маршруты
```
/blog                  → BlogListPage (список статей)
/blog/:slug            → BlogPostPage (просмотр статьи)
```

### Защищённые маршруты (авторизованные пользователи)
```
/saved-blog            → SavedBlogPage (сохранённые статьи)
```

### Защищённые маршруты (организаторы)
```
/my-blog               → MyBlogPage (управление блогом)
/my-blog/new           → BlogEditorPage (создание статьи)
/my-blog/:id           → MyBlogPostPage (просмотр статьи в админке)
/my-blog/:id/edit      → BlogEditorPage (редактирование статьи)
```

## Workflow статей

### 1. Создание статьи
```
DRAFT → Организатор создаёт статью → Сохранение как черновик
```

### 2. Отправка на модерацию
```
DRAFT → Отправить на модерацию → PENDING_REVIEW
```

### 3. Модерация (Super Admin)
```
PENDING_REVIEW → Одобрить → APPROVED
PENDING_REVIEW → Отклонить → REJECTED (с причиной)
```

### 4. Публикация
```
APPROVED → Опубликовать → PUBLISHED
```

### 5. Снятие с публикации
```
PUBLISHED → Снять с публикации → APPROVED
```

### 6. Редактирование после отклонения
```
REJECTED → Редактировать → DRAFT → (повтор процесса)
```

## Особенности реализации

### 1. Content Format
Контент статей хранится в формате BlockNote JSON (массив блоков).
Пример структуры:
```json
[
  {
    "id": "block-1",
    "type": "paragraph",
    "content": [
      {
        "type": "text",
        "text": "Текст параграфа"
      }
    ]
  },
  {
    "type": "heading",
    "attrs": { "level": 2 },
    "content": [{ "type": "text", "text": "Заголовок" }]
  }
]
```

### 2. Оптимистичные обновления
Хуки TanStack Query настроены на автоматическую инвалидацию кэша:
- После лайка — обновляются счётчики статьи
- После комментария — обновляется список комментариев и счётчик
- После сохранения — обновляется список сохранённых

### 3. Query Keys
Стандартизированные ключи для кэширования:
```typescript
blogPostsKeys.all                  // ['blog-posts']
blogPostsKeys.list(params)         // ['blog-posts', 'list', params]
blogPostsKeys.detail(id)           // ['blog-posts', 'detail', id]

publicBlogKeys.list(params)        // ['public-blog', 'list', params]
publicBlogKeys.bySlug(slug)        // ['public-blog', 'slug', slug]

blogCommentsKeys.list(postId)      // ['blog-comments', 'list', postId]
```

### 4. Авторизация
- Публичные страницы доступны всем
- Лайки/комментарии/сохранение требуют авторизации
- Управление статьями доступно только организаторам

### 5. UX фишки
- **Skeleton loading** — плавная загрузка контента
- **Optimistic UI** — мгновенная реакция на лайки
- **Empty states** — информативные пустые состояния
- **Error handling** — toast-уведомления об ошибках
- **Responsive design** — адаптив для всех устройств
- **Dark mode** — полная поддержка тёмной темы
- **Share functionality** — нативный Share API + clipboard fallback

### 6. Доступность (A11y)
- Семантическая HTML-разметка
- Keyboard navigation
- ARIA-атрибуты для интерактивных элементов
- Фокус-индикаторы

## Использование

### Создание статьи

```typescript
import { useCreateBlogPost } from '@features/blog/api';

function CreatePostButton() {
  const createMutation = useCreateBlogPost();

  const handleCreate = () => {
    createMutation.mutate({
      title: 'Заголовок статьи',
      content: [/* BlockNote JSON */],
      shortDescription: 'Краткое описание',
      coverImage: 'https://example.com/cover.jpg',
      commentsEnabled: true,
      tagIds: ['tag-uuid-1', 'tag-uuid-2'],
    });
  };

  return (
    <button onClick={handleCreate} disabled={createMutation.isPending}>
      Создать статью
    </button>
  );
}
```

### Отображение списка статей

```typescript
import { usePublishedBlogPosts } from '@features/blog/api';
import { BlogPostsList } from '@features/blog/ui';

function BlogList() {
  const { data, isLoading } = usePublishedBlogPosts({
    page: 1,
    limit: 12,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });

  return (
    <BlogPostsList
      data={data}
      isLoading={isLoading}
      getPostHref={(post) => `/blog/${post.slug}`}
      onLike={handleLike}
      onSave={handleSave}
      onPageChange={setPage}
    />
  );
}
```

### Работа с комментариями

```typescript
import {
  useBlogComments,
  useCreateComment,
  useToggleCommentLike,
} from '@features/blog/api';
import { BlogCommentsSection } from '@features/blog/ui';

function PostComments({ postId }: { postId: string }) {
  const { data: commentsData, isLoading } = useBlogComments(postId);
  const createMutation = useCreateComment();
  const likeMutation = useToggleCommentLike();

  const handleSubmit = async (content: string) => {
    await createMutation.mutateAsync({
      postId,
      data: { content },
    });
  };

  const handleLike = (commentId: string) => {
    likeMutation.mutate({ postId, commentId });
  };

  return (
    <BlogCommentsSection
      comments={commentsData?.data || []}
      isLoading={isLoading}
      currentUserId={user?.id}
      onSubmit={handleSubmit}
      onLike={handleLike}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
```

## Будущие улучшения

1. **Rich Content**
   - Встроенные видео
   - Галереи изображений
   - Код-блоки с подсветкой синтаксиса

2. **SEO**
   - Meta-теги для статей
   - Sitemap для блога
   - Schema.org разметка

3. **Social Features**
   - Репост статей
   - Подписка на авторов
   - Уведомления о новых статьях

4. **Analytics**
   - Детальная статистика просмотров
   - Время чтения
   - География читателей

5. **Content Management**
   - Черновики с автосохранением
   - Версионирование статей
   - Планирование публикации

## Зависимости

- `@tanstack/react-query` — state management и кэширование
- `react-router-dom` — роутинг
- `react-hook-form` — формы
- `date-fns` — работа с датами
- `lucide-react` — иконки
- `sonner` — toast-уведомления
- `@blocknote/react` — Rich Text редактор

## Совместимость с API

Модуль полностью совместим с Swagger API:
- `POST /api/v1/blog-posts` — создание статьи
- `GET /api/v1/blog-posts` — список статей организации
- `GET /api/v1/blog` — список опубликованных статей
- `GET /api/v1/blog/:slug` — статья по slug
- `POST /api/v1/blog/:postId/comments` — создание комментария
- И другие эндпоинты согласно спецификации

---

**Автор:** EventFlow Team
**Дата создания:** 26 января 2026  
**Версия:** 1.0.0
