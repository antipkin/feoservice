# backend/scripts/create_admin.py
"""Скрипт для создания первого администратора системы.

Запуск из папки backend:
    python scripts/create_admin.py
"""
import sys
import os
import asyncio
import getpass

# 🎯 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: добавляем корень backend в sys.path
# чтобы Python мог найти модуль app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import hash_password


async def create_first_admin():
    async with AsyncSessionLocal() as session:
        # Проверяем, есть ли уже админы
        result = await session.execute(
            select(User).where(User.role == "admin")
        )
        if result.scalars().first():
            print("⚠️  Администратор уже существует.")
            print("Используйте раздел 'Управление пользователями' в интерфейсе для создания новых пользователей.")
            return
        
        print("=" * 60)
        print("🔐 Создание первого администратора системы ДомСервис")
        print("=" * 60)
        print()
        
        email = input("📧 Email: ").strip()
        if not email:
            print("❌ Email не может быть пустым!")
            return
        
        username = input("👤 Username (латиницей, для входа): ").strip()
        if not username:
            print("❌ Username не может быть пустым!")
            return
        
        full_name = input("📝 Полное имя: ").strip()
        if not full_name:
            print("❌ Полное имя не может быть пустым!")
            return
        
        password = getpass.getpass("🔑 Пароль (минимум 6 символов): ")
        if len(password) < 6:
            print("❌ Пароль слишком короткий! Минимум 6 символов.")
            return
        
        # Создаём пользователя
        admin = User(
            email=email,
            username=username,
            full_name=full_name,
            hashed_password=hash_password(password),
            role="admin",
            is_active=True
        )
        
        session.add(admin)
        await session.commit()
        
        print()
        print("=" * 60)
        print("✅ Администратор успешно создан!")
        print("=" * 60)
        print(f"   📧 Email:    {email}")
        print(f"   👤 Username: {username}")
        print(f"   📝 Имя:      {full_name}")
        print(f"   🔐 Роль:     admin")
        print()
        print("🚀 Теперь вы можете войти в систему:")
        print("   http://localhost:3000")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(create_first_admin())