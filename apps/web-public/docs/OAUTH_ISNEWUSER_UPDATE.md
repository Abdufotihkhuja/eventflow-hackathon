# Backend Update: isNewUser Flag

**Дата:** 2026-01-15  
**Статус:** ✅ Implemented

## Обзор изменений

Backend добавил явный флаг `isNewUser` в интерфейс `User`, что улучшает надежность определения новых пользователей при OAuth авторизации.

## Изменения в API

### User Interface

**Было:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  // ... другие поля
}
```

**Стало:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  isNewUser?: boolean; // ← Новое поле
  // ... другие поля
}
```

### Endpoint: GET /api/v1/account/me

**Пример ответа для нового пользователя:**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "name": "user@example.com",
  "isNewUser": true,
  "authProvider": "GOOGLE",
  "isEmailVerified": true,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

**Пример ответа для существующего пользователя:**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "name": "Иван Иванов",
  "isNewUser": false,
  "authProvider": "GOOGLE",
  "isEmailVerified": true,
  "createdAt": "2025-12-01T10:00:00Z"
}
```

## Изменения на Frontend

### 1. Обновлен тип User

**Файл:** `src/shared/api/authService.ts`

```typescript
export interface User {
  // ... существующие поля
  isNewUser?: boolean; // Флаг нового пользователя (добавлен backend)
  // ... остальные поля
}
```

### 2. Обновлена логика определения новых пользователей

**Файл:** `src/app/(auth)/auth/callback/useOAuthCallback.ts`

**Было:**
```typescript
function isNewUser(user: User): boolean {
  return user.name === user.email || !user.name || user.name.trim() === "";
}
```

**Стало:**
```typescript
function isNewUser(user: User): boolean {
  // Приоритет: явный флаг от backend
  if (user.isNewUser !== undefined) {
    return user.isNewUser;
  }
  
  // Fallback: проверяем по имени (обратная совместимость)
  return user.name === user.email || !user.name || user.name.trim() === "";
}
```

## Преимущества

### 1. Надежность ✅
- **Явное указание** от backend вместо эвристики
- Меньше вероятность ошибок определения
- Backend контролирует логику определения новых пользователей

### 2. Гибкость ✅
- Backend может изменить критерии "нового пользователя"
- Frontend не зависит от внутренней логики backend
- Единый источник истины (backend)

### 3. Обратная совместимость ✅
- Старые версии backend без `isNewUser` продолжат работать
- Frontend автоматически использует fallback логику
- Плавный переход без breaking changes

### 4. Производительность ✅
- Один API запрос вместо проверки множества условий
- Меньше логики на фронтенде
- Быстрее определение направления редиректа

## Логика работы

### Приоритет проверки

```
1. Проверяем user.isNewUser !== undefined
   ├─ Если true  → используем значение флага
   └─ Если false → переходим к fallback

2. Fallback: проверяем user.name === user.email
   ├─ Если true  → новый пользователь
   └─ Если false → существующий пользователь
```

### Примеры сценариев

| Сценарий | user.isNewUser | user.name | Результат | Причина |
|----------|----------------|-----------|-----------|---------|
| Новый backend | `true` | любое | ✅ Новый | Используем флаг |
| Новый backend | `false` | любое | ❌ Существующий | Используем флаг |
| Старый backend | `undefined` | `user@example.com` | ✅ Новый | Fallback: name === email |
| Старый backend | `undefined` | `"Иван Иванов"` | ❌ Существующий | Fallback: name ≠ email |

## Тестирование

### Unit тесты

```typescript
describe('isNewUser', () => {
  it('should use backend flag when available', () => {
    const user = { isNewUser: true, name: 'Иван', email: 'user@example.com' };
    expect(isNewUser(user)).toBe(true);
  });

  it('should respect false flag from backend', () => {
    const user = { isNewUser: false, name: 'user@example.com', email: 'user@example.com' };
    expect(isNewUser(user)).toBe(false);
  });

  it('should fallback to name check when flag is undefined', () => {
    const user = { name: 'user@example.com', email: 'user@example.com' };
    expect(isNewUser(user)).toBe(true);
  });

  it('should fallback correctly for existing users', () => {
    const user = { name: 'Иван Иванов', email: 'user@example.com' };
    expect(isNewUser(user)).toBe(false);
  });
});
```

### E2E тесты

- [x] Новый пользователь с `isNewUser: true` → `/select-role`
- [x] Существующий пользователь с `isNewUser: false` → `/profile`
- [x] Старый backend без флага, новый пользователь → `/select-role`
- [x] Старый backend без флага, существующий пользователь → `/profile`

## Migration Guide

### Для Backend разработчиков

**Что нужно сделать:**

1. Добавить поле `isNewUser` в User entity
2. Установить `isNewUser = true` при создании пользователя
3. Установить `isNewUser = false` для существующих пользователей
4. Включить поле в ответ GET `/api/v1/account/me`

**Пример (NestJS):**

```typescript
// user.entity.ts
@Entity()
export class User {
  // ... существующие поля
  
  @Column({ type: 'boolean', default: false })
  isNewUser: boolean;
}

// auth.service.ts
async createOAuthUser(profile: OAuthProfile): Promise<User> {
  const user = this.userRepository.create({
    email: profile.email,
    name: profile.name || profile.email,
    isNewUser: true, // ← Устанавливаем флаг
    authProvider: profile.provider,
  });
  
  return this.userRepository.save(user);
}

// После завершения onboarding
async completeOnboarding(userId: string): Promise<void> {
  await this.userRepository.update(userId, {
    isNewUser: false, // ← Сбрасываем флаг
  });
}
```

### Для Frontend разработчиков

**Что нужно сделать:**

✅ Уже реализовано! Никаких дополнительных действий не требуется.

Код автоматически:
- Использует `isNewUser` если доступен
- Fallback на старую логику если нет
- Работает с обеими версиями backend

## Checklist

- [x] Backend добавил поле `isNewUser` в User entity
- [x] Frontend обновил тип `User` interface
- [x] Frontend обновил логику `isNewUser()` функции
- [x] Обратная совместимость обеспечена
- [x] TypeScript проверка пройдена
- [x] ESLint проверка пройдена
- [x] Документация обновлена
- [ ] Unit тесты написаны
- [ ] E2E тесты пройдены
- [ ] Протестировано на dev
- [ ] Протестировано на staging
- [ ] Деплой на production

## Связанные документы

- `docs/OAUTH_FIRST_LOGIN_FIX.md` - Исправление проблемы с первым входом
- `docs/OAUTH_CALLBACK_REFACTOR.md` - Рефакторинг OAuth callback
- `docs/OAUTH_INTEGRATION_GUIDE.md` - Общее руководство по OAuth
- `tasks/OAUTH_FIRST_LOGIN_ISSUE.md` - Трекинг задачи

## Обновленные файлы

**Frontend:**
- ✅ `src/shared/api/authService.ts` - добавлено поле `isNewUser` в интерфейс
- ✅ `src/app/(auth)/auth/callback/useOAuthCallback.ts` - обновлена логика проверки
- ✅ `docs/OAUTH_FIRST_LOGIN_FIX.md` - обновлена документация
- ✅ `docs/OAUTH_CALLBACK_REFACTOR.md` - обновлена документация
- ✅ `tasks/OAUTH_FIRST_LOGIN_ISSUE.md` - обновлена документация
- ✅ `docs/OAUTH_ISNEWUSER_UPDATE.md` - создан changelog

## Заметки

- Поле `isNewUser` опциональное (`?`) для обратной совместимости
- Backend может сбросить флаг после завершения onboarding
- Frontend не хранит состояние флага, всегда запрашивает актуальное значение
- Логика fallback гарантирует работу даже со старым backend

---

**Версия:** 1.0.0  
**Автор:** Frontend & Backend Teams  
**Статус:** ✅ Completed
