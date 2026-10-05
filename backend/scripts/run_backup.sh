#!/bin/bash
# Обёртка для запуска бэкапа через cron
# Использование в crontab:
#   0 2 * * * /Users/max/Documents/feoservice/backend/scripts/run_backup.sh

set -e  # Остановить при ошибке

# Переходим в директорию backend
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

# Активируем виртуальное окружение
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Запускаем скрипт бэкапа
python scripts/backup_db.py --keep 30

# Логируем результат
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed" >> "$BACKEND_DIR/backups/cron.log"