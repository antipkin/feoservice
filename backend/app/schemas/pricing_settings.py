# backend/app/schemas/pricing_settings.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal


class ServicePricingSettingsBase(BaseModel):
    object_id: Optional[int] = Field(None, description="ID объекта (null = для всех объектов)")
    service_type_id: Optional[int] = Field(None, description="ID услуги (null = для всех услуг)")
    overhead_percent: Decimal = Field(0, ge=0, le=100, description="Накладные расходы %")
    profit_percent: Decimal = Field(0, ge=0, le=100, description="Норма прибыли %")
    vat_percent: Decimal = Field(0, ge=0, le=100, description="НДС %")
    valid_from: date
    valid_to: Optional[date] = None


class ServicePricingSettingsCreate(ServicePricingSettingsBase):
    pass


class ServicePricingSettingsUpdate(BaseModel):
    overhead_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    profit_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    vat_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class ServicePricingSettingsResponse(ServicePricingSettingsBase):
    id: int
    object_name: Optional[str] = None
    service_name: Optional[str] = None

    class Config:
        from_attributes = True


class PriceCalculationRequest(BaseModel):
    service_type_id: int
    object_id: int
    # 🎯 ИСПРАВЛЕНО: переименовали поле, чтобы избежать конфликта с типом date
    target_date: date = Field(default_factory=date.today)


class PriceCalculationResponse(BaseModel):
    service_name: str
    object_name: str
    cost_price: Decimal
    overhead_amount: Decimal
    profit_amount: Decimal
    vat_amount: Decimal
    final_price: Decimal
    
    overhead_percent: Decimal
    profit_percent: Decimal
    vat_percent: Decimal
    
    settings_source: str