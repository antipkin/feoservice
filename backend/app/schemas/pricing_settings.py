# backend/app/schemas/pricing_settings.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal


class PricingSettingsBase(BaseModel):
    object_id: Optional[int] = None
    service_type_id: Optional[int] = None
    overhead_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    profit_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    vat_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    valid_from: date
    valid_to: Optional[date] = None


class PricingSettingsCreate(PricingSettingsBase):
    pass


class PricingSettingsUpdate(BaseModel):
    object_id: Optional[int] = None
    service_type_id: Optional[int] = None
    overhead_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    profit_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    vat_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class PricingSettingsResponse(PricingSettingsBase):
    id: int
    object_name: Optional[str] = None
    service_name: Optional[str] = None

    class Config:
        from_attributes = True


class PriceCalculationRequest(BaseModel):
    service_type_id: int
    object_id: int
    target_date: date


class PriceCalculationResult(BaseModel):
    service_name: str
    object_name: str
    cost_price: str
    overhead_amount: str
    profit_amount: str
    vat_amount: str
    final_price: str
    overhead_percent: str
    profit_percent: str
    vat_percent: str
    settings_source: str