from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Enum, Text,
    ForeignKey, Index, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import FactStatus


class FactHeader(Base):
    __tablename__ = "fact_headers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    object_id = Column(
        Integer, ForeignKey("objects.id", ondelete="CASCADE"), nullable=False
    )
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status = Column(
        Enum(FactStatus), default=FactStatus.DRAFT, nullable=False
    )
    created_by = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(Integer)
    approved_at = Column(DateTime(timezone=True))

    # Relationships
    object = relationship("Object", back_populates="fact_headers")
    items = relationship(
        "FactItem", back_populates="fact_header", cascade="all, delete-orphan"
    )
    act = relationship("Act", back_populates="fact_header", uselist=False)

    __table_args__ = (
        UniqueConstraint("object_id", "year", "month", name="uq_fact_header_period"),
        Index("ix_fact_headers_period", "object_id", "year", "month"),
    )


class FactItem(Base):
    __tablename__ = "fact_items"

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
    actual_quantity = Column(Numeric(15, 4), nullable=False)
    unit_price = Column(Numeric(15, 4), nullable=False)
    actual_amount = Column(Numeric(15, 2))  # = quantity * unit_price
    executed_at = Column(Date)
    executor = Column(String(200))
    notes = Column(Text)
    attachments = Column(JSONB)  # Массив файлов

    # Relationships
    fact_header = relationship("FactHeader", back_populates="items")
    plan_item = relationship("PlanItem", back_populates="fact_items")
    service_type = relationship("ServiceType", back_populates="fact_items")
    resources = relationship(
        "FactResource", back_populates="fact_item", cascade="all, delete-orphan"
    )


class FactResource(Base):
    """Фактический расход ресурсов."""
    __tablename__ = "fact_resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fact_item_id = Column(
        Integer, ForeignKey("fact_items.id", ondelete="CASCADE"), nullable=False
    )
    resource_id = Column(
        Integer, ForeignKey("resources.id", ondelete="RESTRICT"), nullable=False
    )
    quantity = Column(Numeric(15, 6), nullable=False)
    unit_price = Column(Numeric(15, 4))
    total_amount = Column(Numeric(15, 2))

    # Relationships
    fact_item = relationship("FactItem", back_populates="resources")
    resource = relationship("Resource", back_populates="fact_resources")


class Act(Base):
    __tablename__ = "acts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    act_number = Column(String(50), unique=True, nullable=False)
    act_date = Column(Date, nullable=False)
    fact_header_id = Column(
        Integer, ForeignKey("fact_headers.id", ondelete="CASCADE"), nullable=False
    )
    total_amount = Column(Numeric(15, 2), nullable=False)
    status = Column(String(20), default="created")
    pdf_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    fact_header = relationship("FactHeader", back_populates="act")
    items = relationship("ActItem", back_populates="act", cascade="all, delete-orphan")


class ActItem(Base):
    __tablename__ = "act_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    act_id = Column(
        Integer, ForeignKey("acts.id", ondelete="CASCADE"), nullable=False
    )
    service_type_id = Column(
        Integer, ForeignKey("service_types.id", ondelete="RESTRICT"), nullable=False
    )
    quantity = Column(Numeric(15, 4))
    unit_price = Column(Numeric(15, 4))
    total_amount = Column(Numeric(15, 2))

    # Relationships
    act = relationship("Act", back_populates="items")