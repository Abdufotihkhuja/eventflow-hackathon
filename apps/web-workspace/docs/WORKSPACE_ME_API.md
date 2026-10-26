# API Управления Организацией (/workspace/me)

## Обзор

В organizer workspace профиль текущей организации читается и обновляется через `/api/v1/workspace/me`.
Этот документ фиксирует актуальный surface для frontend flows.

---

## Endpoints

### GET /api/v1/workspace/me

- Доступ: `ORGANIZATION`, `MEMBER`
- Используется для загрузки текущего organization profile

### PATCH /api/v1/workspace/me

- Доступ: только `ORGANIZATION`
- Используется для сохранения профиля организации

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

- Доступ: только `ORGANIZATION`
- Удаляет workspace организации

### POST /api/v1/workspace/me/complete-onboarding

- Доступ: только `ORGANIZATION`
- Завершает onboarding организации

### POST /api/v1/workspace/me/complete-company-info

- Доступ: только `ORGANIZATION`
- Закрывает popup company information

---

## Frontend Examples

```ts
await fetch('/api/v1/workspace/me', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationName: 'EventFlow Inc.',
    website: 'https://eventflow.uz',
  }),
})
```

---

## Notes

- Старый self-profile path организации не использовать.
- Управление сотрудниками остаётся на `/api/v1/organizations/members/*`.
