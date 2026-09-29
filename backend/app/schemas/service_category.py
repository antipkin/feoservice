# backend/app/schemas/service_category.py
from pydantic import BaseModel, Field
from typing import Optional


class ServiceCategoryBase(BaseModel):
    code: str = Field(..., max_length=20, description="Код категории (например, UPR, SOI)")
    name: str = Field(..., max_length=200, description="Название категории")
    sort_order: int = Field(0, description="Порядок отображения (меньше = выше)")
    is_active: bool = True


class ServiceCategoryCreate(ServiceCategoryBase):
    pass


class ServiceCategoryUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=20)
    name: Optional[str] = Field(None, max_length=200)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class ServiceCategoryResponse(ServiceCategoryBase):
    id: int
    services_count: Optional[int] = 0  # Количество услуг в категории

    class Config:
        from_attributes = True