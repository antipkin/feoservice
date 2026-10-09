# backend/Dockerfile
FROM python:3.9-slim

# Установка системных зависимостей для WeasyPrint (PDF) и PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем только requirements для кэширования слоя
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

# Создаем папку для загрузок
RUN mkdir -p /app/uploads

# 🎯 БЕЗОПАСНОСТЬ: Создаем непривилегированного пользователя
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Команда по умолчанию (переопределяется в docker-compose для dev)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]