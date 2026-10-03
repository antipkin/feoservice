# backend/app/routers/audit.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse, AuditLogStats
from app.core.security import require_admin

router = APIRouter(prefix="/audit", tags=["Журнал аудита"])


@router.get("/", response_model=List[AuditLogResponse])
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: Optional[str] = Query(None, description="Фильтр по действию: CREATE, UPDATE, DELETE"),
    resource_type: Optional[str] = Query(None, description="Фильтр по типу ресурса: OBJECT, USER, PLAN, FACT, ACT, REPORT"),
    user_id: Optional[int] = Query(None, description="Фильтр по ID пользователя"),
    search: Optional[str] = Query(None, description="Поиск по тексту в деталях"),
    date_from: Optional[str] = Query(None, description="Дата от (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Дата до (YYYY-MM-DD)"),
):
    """Получить записи журнала аудита с фильтрацией и пагинацией."""
    query = (
        select(AuditLog, User.username)
        .join(User, AuditLog.user_id == User.id)
    )

    # Фильтр по действию
    if action:
        query = query.where(AuditLog.action == action.upper())

    # Фильтр по типу ресурса
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type.upper())

    # Фильтр по пользователю
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    # Фильтр по дате
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.where(AuditLog.created_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d")
            # Включаем весь день
            dt_to = dt_to.replace(hour=23, minute=59, second=59)
            query = query.where(AuditLog.created_at <= dt_to)
        except ValueError:
            pass

    # Поиск по тексту в old_values и new_values
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                AuditLog.old_values.cast(str).ilike(search_pattern),
                AuditLog.new_values.cast(str).ilike(search_pattern),
                User.username.ilike(search_pattern),
            )
        )

    # Сортировка и пагинация
    query = query.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)

    result = await db.execute(query)
    logs_with_users = result.all()

    response = []
    for log, username in logs_with_users:
        response.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            username=username,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            created_at=log.created_at
        ))

    return response


@router.get("/stats", response_model=AuditLogStats)
async def get_audit_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Получить статистику по журналу аудита."""
    # Общее количество записей
    total = (await db.execute(select(func.count(AuditLog.id)))).scalar() or 0

    # Количество по действиям
    action_counts = {}
    action_result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
    )
    for row in action_result.all():
        action_counts[row[0]] = row[1]

    # Количество по типам ресурсов
    resource_counts = {}
    resource_result = await db.execute(
        select(AuditLog.resource_type, func.count(AuditLog.id))
        .group_by(AuditLog.resource_type)
    )
    for row in resource_result.all():
        resource_counts[row[0]] = row[1]

    # Количество по пользователям
    user_counts = []
    user_result = await db.execute(
        select(User.username, func.count(AuditLog.id))
        .join(User, AuditLog.user_id == User.id)
        .group_by(User.username)
        .order_by(desc(func.count(AuditLog.id)))
    )
    for row in user_result.all():
        user_counts.append({"username": row[0], "count": row[1]})

    return AuditLogStats(
        total=total,
        by_action=action_counts,
        by_resource_type=resource_counts,
        by_user=user_counts,
    )


@router.get("/users", response_model=List[dict])
async def get_audit_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Получить список пользователей, которые есть в журнале аудита."""
    result = await db.execute(
        select(User.id, User.username)
        .join(AuditLog, AuditLog.user_id == User.id)
        .distinct()
        .order_by(User.username)
    )
    return [{"id": row[0], "username": row[1]} for row in result.all()]