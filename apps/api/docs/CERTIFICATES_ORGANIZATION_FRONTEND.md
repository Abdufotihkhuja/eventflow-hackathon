# Сертификаты: интеграция для личного кабинета организации (Frontend)

Документ для фронтенда личного кабинета организатора: как подключаться к API и работать с шаблонами сертификатов, генерацией и списком выданных сертификатов.

---

## 1. Общие сведения

- **Базовый путь API:** `https://<backend>/api/v1`
- **Авторизация:** все запросы (кроме публичной верификации) требуют заголовок `Authorization: Bearer <accessToken>`
- **Права:**
  - **certificates:read** — просмотр шаблонов, списка выданных сертификатов, скачивание
  - **certificates:generate** — создание/редактирование/удаление шаблонов, запуск генерации

Все эндпоинты по сертификатам события привязаны к `eventId`: вы работаете в контексте конкретного события (страница события → вкладка «Сертификаты»).

---

## 2. Шаблоны сертификатов

### 2.1 Список шаблонов

**Запрос**

```
GET /api/v1/events/:eventId/certificates/templates
Authorization: Bearer <token>
```

**Ответ 200**

```json
{
  "templates": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "name": "Название шаблона",
      "templateUrl": "/uploads/certificate-templates/xxx.png",
      "thumbnailUrl": null,
      "namePosition": { "x": 50, "y": 50 },
      "nameFont": "Helvetica",
      "nameFontSize": 20,
      "nameColor": "#000000",
      "datePosition": { "x": 50, "y": 70 },
      "eventNamePosition": { "x": 50, "y": 80 },
      "firstNamePosition": { "x": 25, "y": 35, "width": 20, "height": 8 },
      "lastNamePosition": { "x": 25, "y": 45, "width": 20, "height": 8 },
      "qrPosition": { "x": 70, "y": 80, "width": 18, "height": 18 },
      "isDefault": true,
      "createdAt": "2025-02-05T12:00:00.000Z",
      "updatedAt": "2025-02-05T12:00:00.000Z"
    }
  ]
}
```

Поля позиций (`datePosition`, `eventNamePosition`, `firstNamePosition`, `lastNamePosition`, `qrPosition`) могут быть `null`, если не заданы. Для отображения превью используйте `templateUrl` (полный URL: `https://<backend><templateUrl>`).

---

### 2.2 Создать шаблон

**Запрос**

```
POST /api/v1/events/:eventId/certificates/templates
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Поля FormData**

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `template` | File | да | Изображение шаблона (PNG или JPEG, до 10 MB) |
| `name` | string | да | Название шаблона |
| `namePosition` | string (JSON) | да | `{"x": number, "y": number}` — позиция поля «Имя» в % (0–100) |
| `firstNamePosition` | string (JSON) | нет | `{"x", "y", "width", "height"}` в % — зона для имени |
| `lastNamePosition` | string (JSON) | нет | То же — зона для фамилии |
| `qrPosition` | string (JSON) | нет | `{"x", "y", "width", "height"}` — зона для QR-кода |
| `nameFont` | string | нет | Название шрифта |
| `nameFontSize` | string | нет | Размер шрифта (число) |
| `nameColor` | string | нет | Цвет в hex (например `#000000`) |
| `datePosition` | string (JSON) | нет | `{"x", "y"}` — позиция даты |
| `eventNamePosition` | string (JSON) | нет | `{"x", "y"}` — позиция названия события |
| `isDefault` | string | нет | `"true"` или `"false"` — шаблон по умолчанию для генерации |

Пример формирования запроса (JavaScript):

```javascript
const formData = new FormData();
formData.append('template', file); // File из input
formData.append('name', 'Основной шаблон');
formData.append('namePosition', JSON.stringify({ x: 50, y: 50 }));
formData.append('qrPosition', JSON.stringify({ x: 70, y: 80, width: 18, height: 18 }));
formData.append('isDefault', 'true');

await fetch(`${API_BASE}/events/${eventId}/certificates/templates`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**Ответ 201** — один объект шаблона в том же формате, что элемент массива `templates` в п. 2.1.

**Ошибки:** 400 (нет файла, неверный JSON в полях позиций), 403 (нет права), 404 (событие не найдено).

---

### 2.3 Обновить шаблон

**Запрос**

```
PATCH /api/v1/events/:eventId/certificates/templates/:templateId
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

Все поля FormData — опциональны. Передавайте только те, что нужно изменить. Можно обновить только позиции без нового файла или загрузить новый файл `template` — тогда прежнее изображение будет заменено.

**Ответ 200** — обновлённый объект шаблона.

---

### 2.4 Удалить шаблон

**Запрос**

```
DELETE /api/v1/events/:eventId/certificates/templates/:templateId
Authorization: Bearer <token>
```

**Ответ 204** — без тела.

---

## 3. Генерация сертификатов

**Запрос**

```
POST /api/v1/events/:eventId/certificates/generate
Content-Type: application/json
Authorization: Bearer <token>
```

**Тело (все поля опциональны)**

```json
{
  "registrationIds": ["uuid1", "uuid2"],
  "onlyAttended": true
}
```

- **registrationIds** — массив ID регистраций. Если не передан или пустой — генерируются сертификаты для всех подходящих участников (одобренные; при `onlyAttended: true` — только с хотя бы одной отметкой посещения).
- **onlyAttended** — по умолчанию `true`: учитывать только участников, которые хотя бы раз отметились. `false` — все одобренные регистрации.

**Ответ 200**

```json
{
  "generated": 10,
  "failed": 0,
  "errors": [
    { "registrationId": "uuid", "error": "Текст ошибки" }
  ]
}
```

Поле `errors` присутствует только при частичных ошибках (`failed > 0`).

**Важно:** для генерации должен существовать хотя бы один шаблон события (желательно с `isDefault: true`). Иначе — 400 с сообщением «Нет шаблона сертификата».

---

## 4. Список выданных сертификатов

**Запрос**

```
GET /api/v1/events/:eventId/certificates?page=1&limit=20&search=иванов
Authorization: Bearer <token>
```

**Query-параметры**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `page` | number | 1 | Номер страницы |
| `limit` | number | 20 | Записей на странице (макс. 100) |
| `search` | string | — | Поиск по имени или email получателя |

**Ответ 200**

```json
{
  "certificates": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "registrationId": "uuid",
      "templateId": "uuid",
      "certificateUrl": "/uploads/certificates/cert-xxx.pdf",
      "issuedAt": "2025-02-05T14:00:00.000Z",
      "downloadCount": 2,
      "recipientName": "Иван Иванов",
      "recipientEmail": "ivan@example.com",
      "eventName": "Название события",
      "eventDate": "2025-02-05"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

Для отображения PDF или скачивания по ссылке используйте полный URL: `https://<backend><certificateUrl>`. Либо используйте отдельный endpoint скачивания (п. 5) — он увеличивает счётчик скачиваний и отдаёт файл с корректным именем.

---

## 5. Скачивание сертификата

Чтобы скачать PDF и учесть скачивание в счётчике:

**Запрос**

```
GET /api/v1/events/:eventId/certificates/:certificateId/download
Authorization: Bearer <token>
```

Ответ — файл PDF (Content-Disposition: attachment). При каждом успешном запросе у сертификата увеличивается `downloadCount`.

Рекомендация: в таблице выданных сертификатов делать кнопку «Скачать», которая открывает эту ссылку в новой вкладке (с учётом того, что запрос должен идти с токеном — например через fetch с blob и создание object URL или через ссылку с подставленным токеном, если так реализовано на фронте).

---

## 6. Сводка эндпоинтов (организация)

| Метод | Путь | Право | Назначение |
|-------|------|-------|------------|
| GET | `/api/v1/events/:eventId/certificates/templates` | certificates:read | Список шаблонов |
| POST | `/api/v1/events/:eventId/certificates/templates` | certificates:generate | Создать шаблон (FormData) |
| PATCH | `/api/v1/events/:eventId/certificates/templates/:templateId` | certificates:generate | Обновить шаблон (FormData) |
| DELETE | `/api/v1/events/:eventId/certificates/templates/:templateId` | certificates:generate | Удалить шаблон |
| POST | `/api/v1/events/:eventId/certificates/generate` | certificates:generate | Сгенерировать сертификаты |
| GET | `/api/v1/events/:eventId/certificates` | certificates:read | Список выданных (page, limit, search) |
| GET | `/api/v1/events/:eventId/certificates/:certificateId/download` | certificates:read | Скачать PDF (увеличивает downloadCount) |

---

## 7. Рекомендации по UI

- **Шаблоны:** перед первой генерацией показать блок «Добавить шаблон» (загрузка изображения + настройка позиций полей). Список шаблонов — карточки с превью (`templateUrl`), кнопки «Редактировать», «Удалить», «По умолчанию».
- **Генерация:** кнопка «Сгенерировать сертификаты» с опцией «Только для посетивших» и при необходимости выбор конкретных регистраций. После ответа показать результат: «Создано: N, ошибок: M» и при `errors` — список проблемных регистраций.
- **Список сертификатов:** таблица с колонками (получатель, email, событие, дата выдачи, кол-во скачиваний) и поиском; кнопка «Скачать» на строку, ведущая на endpoint скачивания из п. 5.
