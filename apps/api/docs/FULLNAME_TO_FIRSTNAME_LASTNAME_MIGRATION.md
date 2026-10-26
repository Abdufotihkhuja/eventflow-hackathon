# Замена fullName на firstName и lastName — Миграция

## 🎯 Обзор

Поле `fullName` для пользователей заменено на два отдельных поля: `firstName` (имя) и `lastName` (фамилия).

**Дата изменения:** 14 января 2026  
**Версия:** 1.1.0

---

## 📊 Что изменилось

### База данных (Prisma Schema)

**Было:**
```prisma
model User {
  id       String  @id @default(uuid()) @db.Uuid
  email    String  @unique
  name     String?
  // ...
}
```

**Стало:**
```prisma
model User {
  id        String  @id @default(uuid()) @db.Uuid
  email     String  @unique
  firstName String? @map("first_name")
  lastName  String? @map("last_name")
  // ...
}
```

### Миграция БД

```sql
-- Rename name column to first_name
ALTER TABLE "users" RENAME COLUMN "name" TO "first_name";

-- Add lastName column
ALTER TABLE "users" ADD COLUMN "last_name" VARCHAR(255);
```

**Файл миграции:**
```
prisma/migrations/20260114111159_replace_fullname_with_firstname_lastname/migration.sql
```

---

## 🔧 Backend Changes

### 1. RegisterUserDto

**Было:**
```typescript
{
  fullName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}
```

**Стало:**
```typescript
{
  firstName: string;    // ← обязательно
  lastName: string;     // ← обязательно
  email: string;
  password: string;
  passwordConfirm: string;
}
```

### 2. UpdateUserProfileDto

**Было:**
```typescript
{
  name?: string;
  phone?: string;
  location?: string;
  bio?: string;
}
```

**Стало:**
```typescript
{
  firstName?: string;   // ← опционально
  lastName?: string;    // ← опционально
  phone?: string;
  location?: string;
  bio?: string;
}
```

### 3. OAuth Handling

Для OAuth (Google, LinkedIn) создана утилита `parseFullName()`:

```typescript
// src/common/utils/name-parser.util.ts
export function parseFullName(fullName: string): {
  firstName: string;
  lastName?: string;
} {
  // Разбивает "John Doe" на { firstName: "John", lastName: "Doe" }
}
```

**Использование в auth.service.ts:**
```typescript
const { firstName, lastName } = this.parseFullName(profile.name);

await prisma.user.create({
  data: {
    email: profile.email,
    firstName,    // ← "John"
    lastName,     // ← "Doe"
    authProvider: AuthProvider.GOOGLE,
    // ...
  },
});
```

---

## 📡 API Changes

### POST /api/v1/auth/user/register

**Было:**
```json
{
  "fullName": "Abdufotihkhuja Ravshankhujaev",
  "email": "user@example.com",
  "password": "Secure123!",
  "passwordConfirm": "Secure123!"
}
```

**Стало:**
```json
{
  "firstName": "Abdufotihkhuja",
  "lastName": "Ravshankhujaev",
  "email": "user@example.com",
  "password": "Secure123!",
  "passwordConfirm": "Secure123!"
}
```

### PATCH /api/v1/users/profile

**Было:**
```json
{
  "name": "Иван Иванов",
  "bio": "Developer...",
  "phone": "+998901234567"
}
```

**Стало:**
```json
{
  "firstName": "Иван",
  "lastName": "Иванов",
  "bio": "Developer...",
  "phone": "+998901234567"
}
```

---

## 💻 Frontend Migration Guide

### 1. TypeScript Types

**Обновить:**
```typescript
// До
interface RegisterUserDto {
  fullName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

// После
interface RegisterUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}
```

```typescript
// До
interface UserProfile {
  id: string;
  email: string;
  name?: string;
  bio?: string;
  // ...
}

// После
interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  // ...
}
```

### 2. Registration Form

**До:**
```tsx
<Form>
  <Input
    name="fullName"
    label="Полное имя"
    placeholder="Иван Иванов"
  />
  <Input name="email" label="Email" />
  <Input name="password" label="Пароль" type="password" />
</Form>
```

**После:**
```tsx
<Form>
  <Input
    name="firstName"
    label="Имя"
    placeholder="Иван"
  />
  <Input
    name="lastName"
    label="Фамилия"
    placeholder="Иванов"
  />
  <Input name="email" label="Email" />
  <Input name="password" label="Пароль" type="password" />
</Form>
```

### 3. Display User Name

**До:**
```tsx
<div>{user.name || 'Без имени'}</div>
```

**После:**
```tsx
<div>
  {user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.lastName || 'Без имени'}
</div>
```

**Или создать helper:**
```typescript
// utils/user.ts
export function getFullName(user: { firstName?: string; lastName?: string }): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.firstName || user.lastName || 'Без имени';
}

// Использование
<div>{getFullName(user)}</div>
```

### 4. API Client Updates

**До:**
```typescript
const registerUser = async (data: {
  fullName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}) => {
  return axios.post('/api/v1/auth/user/register', data);
};
```

**После:**
```typescript
const registerUser = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}) => {
  return axios.post('/api/v1/auth/user/register', data);
};
```

---

## 🧪 Testing

### Обновлённые тестовые файлы:

1. **test-user-register.http** - 14 тестовых сценариев с firstName/lastName
2. **docs/USER_REGISTRATION_API.md** - обновлённая документация
3. **docs/AUTH_ENDPOINTS_SUMMARY.md** - обновлённые примеры

### Manual Testing

```bash
# Тест 1: Успешная регистрация
curl -X POST http://localhost:3000/api/v1/auth/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Иван",
    "lastName": "Иванов",
    "email": "ivan@example.com",
    "password": "Secure123!",
    "passwordConfirm": "Secure123!"
  }'

# Тест 2: Обновление профиля
curl -X PATCH http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Пётр",
    "lastName": "Петров",
    "bio": "Updated bio"
  }'
```

---

## 📝 Modified Files

### Backend:
```
✅ prisma/schema.prisma                                (User model)
✅ prisma/migrations/.../migration.sql                 (DB migration)
✅ src/common/utils/name-parser.util.ts                (NEW)
✅ src/modules/auth/dto/register-user.dto.ts          (fullName → firstName + lastName)
✅ src/modules/auth/auth.service.ts                    (4 методов обновлено)
✅ src/modules/users/dto/update-user-profile.dto.ts   (name → firstName + lastName)
```

### Documentation:
```
✅ docs/AUTH_ENDPOINTS_SUMMARY.md                      (примеры обновлены)
✅ docs/USER_REGISTRATION_API.md                       (вся документация)
✅ docs/FULLNAME_TO_FIRSTNAME_LASTNAME_MIGRATION.md   (NEW - этот файл)
✅ test-user-register.http                             (все тесты)
```

---

## ⚠️ Breaking Changes

### API Breaking Changes:

1. **POST /api/v1/auth/user/register**
   - ❌ Поле `fullName` больше не принимается
   - ✅ Требуются поля `firstName` и `lastName`

2. **PATCH /api/v1/users/profile**
   - ❌ Поле `name` больше не принимается
   - ✅ Используйте поля `firstName` и `lastName`

3. **GET /api/v1/users/profile** (response)
   - ❌ Поле `name` больше не возвращается
   - ✅ Возвращаются поля `firstName` и `lastName`

### OAuth Handling:

- Google OAuth: `displayName` разбивается на `firstName` и `lastName`
- LinkedIn OAuth: `displayName` разбивается на `firstName` и `lastName`

**Примеры:**
```
"John Doe"       → { firstName: "John", lastName: "Doe" }
"John"           → { firstName: "John", lastName: undefined }
"John Smith Doe" → { firstName: "John", lastName: "Smith Doe" }
```

---

## 🔄 Migration Checklist

### Backend:
- [x] Обновлена Prisma schema
- [x] Создана миграция БД
- [x] Обновлены DTO (Register, Update)
- [x] Обновлены сервисы (auth, users)
- [x] Создана утилита parseFullName
- [x] Обновлена документация
- [x] Обновлены тестовые файлы
- [x] Нет линтер ошибок
- [ ] Применена миграция на production

### Frontend (TODO):
- [ ] Обновлены TypeScript типы
- [ ] Обновлены формы регистрации
- [ ] Обновлены формы редактирования профиля
- [ ] Создан helper getFullName()
- [ ] Обновлены все места отображения имени
- [ ] Обновлены API клиенты
- [ ] Обновлены тесты
- [ ] Проверено на всех экранах

---

## 🚀 Deployment Steps

### Development:
```bash
# 1. Обновить зависимости Prisma
npm run prisma:generate

# 2. Применить миграцию
npm run prisma:migrate:dev

# 3. Проверить миграцию
npm run prisma:studio
```

### Production:
```bash
# 1. Backup БД
./backup-db.sh

# 2. Применить миграцию
npm run prisma:migrate:deploy

# 3. Проверить
# Зайти в БД и проверить что:
# - Колонка name переименована в first_name
# - Добавлена колонка last_name
```

---

## 💡 Recommendations

### 1. Data Migration (Optional)

Если у вас уже есть данные в `first_name` (бывшее `name`), можно разбить их:

```sql
-- Split existing fullnames
UPDATE "users" 
SET 
  "first_name" = SPLIT_PART("first_name", ' ', 1),
  "last_name" = SUBSTRING("first_name" FROM POSITION(' ' IN "first_name") + 1)
WHERE "first_name" IS NOT NULL AND POSITION(' ' IN "first_name") > 0;
```

### 2. Frontend Validation

Добавьте валидацию на фронтенде:

```typescript
const validateName = (name: string) => {
  if (name.length < 2) {
    return 'Минимум 2 символа';
  }
  if (name.length > 50) {
    return 'Максимум 50 символов';
  }
  if (!/^[а-яА-ЯёЁa-zA-Z\s-]+$/.test(name)) {
    return 'Только буквы, пробелы и дефисы';
  }
  return null;
};
```

### 3. Display Helpers

```typescript
// Full name with fallback
export function getFullName(
  firstName?: string,
  lastName?: string,
  fallback = 'Пользователь'
): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : fallback;
}

// Initials
export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  return first + last || '?';
}

// Short name (firstName + last initial)
export function getShortName(firstName?: string, lastName?: string): string {
  if (!firstName) return 'Пользователь';
  const lastInitial = lastName?.[0]?.toUpperCase();
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}
```

---

## 📚 Related Documentation

- `AUTH_ENDPOINTS_SUMMARY.md` - Auth endpoints documentation
- `USER_REGISTRATION_API.md` - User registration API
- `OAUTH_INTEGRATION_GUIDE.md` - OAuth integration guide
- `OAUTH_NEW_USER_FLAG.md` - OAuth new user handling

---

**Статус:** ✅ Реализовано на backend  
**Frontend миграция:** ⏳ Требуется обновление  
**Версия:** 1.1.0  
**Дата:** 14 января 2026
