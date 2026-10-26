#!/bin/sh
set -e

# Миграции БД применяет отдельный one-shot сервис `migrate` ДО старта реплик API
# (см. docker-compose.prod.yml / docker-compose.scale.yml). Здесь миграции НЕ
# запускаются, иначе при нескольких репликах они гоняются за migration-lock.
echo "🎯 Starting EventFlow API..."
exec node dist/src/main.js

