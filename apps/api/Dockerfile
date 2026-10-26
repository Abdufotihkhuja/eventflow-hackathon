# ==================== BUILD STAGE ====================
FROM node:22-alpine AS builder

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_AUDIT=false

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости приложения в изолированном app-контексте
RUN for attempt in 1 2 3 4 5; do npm install --prefer-offline --no-audit && break; if [ "$attempt" = 5 ]; then exit 1; fi; echo "npm install failed, retrying in 15s... ($attempt/5)"; sleep 15; done

# Копируем исходный код (включая prisma схему)
COPY . .

# Dummy DATABASE_URL для генерации Prisma клиента (не требует реального подключения)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

# Генерируем Prisma клиент и собираем приложение
RUN npx prisma generate
RUN npm run build

# ==================== PRODUCTION STAGE ====================
FROM node:22-alpine AS production

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_AUDIT=false

# Создаём non-root пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Копируем package.json для production зависимостей
COPY package*.json ./

# Устанавливаем только production зависимости приложения
RUN for attempt in 1 2 3 4 5; do npm install --omit=dev --prefer-offline --no-audit && break; if [ "$attempt" = 5 ]; then exit 1; fi; echo "npm install failed, retrying in 15s... ($attempt/5)"; sleep 15; done

# Копируем Prisma схему и конфиг
COPY prisma ./prisma/
COPY prisma.config.ts ./prisma.config.ts

# Dummy DATABASE_URL для генерации Prisma клиента (не требует реального подключения)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

# Генерируем Prisma клиент (используя актуальную схему)
RUN npx prisma generate

# Копируем собранное приложение из builder
COPY --from=builder /app/dist ./dist

# Копируем entrypoint скрипт
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Создаём директорию для локального storage volume
RUN mkdir -p /data/uploads && chown -R nestjs:nodejs /data/uploads

# Меняем владельца файлов
RUN chown -R nestjs:nodejs /app

# Переключаемся на non-root пользователя
USER nestjs

# Экспонируем порт
EXPOSE 3000

# Запускаем приложение через entrypoint.
# Миграции применяет отдельный one-shot сервис `migrate` в compose, не entrypoint.
ENTRYPOINT ["./docker-entrypoint.sh"]

# ==================== DEVELOPMENT STAGE ====================
FROM node:22-alpine AS development

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_AUDIT=false

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем все зависимости (включая devDependencies)
RUN for attempt in 1 2 3 4 5; do npm install --prefer-offline --no-audit && break; if [ "$attempt" = 5 ]; then exit 1; fi; echo "npm install failed, retrying in 15s... ($attempt/5)"; sleep 15; done

# Копируем исходный код (включая prisma схему)
COPY . .

# Dummy DATABASE_URL для генерации Prisma клиента (не требует реального подключения)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

# Генерируем Prisma клиент
RUN npx prisma generate

# Экспонируем порт
EXPOSE 3000

# Запускаем в режиме разработки
CMD ["/bin/sh", "-lc", "npm run db:generate && npx prisma migrate deploy && npm run start:dev"]
