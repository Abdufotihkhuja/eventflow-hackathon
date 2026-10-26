# ❓ FAQ - Часто задаваемые вопросы

Ответы на наиболее частые вопросы по развертыванию EventFlow Backend.

> Update: production deployment now follows the repo-root guide in `docs/deployment.md`. Legacy app-local deploy helpers such as `./deploy.sh` are retired.

---

## 🚀 Развертывание

### Какие минимальные требования к серверу?

- **RAM**: 2GB (рекомендуется 4GB+)
- **CPU**: 2 ядра (рекомендуется 4+)
- **Диск**: 20GB свободного места
- **ОС**: Ubuntu 22.04 LTS или Debian 11+

### Можно ли развернуть на VPS за $5/месяц?

Да, можно. Минимальная конфигурация (2GB RAM, 1 CPU) подойдёт для небольших нагрузок. Примеры подходящих провайдеров:

- DigitalOcean - Droplet ($6/месяц)
- Linode - Shared CPU ($5/месяц)
- Vultr - Cloud Compute ($5/месяц)
- Hetzner - CX21 (€4.5/месяц)

### Обязательно ли использовать Docker?

Не обязательно, но **настоятельно рекомендуется**. Docker упрощает развертывание, изолирует зависимости и обеспечивает консистентность между окружениями.

Без Docker вам нужно:

1. Установить Node.js 20+
2. Установить PostgreSQL 16
3. Настроить systemd сервисы
4. Поддерживать собственный process management и release flow вне поддерживаемого production runbook

### Как быстро можно развернуть с нуля?

- **С готовым сервером**: 15-20 минут
- **С нуля (настройка сервера)**: 30-45 минут
- **С настройкой SSL**: +10 минут

---

## 🔐 Безопасность

### Как сгенерировать безопасный JWT_SECRET?

```bash
# Генерация 64-символьной строки
openssl rand -base64 48

# Или через Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Как защитить .env файл?

```bash
# Установить права только для владельца
chmod 600 .env

# Проверить права
ls -la .env
# Должно быть: -rw------- (600)
```

### Безопасно ли хранить секреты в .env файле?

Да, если:

- Файл имеет права 600 (`chmod 600 .env`)
- Файл добавлен в `.gitignore`
- Файл не в Git истории (`git ls-files --error-unmatch .env` должен выдавать ошибку)

Для production с высокими требованиями безопасности рассмотрите:

- Vault (HashiCorp)
- AWS Secrets Manager
- Docker Secrets

### Нужен ли Fail2ban?

**Рекомендуется**. Fail2ban защищает от брутфорс атак на SSH.

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

---

## 🗄️ База данных

### Какую версию PostgreSQL использовать?

**PostgreSQL 16** (рекомендуется) или PostgreSQL 14+.

### Можно ли использовать SQLite/MySQL?

Prisma поддерживает эти БД, но проект оптимизирован для PostgreSQL. Для перехода:

1. Измените `provider` в `prisma/schema.prisma`
2. Обновите `DATABASE_URL`
3. Пересоздайте миграции

**Не рекомендуется** для production.

### Как сделать backup базы данных?

```bash
# Через готовый скрипт
./backup-db.sh

# Вручную
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U eventflow_prod eventflow_prod | gzip > backup.sql.gz
```

### Как часто делать backup'ы?

**Ежедневно минимум**. Рекомендации:

- **Частые изменения**: каждые 6-12 часов
- **Средняя активность**: раз в день (ночью)
- **Низкая активность**: раз в 2-3 дня

Автоматизируйте через cron:

```bash
# Ежедневно в 3:00 ночи
0 3 * * * /srv/eventflow/apps/api/backup-db.sh
```

### Как восстановить из backup?

```bash
# Через скрипт
./backup-db.sh restore backups/backup_20241214_120000.sql.gz

# Вручную
gunzip < backup.sql.gz | \
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U eventflow_prod -d eventflow_prod
```

---

## 🌐 Nginx & SSL

### Обязательно ли использовать Nginx?

**Не обязательно**, но рекомендуется для:

- SSL/TLS терминации
- Gzip сжатия
- Статических файлов
- Rate limiting
- Кеширования
- Load balancing (если несколько инстансов)

Без Nginx откройте порт 3000 напрямую в Docker Compose.

### Как получить бесплатный SSL сертификат?

Используйте **Let's Encrypt** через Certbot:

```bash
# Установка
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d yourdomain.uz

# Автообновление настроится автоматически
```

Сертификат действителен 90 дней и обновляется автоматически.

### Можно ли использовать Cloudflare?

**Да**. Cloudflare предоставляет:

- SSL сертификат
- DDoS защиту
- CDN
- Rate limiting

Настройка:

1. Добавьте домен в Cloudflare
2. Настройте DNS A-запись на IP сервера
3. В Cloudflare включите "Proxied" (оранжевое облако)
4. В Nginx используйте HTTP (Cloudflare добавит HTTPS)

---

## 🐳 Docker

### Почему контейнеры не запускаются?

Проверьте:

```bash
# Логи всех контейнеров
docker compose -f docker-compose.prod.yml logs

# Логи конкретного контейнера
docker compose -f docker-compose.prod.yml logs api

# Статус
docker compose -f docker-compose.prod.yml ps
```

Частые причины:

- Неправильный `.env` файл
- Порты заняты
- Недостаточно памяти
- Ошибки в миграциях

### Как очистить место, занятое Docker?

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить всё неиспользуемое
docker system prune -a --volumes

# Проверить занятое место
docker system df
```

**⚠️ ВНИМАНИЕ**: `--volumes` удалит данные БД!

### Можно ли запустить без Docker Compose?

Да, но не рекомендуется. Вам нужно:

1. Запустить PostgreSQL отдельно
2. Собрать образ: `docker build -t eventflow-api .`
3. Запустить контейнер с правильными ENV переменными
4. Настроить сеть между контейнерами

### Как обновить версию Node.js в Docker?

Измените `FROM node:20-alpine` в `Dockerfile` на нужную версию (например, `node:22-alpine`).

---

## 🔄 Обновления

### Как обновить приложение?

```bash
# Из корня репозитория
git pull origin main
npm run docker:prod:up
npm run release:check
```

### Будет ли downtime при обновлении?

Обычно это минимальный downtime restart полного stack через `npm run docker:prod:up`.

Для zero-downtime деплоя:

1. Используйте **Blue-Green deployment**
2. Или **Rolling updates** с Kubernetes
3. Или запустите 2 инстанса за load balancer

### Как откатить обновление?

```bash
# 1. Откатить код
git reset --hard HEAD~1

# 2. Пересобрать
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# 3. Восстановить БД (если миграции поломали)
./backup-db.sh restore backups/backup_latest.sql.gz
```

---

## 🔧 Миграции

### Что делать, если миграция провалилась?

```bash
# 1. Проверить статус
docker compose -f docker-compose.prod.yml exec api npx prisma migrate status

# 2. Посмотреть логи
docker compose -f docker-compose.prod.yml logs api

# 3. Откатить БД из backup
./backup-db.sh restore backups/backup_latest.sql.gz

# 4. Исправить миграцию и попробовать снова
```

### Как создать новую миграцию?

**Только в development:**

```bash
# 1. Измените prisma/schema.prisma
# 2. Создайте миграцию
npx prisma migrate dev --name add_new_field

# 3. Закоммитьте миграцию
git add prisma/migrations
git commit -m "Add migration: add_new_field"
```

**В production:**

```bash
# Применить миграции
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Можно ли откатить миграцию?

Prisma не поддерживает автоматический откат. Варианты:

1. **Восстановить из backup** (рекомендуется)
2. Создать новую миграцию, отменяющую изменения
3. Вручную откатить через SQL

**Всегда делайте backup перед миграциями!**

---

## 🚨 Проблемы

### API не отвечает

```bash
# 1. Проверить контейнеры
docker compose -f docker-compose.prod.yml ps

# 2. Проверить логи
docker compose -f docker-compose.prod.yml logs -f api

# 3. Проверить порт
curl http://localhost:3000/api/v1

# 4. Перезапустить
docker compose -f docker-compose.prod.yml restart api
```

### БД недоступна

```bash
# 1. Проверить статус
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# 2. Посмотреть логи
docker compose -f docker-compose.prod.yml logs postgres

# 3. Проверить подключение
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U eventflow_prod -d eventflow_prod -c "SELECT 1"

# 4. Перезапустить
docker compose -f docker-compose.prod.yml restart postgres
```

### Ошибка: "port is already allocated"

Порт занят другим процессом:

```bash
# Найти процесс
sudo lsof -i :3000

# Убить процесс
sudo kill -9 <PID>

# Или изменить порт в .env
PORT=3001
```

### Ошибка: "no space left on device"

Диск заполнен:

```bash
# Проверить использование
df -h

# Очистить Docker
docker system prune -a

# Удалить старые backup'ы
find ./backups -mtime +30 -delete

# Очистить логи
sudo journalctl --vacuum-time=7d
```

### Ошибка в миграциях

```bash
# 1. Посмотреть статус
docker compose -f docker-compose.prod.yml exec api npx prisma migrate status

# 2. Откатить из backup
./backup-db.sh restore backups/backup_before_migration.sql.gz

# 3. Попробовать снова
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

---

## 💡 Оптимизация

### Как улучшить производительность?

1. **Увеличьте ресурсы сервера** (RAM, CPU)
2. **Настройте индексы** в БД
3. **Включите кеширование** (Redis)
4. **Оптимизируйте запросы** Prisma
5. **Используйте Connection Pooling**
6. **Включите Gzip** в Nginx (уже в конфиге)

### Сколько RPS может обработать?

Зависит от сервера и сложности запросов:

- **Минимальный сервер** (2GB RAM): ~100-200 RPS
- **Средний сервер** (4GB RAM): ~500-1000 RPS
- **Мощный сервер** (8GB RAM): ~2000-5000 RPS

Для больших нагрузок используйте:

- Горизонтальное масштабирование
- Load balancer
- Кеширование (Redis)
- CDN для статики

### Как мониторить производительность?

```bash
# Ресурсы контейнеров
docker stats

# Логи с фильтром по времени ответа
docker compose -f docker-compose.prod.yml logs api | grep "ms"

# Использование памяти БД
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U eventflow_prod -d eventflow_prod -c \
  "SELECT pg_size_pretty(pg_database_size('eventflow_prod'))"
```

Для production мониторинга используйте:

- **Prometheus + Grafana**
- **Datadog**
- **New Relic**

---

## 📊 Масштабирование

### Как запустить несколько инстансов?

1. **Load Balancer** (Nginx, HAProxy)
2. **Shared PostgreSQL**
3. **Shared Session Storage** (Redis)
4. **Docker Swarm или Kubernetes**

Пример с Docker Compose:

```yaml
services:
  api:
    deploy:
      replicas: 3

  nginx:
    depends_on:
      - api
```

### Нужен ли Redis?

**Не обязательно** для старта, но рекомендуется для:

- Session storage (если несколько инстансов)
- Rate limiting
- Кеширования
- Очередей (Bull, BullMQ)

---

## 🎯 CI/CD

### Как настроить автодеплой?

Смотрите корневой `docs/deployment.md` и актуальные root workflows.

Основные шаги:

1. Настройте SSH ключи
2. Добавьте Secrets в GitHub
3. Обновляйте root workflow, а не app-local example
4. Push в main автоматически задеплоит

### Можно ли использовать GitLab CI?

Да, но release command должен оставаться repo-root:

```yaml
deploy:
  stage: deploy
  script:
    - ssh user@server "cd /srv/eventflow && git pull origin main && npm run docker:prod:up && npm run release:check"
  only:
    - main
```

---

## 📞 Поддержка

### Где найти помощь?

1. **Документация**:
   - [QUICK_START.md](./QUICK_START.md)

2. **Проверка перед вопросом**:

   ```bash
   ./pre-deploy-check.sh
   ./health-check.sh
   ```

3. **Логи**:

   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

4. **GitHub Issues** (если публичный репозиторий)

### Как сообщить об ошибке?

Предоставьте:

1. Описание проблемы
2. Шаги для воспроизведения
3. Логи: `docker compose -f docker-compose.prod.yml logs`
4. Версии: `docker --version`, `node --version`
5. .env файл (БЕЗ секретов!)

---

**Не нашли ответ? Смотрите полную документацию в [DEPLOYMENT.md](./DEPLOYMENT.md)**
