# Загрузка изображений в BlockNote редактор

## Обзор

Добавлена возможность загрузки изображений непосредственно в BlockNote редактор с автоматической загрузкой через API.

## Функциональность

### ✅ Возможности

- **Drag & Drop** - перетаскивание изображений в редактор
- **Вставка через кнопку** - кнопка "+" в редакторе → "Image"
- **Вставка через меню** - команда `/image` в редакторе
- **Автоматическая валидация** - проверка размера и формата
- **Автоматическая загрузка** - файл загружается на сервер через API
- **Превью** - изображение сразу отображается в редакторе

### 📋 Ограничения

| Параметр | Значение |
|----------|----------|
| **Максимальный размер** | 5 MB |
| **Форматы** | JPEG, PNG, GIF, WebP |

## Техническая реализация

### 1. API Integration

Используется существующий сервис `uploadsService`:

```typescript
import { uploadsService } from '@api/services/uploadsService'
import { getMediaUrl } from '@api/config'
```

### 2. Валидация файлов

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Проверка размера
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  // Проверка типа
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      valid: false,
      error: 'Неподдерживаемый формат. Разрешены: JPEG, PNG, GIF, WebP',
    }
  }

  return { valid: true }
}
```

### 3. Функция загрузки

```typescript
async function uploadImageForEditor(file: File): Promise<string> {
  // Валидация
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    // Загружаем изображение через API
    const response = await uploadsService.uploadImage(file)

    // Возвращаем полный URL
    const fullUrl = getMediaUrl(response.url)
    if (!fullUrl) {
      throw new Error('Не удалось получить URL изображения')
    }

    return fullUrl
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error)
    throw new Error('Не удалось загрузить изображение. Попробуйте еще раз.')
  }
}
```

### 4. Конфигурация BlockNote

```typescript
const editor = useCreateBlockNote({
  initialContent,
  // Включаем загрузку изображений только в режиме редактирования
  uploadFile: editable ? uploadImageForEditor : undefined,
})
```

## API Endpoint

### POST /api/v1/uploads/image

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
file: binary
```

**Response:**
```json
{
  "id": "uuid",
  "url": "/uploads/abc123-uuid.jpg",
  "name": "abc123-uuid.jpg",
  "originalName": "photo.jpg",
  "type": "image",
  "mimeType": "image/jpeg",
  "size": 102400,
  "width": 1920,
  "height": 1080,
  "uploadedBy": "user-id",
  "uploadedAt": "2026-01-26T10:00:00Z"
}
```

## Структура блока изображения в JSON

После загрузки изображение сохраняется в BlockNote как блок:

```json
{
  "id": "block-id",
  "type": "image",
  "props": {
    "url": "https://eventflow.uz/uploads/abc123-uuid.jpg",
    "caption": "",
    "width": 512,
    "textAlignment": "left",
    "backgroundColor": "default"
  },
  "content": [],
  "children": []
}
```

## Использование

### В режиме редактирования

1. **Через кнопку "+":**
   - Кликните на кнопку "+" в левой части строки
   - Выберите "Image" из меню
   - Выберите файл или перетащите его

2. **Через команду:**
   - Напишите `/image` в редакторе
   - Нажмите Enter
   - Выберите файл

3. **Drag & Drop:**
   - Перетащите изображение из файлового менеджера прямо в редактор

### В режиме просмотра

- Изображения отображаются автоматически
- Загрузка недоступна (только просмотр)

## Обработка ошибок

### Ошибки валидации

| Ошибка | Сообщение |
|--------|-----------|
| Файл слишком большой | "Файл слишком большой. Максимальный размер: 5MB" |
| Неверный формат | "Неподдерживаемый формат. Разрешены: JPEG, PNG, GIF, WebP" |

### Ошибки загрузки

| Ошибка | Сообщение |
|--------|-----------|
| Сетевая ошибка | "Не удалось загрузить изображение. Попробуйте еще раз." |
| Ошибка API | "Не удалось загрузить изображение. Попробуйте еще раз." |
| Нет URL в ответе | "Не удалось получить URL изображения" |

Все ошибки логируются в консоль для отладки:
```typescript
console.error('Ошибка загрузки изображения:', error)
```

## Безопасность

### Автоматическая авторизация

- Токен добавляется автоматически через `api` interceptor
- Не требуется явная передача токена в `uploadFile`

### Валидация на фронтенде

- Проверка размера файла (< 5MB)
- Проверка MIME типа (только изображения)
- Защита от загрузки вредоносных файлов

### Валидация на бэкенде

API должен дополнительно проверять:
- MIME тип файла
- Реальное содержимое файла (magic bytes)
- Размер файла
- Права пользователя на загрузку

## Измененные файлы

### `src/shared/ui/rich-text-editor/rich-text-editor.tsx`

**Добавлено:**
- Импорты `uploadsService` и `getMediaUrl`
- Константы `MAX_FILE_SIZE`, `ALLOWED_IMAGE_TYPES`
- Функция `validateImageFile()` для валидации
- Функция `uploadImageForEditor()` для загрузки
- Опция `uploadFile` в `useCreateBlockNote`

**Изменения:**
```typescript
// Было:
const editor = useCreateBlockNote({
  initialContent,
})

// Стало:
const editor = useCreateBlockNote({
  initialContent,
  uploadFile: editable ? uploadImageForEditor : undefined,
})
```

## Тестирование

### Ручное тестирование

1. **Загрузка валидного изображения:**
   - ✅ Откройте `/my-events/:id/edit`
   - ✅ Добавьте изображение через `/image` или drag & drop
   - ✅ Изображение должно загрузиться и отобразиться
   - ✅ Проверьте сохранение и перезагрузку страницы

2. **Валидация размера:**
   - ❌ Попробуйте загрузить файл > 5MB
   - ✅ Должна появиться ошибка "Файл слишком большой"

3. **Валидация формата:**
   - ❌ Попробуйте загрузить PDF/DOC файл
   - ✅ Должна появиться ошибка "Неподдерживаемый формат"

4. **Режим просмотра:**
   - ✅ Откройте `/my-events/:id`
   - ✅ Изображения должны отображаться
   - ✅ Загрузка недоступна

### Автоматическое тестирование

```typescript
// Пример теста (не реализован)
describe('RichTextEditor - Image Upload', () => {
  it('should upload valid image', async () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const url = await uploadImageForEditor(file)
    expect(url).toMatch(/^https:\/\//)
  })

  it('should reject large files', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    })
    await expect(uploadImageForEditor(largeFile)).rejects.toThrow('слишком большой')
  })

  it('should reject invalid formats', async () => {
    const pdfFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    await expect(uploadImageForEditor(pdfFile)).rejects.toThrow('Неподдерживаемый формат')
  })
})
```

## UX Considerations

### Индикация загрузки

BlockNote автоматически показывает:
- ✅ Spinner во время загрузки
- ✅ Превью изображения после загрузки
- ✅ Placeholder если загрузка не удалась

### Сообщения об ошибках

- Ошибки валидации показываются сразу
- Ошибки API показываются после попытки загрузки
- Все ошибки логируются в консоль

### Производительность

- Валидация выполняется на клиенте (быстро)
- Загрузка асинхронная (не блокирует UI)
- Большие изображения могут загружаться долго (нет прогресс-бара)

## Возможные улучшения

### 1. Progress Bar
Добавить индикатор прогресса загрузки для больших файлов.

### 2. Image Compression
Автоматически сжимать большие изображения перед загрузкой.

### 3. Multiple Upload
Поддержка загрузки нескольких изображений одновременно.

### 4. Image Editing
Встроенный редактор для кадрирования и фильтров.

### 5. Clipboard Paste
Поддержка вставки изображений из буфера обмена (Ctrl+V).

## Связанные документы

- `docs/RICH_TEXT_DISPLAY_FIX.md` - Проблемы отображения контента
- `docs/RICH_TEXT_TABLES_FINAL.md` - Работа с таблицами
- `src/api/services/uploadsService.ts` - API сервис загрузки
- `src/api/services/upload.types.ts` - Типы для загрузки
