# Быстрое исправление таблиц на бэкенде (TL;DR)

## Проблема

Таблицы падают с ошибкой `RangeError: Invalid content for node table` из-за неполной структуры данных.

---

## Минимум что нужно исправить

### 1. Добавить эти поля в таблицы

```typescript
// ДО (неправильно):
{
  "type": "table",
  "content": {
    "rows": [...]
  }
}

// ПОСЛЕ (правильно):
{
  "type": "table",
  "content": {
    "type": "tableContent",        // ← ДОБАВИТЬ
    "headerRows": 0,               // ← ДОБАВИТЬ
    "rows": [...],
    "columnWidths": [null, null]   // ← ДОБАВИТЬ (опционально)
  },
  "children": []                   // ← ДОБАВИТЬ (опционально)
}
```

### 2. Функция для автоматического исправления

Скопируйте и используйте при сохранении:

```typescript
function fixTableStructure(block: any): any {
  if (block.type !== 'table') return block;

  // Исправляем content
  if (!block.content) {
    block.content = {};
  }

  block.content.type = 'tableContent';
  
  if (typeof block.content.headerRows !== 'number') {
    block.content.headerRows = 0;
  }

  if (!Array.isArray(block.content.rows)) {
    block.content.rows = [];
  }

  if (!Array.isArray(block.content.columnWidths)) {
    block.content.columnWidths = [];
  }

  // Исправляем каждую ячейку
  block.content.rows = (block.content.rows || []).map((row: any) => ({
    cells: (row.cells || []).map((cell: any) => ({
      type: 'tableCell',
      ...cell,
      props: {
        colspan: cell.props?.colspan ?? 1,
        rowspan: cell.props?.rowspan ?? 1,
        textColor: cell.props?.textColor ?? 'default',
        textAlignment: cell.props?.textAlignment ?? 'left',
        backgroundColor: cell.props?.backgroundColor ?? 'default'
      },
      content: cell.content ?? []
    }))
  }));

  if (!Array.isArray(block.children)) {
    block.children = [];
  }

  return block;
}
```

### 3. Применить при сохранении

```typescript
// В контроллере создания/обновления события:
async function updateEvent(req, res) {
  let { description } = req.body;

  if (Array.isArray(description)) {
    // Исправляем все таблицы
    description = description.map(block => fixTableStructure(block));
  }

  await Event.update(eventId, { description });
  
  res.json({ success: true });
}
```

---

## Миграция существующих данных

### PostgreSQL

```sql
-- Обновить все существующие таблицы
UPDATE events
SET description = (
  SELECT jsonb_agg(
    CASE 
      WHEN block->>'type' = 'table' THEN
        jsonb_set(
          jsonb_set(
            block,
            '{content, type}',
            '"tableContent"',
            true
          ),
          '{content, headerRows}',
          COALESCE(block->'content'->'headerRows', '0'::jsonb),
          true
        )
      ELSE block
    END
  )
  FROM jsonb_array_elements(description) AS block
)
WHERE description @> '[{"type": "table"}]'::jsonb;
```

### MongoDB

```javascript
db.events.find({ "description.type": "table" }).forEach(function(event) {
  event.description = event.description.map(block => {
    if (block.type === 'table') {
      if (!block.content) block.content = {};
      block.content.type = 'tableContent';
      if (typeof block.content.headerRows !== 'number') {
        block.content.headerRows = 0;
      }
    }
    return block;
  });
  
  db.events.save(event);
});
```

### Node.js скрипт (универсальный)

```javascript
// migrate-tables.js
const events = await db.query('SELECT id, description FROM events');

for (const event of events) {
  const description = JSON.parse(event.description);
  const fixed = description.map(block => fixTableStructure(block));
  
  await db.query(
    'UPDATE events SET description = ? WHERE id = ?',
    [JSON.stringify(fixed), event.id]
  );
}

console.log(`Обновлено событий: ${events.length}`);
```

---

## Проверка

После исправления проверьте любое событие с таблицей:

```bash
curl http://your-api/events/{id}
```

**Должно быть:**
```json
{
  "description": [
    {
      "type": "table",
      "content": {
        "type": "tableContent",         // ✅
        "headerRows": 0,                // ✅
        "rows": [...],                  // ✅
        "columnWidths": [...]           // ✅
      }
    }
  ]
}
```

**НЕ должно быть:**
```json
{
  "description": [
    {
      "type": "table",
      "content": {
        // ❌ отсутствует "type": "tableContent"
        // ❌ отсутствует "headerRows"
        "rows": [...]
      }
    }
  ]
}
```

---

## Чеклист

- [ ] Скопировал функцию `fixTableStructure()`
- [ ] Добавил вызов при создании события
- [ ] Добавил вызов при обновлении события
- [ ] Запустил миграцию существующих данных
- [ ] Проверил 2-3 события с таблицами через API
- [ ] Уведомил фронтенд что исправлено

---

## Полная документация

См. `BACKEND_TABLE_FIX_REQUIREMENTS.md` для:
- Детальной структуры всех полей
- Валидации
- Тестов
- Обработки ошибок
