# Отладка проблем с таблицами BlockNote

## Текущая проблема

Ошибка `RangeError: Invalid content for node table: <>` указывает на то, что структура таблиц с бэкенда не соответствует ожиданиям BlockNote.

## Добавленная диагностика

### 1. Логирование в консоль

Добавлено детальное логирование для отладки:

**При загрузке контента:**
```
[BlockNote] Найдено таблиц до нормализации: N
[BlockNote] Исходные данные таблиц: {...}
[BlockNote] Таблиц после нормализации: N
[BlockNote] Нормализованные таблицы: {...}
```

**При нормализации таблицы:**
```
[BlockNote] Нормализуем таблицу: <id> {...}
[BlockNote] Таблица нормализована: <id> {...}
```

**При обнаружении проблем:**
```
[BlockNote] Таблица без content, пропускаем: <id>
[BlockNote] Таблица без rows, пропускаем: <id>
[BlockNote] Таблица с некорректными ячейками, пропускаем: <id>
[BlockNote] После нормализации таблица пустая, пропускаем: <id>
[BlockNote] Ошибка нормализации таблицы: <id> <error>
```

### 2. Защита от некорректных данных

Функция `normalizeTableBlock` теперь:
- ✅ Проверяет наличие `content`
- ✅ Проверяет наличие `rows`
- ✅ Проверяет, что `rows` не пустой массив
- ✅ Проверяет, что каждая строка имеет `cells`
- ✅ Создает дефолтные пустые ячейки если данных нет
- ✅ Возвращает `null` для некорректных таблиц (они удаляются)

## Инструкция по отладке

### Шаг 1: Откройте консоль браузера

1. Откройте DevTools (F12 или Cmd+Option+I)
2. Перейдите на вкладку "Console"
3. Очистите консоль (Clear console)

### Шаг 2: Загрузите страницу с таблицей

1. Откройте страницу `/my-events/:id` или `/my-events/:id/edit`
2. Дождитесь загрузки
3. Посмотрите сообщения в консоли

### Шаг 3: Анализируйте логи

#### Сценарий A: Таблицы фильтруются

```
[BlockNote] Найдено таблиц до нормализации: 1
[BlockNote] Исходные данные таблиц: [...]
[BlockNote] Таблица без content, пропускаем: xxx
[BlockNote] Таблиц после нормализации: 0
```

**Проблема:** Таблицы приходят без `content` поля.

**Решение для бэкенда:**
```json
{
  "type": "table",
  "content": {  // ← Это поле обязательно!
    "rows": [...],
    "columnWidths": [...]
  }
}
```

#### Сценарий B: Таблицы без строк

```
[BlockNote] Найдено таблиц до нормализации: 1
[BlockNote] Таблица без rows, пропускаем: xxx
[BlockNote] Таблиц после нормализации: 0
```

**Проблема:** У таблиц отсутствует поле `rows` или оно пустое.

**Решение для бэкенда:**
```json
{
  "type": "table",
  "content": {
    "rows": [  // ← Это поле обязательно и должно быть непустым!
      {
        "cells": [...]
      }
    ]
  }
}
```

#### Сценарий C: Таблицы с некорректными ячейками

```
[BlockNote] Найдено таблиц до нормализации: 1
[BlockNote] Таблица с некорректными ячейками, пропускаем: xxx
```

**Проблема:** В строках отсутствуют `cells` или они пустые.

**Решение для бэкенда:**
```json
{
  "type": "table",
  "content": {
    "rows": [
      {
        "cells": [  // ← Каждая строка должна иметь cells!
          {
            "type": "tableCell",
            "props": {...},
            "content": [...]
          }
        ]
      }
    ]
  }
}
```

#### Сценарий D: Успешная нормализация, но ошибка остается

```
[BlockNote] Найдено таблиц до нормализации: 1
[BlockNote] Нормализуем таблицу: xxx {...}
[BlockNote] Таблица нормализована: xxx {...}
[BlockNote] Таблиц после нормализации: 1
RangeError: Invalid content for node table: <>
```

**Проблема:** Нормализация прошла, но BlockNote все равно не может разобрать структуру.

**Возможные причины:**
1. Некорректный `content` внутри ячеек
2. Отсутствует `type: "tableCell"` у ячеек
3. Неправильная структура вложенности

**Решение:** Скопируйте нормализованные данные из консоли и добавьте их в issue.

### Шаг 4: Соберите данные для отчета

Если проблема не решена, соберите следующую информацию:

1. **Исходные данные:**
   ```
   Скопируйте вывод "[BlockNote] Исходные данные таблиц:"
   ```

2. **Нормализованные данные:**
   ```
   Скопируйте вывод "[BlockNote] Нормализованные таблицы:"
   ```

3. **Ошибка:**
   ```
   Скопируйте полный текст ошибки из консоли
   ```

## Правильная структура таблицы для BlockNote

### Минимальная структура

```json
{
  "id": "table-block-id",
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

### Обязательные поля

| Уровень | Поле | Тип | Описание |
|---------|------|-----|----------|
| **Block** | `id` | string | Уникальный ID блока |
| | `type` | "table" | Тип блока |
| | `content` | object | **Обязательно!** Контент таблицы |
| **Content** | `type` | "tableContent" | Тип контента |
| | `headerRows` | number | Количество заголовочных строк (0+) |
| | `rows` | array | **Обязательно!** Массив строк (непустой) |
| | `columnWidths` | array | Ширины колонок (null = auto) |
| **Row** | `cells` | array | **Обязательно!** Массив ячеек (непустой) |
| **Cell** | `type` | "tableCell" | Тип ячейки |
| | `props` | object | Свойства ячейки |
| | `content` | array | Контент ячейки (может быть пустым) |
| **Cell Props** | `colspan` | number | Объединение колонок (default: 1) |
| | `rowspan` | number | Объединение строк (default: 1) |
| | `textColor` | string | Цвет текста (default: "default") |
| | `textAlignment` | string | Выравнивание (default: "left") |
| | `backgroundColor` | string | Цвет фона (default: "default") |

### Пример таблицы 2×2

```json
{
  "id": "123",
  "type": "table",
  "props": {
    "textColor": "default"
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
                "text": "Заголовок 1",
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
                "text": "Заголовок 2",
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
                "text": "Данные 1",
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
                "text": "Данные 2",
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

## Рекомендации для бэкенда

### 1. Валидация при сохранении

Добавьте валидацию на бэкенде:

```typescript
function validateTableBlock(block: any): boolean {
  if (block.type !== 'table') return true
  
  // Проверка content
  if (!block.content || typeof block.content !== 'object') {
    console.error('Table missing content:', block.id)
    return false
  }
  
  // Проверка rows
  if (!Array.isArray(block.content.rows) || block.content.rows.length === 0) {
    console.error('Table missing rows:', block.id)
    return false
  }
  
  // Проверка cells в каждой строке
  for (const row of block.content.rows) {
    if (!Array.isArray(row.cells) || row.cells.length === 0) {
      console.error('Table row missing cells:', block.id)
      return false
    }
  }
  
  return true
}
```

### 2. Нормализация на бэкенде

Рекомендуется нормализовать данные при сохранении:

```typescript
function normalizeTableOnBackend(block: any): any {
  if (block.type !== 'table') return block
  
  return {
    ...block,
    content: {
      type: 'tableContent',
      headerRows: block.content.headerRows ?? 0,
      rows: block.content.rows.map((row: any) => ({
        cells: row.cells.map((cell: any) => ({
          type: 'tableCell',
          props: {
            colspan: cell.props?.colspan ?? 1,
            rowspan: cell.props?.rowspan ?? 1,
            textColor: cell.props?.textColor ?? 'default',
            textAlignment: cell.props?.textAlignment ?? 'left',
            backgroundColor: cell.props?.backgroundColor ?? 'default',
          },
          content: cell.content ?? [],
        })),
      })),
      columnWidths: block.content.columnWidths ?? [],
    },
  }
}
```

### 3. Миграция существующих данных

Если в БД уже есть таблицы в старом формате, запустите миграцию:

```sql
-- Пример для PostgreSQL с JSONB
UPDATE events
SET description = (
  SELECT jsonb_agg(
    CASE 
      WHEN block->>'type' = 'table' THEN
        jsonb_set(
          jsonb_set(
            block,
            '{content, type}',
            '"tableContent"'
          ),
          '{content, headerRows}',
          '0'
        )
      ELSE block
    END
  )
  FROM jsonb_array_elements(description) AS block
)
WHERE description @> '[{"type": "table"}]'::jsonb;
```

## API эндпоинт для проверки

Создайте эндпоинт для проверки структуры:

```typescript
POST /api/v1/blocks/validate

Request:
{
  "blocks": [...]
}

Response:
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

## Временное решение (fallback)

Если исправление на бэкенде займет время, можно временно отключить таблицы:

### Вариант 1: Фильтрация таблиц

```typescript
// В parseInitialContent
const filtered = blocks?.filter(b => b.type !== 'table')
```

### Вариант 2: Замена на параграф

```typescript
function convertTableToParagraph(block: PartialBlock): PartialBlock {
  if (block.type === 'table') {
    return {
      type: 'paragraph',
      content: '⚠️ Таблица временно недоступна',
    }
  }
  return block
}
```

## Связанные документы

- `docs/RICH_TEXT_TABLES_SUPPORT.md` — Полная документация по таблицам
- `docs/RICH_TEXT_DISPLAY_FIX.md` — Общие проблемы с отображением
- [BlockNote Tables API](https://www.blocknotejs.org/docs/features/blocks/tables)
