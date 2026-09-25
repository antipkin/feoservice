# Multi-stage build для backend
FROM python:3.11-slim AS base

# Установка системных зависимостей для WeasyPrint (PDF-генерация)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Установка Python-зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Создание папки для загруженных файлов
RUN mkdir -p /app/uploads

EXPOSE 8000

# Дефолтная команда (переопределяется в docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]