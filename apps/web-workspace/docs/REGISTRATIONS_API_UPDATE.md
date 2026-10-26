# Обновление API регистраций

## Дата: 2026-01-15

### Изменения в API

#### 1. Обновлен путь refresh токена
- **Старый путь**: `/auth/refresh`
- **Новый путь**: `/v1/auth/refresh`

#### 2. Обновлен путь для получения регистраций
- **Старый путь**: `GET /api/v1/events/{eventId}/participants`
- **Новый путь**: `GET /api/v1/events/{eventId}/registrations`

**Параметры запроса:**
- `page` - номер страницы (по умолчанию: 1)
- `limit` - количество записей на странице (по умолчанию: 20)
- `status` - фильтр по статусу (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `WAITLIST`)
- `search` - поиск по имени или email участника

**Пример запроса:**
```
GET /api/v1/events/{eventId}/registrations?page=1&limit=20&status=APPROVED&search=Иван
```

### Изменения в типах данных

#### Структура ответа API

**Старый формат:**
```typescript
{
  participants: EventParticipant[]
  total: number
  page: number
  limit: number
}
```

**Новый формат:**
```typescript
{
  data: Registration[]
  total: number
  page: number
  limit: number
  totalPages: number
}
```

#### Тип Registration

**Основные поля:**
- `id` - UUID регистрации
- `eventId` - UUID события
- `userId` - UUID пользователя
- `status` - статус регистрации (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `WAITLIST`)
- `role` - роль участника (`PARTICIPANT`, `SPEAKER`, `ORGANIZER`, `VOLUNTEER`)
- `qrCode` - уникальный QR-код для check-in
- `travelStartDate` - дата начала поездки (опционально)
- `travelEndDate` - дата окончания поездки (опционально)
- `preparationDays` - количество дней подготовки
- `createdAt` - дата создания регистрации
- `updatedAt` - дата обновления регистрации

**Вложенный объект user:**
```typescript
user: {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
}
```

**Ответы на вопросы:**
```typescript
answers: [
  {
    id: string
    answer: string
    question: {
      id: string
      question: string
      isRequired: boolean
    }
  }
]
```

### Изменения в коде

#### 1. API Services

**Файл: `src/api/services/eventsService.ts`**
- Переименован метод `getParticipants()` → `getRegistrations()`
- Переименован метод `exportParticipants()` → `exportRegistrations()`
- Обновлены пути эндпоинтов

**Файл: `src/api/services/registration.types.ts`**
- Добавлен новый статус `APPROVED` (заменяет `CONFIRMED`)
- Добавлен тип `RegistrationRole`
- Добавлен тип `RegistrationUser`
- Обновлена структура `Registration` в соответствии с новым API
- Обновлена структура `QuestionAnswer` с вложенным объектом `question`
- В `GetRegistrationsResponse` изменено поле `registrations` → `data`
- Добавлено поле `totalPages` в ответ

#### 2. React Hooks

**Файл: `src/features/events/api/use-participants-query.ts`**
- Обновлены ключи запросов (`registrationsKeys`)
- Изменена сигнатура хука для работы с новым API
- Теперь принимает `eventId` как отдельный параметр

**Файл: `src/features/events/api/use-export-participants.ts`**
- Обновлена сигнатура мутации для работы с новым API
- Изменен формат параметров: `{ eventId, data: { format } }`

#### 3. Entities

**Новая сущность: `src/entities/registration/`**
- Создан файл `index.ts` с экспортом типов и констант
- Создан файл `lib/constants.ts` с константами статусов и ролей

**Константы:**
- `REGISTRATION_STATUS_LABELS` - переводы статусов
- `REGISTRATION_STATUS_COLORS` - цвета для бейджей статусов
- `REGISTRATION_ROLE_LABELS` - переводы ролей

#### 4. UI Components

**Файл: `src/pages/my-events/details/ui/tabs/event-participants-tab.tsx`**
- Изменены импорты с `@entities/event` на `@entities/registration`
- Обновлена работа с данными: `data?.participants` → `data?.data`
- Обновлены поля участника:
  - `participant.firstName` → `registration.user.firstName`
  - `participant.lastName` → `registration.user.lastName`
  - `participant.email` → `registration.user.email`
  - `participant.registeredAt` → `registration.createdAt`
- Обновлена пагинация: теперь использует `totalPages` из ответа API
- Скрыт deprecated статус `CONFIRMED` из фильтров

### Обратная совместимость

Для обеспечения плавного перехода:
- Статус `CONFIRMED` помечен как deprecated, но остается в типах
- Старые типы `EventParticipant`, `GetEventParticipantsRequest` и др. остаются в `event.types.ts` для совместимости
- В `REGISTRATION_STATUS_LABELS` сохранены оба статуса: `CONFIRMED` и `APPROVED`

### Миграция

Если вы используете старые типы участников в своем коде:

1. Замените `ParticipantStatus` на `RegistrationStatus`
2. Замените `EventParticipant` на `Registration`
3. Обновите доступ к полям пользователя через вложенный объект `user`
4. Используйте `APPROVED` вместо `CONFIRMED` для новых регистраций
5. Обновите импорты с `@entities/event` на `@entities/registration`

### Пример миграции компонента

**До:**
```typescript
import { ParticipantStatus, PARTICIPANT_STATUS_LABELS } from '@entities/event'

const { data } = useParticipantsQuery({ eventId, page, limit })
const participants = data?.participants ?? []

participants.map(p => (
  <div>
    {p.firstName} {p.lastName}
    {PARTICIPANT_STATUS_LABELS[p.status]}
  </div>
))
```

**После:**
```typescript
import { RegistrationStatus, REGISTRATION_STATUS_LABELS } from '@entities/registration'

const { data } = useParticipantsQuery({ eventId, page, limit })
const registrations = data?.data ?? []

registrations.map(r => (
  <div>
    {r.user.firstName} {r.user.lastName}
    {REGISTRATION_STATUS_LABELS[r.status]}
  </div>
))
```

## Оптимизации UI

### Debounce для поиска

**Проблема:** При вводе текста в поле поиска компонент совершал запрос к API при каждом нажатии клавиши, что приводило к:
- Избыточной нагрузке на сервер
- Медленной работе UI
- Исчезновению input при частых ре-рендерах

**Решение:** Добавлен хук `useDebounce` для задержки запроса на 500ms после окончания ввода.

**Файлы:**
- `src/shared/lib/use-debounce.ts` - новый хук для debounce
- `src/pages/my-events/details/ui/tabs/event-participants-tab.tsx` - обновлен компонент

**Изменения в компоненте:**
```typescript
// Локальное состояние для input (мгновенное обновление UI)
const [searchInput, setSearchInput] = useState('')

// Debounced значение для API запросов (с задержкой 500ms)
const debouncedSearch = useDebounce(searchInput, 500)

// Запрос использует debounced значение
const { data } = useParticipantsQuery({
  search: debouncedSearch || undefined,
  // ...
})
```

**Преимущества:**
- Input реагирует мгновенно (нет задержек при вводе)
- API запросы происходят только после паузы в 500ms
- Автоматически сбрасывается страница пагинации при изменении фильтров
- Значительно снижена нагрузка на сервер

## Тестирование

После обновления рекомендуется проверить:
1. ✅ Загрузку списка регистраций на странице события
2. ✅ Фильтрацию по статусам
3. ✅ Поиск по имени/email (с debounce)
4. ✅ Пагинацию
5. ✅ Экспорт участников в CSV/Excel
6. ✅ Отображение информации о пользователе
7. ✅ Работу с QR-кодами (если используется)

## Заметки

- Все изменения обратно совместимы на уровне типов TypeScript
- Линтер не показывает ошибок после обновления
- Компоненты и хуки полностью обновлены под новый API
- Добавлена оптимизация поиска с помощью debounce (500ms)