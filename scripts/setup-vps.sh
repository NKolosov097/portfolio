#!/bin/bash

# ===============================================
# Скрипт первоначальной настройки VPS для nkolosov.com
# ===============================================

set -e

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

# Проверка прав root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Этот скрипт должен быть запущен от имени root"
    fi
}

# Обновление системы
update_system() {
    log "Обновление системы..."
    apt update
    apt upgrade -y
    apt install -y curl wget git unzip htop nano vim software-properties-common apt-transport-https ca-certificates gnupg lsb-release
}

# Установка Docker
install_docker() {
    log "Установка Docker..."
    
    # Удаляем старые версии если есть
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Добавляем официальный GPG ключ Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Добавляем репозиторий Docker
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Устанавливаем Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Запускаем и включаем автозапуск Docker
    systemctl start docker
    systemctl enable docker
    
    # Проверяем установку
    docker --version
    docker compose version
    
    log "Docker установлен успешно"
}

# Создание пользователя portfolio
create_portfolio_user() {
    log "Создание пользователя portfolio..."
    
    # Создаем пользователя если не существует
    if ! id "portfolio" &>/dev/null; then
        useradd -m -s /bin/bash portfolio
        log "Пользователь portfolio создан"
    else
        log "Пользователь portfolio уже существует"
    fi
    
    # Добавляем в группу docker
    usermod -aG docker portfolio
    
    # Создаем директории
    mkdir -p /home/portfolio
    chown -R portfolio:portfolio /home/portfolio
    
    log "Пользователь portfolio настроен"
}

# Настройка файрвола
setup_firewall() {
    log "Настройка файрвола..."
    
    # Устанавливаем ufw если не установлен
    apt install -y ufw
    
    # Сбрасываем правила
    ufw --force reset
    
    # Базовые правила
    ufw default deny incoming
    ufw default allow outgoing
    
    # Разрешаем SSH
    ufw allow ssh
    ufw allow 22/tcp
    
    # Разрешаем HTTP и HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Включаем файрвол
    ufw --force enable
    
    log "Файрвол настроен"
}

# Настройка Nginx (базовая)
setup_nginx() {
    log "Установка и настройка Nginx..."
    
    apt install -y nginx
    
    # Создаем базовую конфигурацию
    cat > /etc/nginx/sites-available/nkolosov.com << 'EOF'
server {
    listen 80;
    server_name nkolosov.com www.nkolosov.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:3000/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    # Включаем сайт
    ln -sf /etc/nginx/sites-available/nkolosov.com /etc/nginx/sites-enabled/
    
    # Удаляем дефолтный сайт
    rm -f /etc/nginx/sites-enabled/default
    
    # Проверяем конфигурацию
    nginx -t
    
    # Перезапускаем Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log "Nginx настроен"
}

# Настройка SSL с помощью Certbot
setup_ssl() {
    log "Установка Certbot для SSL..."
    
    # Устанавливаем certbot
    apt install -y certbot python3-certbot-nginx
    
    log "Certbot установлен. SSL сертификат будет настроен после первого деплоя приложения"
}

# Создание директории для логов
setup_logging() {
    log "Настройка системы логирования..."
    
    mkdir -p /var/log/portfolio
    chown portfolio:portfolio /var/log/portfolio
    
    # Настройка ротации логов
    cat > /etc/logrotate.d/portfolio << 'EOF'
/var/log/portfolio/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 portfolio portfolio
    postrotate
        docker restart portfolio_app 2>/dev/null || true
    endscript
}
EOF

    log "Система логирования настроена"
}

# Настройка системных ресурсов
optimize_system() {
    log "Оптимизация системных ресурсов..."
    
    # Увеличиваем лимиты файлов
    cat >> /etc/security/limits.conf << 'EOF'
portfolio soft nofile 65536
portfolio hard nofile 65536
EOF

    # Настройки sysctl для производительности
    cat >> /etc/sysctl.conf << 'EOF'
# Portfolio app optimizations
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_keepalive_time = 600
vm.swappiness = 10
EOF

    sysctl -p
    
    log "Система оптимизирована"
}

# Создание базового .env файла
create_env_template() {
    log "Создание шаблона .env файла..."
    
    mkdir -p /home/portfolio
    
    # Генерируем случайные пароли
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 24)
    
    cat > /home/portfolio/.env << EOF
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

# Email Configuration (настройте вручную)
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

    chown portfolio:portfolio /home/portfolio/.env
    chmod 600 /home/portfolio/.env
    
    log ".env шаблон создан в /home/portfolio/.env"
}

# Проверка установки
verify_installation() {
    log "Проверка установки..."
    
    # Проверяем Docker
    if docker --version >/dev/null 2>&1; then
        log "✅ Docker установлен: $(docker --version)"
    else
        error "❌ Docker не установлен"
    fi
    
    # Проверяем Docker Compose
    if docker compose version >/dev/null 2>&1; then
        log "✅ Docker Compose установлен: $(docker compose version)"
    else
        error "❌ Docker Compose не установлен"
    fi
    
    # Проверяем Nginx
    if nginx -v >/dev/null 2>&1; then
        log "✅ Nginx установлен: $(nginx -v 2>&1)"
    else
        error "❌ Nginx не установлен"
    fi
    
    # Проверяем пользователя
    if id portfolio >/dev/null 2>&1; then
        log "✅ Пользователь portfolio создан"
    else
        error "❌ Пользователь portfolio не создан"
    fi
    
    # Проверяем группы пользователя
    if groups portfolio | grep -q docker; then
        log "✅ Пользователь portfolio добавлен в группу docker"
    else
        error "❌ Пользователь portfolio не в группе docker"
    fi
    
    log "Проверка завершена успешно!"
}

# Показать информацию о следующих шагах
show_next_steps() {
    echo ""
    echo -e "${BLUE}=== VPS настроен успешно! ===${NC}"
    echo -e "🖥️  Сервер: $(hostname -I | awk '{print $1}')"
    echo -e "🌐 Домен: nkolosov.com"
    echo -e "📁 Директория проекта: /home/portfolio"
    echo ""
    echo -e "${BLUE}=== Следующие шаги ===${NC}"
    echo -e "1. Настройте DNS записи домена на IP сервера"
    echo -e "2. Обновите .env файл: ${YELLOW}nano /home/portfolio/.env${NC}"
    echo -e "3. Запустите деплой через GitHub Actions"
    echo -e "4. Настройте SSL: ${YELLOW}certbot --nginx -d nkolosov.com -d www.nkolosov.com${NC}"
    echo ""
    echo -e "${BLUE}=== Полезные команды ===${NC}"
    echo -e "Просмотр логов: ${YELLOW}docker logs portfolio_app${NC}"
    echo -e "Статус сервисов: ${YELLOW}docker ps${NC}"
    echo -e "Перезапуск Nginx: ${YELLOW}systemctl restart nginx${NC}"
    echo ""
}

# Главная функция
main() {
    log "Начинаем настройку VPS сервера для nkolosov.com..."
    
    check_root
    update_system
    install_docker
    create_portfolio_user
    setup_firewall
    setup_nginx
    setup_ssl
    setup_logging
    optimize_system
    create_env_template
    verify_installation
    show_next_steps
    
    log "Настройка VPS завершена успешно! 🎉"
}

# Обработка прерывания
trap 'echo -e "\n${RED}Настройка прервана пользователем${NC}"; exit 1' INT

# Запуск
main "$@"