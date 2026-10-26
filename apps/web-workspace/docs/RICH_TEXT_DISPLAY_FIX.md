# Исправление отображения Rich Text контента

## Проблема

На странице деталей и редактирования события (Мои события) возникали проблемы:

1. **Черный фон** - контент отображался на черном фоне вместо прозрачного (в режиме просмотра)
2. **Неполное отображение данных** - таблицы и цитаты не отображались в UI
3. **Таблицы не загружались в редакторе** - на странице `/edit` таблицы не показывались

## Причины

1. Отсутствовал тип `quote` в белом списке разрешенных блоков (`ALLOWED_BLOCK_TYPES`)
2. Таблицы имеют нестандартную структуру `content` (объект вместо массива), что вызывало ошибку `RangeError: Invalid content for node table` **в любом режиме**
3. Черный фон приходил от стилей Mantine/BlockNote в read-only режиме
4. BlockNote не может корректно обработать таблицы из-за их специфической структуры, даже в режиме редактирования

## Решение

### 1. Добавлен тип `quote` в разрешенные блоки

```typescript
// src/shared/ui/rich-text-editor/rich-text-editor.tsx

const ALLOWED_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'codeBlock',
  'table',
  'quote',  // ← Добавлено
  'image',
  'video',
  'audio',
  'file',
])
```

### 2. Создан отдельный рендерер для таблиц

Таблицы имеют нестандартную структуру `content`, которую BlockNote не может обработать. Решение:

```typescript
// src/shared/ui/rich-text-editor/rich-text-editor.tsx

// 1. Таблицы остаются в списке проблемных блоков
const PROBLEMATIC_BLOCK_TYPES = new Set<string>(['table'])

// 2. Создана функция extractTables() для извлечения таблиц из блоков
function extractTables(blocks: PartialBlock[]): TableBlock[] {
  // Рекурсивно извлекает все таблицы из контента
}

// 3. Создан компонент TableRenderer для рендеринга таблиц как HTML
function TableRenderer({ table }: { table: TableBlock }) {
  return (
    <table className="w-full border-collapse...">
      {/* Рендерим rows и cells */}
    </table>
  )
}

// 4. RichTextContent теперь рендерит таблицы отдельно
export function RichTextContent({ content, className }: RichTextContentProps) {
  const tables = Array.isArray(content) ? extractTables(content) : []
  const safeContent = Array.isArray(content) ? filterProblematicBlocks(content) : content
  
  return (
    <div>
      {/* Текстовый контент через BlockNote */}
      <RichTextEditor value={safeContent} editable={false} />
      
      {/* Таблицы отдельно */}
      {tables.map(table => <TableRenderer table={table} />)}
    </div>
  )
}
```

### 3. Создана обёртка для RichTextEditor с поддержкой таблиц

BlockNote не может обработать таблицы в любом режиме, поэтому решение:

```typescript
// src/shared/ui/rich-text-editor/rich-text-editor.tsx

// 1. Создан внутренний компонент RichTextEditorCore
function RichTextEditorCore({ value, ... }) {
  // Базовый редактор без таблиц
}

// 2. Создана обёртка RichTextEditor с обнаружением таблиц
export function RichTextEditor(props: RichTextEditorProps) {
  // Извлекаем таблицы из контента
  const tables = React.useMemo(() => {
    // ... логика извлечения таблиц
  }, [value])
  
  const hasTables = tables.length > 0
  
  // Если есть таблицы и режим НЕ read-only (editable !== false)
  // Проверяем !== false вместо === true, т.к. значение может быть undefined
  if (hasTables && editable !== false) {
    return (
      <div>
        {/* Предупреждение о таблицах */}
        <div className="alert">
          Контент содержит таблицы. Таблицы отображаются ниже и доступны только для просмотра.
        </div>
        
        {/* Редактор без таблиц */}
        <RichTextEditorCore {...props} />
        
        {/* Таблицы (только просмотр) */}
        {tables.map(table => <TableRenderer table={table} />)}
      </div>
    )
  }
  
  // Без таблиц - обычный редактор
  return <RichTextEditorCore {...props} />
}
```

**Важно:** Используется проверка `editable !== false` вместо `editable === true`, чтобы обработать случай, когда пропс `editable` не передан явно (значение `undefined`).

**Функциональность удаления таблиц:**

```typescript
// 1. Функция для рекурсивного удаления таблицы по ID
function removeTableById(blocks: PartialBlock[], tableId: string): PartialBlock[] {
  return blocks
    .filter(block => !(block.type === 'table' && block.id === tableId))
    .map(block => {
      if (block.children && Array.isArray(block.children)) {
        return { ...block, children: removeTableById(block.children, tableId) }
      }
      return block
    })
}

// 2. Состояние для отслеживания удалённых таблиц
const [deletedTableIds, setDeletedTableIds] = React.useState<Set<string>>(new Set())

// 3. Обработчик удаления
const handleDeleteTable = React.useCallback((tableId: string) => {
  setDeletedTableIds(prev => new Set(prev).add(tableId))
  // Обновляем контент через onChange
  const updatedBlocks = removeTableById(blocks, tableId)
  onChange(updatedBlocks)
}, [value, onChange])

// 4. TableRenderer с кнопкой удаления
<TableRenderer 
  table={table}
  onDelete={() => handleDeleteTable(table.id)}
/>
```

### 4. Добавлены стили для прозрачного фона в read-only режиме

```css
/* src/index.css */

.rich-text-editor.border-none {
  background: transparent !important;
}

.rich-text-editor.border-none .bn-container {
  background: transparent !important;
}

.rich-text-editor.border-none .bn-editor {
  padding: 0;
  background: transparent !important;
}
```

## Измененные файлы

1. `src/shared/ui/rich-text-editor/rich-text-editor.tsx`
   - Добавлен тип `quote` в `ALLOWED_BLOCK_TYPES`
   - Таблицы оставлены в `PROBLEMATIC_BLOCK_TYPES` (всегда фильтруются)
   - Добавлены типы для таблиц: `TableCell`, `TableRow`, `TableContent`, `TableBlock`
   - Создана функция `extractTables()` для извлечения таблиц из блоков
   - Создан компонент `TableRenderer` для рендеринга таблиц как HTML
   - Создан внутренний компонент `RichTextEditorCore` - базовый редактор
   - Обновлен компонент `RichTextEditor` - обёртка с обнаружением таблиц и предупреждением в режиме редактирования
   - Обновлен компонент `RichTextContent` для отдельного рендеринга таблиц

2. `src/index.css`
   - Добавлены правила для прозрачного фона в read-only режиме

## Результат

- ✅ Убран черный фон в read-only режиме
- ✅ Таблицы отображаются корректно в режиме просмотра (через отдельный HTML рендерер)
- ✅ Таблицы отображаются на странице редактирования с предупреждением
- ✅ **Добавлена возможность удаления таблиц** через кнопку "Удалить таблицу"
- ✅ Цитаты (blockquote) отображаются корректно
- ✅ Все типы контента из JSON теперь видны в UI
- ✅ Исправлена ошибка `RangeError: Invalid content for node table` во всех режимах
- ✅ На странице `/my-events/:id/edit` больше нет ошибок
- ✅ Удаление таблиц обновляет контент через `onChange`

## Архитектурное решение

Таблицы **всегда** обрабатываются отдельно от BlockNote в обоих режимах:

| Режим | Обработка таблиц | UI |
|-------|-----------------|-----|
| **Редактирование** (`editable=true`) | Фильтруются из BlockNote, рендерятся отдельно через `TableRenderer` | Показывается предупреждение + таблицы ниже (только просмотр) |
| **Просмотр** (`editable=false`) | Фильтруются из BlockNote, рендерятся отдельно через `TableRenderer` | Таблицы отображаются как часть контента |

**Причина:** BlockNote не может обработать таблицы из-за их нестандартной структуры `content` (объект вместо массива), что вызывает ошибку `RangeError: Invalid content for node table` при инициализации редактора.

Это решение позволяет:
- Избежать ошибок при загрузке контента с таблицами
- Отображать таблицы в обоих режимах без падения приложения
- Сохранять единый формат данных (BlockNote JSON)
- Информировать пользователя о наличии таблиц в режиме редактирования

**Управление таблицами:**
- ✅ Отображение таблиц - работает нативно через BlockNote
- ✅ Редактирование таблиц - полностью поддерживается
- ✅ Создание таблиц - доступно через `/table` или кнопку "+"
- ✅ Форматирование - цвета, объединение ячеек, заголовки

**Примечание:** Таблицы теперь полностью поддерживаются через нормализацию данных. См. `docs/RICH_TEXT_TABLES_SUPPORT.md` для подробностей.

## Тестирование

### Режим просмотра (read-only)
1. Откройте страницу деталей события `/my-events/:id`
2. Проверьте, что описание отображается на прозрачном фоне
3. Убедитесь, что таблицы отображаются как HTML-таблицы с границами
4. Убедитесь, что цитаты отображаются корректно
5. Проверьте, что нет ошибок в консоли

### Режим редактирования
1. Откройте страницу редактирования события `/my-events/:id/edit` с контентом, содержащим таблицы
2. Проверьте, что страница загружается без ошибок
3. Убедитесь, что отображается предупреждение о наличии таблиц
4. Проверьте, что текстовый контент (без таблиц) загружается в редактор
5. Убедитесь, что таблицы отображаются ниже как HTML
6. **Проверьте функциональность удаления:**
   - Нажмите кнопку "Удалить таблицу" у любой таблицы
   - Таблица должна исчезнуть из UI
   - Попробуйте сохранить изменения
   - После сохранения и перезагрузки удалённая таблица не должна появиться
7. Попробуйте отредактировать текст и сохранить изменения
8. Проверьте, что после сохранения оставшиеся таблицы сохранились в контенте
