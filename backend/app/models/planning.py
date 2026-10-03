# backend/app/models/planning.py
from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Enum, Text,
    ForeignKey, Index, UniqueConstraint, func
)
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import PlanStatus  # Убедитесь, что этот enum существует

class PlanHeader(Base):
    __tablename__ = "plan_headers"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    object_id = Column(Integer, ForeignKey("objects.id", ondelete="CASCADE"), nullable=False)
    start_year = Column(Integer, nullable=False)
    start_month = Column(Integer, nullable=False)
    period_months = Column(Integer, nullable=False)
    name = Column(String(200), nullable=True)
    status = Column(Enum(PlanStatus), default=PlanStatus.DRAFT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 🎯 Связи
    object = relationship("Object", back_populates="plan_headers")
    items = relationship("PlanItem", back_populates="plan_header", cascade="all, delete-orphan")


class PlanItem(Base):
    __tablename__ = "plan_items"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_header_id = Column(Integer, ForeignKey("plan_headers.id", ondelete="CASCADE"), nullable=False)
    service_type_id = Column(Integer, ForeignKey("service_types.id", ondelete="RESTRICT"), nullable=False)
    total_quantity = Column(Numeric(15, 4), nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    frequency = Column(String(100), nullable=True)
    description = Column(Text)

    # 🎯 Связи
    plan_header = relationship("PlanHeader", back_populates="items")
    service_type = relationship("ServiceType", back_populates="plan_items")
    monthly = relationship("PlanMonthly", back_populates="plan_item", cascade="all, delete-orphan")
    resources = relationship("PlanResource", back_populates="plan_item", cascade="all, delete-orphan")
    fact_items = relationship("FactItem", back_populates="plan_item")


class PlanMonthly(Base):
    __tablename__ = "plan_monthly"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_item_id = Column(Integer, ForeignKey("plan_items.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    quantity = Column(Numeric(15, 4), nullable=False)
    unit_price = Column(Numeric(15, 4), nullable=False)  # 🆕 Цена за единицу в конкретном месяце
    amount = Column(Numeric(15, 2))  # Вычисляется как quantity * unit_price

    # 🎯 Связи
    plan_item = relationship("PlanItem", back_populates="monthly")

    __table_args__ = (
        UniqueConstraint("plan_item_id", "month", "year", name="uq_plan_monthly_period"),
    )


class PlanResource(Base):
    __tablename__ = "plan_resources"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_item_id = Column(Integer, ForeignKey("plan_items.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id", ondelete="RESTRICT"), nullable=False)
    required_quantity = Column(Numeric(15, 6), nullable=False)
    unit_price = Column(Numeric(15, 4))
    total_amount = Column(Numeric(15, 2))

    # 🎯 Связи
    plan_item = relationship("PlanItem", back_populates="resources")
    resource = relationship("Resource", back_populates="plan_resources")