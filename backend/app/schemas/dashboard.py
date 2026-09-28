from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal


class KPICard(BaseModel):
    """Карточка KPI."""
    title: str
    value: str
    subtitle: Optional[str] = None
    trend: Optional[float] = None  # Процент изменения
    color: str = "blue"  # blue, green, red, amber


class MonthlyPlanFact(BaseModel):
    """Данные для графика план-факт по месяцам."""
    month_label: str
    plan_amount: float
    fact_amount: float
    deviation: float


class TopDeviation(BaseModel):
    """Топ услуг по отклонениям."""
    service_name: str
    category_name: str
    plan_amount: float
    fact_amount: float
    deviation_pct: float


class CategoryDistribution(BaseModel):
    """Распределение по категориям."""
    category_name: str
    total_amount: float
    percentage: float


class Alert(BaseModel):
    """Алерт: факт сильно отличается от плана."""
    object_name: str
    period: str
    service_name: str
    deviation_pct: float
    severity: str  # warning, danger


class DashboardResponse(BaseModel):
    """Полный ответ дашборда."""
    kpi: List[KPICard]
    monthly_plan_fact: List[MonthlyPlanFact]
    top_deviations: List[TopDeviation]
    category_distribution: List[CategoryDistribution]
    alerts: List[Alert]