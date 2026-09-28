from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class ActItemBase(BaseModel):
    service_type_id: int
    frequency: Optional[str] = Field(None, max_length=100)
    quantity: Optional[Decimal] = Field(None, ge=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)


class ActItemCreate(ActItemBase):
    pass


class ActItemResponse(ActItemBase):
    id: int
    act_id: int
    total_amount: Optional[Decimal] = None

    class Config:
        from_attributes = True


class ActBase(BaseModel):
    act_number: str = Field(..., max_length=50)
    act_date: date
    fact_header_id: int


class ActCreate(ActBase):
    pass


class ActResponse(ActBase):
    id: int
    total_amount: Decimal
    status: str
    pdf_url: Optional[str] = None
    created_at: datetime
    items: List[ActItemResponse] = []

    class Config:
        from_attributes = True


class ActListItem(BaseModel):
    """Краткая информация об акте для списка."""
    id: int
    act_number: str
    act_date: date
    fact_header_id: int
    total_amount: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True