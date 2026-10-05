#!/bin/bash
set -e
set -o pipefail

# 🎯 Абсолютные пути
BACKUP_DIR="/Users/max/Documents/feoservice/backend/backups"
LOG_FILE="$BACKUP_DIR/cron.log"

# 🎯 ПУТЬ К DOCKER (замените на ваш из `which docker`)
DOCKER_BIN="/usr/local/bin/docker"

# 🎯 ИМЯ КОНТЕЙНЕРА (замените на ваше из `docker ps`)
DB_CONTAINER="feoservice_postgres"

# 🎯 Данные для подключения
DB_USER="feoservice"
DB_NAME="feoservice"

# 🎯 ВАЖНО: добавляем PATH для Docker
export PATH="/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export DOCKER_HOST="unix:///var/run/docker.sock"

mkdir -p "$BACKUP_DIR"

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql.gz"

echo "========================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🚀 Начало бэкапа..." >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔍 Docker: $DOCKER_BIN" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔍 Контейнер: $DB_CONTAINER" >> "$LOG_FILE"

# 🎯 Проверяем, что Docker CLI существует
if [ ! -x "$DOCKER_BIN" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ОШИБКА: Docker CLI не найден по пути $DOCKER_BIN" >> "$LOG_FILE"
    exit 1
fi

# 🎯 Проверяем, что Docker-демон запущен
if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ОШИБКА: Docker Desktop не запущен!" >> "$LOG_FILE"
    exit 1
fi

# 🎯 Проверяем, что контейнер запущен
if ! "$DOCKER_BIN" ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ОШИБКА: Контейнер '$DB_CONTAINER' не запущен!" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 📋 Список запущенных контейнеров:" >> "$LOG_FILE"
    "$DOCKER_BIN" ps --format 'table {{.Names}}\t{{.Status}}' >> "$LOG_FILE" 2>&1
    exit 1
fi

# 🎯 Делаем бэкап
if "$DOCKER_BIN" exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges --clean --if-exists | gzip > "$BACKUP_FILE"; then

    FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    if [ "$FILE_SIZE" -lt 100 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ОШИБКА: Бэкап слишком мал ($FILE_SIZE байт)" >> "$LOG_FILE"
        rm -f "$BACKUP_FILE"
        exit 1
    fi

    SIZE_HUMAN=$(du -h "$BACKUP_FILE" | awk '{print $1}')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Успешно! Файл: $BACKUP_FILE (Размер: $SIZE_HUMAN)" >> "$LOG_FILE"

    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +30 -delete
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧹 Старые бэкапы (>30 дней) удалены." >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ОШИБКА при создании бэкапа!" >> "$LOG_FILE"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Бэкап завершён" >> "$LOG_FILE"