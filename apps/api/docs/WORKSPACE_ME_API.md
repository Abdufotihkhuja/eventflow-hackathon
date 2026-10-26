# API Управления Организацией (/workspace/me)

## Обзор

Canonical self-service surface для текущей организации находится под `/api/v1/workspace/me`.
Документ описывает чтение, обновление, удаление и completion endpoints для владельца организации.

---

## Endpoints

### GET /api/v1/workspace/me

- Авторизация: JWT
- Доступ: `ORGANIZATION`, `MEMBER`
- Возвращает профиль текущей организации

```http
GET /api/v1/workspace/me
Authorization: Bearer {accessToken}
```

Ключевые поля ответа:

- `organizationName`
- `email`
- `description`
- `phone`
- `logoUrl`
- `industry`
- `companySize`
- `companyInfoCompleted`
- `needsCompanyInfo`
- `isOnboardingCompleted`

### PATCH /api/v1/workspace/me

- Авторизация: JWT
- Доступ: только `ORGANIZATION`
- Обновляет данные текущей организации

```http
PATCH /api/v1/workspace/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "organizationName": "Updated Company Name",
  "description": "Updated description",
  "phone": "+79001234567",
  "website": "https://eventflow.uz"
}
```

Поддерживаемые поля:

- `organizationName`
- `inn`
- `description`
- `phone`
- `address`
- `website`
- `industry`
- `companySize`

### DELETE /api/v1/workspace/me

- Авторизация: JWT
- Доступ: только `ORGANIZATION`
- Выполняет soft delete организации

```http
DELETE /api/v1/workspace/me
Authorization: Bearer {accessToken}
```

### POST /api/v1/workspace/me/complete-onboarding

- Авторизация: JWT
- Доступ: только `ORGANIZATION`
- Помечает onboarding как завершённый

```http
POST /api/v1/workspace/me/complete-onboarding
Authorization: Bearer {accessToken}
```

### POST /api/v1/workspace/me/complete-company-info

- Авторизация: JWT
- Доступ: только `ORGANIZATION`
- Закрывает flow обязательного заполнения блока company information

```http
POST /api/v1/workspace/me/complete-company-info
Authorization: Bearer {accessToken}
```

---

## Примеры

```bash
curl -X GET http://localhost:3000/api/v1/workspace/me \
  -H "Authorization: Bearer ACCESS_TOKEN"

curl -X PATCH http://localhost:3000/api/v1/workspace/me \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"Updated Company Name"}'

curl -X POST http://localhost:3000/api/v1/workspace/me/complete-company-info \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## Notes

- Старый self-profile path организации больше не является актуальным.
- Member management остаётся под `/api/v1/organizations/members/*`.
- Публичный профиль чужой организации остаётся под `/api/v1/organizations/:id/public`.
