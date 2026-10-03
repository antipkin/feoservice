# backend/app/models/objects.py
from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric, DateTime, func, Index
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class Object(Base):
    __tablename__ = "objects"  # 🎯 ВАЖНО: два подчеркивания!

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(500), nullable=False)
    type = Column(String(20), nullable=False)  # 'МКД' или 'Паркинг'
    address = Column(String(1000))
    
    area_sqm = Column(Numeric(15, 4))
    spaces_count = Column(Integer)
    
    tariff_base = Column(
        String(20), 
        nullable=False, 
        default="area",
        server_default="area"
    )
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    # back_populates должно совпадать с именем атрибута в связанных моделях
    plan_headers = relationship("PlanHeader", back_populates="object", passive_deletes=True)
    fact_headers = relationship("FactHeader", back_populates="object", passive_deletes=True)
    service_rates = relationship("ServiceRate", back_populates="object")
    pricing_settings = relationship("ServicePricingSettings", back_populates="object")

    __table_args__ = (
        Index("ix_objects_type_active", "type", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Object {self.name} ({self.type})>"