# Reset Password Feature

Feature для сброса пароля пользователя по 6-значному коду из письма.

## Структура

```
reset-password/
├── model/
│   ├── useResetPasswordWithCode.ts # Сброс пароля по email + коду
│   └── index.ts                    # Экспорты модели
├── ui/
│   ├── reset-password-code-form.tsx # Основной компонент формы
│   └── index.ts                    # Экспорты UI
├── index.ts                        # Публичное API
└── README.md
```

## Использование

### В странице

```tsx
import { ResetPasswordCodeForm } from "@features/auth/reset-password";

export default function ResetPasswordPage({ searchParams }) {
  const email = searchParams.email;

  return <ResetPasswordCodeForm email={email} />;
}
```

### Валидация

Форма включает следующие поля:

- **password**: минимум 8 символов, включает строчную и заглавную буквы, цифру
- **confirmPassword**: должен совпадать с password

### API

Форма использует кодовый flow:

- `POST /api/v1/verification/reset-password`
- `POST /api/v1/verification/resend-code`

После успешного сброса пароля показывается сообщение и выполняется
перенаправление на страницу входа.

## Состояния

- **Idle**: начальное состояние, форма для ввода нового пароля
- **Loading**: отправка данных на сервер
- **Success**: сообщение об успешном сбросе пароля с кнопкой "Войти"
- **Error**: отображение ошибки (например, код истёк)
