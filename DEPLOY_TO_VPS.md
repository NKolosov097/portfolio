# 🚀 Деплой Portfolio на VPS nkolosov.com

Пошаговая инструкция для деплоя вашего портфолио на VPS сервер.

## 📋 Информация о сервере

- **IP**: 79.174.78.124
- **Домен**: nkolosov.com
- **Пользователь**: root
- **Операционная система**: Ubuntu/Debian

## 🎯 Быстрый деплой (все в одной команде)

```bash
# Полный автоматический деплой
make deploy-vps
```

Эта команда выполнит:

1. ✅ Настройку VPS сервера
2. ✅ Установку Docker и зависимостей
3. ✅ Создание production конфигурации
4. ✅ Деплой приложения
5. ✅ Настройку SSL сертификата
6. ✅ Проверку работоспособности

## 📝 Пошаговый деплой

### 1. Подготовка локального окружения

```bash
# Убедитесь, что у вас есть SSH ключ
ls ~/.ssh/id_rsa* || ssh-keygen -t ed25519 -C "deploy@nkolosov.com"

# Добавьте SSH ключ на сервер (если еще не добавлен)
ssh-copy-id root@79.174.78.124
```

### 2. Настройка VPS сервера

```bash
# Только настройка сервера
make deploy-vps-setup
```

Эта команда установит:

- Docker и Docker Compose
- Nginx, PostgreSQL, Redis
- Firewall (UFW)
- Fail2ban для защиты
- Swap файл
- Пользователя приложения

### 3. Деплой приложения

```bash
# Только деплой приложения
make deploy-vps-app
```

### 4. Настройка SSL

```bash
# Настройка Let's Encrypt SSL
make deploy-vps-ssl
```

### 5. Проверка

```bash
# Проверка работоспособности
make check-vps
```

## ⚙️ Конфигурация

### Автоматически создаваемые настройки

При деплое автоматически создается `.env.production` файл с:

- ✅ Случайными паролями для БД
- ✅ Безопасным NEXTAUTH_SECRET
- ✅ Правильными URL для домена
- ✅ Настройками для продакшена

### Что нужно настроить вручную

После деплоя отредактируйте на сервере `/home/portfolio/current/.env`:

```bash
# Подключитесь к серверу
ssh root@79.174.78.124

# Отредактируйте настройки email
nano /home/portfolio/current/.env

# Найдите и измените:
SMTP_USER=your-real-email@gmail.com
SMTP_PASS=your-app-password
```

## 🔧 Управление приложением

### Подключение к серверу

```bash
ssh root@79.174.78.124
cd /home/portfolio/current
```

### Основные команды на сервере

```bash
# Просмотр статуса
make status

# Просмотр логов
make logs

# Перезапуск приложения
make restart

# Создание бэкапа
make backup

# Проверка здоровья
make health
```

### Локальные команды управления

```bash
# Проверить статус VPS
make check-vps

# Повторный деплой (обновление)
make deploy-vps-app

# Просмотр логов удаленно
ssh root@79.174.78.124 'cd /home/portfolio/current && make logs-app'
```

## 📊 Мониторинг (опционально)

### Включение мониторинга

```bash
# На сервере
ssh root@79.174.78.124
cd /home/portfolio/current

# Запуск Prometheus + Grafana
make monitoring-start
```

Доступ:

- **Grafana**: http://79.174.78.124:3001 (admin/admin)
- **Prometheus**: http://79.174.78.124:9090

### Настройка поддомена для мониторинга

Добавьте A-запись в DNS:

- `monitoring.nkolosov.com` → `79.174.78.124`

## 🔒 Безопасность

### Автоматически настраивается

- ✅ Firewall (только 22, 80, 443 порты)
- ✅ Fail2ban защита от брутфорс атак
- ✅ SSL сертификаты Let's Encrypt
- ✅ Непривилегированные пользователи в Docker
- ✅ Security headers в Nginx

### Рекомендации

1. **Смените пароль root**:

```bash
ssh root@79.174.78.124
passwd
```

2. **Настройте SSH ключи** (отключите пароли):

```bash
# В /etc/ssh/sshd_config
PasswordAuthentication no
systemctl restart ssh
```

3. **Регулярные обновления**:

```bash
# Добавьте в crontab
0 4 * * 1 apt update && apt upgrade -y && docker system prune -f
```

## 🔄 Обновления

### Обновление приложения

```bash
# Локально (из директории проекта)
git pull origin main
make deploy-vps-app
```

### Обновление системы

```bash
ssh root@79.174.78.124
apt update && apt upgrade -y
cd /home/portfolio/current
make restart
```

## 💾 Бэкапы

### Автоматические бэкапы

Настроены автоматические ежедневные бэкапы в 2:00:

```bash
# Проверить cron
crontab -l

# Ручной бэкап
cd /home/portfolio/current
make backup
```

### Восстановление

```bash
# Список бэкапов
ls -la /var/backups/portfolio/

# Восстановление БД
docker exec -i portfolio_postgres psql -U portfolio_user -d portfolio < /var/backups/portfolio/database/db_YYYYMMDD_HHMMSS.sql
```

## 🚨 Устранение неполадок

### Проблемы с SSL

```bash
# Проверить статус сертификата
ssh root@79.174.78.124
certbot certificates

# Принудительное обновление
certbot renew --force-renewal
docker restart portfolio_nginx
```

### Проблемы с приложением

```bash
# Проверить логи
ssh root@79.174.78.124
cd /home/portfolio/current
make logs-app

# Перезапуск с пересборкой
make clean
make docker-build
make restart
```

### Проблемы с базой данных

```bash
# Проверить статус БД
make logs-db

# Перезапуск БД
docker-compose restart postgres

# Проверить подключение
docker-compose exec app pnpm prisma db push
```

## 📞 Контакты и поддержка

### Полезные ссылки

- 🌐 **Сайт**: https://nkolosov.com
- 🔧 **Админка**: https://nkolosov.com/admin (если есть)
- 📊 **Мониторинг**: https://monitoring.nkolosov.com (если настроен)

### Команды для диагностики

```bash
# Информация о системе
ssh root@79.174.78.124
cd /home/portfolio/current
make info

# Проверка дискового пространства
df -h

# Проверка памяти
free -h

# Проверка сетевых соединений
netstat -tlnp | grep :80
netstat -tlnp | grep :443
netstat -tlnp | grep :3000
```

---

## ✅ Чек-лист после деплоя

- [ ] Сайт доступен по https://nkolosov.com
- [ ] SSL сертификат работает (зеленый замок)
- [ ] Форма обратной связи отправляет email
- [ ] База данных работает
- [ ] Логи не содержат критических ошибок
- [ ] Настроены автоматические бэкапы
- [ ] Firewall настроен корректно
- [ ] Мониторинг работает (если включен)

**Поздравляем! 🎉 Ваше портфолио успешно развернуто на nkolosov.com**
