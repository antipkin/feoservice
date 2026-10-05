#!/usr/bin/env python3
"""
Скрипт автоматического бэкапа базы данных PostgreSQL.
Поддерживает:
- Создание сжатых дампов (.sql.gz)
- Ротацию старых бэкапов (хранение N последних)
- Логирование в файл
- Уведомления об ошибках (опционально)

Использование:
    python scripts/backup_db.py                    # Создать бэкап
    python scripts/backup_db.py --keep 30          # Хранить последние 30 дней
    python scripts/backup_db.py --full             # Полный бэкап (со схемой)
"""

import os
import sys
import gzip
import shutil
import logging
import argparse
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

# Загружаем переменные окружения из .env
def load_env(env_path: str = ".env") -> dict:
    """Загружает переменные окружения из .env файла."""
    env_vars = {}
    if not os.path.exists(env_path):
        return env_vars
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars


def setup_logging(backup_dir: Path) -> logging.Logger:
    """Настраивает логирование в файл и консоль."""
    log_file = backup_dir / "backup.log"
    logger = logging.getLogger("db_backup")
    logger.setLevel(logging.INFO)

    # Форматтер
    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Обработчик в файл
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Обработчик в консоль
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger


def create_backup(
    db_host: str,
    db_port: str,
    db_user: str,
    db_name: str,
    backup_dir: Path,
    full_backup: bool = False,
    logger: logging.Logger = None
) -> Path:
    """
    Создаёт бэкап базы данных.
    
    Args:
        full_backup: Если True, включает схему БД (CREATE TABLE и т.д.)
    
    Returns:
        Путь к созданному файлу бэкапа
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_type = "full" if full_backup else "data"
    filename = f"backup_{db_name}_{backup_type}_{timestamp}.sql.gz"
    backup_path = backup_dir / filename

    # Команда pg_dump
    cmd = [
        "pg_dump",
        "-h", db_host,
        "-p", db_port,
        "-U", db_user,
        "-d", db_name,
        "--no-owner",
        "--no-privileges",
    ]
    
    if full_backup:
        cmd.append("--clean")  # Добавляет DROP перед CREATE
    
    # Устанавливаем пароль через переменную окружения
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ.get("DB_PASSWORD", "")

    logger.info(f"🚀 Начинаю создание бэкапа: {filename}")
    logger.info(f"   База данных: {db_name} @ {db_host}:{db_port}")
    logger.info(f"   Тип бэкапа: {'полный (со схемой)' if full_backup else 'только данные'}")

    try:
        # Выполняем pg_dump и сжимаем результат через gzip
        process = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False
        )
        
        # Открываем gzip-файл для записи
        with gzip.open(backup_path, "wb") as gz_file:
            while True:
                chunk = process.stdout.read(8192)
                if not chunk:
                    break
                gz_file.write(chunk)
        
        process.wait()
        
        if process.returncode != 0:
            error_output = process.stderr.read().decode("utf-8")
            raise RuntimeError(f"pg_dump завершился с ошибкой: {error_output}")
        
        # Получаем размер файла
        file_size = backup_path.stat().st_size
        size_mb = file_size / (1024 * 1024)
        
        logger.info(f"✅ Бэкап успешно создан: {backup_path}")
        logger.info(f"   Размер: {size_mb:.2f} МБ")
        
        return backup_path
        
    except Exception as e:
        logger.error(f"❌ Ошибка создания бэкапа: {e}")
        # Удаляем повреждённый файл
        if backup_path.exists():
            backup_path.unlink()
        raise


def rotate_backups(backup_dir: Path, keep_days: int, logger: logging.Logger) -> int:
    """
    Удаляет старые бэкапы, оставляя только последние keep_days дней.
    
    Returns:
        Количество удалённых файлов
    """
    cutoff_date = datetime.now() - timedelta(days=keep_days)
    deleted_count = 0
    
    for backup_file in backup_dir.glob("backup_*.sql.gz"):
        file_mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
        if file_mtime < cutoff_date:
            try:
                backup_file.unlink()
                logger.info(f"🗑️  Удалён старый бэкап: {backup_file.name}")
                deleted_count += 1
            except Exception as e:
                logger.error(f"❌ Не удалось удалить {backup_file.name}: {e}")
    
    return deleted_count


def list_backups(backup_dir: Path) -> List[dict]:
    """Возвращает список всех бэкапов с информацией."""
    backups = []
    for backup_file in sorted(backup_dir.glob("backup_*.sql.gz"), reverse=True):
        stat = backup_file.stat()
        backups.append({
            "filename": backup_file.name,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
        })
    return backups


def main():
    parser = argparse.ArgumentParser(description="Бэкап базы данных PostgreSQL")
    parser.add_argument(
        "--keep", type=int, default=30,
        help="Сколько дней хранить бэкапы (по умолчанию: 30)"
    )
    parser.add_argument(
        "--full", action="store_true",
        help="Создать полный бэкап (со схемой БД)"
    )
    parser.add_argument(
        "--list", action="store_true",
        help="Показать список существующих бэкапов"
    )
    parser.add_argument(
        "--backup-dir", type=str, default=None,
        help="Директория для бэкапов (по умолчанию: ./backups)"
    )
    args = parser.parse_args()

    # Загружаем переменные окружения
    env_vars = load_env()
    
    # Определяем директорию для бэкапов
    if args.backup_dir:
        backup_dir = Path(args.backup_dir)
    else:
        backup_dir = Path(__file__).parent.parent / "backups"
    
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Настраиваем логирование
    logger = setup_logging(backup_dir)
    logger.info("=" * 60)
    logger.info("🔄 Запуск скрипта бэкапа базы данных")

    # Если запрошен список — просто выводим и выходим
    if args.list:
        backups = list_backups(backup_dir)
        if not backups:
            print("Бэкапов пока нет.")
        else:
            print(f"\n📦 Найдено бэкапов: {len(backups)}")
            print("-" * 80)
            print(f"{'Имя файла':<50} {'Размер':<10} {'Дата создания':<20}")
            print("-" * 80)
            for b in backups:
                print(f"{b['filename']:<50} {b['size_mb']:>6.2f} МБ   {b['created']}")
        return

    # Получаем параметры подключения
    db_host = env_vars.get("DB_HOST", "localhost")
    db_port = env_vars.get("DB_PORT", "5432")
    db_user = env_vars.get("DB_USER", "feoservice")
    db_name = env_vars.get("DB_NAME", "feoservice")
    db_password = env_vars.get("DB_PASSWORD", "")
    
    if not db_password:
        logger.error("❌ Не указан пароль DB_PASSWORD в .env")
        sys.exit(1)
    
    # Устанавливаем пароль в окружение для pg_dump
    os.environ["DB_PASSWORD"] = db_password

    try:
        # 1. Создаём бэкап
        backup_path = create_backup(
            db_host=db_host,
            db_port=db_port,
            db_user=db_user,
            db_name=db_name,
            backup_dir=backup_dir,
            full_backup=args.full,
            logger=logger
        )

        # 2. Ротируем старые бэкапы
        deleted = rotate_backups(backup_dir, args.keep, logger)
        logger.info(f"🧹 Ротация завершена: удалено {deleted} старых бэкапов")

        # 3. Показываем итоговую статистику
        backups = list_backups(backup_dir)
        total_size = sum(b["size_mb"] for b in backups)
        logger.info(f"📊 Итого бэкапов: {len(backups)}, общий размер: {total_size:.2f} МБ")
        logger.info("✅ Бэкап успешно завершён")

    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()