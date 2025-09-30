#!/bin/bash

# ===============================================
# Быстрая установка Docker и базовая настройка
# ===============================================

set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1"
    exit 1
}

# Проверяем, установлен ли уже Docker
if command -v docker >/dev/null 2>&1; then
    log "Docker уже установлен: $(docker --version)"
    if docker compose version >/dev/null 2>&1; then
        log "Docker Compose уже установлен: $(docker compose version)"
        exit 0
    fi
fi

log "Установка Docker..."

# Обновляем систему
apt update

# Устанавливаем зависимости
apt install -y ca-certificates curl gnupg lsb-release

# Добавляем официальный GPG ключ Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавляем репозиторий Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновляем индекс пакетов
apt update

# Устанавливаем Docker
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Запускаем Docker
systemctl start docker
systemctl enable docker

# Создаем пользователя portfolio если не существует
if ! id "portfolio" &>/dev/null; then
    log "Создание пользователя portfolio..."
    useradd -m -s /bin/bash portfolio
fi

# Добавляем пользователя в группу docker
usermod -aG docker portfolio

# Создаем директории
mkdir -p /home/portfolio
chown -R portfolio:portfolio /home/portfolio

# Проверяем установку
docker --version
docker compose version

log "Docker установлен успешно!"
log "Пользователь portfolio создан и добавлен в группу docker"
