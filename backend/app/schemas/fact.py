from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from app.models.enums import FactStatus

# --- Fact Header ---
class FactHeaderBase(BaseModel):
    object_id: int
    year: int
    month: int = Field(..., ge=1, le=12)
    status: FactStatus = FactStatus.DRAFT

class FactHeaderCreate(FactHeaderBase):
    pass

class FactHeaderUpdate(BaseModel):
    status: Optional[FactStatus] = None

class FactHeaderResponse(FactHeaderBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Fact Item ---
class FactItemBase(BaseModel):
    plan_item_id: Optional[int] = None
    service_type_id: int
    actual_quantity: Decimal = Field(..., ge=0)
    unit_price: Decimal = Field(..., ge=0)
    executed_at: Optional[date] = None
    executor: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None

class FactItemCreate(FactItemBase):
    pass

class FactItemUpdate(BaseModel):
    actual_quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    executed_at: Optional[date] = None
    executor: Optional[str] = None
    notes: Optional[str] = None

class FactItemResponse(FactItemBase):
    id: int
    fact_header_id: int
    actual_amount: Decimal

    class Config:
        from_attributes = True

# --- Plan-Fact Comparison Response ---
class PlanFactComparisonItem(BaseModel):
    service_type_id: int  # 🆕 Добавлено для точной связи на фронтенде
    service_name: str
    unit_symbol: str
    plan_quantity: Decimal
    fact_quantity: Decimal
    plan_amount: Decimal
    fact_amount: Decimal
    deviation_qty: Decimal
    deviation_pct: Decimal