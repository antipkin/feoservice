from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Text,
    ForeignKey, Index, UniqueConstraint, func
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class Report(Base):
    """Отчет по объекту за период (агрегация актов)."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    object_id = Column(
        Integer, ForeignKey("objects.id", ondelete="CASCADE"), nullable=False
    )
    # Период отчета
    start_month = Column(Integer, nullable=False)  # 1-12
    start_year = Column(Integer, nullable=False)
    end_month = Column(Integer, nullable=False)    # 1-12
    end_year = Column(Integer, nullable=False)
    # Метаданные
    name = Column(String(200), nullable=True)
    status = Column(String(20), default="draft", nullable=False)
    total_amount = Column(Numeric(15, 2), default=0, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    object = relationship("Object")
    items = relationship(
        "ReportItem", back_populates="report", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_reports_object_period", "object_id", "start_year", "start_month"),
    )


class ReportItem(Base):
    """Позиция отчета — агрегированные данные по услуге за период."""
    __tablename__ = "report_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(
        Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False
    )
    service_type_id = Column(
        Integer, ForeignKey("service_types.id", ondelete="RESTRICT"), nullable=False
    )
    # Снимок данных на момент формирования отчета
    service_name = Column(String(500), nullable=False)
    unit_symbol = Column(String(20), nullable=False)
    frequency = Column(String(100), nullable=True)
    category_name = Column(String(200), nullable=True)
    # Агрегированные значения
    total_quantity = Column(Numeric(15, 4), nullable=False, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    acts_count = Column(Integer, nullable=False, default=0)  # Сколько актов учтено

    # Relationships
    report = relationship("Report", back_populates="items")