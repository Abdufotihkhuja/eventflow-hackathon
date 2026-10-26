# Реализация авторизации для организаторов

## Описание

Страница авторизации для платформы организаторов мероприятий EventFlow. Поддерживает два типа входа:
- **Организация** — владелец аккаунта (компания/организатор)
- **Сотрудник** — член команды организации

## Архитектура

### API Layer (`src/api/services/`)

#### `auth.types.ts`

Типы для работы с авторизацией:

```typescript
// Основные сущности
Organization        // Организация (владелец аккаунта)
OrganizationMember  // Сотрудник организации
AuthUser            // Объединенный тип (Organization | OrganizationMember)

// Типы входа
LoginType = 'organization' | 'member'

// Запросы/ответы
OrganizationLoginRequest   // { email, password }
MemberLoginRequest         // { email, password }
OrganizationLoginResponse  // { accessToken, refreshToken, expiresIn, organization }
MemberLoginResponse        // { accessToken, refreshToken, expiresIn, member }
```

#### `authService.ts`

Эндпоинты API:

```typescript
// Авторизация организации
POST /auth/organization/login      - Вход организации
POST /auth/organization/register   - Регистрация (если нужен)

// Авторизация сотрудника
POST /auth/member/login            - Вход сотрудника

// Сессия
POST /auth/refresh                 - Обновление токенов
POST /auth/logout                  - Выход

// Профиль организации
GET   /auth/organization/me              - Получить профиль
PATCH /auth/organization/profile         - Обновить профиль
POST  /auth/organization/change-password - Сменить пароль
POST  /auth/organization/logo            - Загрузить логотип
DELETE /auth/organization/logo           - Удалить логотип

// Профиль сотрудника
GET   /auth/member/me              - Получить профиль
PATCH /auth/member/profile         - Обновить профиль
POST  /auth/member/change-password - Сменить пароль
POST  /auth/member/avatar          - Загрузить аватар
DELETE /auth/member/avatar         - Удалить аватар
```

Методы сервиса:

```typescript
// Авторизация
authService.loginOrganization(payload)  // Вход организации
authService.loginMember(payload)        // Вход сотрудника
authService.refresh(payload)            // Обновление токенов
authService.logout(payload?)            // Выход

// Профиль организации
authService.getOrganizationMe()
authService.updateOrganizationProfile(payload)
authService.changeOrganizationPassword(payload)
authService.uploadOrganizationLogo(file)
authService.deleteOrganizationLogo()

// Профиль сотрудника
authService.getMemberMe()
authService.updateMemberProfile(payload)
authService.changeMemberPassword(payload)
authService.uploadMemberAvatar(file)
authService.deleteMemberAvatar()
```

### Feature Layer (`src/features/auth/`)

#### `api/use-login.ts`

Два хука для авторизации:

**useOrganizationLogin** — вход организации:

```typescript
const organizationLogin = useOrganizationLogin({
  onSuccess: (data) => {
    console.log('Организация:', data.organization)
    navigate('/dashboard')
  },
  onError: (error) => {
    console.error('Ошибка:', error.message)
  }
})

// Использование
await organizationLogin.mutateAsync({
  email: 'org@company.com',
  password: 'password123',
  rememberMe: true
})
```

**useMemberLogin** — вход сотрудника:

```typescript
const memberLogin = useMemberLogin({
  onSuccess: (data) => {
    console.log('Сотрудник:', data.member)
    navigate('/dashboard')
  }
})

await memberLogin.mutateAsync({
  email: 'employee@company.com',
  password: 'password123',
  rememberMe: false
})
```

После логина actor type определяется через `GET /api/v1/session/me`, а не через `localStorage`.

#### `ui/login-form/login-form.tsx`

**LoginForm** — форма входа с переключателем типа

Props:
```typescript
{
  className?: string
  defaultLoginType?: 'organization' | 'member'
  onOrganizationSuccess?: (data: OrganizationLoginResponse) => void
  onMemberSuccess?: (data: MemberLoginResponse) => void
  onForgotPassword?: () => void
}
```

Функционал:
- Табы для переключения типа входа
- Разные плейсхолдеры для организации/сотрудника
- Валидация через Zod
- Обработка ошибок с красивым отображением
- Состояние загрузки

#### `lib/schemas/login-schema.ts`

Zod схема:

```typescript
{
  email: string().email()       // Email с валидацией
  password: string().min(6)     // Минимум 6 символов
  rememberMe: boolean()         // Запомнить меня
  loginType: enum(['organization', 'member'])  // Тип входа
}
```

### Page Layer (`src/pages/auth/login/`)

#### `ui/login-page.tsx`

**LoginPage** — страница авторизации для организаторов

Особенности UI:
- Современный градиентный фон (blue-50 → white → slate-50)
- Декоративные сферы с blur
- Сетка на фоне
- Логотип + tagline "Платформа для организаторов мероприятий"
- Карточка с backdrop-blur
- Ссылка на регистрацию организации
- Футер с правовыми ссылками

## Конфигурация

### Environment Variables

Создайте файл `.env` в корне проекта:

```env
# API Configuration
VITE_API_URL=http://localhost:8080/api/v1
VITE_API_TIMEOUT=15000
```

**Для production:**

```env
VITE_API_URL=https://api.eventflow.com/api/v1
VITE_API_TIMEOUT=15000
```

### Токены

Токены хранятся в `localStorage`:

- `auth.accessToken` - JWT токен доступа
- `auth.refreshToken` - токен для обновления (опционально, если "Запомнить меня")

## Использование

### Базовый вход (страница)

```typescript
import { LoginForm } from '@features/auth'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()

  return (
    <LoginForm
      onOrganizationSuccess={(data) => {
        console.log('Организация:', data.organization.name)
        navigate('/dashboard')
      }}
      onMemberSuccess={(data) => {
        console.log('Сотрудник:', data.member.fullName)
        navigate('/dashboard')
      }}
    />
  )
}
```

### С типом по умолчанию

```typescript
// Вход только для сотрудников
<LoginForm
  defaultLoginType="member"
  onMemberSuccess={(data) => {
    toast.success(`Добро пожаловать, ${data.member.firstName}!`)
    navigate('/dashboard')
  }}
  onForgotPassword={() => navigate('/forgot-password')}
/>
```

### Программный вход организации

```typescript
import { useOrganizationLogin } from '@features/auth'

function MyComponent() {
  const organizationLogin = useOrganizationLogin()

  const handleLogin = async () => {
    try {
      const data = await organizationLogin.mutateAsync({
        email: 'org@company.com',
        password: 'password123',
        rememberMe: true
      })
      
      console.log('Токен:', data.accessToken)
      console.log('Организация:', data.organization)
    } catch (error) {
      console.error('Ошибка входа:', error)
    }
  }

  return (
    <button 
      onClick={handleLogin}
      disabled={organizationLogin.isPending}
    >
      {organizationLogin.isPending ? 'Входим...' : 'Войти'}
    </button>
  )
}
```

### Программный вход сотрудника

```typescript
import { useMemberLogin } from '@features/auth'

function MyComponent() {
  const memberLogin = useMemberLogin()

  const handleLogin = async () => {
    await memberLogin.mutateAsync({
      email: 'employee@company.com',
      password: 'password123',
      rememberMe: false
    })
  }

  return <button onClick={handleLogin}>Войти</button>
}
```

## Поток авторизации

### Вход организации

1. Пользователь выбирает таб "Организация"
2. Вводит email и пароль организации
3. Валидация через Zod схему
4. Запрос на `POST /auth/organization/login`
5. Сохранение токенов в localStorage
6. Session bootstrap через `GET /api/v1/session/me`
7. Перенаправление на `/dashboard`

### Вход сотрудника

1. Пользователь выбирает таб "Сотрудник"
2. Вводит рабочий email и пароль
3. Валидация через Zod схему
4. Запрос на `POST /auth/member/login`
5. Сохранение токенов в localStorage
6. Session bootstrap через `GET /api/v1/session/me`
7. Перенаправление на `/dashboard`

## Обработка ошибок

### Сетевые ошибки

```typescript
{
  status: 0,
  message: 'Не удалось подключиться к серверу',
  isNetworkError: true
}
```

### Ошибки авторизации

```typescript
{
  status: 401,
  message: 'Неверный email или пароль',
  isNetworkError: false,
  details: { ... }
}
```

### Отображение в форме

Ошибки автоматически отображаются под кнопкой "Войти" красным текстом.

## Безопасность

- ✅ Токены не передаются в URL
- ✅ Использование HTTPS в production
- ✅ HttpOnly cookies для refresh токена (если поддерживается API)
- ✅ Автоматическое обновление токенов через interceptor
- ✅ Очистка токенов при logout
- ✅ Валидация на клиенте и сервере
- ✅ CORS настройки на сервере

## TODO / Будущие улучшения

- [ ] Добавить "Забыли пароль?" для организации и сотрудника
- [ ] Реализовать регистрацию организации (`/auth/organization/register`)
- [ ] Добавить двухфакторную аутентификацию (2FA)
- [ ] Реализовать OAuth (Google, GitHub) для организаций
- [ ] Добавить invite-flow для сотрудников
- [ ] Добавить rate limiting на клиенте
- [ ] Улучшить сообщения об ошибках (коды ошибок от API)
- [ ] Добавить анимации при переключении табов

## Тестирование

### Ручное тестирование

1. Запустите dev сервер: `npm run dev`
2. Откройте `/login`
3. Попробуйте войти с корректными данными
4. Попробуйте войти с некорректными данными
5. Проверьте работу "Запомнить меня"
6. Проверьте перенаправление после успешного входа

### Тестовые данные

Используйте тестовые учётные данные из вашего backend:

```
Email: test@example.com
Password: password123
```

## Связанные файлы

### API Layer
- `src/api/services/auth.types.ts` — типы Organization, Member, Login*, Tokens
- `src/api/services/authService.ts` — методы API для авторизации
- `src/api/config.ts` — конфигурация API (baseURL, interceptors)
- `src/api/apiClient.ts` — HTTP клиент Axios

### Feature Layer
- `src/features/auth/api/use-login.ts` — хуки useOrganizationLogin, useMemberLogin
- `src/features/auth/api/index.ts` — публичный API хуков
- `src/features/auth/lib/schemas/login-schema.ts` — Zod схема формы
- `src/features/auth/lib/use-login-form.ts` — React Hook Form хук
- `src/features/auth/ui/login-form/login-form.tsx` — компонент формы с табами

### Page Layer
- `src/pages/auth/login/ui/login-page.tsx` — страница логина для организаторов
- `src/pages/auth/login/index.ts` — публичный API страницы

### Router
- `src/app/providers/router/routes.tsx` — роут `/login`

## Поддержка

При возникновении проблем:

1. Проверьте `.env` файл и `VITE_API_URL`
2. Убедитесь, что backend запущен
3. Проверьте network tab в DevTools
4. Проверьте console на ошибки
5. Убедитесь, что CORS настроен на backend
