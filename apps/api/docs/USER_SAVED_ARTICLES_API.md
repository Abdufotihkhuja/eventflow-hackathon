# API избранных статей пользователя

Документация для endpoints управления избранными статьями из блога EventFlow.

---

## Обзор

Страница "Избранные статьи" позволяет пользователям:
- Сохранять интересные статьи из блога EventFlow
- Просматривать список сохранённых статей
- Искать по названию и фильтровать по категории
- Удалять статьи из избранного

---

## Модель данных

### SavedArticle

```prisma
model SavedArticle {
  id          String    @id @default(uuid())
  userId      String    // ID пользователя
  articleUrl  String    // Ссылка на статью
  title       String    // Заголовок
  excerpt     String?   // Краткое описание
  coverImage  String?   // Изображение обложки
  category    String?   // Категория (TIPS-GUIDES, EVENT-MARKETING, NEWS-TRENDS)
  publishedAt DateTime? // Дата публикации
  readingTime Int?      // Время чтения (минуты)
  authorName  String?   // Автор
  savedAt     DateTime  // Дата сохранения
  
  @@unique([userId, articleUrl])
}
```

---

## Endpoints

### 1. Получить избранные статьи

**Endpoint:** `GET /api/v1/account/me/articles`

**Query Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| search | string | Поиск по заголовку и описанию |
| category | string | Фильтр по категории |

**Response (200 OK):**

```json
{
  "total": 3,
  "articles": [
    {
      "id": "uuid",
      "articleUrl": "https://blog.eventflow.com/articles/seasonal-trends",
      "title": "Сезонные тренды и инсайты для увеличения...",
      "excerpt": "Праздничный сезон наполнен возможностями. С ростом...",
      "coverImage": "https://blog.eventflow.com/images/trends.jpg",
      "category": "TIPS-GUIDES",
      "publishedAt": "2024-11-10T10:00:00Z",
      "readingTime": 5,
      "authorName": "Иван Петров",
      "savedAt": "2024-12-01T12:00:00Z"
    }
  ]
}
```

---

### 2. Сохранить статью в избранное

**Endpoint:** `POST /api/v1/account/me/articles`

**Request Body:**

```json
{
  "articleUrl": "https://blog.eventflow.com/articles/seasonal-trends",
  "title": "Сезонные тренды и инсайты для увеличения...",
  "excerpt": "Праздничный сезон наполнен возможностями...",
  "coverImage": "https://blog.eventflow.com/images/trends.jpg",
  "category": "TIPS-GUIDES",
  "publishedAt": "2024-11-10T10:00:00Z",
  "readingTime": 5,
  "authorName": "Иван Петров"
}
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| articleUrl | URL | Да | Ссылка на статью |
| title | string | Да | Заголовок (макс. 500) |
| excerpt | string | Нет | Описание (макс. 2000) |
| coverImage | URL | Нет | Изображение обложки |
| category | string | Нет | Категория (макс. 100) |
| publishedAt | ISO 8601 | Нет | Дата публикации |
| readingTime | number | Нет | Время чтения (1-120 мин) |
| authorName | string | Нет | Автор (макс. 200) |

**Response (201 Created):** Созданная запись

**Response (409 Conflict):** Статья уже сохранена

---

### 3. Проверить, сохранена ли статья

**Endpoint:** `GET /api/v1/account/me/articles/check?url=...`

**Query Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| url | string | URL статьи для проверки |

**Response (200 OK):**

```json
{
  "saved": true
}
```

---

### 4. Удалить статью из избранного по ID

**Endpoint:** `DELETE /api/v1/account/me/articles/:id`

**Response:** `204 No Content`

---

### 5. Удалить статью из избранного по URL

**Endpoint:** `DELETE /api/v1/account/me/articles?url=...`

**Query Parameters:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| url | string | URL статьи для удаления |

**Response:** `204 No Content`

---

## Категории статей

| Категория | Описание | Цвет (UI) |
|-----------|----------|-----------|
| TIPS-GUIDES | Советы и руководства | Зелёный |
| EVENT-MARKETING | Event-маркетинг | Оранжевый |
| NEWS-TRENDS | Новости и тренды | Синий |
| CASE-STUDIES | Кейсы | Фиолетовый |
| INDUSTRY | Индустрия | Серый |

---

## Примеры использования

### JavaScript (fetch)

```javascript
// Получить избранные статьи
const response = await fetch(
  'http://localhost:3000/api/v1/account/me/articles',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);

const { total, articles } = await response.json();

// Сохранить статью
const saved = await fetch(
  'http://localhost:3000/api/v1/account/me/articles',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articleUrl: 'https://blog.eventflow.com/articles/email-marketing',
      title: 'Продвинутые стратегии email-маркетинга...',
      category: 'EVENT-MARKETING',
      readingTime: 7,
    }),
  }
);

// Проверить, сохранена ли статья
const checkUrl = encodeURIComponent('https://blog.eventflow.com/articles/trends');
const checkResponse = await fetch(
  `http://localhost:3000/api/v1/account/me/articles/check?url=${checkUrl}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);

const { saved } = await checkResponse.json();

// Удалить статью
await fetch(
  `http://localhost:3000/api/v1/account/me/articles/${articleId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);
```

---

## Миграция базы данных

```sql
CREATE TABLE "saved_articles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_image" TEXT,
    "category" TEXT,
    "published_at" TIMESTAMP(3),
    "reading_time" INTEGER,
    "author_name" TEXT,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_articles_user_id_article_url_key" ON "saved_articles"("user_id", "article_url");
CREATE INDEX "saved_articles_user_id_idx" ON "saved_articles"("user_id");
CREATE INDEX "saved_articles_saved_at_idx" ON "saved_articles"("saved_at");

ALTER TABLE "saved_articles" ADD CONSTRAINT "saved_articles_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Для применения:

```bash
npx prisma migrate deploy
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешное выполнение |
| 201 | Статья сохранена |
| 204 | Статья удалена |
| 400 | Некорректные данные запроса |
| 401 | Не авторизован |
| 404 | Статья не найдена в избранном |
| 409 | Статья уже сохранена |

