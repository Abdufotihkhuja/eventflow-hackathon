# BlockNote Rich Text Editor - Интеграция

## Обзор

Поле `description` событий теперь использует [BlockNote](https://www.blocknotejs.org/) - современный block-based rich text редактор, похожий на Notion.

## Изменения в API

### Тип данных

**До:**
```json
{
  "description": "Простая текстовая строка"
}
```

**После:**
```json
{
  "description": [
    {
      "id": "block1",
      "type": "paragraph",
      "props": {},
      "content": [
        {
          "type": "text",
          "text": "Текст с форматированием",
          "styles": {
            "bold": true
          }
        }
      ],
      "children": []
    }
  ]
}
```

### Структура BlockNote Block

```typescript
interface BlockNoteBlock {
  id: string;                        // Уникальный идентификатор
  type: string;                      // paragraph, heading, bulletListItem, etc.
  props?: Record<string, any>;       // Свойства блока (level для heading, checked для checkbox)
  content?: InlineContent[];         // Содержимое с форматированием
  children?: BlockNoteBlock[];       // Вложенные блоки
}

interface BlockNoteInlineContent {
  type: 'text' | 'link';
  text?: string;
  href?: string;                     // Для ссылок
  content?: BlockNoteInlineContent[]; // Для ссылок
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    textColor?: string;              // hex формат (#RGB или #RRGGBB)
    backgroundColor?: string;         // hex формат (#RGB или #RRGGBB)
  };
}
```

## API Endpoints

### 1. Создание события с описанием

**POST** `/api/v1/events`

```json
{
  "title": "Tech Conference 2025",
  "description": [
    {
      "id": "1",
      "type": "heading",
      "props": { "level": 1 },
      "content": [
        {
          "type": "text",
          "text": "Добро пожаловать!",
          "styles": { "bold": true }
        }
      ],
      "children": []
    },
    {
      "id": "2",
      "type": "paragraph",
      "props": {},
      "content": [
        {
          "type": "text",
          "text": "Это мероприятие про ",
          "styles": {}
        },
        {
          "type": "link",
          "href": "https://example.com",
          "content": [
            {
              "type": "text",
              "text": "инновации",
              "styles": { "underline": true }
            }
          ]
        }
      ],
      "children": []
    }
  ],
  "format": "ONLINE",
  "startDate": "2025-06-15T10:00:00Z",
  "endDate": "2025-06-15T18:00:00Z"
}
```

### 2. Получение описания в HTML (публичный endpoint)

**GET** `/api/v1/events/:id/description/html`

**Response:**
```json
{
  "html": "<h1><strong>Добро пожаловать!</strong></h1><p>Это мероприятие про <a href=\"https://example.com\" rel=\"noopener noreferrer\" target=\"_blank\"><u>инновации</u></a></p>"
}
```

**Rate Limit:** 30 запросов в минуту

### 3. Получение описания в текстовом формате (публичный endpoint)

**GET** `/api/v1/events/:id/description/text`

**Response:**
```json
{
  "text": "Добро пожаловать!\nЭто мероприятие про инновации"
}
```

**Rate Limit:** 30 запросов в минуту

## Ограничения и безопасность

### Лимиты

| Параметр | Значение | Описание |
|----------|----------|----------|
| MAX_DOCUMENT_SIZE | 500 KB | Максимальный размер JSON документа |
| MAX_BLOCKS_COUNT | 1000 | Максимальное количество блоков |
| MAX_NESTING_DEPTH | 10 | Максимальная глубина вложенности |
| MAX_TEXT_LENGTH | 50,000 | Максимальная длина текста в блоке |
| MAX_URL_LENGTH | 2048 | Максимальная длина URL |
| MAX_ID_LENGTH | 100 | Максимальная длина ID блока |

### Разрешённые типы блоков

- `paragraph`
- `heading`
- `bulletListItem`
- `numberedListItem`
- `checkListItem`
- `table`
- `image`
- `video`
- `audio`
- `file`
- `codeBlock`
- `quote`

### Безопасность

#### Защита от XSS
- Все HTML символы экранируются при конвертации
- Санитизация всех пользовательских данных
- Добавление `rel="noopener noreferrer"` к внешним ссылкам

#### Защита от URL Injection
- Блокировка `javascript:` и `data:` URI схем
- Белый список протоколов: `http:`, `https:`, `mailto:`
- Валидация всех URL через встроенный URL API

#### Защита от DoS
- Rate limiting на endpoints конвертации (30 req/min)
- Ограничение размера документа
- Ограничение глубины вложенности
- Ограничение количества блоков

## Интеграция на фронтенде

### Установка

```bash
npm install @blocknote/react @blocknote/core @blocknote/mantine
# или
yarn add @blocknote/react @blocknote/core @blocknote/mantine
```

### Базовая реализация (React)

```typescript
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useState } from "react";

interface EventFormProps {
  initialDescription?: any[];
  onSubmit: (data: { description: any[] }) => void;
}

export function EventForm({ initialDescription, onSubmit }: EventFormProps) {
  const editor = useCreateBlockNote({
    initialContent: initialDescription,
  });

  const handleSubmit = () => {
    const description = editor.document;
    onSubmit({ description });
  };

  return (
    <div>
      <BlockNoteView editor={editor} />
      <button onClick={handleSubmit}>Сохранить</button>
    </div>
  );
}
```

### Отображение описания на странице события

```typescript
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

interface EventDescriptionProps {
  description: any[];
}

export function EventDescription({ description }: EventDescriptionProps) {
  const editor = useCreateBlockNote({
    initialContent: description,
    editable: false, // Только для чтения
  });

  return <BlockNoteView editor={editor} />;
}
```

### Альтернатива: использование HTML endpoint

Если не нужен интерактивный редактор, можно получить HTML версию:

```typescript
const EventDescriptionHTML = ({ eventId }: { eventId: string }) => {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch(`/api/v1/events/${eventId}/description/html`)
      .then((res) => res.json())
      .then((data) => setHtml(data.html));
  }, [eventId]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
```

**⚠️ Важно:** HTML от бэкенда уже санитизирован, но всё равно рекомендуется использовать `dangerouslySetInnerHTML` с осторожностью.

## Примеры использования

### Простой параграф

```json
{
  "id": "1",
  "type": "paragraph",
  "props": {},
  "content": [
    {
      "type": "text",
      "text": "Обычный текст",
      "styles": {}
    }
  ],
  "children": []
}
```

### Заголовок с форматированием

```json
{
  "id": "2",
  "type": "heading",
  "props": { "level": 2 },
  "content": [
    {
      "type": "text",
      "text": "Важная информация",
      "styles": {
        "bold": true,
        "textColor": "#FF0000"
      }
    }
  ],
  "children": []
}
```

### Список с вложенными элементами

```json
{
  "id": "3",
  "type": "bulletListItem",
  "props": {},
  "content": [
    {
      "type": "text",
      "text": "Первый пункт",
      "styles": {}
    }
  ],
  "children": [
    {
      "id": "3-1",
      "type": "bulletListItem",
      "props": {},
      "content": [
        {
          "type": "text",
          "text": "Вложенный пункт",
          "styles": {}
        }
      ],
      "children": []
    }
  ]
}
```

### Ссылка

```json
{
  "id": "4",
  "type": "paragraph",
  "props": {},
  "content": [
    {
      "type": "text",
      "text": "Посетите ",
      "styles": {}
    },
    {
      "type": "link",
      "href": "https://example.com",
      "content": [
        {
          "type": "text",
          "text": "наш сайт",
          "styles": { "underline": true }
        }
      ]
    }
  ],
  "children": []
}
```

### Чеклист

```json
{
  "id": "5",
  "type": "checkListItem",
  "props": { "checked": true },
  "content": [
    {
      "type": "text",
      "text": "Зарегистрироваться на мероприятие",
      "styles": {}
    }
  ],
  "children": []
}
```

### Код

```json
{
  "id": "6",
  "type": "codeBlock",
  "props": { "language": "javascript" },
  "content": [
    {
      "type": "text",
      "text": "const greeting = 'Hello, World!';",
      "styles": {}
    }
  ],
  "children": []
}
```

## Миграция существующих данных

Если у вас уже есть события с текстовым описанием, используйте следующий подход:

### На бэкенде (автоматическая миграция)

SQL миграция автоматически конвертирует существующие текстовые описания в базовую BlockNote структуру (один параграф).

### На фронтенде (если получили текст)

```typescript
function textToBlockNote(text: string) {
  return [
    {
      id: Math.random().toString(36).substring(7),
      type: "paragraph",
      props: {},
      content: [
        {
          type: "text",
          text: text,
          styles: {},
        },
      ],
      children: [],
    },
  ];
}
```

## Обработка ошибок

### 400 Bad Request - Невалидная структура

```json
{
  "statusCode": 400,
  "message": [
    "Description must be a valid and safe BlockNote document structure"
  ],
  "error": "Bad Request"
}
```

**Причины:**
- Превышен максимальный размер документа (500KB)
- Превышено максимальное количество блоков (1000)
- Превышена максимальная глубина вложенности (10)
- Использован недопустимый тип блока
- Невалидная структура JSON
- Опасный URL (javascript: или data: URI)

### 429 Too Many Requests - Rate Limit

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

**Решение:** Подождите 1 минуту перед следующим запросом к `/description/html` или `/description/text`.

## FAQ

### 1. Можно ли использовать Markdown вместо BlockNote?

Нет, API принимает только BlockNote JSON формат. Однако вы можете использовать библиотеки для конвертации Markdown → BlockNote на фронтенде перед отправкой.

### 2. Как загружать изображения?

Используйте endpoint `/api/v1/uploads` для загрузки изображений, затем вставьте URL в блок типа `image`:

```json
{
  "id": "img1",
  "type": "image",
  "props": {
    "url": "https://your-cdn.com/image.jpg",
    "caption": "Описание изображения"
  },
  "content": undefined,
  "children": []
}
```

### 3. Нужно ли санитизировать HTML на фронтенде?

Нет, бэкенд уже санитизирует все данные при конвертации в HTML. Но всё равно используйте `dangerouslySetInnerHTML` с осторожностью.

### 4. Можно ли кастомизировать редактор?

Да! BlockNote поддерживает кастомные блоки, стили и плагины. См. [официальную документацию](https://www.blocknotejs.org/docs/features/custom-schemas).

### 5. Что делать, если description = null?

Это нормально. Поле `description` опционально. На фронтенде просто не показывайте редактор или отображайте пустое состояние.

## Ресурсы

- [BlockNote Documentation](https://www.blocknotejs.org/docs)
- [BlockNote Examples](https://www.blocknotejs.org/examples)
- [BlockNote GitHub](https://github.com/TypeCellOS/BlockNote)

## Поддержка

При возникновении проблем с интеграцией создайте issue в репозитории проекта или обратитесь к команде разработки.
