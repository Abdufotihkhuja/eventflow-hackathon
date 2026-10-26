# Исправление API для приглашения спикеров

## Проблема

При попытке пригласить спикера через API возникала ошибка:

```json
{
  "message": [
    "property title should not exist",
    "property message should not exist",
    "Должность не должна превышать 200 символов",
    "Должность обязательна",
    "position must be a string"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Причина:** API ожидал поле `position` вместо `title`, и не принимал поле `message`.

## Решение

### 1. Обновлены типы в `speaker.types.ts`

#### InviteSpeakerRequest
```typescript
// До
export type InviteSpeakerRequest = {
  email: string
  name: string
  title?: string        // ❌ Неправильное поле
  company?: string
  message?: string      // ❌ API не принимает
}

// После
export type InviteSpeakerRequest = {
  email: string
  name: string
  position: string      // ✅ Обязательное поле
  company?: string
  bio?: string
  linkedinUrl?: string
  twitterUrl?: string
  websiteUrl?: string
}
```

#### SpeakerInvitation
```typescript
// До
export type SpeakerInvitation = {
  // ...
  speakerTitle?: string  // ❌
  message?: string       // ❌
  // ...
}

// После
export type SpeakerInvitation = {
  // ...
  speakerPosition?: string  // ✅
  // ...
}
```

#### AcceptInvitationRequest
```typescript
// До
export type AcceptInvitationRequest = {
  token: string
  bio?: string
  company?: string
  social?: {           // ❌ Вложенный объект
    linkedin?: string
    twitter?: string
    website?: string
  }
}

// После
export type AcceptInvitationRequest = {
  token: string
  bio?: string
  company?: string
  linkedinUrl?: string  // ✅ Плоская структура
  twitterUrl?: string
  websiteUrl?: string
}
```

### 2. Обновлены схемы валидации

#### `event-speakers-tab.tsx`
```typescript
// До
const inviteSpeakerSchema = z.object({
  email: z.string().email('Введите корректный email'),
  name: z.string().min(2, 'Минимум 2 символа'),
  title: z.string().optional(),     // ❌
  company: z.string().optional(),
  message: z.string().optional(),   // ❌
})

// После
const inviteSpeakerSchema = z.object({
  email: z.string().email('Введите корректный email'),
  name: z.string().min(2, 'Минимум 2 символа'),
  position: z.string()              // ✅ Обязательное с валидацией
    .min(2, 'Минимум 2 символа')
    .max(200, 'Максимум 200 символов'),
  company: z.string().optional(),
  bio: z.string().optional(),
  linkedinUrl: z.string().url('Некорректный URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Некорректный URL').optional().or(z.literal('')),
  websiteUrl: z.string().url('Некорректный URL').optional().or(z.literal('')),
})
```

### 3. Обновлены формы

#### Дефолтные значения
```typescript
// До
defaultValues: {
  email: '',
  name: '',
  title: '',      // ❌
  company: '',
  message: '',    // ❌
}

// После
defaultValues: {
  email: '',
  name: '',
  position: '',   // ✅
  company: '',
  bio: '',
  linkedinUrl: '',
  twitterUrl: '',
  websiteUrl: '',
}
```

#### Поля формы
- Заменено `name="title"` на `name="position"`
- Добавлена звездочка `*` для обязательного поля "Должность"
- Добавлено поле "Биография" (`bio`)
- Добавлены поля для социальных сетей:
  - LinkedIn URL
  - Twitter URL
  - Website URL

### 4. Обновленные компоненты

1. **`src/api/services/speaker.types.ts`** - типы API
2. **`src/pages/my-events/details/ui/tabs/event-speakers-tab.tsx`** - вкладка спикеров
3. **`src/features/events/ui/speakers-field/speakers-field.tsx`** - поле спикеров в формах

## Результат

Теперь запрос отправляется в правильном формате согласно Swagger API:

```json
{
  "email": "speaker@example.com",
  "name": "Иван Иванов",
  "position": "Senior Developer",
  "company": "Google",
  "bio": "Краткая информация о спикере...",
  "linkedinUrl": "https://linkedin.com/in/username",
  "twitterUrl": "https://twitter.com/username",
  "websiteUrl": "https://example.com"
}
```

Обязательные поля: `email`, `name`, `position`  
Опциональные поля: `company`, `bio`, `linkedinUrl`, `twitterUrl`, `websiteUrl`

## Проверка

1. Откройте событие
2. Перейдите на вкладку "Спикеры"
3. Нажмите "Пригласить спикера"
4. Заполните форму:
   - **Email:** обязательное поле
   - **Имя спикера:** обязательное поле
   - **Должность:** обязательное поле (2-200 символов)
   - Компания: опциональное поле
   - Биография: опциональное поле
   - LinkedIn URL: опциональное поле
   - Twitter URL: опциональное поле
   - Website URL: опциональное поле
5. Отправьте приглашение

API должен успешно принять запрос и отправить email-приглашение спикеру.

### Форма приглашения спикера

Форма теперь содержит:

1. **Основные поля:**
   - Email (обязательно, с иконкой Mail)
   - Имя спикера (обязательно)
   - Должность (обязательно, 2-200 символов)
   - Компания

2. **Биография:**
   - Многострочное текстовое поле для краткой информации

3. **Социальные сети:**
   - LinkedIn (с иконкой Linkedin)
   - Twitter (с иконкой Twitter)
   - Website (с иконкой Globe)

Все URL поля валидируются на корректность формата.

## Связанные изменения

Поле `title` было заменено на `position` во всех типах спикеров еще раньше для согласованности с API:

- `Speaker.title` → `Speaker.position`
- `speaker.avatar` → `speaker.avatarUrl`
- `speaker.social.*` → `speaker.*Url` (плоская структура)

Эти изменения были применены пользователем в начале работы над agenda.
