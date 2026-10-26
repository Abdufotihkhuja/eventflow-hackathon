# Обновление типизации пользователей (AdminUser)

**Дата:** 14 января 2026  
**Эндпоинт:** `GET /api/v1/super-admin/users`

## Изменения

### 1. Обновлён тип `AdminUser` (`src/api/services/superAdmin.types.ts`)

**Было:**
```typescript
export type AdminUser = {
  id: string
  email: string
  name: string
  // ...
}
```

**Стало:**
```typescript
export type AdminUser = {
  id: string
  email: string
  passwordHash: string  // добавлено (приходит с API, но не используется в UI)
  firstName: string     // заменено name
  lastName: string | null  // добавлено
  // ...
}
```

### 2. Обновлён тип `GetAdminUsersResponse`

**Было:**
```typescript
export type GetAdminUsersResponse = {
  data: AdminUser[]
  total: number
}
```

**Стало:**
```typescript
export type GetAdminUsersResponse = {
  data: AdminUser[]
  total: number
  page: number   // добавлено
  limit: number  // добавлено
}
```

### 3. Добавлены утилиты для работы с именами (`src/shared/lib/format-user-name.ts`)

```typescript
// Объединяет firstName и lastName в полное имя
export function formatUserName(firstName: string, lastName?: string | null): string

// Получает инициалы из имени и фамилии
export function getUserInitials(firstName: string, lastName?: string | null): string
```

### 4. Обновлены UI компоненты

- `src/pages/super-admin/users/ui/users-columns.tsx` — заменено `user.name` на `formatUserName(user.firstName, user.lastName)`
- `src/pages/super-admin/users/ui/user-detail-sheet.tsx` — заменено `user.name` на `formatUserName(user.firstName, user.lastName)`

## Использование

```typescript
import { formatUserName, getUserInitials } from '@shared/lib'

const user: AdminUser = {
  firstName: 'Abdufotihkhuja',
  lastName: 'Ravshankhujaev',
  // ...
}

const fullName = formatUserName(user.firstName, user.lastName)
// => "Abdufotihkhuja Ravshankhujaev"

const initials = getUserInitials(user.firstName, user.lastName)
// => "AR"

// Если lastName === null
const user2: AdminUser = {
  firstName: 'Tony Aven',
  lastName: null,
  // ...
}

const fullName2 = formatUserName(user2.firstName, user2.lastName)
// => "Tony Aven"

const initials2 = getUserInitials(user2.firstName, user2.lastName)
// => "T"
```

## Совместимость

- ✅ TypeScript сборка проходит успешно
- ✅ Линтер не выдаёт ошибок
- ✅ Все компоненты обновлены и используют новую типизацию
- ✅ Пагинация работает корректно с новыми полями `page` и `limit`

## Примечания

- Поле `passwordHash` добавлено в тип, но **не используется** в UI (только для полноты типизации согласно API)
- Утилиты `formatUserName` и `getUserInitials` экспортируются из `@shared/lib` для переиспользования
- Старые ссылки на `user.name` полностью заменены на `formatUserName(user.firstName, user.lastName)`
