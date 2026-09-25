from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Enum,
    ForeignKey, Index, UniqueConstraint, func
)
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import PlanStatus


class PlanHeader(Base):
    __tablename__ = "plan_headers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    object_id = Column(
        Integer, ForeignKey("objects.id", ondelete="CASCADE"), nullable=False
    )
    year = Column(Integer, nullable=False)
    name = Column(String(200))
    status = Column(
        Enum(PlanStatus), default=PlanStatus.DRAFT, nullable=False
    )
    approved_by = Column(Integer)
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    object = relationship("Object", back_populates="plan_headers")
    items = relationship(
        "PlanItem", back_populates="plan_header", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("object_id", "year", "name", name="uq_plan_header"),
        Index("ix_plan_headers_object_year", "object_id", "year"),
    )


class PlanItem(Base):
    __tablename__ = "plan_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_header_id = Column(
        Integer, ForeignKey("plan_headers.id", ondelete="CASCADE"), nullable=False
    )
    service_type_id = Column(
        Integer, ForeignKey("service_types.id", ondelete="RESTRICT"), nullable=False
    )
    total_quantity = Column(Numeric(15, 4), nullable=False)
    unit_price = Column(Numeric(15, 4), nullable=False)
    total_amount = Column(Numeric(15, 2))  # = quantity * unit_price
    frequency = Column(String(20))         # monthly/quarterly/yearly
    description = Column(String(2000))

    # Relationships
    plan_header = relationship("PlanHeader", back_populates="items")
    service_type = relationship("ServiceType", back_populates="plan_items")
    resources = relationship(
        "PlanResource", back_populates="plan_item", cascade="all, delete-orphan"
    )
    fact_items = relationship("FactItem", back_populates="plan_item")


class PlanResource(Base):
    """Потребность в ресурсах для позиции плана."""
    __tablename__ = "plan_resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_item_id = Column(
        Integer, ForeignKey("plan_items.id", ondelete="CASCADE"), nullable=False
    )
    resource_id = Column(
        Integer, ForeignKey("resources.id", ondelete="RESTRICT"), nullable=False
    )
    required_quantity = Column(Numeric(15, 6), nullable=False)
    unit_price = Column(Numeric(15, 4))
    total_amount = Column(Numeric(15, 2))

    # Relationships
    plan_item = relationship("PlanItem", back_populates="resources")
    resource = relationship("Resource", back_populates="plan_resources")