# Исправление валидации и нормализации таблиц BlockNote

## Проблема

При получении событий с таблицами от бэкенда возникала ошибка:

```
RangeError: Invalid content for node table: <>
```

**Причины:**

1. **Zod валидация** не поддерживала объект `tableContent` в поле `content` блоков (только строки и массивы)
2. **Бэкенд возвращал таблицы** с неправильным порядком полей или отсутствующими обязательными полями

## Решение

### 1. Обновлена Zod схема валидации

**Файл:** `src/features/events/lib/schemas/create-event-schema.ts`

Добавлена поддержка объекта `tableContent` с полной структурой согласно требованиям BlockNote:

```typescript
// Схема для TableContent
const tableContentSchema = z.object({
  type: z.literal('tableContent'),
  headerRows: z.number(),
  rows: z.array(
    z.object({
      cells: z.array(
        z.object({
          type: z.literal('tableCell'),
          props: z.object({
            colspan: z.number(),
            rowspan: z.number(),
            textColor: z.string(),
            textAlignment: z.string(),
            backgroundColor: z.string(),
          }),
          content: z.array(z.any()),
        })
      ),
    })
  ),
  columnWidths: z.array(z.number().nullable()).optional(),
})

// Обновлена схема для content блока
const blockNoteContentSchema = z.array(
  z.object({
    id: z.string().optional(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()).optional(),
    content: z
      .union([
        z.string(), // Строковый контент
        z.array(z.any()), // Массив инлайн элементов
        tableContentSchema, // Объект tableContent для таблиц
        z.record(z.string(), z.unknown()), // Любой другой объект
      ])
      .optional(),
    children: z.array(z.any()).optional(),
  })
)
```

### 2. Создана утилита нормализации таблиц

**Файл:** `src/shared/lib/normalize-blocknote-tables.ts`

Автоматически исправляет структуру таблиц согласно документации BlockNote:

- ✅ Добавляет `type: "tableContent"` если отсутствует
- ✅ Добавляет `headerRows: 0` если отсутствует
- ✅ **Конвертирует `null` в `columnWidths` в числовые значения (120px по умолчанию)**
- ✅ Гарантирует правильный порядок полей: `type` → `columnWidths` → `headerRows` → `rows`
- ✅ Нормализует `props` ячеек с дефолтными значениями
- ✅ Создаёт `columnWidths` если отсутствует

**Экспортируемые функции:**

```typescript
// Нормализует массив BlockNote блоков
export function normalizeBlockNoteTables(blocks: BlockNoteBlock[]): BlockNoteBlock[]

// Проверяет наличие таблиц в блоках
export function hasTableBlock(blocks: BlockNoteBlock[]): boolean
```

**Ключевые исправления:**

1. **columnWidths**: Бэкенд возвращает `[null, null, null]`, но BlockNote требует `number[]`. Утилита заменяет `null` на `120` (дефолтная ширина).
2. **Порядок полей**: BlockNote чувствителен к порядку полей в объекте. Структура строго следует спецификации.

### 3. Применена нормализация в Query хуках

Нормализация применяется через `select` callback при получении данных от API:

#### Хук получения одного события

**Файл:** `src/features/events/api/use-event-query.ts`

```typescript
select: data => {
  if (data && Array.isArray(data.description)) {
    return {
      ...data,
      description: normalizeBlockNoteTables(data.description),
    }
  }
  return data
}
```

#### Хук списка событий

**Файл:** `src/features/events/api/use-events-query.ts`

```typescript
select: data => {
  if (!data) return data

  return {
    ...data,
    data: data.data.map(event => ({
      ...event,
      description: Array.isArray(event.description)
        ? normalizeBlockNoteTables(event.description)
        : event.description,
    })),
  }
}
```

#### Хуки админских событий

**Файл:** `src/features/super-admin/api/use-admin-events.ts`

Применена нормализация в:
- `useAdminEventQuery` - одно событие
- `useAdminEvents` - список всех событий
- `usePendingEvents` - события на модерации

## Результат

✅ **Валидация:** Zod корректно обрабатывает таблицы с полной структурой  
✅ **Нормализация:** Автоматически исправляет некорректные данные от бэкенда  
✅ **Совместимость:** Работает с любыми типами BlockNote блоков  
✅ **Производительность:** Нормализация выполняется только для событий с таблицами

## Обязательные поля таблицы

Согласно официальной документации BlockNote (https://www.blocknotejs.org/docs/features/blocks/tables), таблица должна иметь:

### Block (таблица)
- `id` - уникальный ID
- `type: "table"`
- `props` - объект со свойствами блока
- **`content`** - объект TableContent (обязательно!)
- `children` - массив (обычно пустой)

### TableContent (КРИТИЧНО: порядок полей важен!)
```typescript
type TableContent = {
  type: "tableContent";      // 1. Тип (обязательно!)
  columnWidths: number[];    // 2. Ширины колонок (массив ЧИСЕЛ, null недопустим!)
  headerRows: number;        // 3. Количество строк-заголовков (обязательно!)
  rows: {cells: TableCell[];}[];  // 4. Массив строк (не пустой, обязательно!)
};
```

**ВАЖНО:** BlockNote требует `columnWidths` как массив **чисел** (`number[]`), значения `null` не допускаются. Используйте числовые значения ширины или дефолтное значение (например, 120).

### Cell (ячейка)
- `type: "tableCell"`
- `props` - объект с полями (опциональные):
  - `colspan?: number`
  - `rowspan?: number`
  - `textColor?: string`
  - `textAlignment?: string`
  - `backgroundColor?: string`
- `content` - массив инлайн-контента (может быть пустым)

## Рекомендации для бэкенда

Для полной совместимости рекомендуется реализовать на бэкенде:

1. Валидацию структуры таблиц перед сохранением
2. Нормализацию таблиц при сохранении
3. Миграцию существующих данных

Подробные требования см. в `docs/BACKEND_TABLE_FIX_REQUIREMENTS.md`

## Тестирование

После применения изменений:

1. Открыть событие с таблицей
2. Проверить отображение в RichTextEditor (read-only режим)
3. Проверить редактирование таблицы
4. Проверить сохранение изменений
5. Убедиться в отсутствии ошибок в консоли

## Как протестировать

1. **Жёсткая перезагрузка страницы**: Cmd+Shift+R (Mac) или Ctrl+Shift+R (Windows)
2. **Очистить кэш React Query**: Откройте DevTools → Application → Clear Storage → Clear site data
3. Или откройте страницу в режиме инкогнито

После перезагрузки проверьте консоль браузера - вы должны увидеть логи нормализации:

```
[normalizeBlockNoteTables] Добавлен type: tableContent для таблицы ...
[normalizeBlockNoteTables] Добавлен headerRows: 0 для таблицы ...
[normalizeBlockNoteTables] Заменены null в columnWidths на числа для таблицы ...
```

Таблицы должны корректно отображаться без ошибок `RangeError: Invalid content for node table`.

## Дата исправления

26 января 2026
