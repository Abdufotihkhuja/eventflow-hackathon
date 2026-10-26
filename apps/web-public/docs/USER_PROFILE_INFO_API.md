# Доп. поля профиля пользователя (popup «Заполните доп. поля»)

## Обзор

После входа в кабинет **авторизованному пользователю** (UserType.USER) показывается popup «Заполните доп. поля», пока не заполнены поля и не вызван endpoint завершения.

**Уже есть в профиле (не дублируем):** имя (`firstName`), фамилия (`lastName`), телефон (`phone`).

**Новые поля:**

| Поле API           | Описание                                                                              | Обязательное |
| ------------------ | ------------------------------------------------------------------------------------- | ------------ |
| `gender`           | Пол: MALE / FEMALE                                                                    | Нет          |
| `dateOfBirth`      | Дата рождения (ISO date)                                                              | Нет          |
| `region`           | Регион Узбекистана (из списка)                                                        | Нет          |
| `languages`        | Языки (массив кодов: ru, uz, en, …)                                                   | Нет          |
| `profileStatus`    | WORKER / SCHOOLBOY / STUDENT                                                          | Нет          |
| `workOrStudyPlace` | Где работает или учится (текст)                                                       | Нет          |
| `skills`           | Навыки: **макс. 3** из списка (коды)                                                  | Нет          |
| `specialization`   | Одна из: LAWYER, PROGRAMMER, DESIGNER, PHOTOGRAPHER, PROJECT_MANAGER, PRODUCT_MANAGER | Нет          |
| `shortBio`         | Коротко о себе (макс. 150 символов)                                                   | Нет          |

Обновление: **PATCH /api/v1/account/me** (все поля опциональны).

---

## Ответ GET /api/v1/account/me

Дополнительные поля в ответе:

| Поле                   | Тип                       | Описание                           |
| ---------------------- | ------------------------- | ---------------------------------- |
| `gender`               | string \| null            | MALE / FEMALE                      |
| `dateOfBirth`          | string (ISO date) \| null | Дата рождения                      |
| `region`               | string \| null            | Регион Узбекистана                 |
| `languages`            | string[]                  | Языки (коды)                       |
| `profileStatus`        | string \| null            | WORKER / SCHOOLBOY / STUDENT       |
| `workOrStudyPlace`     | string \| null            | Где работает или учится            |
| `skills`               | string[]                  | Навыки (макс. 3, коды)             |
| `specialization`       | string \| null            | Одна из специализаций              |
| `shortBio`             | string \| null            | Коротко о себе (150 символов)      |
| `profileInfoCompleted` | boolean                   | Доп. поля отмечены как заполненные |
| `needsProfileInfo`     | boolean                   | Нужно показать popup               |

**Логика на фронте:** если `user.type === 'USER'` и `profile.needsProfileInfo === true` — показать popup.

---

## GET /api/v1/public/profile-options

Справочники для формы доп. полей. **Без авторизации** (публичный).

**Request:** `GET /api/v1/public/profile-options`

**Response (200 OK):**

```json
{
  "skills": [{"code": "javascript", "label": "JavaScript"}, ...],
  "regions": ["Ташкент", "Андижанская область", ...],
  "languages": [{"code": "ru", "label": "Русский"}, ...],
  "specializations": [{"value": "PROGRAMMER", "label": "Программист"}, ...],
  "profileStatuses": [{"value": "WORKER", "label": "Работник"}, ...],
  "genders": [{"value": "MALE", "label": "Мужской"}, ...]
}
```

- **skills** — до 28 навыков; пользователь выбирает **не более 3** (коды из `skills[].code`).
- **regions** — все регионы Узбекистана (области + Ташкент + Каракалпакстан).
- **specializations** — одна из шести (value для PATCH).

---

## POST /api/v1/account/me/complete-profile-info

Отметить, что пользователь заполнил доп. поля. Popup больше не показывается.

**Авторизация:** JWT, только UserType.USER.

**Request:**

```http
POST /api/v1/account/me/complete-profile-info
Authorization: Bearer {accessToken}
```

**Response (200 OK):** объект профиля (как в GET /account/me) с `profileInfoCompleted: true`, `needsProfileInfo: false`.

---

## PATCH /api/v1/account/me — новые поля

Пример тела для формы доп. полей:

```json
{
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+998901234567",
  "gender": "MALE",
  "dateOfBirth": "1990-05-15",
  "region": "Ташкент",
  "languages": ["ru", "en"],
  "profileStatus": "WORKER",
  "workOrStudyPlace": "ООО «Компания», менеджер",
  "skills": ["javascript", "communication", "leadership"],
  "specialization": "PROGRAMMER",
  "shortBio": "Разработчик, увлекаюсь open source."
}
```

Валидация:

- `skills` — массив строк, **макс. 3** элемента, каждый — один из кодов из `GET /public/profile-options` (skills[].code).
- `region` — одна из строк из `profile-options.regions`.
- `languages` — коды из `profile-options.languages[].code`.
- `shortBio` — макс. 150 символов.

После сохранения формы вызвать **POST /api/v1/account/me/complete-profile-info**, чтобы закрыть popup.

---

## Миграция БД

Файл: `prisma/migrations/20260202120000_add_user_profile_info_fields/migration.sql`

Создаются enum-типы: `Gender`, `UserProfileStatus`, `Specialization`. В таблицу `users` добавляются колонки: `gender`, `date_of_birth`, `region`, `languages`, `profile_status`, `work_or_study_place`, `skills`, `specialization`, `short_bio`, `profile_info_completed`.

Применить: `npx prisma migrate deploy` (или `prisma migrate dev` при доступе к БД).

---

**Дата:** 2 февраля 2026  
**Статус:** реализовано
