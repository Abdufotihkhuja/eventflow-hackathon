# Реализация Check-in по QR коду

## Описание

Реализован функционал check-in участников мероприятий через сканирование QR-кода из билета. Организаторы и их сотрудники могут отмечать посещаемость, сканируя QR-коды билетов участников.

## Архитектура

### API Layer

#### Обновленный сервис: `attendanceService.ts`

Добавлен новый метод для глобального check-in:

```typescript
checkInByCode: (qrCode: string) =>
  request<AttendanceRecord, { qrCode: string }>({
    method: 'POST',
    url: '/v1/attendance/check-in',
    data: { qrCode },
  })
```

**Эндпоинт:** `POST /api/v1/attendance/check-in`

**Запрос:**
```json
{
  "qrCode": "string"
}
```

**Ответ:**
```typescript
{
  id: string
  eventId: string
  registrationId: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  checkInTime?: string
  checkOutTime?: string
  notes?: string
  markedBy?: string
  createdAt: string
  updatedAt: string
  registration?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  ticketUrls?: {
    branded: string
    simple: string
  }
}
```

### Feature Layer

#### Хук: `useCheckInByCode`

**Файл:** `src/features/events/api/use-check-in.ts`

TanStack Query мутация для выполнения check-in:

```typescript
export function useCheckInByCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (qrCode: string) => attendanceService.checkInByCode(qrCode),
    onSuccess: (data) => {
      // Инвалидация кэша посещаемости
      queryClient.invalidateQueries({ queryKey: ['events', data.eventId, 'attendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      
      // Уведомление об успехе
      toast.success('Check-in выполнен успешно')
    },
    onError: (error: ApiError) => {
      toast.error('Ошибка check-in')
    },
  })
}
```

### Page Layer

#### Страница: `CheckInPage`

**Файл:** `src/pages/check-in/ui/check-in-page.tsx`

**URL:** `/check-in?code=...`

**Функциональность:**

1. **Проверка наличия QR кода** - валидация query параметра `code`
2. **Проверка авторизации** - пользователь должен быть авторизован
3. **Проверка прав доступа** - только организаторы и их сотрудники
4. **Автоматический check-in** - выполняется при загрузке страницы
5. **Отображение результата** - успех/ошибка с деталями

#### Состояния страницы:

1. **Отсутствует код** - показывается сообщение об ошибке
2. **Не авторизован** - предложение войти в систему
3. **Недостаточно прав** - только для организаторов
4. **Выполняется check-in** - лоадер
5. **Успешный check-in** - карточка с информацией об участнике
6. **Ошибка check-in** - сообщение об ошибке с возможностью повтора

#### UI компоненты:

```typescript
// Успешный check-in
- Карточка с зелёным фоном
- Иконка CheckCircle2
- Информация об участнике (имя, email)
- Время check-in
- Ссылки на билеты (фирменный и простой)
- Кнопка возврата в панель

// Ошибка check-in
- Карточка с красным фоном
- Иконка XCircle
- Сообщение об ошибке
- Кнопка повтора
- Кнопка возврата
```

### Routing

Добавлен публичный роут с внутренней проверкой авторизации:

```typescript
{
  path: '/check-in',
  element: withSuspense(<CheckInPage />),
  errorElement: withSuspense(<ErrorPage />),
}
```

## Поток работы

### 1. Сканирование QR кода

Участник получает билет с QR-кодом, который содержит URL:

```
https://eventflow.uz/check-in?code=UNIQUE_QR_CODE
```

### 2. Переход на страницу

Организатор сканирует QR-код → открывается страница `/check-in?code=...`

### 3. Проверка прав

```typescript
// Проверки выполняются последовательно:
1. Есть ли код в URL?
2. Авторизован ли пользователь?
3. Является ли пользователь организатором?
```

### 4. Выполнение check-in

```typescript
// Автоматически при загрузке страницы
useEffect(() => {
  if (code && isAuthenticated && isOrganization && !isProcessing) {
    setIsProcessing(true)
    checkInMutation.mutate(code)
  }
}, [code, isAuthenticated, isOrganization])
```

### 5. Отображение результата

- **Успех:** Показывается информация об участнике, время check-in, доступны билеты
- **Ошибка:** Сообщение об ошибке с возможностью повторить попытку

## Безопасность

### Проверки на клиенте:

1. **Авторизация** - `isAuthenticated`
2. **Тип пользователя** - `isOrganization` (только организаторы и сотрудники)
3. **Наличие кода** - валидация query параметра

### Проверки на сервере:

1. **JWT токен** - проверка в `Authorization` header
2. **Права доступа** - проверка роли пользователя
3. **Валидность QR кода** - проверка существования и активности регистрации
4. **Принадлежность события** - проверка, что организатор имеет доступ к событию

## Интеграция с TanStack Query

### Инвалидация кэша

После успешного check-in инвалидируются следующие запросы:

```typescript
queryClient.invalidateQueries({ queryKey: ['events', data.eventId, 'attendance'] })
queryClient.invalidateQueries({ queryKey: ['attendance'] })
```

Это обеспечивает актуальность данных посещаемости во всех компонентах.

## Утилиты

### Форматирование даты и времени

Добавлены функции в `src/shared/lib/format.ts`:

```typescript
// Форматирование даты
formatDate(date: string | Date, locale = 'ru-RU'): string
// Пример: "23 января 2026"

// Форматирование времени
formatTime(date: string | Date, locale = 'ru-RU'): string
// Пример: "14:30"
```

## Использование

### Для организаторов:

1. Откройте камеру/сканер QR-кодов
2. Отсканируйте QR-код из билета участника
3. Автоматически откроется страница check-in
4. Дождитесь подтверждения успешного check-in
5. Просмотрите информацию об участнике
6. При необходимости скачайте билеты

### Обработка ошибок:

- **Неверный код:** Показывается сообщение об ошибке
- **Уже отмечен:** Backend возвращает соответствующую ошибку
- **Событие не найдено:** Показывается сообщение об ошибке
- **Нет доступа:** Проверка прав на клиенте и сервере

## Файлы

### Созданные файлы:

```
src/
├── api/services/
│   └── attendanceService.ts          # Обновлён: добавлен checkInByCode
├── features/events/
│   ├── api/
│   │   └── use-check-in.ts           # Новый: хук для check-in
│   └── index.ts                      # Обновлён: экспорт useCheckInByCode
├── pages/check-in/
│   ├── index.ts                      # Новый: экспорт страницы
│   └── ui/
│       └── check-in-page.tsx         # Новый: страница check-in
├── app/providers/router/
│   └── router.tsx                    # Обновлён: добавлен роут /check-in
└── shared/lib/
    └── format.ts                     # Обновлён: добавлены formatDate, formatTime
```

### Обновлённые файлы:

- `src/api/services/attendanceService.ts` - добавлен метод `checkInByCode`
- `src/features/events/index.ts` - экспорт хука `useCheckInByCode`
- `src/app/providers/router/router.tsx` - добавлен роут `/check-in`
- `src/shared/lib/format.ts` - добавлены утилиты форматирования

## Тестирование

### Сценарии тестирования:

1. **Успешный check-in:**
   - Авторизованный организатор
   - Валидный QR код
   - Участник ещё не отмечен

2. **Повторный check-in:**
   - Участник уже отмечен
   - Должна показаться ошибка

3. **Неавторизованный пользователь:**
   - Переход по ссылке без авторизации
   - Показывается предложение войти

4. **Недостаточно прав:**
   - Авторизован как member (не организатор)
   - Показывается сообщение о недостатке прав

5. **Неверный код:**
   - QR код не существует
   - Показывается ошибка

## Будущие улучшения

1. **Offline режим** - кэширование check-in запросов
2. **Batch check-in** - массовая отметка участников
3. **История check-in** - просмотр истории отметок
4. **Статистика** - аналитика по check-in в реальном времени
5. **Push уведомления** - уведомления организатора о check-in
6. **Экспорт данных** - выгрузка списка отмеченных участников
