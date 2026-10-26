# Настройка проекта EventFlow Client

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируйте файл `.env.example` в `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите URL вашего backend API:

```env
# Для локальной разработки
VITE_API_URL=http://localhost:8080/api/v1

# Для production
# VITE_API_URL=https://api.eventflow.com/api/v1

VITE_API_TIMEOUT=15000
```

### 3. Запуск dev сервера

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:5173`

## Переменные окружения

| Переменная | Описание | Пример | Обязательная |
|------------|----------|--------|--------------|
| `VITE_API_URL` | Базовый URL API EventFlow | `http://localhost:8080/api/v1` | ✅ Да |
| `VITE_API_TIMEOUT` | Timeout для запросов (мс) | `15000` | ❌ Нет (по умолчанию 15000) |

## Проверка подключения к API

После запуска dev сервера:

1. Откройте `http://localhost:5173/login`
2. Попробуйте войти
3. Откройте DevTools → Network
4. Проверьте запросы к API

Если возникают ошибки CORS:

1. Убедитесь, что backend запущен
2. Проверьте настройки CORS на backend
3. Добавьте `http://localhost:5173` в whitelist CORS на backend

## Скрипты

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Предпросмотр production сборки
npm run preview

# Линтер
npm run lint

# Форматирование
npm run format
```

## Структура проекта

```
eventflow_client/
├── src/
│   ├── api/              # API клиент и сервисы
│   │   ├── services/     # Сервисы по доменам
│   │   ├── apiClient.ts  # HTTP клиент (Axios)
│   │   └── config.ts     # Конфигурация API
│   ├── app/              # Инициализация приложения
│   │   └── providers/    # Провайдеры (router, query, ui)
│   ├── entities/         # Бизнес-сущности
│   ├── features/         # Фичи (композиция логики)
│   ├── pages/            # Страницы
│   ├── shared/           # Общие компоненты и утилиты
│   └── widgets/          # Сложные композитные компоненты
├── docs/                 # Документация
├── tasks/                # Задачи и планы
└── .env                  # Переменные окружения (создать!)
```

## Авторизация

После настройки API вы можете войти в систему:

**Страница входа:** `http://localhost:5173/login`

Используйте тестовые учётные данные из вашего backend.

Подробнее см. [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)

## Troubleshooting

### Ошибка "Cannot connect to server"

**Причина:** Backend не запущен или неверный `VITE_API_URL`

**Решение:**
1. Запустите backend сервер
2. Проверьте `VITE_API_URL` в `.env`
3. Убедитесь, что URL не содержит trailing slash

### Ошибка CORS

**Причина:** Backend не разрешает запросы с вашего origin

**Решение:**
1. Добавьте `http://localhost:5173` в CORS whitelist на backend
2. Убедитесь, что backend возвращает заголовки:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Credentials`
   - `Access-Control-Allow-Headers`

### Ошибка 401 Unauthorized

**Причина:** Неверные учётные данные или истёк токен

**Решение:**
1. Проверьте правильность email/пароля
2. Очистите localStorage (`Application` → `Local Storage`)
3. Попробуйте войти снова

### Приложение не запускается

**Причина:** Отсутствует `.env` файл

**Решение:**
```bash
cp .env.example .env
```

Затем отредактируйте `.env` и укажите правильный `VITE_API_URL`.

## Дальнейшие шаги

1. ✅ Настроить .env
2. ✅ Запустить dev сервер
3. ✅ Войти в систему
4. 📖 Изучить [документацию](./README.md)
5. 🎨 Начать разработку фич

## Полезные ссылки

- [Документация API](./AUTH_IMPLEMENTATION.md)
- [Архитектура FSD](../.cursor/rules/architecture-fsd-atomic.mdc)
- [Работа с формами](../.cursor/rules/forms-react-hook-form.mdc)
- [UI компоненты](../.cursor/rules/ui-tailwind-shadcn.mdc)
