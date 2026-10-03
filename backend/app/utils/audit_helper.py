# backend/app/utils/audit_helper.py
import json
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.models.user import User


def sanitize_for_json(obj):
    """
    Рекурсивно преобразует неподдерживаемые типы данных (Decimal, datetime) 
    в JSON-совместимые типы (float, str).
    """
    if isinstance(obj, Decimal):
        return float(obj)  # Преобразуем Decimal в float
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()  # Преобразуем дату/время в строку ISO
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    return obj


async def log_action(
    db: AsyncSession,
    user: User,
    action: str,
    resource_type: str,
    resource_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    ip_address: str = None
):
    """Записать действие в журнал аудита."""
    try:
        # 🎯 САНИТАРИЗАЦИЯ ДАННЫХ ПЕРЕД ЗАПИСЬЮ В БД
        clean_old_values = sanitize_for_json(old_values) if old_values else None
        clean_new_values = sanitize_for_json(new_values) if new_values else None
            
        log_entry = AuditLog(
            user_id=user.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=clean_old_values,
            new_values=clean_new_values,
            ip_address=ip_address
        )
        db.add(log_entry)
        await db.commit()
    except Exception as e:
        print(f"❌ Ошибка записи в аудит-лог: {e}")
        await db.rollback()