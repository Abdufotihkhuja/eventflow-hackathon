# Настройка SMTP для отправки email

## 📧 Быстрая настройка

Добавьте следующие переменные в `.env` файл:

```env
# SMTP конфигурация
MAIL_HOST=smtp.example.com          # Ваш SMTP сервер
MAIL_PORT=587                        # 587 для TLS, 465 для SSL
MAIL_SECURE=false                    # true для SSL (порт 465)
MAIL_USER=info@eventflow.uz          # Логин SMTP
MAIL_PASSWORD=ваш_пароль             # Пароль от почты
MAIL_FROM="EventFlow <info@eventflow.uz>"
FRONTEND_APP_URL=https://app.eventflow.uz
```

---

## 🌐 Настройки популярных провайдеров

### Gmail

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=ваш_email@gmail.com
MAIL_PASSWORD=app_password              # НЕ обычный пароль!
MAIL_FROM="EventFlow <ваш_email@gmail.com>"
```

**⚠️ Важно для Gmail:**
1. Включите двухфакторную аутентификацию
2. Создайте "Пароль приложения": https://myaccount.google.com/apppasswords
3. Используйте этот пароль в `MAIL_PASSWORD`

---

### Yandex Mail

```env
MAIL_HOST=smtp.yandex.ru
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=info@eventflow.uz
MAIL_PASSWORD=ваш_пароль
MAIL_FROM="EventFlow <info@eventflow.uz>"
```

---

### Mail.ru

```env
MAIL_HOST=smtp.mail.ru
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=ваш_email@mail.ru
MAIL_PASSWORD=ваш_пароль
MAIL_FROM="EventFlow <ваш_email@mail.ru>"
```

---

### SendGrid

```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=apikey                        # Буквально "apikey"
MAIL_PASSWORD=ваш_sendgrid_api_key
MAIL_FROM="EventFlow <info@eventflow.uz>"
```

---

### Amazon SES

```env
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=ваш_aws_smtp_username
MAIL_PASSWORD=ваш_aws_smtp_password
MAIL_FROM="EventFlow <info@eventflow.uz>"
```

---

### Mailgun

```env
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=postmaster@вашдомен.mailgun.org
MAIL_PASSWORD=ваш_mailgun_smtp_password
MAIL_FROM="EventFlow <info@eventflow.uz>"
```

---

### Собственный SMTP сервер (cPanel, Plesk)

```env
MAIL_HOST=mail.yourdomain.com           # Или IP сервера
MAIL_PORT=587                           # Уточните у хостера
MAIL_SECURE=false                       # Уточните у хостера
MAIL_USER=info@eventflow.uz
MAIL_PASSWORD=ваш_пароль
MAIL_FROM="EventFlow <info@eventflow.uz>"
```

---

## 🔧 Применение изменений

После добавления переменных в `.env`:

```bash
# 1. Остановка контейнеров
docker compose -f docker-compose.prod.yml down

# 2. Запуск с новыми переменными
docker compose -f docker-compose.prod.yml up -d

# 3. Проверка переменных в контейнере
docker exec eventflow_api_prod printenv | grep MAIL_

# 4. Проверка логов
docker logs eventflow_api_prod --tail 50
```

---

## 🧪 Тестирование отправки email

### Через API

```bash
# Регистрация пользователя (автоматически отправит код)
curl -X POST https://eventflow.uz/api/v1/auth/register/user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Проверка логов

```bash
# Смотрите логи в реальном времени
docker logs -f eventflow_api_prod | grep -i mail

# Успешная отправка:
# [VerificationService] Код EMAIL_VERIFICATION отправлен на test@example.com

# Ошибка:
# [MailService] Ошибка при отправке кода подтверждения
```

---

## ❌ Устранение проблем

### `ECONNREFUSED 127.0.0.1:1025`

**Причина:** Переменные окружения не настроены.

**Решение:** Добавьте все `MAIL_*` переменные в `.env` и перезапустите контейнеры.

---

### `Invalid login: 535 Authentication failed`

**Причина:** Неправильный логин или пароль.

**Решение:**
- Проверьте `MAIL_USER` и `MAIL_PASSWORD`
- Для Gmail используйте "Пароль приложения"
- Для некоторых провайдеров нужно включить "Доступ для недоверенных приложений"

---

### `ETIMEDOUT` или `ENOTFOUND`

**Причина:** Неправильный `MAIL_HOST` или проблемы с сетью.

**Решение:**
- Проверьте правильность `MAIL_HOST`
- Убедитесь, что сервер имеет доступ к интернету
- Проверьте firewall правила

---

### Письма попадают в спам

**Решение:**
- Настройте SPF, DKIM, DMARC записи для вашего домена
- Используйте профессиональные SMTP сервисы (SendGrid, Mailgun)
- Убедитесь, что `MAIL_FROM` совпадает с доменом

---

## 📝 Пример полного `.env` файла

```env
# Database
POSTGRES_USER=eventflow_user
POSTGRES_PASSWORD=сложный_пароль
POSTGRES_DB=eventflow_db

# JWT
JWT_SECRET=ваш_секретный_ключ
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGINS=https://eventflow.uz,https://app.eventflow.uz

# OAuth (Google)
GOOGLE_CLIENT_ID=ваш_google_client_id
GOOGLE_CLIENT_SECRET=ваш_google_secret
GOOGLE_CALLBACK_URL=https://eventflow.uz/api/v1/auth/google/callback

# OAuth (LinkedIn)
LINKEDIN_CLIENT_ID=ваш_linkedin_client_id
LINKEDIN_CLIENT_SECRET=ваш_linkedin_secret
LINKEDIN_CALLBACK_URL=https://eventflow.uz/api/v1/auth/linkedin/callback

# SMTP (Пример для Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=info@eventflow.uz
MAIL_PASSWORD=ваш_app_password
MAIL_FROM="EventFlow <info@eventflow.uz>"
FRONTEND_APP_URL=https://app.eventflow.uz
```

---

## 🔐 Безопасность

- ❌ **Никогда** не коммитьте `.env` файл в Git
- ✅ Используйте сложные пароли
- ✅ Для Gmail используйте "Пароли приложений", а не основной пароль
- ✅ Храните резервные копии `.env` в безопасном месте
- ✅ Регулярно ротируйте пароли и ключи
