# backend/app/models/audit_log.py
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.models.base import Base

class AuditLog(Base):
    """Модель журнала аудита."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE
    resource_type = Column(String(50), nullable=False)  # OBJECT, SERVICE, PLAN, FACT
    resource_id = Column(Integer, nullable=True)  # ID измененного объекта
    old_values = Column(JSON, nullable=True)  # Старые значения (для UPDATE/DELETE)
    new_values = Column(JSON, nullable=True)  # Новые значения (для CREATE/UPDATE)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())