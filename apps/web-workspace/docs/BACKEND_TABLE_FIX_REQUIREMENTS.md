# Требования к исправлению структуры таблиц на бэкенде

## Проблема

Таблицы в поле `description` событий сохраняются в формате, несовместимом с BlockNote редактором на фронтенде.

**Ошибка на фронте:**
```
RangeError: Invalid content for node table: <>
```

**Причина:**
Отсутствуют обязательные поля в структуре таблицы, либо структура не соответствует спецификации BlockNote.

---

## Требуемая структура таблицы

### Полная структура (минимум)

```json
{
  "id": "уникальный-id",
  "type": "table",
  "props": {
    "textColor": "default",
    "backgroundColor": "default"
  },
  "content": {
    "type": "tableContent",
    "headerRows": 0,
    "rows": [
      {
        "cells": [
          {
            "type": "tableCell",
            "props": {
              "colspan": 1,
              "rowspan": 1,
              "textColor": "default",
              "textAlignment": "left",
              "backgroundColor": "default"
            },
            "content": [
              {
                "type": "text",
                "text": "Текст ячейки",
                "styles": {}
              }
            ]
          }
        ]
      }
    ],
    "columnWidths": [null]
  },
  "children": []
}
```

---

## Обязательные поля

### Уровень 1: Block (таблица)

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `id` | string | ✅ Да | Уникальный ID блока |
| `type` | string | ✅ Да | Должно быть `"table"` |
| `props` | object | ⚠️ Рекомендуется | Свойства блока |
| `content` | object | ✅ **ДА** | **Контент таблицы (обязательно!)** |
| `children` | array | ⚠️ Рекомендуется | Пустой массив `[]` |

### Уровень 2: Content (содержимое таблицы)

| Поле | Тип | Обязательно | Значение по умолчанию | Описание |
|------|-----|-------------|-----------------------|----------|
| `type` | string | ✅ **ДА** | `"tableContent"` | **Тип контента (обязательно!)** |
| `headerRows` | number | ✅ **ДА** | `0` | **Количество строк-заголовков (обязательно!)** |
| `rows` | array | ✅ **ДА** | `[]` | **Массив строк (НЕ должен быть пустым!)** |
| `columnWidths` | array | ⚠️ Рекомендуется | `[null, null, ...]` | Ширины колонок (null = auto) |

### Уровень 3: Row (строка)

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `cells` | array | ✅ **ДА** | **Массив ячеек (НЕ должен быть пустым!)** |

### Уровень 4: Cell (ячейка)

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `type` | string | ✅ **ДА** | Должно быть `"tableCell"` |
| `props` | object | ✅ **ДА** | Свойства ячейки (см. ниже) |
| `content` | array | ✅ **ДА** | Контент ячейки (может быть пустым `[]`) |

### Уровень 5: Cell Props (свойства ячейки)

| Поле | Тип | Обязательно | Значение по умолчанию |
|------|-----|-------------|-----------------------|
| `colspan` | number | ✅ Да | `1` |
| `rowspan` | number | ✅ Да | `1` |
| `textColor` | string | ✅ Да | `"default"` |
| `textAlignment` | string | ✅ Да | `"left"` |
| `backgroundColor` | string | ✅ Да | `"default"` |

---

## Примеры

### ✅ Правильная таблица 2×2 с заголовком

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "table",
  "props": {
    "textColor": "default",
    "backgroundColor": "default"
  },
  "content": {
    "type": "tableContent",
    "headerRows": 1,
    "rows": [
      {
        "cells": [
          {
            "type": "tableCell",
            "props": {
              "colspan": 1,
              "rowspan": 1,
              "textColor": "default",
              "textAlignment": "left",
              "backgroundColor": "default"
            },
            "content": [
              {
                "type": "text",
                "text": "Название",
                "styles": {}
              }
            ]
          },
          {
            "type": "tableCell",
            "props": {
              "colspan": 1,
              "rowspan": 1,
              "textColor": "default",
              "textAlignment": "left",
              "backgroundColor": "default"
            },
            "content": [
              {
                "type": "text",
                "text": "Значение",
                "styles": {}
              }
            ]
          }
        ]
      },
      {
        "cells": [
          {
            "type": "tableCell",
            "props": {
              "colspan": 1,
              "rowspan": 1,
              "textColor": "default",
              "textAlignment": "left",
              "backgroundColor": "default"
            },
            "content": [
              {
                "type": "text",
                "text": "Дата",
                "styles": {}
              }
            ]
          },
          {
            "type": "tableCell",
            "props": {
              "colspan": 1,
              "rowspan": 1,
              "textColor": "default",
              "textAlignment": "left",
              "backgroundColor": "default"
            },
            "content": [
              {
                "type": "text",
                "text": "26.01.2026",
                "styles": {}
              }
            ]
          }
        ]
      }
    ],
    "columnWidths": [null, null]
  },
  "children": []
}
```

### ❌ Неправильные примеры (вызывают ошибку)

#### Пример 1: Отсутствует `content`
```json
{
  "type": "table",
  "props": {
    "textColor": "default"
  }
  // ❌ content отсутствует!
}
```

#### Пример 2: Пустой массив `rows`
```json
{
  "type": "table",
  "content": {
    "rows": []  // ❌ пустой массив!
  }
}
```

#### Пример 3: Отсутствует `type: "tableContent"`
```json
{
  "type": "table",
  "content": {
    // ❌ type: "tableContent" отсутствует!
    "rows": [...]
  }
}
```

#### Пример 4: Отсутствует `headerRows`
```json
{
  "type": "table",
  "content": {
    "type": "tableContent",
    // ❌ headerRows отсутствует!
    "rows": [...]
  }
}
```

#### Пример 5: Нет `cells` в строке
```json
{
  "type": "table",
  "content": {
    "type": "tableContent",
    "headerRows": 0,
    "rows": [
      {
        // ❌ cells отсутствует!
      }
    ]
  }
}
```

#### Пример 6: Неполные `props` у ячейки
```json
{
  "type": "tableCell",
  "props": {
    "colspan": 1
    // ❌ Отсутствуют: rowspan, textColor, textAlignment, backgroundColor
  },
  "content": []
}
```

---

## Задачи для исправления

### 1. Валидация при сохранении

Добавить функцию валидации **ДО** сохранения в БД:

```typescript
function validateTableBlock(block: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (block.type !== 'table') {
    return { valid: true, errors: [] }; // Это не таблица, пропускаем
  }

  // Проверка content
  if (!block.content || typeof block.content !== 'object') {
    errors.push(`Table block ${block.id}: отсутствует поле 'content'`);
    return { valid: false, errors };
  }

  // Проверка type в content
  if (block.content.type !== 'tableContent') {
    errors.push(`Table block ${block.id}: content.type должно быть 'tableContent'`);
  }

  // Проверка headerRows
  if (typeof block.content.headerRows !== 'number') {
    errors.push(`Table block ${block.id}: отсутствует или некорректно поле 'headerRows'`);
  }

  // Проверка rows
  if (!Array.isArray(block.content.rows)) {
    errors.push(`Table block ${block.id}: 'rows' должно быть массивом`);
    return { valid: false, errors };
  }

  if (block.content.rows.length === 0) {
    errors.push(`Table block ${block.id}: 'rows' не может быть пустым массивом`);
    return { valid: false, errors };
  }

  // Проверка cells в каждой строке
  for (let i = 0; i < block.content.rows.length; i++) {
    const row = block.content.rows[i];
    
    if (!Array.isArray(row.cells)) {
      errors.push(`Table block ${block.id}, row ${i}: 'cells' должно быть массивом`);
      continue;
    }

    if (row.cells.length === 0) {
      errors.push(`Table block ${block.id}, row ${i}: 'cells' не может быть пустым массивом`);
      continue;
    }

    // Проверка каждой ячейки
    for (let j = 0; j < row.cells.length; j++) {
      const cell = row.cells[j];

      if (cell.type !== 'tableCell') {
        errors.push(`Table block ${block.id}, row ${i}, cell ${j}: type должно быть 'tableCell'`);
      }

      if (!cell.props || typeof cell.props !== 'object') {
        errors.push(`Table block ${block.id}, row ${i}, cell ${j}: отсутствует 'props'`);
      } else {
        // Проверка обязательных props
        const requiredProps = ['colspan', 'rowspan', 'textColor', 'textAlignment', 'backgroundColor'];
        for (const prop of requiredProps) {
          if (!(prop in cell.props)) {
            errors.push(`Table block ${block.id}, row ${i}, cell ${j}: отсутствует props.${prop}`);
          }
        }
      }

      if (!Array.isArray(cell.content)) {
        errors.push(`Table block ${block.id}, row ${i}, cell ${j}: 'content' должно быть массивом`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 2. Нормализация при сохранении

Автоматически добавлять недостающие поля:

```typescript
function normalizeTableBlock(block: any): any {
  if (block.type !== 'table') {
    return block;
  }

  // Добавляем content если отсутствует
  if (!block.content) {
    block.content = {
      type: 'tableContent',
      headerRows: 0,
      rows: [],
      columnWidths: []
    };
  }

  // Добавляем type в content
  if (!block.content.type) {
    block.content.type = 'tableContent';
  }

  // Добавляем headerRows если отсутствует
  if (typeof block.content.headerRows !== 'number') {
    block.content.headerRows = 0;
  }

  // Добавляем rows если отсутствует
  if (!Array.isArray(block.content.rows)) {
    block.content.rows = [];
  }

  // Добавляем columnWidths если отсутствует
  if (!Array.isArray(block.content.columnWidths)) {
    block.content.columnWidths = [];
  }

  // Нормализуем каждую строку
  block.content.rows = block.content.rows.map((row: any) => {
    if (!Array.isArray(row.cells)) {
      row.cells = [];
    }

    row.cells = row.cells.map((cell: any) => {
      // Добавляем type
      if (!cell.type) {
        cell.type = 'tableCell';
      }

      // Нормализуем props
      if (!cell.props || typeof cell.props !== 'object') {
        cell.props = {};
      }

      cell.props = {
        colspan: cell.props.colspan ?? 1,
        rowspan: cell.props.rowspan ?? 1,
        textColor: cell.props.textColor ?? 'default',
        textAlignment: cell.props.textAlignment ?? 'left',
        backgroundColor: cell.props.backgroundColor ?? 'default'
      };

      // Добавляем content если отсутствует
      if (!Array.isArray(cell.content)) {
        cell.content = [];
      }

      return cell;
    });

    return row;
  });

  // Добавляем children если отсутствует
  if (!Array.isArray(block.children)) {
    block.children = [];
  }

  return block;
}
```

### 3. Применение валидации и нормализации

В контроллере создания/обновления события:

```typescript
// Пример для Node.js/Express
async function updateEvent(req, res) {
  const { description } = req.body;

  if (Array.isArray(description)) {
    // Нормализуем все таблицы
    const normalizedBlocks = description.map(block => normalizeTableBlock(block));

    // Валидируем все таблицы
    const validationErrors: string[] = [];
    for (const block of normalizedBlocks) {
      const validation = validateTableBlock(block);
      if (!validation.valid) {
        validationErrors.push(...validation.errors);
      }
    }

    // Если есть ошибки валидации, возвращаем 400
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Некорректная структура таблиц',
        errors: validationErrors
      });
    }

    // Сохраняем нормализованные блоки
    await Event.update(eventId, { description: normalizedBlocks });
  }

  // ... остальная логика
}
```

### 4. Миграция существующих данных

SQL запрос для обновления существующих таблиц в БД:

#### PostgreSQL (с JSONB)

```sql
-- Добавление type: "tableContent" в content таблиц
UPDATE events
SET description = (
  SELECT jsonb_agg(
    CASE 
      WHEN block->>'type' = 'table' THEN
        jsonb_set(
          block,
          '{content, type}',
          '"tableContent"',
          true
        )
      ELSE block
    END
  )
  FROM jsonb_array_elements(description) AS block
)
WHERE description @> '[{"type": "table"}]'::jsonb
  AND (description::text NOT LIKE '%"type":"tableContent"%');

-- Добавление headerRows: 0 в content таблиц
UPDATE events
SET description = (
  SELECT jsonb_agg(
    CASE 
      WHEN block->>'type' = 'table' THEN
        jsonb_set(
          block,
          '{content, headerRows}',
          '0',
          true
        )
      ELSE block
    END
  )
  FROM jsonb_array_elements(description) AS block
)
WHERE description @> '[{"type": "table"}]'::jsonb
  AND NOT (description @> '[{"type": "table", "content": {"headerRows": 0}}]'::jsonb);

-- Удаление таблиц без content или rows (если не удалось нормализовать)
UPDATE events
SET description = (
  SELECT jsonb_agg(block)
  FROM jsonb_array_elements(description) AS block
  WHERE NOT (
    block->>'type' = 'table' 
    AND (
      block->'content' IS NULL 
      OR block->'content'->'rows' IS NULL
      OR jsonb_array_length(block->'content'->'rows') = 0
    )
  )
)
WHERE description @> '[{"type": "table"}]'::jsonb;
```

#### MySQL (с JSON)

```sql
-- Для MySQL нужно использовать приложение или скрипт
-- так как JSON функции MySQL ограничены

-- Пример скрипта на Node.js:
const events = await db.query('SELECT id, description FROM events WHERE JSON_CONTAINS(description, \'{"type":"table"}\')');

for (const event of events) {
  const description = JSON.parse(event.description);
  const normalized = description.map(block => normalizeTableBlock(block));
  await db.query('UPDATE events SET description = ? WHERE id = ?', [JSON.stringify(normalized), event.id]);
}
```

#### MongoDB

```javascript
// Миграционный скрипт для MongoDB
db.events.find({ "description.type": "table" }).forEach(function(event) {
  const description = event.description.map(block => {
    if (block.type === 'table') {
      // Добавляем недостающие поля
      if (!block.content) {
        block.content = { type: 'tableContent', headerRows: 0, rows: [] };
      }
      if (!block.content.type) {
        block.content.type = 'tableContent';
      }
      if (typeof block.content.headerRows !== 'number') {
        block.content.headerRows = 0;
      }
      if (!Array.isArray(block.content.rows)) {
        block.content.rows = [];
      }
    }
    return block;
  });

  db.events.updateOne(
    { _id: event._id },
    { $set: { description: description } }
  );
});
```

---

## API изменения

### Эндпоинт для валидации (опционально)

Можно добавить отдельный эндпоинт для проверки структуры:

```
POST /api/v1/events/validate-blocks
```

**Request:**
```json
{
  "blocks": [
    {
      "type": "table",
      "content": {...}
    }
  ]
}
```

**Response (успех):**
```json
{
  "valid": true,
  "normalized": [...]
}
```

**Response (ошибка):**
```json
{
  "valid": false,
  "errors": [
    "Table block xxx: отсутствует поле 'content'",
    "Table block yyy: 'rows' не может быть пустым массивом"
  ]
}
```

---

## Чеклист для разработчика

- [ ] Добавлена функция `validateTableBlock()`
- [ ] Добавлена функция `normalizeTableBlock()`
- [ ] Валидация и нормализация применяются при создании события
- [ ] Валидация и нормализация применяются при обновлении события
- [ ] Запущена миграция существующих данных
- [ ] Проверены все события с таблицами в БД
- [ ] Добавлены unit-тесты для валидации
- [ ] Добавлены unit-тесты для нормализации
- [ ] Обновлена документация API

---

## Тестирование

### Минимальный набор тестов

#### Тест 1: Создание события с таблицей

```http
POST /api/v1/events
Content-Type: application/json

{
  "title": "Test Event",
  "description": [
    {
      "type": "table",
      "content": {
        "type": "tableContent",
        "headerRows": 0,
        "rows": [
          {
            "cells": [
              {
                "type": "tableCell",
                "props": {
                  "colspan": 1,
                  "rowspan": 1,
                  "textColor": "default",
                  "textAlignment": "left",
                  "backgroundColor": "default"
                },
                "content": [
                  {
                    "type": "text",
                    "text": "Test",
                    "styles": {}
                  }
                ]
              }
            ]
          }
        ],
        "columnWidths": [null]
      },
      "children": []
    }
  ]
}
```

**Ожидаемый результат:** 200 OK, событие создано

#### Тест 2: Попытка создать таблицу без content

```http
POST /api/v1/events
Content-Type: application/json

{
  "title": "Test Event",
  "description": [
    {
      "type": "table"
      // content отсутствует
    }
  ]
}
```

**Ожидаемый результат:** 
- Если есть нормализация: 200 OK, content добавлен автоматически
- Если только валидация: 400 Bad Request, ошибка валидации

#### Тест 3: Получение события с таблицей

```http
GET /api/v1/events/{id}
```

**Ожидаемый результат:** 
```json
{
  "id": "...",
  "description": [
    {
      "type": "table",
      "content": {
        "type": "tableContent",
        "headerRows": 0,
        "rows": [...],
        "columnWidths": [...]
      }
    }
  ]
}
```

Все обязательные поля должны присутствовать!

---

## Приоритет задач

1. **Высокий (критично):**
   - Добавить нормализацию при сохранении
   - Запустить миграцию существующих данных

2. **Средний (важно):**
   - Добавить валидацию при сохранении
   - Добавить тесты

3. **Низкий (желательно):**
   - Эндпоинт для валидации
   - Дополнительная документация API

---

## Контакты для вопросов

Если что-то непонятно или нужны уточнения, пишите фронтенд-разработчику или создайте issue в репозитории.

**Важно:** После исправления на бэкенде, фронтенд автоматически обработает правильную структуру, и таблицы будут работать полностью (просмотр, создание, редактирование, форматирование).
