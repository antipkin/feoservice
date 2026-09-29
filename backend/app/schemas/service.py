# backend/app/schemas/service.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal


# ============================================================
# UNITS (Единицы измерения)
# ============================================================
class UnitBase(BaseModel):
    code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=100)
    symbol: str = Field(..., max_length=20)
    is_active: bool = True


class UnitCreate(UnitBase):
    pass


class UnitResponse(UnitBase):
    id: int

    class Config:
        from_attributes = True


# ============================================================
# SERVICE CATEGORIES (Категории услуг)
# ============================================================
class ServiceCategoryNested(BaseModel):
    id: int
    code: str
    name: str
    sort_order: int

    class Config:
        from_attributes = True


# ============================================================
# SERVICE TYPES (Услуги)
# ============================================================
class ServiceTypeBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=500)
    unit_id: int
    category_id: int
    frequency: Optional[str] = Field(None, max_length=100)
    is_active: bool = True


class ServiceTypeCreate(ServiceTypeBase):
    pass


class ServiceTypeUpdate(BaseModel):
    # 🎯 ДОБАВЛЕНО: поле code, чтобы можно было его обновлять с проверкой уникальности
    code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=500)
    unit_id: Optional[int] = None
    category_id: Optional[int] = None
    frequency: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class ServiceTypeResponse(ServiceTypeBase):
    id: int
    unit: Optional[UnitResponse] = None
    category: Optional[ServiceCategoryNested] = None

    class Config:
        from_attributes = True


# ============================================================
# SERVICE RATES (Расценки на услуги)
# ============================================================
class ServiceRateBase(BaseModel):
    object_id: Optional[int] = Field(None, description="ID объекта (если null, то глобальная)")
    service_type_id: int
    price_per_unit: Decimal = Field(..., ge=0)
    valid_from: date
    valid_to: Optional[date] = None


class ServiceRateCreate(ServiceRateBase):
    pass


class ServiceRateUpdate(BaseModel):
    price_per_unit: Optional[Decimal] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class ServiceRateResponse(ServiceRateBase):
    id: int
    service_name: Optional[str] = None
    object_name: Optional[str] = None

    class Config:
        from_attributes = True