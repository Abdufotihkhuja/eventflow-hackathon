# Полная поддержка таблиц в BlockNote редакторе

## Обзор

Реализована **нативная поддержка таблиц** в BlockNote редакторе с полным функционалом редактирования.

## Проблема и решение

### ❌ Предыдущая проблема

Таблицы из API вызывали ошибку:
```
RangeError: Invalid content for node table: <>
```

**Причина:** Структура таблиц из API была несовместима с BlockNote — отсутствовало обязательное поле `headerRows`.

### ✅ Решение

1. **Нормализация данных** — автоматическое добавление недостающих полей
2. **Включение расширенных возможностей** — активация `tables` опции
3. **Корректная типизация ячеек** — добавление дефолтных `props` для каждой ячейки

## Реализация

### 1. Нормализация структуры таблиц

```typescript
function normalizeTableBlock(block: PartialBlock): PartialBlock {
  if (block.type !== 'table' || !block.content || typeof block.content !== 'object') {
    return block
  }

  const content = block.content as Record<string, unknown>
  
  // Если уже нормализовано, пропускаем
  if (content.type === 'tableContent' && typeof content.headerRows === 'number') {
    return block
  }

  // Нормализуем content
  const normalizedContent: Record<string, unknown> = {
    type: 'tableContent',
    headerRows: content.headerRows ?? 0, // Обязательное поле!
    rows: content.rows ?? [],
    columnWidths: content.columnWidths ?? [],
  }

  // Нормализуем каждую ячейку
  if (Array.isArray(normalizedContent.rows)) {
    normalizedContent.rows = normalizedContent.rows.map(row => ({
      cells: row.cells.map(cell => ({
        type: 'tableCell',
        ...cell,
        props: {
          colspan: 1,
          rowspan: 1,
          textColor: 'default',
          textAlignment: 'left',
          backgroundColor: 'default',
          ...(cell.props || {}),
        },
      })),
    }))
  }

  return {
    ...block,
    content: normalizedContent,
  }
}
```

### 2. Конфигурация редактора

```typescript
const editor = useCreateBlockNote({
  initialContent,
  uploadFile: editable ? uploadImageForEditor : undefined,
  tables: {
    splitCells: true,           // Объединение/разделение ячеек
    cellBackgroundColor: true,  // Цвет фона ячейки
    cellTextColor: true,        // Цвет текста ячейки
    headers: true,              // Заголовочные строки/колонки
  },
})
```

### 3. Применение нормализации

```typescript
function parseInitialContent(value: BlockNoteContent | string | undefined): PartialBlock[] | undefined {
  // ... парсинг ...
  
  // Нормализуем таблицы
  const normalized = blocks ? normalizeTables(blocks) : undefined
  
  // Применяем санитизацию
  const sanitized = normalized ? sanitizeBlocks(normalized) : undefined
  
  return sanitized && sanitized.length > 0 ? sanitized : undefined
}
```

## Функциональность

### ✅ Поддерживаемые операции

| Операция | Описание | Статус |
|----------|----------|--------|
| **Просмотр** | Отображение таблиц в read-only режиме | ✅ Работает |
| **Создание** | Создание новых таблиц через `/table` | ✅ Работает |
| **Редактирование** | Изменение содержимого ячеек | ✅ Работает |
| **Добавление строк** | Добавление строк через контекстное меню | ✅ Работает |
| **Добавление колонок** | Добавление колонок через контекстное меню | ✅ Работает |
| **Удаление строк** | Удаление строк | ✅ Работает |
| **Удаление колонок** | Удаление колонок | ✅ Работает |
| **Объединение ячеек** | Merge cells (если `splitCells: true`) | ✅ Работает |
| **Разделение ячеек** | Split cells (если `splitCells: true`) | ✅ Работает |
| **Цвет фона** | Изменение цвета фона ячейки | ✅ Работает |
| **Цвет текста** | Изменение цвета текста ячейки | ✅ Работает |
| **Заголовки** | Настройка заголовочных строк/колонок | ✅ Работает |

### 🎨 UI возможности

**Создание таблицы:**
1. Напишите `/table` в редакторе
2. Или нажмите "+" → "Table"
3. Выберите размер таблицы (строки × колонки)

**Редактирование:**
- Кликните на ячейку для редактирования
- Правый клик → контекстное меню с операциями
- Drag handle слева для перемещения строк

**Форматирование:**
- Выделите ячейки → правый клик → "Background color" / "Text color"
- Drag границы колонок для изменения ширины

## Структура данных

### Формат из API

```json
{
  "id": "block-id",
  "type": "table",
  "props": {
    "textColor": "default"
  },
  "content": {
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
                "text": "Текст ячейки",
                "type": "text",
                "styles": {}
              }
            ]
          }
        ]
      }
    ],
    "type": "tableContent",
    "columnWidths": [null, null, null]
  },
  "children": []
}
```

### После нормализации

```json
{
  "id": "block-id",
  "type": "table",
  "props": {
    "textColor": "default"
  },
  "content": {
    "type": "tableContent",
    "headerRows": 0,  // ← Добавлено!
    "rows": [...],
    "columnWidths": [null, null, null]
  },
  "children": []
}
```

## Обработка краевых случаев

### 1. Отсутствующее поле `headerRows`

```typescript
headerRows: content.headerRows ?? 0
```

Если поле отсутствует, устанавливается `0` (нет заголовочных строк).

### 2. Неполные `props` ячейки

```typescript
props: {
  colspan: 1,
  rowspan: 1,
  textColor: 'default',
  textAlignment: 'left',
  backgroundColor: 'default',
  ...(cell.props || {}),
}
```

Дефолтные значения устанавливаются, затем перезаписываются существующими.

### 3. Отсутствующий тип ячейки

```typescript
{
  type: 'tableCell',
  ...cell,
  props: {...}
}
```

Явно устанавливается `type: 'tableCell'`.

### 4. Пустые таблицы

Пустые таблицы корректно обрабатываются:
```typescript
rows: content.rows ?? [],
columnWidths: content.columnWidths ?? [],
```

## Измененные файлы

### `src/shared/ui/rich-text-editor/rich-text-editor.tsx`

**Добавлено:**
- Функция `normalizeTableBlock()` — нормализация отдельной таблицы
- Функция `normalizeTables()` — рекурсивная нормализация
- Опция `tables` в `useCreateBlockNote` с расширенными возможностями
- Обновлен `ALLOWED_BLOCK_TYPES` (добавлены `toggleListItem`, `toggleHeading`)

**Удалено:**
- Функция `extractTables()` — больше не нужна
- Функция `filterTables()` — больше не нужна
- Компонент `TableRenderer` — таблицы рендерятся нативно
- Типы `TableCell`, `TableRow`, `TableContent`, `TableBlock` для HTML рендеринга

**Изменено:**
- `parseInitialContent()` — использует `normalizeTables()` вместо `filterTables()`
- `RichTextContent` — упрощен, просто вызывает `RichTextEditor` с `editable={false}`

## Тестирование

### Ручное тестирование

#### 1. Просмотр существующих таблиц
✅ Тест:
```
1. Откройте /my-events/:id (событие с таблицей)
2. Таблица должна отображаться корректно
3. Нет ошибок в консоли
```

#### 2. Создание новой таблицы
✅ Тест:
```
1. Откройте /my-events/:id/edit
2. Напишите /table → Enter
3. Выберите размер (например, 3×3)
4. Таблица должна появиться
5. Введите текст в ячейки
6. Сохраните событие
7. Перезагрузите страницу
8. Таблица должна сохраниться
```

#### 3. Редактирование таблицы
✅ Тест:
```
1. Откройте событие с таблицей в режиме редактирования
2. Измените текст в ячейке
3. Добавьте строку (правый клик → Insert row below)
4. Добавьте колонку (правый клик → Insert column right)
5. Объедините ячейки (выделите 2+ ячейки → правый клик → Merge cells)
6. Измените цвет фона (правый клик → Background color)
7. Сохраните событие
8. Все изменения должны сохраниться
```

#### 4. Удаление элементов таблицы
✅ Тест:
```
1. Правый клик на строке → Delete row
2. Правый клик на колонке → Delete column
3. Операции должны выполняться без ошибок
```

### Автоматическое тестирование

```typescript
describe('normalizeTableBlock', () => {
  it('should add missing headerRows field', () => {
    const input = {
      type: 'table',
      content: {
        rows: [],
        columnWidths: [],
      },
    }
    
    const output = normalizeTableBlock(input)
    
    expect(output.content.type).toBe('tableContent')
    expect(output.content.headerRows).toBe(0)
  })

  it('should normalize cell props', () => {
    const input = {
      type: 'table',
      content: {
        rows: [
          {
            cells: [
              {
                type: 'tableCell',
                props: {},
                content: [],
              },
            ],
          },
        ],
      },
    }
    
    const output = normalizeTableBlock(input)
    const cell = output.content.rows[0].cells[0]
    
    expect(cell.props.colspan).toBe(1)
    expect(cell.props.rowspan).toBe(1)
    expect(cell.props.textColor).toBe('default')
    expect(cell.props.textAlignment).toBe('left')
    expect(cell.props.backgroundColor).toBe('default')
  })
})
```

## Дополнительные возможности BlockNote

### Поддерживаемые типы блоков

Обновлен `ALLOWED_BLOCK_TYPES`:

```typescript
const ALLOWED_BLOCK_TYPES = new Set([
  'paragraph',        // Параграф
  'heading',          // Заголовок (h1-h6)
  'bulletListItem',   // Маркированный список
  'numberedListItem', // Нумерованный список
  'checkListItem',    // Чекбокс список
  'toggleListItem',   // Раскрывающийся список (NEW!)
  'toggleHeading',    // Раскрывающийся заголовок (NEW!)
  'codeBlock',        // Блок кода
  'table',            // Таблица
  'quote',            // Цитата
  'image',            // Изображение
  'video',            // Видео
  'file',             // Файл
  'audio',            // Аудио (для совместимости)
])
```

### Новые блоки

#### Toggle List Item
Раскрывающийся список (collapsible):
```
Используйте /toggle → Enter
Или "+" → "Toggle List"
```

#### Toggle Heading
Раскрывающийся заголовок:
```
Используйте /toggleheading → Enter
Или "+" → "Toggle Heading"
```

## Потенциальные нюансы

### ⚠️ 1. Производительность с большими таблицами

Таблицы с > 100 ячеек могут замедлять редактор.

**Решение:**
- Рекомендовать пользователям ограничивать размер таблиц
- Рассмотреть lazy loading для больших таблиц

### ⚠️ 2. Ширина колонок

`columnWidths` из API может содержать `null` значения, что сбрасывает ширину на auto.

**Текущее поведение:**
```typescript
columnWidths: [null, null, null] // все колонки auto width
```

**Если нужна фиксированная ширина:**
```typescript
columnWidths: [200, 150, 300] // в пикселях
```

### ⚠️ 3. Копирование из Excel/Google Sheets

BlockNote **не поддерживает** прямую вставку таблиц из Excel.

**Workaround:**
- Пользователи должны создавать таблицы вручную
- Или импортировать через CSV → JSON конвертер

### ⚠️ 4. Экспорт в PDF

При экспорте в PDF таблицы могут отображаться некорректно, если CSS стили не включены.

**Решение:**
- Убедиться, что BlockNote CSS (`@blocknote/mantine/style.css`) загружен при экспорте

### ⚠️ 5. Старые данные

События, созданные до этого обновления, могут иметь таблицы в старом формате.

**Решение:**
- Нормализация автоматически исправляет структуру при загрузке
- Рекомендуется переcохранить старые события для обновления JSON

## Миграция старых данных

### Автоматическая миграция (клиент)

Текущая реализация **автоматически нормализует** таблицы при загрузке:

```typescript
// При загрузке контента
const normalized = normalizeTables(blocks)
```

### Ручная миграция (сервер)

Если нужно обновить все события в БД:

```sql
-- Пример SQL для PostgreSQL
UPDATE events
SET description = jsonb_set(
  description,
  '{content}',
  jsonb_set(
    description->'content',
    '{headerRows}',
    '0'
  )
)
WHERE description->'type' = '"table"'
  AND description->'content'->'headerRows' IS NULL;
```

## Альтернативные решения

### Вариант 1: Custom Schema

Создать кастомный тип блока для таблиц:

```typescript
const customTableSchema = {
  table: createReactBlockSpec({
    type: 'table',
    propSchema: {...},
    content: 'none',
  }, TableComponent)
}
```

**Преимущества:**
- Полный контроль над рендерингом
- Можно добавить кастомные фичи

**Недостатки:**
- Больше кода для поддержки
- Нужно реализовывать все операции вручную

### Вариант 2: Обновление BlockNote

Обновить до последней версии BlockNote:

```bash
npm install @blocknote/core@latest @blocknote/mantine@latest @blocknote/react@latest
```

**Преимущества:**
- Новые фичи
- Исправления багов

**Недостатки:**
- Breaking changes
- Нужно тестировать всю функциональность

## Связанные документы

- `docs/RICH_TEXT_DISPLAY_FIX.md` — Первоначальные проблемы с отображением
- `docs/RICH_TEXT_TABLES_FINAL.md` — Предыдущее решение (фильтрация)
- `docs/RICH_TEXT_IMAGE_UPLOAD.md` — Загрузка изображений
- [BlockNote Tables Documentation](https://www.blocknotejs.org/docs/features/blocks/tables)

## Changelog

### v2.0 (Текущая версия)
- ✅ Нативная поддержка таблиц в редакторе
- ✅ Автоматическая нормализация структуры
- ✅ Расширенные возможности (merge, colors, headers)
- ✅ Упрощенный код (удален TableRenderer)

### v1.0 (Предыдущая)
- ❌ Таблицы фильтровались и рендерились как HTML
- ❌ Редактирование недоступно
- ⚠️ Workaround решение

## Заключение

Теперь таблицы **полностью поддерживаются** в BlockNote редакторе:

✅ **Просмотр** — работает  
✅ **Создание** — работает  
✅ **Редактирование** — работает  
✅ **Форматирование** — работает  
✅ **Сохранение** — работает  

Нюансы:
⚠️ Большие таблицы могут замедлять редактор  
⚠️ Нет импорта из Excel/Google Sheets  
⚠️ Старые данные автоматически нормализуются при загрузке  

Решение стабильное и готово к продакшену! 🎉
