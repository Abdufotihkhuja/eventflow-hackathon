# DEPLOY_NOTES — деплой программы уведомлений

Памятка по выкатке всей программы (Батчи 1–4 backend). Всё ниже — по фактам из кода; ссылки на файлы актуальны на момент Батча 4.

## 1. Миграции Prisma (обязательно, до старта api)

`prisma migrate deploy` применяет три миграции программы:

| Миграция | Что делает |
|---|---|
| `20260801000000_notifications_foundation` | `Event.timezone`, `Account.locale`, таблицы `device_tokens`, `notification_preferences`, `notification_deliveries`, `scheduled_notifications`, `account_notifications` |
| `20260801001000_notification_type_new_values` | Новые значения enum `NotificationType` (ADD VALUE — вне транзакции, отдельной миграцией намеренно) |
| `20260802000000_notification_partial_uniques` | Партиальные unique-индексы журнала доставок (fan-out/dedup, DATA_MODEL_DELTA §8 п.5) |

В prod-compose миграции применяет one-shot сервис `migrate` (`docker-compose.prod.yml`) до старта реплик api — отдельного ручного шага нет; вручную: `npx prisma migrate deploy` в `apps/api`.

## 2. Env-переменные push-канала (api)

Читаются `apps/api/src/config/push.config.ts`; прокинуты в api-сервис обоих compose-файлов и задокументированы в `.env.example` (корень) и `apps/api/.env.example`:

- `EXPO_PUSH_ENABLED` — тумблер канала, дефолт `false`. Пока `false`, push-доставки сразу `failed: push_channel_disabled`, per-account email-fallback срабатывает штатно (один warning на старте). **Включать только после шага 3.**
- `EXPO_ACCESS_TOKEN` — опционален; нужен, только если в Expo-проекте включён Enhanced Security for Push Notifications.
- `WORKER_PUSH_CONCURRENCY` — конкурентность очереди `push.send` в worker'е, дефолт 4 (`apps/worker/src/env.ts`).

## 3. Креды Expo / FCM / APNs (внешние шаги владельца, BL-12/OQ-13)

Транспорт — Expo Push Service (`expo-server-sdk@^5`). Сборки gradle, без EAS; `eas.json` в репо нет.

1. Создать проект в Expo-консоли (expo.dev), получить `projectId`.
2. Залить в Expo-проект: **FCM server key** (Android) и **APNs key** (iOS).
3. Положить `google-services.json` в `apps/mobile/android/app/` (gradle-сборки без EAS).
4. Задать `EXPO_PUBLIC_PROJECT_ID` в окружении сборки мобилки — `apps/mobile/app.config.ts` кладёт его в `extra.eas.projectId`, откуда `getExpoPushTokenAsync` читает его по умолчанию (BL-25).
5. Только после этого — `EXPO_PUSH_ENABLED=true` в env api и рестарт.

Порядок важен: смена транспорта/проекта после релиза = ротация всех device-токенов (OQ-13).

## 4. Очереди и repeatable-задания

Регистрация repeatable-заданий идемпотентна и происходит сама при старте api (`QueueService.onModuleInit`, `upsertJobScheduler`) — ручных шагов нет, нужен только Redis:

- `notifications-dispatch-due` — тик планировщика, каждые 60 s (FOR UPDATE SKIP LOCKED, безопасно при нескольких репликах);
- `notifications-reaper` — застрявшие `enqueued`-доставки, каждые 10 мин (providerRef есть → `sent_unconfirmed`, нет → max 1 повтор → `failed`).

Канальные очереди BullMQ: `notifications.jobs` и `push.send` (send + отложенные receipts, delay 15 мин) исполняются worker'ом через прокси `POST /internal/jobs/notifications/*` и `/internal/jobs/push/{send,receipts}` — worker должен видеть тот же Redis и `INTERNAL_JOB_TOKEN` (уже прокинуты в compose).

## 5. Пост-деплойная проверка

1. Логи api на старте: **нет** warning'а «Push-канал выключен» (если канал включали).
2. `PUT /api/v1/me/devices/{installationId}` с мобилки создаёт строку `device_tokens`.
3. `GET /api/v1/me/notification-preferences` отдаёт полную матрицу (transactional-строка `locked: true`).
4. В `notification_deliveries` появляются `sent`-строки с `providerRef` (Expo ticket id); `failed: push_channel_disabled` после включения канала — признак нерасползшегося env.

## 6. Что деплой НЕ включает

- Пуш-цепочки (Батч 6) — до них диспатчер обслуживает только email/in-app плечи существующих поводов.
- Экран настроек уведомлений в мобилке (BL-21) и device-token lifecycle (BL-25) — Батч 5.
- Sentry-провайдер мобилки и прочие внешне-гейтованные задачи — вне программы.
