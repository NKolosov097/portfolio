# Portfolio Application - Deployment Guide

Это руководство поможет вам развернуть портфолио приложение на VPS сервере с использованием Docker.

## 🚀 Быстрый старт

### 1. Подготовка VPS сервера

```bash
# Скачайте и запустите скрипт настройки VPS
curl -fsSL https://raw.githubusercontent.com/NKolosov097/portfolio/main/scripts/setup-vps.sh | sudo bash

# Или если файлы уже на сервере:
sudo ./scripts/setup-vps.sh
```

### 2. Настройка окружения

```bash
# Скопируйте пример конфигурации
cp env.example .env

# Отредактируйте переменные окружения
nano .env
```

### 3. Деплой приложения

```bash
# Запустите деплой
sudo ./scripts/deploy.sh
```

## 📋 Системные требования

- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: Минимум 2GB (рекомендуется 4GB+)
- **Диск**: Минимум 20GB свободного места
- **CPU**: 1 vCPU (рекомендуется 2+ vCPU)

## 🐳 Docker конфигурация

### Структура контейнеров

- **app** - Next.js приложение (порт 3000)
- **postgres** - PostgreSQL база данных (порт 5432)
- **redis** - Redis для кеширования (порт 6379)
- **nginx** - Reverse proxy (порты 80, 443)

### Образы и версии

- Node.js: 22-alpine
- PostgreSQL: 16-alpine
- Redis: 7-alpine
- Nginx: alpine

## ⚙️ Конфигурация

### Основные переменные окружения

```env
# Приложение
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secret-key

# База данных
DATABASE_URL=postgresql://user:password@postgres:5432/portfolio
POSTGRES_DB=portfolio
POSTGRES_USER=portfolio_user
POSTGRES_PASSWORD=strong-password

# Email (для форм обратной связи)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### SSL сертификаты

#### Самоподписанные (для тестирования)

Скрипт деплоя автоматически создаст самоподписанные сертификаты.

#### Let's Encrypt (рекомендуется для продакшена)

```bash
# Установите certbot
sudo apt install certbot python3-certbot-nginx

# Получите сертификат
sudo certbot --nginx -d yourdomain.com

# Настройте автообновление
sudo crontab -e
# Добавьте строку:
0 12 * * * /usr/bin/certbot renew --quiet && docker restart portfolio_nginx
```

## 🛠️ Управление приложением

### Основные команды

```bash
# Полный деплой
sudo ./scripts/deploy.sh

# Просмотр логов
sudo ./scripts/deploy.sh logs [service]

# Перезапуск сервиса
sudo ./scripts/deploy.sh restart [service]

# Проверка здоровья
sudo ./scripts/deploy.sh health

# Создание бэкапа
sudo ./scripts/backup.sh

# Очистка старых образов
sudo ./scripts/deploy.sh cleanup
```

### Мониторинг

```bash
# Статус приложения
portfolio-status

# Логи в реальном времени
docker-compose logs -f app

# Использование ресурсов
docker stats

# Проверка здоровья
curl -f https://yourdomain.com/health
```

## 🔐 Безопасность

### Настройки файрвола (UFW)

```bash
# Проверить статус
sudo ufw status

# Открытые порты:
# - 22 (SSH)
# - 80 (HTTP)
# - 443 (HTTPS)
```

### Fail2ban

Автоматически настраивается для защиты от брутфорс атак:

- SSH защита
- Nginx защита от злоупотреблений

### Безопасность контейнеров

- Все контейнеры работают от непривилегированных пользователей
- Используется multi-stage сборка для минимизации поверхности атак
- Регулярные обновления базовых образов

## 💾 Бэкапы

### Автоматические бэкапы

```bash
# Настройка cron для ежедневных бэкапов
sudo crontab -e

# Добавьте строку для бэкапа в 2:00 каждый день
0 2 * * * /path/to/portfolio/scripts/backup.sh full >> /var/log/portfolio-backup.log 2>&1
```

### Ручные бэкапы

```bash
# Полный бэкап
sudo ./scripts/backup.sh full

# Только база данных
sudo ./scripts/backup.sh database

# Только файлы
sudo ./scripts/backup.sh files
```

### Восстановление из бэкапа

```bash
# Восстановление БД из бэкапа
docker exec -i portfolio_postgres psql -U portfolio_user -d portfolio < backup.sql

# Или через Docker Compose
docker-compose exec postgres psql -U portfolio_user -d portfolio < backup.sql
```

## 🔄 CI/CD Integration

### GitHub Actions пример

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/portfolio
            git pull origin main
            sudo ./scripts/deploy.sh
```

## 📊 Мониторинг и логирование

### Логи приложения

```bash
# Логи Next.js приложения
docker-compose logs app

# Логи Nginx
docker-compose logs nginx

# Логи базы данных
docker-compose logs postgres

# Системные логи
sudo journalctl -u docker -f
```

### Метрики и мониторинг

Для продвинутого мониторинга рекомендуется настроить:

- **Prometheus + Grafana** для метрик
- **ELK Stack** для централизованного логирования
- **Sentry** для отслеживания ошибок

## 🚨 Устранение неполадок

### Частые проблемы

#### 1. Контейнер не запускается

```bash
# Проверьте логи
docker-compose logs app

# Проверьте конфигурацию
docker-compose config

# Пересоберите образ
docker-compose build --no-cache app
```

#### 2. Проблемы с базой данных

```bash
# Проверьте подключение
docker-compose exec app pnpm prisma db push

# Проверьте миграции
docker-compose exec app pnpm prisma migrate status

# Пересоздайте базу (ОСТОРОЖНО!)
docker-compose down -v
docker-compose up -d postgres
docker-compose exec app pnpm prisma migrate deploy
```

#### 3. SSL проблемы

```bash
# Проверьте сертификаты
sudo certbot certificates

# Обновите сертификаты
sudo certbot renew

# Перезапустите Nginx
docker restart portfolio_nginx
```

#### 4. Проблемы с памятью

```bash
# Проверьте использование памяти
free -h
docker stats

# Увеличьте swap (если нужно)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи: `docker-compose logs`
2. Убедитесь, что все переменные окружения настроены правильно
3. Проверьте статус сервисов: `docker-compose ps`
4. Создайте issue в репозитории с подробным описанием проблемы

## 🔄 Обновления

### Обновление приложения

```bash
# Получите последние изменения
git pull origin main

# Запустите деплой
sudo ./scripts/deploy.sh
```

### Обновление системы

```bash
# Обновите пакеты системы
sudo apt update && sudo apt upgrade -y

# Обновите Docker образы
docker-compose pull
docker-compose up -d
```

---

**Важно**: Всегда создавайте бэкап перед обновлениями и изменениями в продакшене!
