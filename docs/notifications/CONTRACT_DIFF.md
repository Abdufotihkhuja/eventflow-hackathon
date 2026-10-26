# CONTRACT_DIFF — аддитивная дельта packages/api-contracts

Фаза 2 (A2, design-only). Ничего из существующего не меняется и не удаляется; только новые endpoints, поля и enum-значения.

## 0. Как устроены контракты сейчас (реальность)

- Источник один: runtime-контроллеры NestJS → генерация `packages/api-contracts/src/generated/openapi.ts` (аудит: «сам файл генерируется из runtime»). Ручные файлы (`account.ts`, `workspace.ts`, `public.ts`, `admin.ts`) — не описания, а **фильтры путей** по префиксам поверх generated (`workspace.ts:1-21`, `FilterPaths<Prefixes>`), из которых собираются typed SDK: `packages/sdk-account`, `sdk-workspace`, `sdk-public`, `sdk-admin`.
- Notification-контракт живёт только в generated: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/read` (`openapi.ts:6441,6458,6478`), схемы `NotificationDto/NotificationListDto/UnreadCountDto/MarkReadDto` (`:12727-12772`), enum `NotificationDtoType` — 8 значений (`:25246`).
- **Мобильный инбокс ходит МИМО SDK** — сырым `apiTransport` (`apps/mobile/entities/notifications/api.ts:9-10`, «модуль новый, в SDK ещё не попал»). Это уже долг; данная дельта его закрывает (раздел 5).

Следствие для процесса: «дельта контракта» = новые контроллеры/DTO в `apps/api` → regen openapi → при необходимости расширить префикс-фильтры ручных файлов (добавление префикса в union — аддитивно) → regen SDK. NB из памяти проекта: OpenAPI regen требует инфраструктуры — закладывать в план внедрения.

## 1. Device tokens (новый контроллер `me/devices`, скоуп: личный Account)

Все ручки за auth-guard личной сессии (работают и с org-scoped токеном — идентичность аккаунта из JWT есть в обоих случаях; см. MOBILE_IMPACT про org-сессию).

| Метод | Путь | Тело / ответ | Назначение |
|---|---|---|---|
| `PUT` | `/api/v1/me/devices/{installationId}` | body: `{ expoPushToken: string, platform: 'ios'\|'android', locale: 'ru'\|'uz'\|'en', appVersion?: string, osVersion?: string }` → `204` | Регистрация/обновление токена. **PUT-upsert по `installationId`** (uuid, генерирует клиент, живёт в SecureStore): идемпотентен, покрывает и ротацию Expo-токена, и смену локали, и повторный login. Обновляет `lastSeenAt` |
| `DELETE` | `/api/v1/me/devices/{installationId}` | → `204` (идемпотентно: несуществующий → тоже 204) | Отвязка при logout. Зовётся ДО чистки токенов сессии |

Не делаем `GET`-списка устройств (нет UI-потребности; добавится аддитивно при необходимости «управление сессиями»).

## 2. Notification preferences (новый контроллер `me/notification-preferences`)

| Метод | Путь | Тело / ответ | Назначение |
|---|---|---|---|
| `GET` | `/api/v1/me/notification-preferences` | → `{ preferences: Array<{ key: PreferenceKey, push: boolean, email: boolean }> }` | Отдаёт ПОЛНУЮ матрицу: отсутствующие в БД строки — с дефолтами (on). Клиент никогда не мёржит дефолты сам |
| `PATCH` | `/api/v1/me/notification-preferences` | body: `{ changes: Array<{ key: PreferenceKey, push?: boolean, email?: boolean }> }` → обновлённая полная матрица | Частичный upsert. Ключи вне `PreferenceKey` → 400 |

`PreferenceKey` (новый контрактный enum, аддитивно расширяемый): `event_reminders | saved_event_alerts | registration_status | summary | organizer_registrations | organizer_broadcast` (см. каталог, раздел 9). Transactional-уведомления в матрице не представлены — их нельзя отключить, и контракт этого не позволяет по построению.

## 3. Инбокс участника (новый контроллер `me/notifications`)

Существующая лента `/api/v1/notifications` — организаторская (org-scoped, roles ORGANIZATION/MEMBER, `notifications.controller.ts:39`) — **не трогается**. Участнику — параллельный ресурс на новой таблице `AccountNotification` (DATA_MODEL_DELTA):

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/api/v1/me/notifications?page&limit&unread` | Список, пагинация как у организаторской ленты (page/limit, страница 20); `unread=true` — только непрочитанные |
| `GET` | `/api/v1/me/notifications/unread-count` | `{ count: number }` — источник истины для badge |
| `PATCH` | `/api/v1/me/notifications/read` | body `{ ids?: string[] }`; пусто = всё. Зеркало организаторского контракта |
| `PATCH` | `/api/v1/me/notifications/{id}/read` | Read по одному — тап по строке/пушу. Идемпотентно (уже прочитано → 204) |

DTO: `AccountNotificationDto { id, type: AccountNotificationType, entityType?, entityId?, payload?, readAt?, createdAt }` — та же философия «type+payload, никаких готовых фраз», локализует клиент.

## 4. Дельта организаторской ленты (аддитивно к существующим 3 ручкам)

| Изменение | Что именно |
|---|---|
| `PATCH /api/v1/notifications/{id}/read` | Read по одному (сейчас только bulk `PATCH /read` c `ids` — им мобилка не пользуется по одному; path-вариант проще для «read по тапу» и симметричен участнику). Bulk остаётся |
| `GET /api/v1/notifications?unread=true` | Новый опциональный query-параметр; без него поведение прежнее |
| Пагинация | УЖЕ есть (`?page&limit`, `mobile.md`) — не трогаем |

## 5. Новые enum-значения (только добавление значений — аддитивно)

**`NotificationDtoType` (организаторская лента, Prisma `NotificationType`)** — к 8 существующим:

| Значение | Каталог |
|---|---|
| `EVENT_SUBMITTED` | MOD-01 (подтверждение подачи в ленте орг.) |
| `EVENT_CHANGES_REQUESTED` | MOD-04 kind=changes_requested (существующий `EVENT_REJECTED` остаётся для kind=rejected) |
| `REGISTRATION_FIRST` | REG-20 |
| `CAPACITY_THRESHOLD` | REG-21 (payload `{threshold: 50\|80\|100}`) |
| `TICKET_REFUND` | REG-23 |
| `REGISTRATION_CLOSED` | CLS-03 (payload с итогами; включает `countPENDING` — бывший CLS-04, слит в CLS-03) |
| `EVENT_SUMMARY` | SUM-02 |

Мёртвые `REGISTRATION_APPROVED/REJECTED` оживают для участнической ленты — но участник живёт в новом enum ниже; в организаторском enum они остаются (клиентские ветки под них уже могли быть написаны — ничего не ломаем).

**`AccountNotificationType` (новый enum участнической ленты):** `REGISTRATION_CREATED | REGISTRATION_APPROVED | REGISTRATION_REJECTED | REGISTRATION_CANCELLED | REGISTRATION_REVOKED | PAYMENT_PENDING | PAYMENT_FAILED | HOLD_EXPIRED | TICKET_ISSUED | TICKET_REFUNDED | CHECKED_IN | EVENT_REMINDER | EVENT_STARTING | EVENT_CANCELLED | REGISTRATION_CLOSING | FEW_SEATS_LEFT | EVENT_SUMMARY | CERTIFICATE_ISSUED`.

**Расширение DTO модерации (аддитивно):** у существующего reject-эндпоинта супер-админа — новое опциональное поле `kind?: 'rejected' | 'changes_requested'` (дефолт `rejected`); ответы/поведение без поля не меняются.

## 6. Внутренние (worker-прокси, вне публичного контракта)

По действующему паттерну `POST /internal/jobs/*` + `x-internal-job-token` (`internal-jobs.controller.ts`, `InternalJobGuard`):

- `POST /internal/jobs/push/send` — исполнение батча push (новая очередь `push.send`).
- `POST /internal/jobs/push/receipts` — опрос Expo receipts (отложенный job после send).
- `POST /internal/jobs/notifications/dispatch-due` — тик планировщика: выборка due-строк `ScheduledNotification`, guard-проверки, диспатч (новый repeatable `notifications-scheduler`, `every: 60s`, по образцу `billing-sweep-hourly` в `queue.service.ts:118-134`).

В generated openapi эти пути попадут (как и текущие internal-ручки) — в префикс-фильтры SDK их не включать.

## 7. Влияние на SDK и клиентов

1. **Regen** `openapi.ts` → новые пути/DTO появляются у всех; ничего существующего не меняется (только добавления) — потребители старых типов компилируются без правок.
2. **Префикс-фильтры**: `/api/v1/me` — убедиться, что префикс есть в `account.ts` (там живут `/me/organizations` и пр.); новые пути подхватятся автоматически. Организаторская лента `/api/v1/notifications` сейчас НЕ входит ни в один ручной фильтр (grep аудита: «в ручных контрактах упоминаний notifications нет») — **добавить префикс `/api/v1/notifications` в `workspace.ts`**, чтобы NotificationsApi наконец попал в `sdk-workspace`.
3. **Долг мобильного инбокса**: после п.2 `apps/mobile/entities/notifications/api.ts` обязан переехать с сырого `apiTransport` на `sdk-workspace` (и новый участнический инбокс сразу писать через `sdk-account`) — фиксируется как обязательная задача внедрения, не «когда-нибудь» (иначе invariant-тест deep link'ов и типы enum'ов будут жить в двух местах).
4. **Мёртвые enum-значения** организаторского `NotificationDtoType` (`REGISTRATION_APPROVED/REJECTED`) остаются в контракте — задокументировать в каталоге, что для организатора они не эмитятся (эмитятся участнику в другом enum).
5. NB процесса: regen OpenAPI требует поднятой инфраструктуры (память проекта: «OpenAPI regen deferred — needs infra») — планировать в той же итерации, что и первый новый контроллер, иначе SDK-шаг заблокирует мобилку.
