# Обновление полей организации

## Обзор

Дополнительные поля организации обновляются через canonical endpoint:

- `PATCH /api/v1/workspace/me`

Старый self-profile path организации больше не использовать.

---

## Поддерживаемые поля

| Поле               | Тип    | Описание             |
| ------------------ | ------ | -------------------- |
| `organizationName` | string | Название организации |
| `inn`              | string | ИНН организации      |
| `description`      | string | Описание             |
| `phone`            | string | Телефон              |
| `address`          | string | Адрес                |
| `website`          | string | Веб-сайт             |
| `industry`         | string | Отрасль              |
| `companySize`      | number | Размер компании      |

---

## Пример запроса

```http
PATCH /api/v1/workspace/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "organizationName": "EventFlow Inc.",
  "inn": "123456789012",
  "address": "г. Ташкент, ул. Мирабадская, д. 1",
  "website": "https://eventflow.uz"
}
```

---

## Пример на frontend

```ts
const response = await fetch('/api/v1/workspace/me', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    address: 'г. Ташкент, ул. Новая, д. 5',
    website: 'https://newsite.uz',
  }),
});
```

---

## Тестирование

```bash
curl -X PATCH "https://eventflow.uz/api/v1/workspace/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "address": "г. Ташкент, ул. Мирабадская, д. 1",
    "website": "https://eventflow.uz"
  }'
```

---

## Связанные документы

- `WORKSPACE_ME_API.md`
- `ORGANIZATION_COMPANY_INFO_API.md`
