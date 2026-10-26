# Документация `apps/api`

Эта папка содержит рабочую документацию backend-приложения `apps/api`.

## Что хранить здесь

- backend и API спецификации
- deployment, operations и troubleshooting для `apps/api`
- интеграционные документы для frontend-команд, если они описывают реальные backend-контракты
- миграции, changelog-и и feature notes, если они относятся именно к API

## Основные документы

- [QUICK_START.md](QUICK_START.md) — legacy note о старом app-local deploy flow
- [FAQ.md](FAQ.md) — частые вопросы по backend
- [API_PUBLIC.md](API_PUBLIC.md) — публичная API-поверхность
- [API_ORGANIZER.md](API_ORGANIZER.md) — organizer API
- [API_USER.md](API_USER.md) — account/user API
- [API_SUPER_ADMIN.md](API_SUPER_ADMIN.md) — super-admin API

## Интеграционные документы

В этой папке допустимы frontend-oriented документы только тогда, когда они фиксируют реальный backend-контракт или backend-guided integration.

Примеры:

- [CHECK_IN_FRONTEND.md](CHECK_IN_FRONTEND.md)
- [CERTIFICATES_ORGANIZATION_FRONTEND.md](CERTIFICATES_ORGANIZATION_FRONTEND.md)
- [EVENT_ENHANCEMENTS_FRONTEND_GUIDE.md](EVENT_ENHANCEMENTS_FRONTEND_GUIDE.md)

Оставшиеся `FRONTEND_*` файлы в `apps/api/docs/` считаются integration docs, а не scaffold или prompt-артефактами.

## Что сюда не класть

- prompt/scaffold документы
- архив закрытых задач
- платформенную документацию, относящуюся к нескольким приложениям сразу

Для кросс-приложенных материалов используй корневую папку [docs/](../../../docs/README.md).
