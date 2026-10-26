# Сертификаты: контракт и обработка запросов (Backend)

Документ описывает, какие запросы отправляет фронтенд и что должен принимать/возвращать backend для таба «Сертификаты». Обработка — рекомендации по валидации, хранению и генерации.

---

## 1. Шаблоны сертификатов

Базовый путь: `GET/POST` `/v1/events/:eventId/certificates/templates`, `PATCH/DELETE` `/v1/events/:eventId/certificates/templates/:templateId`.

### 1.1 GET `/v1/events/:eventId/certificates/templates`

**Назначение:** список шаблонов сертификатов события.

**Параметры:** `eventId` в path.

**Ответ (200):**

```json
{
  "templates": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "name": "string",
      "templateUrl": "https://...",
      "thumbnailUrl": "https://...",
      "namePosition": { "x": 50, "y": 50 },
      "nameFont": "optional",
      "nameFontSize": 20,
      "nameColor": "#000000",
      "datePosition": { "x": 50, "y": 70 },
      "eventNamePosition": { "x": 50, "y": 80 },
      "firstNamePosition": { "x": 25, "y": 35, "width": 20, "height": 8 },
      "lastNamePosition": { "x": 25, "y": 45, "width": 20, "height": 8 },
      "qrPosition": { "x": 70, "y": 80, "width": 18, "height": 18 },
      "isDefault": true,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

**Обработка:**

- Проверить права: организатор события или участник с правом на сертификаты.
- Вернуть все шаблоны события. Поля `firstNamePosition`, `lastNamePosition`, `qrPosition` — опционально (если backend их хранит).

---

### 1.2 POST `/v1/events/:eventId/certificates/templates`

**Назначение:** создать шаблон (загрузить изображение и сохранить позиции полей).

**Content-Type:** `multipart/form-data`.

**Тело запроса (поля FormData):**

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `template` | File | да | Изображение шаблона (PNG, JPG). |
| `name` | string | да | Название шаблона. |
| `namePosition` | JSON string | да | `{"x": number, "y": number}` — позиция «имя» (левая верхняя точка или центр, в % 0–100). |
| `firstNamePosition` | JSON string | нет* | `{"x", "y", "width", "height"}` в % (0–100). Рекомендуется для раздельного Имя/Фамилия. |
| `lastNamePosition` | JSON string | нет* | То же. |
| `qrPosition` | JSON string | нет* | Позиция и размер области QR на сертификате (%). |
| `nameFont` | string | нет | Название шрифта. |
| `nameFontSize` | string (number) | нет | Размер шрифта. |
| `nameColor` | string | нет | Цвет (hex и т.п.). |
| `datePosition` | JSON string | нет | `{"x", "y"}` в %. |
| `eventNamePosition` | JSON string | нет | `{"x", "y"}` в %. |
| `isDefault` | string | нет | `"true"` / `"false"`. |

\* Если фронт присылает `firstNamePosition` / `lastNamePosition` / `qrPosition`, backend должен их принять и сохранить.

**Обработка:**

1. Авторизация: только организатор/участник с правом на сертификаты по данному событию.
2. Валидация: `eventId` существует, файл `template` — изображение (например PNG/JPEG), размер в разумных пределах (например до 5–10 MB).
3. Парсинг JSON-полей: при ошибке парсинга — 400 с понятным сообщением.
4. Сохранение: загрузить файл в хранилище (S3/локально), получить URL; сохранить в БД запись шаблона с `eventId`, `name`, `templateUrl`, всеми переданными позициями (в т.ч. `firstNamePosition`, `lastNamePosition`, `qrPosition`).
5. Если передан `isDefault === true`, пометить этот шаблон как default и снять флаг с остальных шаблонов события.
6. Ответ 201: тело — созданный объект шаблона (как элемент из GET), включая `id`, `templateUrl`, `createdAt`, `updatedAt`.

**Ответ (201):** один объект шаблона в формате элемента массива `templates` из п. 1.1.

---

### 1.3 PATCH `/v1/events/:eventId/certificates/templates/:templateId`

**Назначение:** обновить шаблон (позиции и/или новое изображение).

**Content-Type:** `multipart/form-data`.

**Тело:** те же поля, что в POST, но все опциональны. Можно передать только нужные (например только `firstNamePosition`, `lastNamePosition`, `qrPosition` без нового файла).

**Обработка:**

1. Проверить права и существование `templateId` для данного `eventId`.
2. Парсинг переданных JSON-полей.
3. Обновить запись: перезаписать только переданные поля; если передан новый файл `template` — заменить файл и `templateUrl`.
4. Ответ 200: обновлённый объект шаблона.

---

### 1.4 DELETE `/v1/events/:eventId/certificates/templates/:templateId`

**Обработка:** проверить права, удалить запись шаблона и при необходимости файл в хранилище. Ответ 204 без тела.

---

## 2. Генерация сертификатов

### 2.1 POST `/v1/events/:eventId/certificates/generate`

**Назначение:** сгенерировать PDF-сертификаты для участников события по шаблону.

**Content-Type:** `application/json`.

**Тело запроса:**

```json
{
  "registrationIds": ["uuid1", "uuid2"]
}
```

- `registrationIds` **опционально**. Если отсутствует или пустой массив — генерировать сертификаты **всем подходящим участникам** (например одобренным и/или с посещаемостью, по бизнес-правилам). Если передан массив — только для указанных регистраций.

**Обработка:**

1. Авторизация: организатор/участник с правом на сертификаты по событию `eventId`.
2. Получить событие и его шаблон сертификата по умолчанию (или единственный шаблон). Если шаблона нет — 400 с сообщением «Нет шаблона сертификата».
3. Определить список регистраций:
   - если передан `registrationIds` — взять только эти, проверить что они принадлежат событию и допустимы для выдачи (например статус APPROVED);
   - иначе — выбрать всех допустимых участников (по вашим правилам: например одобренные, с посещаемостью).
4. Для каждой регистрации:
   - взять из регистрации/профиля: имя, фамилию (или полное имя), email;
   - сгенерировать PDF: фон — изображение шаблона (`templateUrl`), наложить текст/QR по позициям из шаблона:
     - если в шаблоне есть `firstNamePosition` / `lastNamePosition` — вывести имя и фамилию в этих областях (координаты и размер в % перевести в пиксели относительно размера страницы/изображения);
     - если есть `qrPosition` — сгенерировать QR (например ссылка на страницу верификации или уникальный код сертификата) и вставить в эту область;
     - при отсутствии этих полей использовать `namePosition` как одну зону для ФИО.
   - сохранить PDF в хранилище, получить URL;
   - создать запись «сертификат» (eventId, registrationId, templateId, certificateUrl, recipientName, recipientEmail, eventName, eventDate, issuedAt, downloadCount = 0).
5. Ответ: количество сгенерированных и при необходимости количество ошибок.

**Ответ (200):**

```json
{
  "generated": 10,
  "failed": 0
}
```

При частичных ошибках можно расширить ответ, например: `"errors": [{"registrationId": "uuid", "error": "причина"}]`.

---

## 3. Список выданных сертификатов

### 3.1 GET `/v1/events/:eventId/certificates`

**Назначение:** список выданных сертификатов по событию.

**Query-параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | number | Страница (например с 1). |
| `limit` | number | Записей на странице. |
| `search` | string | Поиск по имени/email получателя. |

**Ответ (200):**

```json
{
  "certificates": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "registrationId": "uuid",
      "templateId": "uuid",
      "certificateUrl": "https://...",
      "issuedAt": "ISO8601",
      "downloadCount": 0,
      "recipientName": "Имя Фамилия",
      "recipientEmail": "email@example.com",
      "eventName": "Название события",
      "eventDate": "2025-02-05"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**Обработка:** проверить права по событию, выборка по `eventId` с пагинацией и опциональным поиском.

---

## 4. Скачивание и верификация (кратко)

- **Скачать сертификат:** фронт может открывать/скачивать по `certificateUrl` из списка. Либо отдельный endpoint вида `GET /v1/events/:eventId/certificates/:certificateId/download` с редиректом на подписанный URL и увеличением `downloadCount`.
- **Верификация:** публичный endpoint (например `POST /v1/certificates/verify` с `certificateId` или кодом из QR) — проверить существование и не отозван ли сертификат, вернуть данные для отображения (событие, участник, дата).
- **Страница подтверждения оригинальности:** размещается на **eventflow.uz**. В QR-код на сертификате backend зашивает ссылку вида `https://eventflow.uz/certificates/verify?code=<verificationCode>`. Фронт по этому URL показывает страницу, которая по query-параметру `code` вызывает `POST /v1/certificates/verify` с телом `{ "code": "<code>" }` и отображает результат проверки.

---

## 5. Формат позиций (общий)

Все координаты и размеры с фронта приходят **в процентах** (0–100) от ширины/высоты изображения шаблона:

- `namePosition`, `datePosition`, `eventNamePosition`: объект `{ x: number, y: number }` (точка, например левый верхний угол области текста).
- `firstNamePosition`, `lastNamePosition`, `qrPosition`: объект `{ x: number, y: number, width: number, height: number }` — левый верхний угол и размер области в %.

При генерации PDF backend переводит проценты в пиксели относительно итогового размера страницы/картинки (например ширина 600px → x=25% = 150px).

---

## 6. Сводка эндпоинтов

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/v1/events/:eventId/certificates/templates` | Список шаблонов |
| POST | `/v1/events/:eventId/certificates/templates` | Создать шаблон (FormData) |
| PATCH | `/v1/events/:eventId/certificates/templates/:templateId` | Обновить шаблон (FormData) |
| DELETE | `/v1/events/:eventId/certificates/templates/:templateId` | Удалить шаблон |
| POST | `/v1/events/:eventId/certificates/generate` | Сгенерировать сертификаты (body: `registrationIds?`) |
| GET | `/v1/events/:eventId/certificates` | Список выданных (query: page, limit, search) |

После реализации этих контрактов фронт сможет подключить вызовы API вместо моков (см. `docs/certificates-tab-ui.md`).
