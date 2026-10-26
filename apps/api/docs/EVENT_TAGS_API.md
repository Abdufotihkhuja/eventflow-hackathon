# API тегов для мероприятий

Документация по системе тегов для категоризации и фильтрации мероприятий.

## Содержание

- [Обзор](#обзор)
- [Модель данных](#модель-данных)
- [Типы тегов](#типы-тегов)
- [API Endpoints](#api-endpoints)
- [Примеры использования](#примеры-использования)
- [Правила и ограничения](#правила-и-ограничения)

---

## Обзор

Система тегов предоставляет гибкий механизм категоризации мероприятий:

- **Предустановленные теги** — системные теги по категориям (Форматы, Аудитория, Темы)
- **Кастомные теги** — организации могут создавать свои собственные теги
- **Максимум 3 тега** на одно мероприятие
- **Фильтрация** — поиск мероприятий по тегам в каталоге

---

## Модель данных

### EventTag (Тег мероприятия)

```typescript
{
  id: string;                // UUID тега
  name: string;              // Название (например: "Конференция")
  slug: string;              // URL-friendly slug (например: "conference")
  category: TagCategory;     // Категория тега
  isSystem: boolean;         // true для предустановленных
  organizationId?: string;   // ID организации (для кастомных)
  createdAt: Date;           // Дата создания
}
```

### TagCategory (Категория тега)

```typescript
enum TagCategory {
  FORMAT = 'FORMAT',       // Формат мероприятия
  AUDIENCE = 'AUDIENCE',   // Целевая аудитория
  TOPIC = 'TOPIC',         // Тематика
  CUSTOM = 'CUSTOM'        // Кастомные теги организации
}
```

### EventTagAssignment (Связь мероприятие-тег)

```typescript
{
  eventId: string;  // ID мероприятия
  tagId: string;    // ID тега
}
```

---

## Типы тегов

### Предустановленные системные теги

#### FORMAT (Форматы)
- **Конференция** (`conference`)
- **Воркшоп** (`workshop`)
- **Вебинар** (`webinar`)
- **Нетворкинг** (`networking`)
- **Хакатон** (`hackathon`)

#### AUDIENCE (Аудитория)
- **Для начинающих** (`for-beginners`)
- **Для профессионалов** (`for-professionals`)
- **Для студентов** (`for-students`)
- **Для бизнеса** (`for-business`)

#### TOPIC (Темы)
- **Технологии** (`technologies`)
- **Дизайн** (`design`)
- **Менеджмент** (`management`)
- **Продажи** (`sales`)
- **Стартапы** (`startups`)

### Кастомные теги

Организации могут создавать собственные теги с категорией `CUSTOM`.

---

## API Endpoints

### 1. Получить все доступные теги

```http
GET /api/v1/events/tags
```

**Доступ:** Публичный (опционально с авторизацией)

**Query параметры:**
- `category` (optional) — фильтр по категории (`FORMAT`, `AUDIENCE`, `TOPIC`, `CUSTOM`)

**Ответ 200:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Конференция",
    "slug": "conference",
    "category": "FORMAT",
    "isSystem": true,
    "organizationId": null,
    "createdAt": "2025-01-25T10:00:00Z",
    "_count": {
      "events": 42
    }
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Искусственный интеллект",
    "slug": "iskusstvennyi-intellekt",
    "category": "CUSTOM",
    "isSystem": false,
    "organizationId": "org-id",
    "createdAt": "2025-01-25T11:00:00Z",
    "_count": {
      "events": 5
    }
  }
]
```

**Примечание:** Если пользователь авторизован как организатор, в список добавляются его кастомные теги.

---

### 2. Получить теги мероприятия

```http
GET /api/v1/events/:eventId/tags
```

**Доступ:** Публичный

**Ответ 200:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Конференция",
    "slug": "conference",
    "category": "FORMAT",
    "isSystem": true
  },
  {
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Для профессионалов",
    "slug": "for-professionals",
    "category": "AUDIENCE",
    "isSystem": true
  }
]
```

---

### 3. Назначить теги мероприятию

```http
PUT /api/v1/events/:eventId/tags
Authorization: Bearer {token}
Content-Type: application/json

{
  "tagIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "223e4567-e89b-12d3-a456-426614174001",
    "323e4567-e89b-12d3-a456-426614174002"
  ]
}
```

**Доступ:** ORGANIZATION, MEMBER (с правами `EVENTS_UPDATE`)

**Валидация:**
- Максимум 3 тега
- Все теги должны существовать
- Кастомные теги доступны только их организации

**Ответ 200:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Конференция",
    "slug": "conference",
    "category": "FORMAT",
    "isSystem": true
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Технологии",
    "slug": "technologies",
    "category": "TOPIC",
    "isSystem": true
  },
  {
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Для профессионалов",
    "slug": "for-professionals",
    "category": "AUDIENCE",
    "isSystem": true
  }
]
```

**Ошибки:**
- `400` — Один или несколько тегов не существуют
- `400` — Можно назначить максимум 3 тега
- `403` — Нет доступа к одному или нескольким тегам
- `403` — Только организаторы могут управлять тегами

---

### 4. Создать кастомный тег (организация)

```http
POST /api/v1/organizations/tags
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Искусственный интеллект"
}
```

**Доступ:** ORGANIZATION, MEMBER (с правами `EVENTS_CREATE`)

**Примечание:** Slug генерируется автоматически с транслитерацией кириллицы.

**Ответ 201:**
```json
{
  "id": "423e4567-e89b-12d3-a456-426614174003",
  "name": "Искусственный интеллект",
  "slug": "iskusstvennyi-intellekt",
  "category": "CUSTOM",
  "isSystem": false,
  "organizationId": "org-id",
  "createdAt": "2025-01-25T12:00:00Z"
}
```

**Ошибки:**
- `409` — Тег с таким названием уже существует
- `403` — Только организаторы могут управлять тегами

---

### 5. Получить теги организации

```http
GET /api/v1/organizations/tags
Authorization: Bearer {token}
```

**Доступ:** ORGANIZATION, MEMBER

**Ответ 200:**
```json
[
  {
    "id": "423e4567-e89b-12d3-a456-426614174003",
    "name": "Искусственный интеллект",
    "slug": "iskusstvennyi-intellekt",
    "category": "CUSTOM",
    "isSystem": false,
    "organizationId": "org-id",
    "createdAt": "2025-01-25T12:00:00Z",
    "_count": {
      "events": 3
    }
  }
]
```

---

### 6. Удалить кастомный тег

```http
DELETE /api/v1/organizations/tags/:tagId
Authorization: Bearer {token}
```

**Доступ:** ORGANIZATION, MEMBER (с правами `EVENTS_DELETE`)

**Ответ 200:**
```json
{
  "message": "Тег удалён"
}
```

**Ошибки:**
- `403` — Нельзя удалить системный тег
- `403` — Нет доступа к этому тегу
- `404` — Тег не найден

**Примечание:** При удалении тега автоматически удаляются все связи с мероприятиями (cascade delete).

---

### 7. Фильтрация мероприятий по тегам

```http
GET /api/v1/public/events?tags=conference,for-professionals,technologies
```

**Доступ:** Публичный

**Query параметры:**
- `tags` — список slug через запятую (например: `conference,workshop`)
- Можно комбинировать с другими фильтрами (`city`, `dateFrom`, `dateTo`, и т.д.)

**Примечание:** Фильтрация работает по принципу OR — возвращаются мероприятия, имеющие хотя бы один из указанных тегов.

**Ответ 200:**
```json
{
  "data": [
    {
      "id": "event-id",
      "title": "Tech Conference 2025",
      "tags": [
        {
          "eventId": "event-id",
          "tagId": "tag-id",
          "tag": {
            "id": "tag-id",
            "name": "Конференция",
            "slug": "conference",
            "category": "FORMAT"
          }
        }
      ],
      ...
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

---

## Примеры использования

### Пример 1: Создание мероприятия с тегами

```typescript
// 1. Получить доступные теги
const tagsResponse = await fetch('/api/v1/events/tags');
const tags = await tagsResponse.json();

// 2. Отфильтровать нужные теги
const conferenceTag = tags.find(t => t.slug === 'conference');
const techTag = tags.find(t => t.slug === 'technologies');
const proTag = tags.find(t => t.slug === 'for-professionals');

// 3. Создать мероприятие (без тегов)
const eventResponse = await fetch('/api/v1/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Tech Conference 2025',
    // ... другие поля
  })
});
const event = await eventResponse.json();

// 4. Назначить теги
await fetch(`/api/v1/events/${event.id}/tags`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tagIds: [conferenceTag.id, techTag.id, proTag.id]
  })
});
```

### Пример 2: Фильтр по тегам на frontend

```typescript
function TagFilter() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const handleTagToggle = (slug: string) => {
    setSelectedTags(prev => 
      prev.includes(slug) 
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };
  
  // Формирование URL с тегами
  const searchUrl = `/api/v1/public/events?tags=${selectedTags.join(',')}`;
  
  return (
    <div>
      <TagChip 
        label="Конференция" 
        slug="conference"
        isActive={selectedTags.includes('conference')}
        onToggle={handleTagToggle}
      />
      {/* Другие теги */}
    </div>
  );
}
```

### Пример 3: Создание кастомного тега

```typescript
async function createCustomTag(name: string) {
  const response = await fetch('/api/v1/organizations/tags', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });
  
  if (response.status === 409) {
    throw new Error('Тег с таким названием уже существует');
  }
  
  return response.json();
}

// Использование
await createCustomTag('Искусственный интеллект');
// Slug автоматически: "iskusstvennyi-intellekt"
```

---

## Правила и ограничения

### Валидация

1. **Максимум 3 тега** на одно мероприятие
2. **Уникальность slug** в рамках организации (для кастомных тегов)
3. **Длина названия** — максимум 50 символов
4. **Slug генерируется автоматически** из названия с транслитерацией

### Права доступа

| Действие | USER | ORGANIZATION | MEMBER | SUPER_ADMIN |
|----------|------|--------------|--------|-------------|
| Просмотр тегов | ✅ | ✅ | ✅ | ✅ |
| Назначить теги мероприятию | ❌ | ✅ | ✅* | ❌ |
| Создать кастомный тег | ❌ | ✅ | ✅* | ❌ |
| Удалить кастомный тег | ❌ | ✅ | ✅* | ❌ |

\*С соответствующими permissions (EVENTS_UPDATE, EVENTS_CREATE, EVENTS_DELETE)

### Особенности

1. **Системные теги нельзя:**
   - Удалять
   - Изменять
   - Создавать (уже предустановлены)

2. **Кастомные теги:**
   - Доступны только организации-владельцу
   - Автоматически удаляются при удалении организации (cascade)
   - При удалении тега удаляются связи с мероприятиями

3. **Slug генерация:**
   - Кириллица транслитерируется в латиницу
   - Пробелы заменяются на дефисы
   - Приводится к kebab-case
   - Примеры:
     - "Для начинающих" → "dlya-nachinayuschih"
     - "IT & AI" → "it-ai"

4. **Фильтрация:**
   - Работает по принципу OR (хотя бы один тег совпадает)
   - Можно комбинировать с другими фильтрами
   - Использует slug, а не ID

---

## Миграция

### Применение миграции

```bash
# Когда база данных доступна
npx prisma migrate dev --name add_event_tags

# Или применить вручную
psql -U username -d database_name -f prisma/migrations/add_event_tags.sql
```

### Запуск seed

```bash
# Создание системных тегов
npx prisma db seed
```

---

## Swagger документация

Все эндпоинты доступны в Swagger UI:

```
http://localhost:3000/api/docs
```

**Секции:**
- `event-tags` — управление тегами мероприятий
- `organization-tags` — кастомные теги организации

---

## Интеграция с существующими эндпоинтами

### События включают теги в ответах

Все эндпоинты получения событий автоматически включают теги:

```typescript
GET /api/v1/events/:id
GET /api/v1/events  // Список событий организации
GET /api/v1/public/events  // Публичный каталог
```

Структура тегов в ответе:

```json
{
  "id": "event-id",
  "title": "Event Title",
  "tags": [
    {
      "eventId": "event-id",
      "tagId": "tag-id",
      "tag": {
        "id": "tag-id",
        "name": "Конференция",
        "slug": "conference",
        "category": "FORMAT",
        "isSystem": true
      }
    }
  ],
  ...
}
```

---

## Поддержка

При возникновении вопросов обратитесь к:
- Основной документации API: `docs/EVENT_ENHANCEMENTS_API.md`
- Архитектуре: `docs/EVENT_ENHANCEMENTS_ARCHITECTURE.md`
- Swagger UI: `/api/docs`
