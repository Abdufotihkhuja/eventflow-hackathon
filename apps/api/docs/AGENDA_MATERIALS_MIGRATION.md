# Миграция: Добавление поля materials в Agenda

## Обзор

Добавлено поле `materials` в модель `AgendaItem` для хранения ссылок на материалы (презентации, документы).

**Дата**: 2026-01-19  
**Миграция**: `20260119200000_add_materials_to_agenda_items`

---

## Изменения

### 1. Prisma Schema

Добавлено поле в модель `AgendaItem`:

```prisma
model AgendaItem {
  // ... существующие поля
  materials   String[] // Массив ссылок на материалы (презентации, документы)
  // ... остальные поля
}
```

### 2. База данных

SQL миграция:

```sql
ALTER TABLE "agenda_items" 
ADD COLUMN "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
```

### 3. DTO

Обновлён `CreateAgendaItemDto`:

```typescript
@ApiPropertyOptional({
  example: [
    'https://example.com/presentation.pdf',
    'https://example.com/materials.zip',
  ],
  description: 'Ссылки на материалы (презентации, документы)',
})
@IsArray()
@IsString({ each: true })
@IsOptional()
materials?: string[];
```

---

## Применение миграции

### Вариант 1: Через Prisma Migrate (рекомендуется)

```bash
# Применить миграцию
npx prisma migrate deploy

# Или для dev окружения
npx prisma migrate dev
```

### Вариант 2: Вручную через psql

```bash
# Подключиться к базе данных
psql -U postgres -d eventflow_db

# Выполнить SQL
ALTER TABLE "agenda_items" 
ADD COLUMN "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

# Проверить
\d agenda_items
```

### Вариант 3: Через Docker

```bash
# Если база в Docker контейнере
docker exec -it eventflow_db psql -U postgres -d eventflow_db

# Выполнить SQL
ALTER TABLE "agenda_items" 
ADD COLUMN "materials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
```

---

## Проверка миграции

### 1. Проверить структуру таблицы

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'agenda_items'
AND column_name = 'materials';
```

Ожидаемый результат:

```
 column_name | data_type | is_nullable | column_default
-------------+-----------+-------------+----------------
 materials   | ARRAY     | NO          | ARRAY[]::text[]
```

### 2. Проверить через Prisma

```bash
# Сгенерировать Prisma Client
npx prisma generate

# Проверить типы
npm run build
```

---

## Использование

### Создание пункта программы с материалами

```typescript
// TypeScript
const agendaItem = await prisma.agendaItem.create({
  data: {
    title: 'Презентация',
    type: 'PRESENTATION',
    startTime: new Date('1970-01-01T10:00:00'),
    duration: 60,
    materials: [
      'https://example.com/presentation.pdf',
      'https://example.com/materials.zip',
    ],
    eventId: 'uuid',
  },
});
```

### Обновление материалов

```typescript
// Добавить материалы
await prisma.agendaItem.update({
  where: { id: 'uuid' },
  data: {
    materials: {
      push: 'https://example.com/new-material.pdf',
    },
  },
});

// Заменить все материалы
await prisma.agendaItem.update({
  where: { id: 'uuid' },
  data: {
    materials: ['https://example.com/updated.pdf'],
  },
});
```

---

## Откат миграции

Если нужно откатить изменения:

```sql
ALTER TABLE "agenda_items" DROP COLUMN "materials";
```

**Внимание**: Это удалит все данные в поле `materials`!

---

## Обратная совместимость

- ✅ Поле опциональное (`@IsOptional()` в DTO)
- ✅ Значение по умолчанию: пустой массив `[]`
- ✅ Существующие записи получат пустой массив
- ✅ API остаётся обратно совместимым

---

## Тестирование

### 1. Unit тесты

```bash
npm run test -- agenda.service.spec.ts
```

### 2. E2E тесты

```bash
npm run test:e2e -- agenda.e2e-spec.ts
```

### 3. Ручное тестирование

Используйте файл `test-agenda.http` для проверки API.

---

## Связанные файлы

- `prisma/schema.prisma` - Схема базы данных
- `prisma/migrations/20260119200000_add_materials_to_agenda_items/migration.sql` - SQL миграция
- `src/modules/events/agenda/dto/create-agenda-item.dto.ts` - DTO
- `docs/AGENDA_API.md` - Документация API
- `test-agenda.http` - Тестовые запросы
