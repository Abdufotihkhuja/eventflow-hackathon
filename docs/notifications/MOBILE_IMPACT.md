# MOBILE_IMPACT — влияние на apps/mobile

Фаза 2 (A2, design-only). Опирается на инвентарь [audit/mobile.md](audit/mobile.md): Expo SDK **54**, expo-router ~6, typedRoutes, scheme `eventflow://`, FSD-слои `app/ | entities/ | features/ | shared/`. Push-инфраструктуры в приложении нет вообще — всё ниже создаётся с нуля.

## 1. Затрагиваемые FSD-слайсы

| Слайс | Что появляется/меняется |
|---|---|
| `shared/notifications/` (новый) | Интеграционное ядро: `setNotificationHandler`, регистрация каналов Android, permission-хелперы, `getLastNotificationResponseAsync`-обработка, парсер payload→route. Единственное место, импортирующее `expo-notifications` (ESLint-правило по образцу «AsyncStorage запрещён» в `token-store.ts:4-6`) |
| `shared/api/token-store.ts` | + ключ `ef.installation` (uuid установки, генерируется однажды). Logout-путь дополняется вызовом `DELETE /me/devices/{installationId}` ДО чистки токенов (`auth-context.tsx:389-400`) |
| `shared/auth/auth-context.tsx` | Хуки жизненного цикла токена: после login и после `enterWorkspace` — `PUT /me/devices/…` (upsert идемпотентен, дублирующий вызов безвреден) |
| `shared/i18n/` | + ключи `notif.*` для новых типов участнической и организаторской ленты (uz/ru/en); смена языка → повторный `PUT /me/devices` с новой `locale` (сервер локализует killed-push) |
| `entities/notifications/` | Переезд на `sdk-workspace` (сейчас сырой `apiTransport` — долг из CONTRACT_DIFF §7.3); + read-по-тапу (мутация `ids` уже умеет — `api.ts:91-96`, нужен вызов) |
| `entities/account-notifications/` (новый) | API участнического инбокса (`/me/notifications*` через `sdk-account`), unread-count, mark-read |
| `features/notification-permission/` (новый) | Pre-permission prime-экран + follow-up при denied (образец denied-обработки — сканер: `Linking.openSettings()`, `org/scan.tsx:404`) |
| `app/(tabs)/profile.tsx` → новый экран `app/notification-settings.tsx` | UI матрицы преференсов (`GET/PATCH /me/notification-preferences`) |
| `app/notifications.tsx` (новый) | Инбокс участника (маршрут создать; вход — иконка на `/discover` или `/profile`) |
| `app/org/notifications.tsx` | Read-по-тапу; поллинг/refetch (см. §6); навигация по новым `entityType` |
| `app/_layout.tsx` (root) | Подключение `shared/notifications` (handler, cold-start, response listener) |
| `app.config.ts`, `android/` | plugin `expo-notifications`, `POST_NOTIFICATIONS` в манифест, `google-services.json` |

## 2. Permission flow

- **Pre-permission prime screen** (`features/notification-permission`): системный диалог показываем ТОЛЬКО после явного «Включить» на собственном экране с объяснением ценности (билет, напоминания, статус заявки). Триггеры показа prime-экрана (не при первом запуске!): (а) после первой успешной регистрации на событие — момент максимальной мотивации; (б) для организатора — после входа в workspace. Отказ на prime-экране → не показываем системный диалог вовсе (право на второй показ сохранено).
- **Android 13+ (API 33)**: runtime `POST_NOTIFICATIONS` — добавить в манифест; на Android <13 разрешение неявное, но канал(ы) региструем всегда. Каналы Android: `transactional` (importance high), `reminders` (default), `updates` (default, informational) — маппинг из приоритетов каталога.
- **iOS provisional**: используем `provisional: true` при первом запросе — пуши доставляются тихо в Notification Center без диалога; полный prompt через prime-экран запрашиваем при следующем значимом событии. Даёт доставку REM/REG до того, как пользователь принял решение.
- **Denied**: экран настроек уведомлений показывает состояние «выключено в системе» + `Linking.openSettings()` (готовый паттерн сканера).

## 3. Интеграция expo-notifications

- Пакет `expo-notifications` в версии, совместимой с SDK 54 (НЕ latest вслепую — SDK 54, а не 56, поправка аудита).
- `app.config.ts`: плагин `expo-notifications` (иконка/цвет для Android), `android.googleServicesFile`.
- **Credentials**: `eas.json` в репо нет, сборки — gradle + раздача через супер-админку (память проекта). Решение по умолчанию: транспорт — **Expo Push Service** (`getExpoPushTokenAsync` + `expo-server-sdk` на API); для него FCM server key/APNs key загружаются в Expo-проект (`projectId` появится в конфиге) даже без EAS Build; `google-services.json` кладётся в `android/app`. Прямой FCM/APNs без Expo — запасной путь, дороже (два протокола на бэке). → OPEN-Q-13.
- `setNotificationHandler` в root layout: foreground-политика (см. §8).

## 4. Device-token lifecycle (решение по org-scoped сессии)

Привязка токена — к **личному Account**, не к workspace (дефолт из аудита, принят): `PUT /api/v1/me/devices/{installationId}` работает под любым токеном (личным или org-scoped) — identity аккаунта есть в обоих JWT.

| Момент | Действие |
|---|---|
| Первый запуск | Генерация `installationId` (uuid) → SecureStore `ef.installation` (переживает logout) |
| Permission granted | `getExpoPushTokenAsync` → `PUT /me/devices` `{expoPushToken, platform, locale}` |
| Login / cold-start restore / `enterWorkspace` | Повторный `PUT` (upsert освежает `lastSeenAt` — сервер знает, что устройство живо; дёшево, идемпотентно) |
| Смена языка | Повторный `PUT` с новой locale |
| Ротация Expo-токена | Listener `addPushTokenListener` → `PUT` |
| Logout | `DELETE /me/devices/{installationId}` ДО чистки сессии; при сетевой ошибке — не блокировать logout (сервер догасит токен по receipts) |

## 5. Инбоксы

- **Участник (новый)**: экран `app/notifications.tsx` на `entities/account-notifications`; той же философии, что организаторский (`type`+`payload`, фраза из словаря). Read-по-тапу (`PATCH /me/notifications/{id}/read`) + «прочитать всё». Push-тап на связанный экран также помечает read.
- **Организатор (доработка)**: (а) read-по-тапу — вызов существующей мутации с `ids:[id]` (`api.ts:91-96`); (б) навигация для новых `entityType` (сейчас кликабелен только `event` — `org/notifications.tsx:132-137`); (в) переезд на SDK.

## 6. Badge count и обновление счётчиков

- **Источник истины — сервер**: `unread-count` (организаторский + новый `/me/notifications/unread-count`). Иконка приложения: `Notifications.setBadgeCountAsync(участнический unread)` — только участнический (org-scoped цифра на иконке личного телефона путает; внутриприложенческий колокольчик организатора остаётся как есть).
- Обновление: входящий push в foreground/background → invalidate `notificationKeys.unread` + account-unread (план аудита); плюс лёгкий `refetchInterval` 60s ТОЛЬКО на экранах инбокса (не глобально — `refetchOnWindowFocus:false` политика сохраняется).
- Сервер шлёт `badge` в Expo-payload (число участнического unread) — killed-приложение получает правильную цифру без кода.

## 7. Deep link table (notification type → route)

Источник маршрутов — инвентарь `audit/mobile.md`; payload пуша несёт `{route, params}` (внутренний формат, не URL — scheme нужен только для внешних ссылок). Маршруты записаны в **параметрической нотации Expo Router** (`/org/attendees/[eventId]` — ровно как имена файлов `app/**`); Invariant-тест №6 сверяет эту таблицу с файлами `app/**` напрямую, без нормализации.

| Каталог / push type | Route | Params | Статус маршрута |
|---|---|---|---|
| MOD-01/04/05 (submitted/rejected/changes/published) | `/org/event/[id]` | id=eventId | есть |
| REG-01 (билет) / REG-06 / REG-08 | `/ticket/[id]` | id=registrationId (сверить param экрана) | есть |
| REG-01 (PENDING-заявка) / REG-07 / REG-10 / REG-11 | `/event/[id]` | id=eventId | есть |
| REG-02/03/05 (оплата) | `/event/[id]` → блок оплаты; отдельный `/checkout/[orderId]` | — | **требуется создать** (OPEN-Q-05); до него — `/event/[id]` |
| REG-04 (hold истёк) / REG-12 (refund) | `/event/[id]` / `/ticket/[id]` | | есть |
| REG-09 (check-in) | `/ticket/[id]` | | есть |
| REG-20/21/23, CLS-03 (организатору; бывший CLS-04 слит в CLS-03) | `/org/attendees/[eventId]` | eventId | есть (раздел события) |
| REG-22 (дайджест) | `/org/attendees/[eventId]` | eventId | есть |
| REM-01 | `/ticket/[id]`; action-кнопка «Маршрут» → `/map` | параметры `/map` сверить при реализации | есть |
| REM-02 | `/org/event/[id]` | | есть |
| REM-03 (online) | `/event/[id]` (кнопка Join → `onlineUrl`) | | есть |
| CLS-01/02 (заинтересованным) | `/event/[id]` | | есть |
| SUM-01 | `/certificate/[id]` (если выдан) / `/event/[id]` | | есть |
| SUM-02 | `/org/analytics/[eventId]` | eventId | есть |
| Тап по пушу без валидного route (защита) | `/notifications` (участник) / `/org/notifications` | — | участнический **требуется создать** |
| MOD-02/03/06 (модератору) | — (web-admin, email) | — | мобилки не касается |

Гейты уже готовы к пушам: `useWorkspaceGate` обрабатывает cold-start deep link на org-маршрут (`workspace-guard.tsx:4-15`), `backToEvent` — «открыто из пуша, истории нет» (`section-rail.tsx:71-85`). Чужой/протухший `entityId` ловится сервером (403/404 без retry) — поведение сохраняем, добавляем нейтральный тост «уведомление устарело».

## 8. Cold start / foreground

- **Killed → тап по пушу**: в root layout однократно `getLastNotificationResponseAsync()` → отложенная навигация ПОСЛЕ session-restore (маршрутизатор `app/index.tsx:26-39` решает stack; org-роуты ждут `enterWorkspace` — паттерн гейта уже есть). Обработанный response-id запоминается в памяти — повторная навигация при remount исключена.
- **Background → тап**: `addNotificationResponseReceivedListener` → та же навигационная функция.
- **Foreground**: `setNotificationHandler` → баннер НЕ показываем для событий текущего экрана (тап по «новая регистрация», когда открыт список участников — шум), иначе `shouldShowBanner:true` без звука; всегда — invalidate счётчиков. Для `transactional`-канала баннер показываем всегда.

## 9. OPEN_QUESTIONS кандидаты от A2 (сводно из всех 5 документов)

| # | Вопрос | Предлагаемый дефолт | Цена ошибки |
|---|---|---|---|
| OPEN-Q-01 | «Взят в работу» модератором: статуса IN_REVIEW нет в `EventStatus`. Добавлять enum-значение (аддитивно) ради MOD-уведомления? | НЕ добавлять; уведомление «взят в работу» не шлём. Модерация быстрая, ценность сигнала низкая | Низкая: недополученное уведомление; добавится аддитивно позже |
| OPEN-Q-02 | Waitlist (WAITLISTED/PROMOTED с TTL брони) отсутствует в продукте. Проектировать хранилище под цепочку 2 сейчас? | Нет; ID REG-W1/W2 зарезервированы, дизайн — при появлении фичи | Низкая: каталог расширяем |
| OPEN-Q-03 | Deep link «прямо в проблемное поле» при запросе правок: `rejectionReason` — один текст, структурных указателей на поля нет | Линк на `/org/event/[id]` с показом причины сверху; структурированные замечания (поле+комментарий) — отдельная продуктовая фича | Средняя: UX хуже задуманного, но честный |
| OPEN-Q-04 | Путь апелляции при отклонении события не существует в продукте | В письме MOD-04 — контакт `support@eventflow.uz` (прецедент login-deactivation) | Низкая |
| OPEN-Q-05 | Экрана оплаты в мобилке нет (checkout — Order API + VIA hosted-invoice). Куда вести REG-02/03/05? | До появления `/checkout/[orderId]` — `/event/[id]`; создание экрана — задача мобильного этапа оплат | Средняя: пуш «бронь истекает» без прямой кнопки оплаты теряет конверсию |
| OPEN-Q-06 | Слать ли REM-24h участникам с PENDING-заявкой (не подтверждены)? | Не слать; вместо этого рассмотреть отдельное «ваша заявка ещё на рассмотрении, событие завтра» организатору (pending-блок CLS-03 — бывший CLS-04 — уже подсвечивает) | Средняя: PENDING-участник может прийти зря / организатор потерять участника |
| OPEN-Q-07 | «Правила входа» в REM-01: структурного поля у Event нет | Не включать; формат+адрес+QR достаточны. Поле `entryInstructions` — продуктовое решение | Низкая |
| OPEN-Q-08 | Feedback/NPS-сущности нет — что в CTA «оцените» SUM-01? | Deep link на `/event/[id]` (комментарии, `commentsEnabled`); NPS-модуль — отдельная фича | Низкая |
| OPEN-Q-09 | «Статус выплаты» в SUM-02: `Payout` org-level, ручной, к событию не привязан | Формулировка «выплата — по расписанию платформы» без статуса; при автоматизации M-7-auto добавить | Низкая |
| OPEN-Q-10 | Аудитория «viewed» для CLS-01 не персистится (только `viewsCount`). Заводить просмотр-лог ради маркетинговых пушей? | Нет: только `SavedEvent`. Просмотр-лог — вопрос privacy и объёма, отдельное решение | Низкая: меньше охват CLS |
| OPEN-Q-11 | SUM-01 шлётся только пришедшим (есть `Attendance`). Нужен ли отдельный «жаль, что не дошли» no-show-вариант? | Не слать no-show ничего (риск токсичности), организатору цифра no-show есть в SUM-02 | Низкая |
| OPEN-Q-12 | Quiet hours: платформенные 22:00–08:00 или персональная настройка? | Платформенные, TZ события/`Asia/Tashkent`; колонки в NotificationPreference добавятся аддитивно | Низкая |
| OPEN-Q-13 | Транспорт push: Expo Push Service (нужен `projectId` + FCM/APNs creds в Expo) vs прямой FCM/APNs (без Expo, два протокола). Сборки — gradle без EAS | Expo Push Service: один API, `expo-server-sdk`, ретраи/receipts из коробки; creds загрузить в Expo-проект. Решить ДО реализации бэкенд-канала | Высокая: смена транспорта после релиза = ротация всех токенов |
| OPEN-Q-14 | SLA модерации 24h (MOD-03) — правильная цифра? Продуктового SLA нет | 24h, конфиг в `PlatformSetting` | Низкая |
| OPEN-Q-15 | Время дневного дайджеста организатора (REG-22) 09:00 `Asia/Tashkent` — ок? | Да; конфигурируемо платформенно, не персонально | Низкая |
| OPEN-Q-16 | Rate limit informational: 4 пуша/час на пользователя + 1/сутки для `saved_event_alerts` — согласовать цифры | Принять как стартовые, крутить по метрикам opt-out | Средняя: жёстко → потерянные уведомления, мягко → отписки от пушей |
| OPEN-Q-17 | REM-01 fallback-email: слать ли письмо-напоминание пользователям без push-токена (новый жанр писем)? | Да, шаблон `event-reminder` (transactional-категория, отписка не действует), но только при отсутствии активного DeviceToken | Средняя: объём почты вырастет |
| OPEN-Q-18 | `Event.timezone` заполнять в UI создания события или оставить всегда NULL (=Asia/Tashkent) до выхода за UZ? | Колонку завести сейчас, UI не делать; ONLINE-события зарубежных организаторов — триггер для UI | Низкая |
| OPEN-Q-19 | Наследованные из аудита: оживление approve/reject-писем (REG-06/07) меняет «молчаливое» поведение, к которому организаторы привыкли — нужен ли продуктовый анонс? | Просто включить; это чинит недоделку, а не меняет контракт | Низкая |
| OPEN-Q-20 | Существующие EXIST-E-* мигрировать на NotificationDelivery-журнал (закрыть Redis-дыру «письмо потеряно молча» и для старой почты)? | Да, но отдельной итерацией после стабилизации новых цепочек | Средняя: до миграции старая почта живёт со старой дырой |
