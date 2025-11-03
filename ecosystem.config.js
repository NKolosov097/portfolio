module.exports = {
  apps: [
    {
      name: 'portfolio',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max', // Использует все доступные CPU ядра
      exec_mode: 'cluster',
      
      // Директория запуска
      cwd: '/var/www/portfolio',
      
      // Переменные окружения
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Управление процессами
      min_uptime: '10s', // Минимальное время работы для считания стабильным
      max_restarts: 10, // Максимум перезапусков за период
      restart_delay: 4000, // Задержка перед перезапуском (мс)
      exp_backoff_restart_delay: 100, // Экспоненциальная задержка при множественных перезапусках
      
      // Ограничения ресурсов
      max_memory_restart: '1G', // Перезапуск при превышении памяти
      
      // Логирование
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // Добавлять время к логам
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true, // Объединять логи в cluster mode
      
      // Автоматическая ротация логов
      log_type: 'json',
      
      // Управление остановкой
      kill_timeout: 5000, // Время на graceful shutdown (мс)
      wait_ready: true, // Ждать ready сигнала от Next.js
      listen_timeout: 10000, // Таймаут ожидания ready сигнала
      
      // Оптимизации
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      
      // Автоматический перезапуск
      autorestart: true, 
      
      // Мониторинг
      pmx: true, 
      
      // Улучшенная обработка ошибок
      shutdown_with_message: true,
      
      // Source map для лучшей отладки в production
      source_map_support: true,
      
      // Оптимизация для production
      node_args: [
        '--max-old-space-size=2048',
        '--enable-source-maps', 
      ],
    }
  ],
}