# Login Feature

Фича аутентификации пользователя с современным UI/UX.

## Структура

```
login/
├── model/
│   ├── schema.ts           # Zod-схема валидации формы
│   ├── useLoginMutation.ts # TanStack Query мутация для API
│   └── index.ts
├── ui/
│   ├── login-form.tsx      # Компонент формы входа
│   └── index.ts
├── index.ts                # Публичный API фичи
└── README.md
```

## Использование

### В странице

```tsx
import { LoginForm } from "@features/auth/login";

export default function LoginPage() {
  return (
    <div>
      <LoginForm />
    </div>
  );
}
```

### Программно

```tsx
import { useLoginMutation } from "@features/auth/login";

function MyComponent() {
  const loginMutation = useLoginMutation();

  const handleLogin = () => {
    loginMutation.mutate(
      {
        email: "user@example.com",
        password: "password123",
      },
      {
        onSuccess: (data) => {
          console.log("Вход успешен:", data.user);
        },
        onError: (error) => {
          console.error("Ошибка входа:", error.message);
        },
      }
    );
  };

  return <button onClick={handleLogin}>Войти</button>;
}
```

## Особенности

### UI/UX

- ✅ Стеклянный эффект (glass morphism)
- ✅ Показ/скрытие пароля
- ✅ Валидация в реальном времени
- ✅ Визуальный фидбэк ошибок
- ✅ Индикатор загрузки
- ✅ Remember me функционал
- ✅ Адаптивный дизайн
- ✅ Доступность (ARIA)

### Технические особенности

- ✅ TypeScript strict mode
- ✅ React Hook Form + Zod валидация
- ✅ TanStack Query для управления состоянием
- ✅ Автоматическое сохранение токенов
- ✅ Обработка ошибок от сервера
- ✅ Модульная архитектура (FSD)

## API Endpoint

Форма отправляет POST запрос на `/auth/login` с телом:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}
```

Ожидается ответ:

```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

## Валидация

- **Email**: обязателен, должен быть валидным email
- **Password**: обязателен, минимум 6 символов
- **Remember Me**: опционален

## Хранение токенов

После успешного входа токены сохраняются в `localStorage`:

- `accessToken` - токен доступа
- `refreshToken` - токен обновления
- `user` - данные пользователя (JSON)

## Зависимости

- `react-hook-form` - управление формой
- `zod` - валидация схемы
- `@hookform/resolvers` - интеграция zod с react-hook-form
- `@tanstack/react-query` - управление состоянием и кешированием
- `lucide-react` - иконки
