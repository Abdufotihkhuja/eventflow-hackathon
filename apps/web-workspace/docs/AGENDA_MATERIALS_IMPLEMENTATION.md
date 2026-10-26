# Управление материалами элементов программы (Agenda Materials)

## Описание

Реализована полноценная система управления материалами для элементов программы мероприятий. Организатор может как загружать файлы, так и добавлять ссылки на внешние ресурсы (презентации, документы и т.д.).

## Возможности

### 1. **Загрузка файлов**
- Множественная загрузка файлов за раз
- Отображение размера файла
- Скачивание файлов
- Удаление файлов

### 2. **Добавление ссылок**
- Добавление внешних ссылок с названием
- Открытие ссылок в новой вкладке
- Удаление ссылок

### 3. **Управление материалами**
- Отображение списка всех материалов (файлы + ссылки)
- Различные иконки для файлов и ссылок
- Возможность удаления любого материала

## UI/UX

### Режим редактирования

```
Материалы                          3 материал(ов)

┌────────────────┐ ┌────────────────┐
│ 📤 Загрузить   │ │ 🔗 Добавить    │
│    файлы       │ │    ссылку      │
└────────────────┘ └────────────────┘

┌──────────────────────────────────────────┐
│ 📄 Презентация.pdf          Файл  2.5 MB │
│                                 [↓] [🗑]  │
├──────────────────────────────────────────┤
│ 🔗 Дополнительные материалы    Ссылка    │
│                                 [↗] [🗑]  │
├──────────────────────────────────────────┤
│ 📄 Раздаточный материал.docx Файл  1.2MB │
│                                 [↓] [🗑]  │
└──────────────────────────────────────────┘
```

### Режим просмотра

Аналогично режиму редактирования, но без возможности загрузки/удаления материалов.

### Пустое состояние (для новых элементов)

```
Материалы
┌──────────────────────────────────────────┐
│              📄                           │
│      Сначала сохраните элемент           │
│                                           │
│  После сохранения вы сможете загружать   │
│  файлы и добавлять ссылки                │
└──────────────────────────────────────────┘
```

### Пустое состояние (для существующих элементов)

```
Материалы
┌──────────────────────────────────────────┐
│              📄                           │
│      Материалы не добавлены              │
│                                           │
│  Загрузите файлы или добавьте ссылки на  │
│  презентации и документы                 │
└──────────────────────────────────────────┘
```

## API Интеграция

### Endpoints

```typescript
// Получить список материалов
GET /api/v1/events/{eventId}/agenda/{agendaItemId}/materials

// Загрузить один файл
POST /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/upload
Content-Type: multipart/form-data
Body: { file: File }

// Загрузить несколько файлов
POST /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/upload-multiple
Content-Type: multipart/form-data
Body: { files: File[] }

// Добавить ссылку
POST /api/v1/events/{eventId}/agenda/{agendaItemId}/materials
Content-Type: application/json
Body: { name: string, url: string }

// Удалить материал
DELETE /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/{materialId}

// Скачать материал
GET /api/v1/events/{eventId}/agenda/{agendaItemId}/materials/download?materialId={id}
```

### Типы данных

```typescript
/**
 * Тип материала
 */
type AgendaMaterialType = 'FILE' | 'LINK'

/**
 * Материал элемента программы
 */
interface AgendaMaterial {
  id: string
  agendaItemId: string
  type: AgendaMaterialType
  name: string          // Название файла или текст ссылки
  url: string           // URL для скачивания или внешняя ссылка
  size?: number         // Размер файла (только для FILE)
  mimeType?: string     // MIME тип (только для FILE)
  uploadedAt: string
}
```

## Архитектура

### Файловая структура

```
src/
├── api/services/
│   ├── agenda.types.ts              # Обновлены типы (добавлены материалы)
│   ├── agendaMaterialsService.ts    # Новый: API сервис для материалов
│   └── index.ts                     # Экспорт материалов
│
├── features/events/
│   ├── api/
│   │   └── use-agenda-materials.ts  # Новый: React hooks для материалов
│   └── ui/agenda-manager/
│       ├── agenda-manager.tsx       # Обновлен: интеграция MaterialsManager
│       └── materials-manager.tsx    # Новый: UI компонент управления материалами
```

### Компоненты

#### 1. **MaterialsManager** (новый)

Полноценный компонент для управления материалами:

```tsx
<MaterialsManager
  eventId={string}
  agendaItemId={string | null}  // null для новых элементов
  isReadOnly={boolean}           // true для режима просмотра
/>
```

**Функции:**
- Загрузка файлов (множественная)
- Добавление ссылок через диалог
- Отображение списка материалов
- Удаление материалов
- Скачивание файлов / открытие ссылок

#### 2. **AgendaManager** (обновлен)

Интегрирован `MaterialsManager`:

```tsx
// В режиме редактирования
<MaterialsManager
  eventId={item.eventId}
  agendaItemId={item.isNew ? null : item.id}
  isReadOnly={false}
/>

// В режиме просмотра
<MaterialsManager
  eventId={item.eventId}
  agendaItemId={item.id}
  isReadOnly={true}
/>
```

### React Hooks

```typescript
// Загрузка материалов
const { data: materials, isLoading } = useAgendaMaterialsQuery(
  eventId,
  agendaItemId,
  enabled
)

// Загрузка файла
const uploadMutation = useUploadAgendaFile(eventId, agendaItemId)
await uploadMutation.mutateAsync(file)

// Загрузка нескольких файлов
const uploadMultipleMutation = useUploadMultipleAgendaFiles(eventId, agendaItemId)
await uploadMultipleMutation.mutateAsync(files)

// Добавление ссылки
const addLinkMutation = useAddAgendaLink(eventId, agendaItemId)
await addLinkMutation.mutateAsync({ name: 'Презентация', url: 'https://...' })

// Удаление материала
const deleteMutation = useDeleteAgendaMaterial(eventId, agendaItemId)
await deleteMutation.mutateAsync(materialId)
```

## Изменения в существующих типах

### Было (старая реализация):

```typescript
// materials - массив строк (только ссылки)
interface AgendaItem {
  materials: string[]  // Массив URL
}

interface CreateAgendaItemRequest {
  materials?: string[]  // Передавались при создании
}
```

### Стало (новая реализация):

```typescript
// materials - все еще в AgendaItem для обратной совместимости
// но теперь управляются через отдельный API
interface AgendaItem {
  materials: string[]  // Deprecated: используйте AgendaMaterialsService
}

interface CreateAgendaItemRequest {
  // materials удалено - управляются через отдельный API
}
```

**⚠️ Важно:** Поле `materials` в `AgendaItem` сохранено для обратной совместимости, но теперь рекомендуется использовать `AgendaMaterialsService` для получения полной информации о материалах (включая файлы).

## Как использовать

### 1. **Создать элемент программы и добавить материалы**

```typescript
// 1. Создаем элемент программы
const newItem = await createAgendaItem(eventId, {
  date: '2026-01-22',
  title: 'Презентация',
  startTime: '10:00',
  duration: 60,
  // ...
})

// 2. Загружаем файл
await uploadFile(eventId, newItem.id, file)

// 3. Добавляем ссылку
await addLink(eventId, newItem.id, {
  name: 'Дополнительные материалы',
  url: 'https://example.com/materials'
})
```

### 2. **Получить все материалы элемента**

```typescript
const materials = await agendaMaterialsService.getMaterials(eventId, agendaItemId)

// Результат:
[
  {
    id: 'uuid-1',
    type: 'FILE',
    name: 'Презентация.pdf',
    url: '/uploads/...',
    size: 2621440, // 2.5 MB
    mimeType: 'application/pdf'
  },
  {
    id: 'uuid-2',
    type: 'LINK',
    name: 'Дополнительные материалы',
    url: 'https://example.com/materials'
  }
]
```

## Обработка ошибок

```typescript
try {
  await uploadFile(eventId, agendaItemId, file)
  toast.success('Файл загружен')
} catch (error) {
  toast.error('Ошибка при загрузке файла')
}
```

## Ограничения

- **Размер файлов**: ограничен настройками сервера (обычно до 10-50 MB)
- **Типы файлов**: рекомендуется PDF, DOCX, PPTX, но поддерживаются любые
- **Новые элементы**: нельзя добавить материалы до сохранения элемента программы

## Обновленные файлы

### Новые файлы:
- `src/api/services/agendaMaterialsService.ts` — API сервис для материалов
- `src/features/events/api/use-agenda-materials.ts` — React hooks
- `src/features/events/ui/agenda-manager/materials-manager.tsx` — UI компонент

### Измененные файлы:
- `src/api/services/agenda.types.ts` — добавлены типы материалов
- `src/api/services/index.ts` — экспорт новых типов и сервисов
- `src/features/events/ui/agenda-manager/agenda-manager.tsx` — интеграция MaterialsManager

## Миграция

Если у вас есть элементы программы с материалами в старом формате (массив строк):

1. Бэкенд должен автоматически мигрировать их в новый формат
2. Все существующие ссылки будут преобразованы в материалы типа `LINK`
3. После миграции используйте новый API для управления материалами
