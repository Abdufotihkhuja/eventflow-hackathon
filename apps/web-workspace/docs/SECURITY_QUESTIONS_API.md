# Безопасность API вопросов регистрации

## Проблема безопасности

При создании системы тестов возникает критическая проблема: **участники могут увидеть правильные ответы через DevTools**.

### Как это работает?

1. Пользователь открывает форму регистрации
2. Браузер запрашивает вопросы через API
3. Пользователь открывает DevTools → Network
4. В ответе API видны поля `correctAnswer`, `correctOptions`, `points`
5. Пользователь получает все правильные ответы **до прохождения теста**

## Решение

### Два типа endpoints

#### 1. Public endpoint (для участников)

```
GET /events/:eventId/questions/public
```

**Доступ**: Публичный (без авторизации)

**Возвращает**: `QuestionEntity[]` — вопросы **БЕЗ** правильных ответов

**Пример ответа**:

```json
[
  {
    "id": "uuid",
    "eventId": "uuid",
    "question": "Какой ваш уровень владения JavaScript?",
    "type": "SELECT",
    "category": "ALTERNATIVE",
    "isRequired": true,
    "options": ["Начинающий", "Средний", "Продвинутый"],
    "informationalText": null,
    "sortOrder": 0,
    "createdAt": "2025-01-19T...",
    "updatedAt": "2025-01-19T..."
  }
]
```

**Скрыто**:
- ❌ `points` — баллы за вопрос
- ❌ `correctAnswer` — правильный ответ
- ❌ `correctOptions` — правильные варианты

#### 2. Admin endpoint (для организаторов)

```
GET /events/:eventId/questions
```

**Доступ**: Требуется авторизация + права `EVENTS_READ`

**Возвращает**: `QuestionAdminEntity[]` — вопросы **С** правильными ответами

**Пример ответа**:

```json
[
  {
    "id": "uuid",
    "eventId": "uuid",
    "question": "Какой ваш уровень владения JavaScript?",
    "type": "SELECT",
    "category": "ALTERNATIVE",
    "isRequired": true,
    "options": ["Начинающий", "Средний", "Продвинутый"],
    "informationalText": null,
    "sortOrder": 0,
    "points": 10,
    "correctAnswer": null,
    "correctOptions": ["Продвинутый"],
    "createdAt": "2025-01-19T...",
    "updatedAt": "2025-01-19T..."
  }
]
```

**Видно**:
- ✅ `points` — баллы за правильный ответ
- ✅ `correctAnswer` — правильный ответ (для TEXT/NUMBER/TEXTAREA/CLOSED)
- ✅ `correctOptions` — правильные варианты (для SELECT/CHECKBOX)

## Реализация

### Entity классы

#### QuestionEntity (для участников)

```typescript
export class QuestionEntity {
  id: string;
  eventId: string;
  question: string;
  type: QuestionType;
  category: QuestionCategory;
  isRequired: boolean;
  options: string[];
  informationalText?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  
  // НЕ включаем: points, correctAnswer, correctOptions
}
```

#### QuestionAdminEntity (для организаторов)

```typescript
export class QuestionAdminEntity extends QuestionEntity {
  points: number;
  correctAnswer?: string | null;
  correctOptions: string[];
}
```

### Методы сервиса

```typescript
// Для организаторов
async findByEvent(eventId: string): Promise<QuestionAdminEntity[]> {
  const questions = await this.prisma.registrationQuestion.findMany({
    where: { eventId },
    orderBy: { sortOrder: 'asc' },
  });
  return questions.map((q) => new QuestionAdminEntity(q));
}

// Для участников (БЕЗ правильных ответов)
async findByEventPublic(eventId: string): Promise<QuestionEntity[]> {
  const questions = await this.prisma.registrationQuestion.findMany({
    where: { eventId },
    orderBy: { sortOrder: 'asc' },
  });
  
  return questions.map((q) => new QuestionEntity({
    id: q.id,
    eventId: q.eventId,
    question: q.question,
    type: q.type,
    category: q.category,
    isRequired: q.isRequired,
    options: q.options,
    informationalText: q.informationalText,
    sortOrder: q.sortOrder,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));
}
```

## Использование на фронтенде

### Для участников (форма регистрации)

```typescript
// Получаем вопросы БЕЗ правильных ответов
const response = await fetch(`/api/v1/events/${eventId}/questions/public`);
const questions = await response.json();

// Пользователь видит только вопросы и варианты ответов
// Правильные ответы НЕДОСТУПНЫ даже через DevTools
```

### Для организаторов (управление вопросами)

```typescript
// Получаем вопросы С правильными ответами
const response = await fetch(`/api/v1/events/${eventId}/questions`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
const questions = await response.json();

// Организатор видит полную информацию, включая правильные ответы
```

## Проверка правильности ответов

Проверка правильности ответов происходит **ТОЛЬКО на backend** при создании регистрации:

```typescript
POST /api/v1/events/:eventId/registrations
Body: {
  "answers": [
    {
      "questionId": "uuid",
      "answer": "Продвинутый"
    }
  ]
}
```

Backend:
1. Получает `answers` от пользователя
2. Загружает вопросы с правильными ответами из БД
3. Сравнивает ответы пользователя с правильными
4. Подсчитывает баллы
5. Применяет логику автоотбора (если настроено)

**Важно**: Правильные ответы **НИКОГДА** не отправляются на фронтенд участникам!

## Безопасность

### ✅ Что защищено

1. **Правильные ответы скрыты** — участники не могут увидеть их через API
2. **Баллы скрыты** — участники не знают, сколько весит каждый вопрос
3. **Проверка на backend** — невозможно подделать результаты теста
4. **Раздельные endpoints** — четкое разделение прав доступа

### ❌ Что НЕ защищено (требует внимания)

1. **Rate limiting** — добавьте ограничения на количество попыток регистрации
2. **CAPTCHA** — защита от автоматических попыток прохождения тестов
3. **Время прохождения** — можно добавить ограничение по времени
4. **Логирование попыток** — отслеживание подозрительной активности

## Тестирование безопасности

### Проверка 1: Public endpoint не возвращает правильные ответы

```bash
curl -X GET http://localhost:3000/api/v1/events/{eventId}/questions/public
```

**Ожидаемый результат**: В ответе НЕТ полей `points`, `correctAnswer`, `correctOptions`

### Проверка 2: Admin endpoint требует авторизации

```bash
curl -X GET http://localhost:3000/api/v1/events/{eventId}/questions
```

**Ожидаемый результат**: `401 Unauthorized`

### Проверка 3: Admin endpoint возвращает полные данные

```bash
curl -X GET http://localhost:3000/api/v1/events/{eventId}/questions \
  -H "Authorization: Bearer {organizerToken}"
```

**Ожидаемый результат**: В ответе ЕСТЬ поля `points`, `correctAnswer`, `correctOptions`

## Рекомендации

### Для фронтенд-разработчиков

1. **Используйте public endpoint** для формы регистрации
2. **Не храните правильные ответы** на клиенте
3. **Отправляйте только ответы пользователя** на backend
4. **Доверяйте результату** от backend (баллы, прошел/не прошел)

### Для backend-разработчиков

1. **НИКОГДА не отправляйте** правильные ответы обычным пользователям
2. **Всегда проверяйте права** перед отдачей чувствительных данных
3. **Валидируйте ответы** на backend, не на фронтенде
4. **Логируйте попытки** для обнаружения мошенничества

---

**Автор**: EventFlow Backend Team  
**Дата создания**: 2025-01-19  
**Последнее обновление**: 2025-01-19
