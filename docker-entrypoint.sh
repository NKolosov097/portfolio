#!/bin/sh

echo "🚀 Starting application entrypoint..."

# Установка значений по умолчанию для переменных окружения
POSTGRES_USER=${POSTGRES_USER:-portfolio_user}
POSTGRES_DB=${POSTGRES_DB:-portfolio}
POSTGRES_HOST=${POSTGRES_HOST:-postgres}

# Ожидание доступности базы данных
echo "⏳ Waiting for database to be ready..."
echo "   Host: ${POSTGRES_HOST}, User: ${POSTGRES_USER}, Database: ${POSTGRES_DB}"

retries=30
until pg_isready -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" 2>/dev/null || [ $retries -eq 0 ]; do
  echo "   Database is unavailable - sleeping (retries left: $retries)"
  retries=$((retries-1))
  sleep 2
done

if [ $retries -eq 0 ]; then
  echo "❌ Database is not available after 60 seconds, but continuing..."
else
  echo "✅ Database is ready!"
fi

# Выполнение миграций Prisma
echo "📦 Running Prisma migrations..."
if pnpm prisma migrate deploy; then
  echo "✅ Migrations completed successfully!"
else
  echo "⚠️  Migration failed, but continuing..."
fi

# Генерация Prisma Client (на случай если нужна)
echo "🔧 Generating Prisma Client..."
if pnpm prisma generate; then
  echo "✅ Prisma Client generated successfully!"
else
  echo "⚠️  Prisma generate failed, but continuing..."
fi

echo "✅ Entrypoint completed successfully!"

# Запуск приложения
exec "$@"

