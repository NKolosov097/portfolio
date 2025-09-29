# Portfolio Application Makefile
# Упрощенные команды для управления приложением

.PHONY: help install dev build start stop restart logs clean backup deploy setup-vps health

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BLUE := \033[34m
NC := \033[0m

help: ## Показать справку по командам
	@echo "${BLUE}Portfolio Application - Доступные команды:${NC}"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-20s${NC} %s\n", $$1, $$2}'

# Development commands
install: ## Установить зависимости
	@echo "${YELLOW}Установка зависимостей...${NC}"
	pnpm install

dev: ## Запустить в режиме разработки
	@echo "${YELLOW}Запуск в режиме разработки...${NC}"
	pnpm dev

dev-db: ## Запустить только базу данных для разработки
	@echo "${YELLOW}Запуск базы данных для разработки...${NC}"
	docker-compose -f docker-compose.dev.yml up -d postgres redis adminer

build: ## Собрать приложение
	@echo "${YELLOW}Сборка приложения...${NC}"
	pnpm build

# Docker commands
docker-build: ## Собрать Docker образ
	@echo "${YELLOW}Сборка Docker образа...${NC}"
	docker-compose build

start: ## Запустить все сервисы
	@echo "${YELLOW}Запуск всех сервисов...${NC}"
	docker-compose up -d

stop: ## Остановить все сервисы
	@echo "${YELLOW}Остановка всех сервисов...${NC}"
	docker-compose down

restart: ## Перезапустить все сервисы
	@echo "${YELLOW}Перезапуск всех сервисов...${NC}"
	docker-compose restart

restart-app: ## Перезапустить только приложение
	@echo "${YELLOW}Перезапуск приложения...${NC}"
	docker-compose restart app

# Logs and monitoring
logs: ## Показать логи всех сервисов
	docker-compose logs -f

logs-app: ## Показать логи приложения
	docker-compose logs -f app

logs-db: ## Показать логи базы данных
	docker-compose logs -f postgres

logs-nginx: ## Показать логи Nginx
	docker-compose logs -f nginx

status: ## Показать статус сервисов
	@echo "${BLUE}Статус Docker контейнеров:${NC}"
	docker-compose ps
	@echo ""
	@echo "${BLUE}Использование ресурсов:${NC}"
	docker stats --no-stream

health: ## Проверить здоровье приложения
	@echo "${YELLOW}Проверка здоровья приложения...${NC}"
	@./scripts/deploy.sh health || echo "${RED}Health check failed${NC}"

# Database commands
db-migrate: ## Выполнить миграции базы данных
	@echo "${YELLOW}Выполнение миграций базы данных...${NC}"
	docker-compose exec app pnpm prisma migrate deploy

db-generate: ## Сгенерировать Prisma клиент
	@echo "${YELLOW}Генерация Prisma клиента...${NC}"
	docker-compose exec app pnpm prisma generate

db-seed: ## Заполнить базу данных тестовыми данными
	@echo "${YELLOW}Заполнение базы данных...${NC}"
	docker-compose exec app pnpm prisma db seed

db-reset: ## Сбросить базу данных (ОСТОРОЖНО!)
	@echo "${RED}ВНИМАНИЕ: Это удалит все данные в базе!${NC}"
	@read -p "Вы уверены? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose exec app pnpm prisma migrate reset

db-backup: ## Создать бэкап базы данных
	@echo "${YELLOW}Создание бэкапа базы данных...${NC}"
	./scripts/backup.sh database

# Backup and maintenance
backup: ## Создать полный бэкап
	@echo "${YELLOW}Создание полного бэкапа...${NC}"
	sudo ./scripts/backup.sh full

backup-files: ## Создать бэкап файлов
	@echo "${YELLOW}Создание бэкапа файлов...${NC}"
	sudo ./scripts/backup.sh files

clean: ## Очистить неиспользуемые Docker ресурсы
	@echo "${YELLOW}Очистка Docker ресурсов...${NC}"
	docker system prune -f
	docker volume prune -f
	docker image prune -f

clean-all: ## Полная очистка (ОСТОРОЖНО!)
	@echo "${RED}ВНИМАНИЕ: Это удалит все неиспользуемые Docker данные!${NC}"
	@read -p "Вы уверены? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker system prune -a -f --volumes

# Deployment commands
setup-vps: ## Настроить VPS сервер
	@echo "${YELLOW}Настройка VPS сервера...${NC}"
	sudo ./scripts/setup-vps.sh

deploy: ## Развернуть приложение на продакшене
	@echo "${YELLOW}Деплой приложения...${NC}"
	sudo ./scripts/deploy.sh

deploy-dev: ## Развернуть в режиме разработки
	@echo "${YELLOW}Деплой в режиме разработки...${NC}"
	docker-compose -f docker-compose.dev.yml up -d

# SSL and security
ssl-cert: ## Получить SSL сертификат Let's Encrypt
	@echo "${YELLOW}Получение SSL сертификата...${NC}"
	@read -p "Введите ваш домен: " domain; \
	sudo certbot --nginx -d $$domain

ssl-renew: ## Обновить SSL сертификаты
	@echo "${YELLOW}Обновление SSL сертификатов...${NC}"
	sudo certbot renew
	docker restart portfolio_nginx

# Development utilities
lint: ## Проверить код линтерами
	@echo "${YELLOW}Проверка кода линтерами...${NC}"
	pnpm lint

format: ## Форматировать код
	@echo "${YELLOW}Форматирование кода...${NC}"
	pnpm format

test: ## Запустить тесты
	@echo "${YELLOW}Запуск тестов...${NC}"
	pnpm test

type-check: ## Проверить типы TypeScript
	@echo "${YELLOW}Проверка типов TypeScript...${NC}"
	pnpm check-types

# Environment setup
env: ## Создать .env файл из примера
	@if [ ! -f .env ]; then \
		echo "${YELLOW}Создание .env файла...${NC}"; \
		cp env.example .env; \
		echo "${GREEN}.env файл создан. Отредактируйте его перед запуском!${NC}"; \
	else \
		echo "${YELLOW}.env файл уже существует${NC}"; \
	fi

# Quick start
quick-start: env docker-build start db-migrate ## Быстрый старт (создать env, собрать, запустить, мигрировать)
	@echo "${GREEN}Приложение запущено! Доступно по адресу: http://localhost${NC}"

# VPS deployment
deploy-vps: ## Полный деплой на VPS nkolosov.com
	@echo "${YELLOW}Деплой на VPS nkolosov.com...${NC}"
	./scripts/deploy-to-vps.sh full

deploy-vps-setup: ## Настройка VPS сервера
	@echo "${YELLOW}Настройка VPS сервера...${NC}"
	./scripts/deploy-to-vps.sh setup

deploy-vps-app: ## Деплой только приложения на VPS
	@echo "${YELLOW}Деплой приложения на VPS...${NC}"
	./scripts/deploy-to-vps.sh deploy

deploy-vps-ssl: ## Настройка SSL на VPS
	@echo "${YELLOW}Настройка SSL на VPS...${NC}"
	./scripts/deploy-to-vps.sh ssl

check-vps: ## Проверить работоспособность на VPS
	@echo "${YELLOW}Проверка VPS...${NC}"
	./scripts/deploy-to-vps.sh check

# Production deployment
prod-deploy: backup deploy health ## Полный деплой на продакшене (бэкап + деплой + проверка)
	@echo "${GREEN}Продакшн деплой завершен!${NC}"

# Update application
update: ## Обновить приложение (git pull + rebuild + restart)
	@echo "${YELLOW}Обновление приложения...${NC}"
	git pull origin main
	docker-compose build --no-cache app
	docker-compose up -d app
	@echo "${GREEN}Приложение обновлено!${NC}"

# Emergency commands
emergency-stop: ## Экстренная остановка всех сервисов
	@echo "${RED}Экстренная остановка всех сервисов...${NC}"
	docker-compose down --remove-orphans
	docker stop $$(docker ps -q) 2>/dev/null || true

emergency-restart: ## Экстренный перезапуск
	@echo "${RED}Экстренный перезапуск...${NC}"
	$(MAKE) emergency-stop
	sleep 5
	$(MAKE) start

# Monitoring commands
monitoring-start: ## Запустить мониторинг (Prometheus + Grafana)
	@echo "${YELLOW}Запуск мониторинга...${NC}"
	docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d

monitoring-stop: ## Остановить мониторинг
	@echo "${YELLOW}Остановка мониторинга...${NC}"
	docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring down

monitoring-logs: ## Показать логи мониторинга
	docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml logs -f prometheus grafana

# Information
info: ## Показать информацию о системе
	@echo "${BLUE}=== Информация о системе ===${NC}"
	@echo "Docker версия: $$(docker --version)"
	@echo "Docker Compose версия: $$(docker-compose --version 2>/dev/null || docker compose version)"
	@echo "Доступная память: $$(free -h | grep Mem | awk '{print $$7}' 2>/dev/null || echo 'N/A')"
	@echo "Свободное место: $$(df -h . | tail -1 | awk '{print $$4}' 2>/dev/null || echo 'N/A')"
	@echo ""
	@echo "${BLUE}=== Статус сервисов ===${NC}"
	@$(MAKE) status
