# backend/app/schemas/object.py
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal

class ObjectBase(BaseModel):
    name: str = Field(..., max_length=500, description="Название объекта")
    # 🎯 Используем те же значения, что и на фронте
    type: Literal["МКД", "Паркинг"] 
    address: Optional[str] = Field(None, max_length=1000)
    area_sqm: Optional[Decimal] = Field(None, ge=0, description="Площадь в м²")
    spaces_count: Optional[int] = Field(None, ge=0, description="Кол-во машиномест")
    tariff_base: Literal["area", "spaces"] = Field(
        "area",
        description="База для расчёта тарифа"
    )
    is_active: bool = True

    @model_validator(mode='after')
    def check_tariff_base(self):
        """Валидация логики заполнения полей."""
        # Если тип МКД, то база должна быть area, и spaces_count лучше игнорировать/очищать
        if self.type == "МКД":
            if self.tariff_base != "area":
                raise ValueError("Для МКД база тарифа может быть только 'area'")
        # Если тип Паркинг, проверяем, что выбрана корректная база
        elif self.type == "Паркинг":
            if self.tariff_base not in ["area", "spaces"]:
                 raise ValueError("Для паркинга выберите базу тарифа: площадь или машиноместа")
        
        return self

class ObjectCreate(ObjectBase):
    pass

class ObjectUpdate(BaseModel):
    """Схема для частичного обновления (PATCH)."""
    name: Optional[str] = None
    type: Optional[Literal["МКД", "Паркинг"]] = None
    address: Optional[str] = None
    area_sqm: Optional[Decimal] = None
    spaces_count: Optional[int] = None
    tariff_base: Optional[Literal["area", "spaces"]] = None
    is_active: Optional[bool] = None

class ObjectResponse(ObjectBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True