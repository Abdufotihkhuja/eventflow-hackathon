# Аудит 1.3–1.4 — Контент, i18n, настройки

Ветка: `stage`. Дата: 2026-08-01. Read-only инвентаризация; все утверждения — со ссылками `path:line`.

## Шаблоны и их локализация

**Где хранятся.** Все email-шаблоны — код в `apps/api/src/modules/mail/email/`; в БД шаблонов нет, в `packages/i18n` текстов писем нет (в `packages/i18n/src/messages/{ru,en,uz}/` нет файлов `notifications.ts`/`emails.ts` — состав каталога: `actions.ts … workspace.ts`, см. листинг каталога). Формат — не handlebars/react-email/mjml, а собственные TypeScript-билдеры: реестр `TEMPLATES: Record<string, EmailTemplateBuilder>` (`apps/api/src/modules/mail/email/templates.ts:1500`), рендер в HTML+plain-text — `renderEmail()` (`apps/api/src/modules/mail/email/render.ts:23`), layout — `apps/api/src/modules/mail/email/layout.ts:79` (`renderHtml`), текстовая версия — `apps/api/src/modules/mail/email/text.ts:37`. Хотя `handlebars`/`mjml` числятся в `apps/api/package.json:144,161` (в overrides/resolutions), в рендере писем они не используются — импортов нет ни в одном файле `email/`.

**Тексты in-app уведомлений** в БД не хранятся: модель `Notification` хранит `type` + `payload` (подстановки), «никаких готовых предложений» (`apps/api/prisma/schema.prisma:569,583`, авторский комментарий `schema.prisma:562-568`). Фразу собирает клиент: словарь `notif.*` на 3 языка в `apps/mobile/shared/i18n/strings.ts:1533-1546`, сборка — `apps/mobile/app/org/notifications.tsx:52-55`. Исключение-антипаттерн: лента активности дашборда всё же складывает готовые русские фразы на сервере — `` description: `+1 регистрация на ${reg.eventTitle}` `` (`apps/api/src/modules/organizations/dashboard/dashboard.service.ts:177,199,217,229`).

**Локализация писем.** Каждый билдер получает `locale: 'ru' | 'en' | 'uz'` и содержит все 3 языка через хелпер `L()` (`templates.ts:9-11`); «хром» письма (футер, unsubscribe, support-блок) — тоже 3 локали (`apps/api/src/modules/mail/email/i18n.ts:18-51`). Дефолт `ru` (`apps/api/src/modules/mail/email/types.ts:4`).

Таблица (реестр `templates.ts:1501-1526`; `category` управляет unsubscribe-подавлением):

| Шаблон | Категория | Языки в билдере | path:line |
|---|---|---|---|
| email-verification-code / password-reset-code / email-change-code | transactional | ru/en/uz | templates.ts:31,77 |
| password-changed / email-changed-notification | transactional | ru/en/uz | templates.ts:120,171 |
| member-invitation | transactional | ru/en/uz | templates.ts:228 |
| speaker-invitation / event-invitation | transactional | ru/en/uz | templates.ts:339,406 |
| registration-created/-approved/-rejected/-cancelled/-revoked | transactional | ru/en/uz | templates.ts:458,550,611,659,707 |
| event-notification (рассылка организатора участникам) | **notification** | ru/en/uz (текст сообщения — как ввёл организатор) | templates.ts:757-786 |
| contact-request | transactional | ru/en/uz | templates.ts:790 |
| plan-expiry-reminder | transactional | ru/en/uz | templates.ts:876 |
| blog-post-approved/-rejected | transactional | ru/en/uz | templates.ts:916,954 |
| organization-approved/-rejected | transactional | ru/en/uz | templates.ts:1005,1066 |
| event-approved/-rejected | transactional | ru/en/uz | templates.ts:1148,1209 |
| certificate-issued | transactional | ru/en/uz | templates.ts:1435 |
| task-assigned / task-deadline / task-mentioned | **notification** | ru/en/uz | templates.ts:1275,1328,1391 |

**Мёртвые шаблоны:** `task-assigned`/`task-deadline`/`task-mentioned` зарегистрированы (`templates.ts:1524-1526`), но во всём `apps/api/src` нет ни одного вызова, ставящего их в очередь (grep `task-assigned` по `apps/api/src` находит только сам реестр).

**Фактический язык писем: всегда русский.** Хотя билдеры трёхъязычные, локаль берётся из `context.locale` (`render.ts:35`), а её **ни один вызывающий не передаёт** — см. «Локаль получателя». Плюс `subject`, задаваемый при постановке в очередь, захардкожен по-русски (`apps/api/src/modules/mail/mail.service.ts:61,165,222,334,687,717,752,787`) — правда, он лишь fallback: непустой subject билдера побеждает (`render.ts:42-44`).

## Локаль получателя

- **Поля locale/language у получателей НЕТ.** Grep `locale|language|preferredL` по всей `apps/api/prisma/schema.prisma` даёт единственное совпадение — `languages String[]` (`schema.prisma:423`), и это анкетное поле профиля User «Языки (несколько)», не локаль интерфейса. У `Account` (`schema.prisma:317`), `User` (`schema.prisma:397`) и `OrganizationMember` (`schema.prisma:599`) поля локали нет.
- Механизм передачи есть, но не используется: `renderEmail` читает `context.locale` с fallback на `ru` (`render.ts:35`, `types.ts:6-14` `resolveLocale`); параметр `locale?` объявлен только у 5 методов `MailService` (`mail.service.ts:682,711,745,781,817` — organization-approved/rejected, event-approved/rejected, certificate-issued), но **ни один вызывающий его не передаёт**: `super-admin.service.ts:1814-1817,1959-1965` и `certificate-generation.service.ts:473-490` вызывают без `locale`; grep `locale` по `super-admin.service.ts`, `registrations.service.ts`, `billing-sweep.service.ts`, `invites.service.ts`, `speakers.service.ts` совпадений в контексте почты не находит. У остальных методов (например, `sendEmailVerificationCode`, `mail.service.ts:327-343`; `sendRegistrationApproved`, `mail.service.ts:156-178`) параметра `locale` нет вовсе.
- Из запроса (`Accept-Language`/query) локаль в почту тоже не пробрасывается — query-`locale` в API используется только для локализации *контента событий* в ответах (например, `apps/api/src/modules/registrations/dto/registration-query.dto.ts:86-88`).
- **Итог: все письма уходят на `ru`** независимо от языка получателя (`DEFAULT_LOCALE: Locale = 'ru'`, `types.ts:4`).
- In-app уведомления локали отправки не требуют по конструкции — язык выбирает клиент при отображении (`schema.prisma:562-568`, `apps/mobile/app/org/notifications.tsx:52-55`).

## Плюрализация

- `packages/i18n` — собственная библиотека (без i18next/ICU MessageFormat): плоские каталоги сообщений по неймспейсам (`packages/i18n/src/translate.ts:14-27` — dot-key lookup), интерполяция `{param}` регэкспом (`packages/i18n/src/interpolation.ts:3-10`), fallback-локаль `en` (`packages/i18n/src/config.ts:5`).
- Плюрализация — `plural()` на `Intl.PluralRules` (CLDR), **русские one/few/many поддерживаются** (`packages/i18n/src/plural.ts:26-50`).
- В мобилке своя копия механизма: `pluralCategory` «uz → always "other"; en → one/other; ru → one/few/many» (`apps/mobile/shared/i18n/plurals.ts:10-11`), count-aware `t` (`apps/mobile/shared/i18n/index.tsx:59,97`).
- **В текстах уведомлений плюрализация не используется**: все ключи `notif.*` мобилки — без счётчиков (`apps/mobile/shared/i18n/strings.ts:1537-1546`); в email-шаблонах `plural` не импортируется (в `apps/api/src/modules/mail/email/templates.ts:1-6` импортов из `@eventflow/i18n` нет). `plural()` живёт в UI-счётчиках (например, `apps/web-workspace/src/pages/dashboard/ui/dashboard-page.tsx:252,267`).

## Экранирование / безопасность шаблонов

- **HTML-escape есть и применяется системно.** `esc()` экранирует `& < > " '` (`apps/api/src/modules/mail/email/components.ts:16-23`), `escMultiline()` — то же + `\n → <br/>` (`components.ts:26-28`). Все точки вставки пользовательских данных идут через них: параграфы/интро/аутро (`layout.ts:86-91,100-105`), heading (`components.ts:36-40`), CTA-кнопка и URL (`components.ts:43-45`), infobox (`components.ts:112-118`), ticket-карточка с названием события (`components.ts:145-153`), key-value строки (`components.ts:163-170`), сообщение организатора в рассылке (`components.ts:184-195` + `templates.ts:777`), subject в `<title>` (`layout.ts:123`), preheader (`layout.ts:128`). Название события в письме проходит через `esc` → stored-XSS в письмах на этом пути не видно.
- **Длина.** Единственная валидация длины — у рассылки организатора: subject ≤ 200, message ≤ 5000 (`apps/api/src/modules/mail/mail.controller.ts:30,36`). Для `Notification.payload` ограничений длины нет (`schema.prisma:583` — просто `Json?`); рекомендаций/лимитов title/body у in-app уведомлений нет (клиент сам обрезает при рендере).
- **Эмодзи** в шаблонах писем и в `notif.*`-строках не используются: grep `🎉|✅|❌|📅|🔔|🎫` по `templates.ts` и `mail.service.ts` — пусто; в строках только типографские кавычки «»/“” (`strings.ts:1537-1546`).
- Плейн-текст версия собирается без HTML (`text.ts:5-30`) — экранирование там не нужно.
- Не проверено (см. OPEN_QUESTIONS): защита subject от header-injection (`\r\n` в названии события) на уровне nodemailer (`mail-dispatch.service.ts:140-147` передаёт subject как есть).

## Настройки и согласие (что есть / чего нет)

**Есть — только opt-out от email категории `notification`:**
- Модель `EmailUnsubscribe` (email+category, unique) — `apps/api/prisma/schema.prisma:2227-2238`.
- Единственная opt-out категория — `notification`; transactional доставляется всегда (`apps/api/src/modules/email-unsubscribe/unsubscribe-token.service.ts:5-14`).
- Подавление при отправке: `isSuppressed()` (`apps/api/src/modules/email-unsubscribe/email-unsubscribe.service.ts:38-48`), применяется в диспатче только к `category === 'notification'` (`apps/api/src/modules/mail/application/mail-dispatch.service.ts:117-133`).
- Unsubscribe-ссылка в футере: подписанный HMAC-токен per-recipient генерируется на **каждое** письмо (`mail-dispatch.service.ts:96-105`), ссылка рендерится в футере всякий раз, когда передан URL — т.е. и в transactional письмах тоже (`mail-dispatch.service.ts:107-113` всегда передаёт `pageUrl`; футер — `apps/api/src/modules/mail/email/layout.ts:51-58`; подпись «Отписаться от подобных писем» на 3 языках — `email/i18n.ts:28,38,49`). Заголовки `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` (RFC 8058) ставятся на все письма (`mail-dispatch.service.ts:135-138`), one-click endpoint — `apps/api/src/modules/email-unsubscribe/email-unsubscribe.controller.ts:21-37`.

**Нет (искал — не нашёл):**
- `NotificationPreference` или аналога в Prisma нет: grep `NotificationPreference|notification_pref|quiet|mute` по `apps/api/prisma/schema.prisma` — 0 совпадений (кроме нерелевантных).
- Матрицы предпочтений в API/UI нет. В настройках web-workspace (`apps/web-workspace/src/pages/settings/ui/` — settings-page, organization-settings-view, member-settings-view и др.) grep `notif|уведомл` — пусто. В мобильных профилях (`apps/mobile/app/(tabs)/profile.tsx`, `apps/mobile/app/org/(tabs)/profile.tsx`) упоминаний notification-настроек нет (grep `notif|push|уведомл` — только навигация/комментарии).
- Глобального mute, per-event mute, quiet hours нет нигде: grep `mute|quiet` по `apps/mobile/shared`, `apps/web-workspace/src`, `apps/api/src` — только `text-muted`-стили и `deleteTemplateFileQuietly` (`apps/api/src/modules/badges/badges.service.ts:1125`).
- Маркетинговых рассылок (digest, анонсы) нет: единственные «нетранзакционные» письма — рассылка организатора участникам (`templates.ts:757`) и мёртвые task-* (`templates.ts:1524-1526`). Отдельной категории `marketing` нет (`unsubscribe-token.service.ts:10-14`).
- In-app уведомления: центр есть только в мобилке организатора (`apps/mobile/app/org/notifications.tsx`); модель — только для организаций (`organizationId` обязателен, `schema.prisma:570`), у участников in-app уведомлений нет. В web-workspace колокольчик — опциональный проп, который ни одна страница не передаёт (проп прокидывается `apps/web-workspace/src/widgets/admin-layout/ui/admin-layout.tsx:38,143`, рендер условный `admin-navbar.tsx:131`; grep `onNotificationsClick` по остальному коду web-workspace — пусто). В web-admin колокольчик — мок: `notificationCount={3}` захардкожен, обработчик — `console.log("Notifications clicked")` (`apps/web-admin/src/widgets/protected-layout/ui/protected-layout.tsx:441-443,507,511`).
- Push-инфраструктуры нет: `expo-notifications`/push в `apps/mobile/package.json` отсутствуют (grep — пусто).

## Чего нет (сводно по чек-листам 1.3–1.4)

1. (1.3.1) Нет шаблонов в БД и в `packages/i18n`; нет handlebars/react-email рендера (только собственные TS-билдеры). Локализация писем формально есть (3 языка в билдерах), **фактически не работает** — locale никем не передаётся, всё уходит на ru (`render.ts:35`, `types.ts:4`).
2. (1.3.2) Нет поля locale/language interface-локали у `Account`/`User`/`OrganizationMember` (grep по `schema.prisma` — только анкетное `languages`, `schema.prisma:423`); нет проброса локали из запроса в отправку.
3. (1.3.3) Плюрализация с ru one/few/many есть в обеих i18n-библиотеках (`packages/i18n/src/plural.ts:26-50`, `apps/mobile/shared/i18n/plurals.ts:10-11`), но в текстах уведомлений/писем не используется.
4. (1.3.4) Нет лимитов длины на `Notification.payload` и на подставляемые в письма поля (кроме broadcast subject/message, `mail.controller.ts:30,36`); нет проверки subject на header-injection на нашей стороне. HTML-escape — есть везде (`components.ts:16-23`).
5. (1.3.5) Нет namespace `notifications`/`emails` в `packages/i18n/src/messages/*` — строки in-app уведомлений живут только в мобильном словаре (`apps/mobile/shared/i18n/strings.ts:1533-1546`), веб-клиенты их не имеют (и не имеют центра уведомлений).
6. (1.4.6) Нет `NotificationPreference` (Prisma/API/UI); нет никаких настроек «получать уведомления» в профилях web-workspace и mobile.
7. (1.4.7) Нет глобального mute, per-event mute, quiet hours.
8. (1.4.8) Разделение transactional vs notification есть (`types.ts:41-45`), маркетинговых рассылок как класса нет; unsubscribe-ссылка и RFC 8058 заголовки есть во всех письмах (`layout.ts:51-58`, `mail-dispatch.service.ts:135-138`), но отписка действует только на категорию `notification` (`mail-dispatch.service.ts:117-133`).

## OPEN_QUESTIONS кандидаты

| Вопрос | Предлагаемый дефолт |
|---|---|
| Где хранить локаль получателя: поле `locale` на `Account` (единая identity после invite/membership rework) или на `User`+`OrganizationMember` по отдельности? | `Account.locale` (nullable, `ru` по умолчанию), заполнять из UI-переключателя языка при логине/смене языка; в `MailService` передавать всегда. |
| Должна ли unsubscribe-ссылка показываться в transactional письмах (сейчас показывается всегда, `layout.ts:51-58`), хотя на их доставку не влияет? | Оставить (deliverability-friendly), но текст уточнить: «отписаться от уведомлений» ≠ «от всех писем» — текущая формулировка «от подобных писем» (`email/i18n.ts:28`) на transactional вводит в заблуждение. |
| Нужна ли защита subject от CRLF-injection (название события организатора попадает в subject, `mail.service.ts:165`)? nodemailer, вероятно, сам режет заголовки, но это не проверено в коде/тестах. | Считать закрытым nodemailer'ом, добавить unit-тест на `\r\n` в eventTitle; до теста — низкий риск. |
| Судьба мёртвых шаблонов task-assigned/task-deadline/task-mentioned (`templates.ts:1524-1526`): подключать к boards или удалить? | Оставить как задел; при построении системы уведомлений сделать их первым email-каналом с преференсами (они уже `category: 'notification'`). |
| Считать ли broadcast организатора (`event-notification`) маркетингом с точки зрения согласия участника? Сейчас согласие = сам факт регистрации, opt-out общий на всю категорию `notification` (не per-organizer, не per-event). | Оставить одну категорию до появления реальных digest/анонсов; в матрице преференсов зарезервировать `organizer_broadcast` как отдельный тип. |
| `payload` уведомления не ограничен (`schema.prisma:583`) — нужен ли контракт (максимум N ключей, строки ≤ 256)? | Зафиксировать контракт в DTO `EmitNotification` (сейчас `apps/api/src/modules/notifications/notifications.service.ts:11-20` принимает произвольный `Prisma.InputJsonValue`); лимит 256 символов на строковое значение. |
| Лента активности дашборда с русскими фразами в API (`dashboard.service.ts:177`) — мигрировать на type+payload как у Notification? | Да, при следующем заходе в дашборд: мобилка уже вынуждена выбрасывать `description` (`schema.prisma:564-566`). |
