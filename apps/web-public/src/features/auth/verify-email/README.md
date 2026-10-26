# Verify Email Feature

Feature для верификации email адреса пользователя по 6-значному коду.

## Структура

```
verify-email/
├── model/
│   ├── useVerifyEmailWithCode.ts   # Проверка кода подтверждения
│   └── index.ts                    # Экспорты модели
├── ui/
│   ├── verify-email-view.tsx       # Информационный экран
│   ├── verify-email-code-view.tsx  # Основной компонент кодового flow
│   └── index.ts                    # Экспорты UI
├── index.ts                        # Публичное API
└── README.md
```

## Использование

### В странице

```tsx
import { VerifyEmailCodeView } from "@features/auth/verify-email";

export default function VerifyEmailPage({ searchParams }) {
  const email = searchParams.email;

  return <VerifyEmailCodeView email={email} />;
}
```

### API

Компонент использует кодовый flow:

- `POST /api/v1/verification/verify-email`
- `POST /api/v1/verification/resend-code`

## Состояния

- **Waiting**: ожидание ввода кода подтверждения
- **Loading**: проверка кода на сервере
- **Success**: email успешно подтверждён
- **Error**: ошибка верификации (код невалиден или истёк)

## Props

```typescript
interface VerifyEmailViewProps {
  email?: string; // Email пользователя для отображения
}
```
