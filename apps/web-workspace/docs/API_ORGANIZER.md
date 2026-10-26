# API: Организатор и участник организации (ORGANIZATION / MEMBER)

Префикс: **`/api/v1`**. Доступ: JWT для organization/member actor. Для событий/регистраций/досок нужны права (PermissionsGuard).

---

## Организация

| Метод  | Path                                | Роль        | Описание                      |
| ------ | ----------------------------------- | ----------- | ----------------------------- |
| GET    | `/workspace/me`                     | ORG, MEMBER | Текущая организация           |
| PATCH  | `/workspace/me`                     | ORG         | Обновить организацию          |
| POST   | `/workspace/me/logo`                | ORG         | Загрузить логотип (multipart) |
| DELETE | `/workspace/me/logo`                | ORG         | Удалить логотип               |
| POST   | `/workspace/me/complete-onboarding` | ORG         | Завершить онбординг           |
| DELETE | `/workspace/me`                     | ORG         | Удалить организацию (soft)    |

### DTO: UpdateOrganizationDto (Body PATCH me)

| Поле             | Тип          | Описание                       |
| ---------------- | ------------ | ------------------------------ |
| organizationName | string       | Название (макс. 200)           |
| inn              | string       | ИНН (1–20 символов)            |
| description      | string       | Описание (макс. 2000)          |
| phone            | string       | Телефон (международный формат) |
| address          | string       | Адрес (макс. 500)              |
| website          | string (URL) | Веб-сайт                       |
| logoUrl          | string (URL) | Логотип                        |

---

## Участники организации (members)

| Метод  | Path                                                 | Описание                   |
| ------ | ---------------------------------------------------- | -------------------------- |
| GET    | `/workspace/members/me`                              | Профиль текущего участника |
| PATCH  | `/workspace/members/me`                              | Обновить профиль           |
| PATCH  | `/workspace/members/me/privacy`                      | Настройки приватности      |
| POST   | `/workspace/members/me/avatar`                       | Загрузить аватар           |
| DELETE | `/workspace/members/me/avatar`                       | Удалить аватар             |
| POST   | `/workspace/members/me/complete-onboarding`          | Завершить онбординг        |
| GET    | `/workspace/members/me/permissions`                  | Мои права                  |
| POST   | `/organizations/members`                             | Пригласить участника       |
| GET    | `/organizations/members`                             | Список участников          |
| GET    | `/organizations/members/:memberId`                   | Участник по ID             |
| PATCH  | `/organizations/members/:memberId`                   | Обновить участника         |
| DELETE | `/organizations/members/:memberId`                   | Удалить участника          |
| PATCH  | `/organizations/members/:memberId/permissions`       | Права участника            |
| POST   | `/organizations/members/:memberId/resend-invitation` | Переотправить приглашение  |
| POST   | `/organizations/members/activate`                    | Активация по токену        |

---

## Роли и права

| Метод  | Path                           | Описание      |
| ------ | ------------------------------ | ------------- |
| GET    | `/permissions`                 | Список прав   |
| POST   | `/organizations/roles`         | Создать роль  |
| GET    | `/organizations/roles`         | Список ролей  |
| GET    | `/organizations/roles/:roleId` | Роль по ID    |
| PATCH  | `/organizations/roles/:roleId` | Обновить роль |
| DELETE | `/organizations/roles/:roleId` | Удалить роль  |

---

## Дашборд

| Метод | Path                                | Описание            |
| ----- | ----------------------------------- | ------------------- |
| GET   | `/organizations/dashboard/stats`    | Статистика дашборда |
| GET   | `/organizations/dashboard/activity` | Активность          |

### Query: GET dashboard/activity

| Поле  | Тип    | По умолчанию | Описание                           |
| ----- | ------ | ------------ | ---------------------------------- |
| limit | number | 20           | Максимум записей за последние 24 ч |

---

## События (требуются права EVENTS\_\*)

| Метод  | Path                                 | Право         | Описание                                     |
| ------ | ------------------------------------ | ------------- | -------------------------------------------- |
| POST   | `/events`                            | EVENTS_CREATE | Создать мероприятие                          |
| GET    | `/events`                            | EVENTS_READ   | Список мероприятий организации               |
| GET    | `/events/:id`                        | EVENTS_READ   | Мероприятие по ID                            |
| PATCH  | `/events/:id`                        | EVENTS_UPDATE | Обновить мероприятие                         |
| DELETE | `/events/:id`                        | EVENTS_DELETE | Удалить мероприятие                          |
| POST   | `/events/:id/submit-review`          | EVENTS_UPDATE | Отправить на модерацию                       |
| POST   | `/events/:id/cancel`                 | EVENTS_UPDATE | Отменить мероприятие                         |
| POST   | `/events/:id/complete`               | EVENTS_UPDATE | Завершить мероприятие                        |
| POST   | `/events/:id/regenerate-invite-code` | EVENTS_UPDATE | Регенерировать код приглашения               |
| GET    | `/events/:id/invite-link`            | EVENTS_READ   | Ссылка и код приглашения (INVITE_ONLY)       |
| POST   | `/events/:id/send-invitation`        | EVENTS_UPDATE | Отправить приглашение на email (INVITE_ONLY) |

### DTO: CreateEventDto (Body POST events)

| Поле                 | Тип               | Обязательное | Описание                           |
| -------------------- | ----------------- | ------------ | ---------------------------------- |
| title                | string            | да           | Название (макс. 200)               |
| description          | BlockNote JSON    | нет          | Описание (ограничения в коде)      |
| shortDescription     | string            | нет          | Краткое описание (макс. 500)       |
| coverImage           | string            | нет          | URL обложки                        |
| type                 | enum              | да           | FREE, PAID                         |
| accessType           | enum              | нет          | OPEN, REQUEST, INVITE_ONLY         |
| format               | enum              | да           | ONLINE, OFFLINE, HYBRID            |
| startDate            | string (ISO 8601) | да           | Начало                             |
| endDate              | string (ISO 8601) | да           | Конец                              |
| registrationDeadline | string (ISO 8601) | нет          | Дедлайн регистрации                |
| venue                | string            | нет          | Место (макс. 200)                  |
| address              | string            | нет          | Адрес (макс. 500)                  |
| city                 | string            | нет          | Город (макс. 100)                  |
| onlineUrl            | string (URL)      | нет          | Ссылка для онлайн                  |
| price                | number            | нет          | Цена (≥ 0)                         |
| currency             | enum              | нет          | RUB, USD, EUR, UZS                 |
| maxParticipants      | number            | нет          | Лимит участников (≥ 1)             |
| registrationMode     | enum              | нет          | QUESTIONS, TEST                    |
| testEvaluationType   | enum              | нет          | AUTO_REJECT, EVALUATION (при TEST) |
| minTestScore         | number            | нет          | Мин. балл теста (при TEST)         |
| commentsEnabled      | boolean           | нет          | Комментарии (по умолчанию true)    |
| categoryId           | UUID              | нет          | ID категории события               |

### DTO: UpdateEventDto (Body PATCH events/:id)

Все поля опциональны (PartialType(CreateEventDto)).

### Query: EventQueryDto (GET events)

| Поле           | Тип          | По умолчанию | Описание                                               |
| -------------- | ------------ | ------------ | ------------------------------------------------------ |
| page           | number       | 1            | Страница                                               |
| limit          | number       | 10           | На странице                                            |
| status         | enum         | —            | DRAFT, PENDING_REVIEW, PUBLISHED, CANCELLED, COMPLETED |
| type           | enum         | —            | FREE, PAID                                             |
| accessType     | enum         | —            | OPEN, REQUEST, INVITE_ONLY                             |
| format         | enum         | —            | ONLINE, OFFLINE, HYBRID                                |
| search         | string       | —            | Поиск по названию/краткому описанию                    |
| city           | string       | —            | Город                                                  |
| dateFrom       | string (ISO) | —            | Начало периода                                         |
| dateTo         | string (ISO) | —            | Конец периода                                          |
| organizationId | string       | —            | ID организатора                                        |
| tags           | string       | —            | Теги (slugs через запятую)                             |
| categoryId     | UUID         | —            | ID категории                                           |
| categorySlug   | string       | —            | Slug категории                                         |
| collectionId   | UUID         | —            | ID подборки                                            |

---

## События: спикеры, вопросы, программа, теги

| Метод  | Path                                                     | Описание                    |
| ------ | -------------------------------------------------------- | --------------------------- |
| POST   | `/events/:eventId/speakers`                              | Добавить спикера            |
| GET    | `/events/:eventId/speakers`                              | Список спикеров             |
| PATCH  | `/events/:eventId/speakers/reorder`                      | Порядок спикеров            |
| PATCH  | `/events/:eventId/speakers/:id`                          | Обновить спикера            |
| DELETE | `/events/:eventId/speakers/:id`                          | Удалить спикера             |
| POST   | `/events/:eventId/speakers/invite`                       | Пригласить спикера          |
| POST   | `/events/:eventId/speakers/:speakerId/resend-invitation` | Переотправить приглашение   |
| POST   | `/events/:eventId/questions`                             | Добавить вопрос регистрации |
| GET    | `/events/:eventId/questions`                             | Вопросы регистрации         |
| PATCH  | `/events/:eventId/questions/reorder`                     | Порядок вопросов            |
| PATCH  | `/events/:eventId/questions/:id`                         | Обновить вопрос             |
| DELETE | `/events/:eventId/questions/:id`                         | Удалить вопрос              |
| POST   | `/events/:eventId/agenda`                                | Добавить пункт программы    |
| GET    | `/events/:eventId/agenda`                                | Пункты программы            |
| PATCH  | `/events/:eventId/agenda/reorder`                        | Порядок пунктов             |
| PATCH  | `/events/:eventId/agenda/:id`                            | Обновить пункт              |
| DELETE | `/events/:eventId/agenda/:id`                            | Удалить пункт               |
| POST   | `/events/:eventId/agenda/materials/upload`               | Загрузить материал          |
| POST   | `/events/:eventId/agenda/materials/upload-multiple`      | Загрузить несколько         |
| GET    | `/events/:eventId/agenda/materials`                      | Список материалов           |
| GET    | `/events/:eventId/agenda/materials/download`             | Скачать материал            |
| DELETE | `/events/:eventId/agenda/materials/:id`                  | Удалить материал            |

### Query: GET events/:eventId/agenda/materials/download

| Поле    | Тип                       | Обязательное               | Описание                           |
| ------- | ------------------------- | -------------------------- | ---------------------------------- |
| fileUrl | string                    | да                         | URL файла материала для скачивания |
| PUT     | `/events/:id/tags`        | Назначить теги мероприятию |
| POST    | `/organizations/tags`     | Создать кастомный тег      |
| GET     | `/organizations/tags`     | Теги организации           |
| DELETE  | `/organizations/tags/:id` | Удалить тег                |

---

## Регистрации на события (EVENTS_READ / EVENTS_UPDATE)

| Метод | Path                                          | Описание            |
| ----- | --------------------------------------------- | ------------------- |
| GET   | `/events/:eventId/registrations`              | Список регистраций  |
| GET   | `/events/:eventId/registrations/:id`          | Регистрация по ID   |
| PATCH | `/events/:eventId/registrations/:id/approve`  | Одобрить            |
| PATCH | `/events/:eventId/registrations/:id/reject`   | Отклонить           |
| POST  | `/events/:eventId/registrations/bulk-approve` | Массовое одобрение  |
| POST  | `/events/:eventId/registrations/bulk-reject`  | Массовое отклонение |

### Query: RegistrationQueryDto (GET registrations)

| Поле   | Тип    | По умолчанию | Описание                               |
| ------ | ------ | ------------ | -------------------------------------- |
| page   | number | 1            | Страница                               |
| limit  | number | 10           | На странице                            |
| status | enum   | —            | PENDING, APPROVED, REJECTED, CANCELLED |
| search | string | —            | Поиск по имени                         |

### DTO: RejectRegistrationDto (Body PATCH :id/reject)

| Поле   | Тип    | Описание                                    |
| ------ | ------ | ------------------------------------------- |
| reason | string | Причина отклонения (макс. 500, опционально) |

### Body: bulk-approve

| Поле | Тип             | Описание       |
| ---- | --------------- | -------------- |
| ids  | string[] (UUID) | ID регистраций |

### Body: bulk-reject

| Поле   | Тип             | Описание              |
| ------ | --------------- | --------------------- |
| ids    | string[] (UUID) | ID регистраций        |
| reason | string          | Причина (опционально) |

---

## Посещаемость, сертификаты, билеты

| Метод | Path                                | Описание                |
| ----- | ----------------------------------- | ----------------------- |
| GET   | `/registrations/:id/qr`             | QR для проверки         |
| POST  | `/attendance/check-in`              | Отметка присутствия     |
| GET   | `/events/:eventId/attendance`       | Список посещаемости     |
| GET   | `/events/:eventId/attendance/stats` | Статистика посещаемости |

### Query: AttendanceQueryDto (GET events/:eventId/attendance)

| Поле | Тип               | Описание                    |
| ---- | ----------------- | --------------------------- |
| date | string (ISO Date) | Фильтр по дате (YYYY-MM-DD) |

| POST | `/certificates/generate` | Сгенерировать сертификаты |
| GET | `/certificates` | Список сертификатов |
| GET | `/certificates/:id/download` | Скачать сертификат |
| GET | `/tickets/:id/ticket` | Получить билет по событию |
| GET | `/tickets/:registrationId` | Билет по регистрации |
| POST | `/tickets/download-all` | Скачать все билеты события |

### Query: GenerateTicketDto (GET tickets/:id/ticket, GET tickets/:registrationId)

| Поле   | Тип  | По умолчанию | Описание                                 |
| ------ | ---- | ------------ | ---------------------------------------- |
| design | enum | branded      | branded — с обложкой, simple — белый фон |

---

## Подписчики и заявки на связь

| Метод | Path                                 | Описание               |
| ----- | ------------------------------------ | ---------------------- |
| GET   | `/organizations/followers`           | Список подписчиков     |
| GET   | `/organizations/followers/stats`     | Статистика подписчиков |
| GET   | `/organizations/contacts`            | Заявки на связь        |
| GET   | `/organizations/contacts/stats`      | Статистика заявок      |
| GET   | `/organizations/contacts/:id`        | Заявка по ID           |
| PATCH | `/organizations/contacts/:id/status` | Обновить статус заявки |

### Query: FollowersQueryDto (GET organizations/followers)

| Поле   | Тип    | По умолчанию | Описание                    |
| ------ | ------ | ------------ | --------------------------- |
| page   | number | 1            | Страница                    |
| limit  | number | 10           | На странице (1–100)         |
| search | string | —            | Поиск по имени пользователя |

### Query: ContactRequestQueryDto (GET organizations/contacts)

| Поле   | Тип    | По умолчанию | Описание                                 |
| ------ | ------ | ------------ | ---------------------------------------- |
| page   | number | 1            | Страница                                 |
| limit  | number | 10           | На странице (1–100)                      |
| status | enum   | —            | NEW, IN_PROGRESS, CLOSED                 |
| search | string | —            | Поиск по имени пользователя или телефону |

---

## Блог организации

| Метод  | Path                        | Описание                  |
| ------ | --------------------------- | ------------------------- |
| POST   | `/blog-posts`               | Создать статью            |
| GET    | `/blog-posts`               | Список статей организации |
| GET    | `/blog-posts/:id`           | Статья по ID              |
| PATCH  | `/blog-posts/:id`           | Обновить статью           |
| DELETE | `/blog-posts/:id`           | Удалить статью            |
| POST   | `/blog-posts/:id/submit`    | Отправить на модерацию    |
| POST   | `/blog-posts/:id/unpublish` | Снять с публикации        |

### Query: OrganizationBlogPostsQueryDto (GET blog-posts)

| Поле      | Тип    | По умолчанию | Описание                                                    |
| --------- | ------ | ------------ | ----------------------------------------------------------- |
| page      | number | 1            | Страница                                                    |
| limit     | number | из констант  | На странице                                                 |
| search    | string | —            | Поиск по заголовку и описанию (макс. 100)                   |
| tagId     | UUID   | —            | Фильтр по тегу                                              |
| status    | enum   | —            | DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED                  |
| sortBy    | enum   | publishedAt  | createdAt, publishedAt, likesCount, viewsCount, readingTime |
| sortOrder | enum   | desc         | asc, desc                                                   |

---

## Доски (boards)

| Метод | Path      | Описание      |
| ----- | --------- | ------------- |
| POST  | `/boards` | Создать доску |
| GET   | `/boards` | Список досок  |

### Query: BoardQueryDto (GET boards)

| Поле       | Тип     | По умолчанию | Описание              |
| ---------- | ------- | ------------ | --------------------- |
| search     | string  | —            | Поиск по названию     |
| eventId    | UUID    | —            | Фильтр по мероприятию |
| isArchived | boolean | —            | Только архивированные |
| isFavorite | boolean | —            | Только избранные      |
| page       | number  | 1            | Страница              |
| limit      | number  | 10           | На странице (1–100)   |

| GET | `/boards/:id` | Доска по ID |
| GET | `/boards/:id/stats` | Статистика доски |
| PATCH | `/boards/:id` | Обновить доску |
| POST | `/boards/:id/favorite` | В избранное |
| POST | `/boards/:id/archive` | В архив |
| DELETE | `/boards/:id` | Удалить доску |
| POST | `/boards/:boardId/columns` | Создать колонку |
| GET | `/boards/:boardId/columns` | Колонки |
| PATCH | `/boards/:boardId/columns/reorder` | Порядок колонок |
| PATCH | `/boards/:boardId/columns/:id` | Обновить колонку |
| DELETE | `/boards/:boardId/columns/:id` | Удалить колонку |
| POST | `/boards/:boardId/tasks` | Создать задачу |
| GET | `/boards/:boardId/tasks` | Задачи |

### Query: TaskQueryDto (GET boards/:boardId/tasks)

| Поле        | Тип     | Описание                    |
| ----------- | ------- | --------------------------- |
| search      | string  | Поиск по названию           |
| columnId    | UUID    | Фильтр по колонке           |
| type        | enum    | STORY, TASK, BUG            |
| priority    | enum    | LOW, MEDIUM, HIGH, CRITICAL |
| assigneeId  | UUID    | Фильтр по исполнителю       |
| isCompleted | boolean | Только завершённые          |
| isOverdue   | boolean | Только просроченные         |

| GET | `/boards/:boardId/tasks/:id` | Задача по ID |
| PATCH | `/boards/:boardId/tasks/:id` | Обновить задачу |
| PATCH | `/boards/:boardId/tasks/:id/move` | Переместить задачу |
| POST | `/boards/:boardId/tasks/:id/assignees` | Назначить исполнителя |
| DELETE | `/boards/:boardId/tasks/:id/assignees/:memberId` | Снять исполнителя |
| DELETE | `/boards/:boardId/tasks/:id` | Удалить задачу |
| POST | `/boards/:boardId/tags` | Создать тег доски |
| GET | `/boards/:boardId/tags` | Теги доски |
| PATCH | `/boards/:boardId/tags/:id` | Обновить тег |
| DELETE | `/boards/:boardId/tags/:id` | Удалить тег |
| POST | `/boards/:boardId/members` | Добавить участника доски |
| GET | `/boards/:boardId/members` | Участники доски |
| PATCH | `/boards/:boardId/members/:memberId` | Роль участника |
| DELETE | `/boards/:boardId/members/:memberId` | Удалить участника |
| DELETE | `/boards/:boardId/members/leave` | Покинуть доску |
| POST | `/boards/:boardId/tasks/:taskId/comments` | Комментарий к задаче |
| GET | `/boards/:boardId/tasks/:taskId/comments` | Комментарии задачи |

### Query: GET boards/:boardId/tasks/:taskId/comments

| Поле  | Тип    | Описание    |
| ----- | ------ | ----------- |
| page  | number | Страница    |
| limit | number | На странице |

| PATCH | `/boards/:boardId/tasks/:taskId/comments/:id` | Обновить комментарий |
| DELETE | `/boards/:boardId/tasks/:taskId/comments/:id` | Удалить комментарий |
| POST | `/tasks/:taskId/checklists` | Создать чеклист |
| PATCH | `/tasks/:taskId/checklists/:checklistId` | Обновить чеклист |
| DELETE | `/tasks/:taskId/checklists/:checklistId` | Удалить чеклист |
| POST | `/checklists/:checklistId/items` | Добавить пункт чеклиста |
| PATCH | `/checklists/:checklistId/items/:itemId` | Обновить пункт |
| DELETE | `/checklists/:checklistId/items/:itemId` | Удалить пункт |
| GET | `/tasks/:taskId/activities` | Активность по задаче |
| GET | `/boards/:boardId/activities` | Активность по доске |

### Query: GET tasks/:taskId/activities и GET boards/:boardId/activities

| Поле  | Тип    | Описание    |
| ----- | ------ | ----------- |
| page  | number | Страница    |
| limit | number | На странице |

| POST | `/boards/:boardId/tasks/:taskId/attachments` | Вложение к задаче |
| GET | `/boards/:boardId/tasks/:taskId/attachments` | Вложения |
| DELETE | `/boards/:boardId/tasks/:taskId/attachments/:id` | Удалить вложение |

---

## Загрузки

| Метод  | Path                 | Описание                          |
| ------ | -------------------- | --------------------------------- |
| POST   | `/uploads/image`     | Загрузить изображение (multipart) |
| DELETE | `/uploads/:filename` | Удалить файл                      |
