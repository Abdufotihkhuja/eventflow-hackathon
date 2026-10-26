# Сертификаты в профиле пользователя: API для фронтенда

В профиле пользователя (участника) есть **два типа** сертификатов. Документ описывает API для их отображения и скачивания.

---

## 1. Два типа сертификатов

| Тип | Описание | Где показывать |
|-----|----------|----------------|
| **Сертификаты за мероприятия** | PDF, выданные организатором за участие в событии (генерация по шаблону). Один сертификат на одну регистрацию. | «Мои события» — в карточке события; отдельный раздел «Мои сертификаты за мероприятия» (если есть). |
| **Сертификаты профиля (UserCertificate)** | Карточки, которые пользователь добавляет вручную (название, провайдер, навыки, ссылка на PDF и т.д.). | Раздел «Мои сертификаты» в профиле (блок с карточками). |

Ниже — только **полученные сертификаты за мероприятия** (показ и скачивание). API для UserCertificate (me/certificates) в конце кратко.

---

## 2. Показ полученных сертификатов за мероприятия

### 2.1 Источник данных: список «Мои события»

Сертификаты за мероприятия привязаны к **регистрациям**. Полный список своих регистраций с флагом/данными о сертификате возвращает один эндпоинт.

**Запрос**

```
GET /api/v1/account/me/events
Authorization: Bearer <accessToken>
```

**Query-параметры**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `page` | number | 1 | Страница |
| `limit` | number | 10 | Записей на странице |
| `filter` | string | ALL | ALL \| APPROVED \| PENDING \| ATTENDED \| CANCELLED |
| `search` | string | — | Поиск по названию события |

**Ответ 200**

```json
{
  "data": [
    {
      "id": "uuid-регистрации",
      "status": "APPROVED",
      "role": "PARTICIPANT",
      "qrCode": "...",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "event": {
        "id": "uuid",
        "slug": "tech-conf-2025",
        "title": "Название события",
        "coverImage": "...",
        "shortDescription": "...",
        "startDate": "2025-02-01T00:00:00.000Z",
        "endDate": "2025-02-02T00:00:00.000Z",
        "format": "OFFLINE",
        "venue": "...",
        "city": "...",
        "status": "COMPLETED",
        "organizationName": "Организация"
      },
      "attendances": [
        { "id": "...", "checkInAt": "...", "checkInDate": "2025-02-01" }
      ],
      "certificate": {
        "id": "uuid-сертификата",
        "certificateUrl": "/uploads/certificates/cert-xxx.pdf",
        "generatedAt": "2025-02-05T14:00:00.000Z"
      },
      "isAttended": true,
      "isPastEvent": true
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "totalEvents": 25,
    "approvedEvents": 20,
    "pendingEvents": 2,
    "attendedEvents": 15,
    "cancelledEvents": 3,
    "certificatesCount": 5
  }
}
```

Поле **`certificate`** в элементе массива `data` опционально: оно есть только если по этой регистрации уже выдан сертификат. Если сертификата нет — поля `certificate` не будет (или `undefined`).

Для отображения «полученных» сертификатов:

- Фильтровать элементы, у которых есть `certificate`.
- В карточке события показывать кнопку «Скачать сертификат» только при `certificate != null`.
- Полный URL для открытия PDF: `https://<backend><certificate.certificateUrl>` (если бэкенд отдаёт статику по `/uploads`). Либо использовать эндпоинт скачивания из п. 2.3.

**Важно:** в `stats.certificatesCount` на текущей реализации считается количество **UserCertificate** (ручных сертификатов профиля), а не сертификатов за мероприятия. Количество «полученных за мероприятия» можно вычислить на фронте: число элементов `data`, у которых есть `certificate`.

---

### 2.2 Детали сертификата по регистрации (опционально)

Если нужны не только `id`, `certificateUrl`, `generatedAt`, а полный объект (например `downloadCount`, `recipientName`, `eventName` и т.д.):

**Запрос**

```
GET /api/v1/registrations/:registrationId/certificate
Authorization: Bearer <accessToken>
```

Доступ только у пользователя-владельца регистрации (тип USER, `registration.userId === currentUser.id`). Иначе 403.

**Ответ 200** — объект сертификата или **null** (если по этой регистрации сертификат ещё не выдан):

```json
{
  "id": "uuid",
  "registrationId": "uuid",
  "templateId": "uuid",
  "certificateUrl": "/uploads/certificates/cert-xxx.pdf",
  "generatedAt": "2025-02-05T14:00:00.000Z",
  "downloadCount": 0,
  "recipientName": "Иван Иванов",
  "recipientEmail": "ivan@example.com",
  "eventName": "Название события",
  "eventDate": "2025-02-05",
  "verificationCode": "uuid",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Если сертификата нет — тело ответа `null` (и 200).

---

### 2.3 Скачивание PDF (с учётом счётчика)

Чтобы отдать пользователю файл и увеличить счётчик скачиваний на бэкенде:

**Запрос**

```
GET /api/v1/certificates/:certificateId/download
Authorization: Bearer <accessToken>
```

`certificateId` — это `certificate.id` из списка «Мои события» или из ответа `GET registrations/:registrationId/certificate`.

**Ответ:** файл PDF (Content-Disposition: attachment). Доступ разрешён только владельцу сертификата (участнику), организатору события или члену организации. Иначе 403.

Рекомендация по UI: в карточке события при наличии `certificate` сделать кнопку «Скачать сертификат», по клику открывать ссылку `GET /api/v1/certificates/{certificate.id}/download` с подставленным токеном (или выполнять запрос с токеном и отдавать blob для сохранения).

---

## 3. Сводка: полученные сертификаты за мероприятия

| Действие | Метод и путь | Назначение |
|----------|--------------|------------|
| Список событий с признаком сертификата | GET `/api/v1/account/me/events` | Таблица/карточки «Мои события»; фильтр по наличию `certificate` = список полученных сертификатов |
| Детали сертификата по регистрации | GET `/api/v1/registrations/:registrationId/certificate` | Полный объект сертификата по одной регистрации (или null) |
| Скачать PDF | GET `/api/v1/certificates/:certificateId/download` | Скачивание файла и увеличение downloadCount |

Все запросы требуют авторизации (Bearer) и роль пользователя **USER** (участник).

---

## 4. Сертификаты профиля (UserCertificate) — кратко

Это другой раздел: ручные карточки «Мои сертификаты» в профиле (название, провайдер, навыки, ссылка на PDF и т.д.). Не путать с сертификатами за мероприятия.

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/v1/account/me/certificates` | Список сертификатов + статистика (query: search, filter=all\|verified\|unverified) |
| GET | `/api/v1/account/me/certificates/stats` | Статистика (totalCertificates, verifiedCertificates, totalTrainingHours) |
| GET | `/api/v1/account/me/certificates/:id` | Один сертификат по ID |
| POST | `/api/v1/account/me/certificates` | Создать |
| PATCH | `/api/v1/account/me/certificates/:id` | Обновить |
| DELETE | `/api/v1/account/me/certificates/:id` | Удалить |

Формат элемента списка и полей описан в DTO (UserCertificateDto: title, provider, issueDate, skills, certificateUrl, isVerified и т.д.).

---

## 5. Рекомендации по UI для «полученных» сертификатов

- На странице «Мои события» в каждой карточке события проверять наличие `certificate`. Если есть — показывать кнопку «Скачать сертификат» / «Открыть сертификат».
- Опционально: отдельная вкладка или блок «Сертификаты за мероприятия», где выводятся только события с `data[].certificate != null`, с возможностью скачать по `certificate.id` через `GET /api/v1/certificates/:id/download`.
- Для открытия PDF в новой вкладке можно использовать полный URL по `certificateUrl` (если бэкенд раздаёт статику по этому пути без проверки токена). Если бэкенд требует авторизацию для доступа к файлу — использовать только эндпоинт скачивания с Bearer.

---

## 6. Размер и формат сертификата за мероприятие

Сертификаты за мероприятия генерируются в **фиксированном размере** и формате:

| Параметр   | Значение                    |
|------------|-----------------------------|
| Формат     | PDF (`.pdf`)                |
| Ширина     | 842 pt                      |
| Высота     | 595 pt                      |
| Ориентация | Альбомная (landscape)       |

Соотношение сторон ≈ 1,415 (подходит для плейсхолдеров и превью на фронте). В коде экспортируются константы `CERTIFICATE_PDF_EXTENSION` (`.pdf`), `CERTIFICATE_PDF_WIDTH`, `CERTIFICATE_PDF_HEIGHT`, `CERTIFICATE_PDF_ASPECT_RATIO` из `@shared/api/certificatesService`.
