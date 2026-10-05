# backend/app/models/facts.py
from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Enum, Text,
    ForeignKey, Index, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import FactStatus, ActStatus  # 🎯 Импортируем оба enum


# ============================================================
# FACT HEADER (Заголовок факта выполненных работ)
# ============================================================
class FactHeader(Base):
    __tablename__ = "fact_headers"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    object_id = Column(
        Integer, ForeignKey("objects.id", ondelete="CASCADE"), nullable=False
    )
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)

    # 🎯 Статус факта (workflow: draft → submitted → approved → signed)
    status = Column(
        Enum(FactStatus),
        default=FactStatus.DRAFT,
        nullable=False
    )

    # 🎯 Поля для аудита workflow
    created_by = Column(Integer, nullable=True)  # ID пользователя, создавшего факт
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(Integer, nullable=True)  # ID пользователя, утвердившего факт
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    object = relationship("Object", back_populates="fact_headers")
    items = relationship(
        "FactItem", back_populates="fact_header", cascade="all, delete-orphan"
    )
    # Один факт → один акт (uselist=False)
    act = relationship("Act", back_populates="fact_header", uselist=False)

    __table_args__ = (
        UniqueConstraint("object_id", "year", "month", name="uq_fact_header_period"),
        Index("ix_fact_headers_period", "object_id", "year", "month"),
        Index("ix_fact_headers_status", "status"),  # 🆕 Индекс для фильтрации по статусу
    )

    def __repr__(self) -> str:
        return f"<FactHeader obj={self.object_id} {self.year}-{self.month} status={self.status}>"


# ============================================================
# FACT ITEM (Позиция факта)
# ============================================================
class FactItem(Base):
    __tablename__ = "fact_items"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    fact_header_id = Column(
        Integer, ForeignKey("fact_headers.id", ondelete="CASCADE"), nullable=False
    )
    plan_item_id = Column(
        Integer, ForeignKey("plan_items.id", ondelete="SET NULL"), nullable=True
    )
    service_type_id = Column(
        Integer, ForeignKey("service_types.id", ondelete="RESTRICT"), nullable=False
    )

    # Фактические данные
    actual_quantity = Column(Numeric(15, 4), nullable=False)
    unit_price = Column(Numeric(15, 4), nullable=False)
    actual_amount = Column(Numeric(15, 2))

    # Дополнительная информация
    executed_at = Column(Date, nullable=True)
    executor = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    attachments = Column(JSONB, nullable=True)

    # Relationships
    fact_header = relationship("FactHeader", back_populates="items")
    plan_item = relationship("PlanItem", back_populates="fact_items")
    service_type = relationship("ServiceType", back_populates="fact_items")
    resources = relationship(
        "FactResource", back_populates="fact_item", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<FactItem svc={self.service_type_id} qty={self.actual_quantity}>"


# ============================================================
# FACT RESOURCE (Фактический расход ресурсов)
# ============================================================
class FactResource(Base):
    __tablename__ = "fact_resources"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    fact_item_id = Column(
        Integer, ForeignKey("fact_items.id", ondelete="CASCADE"), nullable=False
    )
    resource_id = Column(
        Integer, ForeignKey("resources.id", ondelete="RESTRICT"), nullable=False
    )

    quantity = Column(Numeric(15, 6), nullable=False)
    unit_price = Column(Numeric(15, 4), nullable=True)
    total_amount = Column(Numeric(15, 2), nullable=True)

    # Relationships
    fact_item = relationship("FactItem", back_populates="resources")
    resource = relationship("Resource", back_populates="fact_resources")


# ============================================================
# ACT (Акт выполненных работ)
# ============================================================
class Act(Base):
    __tablename__ = "acts"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    act_number = Column(String(50), unique=True, nullable=False)
    act_date = Column(Date, nullable=False)
    fact_header_id = Column(
        Integer, ForeignKey("fact_headers.id", ondelete="CASCADE"), nullable=False
    )

    total_amount = Column(Numeric(15, 2), nullable=False)

    # 🎯 ИСПРАВЛЕНО: используем Enum вместо String для поддержки workflow
    status = Column(
        Enum(ActStatus),
        default=ActStatus.DRAFT,
        nullable=False
    )

    pdf_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    fact_header = relationship("FactHeader", back_populates="act")
    items = relationship("ActItem", back_populates="act", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_acts_status", "status"),  # 🆕 Индекс для фильтрации по статусу
    )

    def __repr__(self) -> str:
        return f"<Act {self.act_number} status={self.status}>"


# ============================================================
# ACT ITEM (Позиция акта)
# ============================================================
class ActItem(Base):
    __tablename__ = "act_items"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    act_id = Column(
        Integer, ForeignKey("acts.id", ondelete="CASCADE"), nullable=False
    )
    service_type_id = Column(
        Integer, ForeignKey("service_types.id", ondelete="RESTRICT"), nullable=False
    )

    # 🆕 Периодичность выполнения (копируется из ServiceType при формировании акта)
    frequency = Column(String(100), nullable=True)

    quantity = Column(Numeric(15, 4), nullable=True)
    unit_price = Column(Numeric(15, 4), nullable=True)
    total_amount = Column(Numeric(15, 2), nullable=True)

    # Relationships
    act = relationship("Act", back_populates="items")
    # service_type связь можно добавить при необходимости:
    # service_type = relationship("ServiceType")