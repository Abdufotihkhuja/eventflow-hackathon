# API: Пользователь (USER)

Префикс: **`/api/v1`**. Доступ: JWT для пользовательского account actor.

---

## Профиль и настройки

| Метод  | Path                              | Описание                     |
| ------ | --------------------------------- | ---------------------------- |
| GET    | `/account/me`                     | Текущий пользователь         |
| PATCH  | `/account/me`                     | Обновить профиль             |
| POST   | `/account/me/avatar`              | Загрузить аватар (multipart) |
| DELETE | `/account/me/avatar`              | Удалить аватар               |
| PATCH  | `/account/me/privacy`             | Настройки приватности        |
| POST   | `/account/me/complete-onboarding` | Завершить онбординг          |
| GET    | `/account/me/export`              | Экспорт данных               |
| DELETE | `/account/me`                     | Удалить аккаунт              |

### DTO: UpdateUserProfileDto (Body PATCH me)

| Поле      | Тип              | Описание                   |
| --------- | ---------------- | -------------------------- |
| firstName | string           | Имя (макс. 100)            |
| lastName  | string           | Фамилия (макс. 100)        |
| phone     | string (телефон) | Телефон                    |
| location  | string           | Местоположение (макс. 200) |
| bio       | string           | О себе (макс. 2000)        |

### DTO: UpdatePrivacySettingsDto (Body PATCH me/privacy)

| Поле            | Тип     | Описание           |
| --------------- | ------- | ------------------ |
| isPublicProfile | boolean | Публичный профиль  |
| showEmail       | boolean | Показывать email   |
| showPhone       | boolean | Показывать телефон |

---

## Календарь и события пользователя

| Метод | Path                          | Описание                  |
| ----- | ----------------------------- | ------------------------- |
| GET   | `/account/me/calendar`        | Календарь (месяц)         |
| GET   | `/account/me/calendar/events` | События календаря         |
| GET   | `/account/me/events`          | Мои события (регистрации) |
| GET   | `/account/me/events/stats`    | Статистика по событиям    |

### Query: CalendarQueryDto (GET me/calendar)

| Поле  | Тип    | Обязательное | Описание                                                |
| ----- | ------ | ------------ | ------------------------------------------------------- |
| year  | number | да           | Год (2020–2100)                                         |
| month | number | да           | Месяц (1–12)                                            |
| role  | enum   | нет          | PARTICIPANT, SPEAKER, MENTOR — фильтр по роли участника |

### Query: CalendarEventsQueryDto (GET me/calendar/events)

| Поле | Тип               | Обязательное | Описание                                                |
| ---- | ----------------- | ------------ | ------------------------------------------------------- |
| date | string (ISO Date) | да           | Дата в формате YYYY-MM-DD                               |
| role | enum              | нет          | PARTICIPANT, SPEAKER, MENTOR — фильтр по роли участника |

### Query: UserEventsQueryDto (GET me/events)

| Поле   | Тип    | По умолчанию | Описание                                    |
| ------ | ------ | ------------ | ------------------------------------------- |
| page   | number | 1            | Страница                                    |
| limit  | number | 10           | На странице                                 |
| filter | enum   | ALL          | ALL, APPROVED, PENDING, ATTENDED, CANCELLED |
| search | string | —            | Поиск по названию события                   |

---

## Сертификаты и статьи

| Метод | Path                             | Описание                |
| ----- | -------------------------------- | ----------------------- |
| GET   | `/account/me/certificates`       | Мои сертификаты         |
| GET   | `/account/me/certificates/stats` | Статистика сертификатов |

### Query: GET account/me/certificates

| Поле   | Тип                            | Описание                                                                 |
| ------ | ------------------------------ | ------------------------------------------------------------------------ |
| search | string                         | Поиск по названию/провайдеру                                             |
| filter | enum                           | all — все, verified — верифицированные, unverified — не верифицированные |
| GET    | `/account/me/certificates/:id` | Сертификат по ID                                                         |
| POST   | `/account/me/certificates`     | Добавить сертификат                                                      |
| PATCH  | `/account/me/certificates/:id` | Обновить сертификат                                                      |
| DELETE | `/account/me/certificates/:id` | Удалить сертификат                                                       |
| GET    | `/account/me/articles`         | Сохранённые статьи                                                       |
| POST   | `/account/me/articles`         | Сохранить статью                                                         |
| GET    | `/account/me/articles/check`   | Проверка сохранения по URL                                               |
| DELETE | `/account/me/articles/:id`     | Удалить из сохранённых                                                   |
| DELETE | `/account/me/articles`         | Удалить по URL (query: url)                                              |

### Query: GET account/me/articles (сохранённые статьи)

| Поле     | Тип    | Описание            |
| -------- | ------ | ------------------- |
| search   | string | Поиск               |
| category | string | Фильтр по категории |

### Query: GET account/me/articles/check

| Поле | Тип    | Описание                |
| ---- | ------ | ----------------------- |
| url  | string | URL статьи для проверки |

### Query: DELETE account/me/articles (по URL)

| Поле | Тип    | Описание                |
| ---- | ------ | ----------------------- |
| url  | string | URL статьи для удаления |

### DTO: CreateUserCertificateDto (Body POST me/certificates)

| Поле           | Тип               | Обязательное | Описание                 |
| -------------- | ----------------- | ------------ | ------------------------ |
| title          | string            | да           | Название сертификата     |
| provider       | string            | да           | Провайдер/академия       |
| description    | string            | нет          | Описание программы       |
| issueDate      | string (ISO Date) | да           | Дата выдачи              |
| expiryDate     | string (ISO Date) | нет          | Дата истечения           |
| trainingHours  | number            | нет          | Часов обучения           |
| credentialId   | string            | нет          | Уникальный идентификатор |
| credentialUrl  | string            | нет          | Ссылка для проверки      |
| certificateUrl | string            | нет          | Ссылка на PDF            |
| skills         | string[]          | нет          | Массив навыков           |
| isVerified     | boolean           | нет          | Верифицирован ли         |
| color          | string            | нет          | Цвет карточки (HEX)      |

### DTO: UpdateUserCertificateDto (Body PATCH me/certificates/:id)

Все поля опциональны (PartialType(CreateUserCertificateDto)).

### DTO: SaveArticleDto (Body POST me/articles)

| Поле        | Тип          | Обязательное | Описание           |
| ----------- | ------------ | ------------ | ------------------ |
| articleUrl  | string       | да           | Ссылка на статью   |
| title       | string       | да           | Заголовок          |
| excerpt     | string       | нет          | Краткое описание   |
| coverImage  | string       | нет          | Обложка            |
| category    | string       | нет          | Категория          |
| publishedAt | string (ISO) | нет          | Дата публикации    |
| readingTime | number       | нет          | Время чтения (мин) |
| authorName  | string       | нет          | Автор              |

---

## Организаторы и подписки

| Метод  | Path                                | Описание                       |
| ------ | ----------------------------------- | ------------------------------ |
| GET    | `/organizations/:id/public`         | Публичный профиль организатора |
| POST   | `/organizations/:id/follow`         | Подписаться на организатора    |
| DELETE | `/organizations/:id/unfollow`       | Отписаться                     |
| GET    | `/organizations/:id/is-following`   | Проверить подписку             |
| GET    | `/account/me/following-organizations` | Мои подписки на организаторов  |

### Query: GET account/me/following-organizations

| Поле  | Тип    | Описание    |
| ----- | ------ | ----------- |
| page  | number | Страница    |
| limit | number | На странице |

---

## Заявка на связь с организатором

| Метод | Path                         | Описание                 |
| ----- | ---------------------------- | ------------------------ |
| POST  | `/organizations/:id/contact` | Оставить заявку на связь |

### DTO: CreateContactRequestDto (Body POST organizations/:id/contact)

| Поле    | Тип    | Обязательное | Описание                       |
| ------- | ------ | ------------ | ------------------------------ |
| phone   | string | да           | Телефон (международный формат) |
| message | string | нет          | Сообщение для организатора     |

---

## События (каталог)

| Метод | Path                               | Описание             |
| ----- | ---------------------------------- | -------------------- |
| GET   | `/events/organizations/:id/events` | События организатора |

### Query: OrganizationEventsQueryDto (GET events/organizations/:id/events)

| Поле   | Тип    | По умолчанию | Описание            |
| ------ | ------ | ------------ | ------------------- |
| page   | number | 1            | Страница            |
| limit  | number | 10           | На странице (1–100) |
| status | enum   | —            | upcoming, past      |

---

## Регистрации на события

| Метод | Path                        | Описание                          |
| ----- | --------------------------- | --------------------------------- |
| POST  | `/events/:eventId/register` | Зарегистрироваться на мероприятие |
| GET   | `/my-registrations`         | Мои регистрации                   |
| PATCH | `/registrations/:id/cancel` | Отменить свою регистрацию         |
| PATCH | `/registrations/:id`        | Обновить регистрацию              |

### DTO: CreateRegistrationDto (Body POST events/:eventId/register)

| Поле            | Тип               | Обязательное | Описание                                                |
| --------------- | ----------------- | ------------ | ------------------------------------------------------- |
| answers         | AnswerDto[]       | нет          | Ответы на вопросы регистрации                           |
| role            | enum              | нет          | PARTICIPANT, SPEAKER, MENTOR (по умолчанию PARTICIPANT) |
| travelStartDate | string (ISO Date) | нет          | Дата начала перелёта/дороги                             |
| travelEndDate   | string (ISO Date) | нет          | Дата окончания перелёта/дороги                          |
| preparationDays | number            | нет          | Дни на подготовку (0–30)                                |

**AnswerDto:** `{ questionId: UUID, answer: string }`

Для событий INVITE_ONLY передать `inviteCode` в query: `?inviteCode=...`

### DTO: UpdateRegistrationDto (Body PATCH registrations/:id)

| Поле            | Тип                       | Описание                     |
| --------------- | ------------------------- | ---------------------------- |
| role            | enum                      | PARTICIPANT, SPEAKER, MENTOR |
| travelStartDate | string (ISO Date) \| null | Дата начала перелёта         |
| travelEndDate   | string (ISO Date) \| null | Дата окончания перелёта      |
| preparationDays | number                    | Дни на подготовку (0–30)     |

### Query: MyRegistrationsQueryDto (GET my-registrations)

| Поле   | Тип    | По умолчанию | Описание                                    |
| ------ | ------ | ------------ | ------------------------------------------- |
| page   | number | 1            | Страница                                    |
| limit  | number | 10           | На странице                                 |
| filter | enum   | ALL          | ALL, APPROVED, PENDING, ATTENDED, CANCELLED |
| search | string | —            | Поиск по названию события                   |

---

## Сохранённые мероприятия

| Метод  | Path                                      | Описание               |
| ------ | ----------------------------------------- | ---------------------- |
| POST   | `/account/me/saved-events/:eventId`       | Сохранить мероприятие  |
| DELETE | `/account/me/saved-events/:eventId`       | Убрать из сохранённых  |
| GET    | `/account/me/saved-events`                | Список сохранённых     |
| GET    | `/account/me/saved-events/:eventId/check` | Проверка, сохранено ли |

### Query: SavedEventsQueryDto (GET account/me/saved-events)

| Поле  | Тип    | По умолчанию | Описание    |
| ----- | ------ | ------------ | ----------- |
| page  | number | 1            | Страница    |
| limit | number | 10           | На странице |

---

## Комментарии к событиям

| Метод | Path                        | Описание             |
| ----- | --------------------------- | -------------------- |
| POST  | `/events/:eventId/comments` | Добавить комментарий |
| GET   | `/events/:eventId/comments` | Комментарии события  |

### Query: CommentQueryDto (GET events/:eventId/comments)

| Поле  | Тип    | По умолчанию | Описание    |
| ----- | ------ | ------------ | ----------- |
| page  | number | 1            | Страница    |
| limit | number | 20           | На странице |

| PATCH | `/events/:eventId/comments/:id` | Обновить комментарий |
| DELETE | `/events/:eventId/comments/:id` | Удалить комментарий |
| POST | `/events/:eventId/comments/:id/like` | Лайк/дизлайк комментария |

### DTO: CreateEventCommentDto (Body POST comments)

| Поле     | Тип    | Обязательное | Описание                             |
| -------- | ------ | ------------ | ------------------------------------ |
| content  | string | да           | Текст комментария                    |
| parentId | UUID   | нет          | ID родительского комментария (ответ) |

### DTO: UpdateEventCommentDto (Body PATCH comments/:id)

| Поле    | Тип    | Описание          |
| ------- | ------ | ----------------- |
| content | string | Текст комментария |

### Body: like (POST comments/:id/like)

| Поле   | Тип     | Описание                     |
| ------ | ------- | ---------------------------- |
| isLike | boolean | true = лайк, false = дизлайк |

---

## Спикеры (приглашения)

| Метод | Path                      | Описание                                 |
| ----- | ------------------------- | ---------------------------------------- |
| GET   | `/events/speakers/:token` | Страница приглашения спикера (по токену) |
| POST  | `/events/speakers/accept` | Принять приглашение спикера              |
| POST  | `/events/speakers/reject` | Отклонить приглашение спикера            |

Body для accept/reject обычно содержит токен или идентификатор приглашения (см. DTO в модуле speakers).

---

## Блог (лайки, комментарии, сохранённое)

| Метод  | Path                                         | Описание              |
| ------ | -------------------------------------------- | --------------------- |
| POST   | `/blog/:postId/like`                         | Лайк статьи           |
| DELETE | `/blog/:postId/like`                         | Убрать лайк           |
| GET    | `/blog/:postId/like/check`                   | Проверка лайка        |
| POST   | `/account/me/saved-blog-posts/:postId`       | Сохранить статью      |
| DELETE | `/account/me/saved-blog-posts/:postId`       | Убрать из сохранённых |
| GET    | `/account/me/saved-blog-posts`               | Сохранённые статьи    |
| GET    | `/account/me/saved-blog-posts/:postId/check` | Проверка сохранения   |
| POST   | `/blog/:postId/comments`                     | Комментарий к статье  |
| GET    | `/blog/:postId/comments`                     | Комментарии статьи    |
| PATCH  | `/blog/:postId/comments/:commentId`          | Обновить комментарий  |
| DELETE | `/blog/:postId/comments/:commentId`          | Удалить комментарий   |
| POST   | `/blog/:postId/comments/:commentId/like`     | Лайк комментария      |

### Query: BlogCommentsQueryDto (GET blog/:postId/comments)

| Поле  | Тип    | По умолчанию | Описание            |
| ----- | ------ | ------------ | ------------------- |
| page  | number | 1            | Страница            |
| limit | number | 20           | На странице (1–100) |

### DTO: CreateBlogCommentDto (Body POST blog/:postId/comments)

| Поле     | Тип    | Обязательное | Описание                     |
| -------- | ------ | ------------ | ---------------------------- |
| content  | string | да           | Текст комментария            |
| parentId | UUID   | нет          | ID родительского комментария |

### DTO: UpdateBlogCommentDto (Body PATCH comments/:commentId)

| Поле    | Тип    | Описание          |
| ------- | ------ | ----------------- |
| content | string | Текст комментария |

### Body: like комментария (POST :commentId/like)

| Поле   | Тип     | Описание                     |
| ------ | ------- | ---------------------------- |
| isLike | boolean | true = лайк, false = дизлайк |

### Query: SavedBlogPostsQueryDto (GET account/me/saved-blog-posts)

| Поле  | Тип    | По умолчанию | Описание    |
| ----- | ------ | ------------ | ----------- |
| page  | number | 1            | Страница    |
| limit | number | 10           | На странице |

---

## Билеты

| Метод | Path                       | Описание                       |
| ----- | -------------------------- | ------------------------------ |
| GET   | `/tickets/:id/ticket`      | Получить свой билет по событию |
| GET   | `/tickets/:registrationId` | Билет по регистрации           |
| POST  | `/tickets/download-all`    | Скачать свои билеты по событию |

### Query: GenerateTicketDto (GET tickets/:id/ticket, GET tickets/:registrationId)

| Поле   | Тип  | По умолчанию | Описание                                 |
| ------ | ---- | ------------ | ---------------------------------------- |
| design | enum | branded      | branded — с обложкой, simple — белый фон |

### Body: download-all (POST tickets/download-all)

| Поле    | Тип  | Описание   |
| ------- | ---- | ---------- |
| eventId | UUID | ID события |
