from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal


class ObjectBase(BaseModel):
    name: str = Field(..., max_length=500, description="Название объекта")
    type: Literal["MKD", "PARKING"]
    address: Optional[str] = Field(None, max_length=1000)
    area_sqm: Optional[Decimal] = Field(None, ge=0, description="Площадь в м²")
    spaces_count: Optional[int] = Field(None, ge=0, description="Кол-во машиномест")
    tariff_base: Literal["area", "spaces"] = Field(
        "area", 
        description="База для расчёта тарифа: 'area' (м²) или 'spaces' (машиноместа)"
    )
    is_active: bool = True

    @model_validator(mode='after')
    def check_tariff_base(self):
        """Валидация: для МКД тариф может считаться только на площадь."""
        if self.type == "MKD" and self.tariff_base == "spaces":
            raise ValueError("Для МКД тариф может считаться только на площадь (area)")
        return self


class ObjectCreate(ObjectBase):
    pass


class ObjectUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[Literal["MKD", "PARKING"]] = None
    address: Optional[str] = None
    area_sqm: Optional[Decimal] = None
    spaces_count: Optional[int] = None
    tariff_base: Optional[Literal["area", "spaces"]] = None
    is_active: Optional[bool] = None


class ObjectResponse(ObjectBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True