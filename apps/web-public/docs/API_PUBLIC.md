# API: Публичные endpoints (без авторизации)

Префикс: **`/api/v1`**. Доступны всем (в т.ч. без JWT).

---

## Платформа и организаторы

| Метод | Path                              | Описание                         |
| ----- | --------------------------------- | -------------------------------- |
| GET   | `/public/stats`                   | Статистика платформы             |
| GET   | `/public/organizations/:id/stats` | Публичная статистика организации |

### Ответ: PlatformStatsDto (GET public/stats)

| Поле                   | Тип                       | Описание                                           |
| ---------------------- | ------------------------- | -------------------------------------------------- |
| activeEvents           | PublicStatItemDto         | Активные события (value, change, period)           |
| newParticipants        | PublicParticipantsStatDto | Новые участники (value, changePercent, changeType) |
| registrationConversion | PublicConversionStatDto   | Конверсия регистрации (value, description)         |
| totalOrganizations     | number                    | Всего организаций                                  |
| totalParticipants      | number                    | Всего участников                                   |
| totalEvents            | number                    | Всего событий                                      |

### Ответ: OrganizationPublicStatsDto (GET public/organizations/:id/stats)

| Поле                   | Тип                       | Описание                  |
| ---------------------- | ------------------------- | ------------------------- |
| id                     | string                    | ID организации            |
| name                   | string                    | Название организации      |
| logoUrl                | string                    | Логотип                   |
| activeEvents           | PublicStatItemDto         | Активные события          |
| newParticipants        | PublicParticipantsStatDto | Новые участники           |
| registrationConversion | PublicConversionStatDto   | Конверсия регистрации     |
| totalEvents            | number                    | Всего событий организации |
| totalParticipants      | number                    | Всего участников          |

---

## События

| Метод | Path                              | Описание                      |
| ----- | --------------------------------- | ----------------------------- |
| GET   | `/public/events`                  | Список опубликованных событий |
| GET   | `/public/events/by-slug/:slug`    | Событие по slug               |
| GET   | `/public/events/:id`              | Событие по ID                 |
| GET   | `/public/events/:id/can-register` | Можно ли регистрироваться     |

### Query: PublicEventsQueryDto (GET public/events)

| Поле     | Тип     | По умолчанию | Описание                |
| -------- | ------- | ------------ | ----------------------- |
| page     | number  | 1            | Страница                |
| limit    | number  | 10           | На странице (1–50)      |
| search   | string  | —            | Поисковый запрос        |
| city     | string  | —            | Фильтр по городу        |
| format   | enum    | —            | ONLINE, OFFLINE, HYBRID |
| type     | enum    | —            | FREE, PAID              |
| filter   | enum    | upcoming     | upcoming, past, all     |
| featured | boolean | —            | Только топовые события  |

### Ответ: PublicEventsListDto (GET public/events)

| Поле       | Тип                  | Описание         |
| ---------- | -------------------- | ---------------- |
| items      | PublicEventItemDto[] | Список событий   |
| total      | number               | Всего событий    |
| page       | number               | Текущая страница |
| limit      | number               | На странице      |
| totalPages | number               | Всего страниц    |

**PublicEventItemDto:** id, slug, title, shortDescription, coverImage, startDate, endDate, format, type, status, city, maxParticipants, registrationsCount, isFeatured, organization { id, name, logoUrl }

---

## Описания событий

| Метод | Path                           | Описание          |
| ----- | ------------------------------ | ----------------- |
| GET   | `/events/:id/description/html` | Описание в HTML   |
| GET   | `/events/:id/description/text` | Описание в тексте |

### Ответ GET description/html

| Поле | Тип    |
| ---- | ------ |
| html | string |

### Ответ GET description/text

| Поле | Тип    |
| ---- | ------ |
| text | string |

---

## Теги, категории, подборки

| Метод | Path                                | Описание                        |
| ----- | ----------------------------------- | ------------------------------- |
| GET   | `/events/tags`                      | Доступные теги                  |
| GET   | `/events/:id/tags`                  | Теги мероприятия                |
| GET   | `/events/:eventId/questions/public` | Вопросы регистрации (публичные) |
| GET   | `/categories`                       | Активные категории              |
| GET   | `/categories/:id`                   | Категория по ID                 |
| GET   | `/collections`                      | Активные подборки               |
| GET   | `/collections/:id`                  | Подборка по ID с событиями      |
| GET   | `/collections/by-slug/:slug`        | Подборка по slug с событиями    |

### Query: TagsQueryDto (GET events/tags)

| Поле     | Тип  | Описание                        |
| -------- | ---- | ------------------------------- |
| category | enum | FORMAT, AUDIENCE, TOPIC, CUSTOM |

---

## Комментарии к событиям (чтение)

| Метод | Path                        | Описание            |
| ----- | --------------------------- | ------------------- |
| GET   | `/events/:eventId/comments` | Комментарии события |

### Query: CommentQueryDto (GET events/:eventId/comments)

| Поле  | Тип    | По умолчанию | Описание    |
| ----- | ------ | ------------ | ----------- |
| page  | number | 1            | Страница    |
| limit | number | 20           | На странице |

---

## Блог (публичное чтение)

| Метод | Path                     | Описание                |
| ----- | ------------------------ | ----------------------- |
| GET   | `/blog`                  | Публичный список статей |
| GET   | `/blog/by-slug/:slug`    | Статья по slug          |
| GET   | `/blog/:id`              | Статья по ID            |
| GET   | `/blog/:postId/comments` | Комментарии статьи      |

### Query: BlogCommentsQueryDto (GET blog/:postId/comments)

| Поле  | Тип    | По умолчанию | Описание            |
| ----- | ------ | ------------ | ------------------- |
| page  | number | 1            | Страница            |
| limit | number | 20           | На странице (1–100) |

### Query: PublicBlogPostsQueryDto (GET blog)

| Поле            | Тип               | По умолчанию | Описание                                                    |
| --------------- | ----------------- | ------------ | ----------------------------------------------------------- |
| page            | number            | 1            | Страница                                                    |
| limit           | number            | из констант  | На странице (макс. из blog.constants)                       |
| search          | string            | —            | Поиск по заголовку и описанию (макс. 100)                   |
| tagId           | UUID              | —            | Фильтр по одному тегу                                       |
| tagIds          | UUID[]            | —            | Фильтр по нескольким тегам (статьи с любым из тегов)        |
| organizationId  | UUID              | —            | Фильтр по организации                                       |
| publishedAfter  | string (ISO 8601) | —            | Опубликовано после                                          |
| publishedBefore | string (ISO 8601) | —            | Опубликовано до                                             |
| minReadingTime  | number            | —            | Минимальное время чтения (мин, ≥ 1)                         |
| maxReadingTime  | number            | —            | Максимальное время чтения (мин, ≥ 1)                        |
| sortBy          | enum              | publishedAt  | createdAt, publishedAt, likesCount, viewsCount, readingTime |
| sortOrder       | enum              | desc         | asc, desc                                                   |

---

## Аутентификация

| Метод | Path                          | Описание                   |
| ----- | ----------------------------- | -------------------------- |
| POST  | `/auth/user/register`         | Регистрация пользователя   |
| POST  | `/auth/user/login`            | Вход пользователя          |
| POST  | `/auth/organization/register` | Регистрация организации    |
| POST  | `/auth/organization/login`    | Вход организации           |
| POST  | `/auth/member/login`          | Вход участника организации |
| POST  | `/auth/superadmin/login`      | Вход супер-админа          |
| GET   | `/auth/google`                | OAuth Google (редирект)    |
| GET   | `/auth/google/callback`       | Callback Google            |
| GET   | `/auth/linkedin`              | OAuth LinkedIn (редирект)  |
| GET   | `/auth/linkedin/callback`     | Callback LinkedIn          |
| POST  | `/auth/refresh`               | Обновить токен             |
| POST  | `/auth/logout`                | Выход                      |

### DTO: RegisterUserDto (Body POST auth/user/register)

| Поле      | Тип            | Обязательное | Описание                        |
| --------- | -------------- | ------------ | ------------------------------- |
| email     | string (email) | да           | Email                           |
| password  | string         | да           | Пароль (мин. длина по правилам) |
| firstName | string         | нет          | Имя                             |
| lastName  | string         | нет          | Фамилия                         |

### DTO: LoginDto (Body POST auth/\*/login)

| Поле     | Тип            | Обязательное | Описание |
| -------- | -------------- | ------------ | -------- |
| email    | string (email) | да           | Email    |
| password | string         | да           | Пароль   |

### DTO: RegisterOrganizationDto (Body POST auth/organization/register)

| Поле        | Тип            | Обязательное | Описание          |
| ----------- | -------------- | ------------ | ----------------- |
| email       | string (email) | да           | Email             |
| password    | string         | да           | Пароль            |
| name        | string         | да           | Имя представителя |
| companyName | string         | да           | Название компании |
| inn         | string         | нет          | ИНН               |
| description | string         | нет          | Описание          |
| phone       | string         | нет          | Телефон           |
| address     | string         | нет          | Адрес             |
| website     | string         | нет          | Веб-сайт          |

### DTO: MemberLoginDto (Body POST auth/member/login)

| Поле           | Тип            | Обязательное | Описание                 |
| -------------- | -------------- | ------------ | ------------------------ |
| email          | string (email) | да           | Email участника          |
| password       | string         | да           | Пароль                   |
| organizationId | UUID           | да           | ID организации (или инн) |

### DTO: RefreshTokenDto (Body POST auth/refresh)

| Поле         | Тип    | Обязательное | Описание      |
| ------------ | ------ | ------------ | ------------- |
| refreshToken | string | да           | Refresh token |

### Ответ: TokensResponseDto

| Поле         | Тип    | Описание                                |
| ------------ | ------ | --------------------------------------- |
| accessToken  | string | JWT access token                        |
| refreshToken | string | Refresh token                           |
| isNewUser    | boolean | Флаг нового OAuth-аккаунта             |
| isOnboardingCompleted | boolean | Флаг завершенного онбординга |
| emailVerificationRequired | boolean | Нужно ли подтвердить email |

---

## Смена пароля и сессии (требуется JWT)

| Метод  | Path                    | Описание                           |
| ------ | ----------------------- | ---------------------------------- |
| PATCH  | `/auth/change-password` | Сменить пароль                     |
| GET    | `/auth/sessions`        | Список сессий                      |
| DELETE | `/auth/sessions/:id`    | Завершить сессию                   |
| DELETE | `/auth/sessions`        | Завершить все сессии кроме текущей |

### DTO: ChangePasswordDto (Body PATCH auth/change-password)

| Поле            | Тип    | Описание       |
| --------------- | ------ | -------------- |
| currentPassword | string | Текущий пароль |
| newPassword     | string | Новый пароль   |

---

## Верификация (коды, сброс пароля, смена email)

| Метод | Path                                 | Описание                  |
| ----- | ------------------------------------ | ------------------------- |
| POST  | `/verification/send-code`            | Отправить код             |
| POST  | `/verification/verify-email`         | Подтвердить email         |
| POST  | `/verification/reset-password`       | Сброс пароля              |
| POST  | `/verification/resend-code`          | Переотправить код         |
| POST  | `/verification/change-email/request` | Запрос смены email        |
| POST  | `/verification/change-email/confirm` | Подтверждение смены email |

### DTO: SendVerificationCodeDto (Body POST send-code)

| Поле     | Тип            | Обязательное | Описание                                         |
| -------- | -------------- | ------------ | ------------------------------------------------ |
| email    | string (email) | да           | Email                               |
| type     | enum           | да           | EMAIL_VERIFICATION, PASSWORD_RESET |

### DTO: VerifyCodeDto (Body POST verify-email)

| Поле     | Тип            | Описание                   |
| -------- | -------------- | -------------------------- |
| email | string (email) | Email         |
| code  | string         | 6-значный код |

### DTO: ResetPasswordDto (Body POST reset-password)

| Поле        | Тип            | Описание                   |
| ----------- | -------------- | -------------------------- |
| email       | string (email) | Email         |
| code        | string         | Код из письма |
| newPassword | string         | Новый пароль  |

### DTO: ResendCodeDto (Body POST resend-code)

| Поле     | Тип            | Описание                   |
| -------- | -------------- | -------------------------- |
| email | string (email) | Email    |
| type  | enum           | Тип кода |

### DTO: ChangeEmailRequestDto (Body POST change-email/request)

| Поле     | Тип            | Описание       |
| -------- | -------------- | -------------- |
| newEmail        | string (email) | Новый email    |
| currentPassword | string         | Текущий пароль |

### DTO: ChangeEmailConfirmDto (Body POST change-email/confirm)

| Поле     | Тип            | Описание                    |
| -------- | -------------- | --------------------------- |
| code | string | Код из письма |
