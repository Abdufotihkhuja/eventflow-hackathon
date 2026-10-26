# Реализация системы верификации email с 6-значными кодами

Дата: 2026-01-14

## Обзор

Реализована полная интеграция системы верификации email с 6-значными кодами согласно API документации (`EMAIL_VERIFICATION_API.md`). Система поддерживает три основных сценария:

1. **Подтверждение email при регистрации**
2. **Сброс пароля**
3. **Смена email в настройках профиля**

## Архитектура

### Слои FSD

```
src/
├── shared/
│   ├── api/
│   │   ├── types/verification.ts        # Типы для верификации
│   │   ├── verificationService.ts       # API сервис
│   │   └── index.ts
│   ├── lib/hooks/
│   │   └── useEmailVerification.ts      # Хук управления верификацией
│   └── ui/
│       └── code-input/                  # Компонент ввода 6-значного кода
│           └── code-input.tsx
├── entities/
│   └── verification/
│       └── model/
│           └── types.ts                 # Реэкспорт типов
├── features/
│   ├── auth/
│   │   ├── verify-email/               # Верификация после регистрации
│   │   │   ├── model/
│   │   │   │   └── useVerifyEmailWithCode.ts
│   │   │   └── ui/
│   │   │       └── verify-email-code-view.tsx
│   │   ├── forgot-password/            # Запрос кода сброса
│   │   │   ├── model/
│   │   │   │   └── useSendResetCode.ts
│   │   │   └── ui/
│   │   ├── reset-password/             # Сброс пароля с кодом
│   │   │   ├── model/
│   │   │   │   └── useResetPasswordWithCode.ts
│   │   │   └── ui/
│   │   │       └── reset-password-code-form.tsx
│   │   └── signup/                     # Поддержка emailVerificationRequired
│   └── profile/
│       └── change-email/               # Смена email с кодом
│           └── ui/
│               └── change-email-form.tsx
└── app/
    └── (auth)/
        ├── verify-email/page.tsx
        ├── forgot-password/page.tsx
        └── reset-password/page.tsx
```

## Реализованные компоненты

### 1. API Сервис (`shared/api/verificationService.ts`)

Endpoints:
- `POST /api/v1/verification/send-code` - Отправка кода
- `POST /api/v1/verification/verify-email` - Подтверждение email
- `POST /api/v1/verification/reset-password` - Сброс пароля
- `POST /api/v1/verification/resend-code` - Повторная отправка
- `POST /api/v1/verification/change-email/request` - Запрос смены email
- `POST /api/v1/verification/change-email/confirm` - Подтверждение смены

### 2. Типы (`shared/api/types/verification.ts`)

```typescript
enum VerificationCodeType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
  EMAIL_CHANGE = "EMAIL_CHANGE",
}

interface SendCodeRequest {
  email: string;
  type: VerificationCodeType;
}

interface VerifyEmailRequest {
  email: string;
  code: string;
}

interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

// ... и другие типы
```

### 3. Хук `useEmailVerification`

Управляет состоянием верификации:
- 6-значный код (массив строк)
- Таймер срока действия кода (5 минут)
- Таймер повторной отправки (60 секунд)
- Валидация и отправка кода
- Обработка ошибок

```typescript
const {
  code,
  setCode,
  timeLeft,
  resendTimeLeft,
  canResend,
  error,
  loading,
  verifyCode,
  resendCode,
} = useEmailVerification({
  email: "user@example.com",
  type: VerificationCodeTypeEnum.EMAIL_VERIFICATION,
  onSuccess: () => { /* ... */ },
  onError: (error) => { /* ... */ },
});
```

### 4. Компонент `CodeInput`

UI компонент для ввода 6-значного кода:
- 6 отдельных полей для каждой цифры
- Автофокус и автопереход между полями
- Поддержка вставки из буфера обмена
- Backspace переходит на предыдущее поле
- Визуальная обратная связь при ошибках

```tsx
<CodeInput
  code={code}
  onChange={setCode}
  error={error}
  disabled={loading}
/>
```

## Flow реализации

### 1. Регистрация с верификацией

```
User registers → Backend returns tokens + emailVerificationRequired
              ↓
           Redirect to /verify-email?email={email}
              ↓
        Enter 6-digit code
              ↓
         Verify code via API
              ↓
  Success → Redirect to /login?verified=true
```

**Изменения:**
- `authService.ts`: Добавлено поле `emailVerificationRequired` в `TokensOnlyResponse`
- `signup/ui/signup-form.tsx`: Проверка `emailVerificationRequired` и редирект
- `verify-email/page.tsx`: Поддержка двух flow (старый с токеном, новый с кодом)

### 2. Сброс пароля

```
User clicks "Forgot password" → Enter email → Send code
                                    ↓
                      Redirect to /reset-password?email={email}
                                    ↓
                   Enter code + new password
                                    ↓
                           Reset password via API
                                    ↓
                  Success → Redirect to /login?passwordReset=true
```

**Изменения:**
- `forgot-password/ui/forgot-password-form.tsx`: Отправка кода вместо ссылки
- `reset-password/page.tsx`: Поддержка двух flow (токен/код)
- `reset-password/ui/reset-password-code-form.tsx`: Новая форма с кодом

### 3. Смена email

```
User in settings → Request email change → Enter new email + password
                                    ↓
                      Code sent to NEW email
                                    ↓
                         Enter 6-digit code
                                    ↓
                     Confirm email change via API
                                    ↓
                  Success → Email updated + notification
```

**Новая фича:**
- `profile/change-email/ui/change-email-form.tsx`: Полный flow смены email

## Безопасность

Реализованы все меры безопасности из API:

1. **Rate Limiting** (на стороне backend):
   - `/send-code`: 3 запроса в минуту
   - `/verify-email`: 5 попыток в минуту
   - `/resend-code`: 1 запрос в минуту

2. **Таймеры**:
   - Код действителен 5 минут
   - Минимум 60 секунд между повторными отправками

3. **Валидация**:
   - Только цифры в полях ввода
   - 6 символов обязательно
   - Проверка на истечение времени

## UX особенности

1. **Автоматическая верификация**: Код проверяется автоматически при вводе всех 6 цифр
2. **Визуальные таймеры**: Отображение времени действия кода и cooldown для повторной отправки
3. **Paste support**: Вставка кода из буфера обмена
4. **Keyboard navigation**: Автопереход между полями, backspace на предыдущее
5. **Error handling**: Понятные сообщения об ошибках с количеством оставшихся попыток

## Совместимость

Система поддерживает:
- ✅ **Backward compatibility**: Старый flow с токенами продолжает работать
- ✅ **Progressive enhancement**: Новый flow с кодами используется при наличии `email` параметра
- ✅ **Все типы пользователей**: User, Organization, Member

## Тестирование

Для тестирования используйте:

1. **Регистрация**: `/signup` → проверьте редирект на `/verify-email?email=...`
2. **Сброс пароля**: `/forgot-password` → `/reset-password?email=...`
3. **Смена email**: `/profile/settings` (Security tab) → "Сменить email"

## Дополнительные улучшения

Возможные будущие улучшения:
- [ ] Анимации при вводе кода (shake при ошибке)
- [ ] Аналитика (отслеживание успешных верификаций)
- [ ] Поддержка биометрии для автозаполнения кодов
- [ ] SMS верификация как альтернатива email

## Связанные документы

- [EMAIL_VERIFICATION_API.md](./EMAIL_VERIFICATION_API.md) - API документация
- Реализацию сверяйте с текущим кодом `web-public` и профильными документами в этой папке.
- [AUTH_PAGES_IMPLEMENTATION.md](./AUTH_PAGES_IMPLEMENTATION.md) - Страницы аутентификации

## Changelog

### v1.0.0 (2026-01-14)
- ✅ Создана архитектура верификации согласно FSD
- ✅ Реализован API сервис `verificationService`
- ✅ Создан компонент `CodeInput`
- ✅ Реализован хук `useEmailVerification`
- ✅ Обновлены страницы verify-email, forgot-password, reset-password
- ✅ Добавлена поддержка `emailVerificationRequired` в signup
- ✅ Реализована смена email в profile/settings
- ✅ Исправлены все критические ошибки линтера
