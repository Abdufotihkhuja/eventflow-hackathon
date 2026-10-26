# API профиля сотрудника организации

## Описание

Сотрудник организации (`OrganizationMember`) имеет личный профиль с возможностью управления своими данными и настройками приватности.

**Особенности:**

- Профиль сотрудника аналогичен профилю обычного пользователя (User)
- Сотрудник может редактировать свой профиль без специальных прав
- Доступ к модулям и операциям определяется ролью и индивидуальными правами

## Эндпоинты профиля (для сотрудника)

### Получить свой профиль

```
GET /api/v1/workspace/members/me
Authorization: Bearer <access_token>
```

**Права доступа:** Только `UserType.MEMBER`

**Ответ (200):**

```json
{
  "id": "uuid",
  "email": "member@company.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+998901234567",
  "position": "Менеджер проектов",
  "department": "Отдел разработки",
  "avatarUrl": "https://example.com/avatar.png",
  "bio": "Опытный менеджер с 5-летним стажем...",
  "location": "Ташкент, Узбекистан",
  "status": "ACTIVE",
  "isPublicProfile": true,
  "showEmail": false,
  "showPhone": false,
  "role": {
    "id": "uuid",
    "name": "Менеджер событий",
    "isSystem": false
  },
  "organization": {
    "id": "uuid",
    "name": "EventFlow Inc.",
    "companyName": "EventFlow Inc.",
    "logoUrl": "https://example.com/logo.png"
  },
  "permissions": [
    "events:read",
    "events:create",
    "events:update",
    "boards:read",
    "tasks:read"
  ],
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

### Обновить свой профиль

```
PATCH /api/v1/workspace/members/me
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Тело запроса:**

```json
{
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+998901234567",
  "position": "Senior менеджер",
  "department": "Отдел продаж",
  "bio": "Обновлённое описание...",
  "location": "Самарканд, Узбекистан"
}
```

**Все поля опциональны.**

**Ответ (200):** Обновлённый профиль (аналогично `GET /me`)

---

### Обновить настройки приватности

```
PATCH /api/v1/workspace/members/me/privacy
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Тело запроса:**

```json
{
  "isPublicProfile": true,
  "showEmail": false,
  "showPhone": false
}
```

| Поле              | Тип     | Описание                                        |
| ----------------- | ------- | ----------------------------------------------- |
| `isPublicProfile` | boolean | Виден ли профиль другим сотрудникам организации |
| `showEmail`       | boolean | Показывать email в публичном профиле            |
| `showPhone`       | boolean | Показывать телефон в публичном профиле          |

---

### Загрузить аватар

```
POST /api/v1/workspace/members/me/avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**

- `avatar`: Файл изображения (jpg, png, webp)

**Ответ (200):** Обновлённый профиль с новым `avatarUrl`

---

### Удалить аватар

```
DELETE /api/v1/workspace/members/me/avatar
Authorization: Bearer <access_token>
```

**Ответ (200):** Профиль с `avatarUrl: null`

---

### Получить свои права доступа

```
GET /api/v1/workspace/members/me/permissions
Authorization: Bearer <access_token>
```

**Ответ (200):**

```json
{
  "role": {
    "id": "uuid",
    "name": "Менеджер событий"
  },
  "permissions": [
    "events:read",
    "events:create",
    "events:update",
    "boards:read",
    "tasks:read",
    "tasks:create"
  ],
  "permissionsByCategory": {
    "events": ["events:read", "events:create", "events:update"],
    "boards": ["boards:read"],
    "tasks": ["tasks:read", "tasks:create"]
  }
}
```

---

## Система прав доступа

### Как работает

1. **Роль** — при создании сотрудника ему назначается роль с набором прав
2. **Индивидуальные права** — админ может добавить сотруднику дополнительные права сверх роли
3. **Итоговые права** = права роли + индивидуальные права

### Категории прав

| Категория     | Права                                      | Описание                 |
| ------------- | ------------------------------------------ | ------------------------ |
| events        | create, read, update, delete, publish      | Управление мероприятиями |
| speakers      | create, read, update, delete               | Спикеры событий          |
| agenda        | create, read, update, delete               | Программа события        |
| registrations | read, approve, reject, export              | Регистрации участников   |
| attendance    | read, checkin, export                      | Посещаемость             |
| boards        | create, read, update, delete, archive      | Доски задач              |
| tasks         | create, read, update, delete, assign, move | Задачи                   |
| members       | create, read, update, delete, invite       | Управление сотрудниками  |
| roles         | create, read, update, delete, manage       | Управление ролями        |
| settings      | view, manage                               | Настройки организации    |
| analytics     | view, export                               | Аналитика                |

### Предустановленные роли

| Роль                    | Описание                                             |
| ----------------------- | ---------------------------------------------------- |
| **Владелец**            | Все права, системная роль                            |
| **Администратор**       | Все права кроме удаления организации                 |
| **Менеджер событий**    | Полное управление событиями, досками, задачами       |
| **Координатор событий** | Просмотр и редактирование событий, работа с задачами |
| **Техподдержка**        | Только просмотр                                      |
| **Наблюдатель**         | Только просмотр + аналитика                          |

---

## Авторизация сотрудника

### Вход в систему

```
POST /api/v1/auth/member/login
Content-Type: application/json
```

**Тело запроса:**

```json
{
  "inn": "1234567890",
  "email": "member@company.com",
  "password": "SecurePassword123"
}
```

**Сотрудник входит по:**

1. ИНН организации
2. Своему email
3. Паролю

---

## Примечания

- Эндпоинты `/workspace/members/me/*` доступны только сотрудникам (`UserType.MEMBER`)
- Сотрудник НЕ может менять свою роль или статус через профиль
- Для изменения роли/статуса нужны права `members:update`
- Настройки приватности влияют на отображение профиля другим сотрудникам
