# Signup Feature

Feature для регистрации новых пользователей в системе EventFlow.

## Структура

```
signup/
├── model/
│   ├── schema.ts              # Zod схема валидации
│   ├── useSignupMutation.ts   # TanStack Query мутация
│   └── index.ts               # Экспорты модели
├── ui/
│   ├── signup-form.tsx        # Основной компонент формы
│   └── index.ts               # Экспорты UI
├── index.ts                   # Публичное API
└── README.md
```

## Использование

### В странице

```tsx
import { SignupForm } from "@features/auth/signup";

export default function SignupPage() {
  return <SignupForm />;
}
```

### Валидация

Форма включает следующие поля с валидацией:

- **name**: 2-50 символов, только буквы, пробелы и дефисы
- **email**: валидный email адрес
- **password**: минимум 8 символов, включает строчную и заглавную буквы, цифру
- **confirmPassword**: должен совпадать с password
- **acceptTerms**: обязательное согласие с условиями

### API

Форма использует эндпоинт `POST /auth/signup` через `authService.signup()`.

После успешной регистрации пользователь перенаправляется на страницу верификации email.

## Состояния

- **Idle**: начальное состояние
- **Loading**: отправка данных на сервер
- **Success**: перенаправление на `/verify-email`
- **Error**: отображение ошибки
