# Dockerfile для Next.js приложения с Prisma и pnpm
# Multi-stage build для оптимизации размера образа

# Stage 1: Dependencies - установка зависимостей
FROM node:22-alpine AS deps
LABEL maintainer="Portfolio App"
LABEL description="Next.js Portfolio Application with Prisma"

# Установка pnpm глобально
RUN corepack enable && corepack prepare pnpm@latest --activate

# Создание пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Установка системных зависимостей для Alpine
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    dumb-init

# Установка рабочей директории
WORKDIR /app

# Копирование файлов для установки зависимостей
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Установка зависимостей
RUN pnpm config set store-dir ~/.pnpm-store
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder - сборка приложения
FROM node:22-alpine AS builder

# Установка pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Установка системных зависимостей
RUN apk add --no-cache libc6-compat openssl ca-certificates

WORKDIR /app

# Копирование зависимостей из предыдущего stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерация Prisma Client
RUN pnpm prisma generate

# Сборка Next.js приложения
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# Stage 3: Runner - финальный образ для запуска
FROM node:22-alpine AS runner

# Установка pnpm и системных зависимостей
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    dumb-init \
    curl

WORKDIR /app

# Создание пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копирование необходимых файлов для production
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Копирование Prisma схемы и миграций
COPY --from=builder /app/prisma ./prisma

# Копирование сборки Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Установка только production зависимостей
RUN pnpm install --frozen-lockfile --prod

# Генерация Prisma Client в production
RUN pnpm prisma generate

# Создание директорий и установка прав
RUN mkdir -p /app/.next/cache /app/logs
RUN chown -R nextjs:nodejs /app

# Переключение на непривилегированного пользователя
USER nextjs

# Настройка переменных окружения
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose порт
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Запуск приложения с dumb-init для корректной обработки сигналов
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
