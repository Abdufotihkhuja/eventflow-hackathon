# Forgot Password Feature

Feature для запроса кода сброса пароля по email.

## Структура

```
forgot-password/
├── model/
│   ├── schema.ts                      # Zod схема валидации
│   ├── useSendResetCode.ts            # Отправка кода сброса пароля
│   └── index.ts                       # Экспорты модели
├── ui/
│   ├── forgot-password-form.tsx       # Основной компонент формы
│   └── index.ts                       # Экспорты UI
├── index.ts                           # Публичное API
└── README.md
```

## Использование

### В странице

```tsx
import { ForgotPasswordForm } from "@features/auth/forgot-password";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
```

### Валидация

Форма включает одно поле:

- **email**: валидный email адрес

### API

Форма использует кодовый flow через `POST /api/v1/verification/send-code`
с `type=PASSWORD_RESET`.

После успешной отправки пользователь перенаправляется на страницу
`/reset-password?email=...` для ввода кода и нового пароля.

## Состояния

- **Idle**: начальное состояние, форма для ввода email
- **Loading**: отправка запроса на сервер
- **Success**: сообщение об успешной отправке письма с инструкциями
- **Error**: отображение ошибки
