# backend/app/schemas/cost_analysis.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from decimal import Decimal


class ResourceBreakdown(BaseModel):
    """Детализация по одному ресурсу."""
    resource_id: int
    resource_name: str
    resource_type: str  # material, labor, transport, energy, other
    unit: str
    quantity: Decimal
    price_per_unit: Decimal
    total_amount: Decimal


class ServiceCostAnalysis(BaseModel):
    """Анализ себестоимости одной услуги."""
    service_type_id: int
    service_name: str
    category_name: Optional[str]
    unit_symbol: str
    total_quantity: Decimal
    total_amount: Decimal
    
    # Разбивка по типам ресурсов
    materials_cost: Decimal = Decimal('0')
    labor_cost: Decimal = Decimal('0')
    transport_cost: Decimal = Decimal('0')
    energy_cost: Decimal = Decimal('0')
    other_cost: Decimal = Decimal('0')
    
    # Детализация по ресурсам
    resources: List[ResourceBreakdown] = []


class ReportCostAnalysisResponse(BaseModel):
    """Ответ для анализа себестоимости отчёта."""
    report_id: int
    report_name: str
    object_name: str
    period: str
    
    # Итоги по отчёту
    total_amount: Decimal
    materials_total: Decimal
    labor_total: Decimal
    transport_total: Decimal
    energy_total: Decimal
    other_total: Decimal
    
    # Детализация по услугам
    services: List[ServiceCostAnalysis]


class ResourcePriceChange(BaseModel):
    """Изменение цены на ресурс."""
    resource_id: int
    new_price: Decimal


class ImpactAnalysisRequest(BaseModel):
    """Запрос на анализ влияния изменений."""
    report_id: int
    price_changes: List[ResourcePriceChange]


class ServiceImpact(BaseModel):
    """Влияние изменения на одну услугу."""
    service_type_id: int
    service_name: str
    old_price: Decimal
    new_price: Decimal
    price_change: Decimal
    price_change_percent: Decimal
    total_amount_old: Decimal
    total_amount_new: Decimal
    amount_change: Decimal


class ImpactAnalysisResponse(BaseModel):
    """Ответ анализа влияния изменений."""
    report_id: int
    report_name: str
    
    # Общие итоги
    total_old: Decimal
    total_new: Decimal
    total_change: Decimal
    total_change_percent: Decimal
    
    # Влияние на услуги
    services_impact: List[ServiceImpact]