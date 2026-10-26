# Аудит 1.1 — Транспорт и устройство (mobile)

Зона: `apps/mobile` (Expo Router, FSD) + `packages/sdk-*` / `packages/api-contracts` в части notifications.
Ветка stage, дата 2026-08-01. Все пути — от корня репо.

> Поправка к вводным: в брифе указан Expo SDK 56, фактически в приложении Expo **~54.0.0** (`apps/mobile/package.json:40`, `expo-router ~6.0.24` — `apps/mobile/package.json:52`). Это важно при выборе версии `expo-notifications`.

## Что есть

| Факт | Ссылка |
| --- | --- |
| Deep link scheme `eventflow` объявлен в конфиге; комментарий прямо называет scheme «deep-link / push target prefix (work-items 3.1/3.2)» — push задуман, но не сделан | `apps/mobile/app.config.ts:6-7`, `apps/mobile/app.config.ts:12` |
| Android intent-filter на scheme `eventflow` (VIEW/BROWSABLE) сгенерирован в манифесте | `apps/mobile/android/app/src/main/AndroidManifest.xml:24-29` |
| `typedRoutes: true` — маршруты типизированы, deep link table можно строить прямо по каталогу `app/` | `apps/mobile/app.config.ts:84-86` |
| In-app notification center для организатора: экран `/org/notifications` | `apps/mobile/app/org/notifications.tsx:99-195` |
| API-слой инбокса: `GET /api/v1/notifications?page&limit` (infinite query, страница 20) | `apps/mobile/entities/notifications/api.ts:50-65`, `apps/mobile/entities/notifications/api.ts:42` |
| Счётчик непрочитанного: отдельный `GET /api/v1/notifications/unread-count`, `retry: false` (сотрудник без доступа получает ошибку один раз — значок просто не появляется) | `apps/mobile/entities/notifications/api.ts:72-85` |
| Пометка прочитанным: `PATCH /api/v1/notifications/read` — список `ids` или вся лента при пустом теле; при ошибке инвалидируется счётчик | `apps/mobile/entities/notifications/api.ts:88-106` |
| Запросы идут через `apiTransport` напрямую, минуя сгенерированные SDK («модуль новый, в SDK ещё не попал») | `apps/mobile/entities/notifications/api.ts:9-10` |
| Контракт notifications есть в OpenAPI-типах: пути list / unread-count / read, `NotificationDto`, enum `NotificationDtoType` | `packages/api-contracts/src/generated/openapi.ts:6441`, `:6458`, `:6478`, `:12727`, `:25246` |
| 8 типов уведомлений (REGISTRATION_CREATED/APPROVED/REJECTED, EVENT_PUBLISHED/REJECTED, MEMBER_JOINED, ORG_VERIFIED, ORG_VERIFICATION_REJECTED) | `apps/mobile/entities/notifications/api.ts:16-24` |
| Локализация уведомлений — на клиенте: сервер отдаёт `type` + `payload` (подстановки), фраза собирается из словаря на языке интерфейса | `apps/mobile/entities/notifications/api.ts:4-7`, `apps/mobile/app/org/notifications.tsx:51-57`, `apps/mobile/shared/i18n/strings.ts:1533-1546` |
| Статус read/unread: поле `readAt`; непрочитанное — точка + полужирный текст | `apps/mobile/entities/notifications/api.ts:32`, `apps/mobile/app/org/notifications.tsx:49`, `:74`, `:82` |
| Тап по уведомлению навигирует ТОЛЬКО при `entityType === "event"` → `/org/event/[id]`; иначе строка не кликабельна | `apps/mobile/app/org/notifications.tsx:132-137` |
| Тап по строке НЕ помечает её прочитанной — единственная пометка это «Прочитать всё» в шапке (мутация умеет `ids`, но UI её с `ids` не вызывает) | `apps/mobile/app/org/notifications.tsx:147-156`, `apps/mobile/entities/notifications/api.ts:91-96` |
| Колокольчик со счётчиком на org-дашборде; значок скрыт при 0, `99+` при переполнении | `apps/mobile/app/org/(tabs)/index.tsx:357`, `:446-477`, `:472` |
| Обновление счётчика — только mount/invalidation: `refetchOnWindowFocus: false`, поллинга (`refetchInterval`) нет, сокетов нет | `apps/mobile/shared/api/query-client.ts:15`, `apps/mobile/entities/notifications/api.ts:72-85` |

Побочный факт (doc rot): комментарии на org-дашборде дважды утверждают «the API has no notifications module at all» — при том что тут же используется `useUnreadCountQuery` и колокольчик (`apps/mobile/app/org/(tabs)/index.tsx:341-343`, `:418-423` против `:357`, `:446-477`). Комментарии устарели.

## Чего нет (по пунктам чек-листа 1.1)

1. **expo-notifications — отсутствует полностью.**
   - Нет в dependencies (`apps/mobile/package.json:27-70`) и devDependencies (`:72-82`).
   - Нет в plugins `app.config.ts` — там только expo-router / secure-store / font / localization / splash-screen / camera / location / image-picker (`apps/mobile/app.config.ts:38-83`).
   - grep по `expo-notifications` во всём `apps/mobile` (исключая node_modules, включая app/, shared/, entities/, features/, android/, конфиги) — 0 совпадений. `app.json` нет вовсе (только `app.config.ts`).
   - `eas.json` не существует нигде в репо (find по всему дереву без node_modules — пусто), т.е. APNs/FCM credentials через EAS не настроены.
   - `google-services.json` в `apps/mobile/android` отсутствует (find — пусто); каталога `ios/` нет вообще, значит нет и `GoogleService-Info.plist`.
   - `projectId` / `getExpoPushTokenAsync` — grep 0 совпадений.
2. **Жизненный цикл push-токена — кода нет.** Grep по `push token / pushToken / device-token / deviceToken` в `apps/mobile` — 0. В контрактах нет device/push endpoint'ов (grep `device|push` по `packages/api-contracts/src/generated/openapi.ts` — 0 релевантных). В SDK (`packages/sdk-account/src/index.ts`, `packages/sdk-workspace/src/index.ts`, `packages/sdk-public/src/index.ts`, `packages/sdk-admin/src/index.ts`) — grep `notif`/`device` — 0. Понятия deviceId/installationId в `token-store` нет (`apps/mobile/shared/api/token-store.ts:14-22` — только ключи токенов и активной организации). Инвалидации при logout, соответственно, тоже нет — logout чистит только токены сессии (`apps/mobile/shared/auth/auth-context.tsx:389-400`, `apps/mobile/shared/api/token-store.ts:74-85`).
3. **Permission flow — нет.** `POST_NOTIFICATIONS` в манифесте отсутствует; объявлены только CAMERA, INTERNET, READ/WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW, VIBRATE (`apps/mobile/android/app/src/main/AndroidManifest.xml:2-7`). Никаких запросов разрешений на уведомления, pre-permission screen и обработки denied в коде нет (grep `POST_NOTIFICATIONS|requestPermissions` по apps/mobile — 0). Существующий паттерн обработки denied есть у камеры — экран сканера с кнопкой `Linking.openSettings()` (`apps/mobile/app/org/scan.tsx:404`) — годится как образец.
4. **Android notification channels / iOS categories & actions — нет.** Grep `setNotificationChannel|NotificationChannel|category` (в контексте уведомлений) — 0 совпадений.
5. **Foreground/background/killed handlers — нет.** `setNotificationHandler`, `getLastNotificationResponseAsync`, `addNotificationResponseReceivedListener` — grep 0. Обработчиков тапа по пушу нет.
6. **Deep links — только scheme, без universal links.** В `ios`-конфиге нет `associatedDomains` (`apps/mobile/app.config.ts:21-24`), в манифесте нет https intent-filter с `autoVerify` (`apps/mobile/android/app/src/main/AndroidManifest.xml:24-29`). Кастомного кода обработки входящих URL нет: grep `useURL|getInitialURL|createURL|parseInitialURL` — 0; весь routing — неявный, силами Expo Router (файл `app/` = URL). `expo-linking` используется только для ИСХОДЯЩИХ `Linking.openURL` (карты, mailto, тикеты — например `apps/mobile/app/map.tsx:252`, `apps/mobile/app/org/scan.tsx:216`).
7. **Badge count (иконка приложения) — нет.** `setBadgeCountAsync`/badge-API — grep 0. Единственный «badge» — рисованный кружок на колокольчике внутри UI (`apps/mobile/app/org/(tabs)/index.tsx:456-475`).
8. **Inbox у участника — нет.** Notification center существует только в организаторском стеке (`apps/mobile/app/org/notifications.tsx`); в участнических вкладках только discover/tickets/certificates/profile (см. инвентарь ниже), экрана уведомлений там нет. В сгенерированных SDK NotificationsApi нет (см. п. 2) — мобилка ходит в API через сырой `apiTransport` (`apps/mobile/entities/notifications/api.ts:55-58`).

## Инвентарь маршрутов Expo Router (для deep link table)

Источник — фактические файлы `apps/mobile/app/**` (route-группы `(auth)`, `(tabs)`, `org/(tabs)` в URL не попадают). Префикс deep link: `eventflow://` (`apps/mobile/app.config.ts:12`).

**Гость / auth** (`apps/mobile/app/(auth)/_layout.tsx`):
- `/welcome`, `/login`, `/signup`, `/verify`, `/forgot-password`, `/reset-password`, `/success`, `/intent`, `/invite-code`, `/create-org`

**Участник:**
- `/` — маршрутизатор по сессии: workspace → `/org`, участник → `/discover`, org-only аккаунт → `/workspace-switch`, гость → `/welcome` (`apps/mobile/app/index.tsx:26-39`)
- табы: `/discover`, `/tickets`, `/certificates`, `/profile` (`apps/mobile/app/(tabs)/_layout.tsx`)
- `/event/[id]`, `/ticket/[id]`, `/certificate/[id]`, `/organizer/[id]`, `/map`, `/search`, `/profile-edit`, `/workspace-switch`

**Организатор** (весь стек за `useWorkspaceGate`):
- табы: `/org`, `/org/events`, `/org/work`, `/org/profile` (`apps/mobile/app/org/(tabs)/_layout.tsx`)
- `/org/notifications`, `/org/profile-edit`, `/org/team`, `/org/boards`, `/org/board/[boardId]`, `/org/blog`, `/org/blog/editor`, `/org/scan`, `/org/event-form`
- событие: `/org/event/[id]`, `/org/event/preview`, `/org/event/qr`, `/org/event/submitted`
- разделы события (все `[eventId]`): `/org/agenda`, `/org/analytics`, `/org/attendance`, `/org/attendees`, `/org/badges`, `/org/certificates`, `/org/comments`, `/org/questions`, `/org/speakers`

**Поведение при отсутствии прав / чужом tenant:**
- Каждый org-экран сидит за `useWorkspaceGate`: пока идёт восстановление workspace на cold start — держит пустой canvas, если workspace так и не восстановился — `Redirect` на `/discover` (`apps/mobile/shared/auth/workspace-guard.tsx:29-34`). Комментарий гейта прямо описывает сценарий deep link на org-маршрут при холодном старте (`apps/mobile/shared/auth/workspace-guard.tsx:4-15`).
- Разделы события уже проектировались с оглядкой на push deep link: `backToEvent` обрабатывает «открыто из пуша, истории нет» — pop, иначе replace на событие (`apps/mobile/shared/ui/org/section-rail.tsx:71-85`).
- Чужой tenant дальше гейта ловится только сервером: org-scoped токен (см. фон ниже) даст 403/404, а query-client такие ошибки не ретраит (`apps/mobile/shared/api/query-client.ts:22-27`). Клиентской проверки «этот entityId принадлежит текущей организации» перед навигацией нет (`apps/mobile/app/org/notifications.tsx:132-137` навигирует по голому `entityId`).

## Фоновые факты (i18n, storage, auth)

- **i18n:** язык `uz | ru | en`; дефолт — локаль устройства через `expo-localization`, фолбэк `uz` (`apps/mobile/shared/i18n/index.tsx:32-35`); выбор персистится под ключом `ef.lang` в SecureStore (web — localStorage) (`apps/mobile/shared/i18n/index.tsx:22`, `:39`, `:46-53`). **Сервер локали НЕ видит:** транспорт не шлёт `Accept-Language` (`apps/mobile/shared/api/transport.ts:121-133`; grep `Accept-Language` по apps/mobile и packages/sdk-*/api-contracts — 0). Для локализации push это придётся решать отдельно.
- **Storage:** `expo-secure-store` (Keychain/Keystore) — единственное хранилище токенов; AsyncStorage запрещён политикой модуля (`apps/mobile/shared/api/token-store.ts:4-6`). Ключи: `ef.auth.access` (JWT 15 мин), `ef.auth.refresh` (opaque, 7 дней, ротируемый), стэш личной сессии `ef.personal.*`, `ef.workspace.org` — id активной организации (`apps/mobile/shared/api/token-store.ts:8-9`, `:14-22`).
- **Auth:** при входе в workspace активный слот держит ORG-SCOPED токен, личная сессия стэшируется (`apps/mobile/shared/api/token-store.ts:16-20`); org-токен намеренно не переживает перезапуск — cold start всегда заново входит через `me.enterWorkspace` (`apps/mobile/shared/api/token-store.ts:109-116`). 401 → single-flight refresh → retry-once → `emitSessionExpired` (`apps/mobile/shared/api/transport.ts:107-147`). Logout зовёт `publicSdk.auth.logout({ refreshToken })` и чистит всё хранилище + react-query кэш (`apps/mobile/shared/auth/auth-context.tsx:389-400`). Для device-token lifecycle это значит: удобной точки «привязать токен к userId+deviceId» две (login и enterWorkspace), а точка инвалидации — logout — уже существует, но про push ничего не знает.

## OPEN_QUESTIONS кандидаты

| Вопрос | Предлагаемый дефолт |
| --- | --- |
| Тап по уведомлению не помечает его прочитанным — только «Прочитать всё» (`apps/mobile/app/org/notifications.tsx:132-156`). Задумано или недоделка? | Помечать по тапу: мутация уже принимает `ids` (`apps/mobile/entities/notifications/api.ts:91-96`), нужен только вызов. |
| Как сервер узнает язык получателя push, если локаль живёт только на устройстве (`apps/mobile/shared/i18n/index.tsx:22-53`) и `Accept-Language` не шлётся? | Передавать `locale` при регистрации device token и обновлять при смене языка; серверная фраза не нужна — слать `type`+`payload` и локализовать на устройстве нельзя для killed-push, значит locale обязателен в записи токена. |
| К какому identity привязывать push token при org-scoped сессии (активный токен — организационный, `apps/mobile/shared/api/token-store.ts:16-20`)? | К Account (личному userId): устройство одно, workspace — атрибут сессии; орг-адресация решается на стороне API по membership. |
| Понятия deviceId в приложении нет (grep — 0). Что считать устройством при ротации токена? | Генерировать `installationId` (uuid) один раз в SecureStore; пара (userId, installationId) — ключ записи, Expo push token — ротируемое значение. |
| `eas.json` отсутствует, сборки — gradle из `apps/mobile/android` + раздача через супер-админку (память проекта). Где будут жить FCM/APNs credentials без EAS? | `google-services.json` в `android/app` + APNs key на сервере отправки; либо завести EAS build — решить до выбора транспорта (Expo push service vs прямой FCM/APNs). |
| Счётчик unread обновляется только на mount/invalidation (`apps/mobile/shared/api/query-client.ts:15`; поллинга нет). Достаточно ли до появления push? | Оставить как есть; после появления push — инвалидировать `notificationKeys.unread` из обработчика входящего пуша. |
| Инбокс участника: у участника нет ни экрана, ни вкладки (инвентарь маршрутов выше). Планируется? | Push-first для участника (статусы заявок уже есть как типы — `apps/mobile/entities/notifications/api.ts:16-24`), inbox-экран участника — отдельным этапом. |
| Universal links (https) для пушей нужны или хватит scheme `eventflow://`? | Для пушей хватит scheme (payload свой); https App Links / associatedDomains — отдельная задача, если ссылки пойдут в письма/веб. |
| Комментарии «API has no notifications module» на дашборде устарели (`apps/mobile/app/org/(tabs)/index.tsx:341-343`, `:418-423`) | Вычистить при первом же PR по этой зоне. |
