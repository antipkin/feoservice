from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ReportBase(BaseModel):
    object_id: int
    start_month: int = Field(..., ge=1, le=12)
    start_year: int
    end_month: int = Field(..., ge=1, le=12)
    end_year: int
    name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None

    @model_validator(mode='after')
    def check_period(self):
        """Проверяем, что конец периода не раньше начала."""
        start = self.start_year * 12 + self.start_month
        end = self.end_year * 12 + self.end_month
        if end < start:
            raise ValueError("Конец периода не может быть раньше начала")
        return self


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    start_month: Optional[int] = Field(None, ge=1, le=12)
    start_year: Optional[int] = None
    end_month: Optional[int] = Field(None, ge=1, le=12)
    end_year: Optional[int] = None
    name: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode='after')
    def check_period(self):
        # Валидация только если оба поля заданы
        if all(v is not None for v in [self.start_year, self.start_month, self.end_year, self.end_month]):
            start = self.start_year * 12 + self.start_month
            end = self.end_year * 12 + self.end_month
            if end < start:
                raise ValueError("Конец периода не может быть раньше начала")
        return self


class ReportItemResponse(BaseModel):
    id: int
    report_id: int
    service_type_id: int
    service_name: str
    unit_symbol: str
    frequency: Optional[str] = None
    category_name: Optional[str] = None
    total_quantity: Decimal
    total_amount: Decimal
    acts_count: int

    class Config:
        from_attributes = True


class ReportResponse(ReportBase):
    id: int
    status: str
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    items: List[ReportItemResponse] = []

    class Config:
        from_attributes = True


class ReportListItem(BaseModel):
    """Краткая информация для списка."""
    id: int
    object_id: int
    object_name: str
    start_month: int
    start_year: int
    end_month: int
    end_year: int
    name: Optional[str]
    status: str
    total_amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True