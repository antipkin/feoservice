# backend/app/services/notification_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.models.notification import Notification
from app.models.user import User
from app.models.enums import NotificationType


async def create_notification(
    db: AsyncSession,
    user_id: int,
    notification_type: NotificationType,
    title: str,
    message: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    extra_data: Optional[dict] = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=notification_type.value,
        title=title,
        message=message,
        resource_type=resource_type,
        resource_id=resource_id,
        extra_data=extra_data or {},
    )
    db.add(notification)
    await db.flush()
    return notification


async def notify_status_change(
    db: AsyncSession,
    document_type: str,
    document_id: int,
    document_name: str,
    old_status: str,
    new_status: str,
    actor_id: int,
    actor_name: str,
    comment: Optional[str] = None,
    creator_id: Optional[int] = None,
) -> List[Notification]:
    type_labels = {"plan": "план", "fact": "факт", "act": "акт"}
    doc_label = type_labels.get(document_type, "документ")
    
    status_labels = {
        "DRAFT": "📝 Черновик", "SUBMITTED": "⏳ На согласовании",
        "APPROVED": "✅ Утверждён", "SIGNED": "🖋️ Подписан", "ARCHIVED": "📦 В архиве",
    }
    
    old_label = status_labels.get(old_status.upper(), old_status)
    new_label = status_labels.get(new_status.upper(), new_status)
    
    title = f"{doc_label.capitalize()} переведён в статус «{new_label}»"
    message = f"{actor_name} перевёл(а) {doc_label} «{document_name}» из статуса «{old_label}» в «{new_label}»."
    if comment:
        message += f"\n\n💬 Комментарий: {comment}"
    
    notifications = []
    notified_user_ids = set()

    # 1. Уведомляем создателя документа
    if creator_id and creator_id not in notified_user_ids:
        notifications.append(await create_notification(
            db=db, user_id=creator_id, notification_type=NotificationType.STATUS_CHANGE,
            title=title, message=message, resource_type=document_type.upper(),
            resource_id=document_id, extra_data={"old_status": old_status, "new_status": new_status, "actor_id": actor_id}
        ))
        notified_user_ids.add(creator_id)

    # 2. Уведомляем всех активных администраторов
    result = await db.execute(select(User).where(User.role == "admin", User.is_active == True))
    admins = result.scalars().all()
    for admin in admins:
        if admin.id not in notified_user_ids:
            notifications.append(await create_notification(
                db=db, user_id=admin.id, notification_type=NotificationType.STATUS_CHANGE,
                title=title, message=message, resource_type=document_type.upper(),
                resource_id=document_id, extra_data={"old_status": old_status, "new_status": new_status, "actor_id": actor_id}
            ))
            notified_user_ids.add(admin.id)
    
    return notifications


async def get_unread_count(db: AsyncSession, user_id: int) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.is_read == False)
    )
    return result.scalar() or 0


async def mark_as_read(db: AsyncSession, notification_id: int, user_id: int) -> bool:
    from datetime import datetime
    result = await db.execute(select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id))
    notification = result.scalar_one_or_none()
    if not notification:
        return False
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    await db.commit()
    return True


async def mark_all_as_read(db: AsyncSession, user_id: int) -> int:
    from datetime import datetime
    result = await db.execute(select(Notification).where(Notification.user_id == user_id, Notification.is_read == False))
    notifications = result.scalars().all()
    now = datetime.utcnow()
    for n in notifications:
        n.is_read = True
        n.read_at = now
    await db.commit()
    return len(notifications)