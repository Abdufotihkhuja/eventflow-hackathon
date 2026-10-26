# API топовых событий

## Описание

Функционал "Топовые события" позволяет супер-админам отмечать избранные мероприятия, которые будут отображаться в начале списка на публичной странице.

## Особенности

- ⭐ Топовые события отображаются первыми в публичном списке
- 🔐 Только супер-админы могут управлять статусом
- 🔄 Простое переключение (toggle) статуса
- 📊 Флаг `isFeatured` доступен в публичном API

---

## Endpoints

### Супер-админ (требуется авторизация как SUPER_ADMIN)

#### PATCH `/api/v1/super-admin/events/:eventId/featured`

Переключить статус "Топовое событие" (toggle).

**Headers:**
```
Authorization: Bearer {super_admin_access_token}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Tech Conference 2025",
  "description": "...",
  "isFeatured": true,
  ...
}
```

**Возможные ошибки:**
- `401 Unauthorized` - Не авторизован или не супер-админ
- `404 Not Found` - Мероприятие не найдено

**Пример запроса:**
```bash
curl -X PATCH https://eventflow.uz/api/v1/super-admin/events/550e8400-e29b-41d4-a716-446655440000/featured \
  -H "Authorization: Bearer {super_admin_token}"
```

---

### Публичный API (без авторизации)

#### GET `/api/v1/public/events`

Получить список публичных событий. **Топовые события автоматически отображаются первыми.**

**Query параметры:**
```
?page=1
&limit=10
&search=конференция
&city=Ташкент
&format=ONLINE | OFFLINE | HYBRID
&type=FREE | PAID
&filter=upcoming | past | all
&featured=true     # Получить только топовые события
```

**Описание параметров:**
- `page` - номер страницы (по умолчанию: 1)
- `limit` - количество на странице (1-50, по умолчанию: 10)
- `search` - поиск по названию и описанию
- `city` - фильтр по городу
- `format` - формат события (ONLINE, OFFLINE, HYBRID)
- `type` - тип события (FREE, PAID)
- `filter` - временной фильтр (upcoming, past, all)
- `featured` - фильтр топовых событий (true/false, необязательно)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Tech Conference 2025",
      "shortDescription": "Описание...",
      "coverImage": "https://...",
      "startDate": "2025-06-15T10:00:00Z",
      "endDate": "2025-06-15T18:00:00Z",
      "format": "ONLINE",
      "type": "FREE",
      "city": "Ташкент",
      "maxParticipants": 100,
      "registrationsCount": 45,
      "isFeatured": true,  ⭐
      "organization": {
        "id": "uuid",
        "name": "EventFlow Inc.",
        "logoUrl": "https://..."
      }
    },
    {
      "id": "uuid",
      "title": "AI Summit",
      "isFeatured": false,
      ...
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Сортировка:**
1. **Топовые события** (`isFeatured: true`) отображаются первыми
2. Затем **по дате начала** (upcoming: по возрастанию, past: по убыванию)

**Примеры запросов:**
```bash
# 1. Получить все предстоящие события (топовые будут первыми)
curl https://eventflow.uz/api/v1/public/events?filter=upcoming&limit=10

# 2. Получить ТОЛЬКО топовые события
curl https://eventflow.uz/api/v1/public/events?featured=true&limit=10

# 3. Получить топовые онлайн-события в Ташкенте
curl https://eventflow.uz/api/v1/public/events?featured=true&format=ONLINE&city=Ташкент

# 4. Получить все события кроме топовых
curl https://eventflow.uz/api/v1/public/events?featured=false&limit=20

# 5. Поиск среди топовых событий
curl https://eventflow.uz/api/v1/public/events?featured=true&search=конференция
```

---

## Использование на фронтенде

### Отображение топового статуса

```typescript
interface PublicEventItem {
  id: string;
  title: string;
  // ...
  isFeatured: boolean;
}

// React/Next.js пример
function EventCard({ event }: { event: PublicEventItem }) {
  return (
    <div className="event-card">
      {event.isFeatured && (
        <span className="badge badge-featured">
          ⭐ Топовое событие
        </span>
      )}
      <h3>{event.title}</h3>
      {/* ... */}
    </div>
  );
}
```

### CSS стили

```css
.badge-featured {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* Highlight топового события */
.event-card[data-featured="true"] {
  border: 2px solid #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}
```

---

## Админ панель (для супер-админов)

### Кнопка Toggle Featured

```typescript
// React/Next.js пример
function AdminEventActions({ event }: { event: Event }) {
  const [isFeatured, setIsFeatured] = useState(event.isFeatured);
  const [loading, setLoading] = useState(false);

  const toggleFeatured = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://eventflow.uz/api/v1/super-admin/events/${event.id}/featured`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to toggle featured');

      const updated = await response.json();
      setIsFeatured(updated.isFeatured);
      
      // Показать уведомление
      toast.success(
        updated.isFeatured 
          ? '⭐ Событие добавлено в топовые' 
          : 'Событие убрано из топовых'
      );
    } catch (error) {
      toast.error('Ошибка при изменении статуса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFeatured}
      disabled={loading}
      className={`btn ${isFeatured ? 'btn-featured' : 'btn-default'}`}
    >
      {isFeatured ? '⭐ Убрать из топовых' : '☆ Сделать топовым'}
    </button>
  );
}
```

---

## Примеры использования

### Сценарий 1: Супер-админ отмечает событие топовым

```bash
# 1. Супер-админ авторизуется
POST /api/v1/auth/super-admin/login
{
  "email": "admin@eventflow.uz",
  "password": "SecurePassword123!"
}

# Получает accessToken

# 2. Отмечает событие как топовое
PATCH /api/v1/super-admin/events/550e8400-e29b-41d4-a716-446655440000/featured
Authorization: Bearer {accessToken}

# Response: isFeatured = true

# 3. Событие теперь отображается первым в публичном списке
```

### Сценарий 2: Пользователь видит топовые события

```bash
# 1. Открывает страницу событий (без авторизации)
GET /api/v1/public/events?filter=upcoming&limit=10

# Response: первыми идут топовые события (isFeatured: true)
{
  "items": [
    { "id": "1", "title": "TopEvent 1", "isFeatured": true },
    { "id": "2", "title": "TopEvent 2", "isFeatured": true },
    { "id": "3", "title": "Regular Event", "isFeatured": false },
    ...
  ]
}
```

### Сценарий 3: Получение ТОЛЬКО топовых событий

```bash
# 1. Frontend запрашивает только топовые события для специального раздела
GET /api/v1/public/events?featured=true&limit=5

# Response: только топовые события
{
  "items": [
    { "id": "1", "title": "TopEvent 1", "isFeatured": true },
    { "id": "2", "title": "TopEvent 2", "isFeatured": true }
  ],
  "total": 2
}

# 2. Получить топовые онлайн-события в Ташкенте
GET /api/v1/public/events?featured=true&format=ONLINE&city=Ташкент

# 3. Получить все НЕ топовые события
GET /api/v1/public/events?featured=false&limit=20
```

---

## База данных

### Миграция

```sql
-- Добавляет поле is_featured в таблицу events
ALTER TABLE "events" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- Создает индекс для оптимизации сортировки
CREATE INDEX "events_is_featured_start_date_idx" ON "events"("is_featured", "start_date");
```

### Prisma Schema

```prisma
model Event {
  // ... другие поля
  
  isFeatured Boolean @default(false) @map("is_featured")
  
  @@index([isFeatured, startDate])
  @@map("events")
}
```

---

## UI/UX рекомендации

### Для публичной страницы

1. **Визуальное выделение:**
   - Добавить бейдж "⭐ Топовое событие"
   - Использовать градиентную рамку
   - Легкая тень для акцента

2. **Порядок отображения:**
   - Топовые события всегда сверху
   - Разделитель "Другие события" после топовых (опционально)

3. **Responsive:**
   ```css
   @media (max-width: 768px) {
     .badge-featured {
       font-size: 10px;
       padding: 2px 6px;
     }
   }
   ```

### Для админ панели

1. **Кнопка Toggle:**
   - Иконка звездочки (⭐ заполненная / ☆ пустая)
   - Меняет цвет при наведении
   - Показывает loading state

2. **Список событий:**
   - Столбец "Топовое" с иконкой
   - Фильтр "Показать только топовые"
   - Сортировка по isFeatured

3. **Уведомления:**
   - Toast при успешном изменении
   - Ошибка, если нет прав

---

## Ограничения

- ❌ Нет лимита на количество топовых событий
- ✅ Топовый статус не влияет на модерацию
- ✅ Топовыми могут быть только PUBLISHED события
- ✅ Изменение статуса не меняет дату обновления события

---

## Безопасность

- ✅ Endpoint защищен `JwtAuthGuard` и `RolesGuard`
- ✅ Только пользователи с типом `SUPER_ADMIN` имеют доступ
- ✅ Публичный API не позволяет изменять `isFeatured`
- ✅ Валидация UUID параметра `eventId`

---

## Тестирование

### HTTP тесты (VSCode REST Client)

Создайте файл `test-featured-events.http`:

```http
### 1. Авторизация супер-админа
POST https://eventflow.uz/api/v1/auth/super-admin/login
Content-Type: application/json

{
  "email": "admin@eventflow.uz",
  "password": "SecurePassword123!"
}

### 2. Сохраните accessToken из ответа выше
@accessToken = YOUR_ACCESS_TOKEN

### 3. Сделать событие топовым
PATCH https://eventflow.uz/api/v1/super-admin/events/550e8400-e29b-41d4-a716-446655440000/featured
Authorization: Bearer {{accessToken}}

### 4. Проверить публичный список (топовые первыми)
GET https://eventflow.uz/api/v1/public/events?filter=upcoming&limit=10

### 5. Toggle обратно (убрать из топовых)
PATCH https://eventflow.uz/api/v1/super-admin/events/550e8400-e29b-41d4-a716-446655440000/featured
Authorization: Bearer {{accessToken}}
```

---

## Changelog

### v1.1.0 (2026-01-14)

- ✅ Добавлен фильтр `featured` в публичный API `/public/events`
  - `?featured=true` - только топовые события
  - `?featured=false` - только НЕ топовые события
- ✅ Возможность комбинировать фильтр с другими параметрами (city, format, type, search)

### v1.0.0 (2026-01-14)

- ✅ Добавлено поле `isFeatured` в модель Event
- ✅ Endpoint для супер-админа: `PATCH /super-admin/events/:id/featured`
- ✅ Автоматическая сортировка топовых событий в публичном API
- ✅ Поле `isFeatured` в DTO `PublicEventItemDto`
- ✅ Миграция БД с индексом для оптимизации
