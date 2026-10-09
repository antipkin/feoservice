# backend/app/schemas/notification.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    extra_data: Optional[dict] = None  # 🎯 Исправлено: было metadata
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationStats(BaseModel):
    total: int
    unread: int
    by_type: dict