# NOTIFICATIONS_AUDIT — сводный аудит системы уведомлений EventFlow

Дата аудита: 2026-08-01. Ветка: `stage`. Read-only инвентаризация end-to-end: от домен-события в `apps/api` до тапа по пушу в `apps/mobile`.

Полные отчёты (каждое утверждение — со ссылкой `path:line`):

- [audit/mobile.md](audit/mobile.md) — раздел 1.1: транспорт и устройство (mobile)
- [audit/backend.md](audit/backend.md) — раздел 1.2: backend pipeline, таблица всех существующих уведомлений
- [audit/content-prefs.md](audit/content-prefs.md) — разделы 1.3–1.4: контент, i18n, настройки и согласие

## Executive summary аудита

**Push-канала не существует ни в одном слое.** В `apps/mobile` нет `expo-notifications` (ни в deps, ни в plugins), нет EAS-конфига, нет `POST_NOTIFICATIONS`, нет device-token кода; в `apps/api` нет push-SDK, нет моделей `DeviceToken` / `NotificationDelivery` / `NotificationPreference`; в контрактах нет device-endpoints. Поправка к вводным: Expo SDK **54**, не 56.

**Что реально работает:**
- In-app уведомления организации: единая точка `NotificationsService.emit` (`apps/api/src/modules/notifications/notifications.service.ts:36`), 6 живых поводов (заявка на событие, модерация события ×2, верификация организации ×2, MEMBER_JOINED). Лента общая на организацию, dedup отсутствует. В мобилке — живой инбокс организатора `/org/notifications` (ходит в API напрямую, мимо SDK); у участника инбокса нет.
- Email: 18 живых поводов через одну трубу MailService → BullMQ `mail.send` → worker-прокси → `/internal/jobs/mail/send` → nodemailer/SMTP. attempts=3, exp backoff, DLQ нет. Идемпотентность — Redis SET NX TTL 7 дней, таблицы отправок в БД нет (краш между reserve и send молча теряет письмо на 7 дней).

**Ключевые дыры:**
- Approve/reject регистрации **полностью молчат**: `sendRegistrationApproved/Rejected` — мёртвый код, enum-значения `REGISTRATION_APPROVED/REJECTED` не эмитятся.
- Локализация писем мертва: все ~26 шаблонов трёхъязычны (ru/uz/en, TS-билдеры в коде), но `context.locale` никем не передаётся → всё уходит на русском. Поля `locale` у Account/User нет; сервер вообще не знает язык пользователя (мобилка держит его в SecureStore и не шлёт Accept-Language).
- Event-reminder'ов не существует; у Event есть `startDate/endDate/registrationDeadline`, но **нет timezone-поля**.
- Преференсов нет вообще (ни матрицы, ни mute, ни quiet hours); есть только one-click EmailUnsubscribe одной категории `notification`, при этом unsubscribe-ссылка рендерится во всех письмах, включая транзакционные.
- Тап по in-app уведомлению не помечает его прочитанным; счётчик без поллинга.

**Безопасность/изоляция:** stored-XSS в письмах не найден (системный `esc()`); утечек аудитории между организациями не найдено; аудит-лога отправок нет.
