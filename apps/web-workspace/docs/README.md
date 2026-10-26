# Документация `apps/web-workspace`

Эта папка содержит рабочую документацию organizer workspace приложения.

## Быстрый вход

- [SETUP.md](SETUP.md) — установка, конфигурация и локальный запуск

## Основные документы

- [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) — auth flow и интеграция с API
- [FEATURED_EVENTS_IMPLEMENTATION.md](FEATURED_EVENTS_IMPLEMENTATION.md) — featured events
- [TASK_MANAGEMENT_README.md](TASK_MANAGEMENT_README.md) — модуль boards/tasks
- [STATS_IMPLEMENTATION.md](STATS_IMPLEMENTATION.md) — dashboard statistics
- [EVENTS_QUERY_OPTIMIZATION.md](EVENTS_QUERY_OPTIMIZATION.md) — оптимизация запросов событий

## Границы

- app-specific implementation docs остаются в `apps/web-workspace/docs/`
- временные task notes идут в `apps/web-workspace/tasks/`
- платформенные и cross-app материалы идут в корневую [docs/](../../../docs/README.md)

## Правила

- не используй эту папку как архив закрытых задач
- скрытые temporary summaries и generated artefacts здесь не хранятся
- подробные app-level правила смотри в `../.cursor/rules/docs-organization.mdc`
