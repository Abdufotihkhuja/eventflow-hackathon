# Доп. поля компании организатора (Company Information)

## Обзор

После входа в кабинет **только организатору** (не сотрудникам) показывается popup «Заполните доп. поля» до тех пор, пока не будут заполнены поля блока Company Information и не вызван endpoint завершения.

**Доступ:** только пользователь с типом `ORGANIZATION` (владелец организации). Сотрудники (`MEMBER`) не видят popup и не могут вызывать `POST /workspace/me/complete-company-info`.

---

## Поля Company Information

| Поле API           | Описание          | Пример                                 |
| ------------------ | ----------------- | -------------------------------------- |
| `organizationName` | Название компании | "EventFlow Technologies"               |
| `industry`         | Отрасль           | "Technology"                           |
| `website`          | Веб-сайт          | "https://eventflow.com"                |
| `companySize`      | Размер компании   | "50-100 employees"                     |
| `description`      | Описание компании | "Leading event management platform..." |

Обновление: `PATCH /api/v1/workspace/me` (только для `ORGANIZATION`).

---

## Ответ GET /api/v1/workspace/me

Дополнительные поля в ответе:

| Поле                   | Тип            | Описание                                                         |
| ---------------------- | -------------- | ---------------------------------------------------------------- |
| `industry`             | string \| null | Отрасль                                                          |
| `companySize`          | string \| null | Размер компании                                                  |
| `companyInfoCompleted` | boolean        | Доп. поля отмечены как заполненные                               |
| `needsCompanyInfo`     | boolean        | Нужно показать popup (для организатора: `!companyInfoCompleted`) |

**Логика на фронте:** если `user.type === 'ORGANIZATION'` и `organization.needsCompanyInfo === true` — показать popup. Для `MEMBER` popup не показывать.

---

## POST /api/v1/workspace/me/complete-company-info

Отметить, что организатор заполнил доп. поля. Popup больше не показывается.

**Авторизация:** JWT, только `UserType.ORGANIZATION`.

**Request:**

```http
POST /api/v1/workspace/me/complete-company-info
Authorization: Bearer {accessToken}
```

**Response (200 OK):** объект организации с `companyInfoCompleted: true`, `needsCompanyInfo: false`.

---

## PATCH /api/v1/workspace/me — новые поля

| Поле          | Тип    | Валидация        | Описание        |
| ------------- | ------ | ---------------- | --------------- |
| `industry`    | string | необяз., max 100 | Отрасль         |
| `companySize` | string | необяз., max 100 | Размер компании |

Пример тела запроса для формы Company Information:

```json
{
  "organizationName": "EventFlow Technologies",
  "industry": "Technology",
  "website": "https://eventflow.com",
  "companySize": "50-100 employees",
  "description": "Leading event management platform helping organizers create memorable experiences."
}
```

После сохранения формы вызвать `POST /api/v1/workspace/me/complete-company-info`, чтобы закрыть popup навсегда для этого организатора.

---

## Миграция БД

Файл: `prisma/migrations/20260202100000_add_organization_company_info_fields/migration.sql`

```sql
ALTER TABLE "organizations" ADD COLUMN "industry" VARCHAR(100);
ALTER TABLE "organizations" ADD COLUMN "company_size" VARCHAR(100);
ALTER TABLE "organizations" ADD COLUMN "company_info_completed" BOOLEAN NOT NULL DEFAULT false;
```

Применить: `npx prisma migrate deploy` (или `prisma migrate dev` при наличии доступа к БД).

---

**Дата:** 2 февраля 2026  
**Статус:** реализовано
