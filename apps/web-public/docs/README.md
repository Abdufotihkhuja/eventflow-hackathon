# Документация `apps/web-public`

Эта папка содержит рабочую документацию публичного web-приложения EventFlow.

## Что хранить здесь

- implementation notes и feature docs для `web-public`
- UI/UX документы и app-specific спецификации
- integration docs для публичного frontend
- usage guides и troubleshooting именно этого приложения

## Примеры рабочих документов

- `AUTH_PAGES_IMPLEMENTATION.md`
- `BLOG_IMPROVEMENTS.md`
- `HERO_SHOWCASE_UX.md`
- `LOGIN_PAGE_IMPLEMENTATION.md`
- `ORGANIZATION_EMAIL_VERIFICATION.md`
- `PAST_EVENTS_USAGE.md`

## Границы

- app-specific материалы остаются в `apps/web-public/docs/`
- временные task notes идут в `apps/web-public/tasks/`
- платформенные и cross-app документы идут в корневую [docs/](../../../docs/README.md)

## Правила

- не возвращай сюда scaffold/prompt документы
- не используй эту папку как архив закрытых задач
- подробные app-level правила смотри в `../.cursor/rules/documentation.mdc`
