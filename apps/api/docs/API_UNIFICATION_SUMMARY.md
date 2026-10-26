# Сводка по унификации API EventFlow

## Что закреплено

- Для user self-surface canonical path: `/api/v1/account/me`
- Для organization self-surface canonical path: `/api/v1/workspace/me`
- Для member self-surface canonical path: `/api/v1/workspace/members/me`
- Для session entrypoint canonical path: `/api/v1/session/me`

---

## Унификация organization profile

Поле `organizationName` используется как единое публичное имя организации во всех актуальных workspace endpoints.

Актуальные endpoints:

- `GET /api/v1/workspace/me`
- `PATCH /api/v1/workspace/me`
- `DELETE /api/v1/workspace/me`
- `POST /api/v1/workspace/me/complete-onboarding`
- `POST /api/v1/workspace/me/complete-company-info`

Пример:

```json
{
  "organizationName": "EventFlow Inc.",
  "description": "Updated description",
  "phone": "+998901234567"
}
```

---

## Быстрая проверка

```bash
curl -X GET http://localhost:3000/api/v1/workspace/me \
  -H "Authorization: Bearer ACCESS_TOKEN"

curl -X PATCH http://localhost:3000/api/v1/workspace/me \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"Updated Company Name"}'
```

---

## Связанные документы

- `WORKSPACE_ME_API.md` — актуальная справка по `/workspace/me`
- `ORGANIZATION_COMPANY_INFO_API.md` — completion flow для company information
- `ORGANIZATION_UPDATE_FIELDS.md` — поля PATCH `/workspace/me`

---

## Важно

- Старый self-profile path организации больше не считать действующим.
- Member management не переезжал: `/api/v1/organizations/members/*` остаётся валидным management surface.
