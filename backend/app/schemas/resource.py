# backend/app/schemas/resource.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal


# ============================================================
# RESOURCE (Ресурсы)
# ============================================================
class ResourceBase(BaseModel):
    code: str = Field(..., max_length=50, description="Код ресурса (например, KRASKA, TRUD)")
    name: str = Field(..., max_length=500, description="Название ресурса")
    unit: str = Field(..., max_length=50, description="Единица измерения (л, кг, час)")
    resource_type: str = Field(..., max_length=50, description="Тип: material, labor, transport, other")


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=500)
    unit: Optional[str] = Field(None, max_length=50)
    resource_type: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class ResourceResponse(ResourceBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================
# RESOURCE RATE (Расценки на ресурсы)
# ============================================================
class ResourceRateBase(BaseModel):
    resource_id: int
    price_per_unit: Decimal = Field(..., ge=0, description="Цена за единицу")
    valid_from: date = Field(..., description="Дата начала действия")
    valid_to: Optional[date] = Field(None, description="Дата окончания действия (null = бессрочно)")


class ResourceRateCreate(ResourceRateBase):
    pass


class ResourceRateUpdate(BaseModel):
    price_per_unit: Optional[Decimal] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class ResourceRateResponse(ResourceRateBase):
    id: int
    resource_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# RESOURCE NORM (Нормативы ресурсов на услугу)
# ============================================================
class ResourceNormBase(BaseModel):
    service_type_id: int = Field(..., description="ID услуги")
    resource_id: int = Field(..., description="ID ресурса")
    quantity_per_unit: Decimal = Field(..., ge=0, description="Количество ресурса на 1 ед. услуги")
    is_active: bool = True
    valid_from: date
    valid_to: Optional[date] = None


class ResourceNormCreate(ResourceNormBase):
    pass


class ResourceNormUpdate(BaseModel):
    quantity_per_unit: Optional[Decimal] = None
    is_active: Optional[bool] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class ResourceNormResponse(ResourceNormBase):
    id: int
    service_name: Optional[str] = None
    resource_name: Optional[str] = None

    class Config:
        from_attributes = True