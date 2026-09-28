# backend/app/schemas/import_plan.py
from pydantic import BaseModel, Field
from typing import List, Optional


class ImportedServiceRow(BaseModel):
    row_number: int
    service_code: Optional[str] = None
    service_name: str
    unit_symbol: str
    monthly_quantities: List[float] = Field(..., min_length=1, max_length=36)
    matched_service_id: Optional[int] = None
    match_status: str = "new"


class ImportPreview(BaseModel):
    file_name: str
    plan_name: str
    object_id: int
    object_name: str
    start_month: int
    start_year: int
    period_months: int
    services: List[ImportedServiceRow]
    warnings: List[str] = []


class ImportConfirmRequest(BaseModel):
    preview_data: dict
    selected_services: List[int]