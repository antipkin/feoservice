# backend/app/models/pricing_settings.py
from sqlalchemy import (
    Column, Integer, String, Numeric, Date, Boolean, ForeignKey,
    UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class ServicePricingSettings(Base):
    """Настройки расчёта расценок (накладные, прибыль, НДС)."""
    __tablename__ = "service_pricing_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Уровень настроек (nullable = применяется ко всем)
    object_id = Column(
        Integer, 
        ForeignKey("objects.id", ondelete="CASCADE"), 
        nullable=True,
        comment="NULL = для всех объектов"
    )
    service_type_id = Column(
        Integer, 
        ForeignKey("service_types.id", ondelete="CASCADE"), 
        nullable=True,
        comment="NULL = для всех услуг"
    )
    
    # Проценты
    overhead_percent = Column(Numeric(5, 2), nullable=False, default=0, comment="Накладные расходы %")
    profit_percent = Column(Numeric(5, 2), nullable=False, default=0, comment="Норма прибыли %")
    vat_percent = Column(Numeric(5, 2), nullable=False, default=0, comment="НДС %")
    
    # Период действия
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True, comment="NULL = бессрочно")
    
    # Relationships
    object = relationship("Object")
    service_type = relationship("ServiceType")

    __table_args__ = (
        UniqueConstraint(
            "object_id", "service_type_id", "valid_from",
            name="uq_pricing_settings_period"
        ),
        Index("ix_pricing_settings_valid", "object_id", "service_type_id", "valid_from"),
    )