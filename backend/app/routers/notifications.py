# backend/app/routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from typing import List, Optional

from app.db.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationStats
from app.core.security import require_authenticated
from app.services.notification_service import (
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Уведомления"])


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
    unread_only: bool = Query(False, description="Только непрочитанные"),
    type_filter: Optional[str] = Query(None, description="Фильтр по типу"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Получить список уведомлений текущего пользователя."""
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.where(Notification.is_read == False)
    if type_filter:
        query = query.where(Notification.type == type_filter)
    
    query = query.order_by(desc(Notification.created_at)).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/unread-count")
async def get_unread_notifications_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Получить количество непрочитанных уведомлений (для колокольчика)."""
    count = await get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Статистика уведомлений пользователя."""
    total_result = await db.execute(
        select(func.count(Notification.id)).where(Notification.user_id == current_user.id)
    )
    total = total_result.scalar() or 0
    
    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    unread = unread_result.scalar() or 0
    
    by_type_result = await db.execute(
        select(Notification.type, func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .group_by(Notification.type)
    )
    by_type = {row[0]: row[1] for row in by_type_result.all()}
    
    return NotificationStats(total=total, unread=unread, by_type=by_type)


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Пометить уведомление как прочитанное."""
    success = await mark_as_read(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    return {"success": True}


@router.post("/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Пометить все уведомления как прочитанные."""
    count = await mark_all_as_read(db, current_user.id)
    return {"success": True, "marked_count": count}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Удалить уведомление."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    await db.delete(notification)
    await db.commit()
    return None