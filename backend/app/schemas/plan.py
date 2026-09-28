from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from app.models.enums import PlanStatus


class PlanHeaderBase(BaseModel):
    object_id: int
    start_year: int
    start_month: int = Field(..., ge=1, le=12)
    period_months: int = Field(12, ge=1, le=36)
    name: Optional[str] = Field(None, max_length=200)
    status: PlanStatus = PlanStatus.DRAFT


class PlanHeaderCreate(PlanHeaderBase):
    pass


class PlanHeaderUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[PlanStatus] = None


class PlanHeaderResponse(PlanHeaderBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PlanCopyRequest(BaseModel):
    new_object_id: int = Field(..., description="ID нового объекта")
    new_start_year: int = Field(..., description="Новый год начала")
    new_start_month: int = Field(..., ge=1, le=12, description="Новый месяц начала")
    new_period_months: int = Field(12, ge=1, le=36, description="Новая длительность периода")
    new_name: Optional[str] = Field(None, max_length=200, description="Новое название")
    inflation_percent: float = Field(0.0, ge=0, description="Индексация тарифа в процентах")


class PlanMonthlyBase(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(...)
    quantity: Decimal = Field(..., ge=0)
    unit_price: Decimal = Field(..., ge=0)  # 🆕


class PlanMonthlyCreate(PlanMonthlyBase):
    pass


class PlanMonthlyResponse(PlanMonthlyBase):
    id: int
    plan_item_id: int
    amount: Decimal

    class Config:
        from_attributes = True


class PlanItemWithMonthlyCreate(BaseModel):
    service_type_id: int
    monthly_data: List[PlanMonthlyCreate] = Field(..., min_length=1, max_length=36)
    frequency: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)


class PlanItemUpdate(PlanItemWithMonthlyCreate):
    pass


class PlanItemResponse(BaseModel):
    id: int
    plan_header_id: int
    service_type_id: int
    total_quantity: Decimal
    # unit_price удален отсюда, так как теперь он помесячный
    total_amount: Decimal
    frequency: Optional[str]
    description: Optional[str]

    class Config:
        from_attributes = True


class PlanItemWithMonthlyResponse(PlanItemResponse):
    monthly: List[PlanMonthlyResponse] = []

    class Config:
        from_attributes = True


class TariffCalculationResponse(BaseModel):
    plan_id: int
    object_name: str
    object_type: str
    tariff_base: str
    tariff_unit: str
    divisor: Decimal
    total_services_amount: Decimal
    total_resources_amount: Decimal
    grand_total: Decimal
    tariff_per_unit: Decimal