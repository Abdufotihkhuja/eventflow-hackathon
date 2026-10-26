# API фирменных билетов с QR кодом

API для генерации и скачивания фирменных билетов с QR кодом для участников мероприятий.

## Обзор

- **Пользователи** могут скачивать свои билеты после одобрения регистрации
- **Организаторы** могут скачивать билеты участников по одному или массово (ZIP)
- При **сканировании QR** автоматически открывается страница check-in с кодом
- Два варианта дизайна: **брендированный** (с фирменным оформлением) и **простой** (белый фон)

---

## Формат QR кода

QR код содержит URL для автоматического перехода на страницу check-in:

```
https://app.eventflow.uz/check-in?code=f47ac10b-58cc-4372-a567-0e02b2c3d479
```

При сканировании любым QR сканером автоматически открывается приложение на странице check-in с кодом участника.

---

## Упрощённый Check-in (НОВЫЙ)

Новый упрощённый эндпоинт для check-in без необходимости знать eventId заранее.

```
POST /api/v1/attendance/check-in
```

**Требуется**: Авторизация (JWT токен организации или сотрудника) + право `EVENTS_UPDATE`

**Body:**

```json
{
  "qrCode": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Формат ответа:**

```json
{
  "attendance": {
    "id": "uuid-attendance-id",
    "checkInAt": "2025-06-15T09:30:00.000Z",
    "checkInDate": "2025-06-15"
  },
  "participant": {
    "id": "uuid-user-id",
    "firstName": "Иван",
    "lastName": "Петров",
    "email": "ivan@example.com",
    "role": "PARTICIPANT"
  },
  "registration": {
    "id": "uuid-registration-id",
    "status": "APPROVED"
  },
  "ticketUrls": {
    "branded": "/api/v1/events/uuid-event-id/tickets/uuid-registration-id?design=branded",
    "simple": "/api/v1/events/uuid-event-id/tickets/uuid-registration-id?design=simple"
  }
}
```

**Преимущества:**
- ✅ Не нужно знать eventId заранее
- ✅ Автоматическое определение события из QR кода
- ✅ Проверка прав доступа на backend
- ✅ Простая интеграция с фронтендом

**Коды ошибок:**

| Код | Описание |
|-----|----------|
| 400 | Регистрация не одобрена / Мероприятие ещё не началось |
| 403 | Нет доступа к этому мероприятию |
| 404 | Регистрация не найдена |
| 409 | Участник уже отмечен сегодня |

---

## Эндпоинты для пользователей

### Скачать свой билет

```
GET /api/v1/registrations/:id/ticket
```

**Требуется**: Авторизация (JWT токен пользователя)

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `design` | enum | `branded` | Дизайн билета: `branded` или `simple` |

**Пример запроса:**

```bash
curl -X GET "http://localhost:3000/api/v1/registrations/uuid-registration-id/ticket?design=branded" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --output ticket.pdf
```

**Ответ:** PDF файл билета

---

## Эндпоинты для организаторов

### Скачать билет участника

```
GET /api/v1/events/:eventId/tickets/:registrationId
```

**Требуется**: Авторизация (JWT токен организации или сотрудника) + право `EVENTS_READ`

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `design` | enum | `branded` | Дизайн билета: `branded` или `simple` |

**Пример запроса:**

```bash
curl -X GET "http://localhost:3000/api/v1/events/uuid-event-id/tickets/uuid-registration-id?design=simple" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  --output ticket.pdf
```

**Ответ:** PDF файл билета

---

### Скачать все билеты (ZIP)

```
POST /api/v1/events/:eventId/tickets/download-all
```

**Требуется**: Авторизация + право `EVENTS_READ`

**Body параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `design` | enum | `branded` | Дизайн билетов |
| `status` | enum | `APPROVED` | Статус регистраций для скачивания |
| `registrationIds` | string[] | - | Конкретные ID регистраций (опционально) |

**Пример запроса:**

```bash
curl -X POST "http://localhost:3000/api/v1/events/uuid-event-id/tickets/download-all" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"design": "simple", "status": "APPROVED"}' \
  --output tickets.zip
```

**Ответ:** ZIP архив с PDF билетами

---

## Дизайн билетов

### Брендированный (branded)

- Градиентный тёмный фон (синий/тёмно-синий)
- Логотип организации (если загружен)
- Название мероприятия крупным шрифтом
- Дата и место проведения
- Формат мероприятия (онлайн/офлайн/гибрид)
- Роль участника выделена цветом
- ФИО участника и email
- QR код на белом фоне справа

### Простой (simple)

- Белый фон
- Минималистичный дизайн
- Название организации
- Название мероприятия
- Дата и место
- Роль и ФИО участника
- QR код справа

**Размер билета:** A6 горизонтальный (148×105 мм) — оптимально для беджиков

---

## Примеры использования

### Сценарий 1: Пользователь скачивает билет

```bash
# 1. Получить свои регистрации
GET /api/v1/my-registrations

# 2. Скачать билет для одобренной регистрации
GET /api/v1/registrations/{id}/ticket?design=branded
```

### Сценарий 2: Организатор на входе (НОВЫЙ)

```bash
# 1. Пользователь показывает QR код
# 2. Организатор сканирует → открывается https://app.eventflow.uz/check-in?code=uuid
# 3. Фронтенд берёт code из URL и отправляет:

POST /api/v1/attendance/check-in
Body: { "qrCode": "uuid" }

# 4. Получить ticketUrls из ответа и скачать билет для печати беджика
GET {ticketUrls.simple}  # Простой дизайн для беджика
```

### Сценарий 3: Массовая печать беджиков

```bash
# Скачать все билеты в простом дизайне
POST /api/v1/events/{eventId}/tickets/download-all
Body: { "design": "simple" }
```

---

## Переменные окружения

Добавьте в `.env`:

```env
FRONTEND_APP_URL=https://app.eventflow.uz
```

Эта переменная используется для формирования URL в QR кодах билетов.

---

## Старый Check-in (DEPRECATED)

```
POST /api/v1/events/:eventId/attendance/check-in
```

⚠️ **УСТАРЕЛ**: Используйте `POST /api/v1/attendance/check-in` вместо этого.
