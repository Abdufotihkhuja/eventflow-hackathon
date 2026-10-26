# API Регистрации Пользователя

## Endpoint: POST /api/v1/auth/user/register

### Описание
Регистрация нового пользователя в системе для участия в мероприятиях.

### Request Body

```json
{
  "firstName": "Abdufotihkhuja",
  "lastName": "Ravshankhujaev",
  "email": "user@example.com",
  "password": "Qwer123$",
  "passwordConfirm": "Qwer123$"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `firstName` | string | Да | Имя пользователя |
| `lastName` | string | Да | Фамилия пользователя |
| `email` | string | Да | Email пользователя (уникальный) |
| `password` | string | Да | Пароль (минимум 8 символов, должен содержать заглавную букву, строчную букву, цифру и спецсимвол) |
| `passwordConfirm` | string | Да | Подтверждение пароля (должно совпадать с password) |

### Валидация

#### FirstName
- Обязательное поле
- Должно быть строкой

#### LastName
- Обязательное поле
- Должно быть строкой

#### Email
- Должен быть валидным email адресом
- Должен быть уникальным в системе

#### Password
- Минимум 8 символов
- Минимум одна заглавная буква (A-Z)
- Минимум одна строчная буква (a-z)
- Минимум одна цифра (0-9)
- Минимум один специальный символ (@$!%*?&)

#### PasswordConfirm
- Должен полностью совпадать с полем `password`

### Response (Success - 201)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### Response (Error - 409 Conflict)

```json
{
  "statusCode": 409,
  "message": "Пользователь с таким email уже существует",
  "timestamp": "2025-12-23T10:30:00.000Z",
  "path": "/api/v1/auth/user/register"
}
```

### Response (Error - 400 Bad Request)

```json
{
  "statusCode": 400,
  "message": [
    "Пароли не совпадают",
    "Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ"
  ],
  "error": "Bad Request"
}
```

## Примеры использования

### cURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Abdufotihkhuja",
    "lastName": "Ravshankhujaev",
    "email": "user@example.com",
    "password": "Qwer123$",
    "passwordConfirm": "Qwer123$"
  }'
```

### JavaScript (fetch)

```javascript
const registerUser = async () => {
  const response = await fetch('http://localhost:3000/api/v1/auth/user/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: 'Abdufotihkhuja',
      lastName: 'Ravshankhujaev',
      email: 'user@example.com',
      password: 'Qwer123$',
      passwordConfirm: 'Qwer123$'
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    // Сохраняем токены
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  } else {
    console.error('Ошибка регистрации:', data.message);
  }
};
```

### Python (requests)

```python
import requests

def register_user():
    url = 'http://localhost:3000/api/v1/auth/user/register'
    payload = {
        'fullName': 'Abdufotihkhuja Ravshankhujaev',
        'email': 'user@example.com',
        'password': 'Qwer123$',
        'passwordConfirm': 'Qwer123$'
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 201:
        data = response.json()
        print('Успешная регистрация!')
        print('Access Token:', data['accessToken'])
        print('Refresh Token:', data['refreshToken'])
    else:
        print('Ошибка:', response.json())
```

## Что происходит при регистрации

1. **Проверка уникальности email** - система проверяет, не зарегистрирован ли уже пользователь с таким email
2. **Хеширование пароля** - пароль хешируется с использованием bcrypt (10 раундов)
3. **Создание пользователя** - в БД создается запись пользователя со следующими данными:
   - `name` = `fullName`
   - `email` = `email`
   - `passwordHash` = хешированный пароль
   - `authProvider` = EMAIL
   - `isEmailVerified` = false
4. **Генерация токенов** - создаются JWT access token и refresh token для последующей аутентификации

## Связанные endpoints

- `POST /api/v1/auth/user/login` - Вход пользователя
- `POST /api/v1/auth/refresh` - Обновление токенов
- `POST /api/v1/auth/logout` - Выход из системы
- `GET /api/v1/auth/google` - OAuth регистрация/вход через Google
- `GET /api/v1/auth/linkedin` - OAuth регистрация/вход через LinkedIn

## Изменения в API

### Что изменилось
- **Было**: `name` (опциональное поле)
- **Стало**: `fullName` (обязательное поле)
- **Добавлено**: `passwordConfirm` (подтверждение пароля)
- **Добавлено**: Валидация сложности пароля (заглавная/строчная буква, цифра, спецсимвол)
- **Добавлено**: Проверка совпадения паролей через кастомный валидатор `@Match`

### Миграция с предыдущей версии

Если вы использовали старый формат:
```json
{
  "email": "user@example.com",
  "password": "simple",
  "name": "John Doe"  // опционально
}
```

Теперь используйте новый формат:
```json
{
  "fullName": "John Doe",  // обязательно
  "email": "user@example.com",
  "password": "Secure123!",  // усиленная валидация
  "passwordConfirm": "Secure123!"  // обязательно
}
```

## Рекомендации по безопасности

1. **Никогда не храните пароли в открытом виде** - все пароли хешируются через bcrypt
2. **Используйте сложные пароли** - минимальные требования защищают от простых атак
3. **Защищайте токены** - храните access и refresh токены в безопасном месте (httpOnly cookies или secure storage)
4. **Обновляйте токены** - используйте refresh token для получения нового access token при истечении
5. **Верификация email** - рекомендуется добавить отправку письма для подтверждения email после регистрации

