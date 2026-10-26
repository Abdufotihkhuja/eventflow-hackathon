# DATA_MODEL_DELTA — аддитивная дельта Prisma-схемы

Фаза 2 (A2, design-only). **DDL-набросок, НЕ применять.** Только новые таблицы, колонки и индексы; ни одного drop/rename/изменения типа/снятия constraint. Существующие модели (`Notification`, `EmailUnsubscribe`, `Event`, `Registration`, `Order`…) не модифицируются, кроме двух новых nullable-колонок (`Event.timezone`, `Account.locale`) и обратных relation-полей (Prisma-требование, на SQL не влияет).

## 1. DeviceToken — push-токены устройств

```prisma
model DeviceToken {
  id             String    @id @default(uuid()) @db.Uuid
  accountId      String    @map("account_id") @db.Uuid
  /// Клиентский uuid установки (SecureStore). Пара (account, installation) — identity устройства;
  /// expoPushToken — ротируемое значение.
  installationId String    @map("installation_id") @db.Uuid
  expoPushToken  String    @map("expo_push_token")
  platform       String    // 'ios' | 'android'
  /// Локаль интерфейса на устройстве — ЕДИНСТВЕННЫЙ способ локализовать killed-push
  /// (сервер собирает текст пуша; см. audit/mobile.md).
  locale         String    @default("ru") // 'ru' | 'uz' | 'en'
  appVersion     String?   @map("app_version")
  osVersion      String?   @map("os_version")
  lastSeenAt     DateTime  @default(now()) @map("last_seen_at")
  disabledAt     DateTime? @map("disabled_at")
  /// 'logout' | 'device_not_registered' — источник деактивации, для диагностики.
  disabledReason String?   @map("disabled_reason")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, installationId]) // ключ PUT-upsert'а
  @@index([accountId, disabledAt])      // fan-out: активные токены аккаунта
  @@index([expoPushToken])              // обратный поиск по receipt'у DeviceNotRegistered
  @@index([lastSeenAt])                 // stale-reaper (90д не шлём / 180д hard-cleanup строк)
  @@map("device_tokens")
}
```

**Обоснование.** Привязка к `Account` (единая identity после invite/membership rework), не к User/OrganizationMember и не к организации: устройство одно, workspace — атрибут сессии; орг-fan-out резолвится в момент отправки через `Membership → OrganizationMember` + permission-фильтр. `expoPushToken` не unique: один и тот же физический девайс с двумя аккаунтами (logout/login) даст две строки — гасим прежнюю по receipt'ам, не по constraint'у.

## 2. NotificationPreference — матрица преференсов

```prisma
model NotificationPreference {
  id        String   @id @default(uuid()) @db.Uuid
  accountId String   @map("account_id") @db.Uuid
  /// PreferenceKey из CONTRACT_DIFF §2: event_reminders | saved_event_alerts |
  /// registration_status | summary | organizer_registrations | organizer_broadcast
  key       String
  push      Boolean  @default(true)
  email     Boolean  @default(true)
  updatedAt DateTime @updatedAt @map("updated_at")
  createdAt DateTime @default(now()) @map("created_at")

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, key])
  @@map("notification_preferences")
}
```

**Обоснование.** Строка существует только при отклонении от дефолта (дефолты — в коде, `GET` мёржит) — таблица маленькая, бэкфилла нет. `key` — String, не enum БД: добавление ключа не требует миграции (валидация — в DTO). In-app канал в матрице отсутствует намеренно: лента дешёвая и не отключается. Quiet hours не персональные (платформенная политика 22:00–08:00) — колонок под них нет; появятся аддитивно, если продукт решит иначе (OPEN-Q-12). Существующий `EmailUnsubscribe` не трогается: остаётся законным one-click механизмом поверх матрицы (проверяются оба).

## 3. NotificationDelivery — журнал доставок + замок идемпотентности

```prisma
model NotificationDelivery {
  id          String    @id @default(uuid()) @db.Uuid
  /// СЕМАНТИЧЕСКИЙ ключ уведомления (форматы — в каталоге), БЕЗ получателя и канала.
  /// Идемпотентность — composite unique (dedupKey, accountId, channel) ниже (инвариант №1):
  /// рестарт воркера/двойной вызов → P2002 → noop; fan-out на N получателей и
  /// push→email fallback дают легальные соседние строки с тем же dedupKey.
  dedupKey    String    @map("dedup_key")
  /// ID из NOTIFICATIONS_CATALOG (напр. 'REM-01') — связь доставки с каталогом.
  catalogId   String    @map("catalog_id")
  channel     String    // 'push' | 'email' | 'in_app'
  /// Получатель: ровно одно из двух заполнено.
  accountId   String?   @map("account_id") @db.Uuid
  /// Для организаторских in-app без персональной адресации — организация.
  organizationId String? @map("organization_id") @db.Uuid
  /// Денормализованные ссылки для каскадной инвалидации и диагностики.
  eventId        String? @map("event_id") @db.Uuid
  registrationId String? @map("registration_id") @db.Uuid
  orderId        String? @map("order_id") @db.Uuid
  status      String    @default("enqueued")
  // 'scheduled' | 'enqueued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  // | 'skipped' | 'suppressed_rate_limit' | 'suppressed_preference' | 'suppressed_unsubscribe'
  /// Снапшот аргументов шаблона (payload пуша) — для ресенда и разбора инцидентов.
  payload     Json?
  error       String?   @db.Text
  /// Expo push ticket id — для сверки receipts.
  providerRef String?   @map("provider_ref")
  scheduledFor DateTime? @map("scheduled_for")
  sentAt      DateTime? @map("sent_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  /// Замок идемпотентности (инвариант №1): семантический ключ × получатель × канал.
  /// NB: Postgres считает NULL различными, поэтому composite unique не ограничивает
  /// строки с accountId IS NULL. В миграции добавляются два partial unique (raw SQL, §8):
  /// (dedup_key, organization_id, channel) WHERE account_id IS NULL — org-адресованные in-app;
  /// (dedup_key, channel) WHERE account_id IS NULL AND organization_id IS NULL —
  /// модераторские email на общий ящик (MOD-02/03/06).
  @@unique([dedupKey, accountId, channel])
  @@index([dedupKey])
  @@index([accountId, createdAt])
  @@index([eventId])
  @@index([registrationId])
  @@index([status, createdAt])   // reaper «застрявших enqueued» + failed-мониторинг
  @@index([catalogId, createdAt]) // аналитика по типам
  @@map("notification_deliveries")
}
```

**Обоснование.** Идемпотентность (финальный вид после BL-01, чинит B-04): `dedupKey` — семантический ключ уведомления, уникальность — composite `(dedupKey, accountId, channel)`. Fan-out на N получателей = N строк с одним dedupKey (никто не подавлен P2002-ом), push→email fallback = вторая строка с `channel='email'`. `channel='push'`-строка — **одна на аккаунт** (batch по всем активным устройствам аккаунта в одном send; per-device Expo ticket'ы — в `providerRef`/`payload`). Старой семантики «dedupKey глобально уникален» больше нет. Дополнительно закрывает сразу три дыры аудита: (а) идемпотентность переезжает из Redis-TTL-7d в БД — переживает Redis flush; (б) «краш между reserve и send теряет письмо молча» — строка застревает в `enqueued`, reaper видит и ре-энкьюит; (в) отсутствие аудит-лога отправок (вопрос аудита про MailLog) — этот журнал и есть он, для новых цепочек. Существующая почта (EXIST-E-*) НЕ мигрирует на него в этой фазе — только новые цепочки (миграция старых — backlog, аддитивно). FK намеренно не объявляются (только uuid-колонки + индексы): журнал должен переживать удаление событий/регистраций (Cascade стёр бы историю доставок), а целостность здесь некритична.

## 4. ScheduledNotification — плановые уведомления (источник истины — БД, не Redis)

```prisma
model ScheduledNotification {
  id           String    @id @default(uuid()) @db.Uuid
  catalogId    String    @map("catalog_id")     // 'REM-01', 'CLS-01', 'SUM-02', 'MOD-03', 'REG-03'…
  /// Семантический dedupKey (тот же формат, что у доставок, — без получателя и канала).
  /// Здесь unique ПРАВОМЕРЕН: одна scheduled-строка = один плановый интент; fan-out на
  /// получателей происходит при диспатче (N строк NotificationDelivery с этим dedupKey
  /// и разными (accountId, channel)). Планировщик идемпотентен:
  /// повторное планирование того же ключа → upsert-noop.
  dedupKey     String    @unique @map("dedup_key")
  runAt        DateTime  @map("run_at")         // UTC-момент; TZ-математика — при планировании
  status       String    @default("scheduled")  // 'scheduled' | 'dispatched' | 'cancelled' | 'skipped'
  /// Каскадная инвалидация (инвариант №3): cancelBy({eventId|registrationId|orderId}).
  eventId        String? @map("event_id") @db.Uuid
  registrationId String? @map("registration_id") @db.Uuid
  orderId        String? @map("order_id") @db.Uuid
  accountId      String? @map("account_id") @db.Uuid
  organizationId String? @map("organization_id") @db.Uuid
  /// Контекст для guard-проверки и построения текста в момент исполнения
  /// (например eventVersion, offsetKey, threshold).
  context      Json?
  cancelledAt  DateTime? @map("cancelled_at")
  cancelReason String?   @map("cancel_reason")
  dispatchedAt DateTime? @map("dispatched_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@index([status, runAt])   // тик планировщика: WHERE status='scheduled' AND run_at <= now()
  @@index([eventId, status])         // каскадная отмена по событию
  @@index([registrationId, status])  // …по регистрации
  @@index([orderId, status])         // …по заказу (payment-цепочка)
  @@map("scheduled_notifications")
}
```

**Обоснование.** BullMQ delayed-jobs как единственный носитель расписания не годится: Redis flush теряет напоминания (прецедент осознан в аудите для дедупа). Схема: строки здесь — истина; repeatable `notifications-scheduler` (every 60s, паттерн `billing-sweep-hourly`) выбирает due-строки, прогоняет guard и создаёт `NotificationDelivery` + канальные job'ы. `SELECT … FOR UPDATE SKIP LOCKED` на тике — двойной воркер не диспатчит одну строку дважды (плюс composite unique `(dedupKey, accountId, channel)` на Delivery как последний рубеж). Ежедневный reconcile-свип пересобирает расписание против текущих `startDate/endDate/registrationDeadline` (лечит пропущенные прямые вызовы cancel/reschedule). FK не объявляются — та же логика, что у Delivery.

## 5. AccountNotification — участнический in-app инбокс

```prisma
model AccountNotification {
  id         String    @id @default(uuid()) @db.Uuid
  accountId  String    @map("account_id") @db.Uuid
  /// AccountNotificationType из CONTRACT_DIFF §5. String в БД (не enum) —
  /// добавление типа без миграции; контрактная валидация в DTO.
  type       String
  entityType String?   @map("entity_type")
  entityId   String?   @map("entity_id") @db.Uuid
  /// Подстановки для локализованной строки. Никаких готовых фраз (принцип Notification).
  payload    Json?
  readAt     DateTime? @map("read_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId, createdAt]) // лента
  @@index([accountId, readAt])    // unread-count
  @@map("account_notifications")
}
```

**Обоснование: почему новая таблица, а не расширение `Notification`.** У `Notification.organizationId` — NOT NULL + Cascade FK (`schema.prisma:571`); участнику организация не нужна → пришлось бы делать колонку nullable = снятие constraint = НЕ аддитивно (запрещено правилами фазы). Отдельная таблица зеркалит философию (type+payload, персональный `readAt`) и не трогает организаторскую ленту. Персональный read here — с рождения (у организаторской он общий на организацию — известное ограничение, остаётся как есть).

## 6. Новые колонки существующих моделей (nullable ⇒ аддитивно, без бэкфилла)

```prisma
model Event {
  // ...существующие поля БЕЗ изменений...
  /// IANA-таймзона события ('Asia/Tashkent'). NULL = платформенный дефолт
  /// (PlatformSetting 'platform.timezone', сид 'Asia/Tashkent').
  /// Нужна цепочкам REM/CLS/SUM: «T−24h в TZ события» и quiet hours.
  timezone String? // новая колонка `timezone`
}

model Account {
  // ...существующие поля БЕЗ изменений...
  /// Локаль интерфейса ('ru'|'uz'|'en'). NULL = 'ru' (текущее де-факто поведение писем).
  /// Заполняется: login/смена языка (mobile: вместе с PUT /me/devices; web: при смене языка).
  /// Использование: locale писем (закрывает «все письма уходят на ru» из аудита) и
  /// fallback для пушей без DeviceToken.locale.
  locale String? // новая колонка `locale`
}
```

Приоритет локали пуша: `DeviceToken.locale` (девайс) → `Account.locale` → `'ru'`. Приоритет локали письма: `Account.locale` → `'ru'`.

## 7. Что НЕ добавляем (осознанно)

| Кандидат | Почему нет |
|---|---|
| `Event.scheduleVersion` (версия для dedup) | Не нужна: `eventVersion` = epoch(`startDate`/`endDate`) в составе dedup-ключа — перенос даты меняет ключ без новой колонки |
| Waitlist-таблица | Фичи нет в продукте; проектировать хранилище под несуществующий флоу — вне мандата (OPEN-Q-02) |
| `Feedback`/`NPS` | Сущности нет; SUM-01 ссылается на комментарии события (OPEN-Q-08) |
| Миграция `mail.send`-дедупа в `NotificationDelivery` для EXIST-E-* | Аддитивно возможно, но раздувает фазу; backlog |
| Отдельная очередь-таблица для digest'ов | REG-22 живёт в `ScheduledNotification` (kind в `catalogId` + `context`) |

## 8. Сводка миграций (порядок применения, все — `CREATE`/`ADD COLUMN`/`CREATE INDEX`)

1. `ALTER TABLE events ADD COLUMN timezone text NULL;`
2. `ALTER TABLE accounts ADD COLUMN locale text NULL;`
3. `CREATE TABLE device_tokens …` + индексы.
4. `CREATE TABLE notification_preferences …` + unique.
5. `CREATE TABLE notification_deliveries …` + composite unique `(dedup_key, account_id, channel)` + два partial unique raw SQL в той же миграции (Prisma partial-индексы не описывает): `(dedup_key, organization_id, channel) WHERE account_id IS NULL` и `(dedup_key, channel) WHERE account_id IS NULL AND organization_id IS NULL` (модераторские email) + индексы.
6. `CREATE TABLE scheduled_notifications …` + unique(dedup_key) + индексы.
7. `CREATE TABLE account_notifications …` + индексы.
8. Расширение Prisma-enum `NotificationType` (MOD/REG/CLS/SUM-значения из CONTRACT_DIFF §5) — `ALTER TYPE … ADD VALUE` (аддитивно; NB Postgres: ADD VALUE вне транзакции — Prisma Migrate это учитывает).

Rollback-безопасность: ни одна существующая запись не затрагивается; выключение фичи = не писать в новые таблицы.
