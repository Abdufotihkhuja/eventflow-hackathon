# Реализация функционала билетов для организаторов

## Обзор

Реализован полный функционал генерации и скачивания билетов для организаторов событий:
- Скачивание билета отдельного участника (PDF)
- Массовое скачивание всех билетов (ZIP-архив)
- Выбор дизайна: фирменный (branded) или простой (simple)
- Интеграция с системой check-in

## Архитектура

### API Layer

#### `src/api/services/ticket.types.ts`
Типы для работы с билетами:
- `TicketDesign` - enum с вариантами 'branded' и 'simple'
- `DownloadTicketParams` - параметры для скачивания одного билета
- `DownloadAllTicketsRequest` - параметры для массового скачивания
- `TicketUrls` - ссылки на билеты в обоих дизайнах
- `CheckInResult` - результат check-in с ссылками на билеты

#### `src/api/services/ticketsService.ts`
Сервис для работы с API билетов:
- `getTicket(eventId, registrationId, design)` - GET запрос для скачивания одного билета
- `downloadAllTickets(eventId, params)` - POST запрос для массового скачивания

**Особенности:**
- Использует `responseType: 'blob'` для получения бинарных файлов
- Возвращает Blob для последующей обработки на клиенте

### Features Layer

#### `src/features/events/api/use-tickets.ts`
TanStack Query хуки для работы с билетами:

**`useDownloadTicket(eventId)`**
- Mutation для скачивания одного билета
- Автоматически скачивает файл через временный URL
- Показывает toast уведомления
- Обрабатывает специфичные ошибки API

**`useDownloadAllTickets(eventId)`**
- Mutation для массового скачивания билетов
- Формирует имя ZIP-архива с учетом дизайна и названия события
- Обрабатывает случай отсутствия билетов

**Вспомогательные функции:**
- `downloadFile(blob, filename)` - создает временную ссылку и скачивает файл
- `getFilenameFromHeaders()` - извлекает имя файла из headers
- `getErrorMessage()` - форматирует сообщения об ошибках согласно API спецификации

### UI Layer

#### `src/features/events/ui/ticket-download-menu.tsx`
Компоненты выпадающих меню:

**`TicketDownloadMenu`**
- Компактное меню для скачивания билета одного участника
- Варианты: "Фирменный дизайн" и "Простой дизайн"
- Поддержка состояний загрузки и disabled
- Настраиваемый размер и вариант кнопки

**`BulkTicketDownloadMenu`**
- Меню для массового скачивания всех билетов
- Аналогичный выбор дизайна
- Индикатор загрузки для длительных операций

#### `src/pages/my-events/details/ui/tabs/event-participants-tab.tsx`
Интеграция в таб участников:

**Добавлено:**
1. Кнопка "Билеты (ZIP)" в секции экспорта (рядом с CSV/Excel)
2. Кнопка скачивания билета для каждого одобренного участника
3. Логика обработки скачивания с передачей имени участника

**Условия отображения:**
- Кнопка скачивания билета показывается только для статуса `APPROVED`
- Массовое скачивание доступно всегда (фильтруется на бэкенде)

### Entity Layer

#### `src/entities/registration/lib/constants.ts`
Добавлены константы и утилиты:

**`TICKET_ELIGIBLE_STATUSES`**
- Массив статусов, для которых доступны билеты
- Сейчас: только `APPROVED`

**`isTicketEligible(status)`**
- Функция проверки доступности билета для статуса
- Используется для условного рендеринга UI

### Обновления типов

#### `src/api/services/attendance.types.ts`
Добавлено поле в `AttendanceRecord`:
```typescript
ticketUrls?: {
  branded: string
  simple: string
}
```
Возвращается при check-in для быстрого доступа к билетам.

## API Endpoints

### Для организаторов (EventTicketsController)

**Скачать билет одного участника:**
```
GET /api/v1/events/:eventId/tickets/:registrationId?design=branded|simple
Auth: JWT + Permission EVENTS_READ
Response: application/pdf (StreamableFile)
```

**Массовое скачивание билетов:**
```
POST /api/v1/events/:eventId/tickets/download-all
Body: { design?, status?, registrationIds? }
Auth: JWT + Permission EVENTS_READ
Response: application/zip
```

### Обработка ошибок

| HTTP код | Ситуация | Сообщение |
|----------|----------|-----------|
| 404 | Регистрация не найдена | "Регистрация не найдена" |
| 400 | Не одобрена | "Билет доступен только для одобренных регистраций" |
| 403 | Чужая регистрация | "Нет доступа к этой регистрации" |
| 403 | Не пользователь | "Доступно только для пользователей" |
| 404 | Нет регистраций для ZIP | "Нет регистраций для скачивания" |

## Использование

### Скачивание одного билета

```typescript
import { useDownloadTicket } from '@features/events/api'
import { TicketDownloadMenu } from '@features/events/ui'

function ParticipantCard({ registration, eventId }) {
  const downloadTicket = useDownloadTicket(eventId)
  
  return (
    <TicketDownloadMenu
      onDownload={(design) => 
        downloadTicket.mutate({
          registrationId: registration.id,
          design,
          participantName: `${registration.user.firstName}_${registration.user.lastName}`
        })
      }
      isLoading={downloadTicket.isPending}
    />
  )
}
```

### Массовое скачивание

```typescript
import { useDownloadAllTickets } from '@features/events/api'
import { BulkTicketDownloadMenu } from '@features/events/ui'

function EventActions({ eventId, eventTitle }) {
  const downloadAll = useDownloadAllTickets(eventId)
  
  return (
    <BulkTicketDownloadMenu
      onDownloadAll={(design) =>
        downloadAll.mutate({
          design,
          eventTitle,
          status: 'APPROVED' // опционально
        })
      }
      isLoading={downloadAll.isPending}
    />
  )
}
```

## Формат билета

### Размер
- **148×105 мм** (формат A6, горизонтальный)
- Оптимально для бейджей и бейджиков

### Содержимое
- Название мероприятия
- Дата и место проведения
- ФИО и роль участника
- QR код для отметки посещения
- Логотип организации (в фирменном дизайне)

### Дизайны

**Branded (фирменный):**
- Градиентный фон с цветами организации
- Логотип организации
- Декоративные элементы
- Цветовая схема: градиент синий (#1a1a2e → #16213e)

**Simple (простой):**
- Белый фон с рамкой
- Минималистичный дизайн
- Оптимизирован для черно-белой печати
- Цветовая схема: белый фон, темный текст

## Интеграция с Check-in

При check-in участника API возвращает:
```typescript
{
  attendance: { ... },
  participant: { ... },
  registration: { ... },
  ticketUrls: {
    branded: "/api/v1/events/.../tickets/...?design=branded",
    simple: "/api/v1/events/.../tickets/...?design=simple"
  }
}
```

Это позволяет сразу предложить скачать билет после регистрации на входе.

## Производительность

### Оптимизации
- Билеты генерируются на лету на бэкенде
- Используется streaming для больших ZIP-архивов
- Временные URL автоматически очищаются через `URL.revokeObjectURL()`

### Рекомендации
- Для событий с >500 участниками рекомендуется предупреждать о времени генерации ZIP
- Массовое скачивание можно ограничить по статусу для уменьшения размера архива

## Будущие улучшения

1. **Предпросмотр билета** - показать превью перед скачиванием
2. **Кастомизация дизайна** - настройка цветов и логотипа в UI
3. **Email рассылка** - автоматическая отправка билетов на email участников
4. **QR сканер** - встроенный сканер для check-in через веб-камеру
5. **Статистика** - отслеживание скачиваний билетов

## Тестирование

### Проверить
- [ ] Скачивание одного билета (branded)
- [ ] Скачивание одного билета (simple)
- [ ] Массовое скачивание (branded)
- [ ] Массовое скачивание (simple)
- [ ] Обработка ошибок (404, 400, 403)
- [ ] Индикаторы загрузки
- [ ] Toast уведомления
- [ ] Условное отображение кнопок (только для APPROVED)
- [ ] Имена файлов корректны
- [ ] ZIP архив содержит все билеты

## Связанные файлы

### Созданные
- `src/api/services/ticket.types.ts`
- `src/api/services/ticketsService.ts`
- `src/features/events/api/use-tickets.ts`
- `src/features/events/ui/ticket-download-menu.tsx`

### Обновленные
- `src/api/services/index.ts`
- `src/api/services/attendance.types.ts`
- `src/features/events/api/index.ts`
- `src/features/events/ui/index.ts`
- `src/entities/registration/lib/constants.ts`
- `src/entities/registration/index.ts`
- `src/pages/my-events/details/ui/tabs/event-participants-tab.tsx`
