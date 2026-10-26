# Леджер реализации системы уведомлений

Утверждено 2026-08-01: бэклог целиком, открытые вопросы — по предлагаемым дефолтам из [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

Порядок работ — батчами по зависимостям P0 → P1. Статусы: ⬜ не начато / 🔨 в работе / ✅ готово / ⛔ заблокировано.

## Батч 1 — дизайн-правки + схема
- ✅ BL-17 правки дизайн-доков (a–ж)
- ✅ BL-01 dedupKey per-получатель/per-канал (composite unique `(dedupKey, accountId, channel)`)
- ✅ BL-09 миграции Prisma: `Event.timezone`, `Account.locale`, `device_tokens`, `notification_preferences`, `notification_deliveries`, `scheduled_notifications`, `account_notifications`, enum NotificationType +значения

## Батч 2 — ядро backend
- ✅ BL-04 резолвер аудиторий User→Identity→Account (`dispatch/notification-audience.repository.ts`; ветка «Account отсутствует» → email-only, OQ-25)
- ✅ BL-10 NotificationDispatcherService + dispatch-due тик (repeatable 60s, FOR UPDATE SKIP LOCKED, сортировка priority+runAt) + cancelBy + реестр материализаторов (guard-перечитка; цепочки регистрируются в Батче 6) + quiet hours + ESLint `no-restricted-imports` + ratchet `scripts/check-notification-dispatch.mjs` (`npm run ratchet`)
- ✅ BL-06 транзакционная семантика: dispatchNow(intent, tx) → enqueue-замыкание после commit; email через deliveryId в mail-job (providerRef=messageId ДО sent); reaper 10 мин (providerRef есть → sent_unconfirmed; нет → max 1 повтор → failed)
- ✅ BL-03 синхронное пере-планирование при смене дат (`events.service.update` → NotificationReplanService; гранулярность startDate→REM / endDate→SUM / deadline→CLS; реестр replan-функций — каркас, пустой до Батча 6)
- ✅ BL-07 guard'ы висячих ссылок (терминальный skipped recipient_gone в тике и reaper'е) + hard-delete: cancelBy(accountId) + анонимизация payload в транзакции `hardDeleteUser`
- ✅ BL-22 rate limiter (Redis sorted-set, 4 informational/час + 1/сутки saved_event_alerts → suppressed_rate_limit; transactional/high мимо)
- ✅ до-миграция `20260802000000_notification_partial_uniques`: два партиальных unique из DATA_MODEL_DELTA §8 п.5, пропущенных в Батче 1 (проверено интеграционно на :5433)

## Батч 3 — push-канал backend
- ✅ BL-14 `expo-server-sdk@^5` (НЕ ^6/^7: те ESM-only, ломают CJS-рантайм api и jest), очередь `push.send` + отложенный `push.receipts` (delay 15 мин, одна очередь, ветвление по type), worker-прокси `/internal/jobs/push/{send,receipts}`; PushChannelSender зарегистрирован в реестре диспатчера; providerRef=ticket id'ы ДО sent; ticket/receipt DeviceNotRegistered → disabledAt+disabledReason; fallback email per-account (вторая строка с тем же dedupKey из снапшота `fallbackEmail` в payload push-строки); канал выключен (`EXPO_PUSH_ENABLED` != true, дефолт) → failed: push_channel_disabled + fallback, warning на старте
- ✅ BL-02 чанкование ≤100 (`chunkPushNotifications`), ошибка чанка не роняет батч; полный провал всех чанков → throw → ретраи BullMQ (backoff) → reaper
- ✅ BL-05 контент-контракт `push/push-content.ts`: title ≤64 / body ≤178 с многоточием (после сборки локализованной строки), data-строки ≤256, payload ≤4KB (обязательные {route,params,channel} не отбрасываются), без эмодзи; PII (OQ-32) — на уровне текстов словаря, тесты запрещают суммы/валюты и ФИО-плейсхолдеры
- ✅ BL-11 словарь `push.*` ru/uz/en в `notifications/i18n/push-messages.ts` (29 ключей каталога, title+body ×3); плюрализация счётчиков — `i18n/plural.ts`, ЗЕРКАЛО `packages/i18n/src/plural.ts` (тот же контракт): `@eventflow/i18n` ESM-only, из CJS api/jest не подключается — при переносе словаря (BL-53) файл удаляется; локаль: DeviceToken.locale → Account.locale → 'ru' в сендере
- ✅ BL-16 машинный каталог `notifications/catalog.ts` (kind/priority/preferenceKey/каналы/emailFallback/pushKey/routes/emailTemplate); диспатчер мёржит политику интента с каталогом (явное поле побеждает), push-сендер берёт pushKey/route/важность из каталога; CI-тесты `catalog.spec.ts`: (а) полнота ru/uz/en каждого pushKey + рендер непуст, (б) каждый route существует в `apps/mobile/shared/notifications/known-routes.ts` (прямое чтение файла, параметрическая нотация) + allowlist `PENDING_ROUTES=['/checkout/[orderId]']` (OQ-05/BL-49) с анти-протуханием, (в) emailTemplate ∈ TEMPLATES либо `PENDING_EMAIL_TEMPLATES` (BL-26)
- ✅ BL-08 `PUT/DELETE /api/v1/me/devices/{installationId}` (`devices/`, guard по Account как MeController); PUT-upsert по (accountId, installationId) с реактивацией строки; гигиена D-09: активные строки ДРУГИХ аккаунтов с тем же expoPushToken ИЛИ installationId → superseded (в одной транзакции, до upsert); DELETE идемпотентен (logout). NB: префикс `/api/v1/me` в `account.ts` SDK-фильтр НЕ добавлен — это BL-13 (Батч 4)

## Батч 4 — contracts + preferences backend
- ✅ BL-13 contracts regen (me/devices, me/notification-preferences, me/notifications) + SDK
- ✅ BL-23 preferences backend GET/PATCH + enforcement в диспатчере
- ⬜ BL-12 (кодовая часть) projectId/конфиг; внешнее: FCM server key + APNs key в Expo-консоль — ждёт владельца

## Батч 5 — mobile
- ✅ BL-15 expo-notifications ядро: plugin, каналы, handlers, cold-start, deep link парсер, permission prime
- ✅ BL-25 device-token lifecycle (PUT/DELETE /me/devices, ef.installation)
- ✅ BL-21 preferences UI
- ✅ BL-36 (P1) read-by-tap в инбоксе организатора + поллинг счётчика
- ✅ переезд инбокса организатора на SDK (из CONTRACT_DIFF)

## Батч 6 — цепочки (P1)
- ✅ BL-37 Account.locale заполнение + прокидка в MailService
- ✅ BL-26 новые email-шаблоны (reminder, summary ×2, moderation ×3)
- ✅ BL-24 цепочка 2 участник (REG-*) + оживление approve/reject
- ✅ BL-27/29/30/31/32 + BL-18/19/20: цепочки 1, 3, 4, 5 (`apps/api/src/modules/notifications/chains/`), reconcile-свип (repeatable 24h)
- ✅ инбокс участника (AccountNotification)

## Батч 7 — финализация
- ✅ Инвесторская страница: новая интеграция Expo Push + новые сущности (правило CLAUDE.md)
- ✅ прогон тестов/линта/typecheck по монорепо: jest api 1119, mobile 111, ratchet'ы, tsc всех приложений — зелёные
- ⬜ сводка и push в origin (ветка stage)

## Журнал
- 2026-08-01: GATE пройден, бэклог утверждён, начало реализации.


- 2026-08-02: Батч 1 готов — дизайн-правки BL-17/BL-01, миграции BL-09 (применены к локальной БД, typecheck OK).
- 2026-08-02: Батч 2 готов — ядро диспатчера в `apps/api/src/modules/notifications/{dispatch,channels}`; очередь `notifications.jobs` (тик 60s + reaper 10m, worker-прокси `/internal/jobs/notifications/*`); legacy `NotificationsService.emit` идёт сквозь in-app sender (поведение ленты неизменно). Typecheck/lint OK, 96 jest-сьютов api зелёные (41 новый тест), интеграционная проверка unique/SKIP LOCKED на :5433 — OK. Push-канал осознанно не реализован (Батч 3): интерфейс ChannelSender + канал 'push' заложены, строки без sender'а остаются enqueued под reaper.
- 2026-08-02: Батч 3 готов — push-канал backend (BL-14/02/05/11/16/08): `notifications/{push,i18n,devices}` + catalog.ts, очередь `push.send`, регистрация в apps/worker (`WORKER_PUSH_CONCURRENCY`, дефолт 4). Контракты перегенерированы (drift gate требует: новый контроллер me/devices + internal push-ручки попали в generated openapi; SDK-фильтры не расширялись — BL-13). Typecheck api+worker OK, lint api 0 errors, jest api 101 suites / 953 тестов зелёные (35 новых), оба ratchet'а зелёные. Включение канала в проде = `EXPO_PUSH_ENABLED=true` после BL-12.
- 2026-08-02: Батч 6б готов — пять цепочек подключены к ядру (`notifications/chains/`): MOD-01..06 (submitSeq/D-12, SLA-таймер с guard'ом, kind в RejectDto), REG-01..11+20..23 (слияние REG-01+02 по OQ-21, REG-04 = триггер экспирации, оживлённые approve/reject-письма, пороги 50-in-app/80/100), REM-01..03 (правило <24h/<2h, replan-реестр наполнен: startDate→REM, endDate→SUM, deadline→CLS), CLS-01..03 (closeEpoch при ручном закрытии, cap ≤2 CLS-01, антифлаппинг cls:seats), SUM-01/02 (dispatchMany per-registration, подавления no-Attendance/нулевая посещаемость), REG-22 per-account дайджест (OQ-23, фабрика в reconcile + самоподдержание) + суточный reconcile-свип (`notifications-reconcile`, worker-ветка). Отклонения от каталога: ключи REG-01/REG-06 дополнены квантом/decisionEpoch (ре-регистрация/ре-approve в той же строке Registration), REG-22 route → `/org/notifications`, REG-04 без email-fallback (шаблона hold-expired нет), REG-12/REG-23-REFUNDED отложены (перехода REFUNDED в коде нет). Jest api 111 suites / 1107 (+59), lint 0 errors, оба ratchet'а, nest build, worker tsc — зелёные. Contracts drift (RejectDto.kind + internal reconcile-ручка) НЕ закоммичен: packages вне зоны батча, regen — следующим батчем.
- 2026-08-02: Батчи 2–6 завершены; итог: 10 коммитов реализации на stage; отложено по факту кода: REG-12/REFUND (перехода Order→REFUNDED не существует); внешний блокер BL-12: FCM/APNs креды в Expo-консоль (см. DEPLOY_NOTES.md).
