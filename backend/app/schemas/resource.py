from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from app.models.enums import ResourceType

# --- Resource ---
class ResourceBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=500)
    unit: str = Field(..., max_length=50)
    resource_type: ResourceType
    is_active: bool = True

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    resource_type: Optional[ResourceType] = None
    is_active: Optional[bool] = None

class ResourceResponse(ResourceBase):
    id: int
    class Config:
        from_attributes = True

# --- Resource Rate ---
class ResourceRateBase(BaseModel):
    resource_id: int
    price_per_unit: Decimal = Field(..., ge=0)
    valid_from: date
    valid_to: Optional[date] = None

class ResourceRateCreate(ResourceRateBase):
    pass

class ResourceRateResponse(ResourceRateBase):
    id: int
    class Config:
        from_attributes = True

# --- Resource Norm ---
class ResourceNormBase(BaseModel):
    service_type_id: int
    resource_id: int
    quantity_per_unit: Decimal = Field(..., ge=0, description="Норматив на 1 ед. услуги")
    valid_from: date
    valid_to: Optional[date] = None
    is_active: bool = True

class ResourceNormCreate(ResourceNormBase):
    pass

class ResourceNormResponse(ResourceNormBase):
    id: int
    class Config:
        from_attributes = True

class ResourceNormUpdate(BaseModel):
    quantity_per_unit: Optional[Decimal] = None
    is_active: Optional[bool] = None
    valid_to: Optional[date] = None