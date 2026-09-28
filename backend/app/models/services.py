from sqlalchemy import (
    Column, Integer, String, Numeric, Date, Boolean, ForeignKey,
    UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class ServiceType(Base):
    __tablename__ = "service_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(500), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="RESTRICT"), nullable=False)
    category_id = Column(Integer, ForeignKey("service_categories.id", ondelete="RESTRICT"), nullable=False)
    frequency = Column(String(100), nullable=True)
    description = Column(String(2000))
    is_active = Column(Boolean, default=True, nullable=False)

    unit = relationship("Unit")
    category = relationship("ServiceCategory")
    rates = relationship("ServiceRate", back_populates="service_type", cascade="all, delete-orphan")
    norms = relationship("ResourceNorm", back_populates="service_type", cascade="all, delete-orphan")
    plan_items = relationship("PlanItem", back_populates="service_type")
    fact_items = relationship("FactItem", back_populates="service_type")


class ServiceRate(Base):
    __tablename__ = "service_rates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # 🆕 Привязка к объекту (nullable=True для обратной совместимости, но UI будет требовать)
    object_id = Column(Integer, ForeignKey("objects.id", ondelete="CASCADE"), nullable=True)
    service_type_id = Column(Integer, ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    price_per_unit = Column(Numeric(15, 4), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)

    service_type = relationship("ServiceType", back_populates="rates")
    object = relationship("Object")

    __table_args__ = (
        UniqueConstraint("object_id", "service_type_id", "valid_from", name="uq_service_rate_period"),
        Index("ix_service_rates_valid", "object_id", "service_type_id", "valid_from"),
    )


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(500), nullable=False)
    unit = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    rates = relationship("ResourceRate", back_populates="resource", cascade="all, delete-orphan")
    norms = relationship("ResourceNorm", back_populates="resource", cascade="all, delete-orphan")
    plan_resources = relationship("PlanResource", back_populates="resource")
    fact_resources = relationship("FactResource", back_populates="resource")


class ResourceRate(Base):
    __tablename__ = "resource_rates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_id = Column(Integer, ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    price_per_unit = Column(Numeric(15, 4), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)

    resource = relationship("Resource", back_populates="rates")

    __table_args__ = (
        UniqueConstraint("resource_id", "valid_from", name="uq_resource_rate_period"),
    )


class ResourceNorm(Base):
    __tablename__ = "resource_norms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_type_id = Column(Integer, ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    quantity_per_unit = Column(Numeric(15, 6), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)

    service_type = relationship("ServiceType", back_populates="norms")
    resource = relationship("Resource", back_populates="norms")

    __table_args__ = (
        UniqueConstraint("service_type_id", "resource_id", "valid_from", name="uq_resource_norm_period"),
    )