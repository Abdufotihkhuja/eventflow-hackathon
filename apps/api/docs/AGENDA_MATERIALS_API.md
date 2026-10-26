# API Материалов Агенды Мероприятий

## Обзор

API для управления материалами элементов агенды мероприятий. Поддерживаются **два способа** добавления материалов: загрузка файла на сервер и добавление внешней ссылки (Google Drive, облако и т.д.). Все материалы хранятся в одном массиве элемента агенды.

**Base URL**: `/api/v1/events/:eventId/agenda/:agendaItemId/materials`

**Требуется авторизация**: Да (JWT Bearer Token)

---

## Два способа добавления материалов

| Способ | Endpoint | Описание |
|--------|----------|----------|
| **1. Загрузка файла** | `POST .../materials/upload` или `.../materials/upload-multiple` | Файл сохраняется на сервере. В материалы добавляется путь вида `/uploads/materials/{uuid}.pdf`. Скачивание через `GET .../materials/download?fileUrl=...`. |
| **2. Добавление ссылки** | `POST .../materials/link` | Внешний URL (Google Drive, Dropbox, облако и т.д.) добавляется в материалы без загрузки файла. На фронте открывается по ссылке; скачивание через API не используется. |

Оба варианта записываются в один массив `materials` элемента агенды. Список материалов (`GET .../materials`) возвращает и пути загруженных файлов, и внешние URL. Удаление (`DELETE .../materials`) работает для обоих типов.

---

## Возможности

- ✅ Загрузка одного файла
- ✅ Загрузка нескольких файлов (до 10 за раз)
- ✅ Добавление ссылки на материал (название + URL)
- ✅ Получение списка материалов
- ✅ Скачивание загруженных файлов
- ✅ Удаление материалов (файлов и ссылок)
- ✅ Защита от несанкционированного доступа
- ✅ Поддержка различных типов файлов

---

## Поддерживаемые типы файлов

### Документы
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)

### Презентации
- Microsoft PowerPoint (`.ppt`, `.pptx`)

### Таблицы
- Microsoft Excel (`.xls`, `.xlsx`)

### Изображения
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)

### Архивы
- ZIP (`.zip`)
- RAR (`.rar`)

### Текстовые файлы
- Plain Text (`.txt`)
- Markdown (`.md`)

**Максимальный размер файла**: 50 MB

---

## Права доступа

### Загрузка и удаление материалов
- ✅ **Организаторы** — могут загружать и удалять материалы своих мероприятий
- ❌ **Участники** — не могут управлять материалами

### Просмотр и скачивание материалов
- ✅ **Все авторизованные пользователи** — могут просматривать и скачивать материалы

---

## Endpoints

### 1. Загрузить материал

**POST** `/api/v1/events/:eventId/agenda/:agendaItemId/materials/upload`

**Права доступа**: Только организаторы

**Content-Type**: `multipart/form-data`

#### Request

```http
POST /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary]
```

#### Response 201

```json
{
  "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
  "originalName": "presentation.pdf",
  "mimetype": "application/pdf",
  "size": 1024000,
  "url": "/uploads/materials/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf"
}
```

#### Errors

- `400 Bad Request` — файл не предоставлен, недопустимый тип или размер превышен
- `401 Unauthorized` — отсутствует токен авторизации
- `403 Forbidden` — пользователь не является организатором
- `404 Not Found` — мероприятие или элемент агенды не найдены

---

### 2. Загрузить несколько материалов

**POST** `/api/v1/events/:eventId/agenda/:agendaItemId/materials/upload-multiple`

**Права доступа**: Только организаторы

**Content-Type**: `multipart/form-data`

**Ограничение**: Максимум 10 файлов за один запрос

#### Request

```http
POST /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/upload-multiple
Authorization: Bearer {token}
Content-Type: multipart/form-data

files: [binary, binary, binary, ...]
```

#### Response 201

```json
[
  {
    "filename": "uuid1.pdf",
    "originalName": "presentation.pdf",
    "mimetype": "application/pdf",
    "size": 1024000,
    "url": "/uploads/materials/uuid1.pdf"
  },
  {
    "filename": "uuid2.docx",
    "originalName": "document.docx",
    "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": 512000,
    "url": "/uploads/materials/uuid2.docx"
  }
]
```

#### Errors

- `400 Bad Request` — файлы не предоставлены, превышен лимит (>10), недопустимый тип или размер
- `401 Unauthorized` — отсутствует токен авторизации
- `403 Forbidden` — пользователь не является организатором
- `404 Not Found` — мероприятие или элемент агенды не найдены

---

### 3. Добавить ссылку на материал

**POST** `/api/v1/events/:eventId/agenda/:agendaItemId/materials/link`

**Права доступа**: Только организаторы

**Content-Type**: `application/json`

Добавляет внешнюю ссылку (Google Drive, облако и т.д.) в материалы элемента агенды без загрузки файла на сервер.

#### Request

```http
POST /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/link
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://drive.google.com/file/d/xxx/view",
  "title": "Доклад"
}
```

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `url` | string | да | Валидный URL (http или https). |
| `title` | string | нет | Название материала для отображения на фронте (в БД не сохраняется, только URL). |

Для совместимости backend также принимает alias-поля `link` вместо `url` и `name` вместо `title`.

#### Response 201

```json
{
  "url": "https://drive.google.com/file/d/xxx/view"
}
```

#### Errors

- `400 Bad Request` — некорректный URL или ссылка уже добавлена
- `401 Unauthorized` — отсутствует токен авторизации
- `403 Forbidden` — пользователь не является организатором
- `404 Not Found` — мероприятие или элемент агенды не найдены

---

### 4. Получить список материалов

**GET** `/api/v1/events/:eventId/agenda/:agendaItemId/materials`

**Права доступа**: Все авторизованные пользователи

#### Request

```http
GET /api/v1/events/{eventId}/agenda/{agendaItemId}/materials
Authorization: Bearer {token}
```

#### Response 200

Массив строк: пути загруженных файлов и/или внешние URL.

```json
[
  "/uploads/materials/uuid1.pdf",
  "/uploads/materials/uuid2.docx",
  "https://drive.google.com/file/d/xxx/view"
]
```

#### Errors

- `401 Unauthorized` — отсутствует токен авторизации
- `404 Not Found` — мероприятие или элемент агенды не найдены

---

### 5. Скачать материал

**GET** `/api/v1/events/:eventId/agenda/:agendaItemId/materials/download?fileUrl={url}`

**Права доступа**: Все авторизованные пользователи

#### Request

```http
GET /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/download?fileUrl=/uploads/materials/uuid.pdf
Authorization: Bearer {token}
```

#### Response 200

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="uuid.pdf"

[binary file data]
```

#### Errors

- `400 Bad Request` — параметр `fileUrl` не предоставлен или недопустим
- `401 Unauthorized` — отсутствует токен авторизации
- `404 Not Found` — мероприятие, элемент агенды или файл не найдены

**Примечание**: Скачивание через этот endpoint возможно только для загруженных файлов (путь вида `/uploads/materials/...`). Для внешних ссылок фронт открывает URL напрямую.

---

### 6. Удалить материал

**DELETE** `/api/v1/events/:eventId/agenda/:agendaItemId/materials`

**Права доступа**: Только организаторы

#### Request

```http
DELETE /api/v1/events/{eventId}/agenda/{agendaItemId}/materials
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileUrl": "/uploads/materials/uuid.pdf"
}
```

#### Response 200

```json
{
  "message": "Материал успешно удален"
}
```

#### Errors

- `400 Bad Request` — параметр `fileUrl` не предоставлен или недопустим
- `401 Unauthorized` — отсутствует токен авторизации
- `403 Forbidden` — пользователь не является организатором
- `404 Not Found` — мероприятие, элемент агенды или материал не найдены

---

## Примеры использования

### Пример 1: Загрузка презентации

```bash
# Загрузить презентацию для доклада
curl -X POST \
  http://localhost:3000/api/v1/events/{eventId}/agenda/{agendaItemId}/materials/upload \
  -H "Authorization: Bearer {organizerToken}" \
  -F "file=@presentation.pdf"

# Response:
{
  "filename": "uuid.pdf",
  "originalName": "presentation.pdf",
  "mimetype": "application/pdf",
  "size": 2048000,
  "url": "/uploads/materials/uuid.pdf"
}
```

### Пример 2: Загрузка нескольких файлов

```bash
# Загрузить презентацию, документ и таблицу
curl -X POST \
  http://localhost:3000/api/v1/events/{eventId}/agenda/{agendaItemId}/materials/upload-multiple \
  -H "Authorization: Bearer {organizerToken}" \
  -F "files=@presentation.pptx" \
  -F "files=@handout.pdf" \
  -F "files=@schedule.xlsx"

# Response:
[
  {
    "filename": "uuid1.pptx",
    "originalName": "presentation.pptx",
    "mimetype": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "size": 3072000,
    "url": "/uploads/materials/uuid1.pptx"
  },
  {
    "filename": "uuid2.pdf",
    "originalName": "handout.pdf",
    "mimetype": "application/pdf",
    "size": 512000,
    "url": "/uploads/materials/uuid2.pdf"
  },
  {
    "filename": "uuid3.xlsx",
    "originalName": "schedule.xlsx",
    "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "size": 256000,
    "url": "/uploads/materials/uuid3.xlsx"
  }
]
```

### Пример 3: Получение списка материалов

```bash
# Получить список всех материалов доклада
curl -X GET \
  http://localhost:3000/api/v1/events/{eventId}/agenda/{agendaItemId}/materials \
  -H "Authorization: Bearer {token}"

# Response:
[
  "/uploads/materials/uuid1.pptx",
  "/uploads/materials/uuid2.pdf",
  "/uploads/materials/uuid3.xlsx"
]
```

### Пример 4: Скачивание материала

```bash
# Скачать презентацию
curl -X GET \
  "http://localhost:3000/api/v1/events/{eventId}/agenda/{agendaItemId}/materials/download?fileUrl=/uploads/materials/uuid1.pptx" \
  -H "Authorization: Bearer {token}" \
  -o presentation.pptx

# Файл сохранен как presentation.pptx
```

### Пример 5: Удаление материала

```bash
# Удалить презентацию
curl -X DELETE \
  http://localhost:3000/api/v1/events/{eventId}/agenda/{agendaItemId}/materials \
  -H "Authorization: Bearer {organizerToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "/uploads/materials/uuid1.pptx"
  }'

# Response:
{
  "message": "Материал успешно удален"
}
```

---

## Интеграция с фронтендом

### Загрузка файла с прогресс-баром

```typescript
async function uploadMaterial(
  eventId: string,
  agendaItemId: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();

  // Отслеживание прогресса
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable && onProgress) {
      const progress = (e.loaded / e.total) * 100;
      onProgress(progress);
    }
  });

  return new Promise((resolve, reject) => {
    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));

    xhr.open(
      'POST',
      `/api/v1/events/${eventId}/agenda/${agendaItemId}/materials/upload`
    );
    xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken()}`);
    xhr.send(formData);
  });
}

// Использование
const file = document.querySelector('input[type="file"]').files[0];
await uploadMaterial(eventId, agendaItemId, file, (progress) => {
  console.log(`Загружено: ${progress.toFixed(2)}%`);
});
```

### Скачивание файла

```typescript
async function downloadMaterial(
  eventId: string,
  agendaItemId: string,
  fileUrl: string,
  filename: string
) {
  const response = await fetch(
    `/api/v1/events/${eventId}/agenda/${agendaItemId}/materials/download?fileUrl=${encodeURIComponent(fileUrl)}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Download failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Использование
await downloadMaterial(
  eventId,
  agendaItemId,
  '/uploads/materials/uuid.pdf',
  'presentation.pdf'
);
```

---

## Безопасность

### Защита от Path Traversal

Все пути к файлам проверяются на предмет попыток обхода директорий:

```typescript
// ❌ Заблокировано
fileUrl = "../../../etc/passwd"
fileUrl = "../../uploads/materials/uuid.pdf"

// ✅ Разрешено
fileUrl = "/uploads/materials/uuid.pdf"
```

### Проверка прав доступа

- **Загрузка/удаление**: Только организаторы мероприятия
- **Просмотр/скачивание**: Все авторизованные пользователи

### Валидация файлов

- Проверка MIME-типа файла
- Ограничение размера файла (50 MB)
- Проверка расширения файла

### Безопасное хранение

- Файлы хранятся с UUID именами
- Оригинальные имена не используются в файловой системе
- Защита от перезаписи существующих файлов

---

## Ограничения

| Параметр | Значение |
|----------|----------|
| Максимальный размер файла | 50 MB |
| Максимум файлов за раз | 10 |
| Поддерживаемые форматы | PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, изображения, архивы, текст |

---

## Структура хранения

```
uploads/
└── materials/
    ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
    ├── b2c3d4e5-f6a7-8901-bcde-f12345678901.docx
    └── c3d4e5f6-a7b8-9012-cdef-123456789012.pptx
```

**Важно**: 
- Файлы хранятся с UUID именами для безопасности
- Оригинальные имена сохраняются в метаданных
- При удалении материала файл удаляется из файловой системы

---

## Связь с агендой

Материалы хранятся в поле `materials` модели `AgendaItem`:

```prisma
model AgendaItem {
  id          String   @id @default(uuid())
  eventId     String
  title       String
  // ...
  materials   String[] // Массив URL материалов
  // ...
}
```

При загрузке файла его URL добавляется в массив `materials`.  
При удалении файла его URL удаляется из массива `materials`.

---

**Автор**: EventFlow Backend Team  
**Дата создания**: 2026-01-19  
**Последнее обновление**: 2026-01-19
