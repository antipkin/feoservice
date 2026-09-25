from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric, Enum, DateTime, func, Index
)
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enums import ObjectType


class Object(Base):
    __tablename__ = "objects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(500), nullable=False)
    type = Column(Enum(ObjectType), nullable=False)
    address = Column(String(1000))
    area_sqm = Column(Numeric(15, 4))           # Площадь (для МКД)
    spaces_count = Column(Integer)              # Кол-во машиномест (для паркинга)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    plan_headers = relationship("PlanHeader", back_populates="object")
    fact_headers = relationship("FactHeader", back_populates="object")

    __table_args__ = (
        Index("ix_objects_type_active", "type", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Object {self.name} ({self.type.value})>"