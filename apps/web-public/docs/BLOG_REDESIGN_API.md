# Редизайн блога и интеграция API

## Обзор

Выполнен полный редизайн страниц блога с современным UI/UX и интеграцией API. Дизайн вдохновлён лучшими практиками (Portrait, Craft, MetaMask, Ada).

## Реализованные компоненты

### 1. Страница списка `/blog`

**Hero-секция** (`src/widgets/blog/hero/`)

- Заголовок "Блог Eventflow" с градиентом
- Фильтры по категориям (табы)
- Поле поиска с анимацией фокуса
- Featured блок: главная статья (горизонтальная карточка) + 2 дополнительные статьи + блок подписки

**Каталог** (`src/widgets/blog/catalog/`)

- Переключатель вида: сетка / список
- Фильтрация и пагинация
- Анимация появления карточек
- Load more с индикатором
- Empty state с кнопкой сброса

### 2. Страница статьи `/blog/[slug]`

**Детальный вид** (`src/widgets/blog/detail/`)

- Reading progress bar вверху страницы
- Sticky Table of Contents в sidebar (для больших экранов)
- Floating кнопки: наверх, лайк, сохранение
- Панель взаимодействий: лайки, комментарии, сохранение
- Шеринг: Twitter, LinkedIn, копирование ссылки
- Карточка автора
- Блок похожих статей
- CTA-секция

### 3. Карточки статей

**BlogCard** (`src/shared/ui/blog-card/`)
Варианты:

- `default` — стандартная карточка для каталога
- `featured` — большая карточка с оверлеем
- `compact` — компактная для related posts
- `horizontal` — горизонтальная для sidebar

Возможности:

- Hover-эффекты
- Badge для featured/trending статей
- Интеграция с кнопками лайка/сохранения (опционально)

## API интеграция

### Структура

```
src/shared/api/
  ├── blogService.ts              # Основной API блога
  └── blogInteractionsService.ts  # Лайки и сохранения

src/shared/lib/hooks/
  ├── useBlogQuery.ts             # TanStack Query хуки для блога
  └── useBlogInteractions.ts      # Хуки для лайков/сохранений
```

### Эндпоинты блога

#### Публичные (не требуют авторизации)

| Метод | Endpoint                  | Описание        | Параметры                                                     |
| ----- | ------------------------- | --------------- | ------------------------------------------------------------- |
| GET   | `/api/v1/blog`            | Список статей   | page, limit, search, tagId, sortBy, sortOrder, organizationId |
| GET   | `/api/v1/blog/{slug}`     | Статья по slug  | -                                                             |
| GET   | `/api/v1/blog/featured`   | Featured статьи | limit                                                         |
| GET   | `/api/v1/blog/trending`   | Trending статьи | limit                                                         |
| GET   | `/api/v1/blog/categories` | Категории блога | -                                                             |

#### Приватные (требуют авторизации)

**Лайки:**
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/v1/blog/{postId}/like` | Поставить лайк |
| DELETE | `/api/v1/blog/{postId}/like` | Убрать лайк |
| GET | `/api/v1/blog/{postId}/like/check` | Проверить лайк |

**Сохранённые статьи:**
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/v1/account/me/saved-blog-posts` | Получить сохранённые |
| POST | `/api/v1/account/me/saved-blog-posts/{postId}` | Сохранить статью |
| DELETE | `/api/v1/account/me/saved-blog-posts/{postId}` | Удалить из сохранённых |
| GET | `/api/v1/account/me/saved-blog-posts/{postId}/check` | Проверить сохранение |

### Типы API

**ApiBlogPost:**

```typescript
{
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  category: ApiBlogCategory; // "TIPS_GUIDES", "NEWS_TRENDS", etc.
  tags?: string[];
  author: ApiBlogAuthor;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  viewsCount?: number;
  likesCount?: number;
}
```

**ApiBlogAuthor:**

```typescript
{
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  position?: string;
  articlesCount?: number;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
}
```

### Адаптеры

Frontend использует адаптеры для преобразования API-типов в UI-типы:

- Маппинг категорий: `TIPS_GUIDES` → `tips-guides`
- URL изображений: относительные пути → `https://eventflow.uz/{path}`
- Fallback на placeholder при отсутствии изображения

### Прямое подключение к API

Все запросы идут **напрямую к реальному API**:

```typescript
const response = await apiGet<ApiBlogListResponse>(url, {
  skipAuth: true,
});
return adaptListResponse(response);
```

**Поведение:**

- ✅ Пустой массив данных → пустая страница (UI показывает "Статьи не найдены")
- ✅ Ошибка API → ошибка отображается пользователю
- ✅ Полная прозрачность состояния данных

## Оптимизация запросов

### Проблема: лавина check-запросов

При наличии многих карточек блога каждая рендерила кнопки лайка и сохранения, отправляя `check` запросы. При 12 карточках — 24 запроса. При 401 (неавторизован) TanStack Query делал ретраи → сотни запросов.

### Решение

1. **Отключение ретраев при 401:**
   В хуках добавлено `retry: noRetryOn401` — при статусе 401 запрос не повторяется.

2. **Отключение check в каталоге:**
   У карточек в каталоге `showInteractions={false}`. Кнопки лайка/сохранения доступны только:
   - В hero (3 featured статьи)
   - На странице статьи (1 пост)

   Количество запросов сократилось с 24+ до 3–6 при авторизации.

3. **Enabled только для авторизованных:**
   ```typescript
   enabled: !!postId && isAuth;
   ```
   Для неавторизованных пользователей запросы не отправляются вообще.

## Статус бекенда

### ✅ Готово в коде frontend

- Полная интеграция с API
- Типы согласно Swagger
- Адаптеры API → UI
- TanStack Query с оптимизацией
- Прямое подключение без fallback

### ✅ Работает на backend

**Публичные эндпоинты блога:**

```
GET /api/v1/blog ✅ (возвращает пустой массив)
```

### ⚠️ Требуется на backend

**Наполнение БД:**

- Добавить статьи через админ-панель
- Или создать seed-скрипт с тестовыми данными

**Дополнительные эндпоинты (если еще не реализованы):**

```
GET /api/v1/blog/{slug}
GET /api/v1/blog/featured
GET /api/v1/blog/trending
GET /api/v1/blog/categories
```

**Приватные эндпоинты (лайки, сохранения):**

```
POST   /api/v1/blog/{postId}/like
DELETE /api/v1/blog/{postId}/like
GET    /api/v1/blog/{postId}/like/check

GET    /api/v1/account/me/saved-blog-posts
POST   /api/v1/account/me/saved-blog-posts/{postId}
DELETE /api/v1/account/me/saved-blog-posts/{postId}
GET    /api/v1/account/me/saved-blog-posts/{postId}/check
```

### Текущее состояние

```bash
# Проверка
curl https://eventflow.uz/api/v1/blog
→ 200 OK { "data": [], "total": 0, ... }

# ✅ Эндпоинт работает
# ⚠️ В БД пока нет статей → frontend показывает пустое состояние
```

**Структура ответа API:**

```json
{
  "data": [], // Массив статей (используется data, не items)
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

**Для добавления статей:**
Backend должен наполнить БД статьями через админ-панель или API.

## Включение реального API

Когда бекенд будет готов:

```env
# .env
NEXT_PUBLIC_USE_BLOG_API=true
```

Перезапустите dev-сервер:

```bash
npm run dev
```

Или пересоберите production:

```bash
npm run build
```

Frontend автоматически начнёт использовать реальные данные.

## UI/UX улучшения

### Дизайн-решения

1. **Главная карточка featured статьи:**
   - Горизонтальный layout: изображение слева (40%, max 280px), контент справа
   - Убраны лишние тени и пустоты
   - Компактная высота без растяжения

2. **Фильтры категорий:**
   - Активный фильтр — фирменный оранжевый (`bg-brand-500`)
   - Hover эффекты с плавными переходами

3. **Карточки каталога:**
   - Hover: подъём карточки + увеличение тени
   - Кнопки взаимодействия скрыты для оптимизации запросов

4. **Страница статьи:**
   - Reading progress bar
   - Sticky оглавление
   - Floating кнопки (видны только авторизованным)
   - Типографика с prose классами Tailwind

### Accessibility

- Все интерактивные элементы имеют `aria-label`
- Иконки с `aria-hidden`
- Семантическая разметка (`article`, `nav`, `section`)
- Focus states для клавиатурной навигации

## Следующие шаги для полной интеграции

### Для backend-разработчика:

1. Реализовать эндпоинты согласно типам в `blogService.ts`
2. Вернуть данные в формате `ApiBlogListResponse` / `ApiBlogPost`
3. Категории в формате `TIPS_GUIDES`, `NEWS_TRENDS` и т.д.
4. URL изображений в формате `/uploads/...` или полные URL

### Тестирование API:

```bash
# После реализации бекенда:
curl https://eventflow.uz/api/v1/public/blog?limit=3
curl https://eventflow.uz/api/v1/public/blog/featured?limit=3
curl https://eventflow.uz/api/v1/public/blog/seasonal-event-trends
```

Frontend автоматически подхватит данные без изменений кода.
