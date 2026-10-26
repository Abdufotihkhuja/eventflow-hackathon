# Organization Dashboard API

API для панели управления (Dashboard) CRM организаторов.

## Endpoints

### 1. Получить статистику Dashboard

```
GET /api/v1/organizations/dashboard/stats
```

**Доступ:** Organization, Member

**Описание:** Возвращает полную статистику для панели управления организатора.

#### Response 200

```json
{
  "events": {
    "active": {
      "value": 12,
      "changePercent": 25,
      "changeAbsolute": 3,
      "period": "30 дней"
    },
    "total": 15,
    "drafts": 2,
    "completed": 1
  },
  "tickets": {
    "open": {
      "value": 5,
      "changePercent": -40,
      "changeAbsolute": -3,
      "period": "неделю"
    },
    "total": 25,
    "completed": 20
  },
  "participants": {
    "newCount": 128,
    "momChangePercent": 18,
    "total": 450
  },
  "conversion": {
    "registrationRate": 42,
    "attendanceRate": 85,
    "totalRegistrations": 200,
    "approvedRegistrations": 170
  }
}
```

#### Описание полей

| Поле | Описание |
|------|----------|
| `events.active` | Активные события (опубликованные, ещё не закончились) |
| `events.total` | Всего событий организации |
| `events.drafts` | Черновики |
| `events.completed` | Завершённые события |
| `tickets.open` | Открытые задачи на досках |
| `tickets.total` | Всего задач |
| `tickets.completed` | Завершённые задачи |
| `participants.newCount` | Новые участники за текущий месяц |
| `participants.momChangePercent` | Изменение MoM (Month-over-Month) в % |
| `participants.total` | Всего уникальных участников |
| `conversion.registrationRate` | Конверсия регистрации (одобренные/всего) в % |
| `conversion.attendanceRate` | Процент посещаемости в % |

---

### 2. Получить командную активность

```
GET /api/v1/organizations/dashboard/activity
```

**Доступ:** Organization, Member

**Описание:** Возвращает список последних действий команды за последние 24 часа.

#### Query параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `limit` | number | 20 | Максимальное количество записей |

#### Response 200

```json
{
  "items": [
    {
      "id": "uuid-1",
      "type": "REGISTRATION",
      "description": "+1 регистрация на Eventflow Meetup 2025",
      "entityName": "Eventflow Meetup 2025",
      "entityId": "event-uuid",
      "createdAt": "2025-01-06T10:30:00Z",
      "timeAgo": "5 мин назад"
    },
    {
      "id": "uuid-2",
      "type": "EVENT_CREATED",
      "description": "Создано новое событие «Product Launch Briefing»",
      "entityName": "Product Launch Briefing",
      "entityId": "event-uuid-2",
      "createdAt": "2025-01-06T10:00:00Z",
      "timeAgo": "30 мин назад"
    },
    {
      "id": "uuid-3-completed",
      "type": "TASK_COMPLETED",
      "description": "Завершена задача «Подготовить презентацию»",
      "entityName": "Подготовить презентацию",
      "entityId": "task-uuid",
      "createdAt": "2025-01-06T09:45:00Z",
      "timeAgo": "45 мин назад"
    }
  ],
  "totalCount": 15,
  "periodStart": "2025-01-05T10:30:00Z",
  "periodEnd": "2025-01-06T10:30:00Z"
}
```

#### Типы активности (TeamActivityType)

| Тип | Описание |
|-----|----------|
| `REGISTRATION` | Новая регистрация на событие |
| `EVENT_CREATED` | Создано новое событие |
| `EVENT_PUBLISHED` | Событие опубликовано |
| `TASK_CREATED` | Создана новая задача |
| `TASK_COMPLETED` | Задача завершена |
| `MEMBER_JOINED` | Новый участник команды |

---

## Тестирование

### cURL примеры

```bash
# Получить статистику
curl -X GET "http://localhost:3000/api/v1/organizations/dashboard/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Получить активность (последние 10 записей)
curl -X GET "http://localhost:3000/api/v1/organizations/dashboard/activity?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Примечания

- Статистика `events.active.changePercent` сравнивает последние 30 дней с предыдущими 30 днями
- Статистика `tickets.open.changePercent` сравнивает последнюю неделю с предыдущей
- Показатель `participants.momChangePercent` — изменение количества участников текущего месяца относительно предыдущего
- Активность отображает действия только за последние 24 часа

