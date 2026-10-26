# Обновление модуля "Мой блог"

**Дата:** 26 января 2026  
**Версия:** 2.0.0

## Обзор изменений

Модуль "Мой блог" был значительно доработан с добавлением новых функций для организаторов и супер админов.

## Основные изменения

### 1. Загрузка обложки статьи

#### Что изменилось
- ✅ Заменено текстовое поле URL на компонент загрузки файла
- ✅ Добавлен drag-and-drop для загрузки изображений
- ✅ Автоматическая оптимизация изображений (1200x800px, 85% качество)
- ✅ Валидация типов файлов (PNG, JPG, WebP)
- ✅ Ограничение размера файла (до 5MB)
- ✅ Превью загруженного изображения

#### Компоненты
**`ImageUpload`** (`src/shared/ui/image-upload.tsx`)
- Универсальный компонент для загрузки изображений
- Drag-and-drop интерфейс
- Валидация и обработка ошибок
- Настраиваемые параметры оптимизации

#### Использование
```tsx
<ImageUpload
  value={coverImage}
  onChange={(url) => setCoverImage(url)}
  maxWidth={1200}
  maxHeight={800}
  quality={85}
  maxSizeMB={5}
/>
```

---

### 2. Выбор тегов для статьи

#### Что изменилось
- ✅ Добавлен мультиселект для выбора тегов
- ✅ Поиск по тегам
- ✅ Отображение выбранных тегов в виде badges
- ✅ Интеграция с API тегов организации

#### API
**Сервис тегов** (`src/api/services/tagsService.ts`)
```typescript
// Получение тегов организации
GET /api/v1/tags/organization

// Получение тегов событий
GET /api/v1/tags/events
```

**Типы:**
```typescript
interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}
```

#### Компоненты
**`TagsMultiSelect`** (`src/shared/ui/tags-multi-select.tsx`)
- Мультиселект с поиском
- Popover интерфейс
- Отображение выбранных тегов
- Возможность удаления тегов

#### Использование
```tsx
<TagsMultiSelect
  tags={availableTags}
  selectedTagIds={selectedTagIds}
  onChange={(tagIds) => setSelectedTagIds(tagIds)}
  placeholder="Выберите теги..."
  searchPlaceholder="Поиск тегов..."
/>
```

#### Хуки
**`useOrganizationTags()`** (`src/features/blog/api/use-tags.ts`)
```typescript
const { data: tagsData } = useOrganizationTags();
// tagsData.data - массив тегов
```

---

### 3. Страница супер админа для контроля блогов

#### Что добавлено
- ✅ Новая страница `/admin/blog-posts`
- ✅ Таблица со всеми блог-постами организаций
- ✅ Фильтры по статусу, организации
- ✅ Поиск по заголовку
- ✅ Сортировка (дата создания, просмотры, лайки)
- ✅ Модерация: одобрение/отклонение статей
- ✅ Удаление статей
- ✅ Статистика по статусам

#### API Эндпоинты

**Типы** (`src/api/services/superAdmin.types.ts`)
```typescript
interface AdminBlogPost {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  coverImage?: string | null;
  status: BlogPostStatus;
  commentsEnabled: boolean;
  readingTime: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  rejectionMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  reviewedAt?: string | null;
  organization: {
    id: string;
    name: string;
    companyName: string;
    email: string;
    logoUrl?: string | null;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}
```

**Сервис** (`src/api/services/superAdminService.ts`)
```typescript
// Получить все статьи блога
GET /api/v1/super-admin/blog-posts
superAdminService.getBlogPosts(params)

// Получить статьи на модерации
GET /api/v1/super-admin/blog-posts/pending
superAdminService.getPendingBlogPosts(params)

// Получить статью по ID
GET /api/v1/super-admin/blog-posts/{postId}
superAdminService.getBlogPost(postId)

// Одобрить статью
POST /api/v1/super-admin/blog-posts/{postId}/approve
superAdminService.approveBlogPost(postId)

// Отклонить статью
POST /api/v1/super-admin/blog-posts/{postId}/reject
superAdminService.rejectBlogPost(postId, { reason })

// Удалить статью
DELETE /api/v1/super-admin/blog-posts/{postId}
superAdminService.deleteBlogPost(postId)
```

#### Хуки

**`useAdminBlogPosts()`** (`src/features/super-admin/api/use-admin-blog-posts.ts`)
```typescript
// Список всех статей
const { data } = useAdminBlogPosts({
  page: 1,
  limit: 10,
  search: 'query',
  status: 'PENDING_REVIEW',
  sortBy: 'createdAt',
  sortOrder: 'desc',
});

// Статьи на модерации
const { data } = usePendingBlogPosts();

// Статья по ID
const { data } = useAdminBlogPost(postId);

// Одобрение
const approveMutation = useApproveBlogPost();
approveMutation.mutate(postId);

// Отклонение
const rejectMutation = useRejectBlogPost();
rejectMutation.mutate({ postId, reason: 'Причина...' });

// Удаление
const deleteMutation = useDeleteBlogPost();
deleteMutation.mutate(postId);
```

#### UI Компоненты

**Страница** (`src/pages/super-admin/blog-posts/ui/blog-posts-page.tsx`)
- Фильтры и поиск
- Таблица с колонками:
  - Обложка
  - Заголовок и описание
  - Организация
  - Статус
  - Теги
  - Статистика (просмотры, лайки, комментарии)
  - Дата создания
  - Действия (просмотр, одобрение, отклонение, удаление)

**Колонки таблицы** (`src/pages/super-admin/blog-posts/ui/blog-posts-columns.tsx`)
- Настраиваемые колонки с DataTable
- Dropdown меню с действиями
- Цветовая индикация статусов

#### Навигация

Добавлен пункт меню в навигацию супер админа:
- Иконка: `FileText`
- Название: "Блог"
- Путь: `/admin/blog-posts`

---

## Workflow модерации статей

### Для организатора

1. **Создание статьи**
   - Заполнить заголовок, описание
   - Загрузить обложку (drag-and-drop или выбор файла)
   - Выбрать теги из списка
   - Написать контент в Rich Text редакторе
   - Сохранить как черновик

2. **Отправка на модерацию**
   - Нажать "Сохранить и отправить на модерацию"
   - Статья получает статус `PENDING_REVIEW`

3. **После модерации**
   - **Одобрено** → статус `APPROVED`, можно публиковать
   - **Отклонено** → статус `REJECTED`, виден `rejectionMessage`

### Для супер админа

1. **Просмотр статей на модерации**
   - Перейти в `/admin/blog-posts`
   - Фильтр: "На модерации"

2. **Модерация**
   - Просмотреть статью (открывается в новой вкладке)
   - Одобрить → статья получает статус `APPROVED`
   - Отклонить → указать причину отклонения

3. **Управление**
   - Удалить статью (с подтверждением)
   - Просмотр статистики

---

## Структура файлов

```
src/
├── api/services/
│   ├── tagsService.ts          # API для работы с тегами
│   ├── superAdminService.ts    # Дополнены эндпоинты блога
│   └── superAdmin.types.ts     # Типы для блог-постов админа
│
├── features/
│   ├── blog/api/
│   │   └── use-tags.ts         # Хук для тегов организации
│   │
│   └── super-admin/api/
│       └── use-admin-blog-posts.ts # Хуки для управления блог-постами
│
├── pages/
│   ├── my-blog/editor/
│   │   └── ui/blog-editor-page.tsx  # Обновлен: загрузка обложки, теги
│   │
│   └── super-admin/blog-posts/
│       ├── ui/
│       │   ├── blog-posts-page.tsx      # Страница управления
│       │   └── blog-posts-columns.tsx   # Колонки таблицы
│       └── index.ts
│
├── shared/ui/
│   ├── image-upload.tsx         # Компонент загрузки изображений
│   ├── tags-multi-select.tsx    # Мультиселект для тегов
│   └── index.ts                 # Экспорты
│
└── widgets/super-admin-layout/
    └── ui/super-admin-layout.tsx # Добавлен пункт меню "Блог"
```

---

## API Контракты

### Теги организации

**GET `/api/v1/tags/organization`**

Query параметры:
- `search?: string` - поиск по имени тега
- `limit?: number` - лимит результатов

Response:
```typescript
{
  data: Tag[];
  total: number;
}
```

### Супер админ - Блог-посты

**GET `/api/v1/super-admin/blog-posts`**

Query параметры:
- `page?: number`
- `limit?: number`
- `search?: string` - поиск по заголовку
- `status?: BlogPostStatus`
- `organizationId?: string`
- `sortBy?: 'createdAt' | 'publishedAt' | 'likesCount' | 'viewsCount'`
- `sortOrder?: 'asc' | 'desc'`

Response:
```typescript
{
  data: AdminBlogPost[];
  total: number;
  page: number;
  limit: number;
}
```

**POST `/api/v1/super-admin/blog-posts/{postId}/approve`**

Response: `AdminBlogPost`

**POST `/api/v1/super-admin/blog-posts/{postId}/reject`**

Request:
```typescript
{
  reason?: string;
}
```

Response: `AdminBlogPost`

**DELETE `/api/v1/super-admin/blog-posts/{postId}`**

Response: `void`

---

## Зависимости

Новых зависимостей не добавлено. Используются существующие:
- `@tanstack/react-query` - state management
- `react-hook-form` - формы
- `lucide-react` - иконки
- `sonner` - уведомления
- `date-fns` - форматирование дат

---

## Примеры использования

### Создание статьи с тегами и обложкой

```tsx
function BlogEditorPage() {
  const [content, setContent] = useState<BlockNoteContent>([]);
  const { data: tagsData } = useOrganizationTags();
  const createMutation = useCreateBlogPost();
  
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      title: '',
      coverImage: '',
      tagIds: [],
      commentsEnabled: true,
    },
  });

  const onSubmit = (data) => {
    createMutation.mutate({
      title: data.title,
      content,
      coverImage: data.coverImage,
      tagIds: data.tagIds,
      commentsEnabled: data.commentsEnabled,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Заголовок */}
      <Input {...register('title')} />
      
      {/* Обложка */}
      <ImageUpload
        value={watch('coverImage')}
        onChange={(url) => setValue('coverImage', url || '')}
      />
      
      {/* Теги */}
      <TagsMultiSelect
        tags={tagsData?.data || []}
        selectedTagIds={watch('tagIds')}
        onChange={(tagIds) => setValue('tagIds', tagIds)}
      />
      
      {/* Контент */}
      <RichTextEditor
        value={content}
        onChange={setContent}
      />
      
      <Button type="submit">Сохранить</Button>
    </form>
  );
}
```

### Модерация в супер админке

```tsx
function BlogModerationPage() {
  const { data } = usePendingBlogPosts();
  const approveMutation = useApproveBlogPost();
  const rejectMutation = useRejectBlogPost();

  const handleApprove = (postId: string) => {
    approveMutation.mutate(postId);
  };

  const handleReject = (postId: string, reason: string) => {
    rejectMutation.mutate({ postId, reason });
  };

  return (
    <div>
      {data?.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.organization.name}</p>
          <Button onClick={() => handleApprove(post.id)}>
            Одобрить
          </Button>
          <Button onClick={() => handleReject(post.id, 'Причина...')}>
            Отклонить
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

## Миграция

### Для существующих статей

Если в базе данных уже есть статьи с `coverImage` как URL-строкой, они продолжат работать. Новые статьи будут использовать загруженные файлы.

### Для тегов

Если теги еще не созданы на бэкенде, мультиселект будет пустым. Необходимо:
1. Создать теги через админку или API
2. После создания теги автоматически появятся в мультиселекте

---

## Тестирование

### Чек-лист для организатора

- [ ] Загрузка обложки работает (drag-and-drop)
- [ ] Валидация типов файлов (ошибка при загрузке .pdf)
- [ ] Валидация размера (ошибка при > 5MB)
- [ ] Превью загруженной обложки отображается
- [ ] Мультиселект тегов открывается и закрывается
- [ ] Поиск по тегам работает
- [ ] Выбранные теги отображаются как badges
- [ ] Удаление тегов работает
- [ ] Статья сохраняется с тегами и обложкой
- [ ] При редактировании загружаются выбранные теги

### Чек-лист для супер админа

- [ ] Страница `/admin/blog-posts` открывается
- [ ] Таблица отображает все статьи
- [ ] Фильтр по статусу работает
- [ ] Поиск по заголовку работает
- [ ] Сортировка работает (по дате, лайкам, просмотрам)
- [ ] Одобрение статьи меняет статус на `APPROVED`
- [ ] Отклонение открывает диалог с причиной
- [ ] Причина отклонения сохраняется
- [ ] Удаление статьи работает (с подтверждением)
- [ ] Просмотр статьи открывается в новой вкладке
- [ ] Статистика в карточках корректна

---

## Известные ограничения

1. **Теги**
   - Нельзя создавать новые теги из интерфейса создания статьи
   - Теги должны быть предварительно созданы администратором

2. **Обложка**
   - Максимальный размер 5MB (настраивается)
   - Поддерживаются только PNG, JPG, WebP

3. **Модерация**
   - Нельзя редактировать статью в админке (только просмотр, одобрение, отклонение, удаление)

---

## Будущие улучшения

1. **Теги**
   - Создание тегов из формы статьи
   - Управление тегами в настройках организации
   - Автоматические теги на основе контента (AI)

2. **Обложка**
   - Кроппинг изображения
   - Фильтры и эффекты
   - Библиотека стоковых изображений

3. **Модерация**
   - Bulk-действия (одобрить/отклонить несколько статей)
   - Комментарии модератора
   - История изменений статуса

4. **Аналитика**
   - Детальная статистика по статьям
   - Графики просмотров и лайков
   - Экспорт данных

---

## Поддержка

При возникновении проблем:
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что API эндпоинты доступны
3. Проверьте настройки CORS для загрузки файлов
4. Создайте issue в репозитории с описанием проблемы

---

**Автор:** EventFlow Team
**Дата:** 26 января 2026  
**Статус:** ✅ Завершено
