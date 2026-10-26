# Инструкция по тестированию регистрации организации

## Запуск приложения

```bash
# Установка зависимостей (если еще не установлены)
npm install

# Запуск в режиме разработки
npm run start:dev
```

## Тестирование endpoint

### Вариант 1: REST Client (VS Code / IntelliJ IDEA)

Используйте файл `test-organization-register.http` в корне проекта:

```
POST http://localhost:3000/api/v1/auth/organization/register
Content-Type: application/json

{
  "organizationName": "Test OOO",
  "email": "test@example.com",
  "password": "Qwer123$",
  "passwordConfirm": "Qwer123$",
  "description": "Тестовая организация"
}
```

### Вариант 2: cURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/organization/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test OOO",
    "email": "test@example.com",
    "password": "Qwer123$",
    "passwordConfirm": "Qwer123$",
    "description": "Тестовая организация"
  }'
```

### Вариант 3: Postman / Insomnia

1. Создайте POST запрос на `http://localhost:3000/api/v1/auth/organization/register`
2. Установите Header: `Content-Type: application/json`
3. В Body выберите "JSON" и вставьте:

```json
{
  "organizationName": "Test OOO",
  "email": "test@example.com",
  "password": "Qwer123$",
  "passwordConfirm": "Qwer123$",
  "description": "Тестовая организация"
}
```

## Ожидаемый результат

### Успешная регистрация (201 Created)

```json
{
  "message": "Регистрация прошла успешно! Добро пожаловать в EventFlow. Теперь вы можете создавать и управлять мероприятиями."
}
```

### Что проверить:
- ✅ Статус ответа: **201 Created**
- ✅ Поле `message` присутствует и содержит приветственный текст
- ✅ Токены НЕ возвращаются (это ожидаемое поведение)

### Получение токенов после регистрации

После успешной регистрации выполните вход:

```bash
curl -X POST http://localhost:3000/api/v1/auth/organization/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Qwer123$"
  }'
```

Ответ будет содержать токены:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

## Проверка в Swagger

1. Откройте Swagger UI: `http://localhost:3000/api`
2. Найдите раздел **auth**
3. Разверните endpoint `POST /api/v1/auth/organization/register`
4. Нажмите "Try it out"
5. Заполните поля и нажмите "Execute"
6. Проверьте, что в ответе есть только поле `message`
7. Для получения токенов используйте endpoint `POST /api/v1/auth/organization/login`

## Тестирование ошибок

### Повторная регистрация с тем же email (409 Conflict)

```json
{
  "statusCode": 409,
  "message": "Организация с таким email уже существует"
}
```

### Слабый пароль (400 Bad Request)

```json
{
  "statusCode": 400,
  "message": [
    "Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ"
  ],
  "error": "Bad Request"
}
```

### Пароли не совпадают (400 Bad Request)

```json
{
  "statusCode": 400,
  "message": ["Пароли не совпадают"],
  "error": "Bad Request"
}
```

## Проверка в базе данных

```sql
-- Проверить созданную организацию
SELECT id, email, name, "companyName", "authProvider", "createdAt"
FROM "Organization"
WHERE email = 'test@example.com';

-- Проверить созданные роли для организации
SELECT or2.name, or2."isSystem"
FROM "Organization" o
JOIN "OrganizationRole" or2 ON o.id = or2."organizationId"
WHERE o.email = 'test@example.com';

-- Проверить refresh token
SELECT "actor_type", "account_id", "expires_at", "created_at"
FROM "RefreshToken"
WHERE "account_id" = (
  SELECT i."accountId"
  FROM "Organization" o
  JOIN "Identity" i
    ON i."actorType" = 'ORGANIZATION'
   AND i."actorId" = o.id
  WHERE o.email = 'test@example.com'
);
```

## Очистка данных после тестирования

```sql
-- Удалить тестовую организацию и связанные данные
DELETE FROM "Organization" WHERE email = 'test@example.com';
```

Или через интерфейс API:
```bash
# Войдите в систему и используйте endpoint для удаления
# (если реализован функционал удаления)
```
