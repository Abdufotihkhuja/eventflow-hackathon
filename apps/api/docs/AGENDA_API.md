# API Программы мероприятия (Agenda)

## Обзор

API для управления программой мероприятия (agenda items) - расписание с указанием даты, времени, спикеров и материалов. **Поддерживает многодневные мероприятия**.

**Base URL**: `/api/v1/events/:eventId/agenda`

**Требуется авторизация**: Да (JWT Bearer Token)

---

## Endpoints

### 1. Создать пункт программы

**POST** `/api/v1/events/:eventId/agenda`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

```json
{
  "title": "Открытие конференции",
  "description": "Приветственное слово организаторов",
  "type": "KEYNOTE",
  "date": "2026-06-15",
  "startTime": "10:00",
  "duration": 60,
  "location": "Зал А, Комната 101",
  "materials": [
    "https://example.com/presentation.pdf",
    "https://example.com/materials.zip"
  ],
  "speakerIds": ["uuid1", "uuid2"],
  "sortOrder": 0
}
```

#### Поля

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `title` | string | Да | Название пункта программы (макс. 300 символов) |
| `description` | string | Нет | Описание (макс. 2000 символов) |
| `type` | enum | Да | Тип: `KEYNOTE`, `PRESENTATION`, `WORKSHOP`, `PANEL`, `NETWORKING`, `BREAK` |
| `date` | string | Да | Дата проведения в формате YYYY-MM-DD (должна быть в пределах дат мероприятия) |
| `startTime` | string | Да | Время начала в формате HH:MM (например, "10:00") |
| `duration` | number | Да | Длительность в минутах (минимум 1) |
| `location` | string | Нет | Локация для гибридных событий (макс. 200 символов) |
| `materials` | string[] | Нет | Массив ссылок на материалы (презентации, документы) |
| `speakerIds` | string[] | Нет | Массив UUID спикеров |
| `sortOrder` | number | Нет | Порядок отображения (по умолчанию добавляется в конец) |

#### Типы пунктов программы (AgendaItemType)

- `KEYNOTE` - Основной доклад
- `PRESENTATION` - Презентация
- `WORKSHOP` - Воркшоп
- `PANEL` - Панельная дискуссия
- `NETWORKING` - Нетворкинг
- `BREAK` - Перерыв

#### Response 201

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "title": "Открытие конференции",
  "description": "Приветственное слово организаторов",
  "type": "KEYNOTE",
  "date": "2026-06-15T00:00:00.000Z",
  "startTime": "1970-01-01T10:00:00.000Z",
  "duration": 60,
  "location": "Зал А, Комната 101",
  "materials": [
    "https://example.com/presentation.pdf",
    "https://example.com/materials.zip"
  ],
  "sortOrder": 0,
  "createdAt": "2026-01-19T12:00:00.000Z",
  "updatedAt": "2026-01-19T12:00:00.000Z",
  "speakers": [
    {
      "id": "uuid1",
      "name": "Иван Иванов",
      "position": "CEO",
      "company": "Tech Corp",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  ]
}
```

---

### 2. Получить программу события

**GET** `/api/v1/events/:eventId/agenda`

**Права доступа**: `EVENTS_READ`

Результаты сортируются по: `date` ASC → `startTime` ASC → `sortOrder` ASC.

#### Response 200

```json
[
  {
    "id": "uuid",
    "eventId": "uuid",
    "title": "Открытие конференции",
    "description": "Приветственное слово организаторов",
    "type": "KEYNOTE",
    "date": "2026-06-15T00:00:00.000Z",
    "startTime": "1970-01-01T10:00:00.000Z",
    "duration": 60,
    "location": "Зал А, Комната 101",
    "materials": [
      "https://example.com/presentation.pdf"
    ],
    "sortOrder": 0,
    "createdAt": "2026-01-19T12:00:00.000Z",
    "updatedAt": "2026-01-19T12:00:00.000Z",
    "speakers": [
      {
        "id": "uuid1",
        "name": "Иван Иванов",
        "position": "CEO",
        "company": "Tech Corp"
      }
    ]
  }
]
```

#### Группировка по дням на фронтенде

```typescript
// Пример группировки agenda по дням
const groupedByDay = agenda.reduce((acc, item) => {
  const dateKey = item.date.split('T')[0]; // "2026-06-15"
  if (!acc[dateKey]) acc[dateKey] = [];
  acc[dateKey].push(item);
  return acc;
}, {} as Record<string, AgendaItem[]>);

// Результат:
// {
//   "2026-06-15": [{ title: "Открытие", ... }, { title: "Доклад", ... }],
//   "2026-06-16": [{ title: "Мастер-класс", ... }],
//   "2026-06-17": [{ title: "Закрытие", ... }]
// }
```

---

### 3. Обновить пункт программы

**PATCH** `/api/v1/events/:eventId/agenda/:id`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

Все поля опциональны (PartialType от CreateAgendaItemDto):

```json
{
  "title": "Обновлённое название",
  "duration": 90,
  "materials": [
    "https://example.com/new-presentation.pdf"
  ]
}
```

#### Response 200

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "title": "Обновлённое название",
  "duration": 90,
  "materials": [
    "https://example.com/new-presentation.pdf"
  ],
  ...
}
```

---

### 4. Удалить пункт программы

**DELETE** `/api/v1/events/:eventId/agenda/:id`

**Права доступа**: `EVENTS_UPDATE`

#### Response 200

```json
{
  "message": "Пункт программы удалён"
}
```

---

### 5. Изменить порядок программы

**PATCH** `/api/v1/events/:eventId/agenda/reorder`

**Права доступа**: `EVENTS_UPDATE`

#### Request Body

```json
{
  "itemIds": ["uuid3", "uuid1", "uuid2"]
}
```

Массив UUID пунктов программы в новом порядке.

#### Response 200

Возвращает обновлённую программу с новым порядком:

```json
[
  {
    "id": "uuid3",
    "sortOrder": 0,
    ...
  },
  {
    "id": "uuid1",
    "sortOrder": 1,
    ...
  },
  {
    "id": "uuid2",
    "sortOrder": 2,
    ...
  }
]
```

---

## Ошибки

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["Время должно быть в формате HH:MM"],
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 400,
  "message": "Дата должна быть в пределах дат мероприятия: 2026-06-15 - 2026-06-17",
  "error": "Bad Request"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Нет доступа к этому мероприятию",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Пункт программы не найден",
  "error": "Not Found"
}
```

---

## Примеры использования

### Создание программы многодневного мероприятия

```bash
# День 1 (15 июня) - Открытие (10:00 - 11:00)
curl -X POST http://localhost:3000/api/v1/events/{eventId}/agenda \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Открытие конференции",
    "type": "KEYNOTE",
    "date": "2026-06-15",
    "startTime": "10:00",
    "duration": 60,
    "speakerIds": ["speaker-uuid"]
  }'

# День 1 (15 июня) - Презентация (11:00 - 12:00)
curl -X POST http://localhost:3000/api/v1/events/{eventId}/agenda \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Инновации в AI",
    "type": "PRESENTATION",
    "date": "2026-06-15",
    "startTime": "11:00",
    "duration": 60,
    "materials": ["https://example.com/ai-presentation.pdf"],
    "speakerIds": ["speaker-uuid-2"]
  }'

# День 2 (16 июня) - Мастер-класс (10:00 - 13:00)
curl -X POST http://localhost:3000/api/v1/events/{eventId}/agenda \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Практический воркшоп по ML",
    "type": "WORKSHOP",
    "date": "2026-06-16",
    "startTime": "10:00",
    "duration": 180,
    "location": "Зал B"
  }'

# День 3 (17 июня) - Закрытие (16:00 - 17:00)
curl -X POST http://localhost:3000/api/v1/events/{eventId}/agenda \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Закрытие и награждение",
    "type": "KEYNOTE",
    "date": "2026-06-17",
    "startTime": "16:00",
    "duration": 60
  }'
```

---

## Примечания

1. **Дата (date)**: Обязательное поле в формате YYYY-MM-DD. Должна быть в пределах startDate и endDate мероприятия. При создании валидируется автоматически.

2. **Время (startTime)**: Сохраняется как `@db.Time` в PostgreSQL. В ответе возвращается как полная дата (1970-01-01T{time}), используйте только время.

3. **Многодневные мероприятия**: Результаты автоматически сортируются по дате → времени → sortOrder. На фронтенде можно группировать по дате для отображения табов "День 1", "День 2" и т.д.

4. **Материалы (materials)**: Массив строк с URL. Фронтенд должен загружать файлы отдельно и передавать ссылки.

5. **Спикеры**: Связь many-to-many. Спикеры должны быть созданы заранее через `/api/v1/events/:eventId/speakers`.

6. **Сортировка**: По умолчанию пункты сортируются по `date` → `startTime` → `sortOrder`. Используйте endpoint `/reorder` для изменения порядка в рамках одного дня.

7. **Доступ**: Только организация-владелец события и её члены с правами `EVENTS_UPDATE` могут управлять программой.

---

## Связанные API

- [Speakers API](./SPEAKERS_API.md) - Управление спикерами
