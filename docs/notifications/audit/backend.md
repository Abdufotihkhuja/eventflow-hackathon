# Аудит 1.2 — Backend pipeline

Зона: `apps/api` (NestJS + Prisma/PostgreSQL + BullMQ), `apps/worker`, `packages/api-contracts`.
Ветка `stage`, дата 2026-08-01. Все пути — от корня репо.

---

## Таблица существующих уведомлений (все каналы)

### Канал in-app (модель `Notification`, лента организации)

Единственная точка записи — `NotificationsService.emit()` (`apps/api/src/modules/notifications/notifications.service.ts:36-54`), `prisma.notification.create` больше нигде не вызывается (grep по `apps/api/src`: только `notifications.service.ts`). `emit` никогда не бросает наружу — ошибка уходит в лог (`notifications.service.ts:31-34,48-53`). Аудитория всегда «вся организация»: `memberId` ни один вызов не передаёт (см. «Мёртвые» ниже).

| ID | Триггер | Код-точка | Аудитория | Канал | Шаблон/payload | Тайминг | Dedup | Deep link | Статус |
|----|---------|-----------|-----------|-------|----------------|---------|-------|-----------|--------|
| N-01 | Новая заявка на событие (`register`) | `apps/api/src/modules/registrations/registrations.service.ts:364-378` | Организация события | in-app | type `REGISTRATION_CREATED`, payload `{eventTitle, personName, pending}` | синхронно в запросе | нет | `entityType='event'`, `entityId=eventId` | работает |
| N-02 | Событие прошло модерацию (супер-админ) | `apps/api/src/modules/super-admin/super-admin.service.ts:1969-1976` | Организация | in-app | `EVENT_PUBLISHED`, `{eventTitle}` | синхронно | нет | `event`/`eventId` | работает |
| N-03 | Событие отклонено модерацией | `apps/api/src/modules/super-admin/super-admin.service.ts:2016-2023` | Организация | in-app | `EVENT_REJECTED`, `{eventTitle, reason}` | синхронно | нет | `event`/`eventId` | работает |
| N-04 | Сотрудник принял приглашение | `apps/api/src/modules/organizations/invites/invites.service.ts:361-372` | Организация | in-app | `MEMBER_JOINED`, `{personName}` | синхронно | нет | `member`/`memberId` | работает |
| N-05 | Организация верифицирована | `apps/api/src/modules/super-admin/super-admin.service.ts:1819-1822` | Организация | in-app | `ORG_VERIFIED`, без payload | синхронно | нет | нет (`entityType` не передан) | работает |
| N-06 | Верификация организации отклонена | `apps/api/src/modules/super-admin/super-admin.service.ts:1863-1867` | Организация | in-app | `ORG_VERIFICATION_REJECTED`, `{reason}` | синхронно | нет | нет | работает |

Dedup на in-app канале отсутствует полностью: повторный вызов создаёт вторую строку (единственная защита — идемпотентность вызывающих флоу, напр. `approveEvent` требует `PENDING_REVIEW`, `super-admin.service.ts:1996-2000` для reject).

### Канал email (nodemailer через BullMQ `mail.send`)

Все письма идут одним путём: `MailService.enqueueTemplateMail` (`apps/api/src/modules/mail/mail.service.ts:838-869`) → `MailDispatchService.enqueueTemplateMail` (`apps/api/src/modules/mail/application/mail-dispatch.service.ts:47-71`) → очередь `mail.send` (`apps/api/src/modules/platform/queue/queue.service.ts:166-185`) → worker (`apps/worker/src/index.ts:91-94`) → `POST /internal/jobs/mail/send` (`apps/api/src/modules/platform/internal-jobs/internal-jobs.controller.ts:28-31`) → `dispatchQueuedMail` → `mailerService.sendMail` (`mail-dispatch.service.ts:140-147`). Тайминг у всех — «немедленно после enqueue» (delay нигде не передаётся). Dedup = `idempotencyKey` (BullMQ jobId-хэш + Redis-ключ, см. «Механика»).

| ID | Триггер | Код-точка (вызов) | Аудитория | Шаблон | Dedup-ключ | Deep link в письме | Статус |
|----|---------|-------------------|-----------|--------|------------|--------------------|--------|
| E-01 | Регистрация участника / организации; повторная отправка кода | `apps/api/src/modules/auth/auth.service.ts:131,503`; `apps/api/src/modules/verification/verification.controller.ts:265` | пользователь/организация | `email-verification-code` | `email-verification:{email}:{code}` (`mail.service.ts:337`) | нет (код) | работает |
| E-02 | Запрос сброса пароля | `apps/api/src/modules/verification/verification.controller.ts:272` | пользователь | `password-reset-code` | `password-reset:{email}:{code}` (`mail.service.ts:358`) | нет | работает |
| E-03 | Запрос смены email | `apps/api/src/modules/verification/verification.controller.ts:177` | пользователь | `email-change-code` | `email-change:{email}:{code}` (`mail.service.ts:379`) | нет | работает |
| E-04 | Пароль изменён | `apps/api/src/modules/verification/verification.controller.ts:110` | пользователь | `password-changed-notification` | `password-changed:{email}:{минута}` (`mail.service.ts:399`) | нет | работает |
| E-05 | Email изменён (на старый адрес) | `apps/api/src/modules/verification/verification.controller.ts:210` | старый email | `email-changed-notification` | `email-changed:{old}:{new}:{минута}` (`mail.service.ts:428`) | нет | работает |
| E-06 | Приглашение в организацию | `apps/api/src/modules/organizations/invites/invites.service.ts:584` → `mail.service.ts:47-76` | приглашённый | `member-invitation` | `org-invite:{rawToken}` (`mail.service.ts:65`) | `/invite/accept?token=` (`mail.service.ts:57`) | работает |
| E-07 | Приглашение спикера (+resend) | `apps/api/src/modules/events/speakers/speakers.service.ts:221,410`; при resend токен регенерируется (`speakers.service.ts:392-402`) → новый ключ | спикер | `speaker-invitation` | `speaker-invitation:{token}` (`mail.service.ts:474`) | accept/reject URL (`mail.service.ts:466-467`) | работает; при сбое отправки спикер откатывается (`speakers.service.ts:230-235`) |
| E-08 | Приглашение на INVITE_ONLY событие | `apps/api/src/modules/events/events.service.ts:725` | получатель | `event-invitation` | `event-invitation:{inviteCode}:{email}` (`mail.service.ts:529`) | inviteLink | работает, но повторная отправка тому же email с тем же inviteCode дедупится 7 дней молча (TTL в «Механика») |
| E-09 | Регистрация создана (билет) | `apps/api/src/modules/registrations/registrations.service.ts:345` (fire-and-forget `void`) | участник | `registration-created` | `registration-created:{email}:{ticketNumber}` (`mail.service.ts:197`) | `/profile/tickets/{id}` (`registrations.service.ts:338-339`) | работает |
| E-10 | Организатор отменил участие | `apps/api/src/modules/registrations/registrations.service.ts:764` (через `notifyParticipantStatusChange`, `:736-780`) | участник | `registration-cancelled` | `registration-cancelled:{email}:{eventTitle}:{reason}` (`mail.service.ts:251`) | нет | работает |
| E-11 | Организатор отозвал подтверждение | `apps/api/src/modules/registrations/registrations.service.ts:772` | участник | `registration-revoked` | `registration-revoked:{email}:{eventTitle}:{reason}` (`mail.service.ts:277`) | нет | работает |
| E-12 | Ручная рассылка организатора участникам | `POST /events/:eventId/mail/send`, `apps/api/src/modules/mail/mail.controller.ts:58-73` → `mail.service.ts:81-151`; permission `EVENTS_UPDATE` (`mail.controller.ts:64`) | APPROVED-участники события (все или по `registrationIds`) | `event-notification` (категория `notification` → учитывает отписку) | `event-notification:{eventId}:{email}:{subject}:{message}` (`mail.service.ts:137`) | нет | работает; идентичный повтор рассылки дедупится 7 дней; `failed` в ответе всегда 0 (`mail.service.ts:128-150` — считает enqueue, не доставку) |
| E-13 | Заявка на связь / аренда площадки / биллинг-заявка | `apps/api/src/modules/organizations/contacts/contacts.service.ts:77,146`; `apps/api/src/modules/billing/orders/billing-requests.service.ts:131` (на `mail.supportEmail`) | организация-владелец / операторы | `contact-request` | `contact-request:{email}:{userName}:{phone}:{message}:{type}` (`mail.service.ts:573`) | `/contacts` (`mail.service.ts:563`) | работает |
| E-14 | Тариф скоро истекает (окна 14d/3d) | `apps/api/src/modules/billing/sweeps/billing-sweep.service.ts:42-65` (hourly sweep) | владелец организации | `plan-expiry-reminder` | `plan-expiry:{purchaseId}:{window}:{email}` (`mail.service.ts:613`) | `/settings/billing` (`mail.service.ts:618`) | работает; NB: TTL dedup 7 дней < интервала между окнами — повторов внутри окна нет, но окно `14d` может отправиться повторно через 7 дней (см. OPEN_QUESTIONS) |
| E-15 | Статья блога одобрена / отклонена | `apps/api/src/modules/super-admin/super-admin.service.ts:2176,2224` | организация | `blog-post-approved` / `blog-post-rejected` | `blog-post-approved:{postId}:{email}` / `...rejected...:{reason}` (`mail.service.ts:636,665`) | `/dashboard/blog/{id}` (`mail.service.ts:630,659`) | работает; in-app аналога нет |
| E-16 | Организация верифицирована / отклонена | `apps/api/src/modules/super-admin/super-admin.service.ts:1814,1857` | организация | `organization-approved` / `organization-rejected` | `organization-approved:{orgId}:{email}` / `...rejected...:{reason}` (`mail.service.ts:690,720`) | `/dashboard`, `/settings` (`mail.service.ts:694,725`) | работает |
| E-17 | Событие опубликовано / отклонено модерацией | `apps/api/src/modules/super-admin/super-admin.service.ts:1959,2008` | организация | `event-approved` / `event-rejected` | `event-approved:{eventId}:{email}` / `...rejected...:{reason}` (`mail.service.ts:755,790`) | public URL + `/my-events/{id}` (`mail.service.ts:761-762,797`) | работает |
| E-18 | Сертификат выдан | `apps/api/src/modules/certificates/application/certificate-generation.service.ts:473-490` (fire-and-forget `void`) | получатель сертификата | `certificate-issued` | `certificate-issued:{eventId}:{recipientKey}` (`certificate-generation.service.ts:478`) — регенерация не шлёт дубликаты (`mail.service.ts:803-807`) | `/profile/certificates` + verify URL (`certificate-generation.service.ts:480-489`) | работает |

### Канал SMS

Отсутствует. Провайдера нет — зафиксировано в коде: `apps/api/src/modules/billing/ads/ad-orders.service.ts:18` («SMS — P2 (провайдера нет)»). Ни одного sms-сервиса/вызова в `apps/api/src` (grep `sms` — единственное совпадение выше).

### Канал push

Отсутствует полностью, см. «Чего нет», п. 5.

---

## Мёртвые/недостижимые уведомления

1. **`MailService.sendRegistrationApproved`** (`apps/api/src/modules/mail/mail.service.ts:156-178`) и **`sendRegistrationRejected`** (`mail.service.ts:213-234`) — определены, но **не вызываются нигде** (grep по `apps/api/src` находит только определения). `approve()`/`reject()` регистрации меняют статус молча (`apps/api/src/modules/registrations/registrations.service.ts:493-532` — никакого mail/emit).
2. Шаблоны **`registration-approved`** (`apps/api/src/modules/mail/email/templates.ts:550`, регистрация в `TEMPLATES` `:1510`) и **`registration-rejected`** (`templates.ts:611`, `:1511`) — достижимы только через мёртвые методы выше → мёртвые.
3. Шаблоны **`task-assigned`**, **`task-deadline`**, **`task-mentioned`** (`templates.ts:1275,1328,1391`; в `TEMPLATES` `:1523-1525`, категория `notification`) — **ни одного вызова** `enqueueTemplateMail` с этими именами вне `templates.ts` (grep пустой). Заготовка под уведомления канбана, не подключена.
4. Значения enum **`NotificationType.REGISTRATION_APPROVED`** и **`REGISTRATION_REJECTED`** (`apps/api/prisma/schema.prisma:553-554`) — не эмитятся ни одной код-точкой (grep по `apps/api/src` без spec: только `REGISTRATION_CREATED` в `registrations.service.ts:366`).
5. Поле **`Notification.memberId`** (`apps/api/prisma/schema.prisma:574`) — персональная адресация есть в схеме, но ни один `emit` его не передаёт; подтверждено комментарием контроллера (`apps/api/src/modules/notifications/notifications.controller.ts:27-30`).

---

## Механика: домен-события, очереди, идемпотентность

### Домен-события

Единственный механизм — **прямой вызов сервиса из сервиса**. Outbox-таблицы нет (в `schema.prisma` нет модели с outbox-семантикой), `@nestjs/event-emitter` / `EventEmitter2` / `@OnEvent` не используются (grep по `apps/api/src` — 0 файлов). Следствие: in-app уведомление и email — два независимых side-effect'а в одном методе (напр. `super-admin.service.ts:1959` + `:1969`), без транзакционной связи с основным изменением.

### BullMQ

Очереди (`apps/api/src/modules/platform/queue/queue.types.ts:5-11`): `mail.send`, `tickets.generate`, `certificates.generate`, `billing.sweeps`, `maintenance.sweeps`.

Параметры enqueue (`apps/api/src/modules/platform/queue/queue.service.ts`):
- `mail.send`: `jobId = sha256(idempotencyKey)` (BullMQ ≥5.7x запрещает `:` в jobId — хэшируется, `:171-175`), `attempts: 3`, `backoff exponential 1000ms`, `removeOnComplete: 500`, `removeOnFail: 500` (`:176-182`).
- `tickets.generate` (single/zip): `attempts: 2`, backoff 1500ms, `removeOnComplete/Fail: 250/250` и `100/100` (`:187-219`).
- `certificates.generate`: `attempts: 2`, backoff 1500ms, `100/100` (`:221-236`).
- Repeatable (upsertJobScheduler, `queue.service.ts:118-134`): `billing-sweep-hourly` (`every: 1h`) и `registration-files-sweep-daily` (`every: 24h`). Других repeat/delay-заданий нет; **`delay` для писем не используется нигде** (ни один вызов `enqueueMail` не передаёт options).

Воркер — отдельное приложение `apps/worker/src/index.ts`: тонкий прокси, каждый job POST'ится обратно в API на `/internal/jobs/*` с заголовком `x-internal-job-token` (`apps/worker/src/index.ts:56-73`), который проверяет `InternalJobGuard` по `INTERNAL_JOB_TOKEN` (`apps/api/src/modules/platform/queue/internal-job.guard.ts:14-28`). Профили воркера: `default` (sweeps+mail), `assets` (tickets+certificates), `all` (`apps/worker/src/index.ts:77-126`). Concurrency — из env (`:14-16`).

**Упавшие job / DLQ**: DLQ нет. После исчерпания attempts job остаётся в failed-set (кап 500 для mail, `queue.service.ts:181`), воркер лишь пишет в консоль (`apps/worker/src/index.ts:185-189`). Никакого алертинга, автопереигрывания или админ-ручки для failed-джобов в коде нет (в `internal-jobs.controller.ts` и `queue.service.ts` отсутствует). `OperationalMetricsService` фиксирует только исходы синхронного `waitForJob` (`queue.service.ts:255-286`), который для почты не используется.

### Идемпотентность

Два слоя:
1. **BullMQ-уровень**: детерминированный `jobId = sha256(idempotencyKey)` — повторный enqueue того же ключа не создаёт второй job, пока прежний жив в очереди (`queue.service.ts:171-175`).
2. **App-уровень** (`apps/api/src/modules/platform/queue/job-idempotency.service.ts`): Redis-ключ `eventflow:idempotency:mail:{key}`, TTL **7 дней** (`:14`). Схема: `hasProcessed` (`get == 'done'`, `:47-54`) → `reserve` (`SET NX 'processing'`, `:69-103`) → отправка → `markProcessed` (`set 'done'`, `:56-67`); при ошибке `clear` (`:105-111`) и throw → BullMQ ретраит (`mail-dispatch.service.ts:76-170`).

Таблицы отправок в БД нет — дедуп живёт только в Redis (см. «Чего нет», п. 8).

Поведение на сбоях:
- **Ретрай воркера после ошибки SMTP**: `clear` снял ключ → повторная попытка отправляет заново. Ок.
- **Двойной деплой / две реплики воркера**: `SET NX` гарантирует, что письмо отправит одна; вторая получит `deduplicated` (`mail-dispatch.service.ts:78-89`).
- **Краш процесса между `reserve` и `markProcessed`/`clear`** (например, kill во время SMTP-вызова): ключ остаётся `'processing'` на 7 дней, все последующие ретраи того же job упираются в неудавшийся `reserve` и завершаются как `deduplicated` — **письмо потеряно молча**. Стал-ключ никем не чистится (в `job-idempotency.service.ts` нет reaper'а).
- **Redis flush / потеря Redis**: дедуп-история исчезает; повторный enqueue того же ключа отправит письмо второй раз.
- Ошибки enqueue: часть вызовов с `swallowErrors: true` глотает сбой (напр. `mail.service.ts:176,232,258` и далее), часть бросает — регистрационные коды (`mail.service.ts:332-343`), инвайты (обрабатывается в `invites.service.ts:594-601`), спикеры (откат спикера, `speakers.service.ts:230-235`).

---

## Модель данных (что есть / чего нет)

### Есть: `Notification` (`apps/api/prisma/schema.prisma:569-599`)

| Поле | Тип | Примечание |
|------|-----|------------|
| `id` | uuid PK | `:570` |
| `organizationId` | uuid FK → Organization, `onDelete: Cascade` | `:571,588` |
| `memberId` | uuid? FK → OrganizationMember, Cascade | `:574,589` — **не используется** (см. «Мёртвые», п. 5) |
| `type` | `NotificationType` | `:576` |
| `entityType` / `entityId` | String? / uuid? | `:578-579` — deep link «на что ссылается» |
| `payload` | Json? | `:583` — подстановки для локализованной строки, «никаких готовых предложений» (`:561-568`) |
| `readAt` | DateTime? | `:585` — read-статус общий на организацию, не персональный |
| `createdAt` | DateTime default now | `:586` |

Индексы: `@@index([organizationId, createdAt])`, `@@index([organizationId, readAt])` (`:592-593`).

### Есть: `NotificationType` (`schema.prisma:551-560`) — 8 значений

| Значение | Где эмитится |
|----------|--------------|
| `REGISTRATION_CREATED` | `registrations.service.ts:366` |
| `REGISTRATION_APPROVED` | **нигде — мёртвое** |
| `REGISTRATION_REJECTED` | **нигде — мёртвое** |
| `EVENT_PUBLISHED` | `super-admin.service.ts:1971` |
| `EVENT_REJECTED` | `super-admin.service.ts:2018` |
| `MEMBER_JOINED` | `invites.service.ts:363` |
| `ORG_VERIFIED` | `super-admin.service.ts:1821` |
| `ORG_VERIFICATION_REJECTED` | `super-admin.service.ts:1865` |

(NB: `EVENT_PUBLISHED`/`MEMBER_JOINED` в `dashboard-activity.dto.ts:9,12` — это отдельный enum `TeamActivityType` дашборда, не Notification.)

### Есть: `EmailUnsubscribe` (`schema.prisma:2227-2238`)

`email + category` unique (`:2235`); используется супрессией `notification`-категории (`mail-dispatch.service.ts:117-133`). Категория у шаблона: `notification` только у `event-notification`, `task-*` (`templates.ts:762,1297,1333,1395`), остальные `transactional` — доставляются всегда. Endpoint'ы отписки: `POST /email/unsubscribe`, `GET /email/unsubscribe/status` (`apps/api/src/modules/email-unsubscribe/email-unsubscribe.controller.ts:21,31,45`). List-Unsubscribe заголовки ставятся на каждое письмо (`mail-dispatch.service.ts:135-138`).

### Нет (проверено grep по `apps/api/prisma/schema.prisma` — 0 совпадений)

- `NotificationDelivery` — нет.
- `DeviceToken` / `PushToken` — нет.
- `NotificationPreference` — нет (единственная настройка — email-отписка по категории выше).
- `MailLog` / `EmailLog` — нет.

---

## Поля Event для таймингов (start/end/tz/close)

- `startDate DateTime` — `apps/api/prisma/schema.prisma:825`.
- `endDate DateTime` — `schema.prisma:826`.
- `registrationDeadline DateTime?` — `schema.prisma:827` (nullable; поля `registration_close_at` отдельно нет — это оно).
- **Timezone-поля нет ни у Event, ни где-либо в схеме** (grep `timezone`/`timeZone` по `schema.prisma` — 0 совпадений). Все даты — абсолютные timestamps; серверные форматирования используют `ru-RU`-локаль без TZ (напр. `mail.service.ts:403-409`).
- Планировщиков «напомнить до start/deadline» нет: единственные repeatable-задания — биллинг и уборка черновиков (`queue.service.ts:118-134`); event-reminder'ов не существует (grep `reminder` по `apps/api/src` — только plan-expiry: `billing-sweep.service.ts`, `mail.service.ts:596`, `templates.ts:876`).

---

## Tenant isolation и аудит-лог

### Изоляция

- **In-app чтение/запись**: каждый запрос скоупится `organizationId` текущего пользователя (`notifications.controller.ts:44-46`), `list`/`unreadCount` фильтруют `where { organizationId }` (`notifications.service.ts:63,82-84`), `markRead` держит `organizationId` в условии всегда — чужой id из тела не пометит чужое уведомление (`notifications.service.ts:88-98`).
- **Рассылка участникам (E-12)**: доступ к событию проверяется по `event.organizationId === orgId` (`mail.service.ts:290-308`, вызов `:87`); аудитория строится `where { eventId, status: APPROVED }`, а произвольные `registrationIds` дополнительно ограничены `eventId` (`mail.service.ts:103-126`) — подсунуть регистрации чужого события нельзя. `MEMBER` наследует `organizationId` из JWT (`mail.service.ts:310-320`).
- Emit-точки берут `organizationId` из доверенных сущностей БД (событие/инвайт/организация), не из ввода: `registrations.service.ts:362-365`, `invites.service.ts:361-362`, `super-admin.service.ts:1819,1863,1969-1970,2016-2017`.
- Утечек между организациями в построении аудиторий не найдено; поимённо проверены `mail.service.ts` (единственная массовая рассылка) и все emit-точки.

### Аудит-лог отправок

**Отсутствует.** Что есть вместо него:
- Строки логгера: `mail.sent` / `mail.suppressed` с шаблоном, замаскированным получателем и категорией (`mail-dispatch.service.ts:126-131,154-157`), `Mail job queued` (`mail.service.ts:858`), `queue_enqueue` (`queue.service.ts:407-413`). Ни «кто запросил» (кроме опционального `requestedBy` в payload job, `mail-dispatch.service.ts:54-60` — заполняется только для E-12), ни результат доставки в БД не пишутся.
- `AdminAuditLog` (`schema.prisma:2245-2261`) — только опасные действия супер-админа (hard delete), к отправкам отношения не имеет.
- `invites.service.ts` пишет структурные audit-строки в лог (`this.audit('invite.accepted', ...)`, `invites.service.ts:352-358`), но это logger, не таблица.
- Ответ E-12 `{sent, failed}` фиктивен: `failed` всегда 0, `sent` = число enqueue (`mail.service.ts:128-150`).

---

## Контракты и дрейф

- В `packages/api-contracts/src/generated/openapi.ts` описаны все 3 runtime-эндпоинта: `GET /api/v1/notifications` (`openapi.ts:6441-6449`), `GET /api/v1/notifications/unread-count` (`:6458-6469`), `PATCH /api/v1/notifications/read` (`:6478-6495`); схемы `NotificationDto`/`NotificationListDto`/`UnreadCountDto`/`MarkReadDto` (`:12727-12772`).
- Runtime-контроллер (`notifications.controller.ts:48,58,69`) имеет ровно эти же 3 маршрута — **дрейфа маршрутов нет**.
- Enum в контракте `NotificationDtoType` содержит все 8 значений (`openapi.ts:25246-25255`) — 1:1 с Prisma (`schema.prisma:551-560`), включая два мёртвых (`REGISTRATION_APPROVED`, `REGISTRATION_REJECTED`) — клиенты могут писать под них ветки, которые никогда не сработают.
- В ручных контрактах (`packages/api-contracts/src/workspace.ts`, `index.ts` и др.) упоминаний notifications нет (grep — 0) — контракт живёт только в generated OpenAPI.
- Эндпоинты рассылки (`POST /events/:eventId/mail/send`) и отписки — в этом же generated-файле (не проверялись построчно; сам файл генерируется из runtime — источник один).

## Email-транспорт

- **Чем**: nodemailer через `@nestjs-modules/mailer` (`MailerModule.forRootAsync`, SMTP host/port/secure/auth из конфига `mail.*`; без креденшелов AUTH не шлётся — локальный Mailpit) — `apps/api/src/modules/mail/mail.module.ts:16-40`.
- **Синхронно или очередь**: всегда через очередь `mail.send`; прямой `mailerService.sendMail` есть только в worker-пути `dispatchQueuedMail` (`mail-dispatch.service.ts:140-147`) и в smoke-скрипте (`apps/api/src/scripts/email-smoke.ts`). Синхронных отправок из request-обработчиков нет.
- **Ретраи**: BullMQ `attempts: 3`, exponential backoff от 1000ms (`queue.service.ts:176-180`); после — failed-set без обработки.
- **Локализация**: `renderEmail` берёт локаль из `context.locale`, дефолт `ru` (`apps/api/src/modules/mail/email/render.ts:19-21,35`); шаблоны трёхъязычные (`templates.ts:9-11`), но **ни один вызывающий не передаёт `locale`** (параметр есть в сигнатурах `mail.service.ts:682,711,745,781,817` — аргумент нигде не заполняется) → фактически все письма уходят на русском.

---

## Чего нет (по каждому пункту 1.2 явно)

1. **Таблица уведомлений**: нет email-уведомлений об approve/reject регистрации (методы мёртвые, флоу молчит — `registrations.service.ts:493-532`); нет in-app аналогов для модерации блога, сертификатов, биллинга; нет уведомлений участнику in-app вообще (лента только организаторская, `notifications.controller.ts:39` — roles ORGANIZATION/MEMBER).
2. **Домен-события**: outbox — нет; event emitter — нет; только прямые вызовы (grep, см. «Механика»).
3. **BullMQ**: DLQ — нет; алертинг по failed — нет; delayed/scheduled писем — нет (только 2 repeatable-свипа, `queue.service.ts:118-134`).
4. **Идемпотентность**: таблицы отправок в БД — нет; дедуп только Redis TTL 7 дней (`job-idempotency.service.ts:14`); reaper застрявших `'processing'`-ключей — нет.
5. **Push**: инфраструктуры нет полностью — `expo-server-sdk`/`fcm`/`apns`/`firebase` отсутствуют в коде и зависимостях (grep по `apps/api/src`, `apps/api/package.json`, `apps/worker/package.json` — 0); модели `DeviceToken` нет (`schema.prisma`, grep — 0).
6. **Модель данных**: `NotificationDelivery`, `DeviceToken`, `NotificationPreference` — нет (grep по схеме — 0); read-статус не персональный (одно `readAt` на организацию, `schema.prisma:585`).
7. **Тайминги**: timezone-поля нет нигде в схеме; event-reminder-джобов нет.
8. **Аудит-лог отправок**: нет — только строки логгера (`mail-dispatch.service.ts:154-157`).
9. **Контракты**: notification-эндпоинты только в generated OpenAPI; дрейфа нет, но мёртвые enum-значения экспортируются клиентам.
10. **SMS**: канал отсутствует (`ad-orders.service.ts:18`).

---

## OPEN_QUESTIONS кандидаты (вопрос | предлагаемый дефолт)

| Вопрос | Предлагаемый дефолт |
|--------|---------------------|
| Должны ли approve/reject регистрации слать письмо участнику (методы `sendRegistrationApproved/Rejected` мёртвые — намеренно «silent» или недоделка)? | Считать недоделкой: подключить оба метода в `approve()`/`reject()` + добить мёртвые `NotificationType.REGISTRATION_APPROVED/REJECTED` для участника, когда появится участник-лента |
| `task-*` шаблоны (`templates.ts:1275+`) — задел под уведомления канбана: удалять или доделывать? | Оставить, но пометить в коде как unreleased; подключать вместе с персональной адресацией `memberId` |
| Застрявший `'processing'`-ключ при краше между `reserve` и `markProcessed` теряет письмо на 7 дней. Приемлемо? | Нет: заменить `SET NX` на короткий lease-TTL (например 10 мин) для `'processing'`, `'done'` — 7 дней |
| Дедуп 7 дней < горизонта окна `14d` у plan-expiry: письмо окна `14d` может уйти повторно на 8-й день (sweep ежечасный, ключ истёк). Ожидаемо? | Считать багом низкого приоритета; включить дату первой отправки окна в ключ или поднять TTL до 30 дней |
| Повторная отправка event-invitation тому же email (E-08) молча дедупится 7 дней — организатор думает, что письмо ушло. Нужен resend-путь? | Да: добавить счётчик попытки в ключ при явном resend (как сделано у спикеров через регенерацию токена) |
| Все письма фактически уходят на `ru` (locale никем не передаётся) — где брать язык получателя? | Хранить `locale` у User/Organization и прокидывать в каждый вызов `MailService`; дефолт `ru` сохранить |
| Нужен ли persistent-лог отправок (кто/кому/когда/результат) для саппорта и антиспам-расследований? | Да, минимальная таблица `MailLog` (template, to-hash, idempotencyKey, status, error, requestedBy, createdAt), запись в `dispatchQueuedMail` |
| `Notification.readAt` общий на организацию: «прочитал один — прочитано у всех». Это продуктовое решение? | Оставить как есть до появления `memberId`-адресации (задокументировано в `notifications.controller.ts:27-30`) |
| Отсутствие timezone у Event: любые будущие «напоминания за N часов до start» будут считаться в UTC-абсолюте. Достаточно (вся платформа — UZ, UTC+5)? | Пока да; при выходе за пределы UZ добавить `Event.timezone` |
| Failed-джобы mail копятся до 500 без алертинга — кому и как о них узнавать? | Экспортировать failed-count в существующий `OperationalMetricsService` + порог в мониторинге |
