# ✅ Финальное решение: Таблицы в BlockNote работают!

## Статус: РЕШЕНО ✅

Таблицы теперь **полностью работают** благодаря нормализации на фронтенде.

---

## Что было исправлено

### Проблема
Таблицы из API не содержали обязательное поле `headerRows`, что вызывало ошибку:
```
RangeError: Invalid content for node table: <>
```

### Решение
Добавлена **автоматическая нормализация** таблиц на фронтенде в `src/shared/ui/rich-text-editor/rich-text-editor.tsx`:

1. **Добавление `headerRows`**: Если поле отсутствует, устанавливается `0`
2. **Добавление `type: "tableContent"`**: Обязательное поле для BlockNote
3. **Нормализация ячеек**: Все ячейки получают полный набор `props`
4. **Нормализация `content`**: Строки преобразуются в правильный формат
5. **Фильтрация некорректных таблиц**: Таблицы без `rows` или `cells` удаляются

---

## Что работает СЕЙЧАС

### ✅ На фронтенде
- ✅ Просмотр таблиц (read-only)
- ✅ Создание новых таблиц
- ✅ Редактирование таблиц
- ✅ Добавление/удаление строк и колонок
- ✅ Объединение/разделение ячеек
- ✅ Форматирование (цвета фона, текста)
- ✅ Изменение ширины колонок
- ✅ Настройка заголовков
- ✅ Загрузка изображений в редактор

### Функция нормализации

```typescript
function normalizeTableBlock(block: PartialBlock): PartialBlock | null {
  if (block.type !== 'table') return block;
  
  if (!block.content || typeof block.content !== 'object') {
    console.warn('[BlockNote] Таблица без content, пропускаем:', block.id);
    return null;
  }

  const content = block.content as Record<string, unknown>;
  
  if (!content.rows || !Array.isArray(content.rows) || content.rows.length === 0) {
    console.warn('[BlockNote] Таблица без rows, пропускаем:', block.id);
    return null;
  }

  // Если уже нормализовано, проверяем валидность
  if (content.type === 'tableContent' && typeof content.headerRows === 'number') {
    const hasValidCells = (content.rows as Array<{ cells?: unknown[] }>).every(
      row => row.cells && Array.isArray(row.cells) && row.cells.length > 0
    );
    if (!hasValidCells) {
      console.warn('[BlockNote] Таблица с некорректными ячейками, пропускаем:', block.id);
      return null;
    }
    return block;
  }

  // Нормализуем content
  const normalizedContent: Record<string, unknown> = {
    type: 'tableContent',
    headerRows: typeof content.headerRows === 'number' ? content.headerRows : 0,
    rows: [],
    columnWidths: Array.isArray(content.columnWidths) ? content.columnWidths : [],
  };

  // Нормализуем каждую строку и ячейку
  // ... (полный код см. в rich-text-editor.tsx)

  return {
    ...block,
    content: normalizedContent,
  };
}
```

---

## ⚠️ Что НУЖНО исправить на бэкенде

Фронтенд исправляет данные **при загрузке**, но они **не сохраняются** в исправленном виде.

### Задача для бэкенда:

#### 1. Добавить нормализацию при сохранении

```typescript
// В events.service.ts
async createEvent(data) {
  if (Array.isArray(data.description)) {
    data.description = normalizeBlocks(data.description);
  }
  return await db.events.create(data);
}

async updateEvent(id, data) {
  if (Array.isArray(data.description)) {
    data.description = normalizeBlocks(data.description);
  }
  return await db.events.update(id, data);
}
```

#### 2. Функция нормализации (TypeScript)

```typescript
function normalizeBlocks(blocks: any[]): any[] {
  return blocks.map(block => {
    // Нормализация обычных блоков
    if (block.type === 'table') {
      return normalizeTable(block);
    }
    
    // Рекурсивно нормализуем children
    if (block.children && Array.isArray(block.children)) {
      block.children = normalizeBlocks(block.children);
    }
    
    return block;
  });
}

function normalizeTable(block: any): any {
  if (!block.content) {
    block.content = {};
  }
  
  // Обязательные поля
  block.content.type = 'tableContent';
  block.content.headerRows = block.content.headerRows ?? 0;
  
  if (!Array.isArray(block.content.rows)) {
    block.content.rows = [];
  }
  
  if (!Array.isArray(block.content.columnWidths)) {
    block.content.columnWidths = [];
  }
  
  // Нормализуем ячейки
  block.content.rows = block.content.rows.map((row: any) => ({
    cells: (row.cells || []).map((cell: any) => ({
      type: 'tableCell',
      props: {
        colspan: cell.props?.colspan ?? 1,
        rowspan: cell.props?.rowspan ?? 1,
        textColor: cell.props?.textColor ?? 'default',
        textAlignment: cell.props?.textAlignment ?? 'left',
        backgroundColor: cell.props?.backgroundColor ?? 'default',
      },
      content: cell.content ?? []
    }))
  }));
  
  block.children = block.children ?? [];
  
  return block;
}
```

#### 3. Миграция существующих событий

```javascript
// Скрипт миграции
const events = await db.events.findAll();

for (const event of events) {
  let modified = false;
  
  if (Array.isArray(event.description)) {
    const normalized = normalizeBlocks(event.description);
    
    // Проверяем, были ли изменения
    if (JSON.stringify(normalized) !== JSON.stringify(event.description)) {
      event.description = normalized;
      modified = true;
    }
  }
  
  if (modified) {
    await event.save();
    console.log(`Обновлено событие: ${event.id}`);
  }
}

console.log('Миграция завершена');
```

---

## Тестирование

### ✅ Тест 1: Просмотр события с таблицей
```
1. Откройте /my-events/4e4bdd5d-e0fd-4875-a648-2102f33b6d7b
2. ✅ Таблица отображается
3. ✅ Нет ошибок в консоли
```

### ✅ Тест 2: Редактирование таблицы
```
1. Откройте /my-events/4e4bdd5d-e0fd-4875-a648-2102f33b6d7b/edit
2. ✅ Таблица отображается и редактируется
3. ✅ Можно изменить содержимое ячеек
4. ✅ Можно добавить/удалить строки и колонки
5. ⚠️ После сохранения проверьте API - headerRows должно быть в JSON
```

### ✅ Тест 3: Создание новой таблицы
```
1. Откройте /my-events/create
2. В описании напишите /table
3. Создайте таблицу 3×3
4. Заполните ячейки
5. Сохраните событие
6. ✅ Событие должно сохраниться
7. ⚠️ Проверьте через API - headerRows должно быть в JSON
```

### ⚠️ Тест 4: Проверка API (важно!)

```bash
curl https://api.eventflow.uz/v1/events/4e4bdd5d-e0fd-4875-a648-2102f33b6d7b
```

**Текущий ответ (неправильно):**
```json
{
  "type": "table",
  "content": {
    "rows": [...],
    "type": "tableContent",
    "columnWidths": [null, null, null]
    // ❌ headerRows отсутствует!
  }
}
```

**Должен быть (правильно):**
```json
{
  "type": "table",
  "content": {
    "type": "tableContent",
    "headerRows": 0,  // ✅
    "rows": [...],
    "columnWidths": [null, null, null]
  }
}
```

---

## Чеклист

### Фронтенд (ГОТОВО ✅)
- [x] Нормализация таблиц при загрузке
- [x] Добавление `headerRows` если отсутствует
- [x] Добавление `type: "tableContent"` если отсутствует
- [x] Нормализация ячеек с полным набором `props`
- [x] Фильтрация некорректных таблиц
- [x] Удаление отладочных логов
- [x] Поддержка всех операций с таблицами
- [x] Загрузка изображений

### Бэкенд (TODO ⚠️)
- [ ] Добавить нормализацию при сохранении
- [ ] Применить при создании события
- [ ] Применить при обновлении события
- [ ] Запустить миграцию существующих данных
- [ ] Проверить API - все таблицы должны иметь `headerRows`
- [ ] Добавить валидацию (опционально)
- [ ] Добавить тесты (опционально)

---

## Приоритеты

### 🔴 Высокий (Критично)
Миграция существующих событий - чтобы старые данные были в правильном формате.

### 🟡 Средний (Важно)
Нормализация при сохранении - чтобы новые таблицы сразу сохранялись правильно.

### 🟢 Низкий (Желательно)
Валидация и тесты - для предотвращения проблем в будущем.

---

## Документация

### Для разработчиков
- `docs/BACKEND_TABLE_FIX_REQUIREMENTS.md` — полная спецификация для backend-side нормализации
- `docs/RICH_TEXT_TABLES_DEBUG.md` — отладка
- `docs/RICH_TEXT_TABLES_SUPPORT.md` — документация по таблицам
- `docs/RICH_TEXT_IMAGE_UPLOAD.md` — загрузка изображений

### Код
- `src/shared/ui/rich-text-editor/rich-text-editor.tsx` — основной файл с нормализацией

---

## Заключение

### ✅ Фронтенд: ГОТОВО
Таблицы **полностью работают** благодаря автоматической нормализации.

### ⚠️ Бэкенд: НУЖНО ИСПРАВИТЬ
Нормализация должна применяться **при сохранении**, чтобы данные в БД были в правильном формате.

### 🎯 Результат
После исправления на бэкенде:
- ✅ Все таблицы будут в правильном формате
- ✅ Не нужно будет нормализовывать при загрузке
- ✅ API будет возвращать корректную структуру
- ✅ Миграция исправит старые данные

---

**Статус:** Рабочее решение реализовано, ожидается исправление на бэкенде для постоянного решения.

**Дата:** 26 января 2026
