#!/bin/bash

# ===============================================
# Быстрый деплой на VPS nkolosov.com
# ===============================================

set -e

# Конфигурация VPS
VPS_HOST="79.174.78.124"
VPS_USER="root"
VPS_DOMAIN="nkolosov.com"
PROJECT_DIR="/home/portfolio"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Проверка SSH ключа
check_ssh_key() {
    if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
        warning "SSH ключ не найден. Создаем новый..."
        ssh-keygen -t ed25519 -C "deploy@nkolosov.com" -f ~/.ssh/id_ed25519 -N ""
        
        echo ""
        echo -e "${YELLOW}Скопируйте этот публичный ключ на VPS сервер:${NC}"
        cat ~/.ssh/id_ed25519.pub
        echo ""
        echo "Выполните на сервере:"
        echo "mkdir -p ~/.ssh && echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
        echo ""
        read -p "Нажмите Enter после добавления ключа на сервер..."
    fi
}

# Первоначальная настройка VPS
setup_vps() {
    log "Настройка VPS сервера $VPS_HOST..."
    
    # Копируем скрипт настройки на сервер
    scp scripts/setup-vps.sh $VPS_USER@$VPS_HOST:/tmp/
    
    # Запускаем настройку
    ssh $VPS_USER@$VPS_HOST << 'EOF'
        chmod +x /tmp/setup-vps.sh
        /tmp/setup-vps.sh
        rm /tmp/setup-vps.sh
EOF
    
    log "VPS настроен успешно"
}

# Создание .env файла для продакшена
create_production_env() {
    log "Создание production .env файла..."
    
    # Генерируем случайные пароли
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 24)
    
    cat > .env.production << EOF
# Production Configuration for nkolosov.com
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Next.js Settings
NEXT_TELEMETRY_DISABLED=1
NEXTAUTH_URL=https://nkolosov.com
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Database Configuration
DATABASE_URL=postgresql://portfolio_user:${DB_PASSWORD}@postgres:5432/portfolio
POSTGRES_DB=portfolio
POSTGRES_USER=portfolio_user
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_PORT=5432

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PORT=6379

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@nkolosov.com

# Security
ENCRYPTION_KEY=${ENCRYPTION_KEY}
CORS_ORIGIN=https://nkolosov.com

# Monitoring & Logging
LOG_LEVEL=info

# Docker Compose Ports
APP_PORT=3000
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# SSL Configuration
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/private.key

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
EOF

    log "Production .env файл создан"
    warning "Не забудьте настроить SMTP_USER и SMTP_PASS для отправки email"
}

# Деплой приложения
deploy_application() {
    log "Деплой приложения на $VPS_HOST..."
    
    # Создаем архив проекта
    tar -czf portfolio-deploy.tar.gz \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='logs' \
        --exclude='*.log' \
        --exclude='.env' \
        .
    
    # Копируем на сервер
    scp portfolio-deploy.tar.gz $VPS_USER@$VPS_HOST:/tmp/
    scp .env.production $VPS_USER@$VPS_HOST:/tmp/
    
    # Выполняем деплой на сервере
    ssh $VPS_USER@$VPS_HOST << EOF
        set -e
        
        # Создаем директорию проекта
        mkdir -p $PROJECT_DIR
        cd $PROJECT_DIR
        
        # Создаем бэкап если есть текущая версия
        if [ -d "current" ]; then
            mv current backup-\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        fi
        
        # Распаковываем новую версию
        mkdir -p current
        cd current
        tar -xzf /tmp/portfolio-deploy.tar.gz
        
        # Копируем .env файл
        cp /tmp/.env.production .env
        
        # Устанавливаем права
        chmod +x scripts/*.sh
        chown -R portfolio:portfolio .
        
        # Запускаем деплой
        ./scripts/deploy.sh
        
        # Очистка
        rm /tmp/portfolio-deploy.tar.gz /tmp/.env.production
        
        echo "Деплой завершен успешно!"
EOF
    
    # Очистка локальных файлов
    rm portfolio-deploy.tar.gz .env.production
    
    log "Приложение развернуто успешно!"
}

# Настройка SSL сертификата
setup_ssl() {
    log "Настройка SSL сертификата для $VPS_DOMAIN..."
    
    ssh $VPS_USER@$VPS_HOST << EOF
        # Установка certbot если не установлен
        apt update
        apt install -y certbot python3-certbot-nginx
        
        # Получение сертификата
        certbot --nginx -d $VPS_DOMAIN -d www.$VPS_DOMAIN --non-interactive --agree-tos --email noreply@$VPS_DOMAIN
        
        # Настройка автообновления
        echo "0 12 * * * /usr/bin/certbot renew --quiet && docker restart portfolio_nginx" | crontab -
        
        # Перезапуск Nginx
        docker restart portfolio_nginx
EOF
    
    log "SSL сертификат настроен"
}

# Проверка работоспособности
health_check() {
    log "Проверка работоспособности приложения..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s https://$VPS_DOMAIN/health > /dev/null; then
            log "✅ Приложение работает корректно!"
            log "🌐 Доступно по адресу: https://$VPS_DOMAIN"
            return 0
        fi
        
        info "Попытка $attempt/$max_attempts - ожидание запуска..."
        sleep 30
        ((attempt++))
    done
    
    error "Приложение не отвечает после $max_attempts попыток"
}

# Показать информацию о деплое
show_deploy_info() {
    echo ""
    echo -e "${BLUE}=== Информация о деплое ===${NC}"
    echo -e "🌐 Домен: ${GREEN}https://$VPS_DOMAIN${NC}"
    echo -e "🖥️  VPS: ${GREEN}$VPS_HOST${NC}"
    echo -e "📁 Директория: ${GREEN}$PROJECT_DIR/current${NC}"
    echo ""
    echo -e "${BLUE}=== Полезные команды ===${NC}"
    echo -e "Подключение к серверу: ${YELLOW}ssh $VPS_USER@$VPS_HOST${NC}"
    echo -e "Просмотр логов: ${YELLOW}ssh $VPS_USER@$VPS_HOST 'cd $PROJECT_DIR/current && make logs'${NC}"
    echo -e "Статус сервисов: ${YELLOW}ssh $VPS_USER@$VPS_HOST 'cd $PROJECT_DIR/current && make status'${NC}"
    echo -e "Перезапуск: ${YELLOW}ssh $VPS_USER@$VPS_HOST 'cd $PROJECT_DIR/current && make restart'${NC}"
    echo ""
}

# Главная функция
main() {
    log "Начинаем деплой Portfolio приложения на nkolosov.com"
    
    case "${1:-full}" in
        "setup")
            check_ssh_key
            setup_vps
            ;;
        "deploy")
            create_production_env
            deploy_application
            health_check
            ;;
        "ssl")
            setup_ssl
            health_check
            ;;
        "full")
            check_ssh_key
            setup_vps
            create_production_env
            deploy_application
            setup_ssl
            health_check
            show_deploy_info
            ;;
        "check")
            health_check
            ;;
        *)
            echo "Использование: $0 {full|setup|deploy|ssl|check}"
            echo "  full   - Полный деплой (настройка + деплой + SSL)"
            echo "  setup  - Только настройка VPS"
            echo "  deploy - Только деплой приложения"
            echo "  ssl    - Только настройка SSL"
            echo "  check  - Проверка работоспособности"
            exit 1
            ;;
    esac
    
    log "Операция завершена успешно! 🎉"
}

# Обработка прерывания
trap 'echo -e "\n${RED}Деплой прерван пользователем${NC}"; exit 1' INT

# Запуск
main "$@"
