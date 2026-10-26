# API: Супер-админ (SUPER_ADMIN)

Префикс: **`/api/v1`**. Доступ: JWT для super-admin actor.

---

## Профиль

| Метод | Path                  | Описание             |
| ----- | --------------------- | -------------------- |
| GET   | `/super-admin/me`     | Текущий супер-админ  |
| POST  | `/super-admin/admins` | Создать супер-админа |

### DTO: CreateSuperAdminDto (Body)

| Поле     | Тип            | Обязательное | Описание            |
| -------- | -------------- | ------------ | ------------------- |
| email    | string (email) | да           | Email               |
| password | string         | да           | Минимум 12 символов |
| name     | string         | да           | Имя                 |

---

## Пользователи

| Метод  | Path                         | Описание                   |
| ------ | ---------------------------- | -------------------------- |
| GET    | `/super-admin/users`         | Список пользователей       |
| GET    | `/super-admin/users/:userId` | Пользователь по ID         |
| PATCH  | `/super-admin/users/:userId` | Редактировать пользователя |
| DELETE | `/super-admin/users/:userId` | Удалить пользователя       |

### Query: AdminUsersQueryDto (GET users)

| Поле            | Тип     | По умолчанию | Описание                    |
| --------------- | ------- | ------------ | --------------------------- |
| page            | number  | 1            | Номер страницы              |
| limit           | number  | 20           | На странице (1–100)         |
| search          | string  | —            | Поиск по email или имени    |
| isEmailVerified | boolean | —            | Фильтр по верификации email |
| includeDeleted  | boolean | —            | Показать удалённых          |

### DTO: AdminUpdateUserDto (Body PATCH)

| Поле            | Тип              | Описание                   |
| --------------- | ---------------- | -------------------------- |
| email           | string (email)   | Email                      |
| name            | string           | Имя (макс. 100)            |
| phone           | string (телефон) | Телефон                    |
| location        | string           | Местоположение (макс. 200) |
| bio             | string           | О себе (макс. 2000)        |
| isEmailVerified | boolean          | Email подтверждён          |
| isPublicProfile | boolean          | Публичный профиль          |
| showEmail       | boolean          | Показывать email           |
| showPhone       | boolean          | Показывать телефон         |

---

## Организации

| Метод  | Path                                        | Описание                  |
| ------ | ------------------------------------------- | ------------------------- |
| GET    | `/super-admin/organizations`                | Список организаций        |
| GET    | `/super-admin/organizations/pending`        | На верификации            |
| GET    | `/super-admin/organizations/:orgId`         | Организация по ID         |
| PATCH  | `/super-admin/organizations/:orgId`         | Редактировать организацию |
| DELETE | `/super-admin/organizations/:orgId`         | Удалить организацию       |
| POST   | `/super-admin/organizations/:orgId/approve` | Одобрить организацию      |
| POST   | `/super-admin/organizations/:orgId/reject`  | Отклонить организацию     |

### Query: GET organizations/pending

| Поле  | Тип    | Описание    |
| ----- | ------ | ----------- |
| page  | number | Страница    |
| limit | number | На странице |

### Query: AdminOrganizationsQueryDto (GET organizations)

| Поле               | Тип    | По умолчанию | Описание                         |
| ------------------ | ------ | ------------ | -------------------------------- |
| page               | number | 1            | Номер страницы                   |
| limit              | number | 20           | На странице (1–100)              |
| search             | string | —            | Поиск по названию, email или ИНН |
| verificationStatus | enum   | —            | PENDING, APPROVED, REJECTED      |

### DTO: AdminUpdateOrganizationDto (Body PATCH)

| Поле            | Тип            | Описание                       |
| --------------- | -------------- | ------------------------------ |
| email           | string (email) | Email                          |
| name            | string         | Имя представителя (макс. 100)  |
| companyName     | string         | Название компании (макс. 200)  |
| inn             | string         | ИНН (1–20 символов)            |
| description     | string         | Описание (макс. 2000)          |
| phone           | string         | Телефон (международный формат) |
| logoUrl         | string (URL)   | Логотип                        |
| isEmailVerified | boolean        | Email подтверждён              |

### DTO: RejectDto (Body reject)

| Поле   | Тип    | Описание                                     |
| ------ | ------ | -------------------------------------------- |
| reason | string | Причина отклонения (макс. 1000, опционально) |

---

## События

| Метод | Path                                    | Описание                 |
| ----- | --------------------------------------- | ------------------------ |
| GET   | `/super-admin/events`                   | Список всех событий      |
| GET   | `/super-admin/events/pending`           | События на модерации     |
| GET   | `/super-admin/events/:eventId`          | Событие по ID            |
| PATCH | `/super-admin/events/:eventId`          | Редактировать событие    |
| POST  | `/super-admin/events/:eventId/approve`  | Одобрить (опубликовать)  |
| POST  | `/super-admin/events/:eventId/reject`   | Отклонить                |
| PATCH | `/super-admin/events/:eventId/featured` | Топовое событие вкл/выкл |

### Query: GET events/pending

| Поле  | Тип    | Описание    |
| ----- | ------ | ----------- |
| page  | number | Страница    |
| limit | number | На странице |

### Query: AdminEventsQueryDto (GET events)

| Поле           | Тип    | По умолчанию | Описание                                               |
| -------------- | ------ | ------------ | ------------------------------------------------------ |
| page           | number | 1            | Номер страницы                                         |
| limit          | number | 20           | На странице (1–100)                                    |
| search         | string | —            | Поиск по названию                                      |
| status         | enum   | —            | DRAFT, PENDING_REVIEW, PUBLISHED, CANCELLED, COMPLETED |
| format         | enum   | —            | ONLINE, OFFLINE, HYBRID                                |
| type           | enum   | —            | FREE, PAID                                             |
| organizationId | UUID   | —            | ID организации                                         |

### DTO: AdminUpdateEventDto (Body PATCH)

Все поля опциональны. Статус события этим DTO не меняется.
| Поле | Тип | Описание |
|------|-----|----------|
| title | string | Название (макс. 200) |
| description | string | Описание (макс. 10000) |
| shortDescription | string | Краткое описание (макс. 500) |
| coverImage | string | URL обложки |
| type | enum | FREE, PAID |
| accessType | enum | OPEN, REQUEST, INVITE_ONLY |
| format | enum | ONLINE, OFFLINE, HYBRID |
| startDate | string (ISO 8601) | Начало |
| endDate | string (ISO 8601) | Конец |
| registrationDeadline | string (ISO 8601) | Дедлайн регистрации |
| venue | string | Место (макс. 200) |
| address | string | Адрес (макс. 500) |
| city | string | Город (макс. 100) |
| onlineUrl | string (URL) | Ссылка для онлайн |
| price | number | Цена (≥ 0) |
| currency | enum | RUB, USD, EUR, UZS |
| maxParticipants | number | Лимит участников (≥ 1) |
| rejectionReason | string | Причина отклонения (макс. 1000) |

---

## Блог

| Метод | Path                                      | Описание         |
| ----- | ----------------------------------------- | ---------------- |
| GET   | `/super-admin/blog-posts`                 | Все статьи       |
| GET   | `/super-admin/blog-posts/pending`         | На модерации     |
| GET   | `/super-admin/blog-posts/:postId`         | Статья по ID     |
| POST  | `/super-admin/blog-posts/:postId/approve` | Одобрить статью  |
| POST  | `/super-admin/blog-posts/:postId/reject`  | Отклонить статью |

### Query: GET blog-posts/pending

| Поле  | Тип    | Описание    |
| ----- | ------ | ----------- |
| page  | number | Страница    |
| limit | number | На странице |

### Query: AdminBlogPostsQueryDto (GET blog-posts)

| Поле           | Тип    | По умолчанию | Описание                                             |
| -------------- | ------ | ------------ | ---------------------------------------------------- |
| page           | number | 1            | Номер страницы                                       |
| limit          | number | 20           | На странице (1–100)                                  |
| search         | string | —            | Поиск по названию                                    |
| status         | enum   | —            | DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED |
| organizationId | UUID   | —            | ID организации                                       |
| sortBy         | enum   | createdAt    | createdAt, publishedAt, likesCount, viewsCount       |
| sortOrder      | enum   | desc         | asc, desc                                            |

### DTO: RejectDto (Body reject)

| Поле   | Тип    | Описание                                     |
| ------ | ------ | -------------------------------------------- |
| reason | string | Причина отклонения (макс. 1000, опционально) |

---

## Категории

**Базовый путь:** `GET|POST /api/v1/super-admin/categories`, `GET /api/v1/super-admin/categories/check-slug`, `POST /api/v1/super-admin/categories/icon-upload`, `PATCH /api/v1/super-admin/categories/reorder`, `GET|PATCH|DELETE /api/v1/super-admin/categories/:id`  
**Авторизация:** `Authorization: Bearer <access_token>`, роль `SUPER_ADMIN`.

| Метод  | Path                                  | Описание                |
| ------ | ------------------------------------- | ----------------------- |
| GET    | `/super-admin/categories`             | Список категорий        |
| GET    | `/super-admin/categories/check-slug`   | Проверить доступность slug |
| GET    | `/super-admin/categories/:id`         | Категория по ID         |
| POST   | `/super-admin/categories`             | Создать категорию       |
| POST   | `/super-admin/categories/icon-upload` | Загрузить иконку        |
| PATCH  | `/super-admin/categories/reorder`     | Изменить порядок категорий |
| PATCH  | `/super-admin/categories/:id`         | Обновить категорию      |
| DELETE | `/super-admin/categories/:id`         | Удалить категорию       |

### GET /super-admin/categories — список с пагинацией

**Query:** `CategoryQueryDto`

| Поле     | Тип     | По умолчанию | Описание                                      |
| -------- | ------- | ------------ | --------------------------------------------- |
| page     | number  | 1            | Номер страницы (≥ 1)                          |
| limit    | number  | 20           | Записей на странице (1–100)                   |
| search   | string  | —            | Поиск по названию и описанию (без учёта регистра) |
| isActive | boolean | —            | Фильтр по активности                          |

**Ответ 200:** объект с полями `data`, `total`, `page`, `limit`.

- `data` — массив категорий; у каждого элемента есть `_count: { events: number }` (число опубликованных событий).
- Сортировка: `sortOrder` по возрастанию, затем `name` по возрастанию.

Пример фрагмента ответа:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Бизнес-тренинг",
      "slug": "biznes-trening",
      "icon": "/uploads/550e8400-e29b-41d4-a716-446655440000.png",
      "description": "Тренинги для развития бизнес-навыков",
      "sortOrder": 0,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "_count": { "events": 5 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET /super-admin/categories/check-slug — проверить доступность slug

Позволяет до отправки формы узнать, свободен ли slug. Вызывать при потере фокуса полем Slug или по кнопке «Проверить».

**Query:** `slug` (обязательный) — проверяемый slug (a-z, 0-9, дефис); `excludeId` (опционально) — UUID категории при редактировании (текущий slug этой категории считается свободным).

**Ответ 200:** `{ "available": true }` или `{ "available": false }`.

**Ответ 400:** неверный формат slug (не a-z0-9-).

### GET /super-admin/categories/:id — одна категория

**Параметр:** `id` — UUID категории.

**Ответ 200:** объект категории (без `_count`).  
**Ответ 404:** категория не найдена.

### POST /super-admin/categories/icon-upload — загрузить иконку категории

Иконка загружается файлом; в ответ возвращается URL — его нужно передать в поле `icon` при создании или обновлении категории.

**Body:** `multipart/form-data`, поле **`icon`** — файл изображения (JPEG, PNG, GIF, WebP, макс. 5 MB).

**Ответ 201:** объект `{ filename, originalName, mimetype, size, url }`. В поле **`url`** — значение для `CreateCategoryDto.icon` / `UpdateCategoryDto.icon` (например `/uploads/uuid.png`).

**Ответ 400:** файл не передан или недопустимый тип/размер.

### POST /super-admin/categories — создать категорию

**Body:** `CreateCategoryDto`

| Поле        | Тип     | Обязательное | Описание                                                                 |
| ----------- | ------- | ------------ | ------------------------------------------------------------------------ |
| name        | string  | да           | Название (макс. 100)                                                     |
| slug        | string  | нет          | URL-slug: только `a-z`, `0-9`, `-`; иначе из name                        |
| icon        | string  | нет          | URL иконки (макс. 500). Получить через POST …/icon-upload, подставить `url` |
| description | string  | нет          | Описание (макс. 500)                                                     |
| sortOrder   | number  | нет          | Порядок (≥ 0), по умолчанию 0                                            |
| isActive    | boolean | нет          | Активна (по умолчанию true)                                              |

**Ответ 201:** созданная категория.  
**Ответ 409:** категория с таким `name` или `slug` уже существует.

### PATCH /super-admin/categories/reorder — изменить порядок категорий

Передаётся полный список ID категорий в нужном порядке. Порядок в массиве = новый `sortOrder` (индекс 0, 1, 2, …).

**Body:** `ReorderCategoriesDto`

| Поле        | Тип     | Обязательное | Описание                                                |
| ----------- | ------- | ------------ | ------------------------------------------------------- |
| categoryIds | string[] | да           | Массив UUID всех категорий в новом порядке (без дубликатов) |

**Ответ 200:** без тела.  
**Ответ 400:** список не совпадает с полным набором категорий (лишние/чужие ID или не все категории переданы).

### PATCH /super-admin/categories/:id — обновить категорию

**Параметр:** `id` — UUID категории.  
**Body:** `UpdateCategoryDto` — все поля опциональны (частичное обновление по полям из CreateCategoryDto).

**Ответ 200:** обновлённая категория.  
**Ответ 404:** категория не найдена.  
**Ответ 409:** новое значение `name` или `slug` уже занято другой категорией.

### DELETE /super-admin/categories/:id — удалить категорию

**Параметр:** `id` — UUID категории.

**Ответ 204:** без тела.  
**Ответ 404:** категория не найдена.

### DTO: UpdateCategoryDto (Body PATCH)

Все поля опциональны (PartialType(CreateCategoryDto)).

---

## Подборки

| Метод  | Path                                          | Описание                                                                 |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| GET    | `/super-admin/collections/available-events`   | Список событий для выбора в подборку (опубликованные и прошедшие, минимальные поля) |
| GET    | `/super-admin/collections/check-slug`         | Проверить доступность slug (query: slug, excludeId?)                     |
| POST   | `/super-admin/collections/cover-upload`      | Загрузить обложку подборки (multipart, поле `cover`)                     |
| GET    | `/super-admin/collections`                   | Список подборок                                                          |
| GET    | `/super-admin/collections/:id`               | Подборка по ID с событиями                                               |
| GET    | `/super-admin/collections/:id/events`        | События подборки                                                         |
| POST   | `/super-admin/collections`                   | Создать подборку                                                         |
| PATCH  | `/super-admin/collections/:id`               | Обновить подборку                                                        |
| DELETE | `/super-admin/collections/:id`               | Удалить подборку                                                         |
| POST   | `/super-admin/collections/:id/events`        | Добавить события в подборку                                              |
| DELETE | `/super-admin/collections/:id/events`         | Удалить события из подборки                                              |
| PATCH  | `/super-admin/collections/:id/events/reorder`| Изменить порядок событий                                                 |

### Query: AvailableEventsQueryDto (GET available-events)

| Поле   | Тип    | По умолчанию | Описание                  |
| ------ | ------ | ------------ | ------------------------- |
| page   | number | 1            | Номер страницы            |
| limit  | number | 20           | На странице (1–100)       |
| search | string | —            | Поиск по названию события |

**Ответ:** `{ data, total, page, limit }`. Элементы в `data`: `id`, `title`, `slug`, `coverImage`, `startDate`, `endDate`, `status`. События только со статусами PUBLISHED и COMPLETED.

### GET /super-admin/collections/check-slug — проверить доступность slug

**Query:** `CheckCollectionSlugQueryDto`

| Поле      | Тип    | Обязательное | Описание                                                                 |
| --------- | ------ | ------------ | ------------------------------------------------------------------------- |
| slug      | string | да           | Slug для проверки (a-z, 0-9, дефис)                                       |
| excludeId | UUID   | нет          | При редактировании: ID подборки — её текущий slug считается свободным     |

**Ответ 200:** `{ available: true }` или `{ available: false }`. Админ вызывает перед сохранением формы, чтобы показать, свободен ли slug.

### POST /super-admin/collections/cover-upload — загрузить обложку

**Body:** multipart/form-data, поле `cover` (файл изображения). Разрешены JPEG, PNG, GIF, WebP, макс. 5MB.

**Ответ 201:** `{ filename, originalName, mimetype, size, url }`. Значение `url` подставлять в поле `coverImage` при создании/обновлении подборки.

**Ответ 400:** файл не предоставлен или недопустимый тип/размер.

### Query: CollectionQueryDto (GET collections)

| Поле     | Тип     | По умолчанию | Описание             |
| -------- | ------- | ------------ | -------------------- |
| page     | number  | 1            | Номер страницы       |
| limit    | number  | 20           | На странице (1–100)  |
| search   | string  | —            | Поиск по названию    |
| isActive | boolean | —            | Фильтр по активности |

### DTO: CreateCollectionDto (Body POST)

| Поле          | Тип             | Обязательное | Описание                                                                 |
| ------------- | --------------- | ------------ | ------------------------------------------------------------------------- |
| title         | string          | да           | Название (макс. 200)                                                      |
| slug          | string          | нет          | URL-slug (a-z0-9-), иначе из title                                        |
| coverImage    | string          | нет          | URL обложки после загрузки через POST /super-admin/collections/cover-upload |
| gradientStart | string (HEX)    | нет          | Цвет начала градиента; если указан — gradientEnd обязателен               |
| gradientEnd   | string (HEX)    | нет          | Цвет конца градиента; если указан — gradientStart обязателен              |
| description   | string          | нет          | Описание (макс. 1000)                                                     |
| sortOrder     | number          | нет          | Порядок (≥ 0)                                                             |
| isActive      | boolean         | нет          | Активна (по умолчанию true)                                               |
| eventIds      | string[] (UUID) | нет          | ID событий для добавления (брать из GET available-events)                 |

### DTO: UpdateCollectionDto (Body PATCH)

Все поля опциональны, кроме eventIds (его нет — события через отдельные endpoints).

### DTO: AddEventsToCollectionDto (Body POST :id/events)

| Поле     | Тип             | Описание               |
| -------- | --------------- | ---------------------- |
| eventIds | string[] (UUID) | ID событий (минимум 1) |

### DTO: RemoveEventsFromCollectionDto (Body DELETE :id/events)

| Поле     | Тип             | Описание               |
| -------- | --------------- | ---------------------- |
| eventIds | string[] (UUID) | ID событий (минимум 1) |

### DTO: ReorderCollectionEventsDto (Body PATCH :id/events/reorder)

| Поле     | Тип             | Описание                               |
| -------- | --------------- | -------------------------------------- |
| eventIds | string[] (UUID) | ID событий в новом порядке (минимум 1) |

---

## Прочее

| Метод | Path                              | Описание                  |
| ----- | --------------------------------- | ------------------------- |
| GET   | `/super-admin/stats`              | Статистика системы        |
| GET   | `/super-admin/verification-codes` | История кодов верификации |

### Ответ GET stats

| Поле                 | Тип    |
| -------------------- | ------ |
| totalUsers           | number |
| totalOrganizations   | number |
| totalMembers         | number |
| pendingOrganizations | number |
| pendingEvents        | number |
| pendingBlogPosts     | number |

### Query: verification-codes

| Поле     | Тип     | Описание             |
| -------- | ------- | -------------------- |
| page     | number  | Страница             |
| limit    | number  | На странице          |
| email    | string  | Фильтр по email      |
| type     | enum    | VerificationCodeType |
| actorType | enum   | UserType             |
| isUsed   | boolean | Использован ли код   |
| sort     | string  | Например -createdAt  |
