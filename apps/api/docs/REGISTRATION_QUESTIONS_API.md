# API Вопросов и Тестов при Регистрации

## Обзор

Система дополнительных вопросов при регистрации на мероприятие с поддержкой двух режимов:
- **QUESTIONS** (Уточняющие вопросы) - сбор информации о участниках
- **TEST** (Тестирование) - проверка знаний с автоматическим отбором или оценкой

**Base URL**: `/api/v1/events/:eventId/questions`

**Требуется авторизация**: Да (JWT Bearer Token)

---

## Режимы работы

### 1. QUESTIONS (Уточняющие вопросы)

Организатор собирает дополнительную информацию о участниках:
- Нет правильных/неправильных ответов
- Все зарегистрированные допускаются к событию
- Ответы используются для аналитики и организации

**Пример использования**: узнать должность, опыт работы, интересы участников

### 2. TEST (Тестирование)

Проверка знаний участников с двумя подрежимами:

#### AUTO_REJECT (Автоматический отбор)
- Участник должен набрать минимальный балл
- Не прошедшие тест автоматически отклоняются
- Статус регистрации: REJECTED

#### EVALUATION (Оценка для организатора)
- Все участники допускаются к событию
- Организатор видит результаты тестов
- Может использовать для распределения по группам

---

## Категории вопросов

### OPEN (Открытый)
Требует развернутого ответа от участника.

**Типы полей**: TEXT, TEXTAREA

**Пример**: "Расскажите о своем опыте в разработке"

**Для тестов**: можно указать ключевые слова в `correctAnswer` (через запятую)

### CLOSED (Закрытый)
Односложный ответ "Да" или "Нет".

**Тип поля**: CHECKBOX с 2 вариантами

**Пример**: "Вы согласны с правилами мероприятия?"

**Для тестов**: указать правильный ответ в `correctAnswer` ("Да" или "Нет")

### ALTERNATIVE (Альтернативный)
Выбор из предложенных вариантов.

**Типы полей**: 
- SELECT - один вариант
- CHECKBOX - несколько вариантов

**Пример**: "Выберите ваш уровень: Начинающий, Средний, Продвинутый"

**Для тестов**: указать правильные варианты в `correctOptions[]`

### RHETORICAL (Риторический)
Информационный текст без необходимости ответа.

**Тип поля**: любой (игнорируется)

**Пример**: "Внимание! После регистрации вы получите письмо с деталями"

**Использование**: отображается участнику как информация, не требует ответа

---

## Типы полей (QuestionType)

| Тип | Описание | Использование |
|-----|----------|---------------|
| TEXT | Короткий текст | Имя, email, должность |
| TEXTAREA | Многострочный текст | Развернутые ответы, мотивация |
| NUMBER | Числовое значение | Возраст, опыт в годах |
| SELECT | Выбор одного варианта | Уровень, специализация |
| CHECKBOX | Выбор нескольких вариантов | Навыки, интересы |

---

## Endpoints

### 0. Получить вопросы (публичный для участников)

**GET** `/api/v1/events/:eventId/questions/public`

**Доступ**: Публичный (без авторизации)

**Описание**: Возвращает список вопросов для события **БЕЗ правильных ответов** и баллов. Используется на форме регистрации участниками.

#### Response 200

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

⚠️ **Безопасность**: Этот endpoint НЕ возвращает `points`, `correctAnswer`, `correctOptions` для защиты от просмотра правильных ответов через DevTools. Подробнее: [Безопасность API](./SECURITY_QUESTIONS_API.md)

---

### 1. Создать вопрос

**POST** `/api/v1/events/:eventId/questions`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

```json
{
  "question": "Ваш уровень владения JavaScript?",
  "type": "SELECT",
  "category": "ALTERNATIVE",
  "isRequired": true,
  "options": ["Начинающий", "Средний", "Продвинутый", "Эксперт"],
  "points": 10,
  "correctOptions": ["Продвинутый", "Эксперт"],
  "sortOrder": 0
}
```

#### Поля

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `question` | string | Да | Текст вопроса (макс. 500 символов) |
| `type` | enum | Да | Тип поля: TEXT, NUMBER, SELECT, CHECKBOX, TEXTAREA |
| `category` | enum | Да | Категория: OPEN, CLOSED, ALTERNATIVE, RHETORICAL |
| `isRequired` | boolean | Нет | Обязателен ли вопрос (default: false) |
| `options` | string[] | Условно | Варианты ответов (обязательно для SELECT/CHECKBOX) |
| `points` | number | Нет | Вес вопроса в баллах (0-100, default: 0) |
| `correctAnswer` | string | Нет | Правильный ответ для TEXT/TEXTAREA/NUMBER |
| `correctOptions` | string[] | Нет | Правильные варианты для SELECT/CHECKBOX |
| `informationalText` | string | Нет | Текст для риторических вопросов |
| `sortOrder` | number | Нет | Порядок отображения |

#### Валидация категорий

- **OPEN**: type должен быть TEXT или TEXTAREA
- **CLOSED**: type должен быть CHECKBOX с ровно 2 вариантами
- **ALTERNATIVE**: type должен быть SELECT или CHECKBOX с минимум 1 вариантом
- **RHETORICAL**: обязательно поле informationalText

#### Response 201

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "question": "Ваш уровень владения JavaScript?",
  "type": "SELECT",
  "category": "ALTERNATIVE",
  "isRequired": true,
  "options": ["Начинающий", "Средний", "Продвинутый", "Эксперт"],
  "points": 10,
  "correctAnswer": null,
  "correctOptions": ["Продвинутый", "Эксперт"],
  "informationalText": null,
  "sortOrder": 0,
  "createdAt": "2026-01-19T12:00:00.000Z",
  "updatedAt": "2026-01-19T12:00:00.000Z"
}
```

---

### 2. Получить вопросы события (для организаторов)

**GET** `/api/v1/events/:eventId/questions`

**Права доступа**: `EVENTS_READ`

**Описание**: Возвращает список вопросов **С правильными ответами** и баллами. Используется организаторами для управления тестами.

#### Response 200

```json
[
  {
    "id": "uuid",
    "question": "Ваш уровень владения JavaScript?",
    "type": "SELECT",
    "category": "ALTERNATIVE",
    "isRequired": true,
    "options": ["Начинающий", "Средний", "Продвинутый", "Эксперт"],
    "points": 10,
    "correctOptions": ["Продвинутый", "Эксперт"],
    ...
  }
]
```

---

### 3. Обновить вопрос

**PATCH** `/api/v1/events/:eventId/questions/:id`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

Все поля опциональны:

```json
{
  "question": "Обновлённый текст вопроса",
  "points": 15
}
```

---

### 4. Удалить вопрос

**DELETE** `/api/v1/events/:eventId/questions/:id`

**Права доступа**: `EVENTS_UPDATE`

#### Response 200

```json
{
  "message": "Вопрос удалён"
}
```

---

### 5. Изменить порядок вопросов

**PATCH** `/api/v1/events/:eventId/questions/reorder`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

```json
{
  "questionIds": ["uuid3", "uuid1", "uuid2"]
}
```

---

## Создание события с тестом

### Настройка режима TEST

При создании события укажите:

```json
{
  "title": "JavaScript Bootcamp",
  "registrationMode": "TEST",
  "testEvaluationType": "AUTO_REJECT",
  "minTestScore": 70,
  ...
}
```

**Поля**:
- `registrationMode`: "QUESTIONS" или "TEST"
- `testEvaluationType`: "AUTO_REJECT" или "EVALUATION" (только для TEST)
- `minTestScore`: минимальный балл для прохождения (только для TEST)

### Автоматический расчет maxTestScore

При добавлении/удалении/изменении вопросов с `points > 0`, система автоматически пересчитывает `maxTestScore` события (сумма всех points).

---

## Регистрация на событие

### Режим QUESTIONS

```json
POST /api/v1/registrations/events/{eventId}

{
  "answers": [
    {
      "questionId": "uuid1",
      "answer": "Senior Developer"
    },
    {
      "questionId": "uuid2",
      "answer": "5 лет"
    }
  ]
}
```

**Результат**: регистрация создана, статус зависит от `accessType` события

### Режим TEST

```json
POST /api/v1/registrations/events/{eventId}

{
  "answers": [
    {
      "questionId": "uuid1",
      "answer": "Продвинутый"
    },
    {
      "questionId": "uuid2",
      "answer": "Да"
    }
  ]
}
```

**Результат AUTO_REJECT**:
- Набрал >= minTestScore: статус APPROVED
- Набрал < minTestScore: ошибка 400 "Тест не пройден"

**Результат EVALUATION**:
- Всегда статус APPROVED
- Результаты сохранены в registration (testScore, testPassed)

---

## Безопасность

### Защита правильных ответов

⚠️ **ВАЖНО**: Участники НЕ ДОЛЖНЫ видеть правильные ответы через API или DevTools!

Система использует **два типа endpoints**:

#### 1. Public endpoint (для участников)
- **URL**: `GET /events/:eventId/questions/public`
- **Доступ**: Публичный (без авторизации)
- **Возвращает**: Вопросы БЕЗ правильных ответов (`QuestionEntity[]`)
- **Использование**: Форма регистрации на фронтенде

#### 2. Admin endpoint (для организаторов)
- **URL**: `GET /events/:eventId/questions`
- **Доступ**: Требует авторизации + `EVENTS_READ`
- **Возвращает**: Вопросы С правильными ответами (`QuestionAdminEntity[]`)
- **Использование**: Управление тестами в админ-панели

### Что скрыто от участников

❌ **НЕ отправляется на фронтенд**:
- `points` — баллы за правильный ответ
- `correctAnswer` — правильный ответ (для TEXT/NUMBER/TEXTAREA/CLOSED)
- `correctOptions` — правильные варианты (для SELECT/CHECKBOX)

### Проверка правильности ответов

✅ Проверка происходит **ТОЛЬКО на backend** при создании регистрации:

1. Участник отправляет свои ответы через `POST /events/:eventId/registrations`
2. Backend получает вопросы с правильными ответами из БД
3. Backend сравнивает ответы и подсчитывает баллы
4. Backend применяет логику автоотбора (если настроено)

Участники **НИКОГДА** не получают правильные ответы на фронтенд!

### Рекомендации

**Для фронтенд-разработчиков**:
1. Используйте `/questions/public` для формы регистрации
2. Не храните правильные ответы на клиенте
3. Отправляйте только ответы пользователя на backend
4. Доверяйте результату от backend

**Для backend-разработчиков**:
1. НИКОГДА не отправляйте правильные ответы обычным пользователям
2. Всегда проверяйте права перед отдачей чувствительных данных
3. Валидируйте ответы на backend, не на фронтенде

📖 **Подробнее**: [Безопасность API вопросов](./SECURITY_QUESTIONS_API.md)

---

## Примеры использования

### Пример 1: Уточняющие вопросы

```bash
# 1. Создать событие в режиме QUESTIONS
POST /api/v1/events
{
  "title": "Design Conference",
  "registrationMode": "QUESTIONS",
  ...
}

# 2. Добавить открытый вопрос
POST /api/v1/events/{eventId}/questions
{
  "question": "Расскажите о своем опыте в дизайне",
  "type": "TEXTAREA",
  "category": "OPEN",
  "isRequired": true
}

# 3. Добавить альтернативный вопрос
POST /api/v1/events/{eventId}/questions
{
  "question": "Ваша специализация",
  "type": "SELECT",
  "category": "ALTERNATIVE",
  "options": ["UI/UX", "Graphic Design", "Motion Design"],
  "isRequired": true
}
```

### Пример 2: Тест для отбора

```bash
# 1. Создать событие в режиме TEST
POST /api/v1/events
{
  "title": "Advanced JavaScript Course",
  "registrationMode": "TEST",
  "testEvaluationType": "AUTO_REJECT",
  "minTestScore": 70,
  ...
}

# 2. Добавить тестовый вопрос (10 баллов)
POST /api/v1/events/{eventId}/questions
{
  "question": "Что такое замыкание в JavaScript?",
  "type": "TEXTAREA",
  "category": "OPEN",
  "points": 10,
  "correctAnswer": "функция,область видимости,лексическое окружение",
  "isRequired": true
}

# 3. Добавить вопрос с выбором (15 баллов)
POST /api/v1/events/{eventId}/questions
{
  "question": "Какие из этих методов являются асинхронными?",
  "type": "CHECKBOX",
  "category": "ALTERNATIVE",
  "options": ["setTimeout", "map", "fetch", "forEach", "Promise.all"],
  "correctOptions": ["setTimeout", "fetch", "Promise.all"],
  "points": 15,
  "isRequired": true
}

# maxTestScore автоматически = 25 баллов
```

### Пример 3: Риторический вопрос

```bash
POST /api/v1/events/{eventId}/questions
{
  "question": "Важная информация",
  "type": "TEXT",
  "category": "RHETORICAL",
  "informationalText": "Внимание! Мероприятие будет проходить в онлайн формате. Ссылка на подключение будет отправлена за 1 час до начала.",
  "isRequired": false
}
```

---

## Ошибки

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Для альтернативных вопросов необходимо указать правильные варианты (correctOptions)",
  "error": "Bad Request"
}
```

### 400 Bad Request - Тест не пройден

```json
{
  "statusCode": 400,
  "message": "Тест не пройден. Набрано 45 из 100 баллов. Требуется минимум 70.",
  "error": "Bad Request"
}
```

---

## Связанные API

- [Test System Guide](./TEST_SYSTEM_GUIDE.md) - Руководство по созданию тестов
