# Changelog

Все важные изменения в проекте EventFlow Backend.

---

## [1.2.3] - 2026-01-15

### 🗑️ Удалено

- **Удален функционал конвертации роли после OAuth**
  - Убран endpoint `POST /api/v1/auth/convert-to-organization`
  - Удален метод `convertUserToOrganization` из `auth.service.ts`
  - Удален DTO `ConvertToOrganizationDto`
  - Удалена документация `ROLE_CONVERSION_API.md`

### 📝 Причина

OAuth теперь напрямую создает нужный тип аккаунта (User или Organization) на основе query параметра `type`.

---

## [1.2.2] - 2026-01-15

### ✨ Добавлено

- **Поля `address` и `website` для организаций**
  - Добавлено поле `address` (VARCHAR 500) в таблицу `organizations`
  - Добавлено поле `website` (VARCHAR 500) в таблицу `organizations`
  - Обновлен `UpdateOrganizationDto` с валидацией
  - Создана миграция `20260115130843_add_address_website_to_organization`

### 📚 Документация

- Добавлен `docs/ORGANIZATION_UPDATE_FIELDS.md`

---

## [1.2.0] - 2026-01-15

### ✨ Добавлено

- **Поле `isOnboardingCompleted`** для User, Organization и OrganizationMember
  - Отслеживание завершения процесса онбординга
  - Автоматическое возвращение в OAuth response
  - Доступно в profile endpoints (`/account/me`, `/workspace/me`, `/workspace/members/me`)

- **Новые endpoints для завершения онбординга:**
  - `POST /api/v1/account/me/complete-onboarding`
  - `POST /api/v1/workspace/me/complete-onboarding`
  - `POST /api/v1/workspace/members/me/complete-onboarding`

- **Улучшена OAuth аутентификация:**
  - Поле `isNewUser` теперь корректно возвращается при первой аутентификации
  - Поле `isOnboardingCompleted` добавлено в `TokensResponseDto`

### 🔧 Изменено

- **OAuth Response** теперь включает `isOnboardingCompleted`
- **Profile endpoints** возвращают статус завершения онбординга
- Существующие пользователи автоматически помечены как завершившие онбординг

### 📚 Документация

- Добавлен `docs/ONBOARDING_COMPLETED_FIELD.md`
- Обновлен `docs/OAUTH_NEW_USER_FLAG.md`
- Добавлен `tasks/ONBOARDING_FIELD_IMPLEMENTATION.md`

### 🗄️ База данных

- Миграция `20260115115641_add_onboarding_completed_field`
- Добавлено поле `is_onboarding_completed` в таблицы:
  - `users`
  - `organizations`
  - `organization_members`

---

## [1.1.0] - 2026-01-14

### ✨ Добавлено

- **Замена `fullName` на `firstName` и `lastName`**
  - Раздельные поля для имени и фамилии
  - Утилита `parseFullName()` для OAuth
  - Миграция БД для существующих данных

### 📚 Документация

- Добавлен `docs/FULLNAME_TO_FIRSTNAME_LASTNAME_MIGRATION.md`

---

## [1.0.0] - 2025-12-23

### ✨ Первый релиз

- Базовая аутентификация (Email, Google OAuth, LinkedIn OAuth)
- Управление пользователями
- Управление организациями
- Управление сотрудниками организаций
- Система ролей и прав доступа
- Управление мероприятиями
- Регистрация на мероприятия
- Календарь активности
- Сертификаты пользователей
- Сохраненные статьи
- Настройки приватности
- Email верификация
- Супер-админ панель

---

## Формат

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

### Типы изменений

- **✨ Добавлено** - для новых функций
- **🔧 Изменено** - для изменений существующей функциональности
- **⚠️ Устарело** - для функций, которые скоро будут удалены
- **🗑️ Удалено** - для удаленных функций
- **🐛 Исправлено** - для исправления багов
- **🔒 Безопасность** - для исправлений уязвимостей
- **📚 Документация** - для изменений в документации
- **🗄️ База данных** - для изменений схемы БД
