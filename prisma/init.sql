-- Инициализация базы данных PostgreSQL для Portfolio приложения
-- Этот файл выполняется при первом запуске контейнера PostgreSQL

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Создание пользователя приложения (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'portfolio_user') THEN
        CREATE ROLE portfolio_user WITH LOGIN PASSWORD 'portfolio_password';
    END IF;
END
$$;

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE portfolio TO portfolio_user;
GRANT ALL ON SCHEMA public TO portfolio_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO portfolio_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO portfolio_user;

-- Настройка производительности
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Применение настроек
SELECT pg_reload_conf();
