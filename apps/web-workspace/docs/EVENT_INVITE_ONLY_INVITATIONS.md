# Приглашения на закрытые мероприятия (INVITE_ONLY)

Для событий с типом доступа **INVITE_ONLY** организатор может:

1. **Получить ссылку с кодом** — для копирования или вставки куда угодно.
2. **Отправить приглашение на email** — письмо со ссылкой и кодом приглашения.

---

## 1. Получить ссылку и код приглашения

**GET** `/api/v1/events/:id/invite-link`

- Права: `EVENTS_READ`.
- Только для событий с `accessType: INVITE_ONLY`.
- Ответ: `{ inviteLink: string, inviteCode: string }`.

`inviteLink` — полная URL страницы события с параметром `inviteCode` (например `https://site.com/events/event-slug?inviteCode=EVT-XXXXXXXX`). Получатель переходит по ссылке и может зарегистрироваться с уже подставленным кодом.

---

## 2. Отправить приглашение на email

**POST** `/api/v1/events/:id/send-invitation`

**Body:** `{ "email": "guest@example.com" }`

- Права: `EVENTS_UPDATE`.
- Только для событий с `accessType: INVITE_ONLY`.
- Отправляет письмо с темой «Приглашение на мероприятие: {название}», в теле — ссылка на регистрацию и код приглашения.
- Ответ: `{ "message": "Приглашение отправлено на guest@example.com" }`.

---

## 3. Регенерация кода

Если нужно инвалидировать старую ссылку/код: **POST** `/api/v1/events/:id/regenerate-invite-code`. После этого старый код перестаёт работать, новый возвращается в `GET invite-link` и используется при следующих отправках писем.

---

## Примеры

```bash
# Получить ссылку и код
GET /api/v1/events/550e8400-e29b-41d4-a716-446655440000/invite-link
# → { "inviteLink": "https://.../events/my-event?inviteCode=EVT-ABC12DEF", "inviteCode": "EVT-ABC12DEF" }

# Отправить приглашение
POST /api/v1/events/550e8400-e29b-41d4-a716-446655440000/send-invitation
Content-Type: application/json
{ "email": "guest@example.com" }
# → { "message": "Приглашение отправлено на guest@example.com" }
```

Регистрация получателя: переход по `inviteLink` или ручной ввод кода на странице события и **POST** `/api/v1/events/:eventId/register?inviteCode=EVT-ABC12DEF`.
