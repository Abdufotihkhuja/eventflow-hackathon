# INVITE_ONLY и код приглашения (регистрация)

## Обзор

Для событий с `accessType: INVITE_ONLY` и `requiresInviteCode: true` участник должен ввести код приглашения перед регистрацией. Код передаётся в query: `POST events/:eventId/register?inviteCode=...`.

## Фронт: страница события (регистрация)

1. **Проверка возможности регистрации**  
   Вызвать `GET public/events/:id/can-register` (или по slug, если бэкенд поддерживает).  
   В ответе: `accessType`, `requiresInviteCode`, `canRegister`, `reason`.

2. **Поле «Код приглашения»**  
   Если `accessType === "INVITE_ONLY"` и `requiresInviteCode === true`:
   - Показать обязательное поле ввода «Код приглашения» перед кнопкой «Зарегистрироваться».
   - Использовать компонент `EventRegistrationInviteField` из `@features/events` (подставляет код из URL `?inviteCode=...` при необходимости).
   - Не отправлять регистрацию без кода (валидация на клиенте).

3. **Отправка регистрации**  
   `POST events/:eventId/register?inviteCode=ВВЕДЁННЫЙ_КОД` — тело как обычно: `answers`, `role`, `firstName`, `lastName`, `email` и т.д.  
   Хук `useRegisterForEvent()` принимает `inviteCode` и передаёт его в query.

4. **Обработка ответов**
   - **403** на `POST .../register` — показать сообщение: «Регистрация на это мероприятие доступна только по приглашению» (использовать константу `INVITE_ONLY_REGISTRATION_MESSAGE` из `@features/events/api`).
   - **200/201** — регистрация создана; инвалидируются «мои регистрации» и запрос события (актуальный `myRegistration`).

5. **Ссылка с кодом в URL**  
   При переходе по `.../events/:id?inviteCode=EVT-XXX` поле кода подставляется автоматически (`EventRegistrationInviteField` с `fillFromUrl={true}`).

## Организатор (app.eventflow.uz)

- На странице события при `accessType: INVITE_ONLY` отображаются текущий код приглашения (в `EventInfoCard`) и блок с кнопкой **«Регенерировать код»**.
- Кнопка вызывает `POST events/:id/regenerate-invite-code`; после успеха обновляется отображаемый код и показывается предупреждение, что старый код больше не действует.

## API

- `GET public/events/:id/can-register` — ответ: `{ canRegister, reason?, accessType?, requiresInviteCode? }`.
- `POST events/:eventId/register?inviteCode=...` — регистрация с кодом (тело без изменений).
- `POST events/:id/regenerate-invite-code` — регенерация кода (организатор).
