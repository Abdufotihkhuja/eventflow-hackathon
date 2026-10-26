# Feature: Profile

Модуль для управления профилем пользователя и настройками безопасности.

## Структура

```
profile/
├── lib/
│   ├── schemas/
│   │   ├── profile-schema.ts    # Zod схема валидации профиля
│   │   └── password-schema.ts   # Zod схема валидации пароля
│   ├── use-profile-form.ts      # Хук для формы профиля
│   ├── use-password-form.ts     # Хук для формы пароля
│   └── index.ts
├── ui/
│   ├── profile-form/            # Форма редактирования профиля
│   ├── password-form/           # Форма смены пароля
│   └── index.ts
└── index.ts
```

## Использование

### ProfileForm

Форма для редактирования персональной информации пользователя:

```tsx
import { useProfileForm, ProfileForm } from '@features/profile'

function MyComponent() {
  const form = useProfileForm({
    defaultValues: {
      firstName: 'Иван',
      lastName: 'Иванов',
      email: 'ivan@example.com',
      phone: '+7 999 123 45 67',
      bio: 'О себе',
    },
  })

  const handleSubmit = values => {
    // Отправка данных на сервер
    console.log(values)
  }

  return <ProfileForm form={form} onSubmit={handleSubmit} isLoading={false} />
}
```

### PasswordForm

Форма для смены пароля:

```tsx
import { usePasswordForm, PasswordForm } from '@features/profile'

function MyComponent() {
  const form = usePasswordForm()

  const handleSubmit = values => {
    // Отправка данных на сервер
    console.log(values)
    form.reset() // Сброс формы после успешной смены
  }

  return <PasswordForm form={form} onSubmit={handleSubmit} isLoading={false} />
}
```

## Валидация

### Профиль

- `firstName`, `lastName`: 2-50 символов
- `email`: валидный email адрес
- `phone`: международный формат (опционально)
- `bio`: до 500 символов (опционально)

### Пароль

- `newPassword`: минимум 8 символов, включая заглавную букву, строчную букву и цифру
- `confirmPassword`: должен совпадать с новым паролем
- Новый пароль должен отличаться от текущего

## TODO: API Integration

После добавления API эндпоинтов:

1. Создать `api/use-update-profile.ts` с мутацией для обновления профиля
2. Создать `api/use-change-password.ts` с мутацией для смены пароля
3. Интегрировать мутации в компоненты форм
4. Добавить toast-уведомления об успехе/ошибке
