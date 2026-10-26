# Аудит: API организатора и подключение к UI

Проверка, какие эндпоинты из [API_ORGANIZER.md](./API_ORGANIZER.md) подключены к кнопкам или flow.

---

## Подключено к UI

| API                                                                         | Где используется                                                                                                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Организация**                                                             |                                                                                                                                                                                   |
| GET/PATCH `/workspace/me`                                                   | authService → профиль организации, настройки                                                                                                                                      |
| POST/DELETE `/workspace/me/logo`                                            | authService → профиль, настройки (кнопки загрузки/удаления логотипа)                                                                                                              |
| **Участники (members)**                                                     |                                                                                                                                                                                   |
| GET/PATCH `/workspace/members/me`, avatar, privacy, permissions             | memberService → профиль участника                                                                                                                                                 |
| POST/GET/PATCH/DELETE members, resend-invitation, **activate**, permissions | organizationsService → страница «Пользователи»; **POST activate** → публичная страница `/invite/activate?token=...` (ActivateMemberPage)                                          |
| **Роли**                                                                    |                                                                                                                                                                                   |
| GET `/organizations/roles`                                                  | useRolesQuery → выбор роли при создании/редактировании сотрудника                                                                                                                 |
| GET `/permissions`                                                          | usePermissionsQuery → редактор прав                                                                                                                                               |
| **Дашборд**                                                                 |                                                                                                                                                                                   |
| GET dashboard/stats, dashboard/activity                                     | useOrganizerDashboardStatsQuery, useOrganizerDashboardActivityQuery → страница «Панель»                                                                                           |
| **События**                                                                 | CRUD, submit-review, cancel, complete, regenerate-invite-code → страница события, действия                                                                                        |
| **Регистрации**                                                             | getRegistrations, getRegistration, exportRegistrations, approve, reject, bulkApprove, bulkReject → вкладка «Участники» (кнопки «Одобрить»/«Отклонить», выбор и массовые действия) |
| **Посещаемость**                                                            | getAttendance, getAttendanceStats → вкладка «Посещаемость»; check-in (checkInByCode) → страница Check-in                                                                          |
| **Сертификаты (под событием)**                                              | eventsService.generateCertificates → действия события                                                                                                                             |
| **Билеты (под событием)**                                                   | getTicket, downloadAllTickets → вкладка «Участники», меню скачивания билетов                                                                                                      |
| **Подписчики**                                                              | getFollowers, getFollowersStats → страница «Подписчики»                                                                                                                           |
| **Заявки на связь**                                                         | getContacts, getContactsStats, updateContactStatus → страница «Заявки на связь»                                                                                                   |
| **Блог**                                                                    | blogPostsService (create, getAll, getById, update, delete, submit, unpublish) → «Мой блог»                                                                                        |
| **Доски и задачи**                                                          | boardsService, tasksService → страницы досок и задач                                                                                                                              |

---

## Не подключено к UI

| API                                                                   | Рекомендация                                                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **POST `/workspace/me/complete-onboarding`**                          | Кнопка или автоматический вызов после заполнения профиля организации (профиль/онбординг).                                             |
| **POST `/workspace/members/me/complete-onboarding`**                  | Аналогично для участника — после первого входа или заполнения профиля.                                                                |
| **DELETE `/workspace/me`**                                            | Удаление организации — кнопка в настройках/безопасности с подтверждением.                                                             |
| ~~POST `/organizations/members/activate`~~                            | **Подключено:** страница `/invite/activate?token=...` (ActivateMemberPage), useActivateMember.                                        |
| ~~Одобрить/отклонить регистрацию~~                                    | **Подключено:** кнопки «Одобрить»/«Отклонить» вызывают useApproveRegistration / useRejectRegistration; диалог отклонения с причиной.  |
| ~~Массовое одобрение/отклонение~~                                     | **Подключено:** чекбоксы у PENDING, панель «Одобрить выбранные»/«Отклонить выбранные» и диалог причины для массового отклонения.      |
| **POST/ PATCH/DELETE `/organizations/roles`**                         | Нет UI управления ролями (создание/редактирование/удаление ролей). Только чтение ролей при создании сотрудника.                       |
| **organizerCertificatesService** (GET/POST `/certificates`, download) | Плоские пути сертификатов не используются; используется генерация под событием. При необходимости — отдельная страница «Сертификаты». |
| **ticketsService** (event-scoped routes)                              | Подключено актуальное скачивание билетов под событием; старые плоские пути удалены из UI-кода.                                        |
| **useContactQuery / getContact(id)**                                  | Детальная заявка по ID не открывается; при необходимости — модальное окно/страница с деталями заявки.                                 |

---

## Итог

- **Подключено в этой задаче:** одобрение/отклонение и массовое одобрение/отклонение регистраций на вкладке «Участники» события (кнопки, диалоги с причиной, чекбоксы для выбора).
- **По желанию:** completeOnboarding (орг/участник), страница активации участника, удаление организации, CRUD ролей, деталь заявки, страница сертификатов.
