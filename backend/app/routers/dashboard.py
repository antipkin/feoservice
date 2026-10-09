# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_, extract
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime

from app.db.database import get_db
from app.models.planning import PlanHeader, PlanItem, PlanMonthly
from app.models.facts import FactHeader, FactItem, Act
from app.models.objects import Object
from app.models.services import ServiceType
from app.models.service_category import ServiceCategory
from app.models.user import User
from app.core.security import require_authenticated

router = APIRouter(prefix="/dashboard", tags=["Дашборд"])


@router.get("/stats")
async def get_dashboard_stats(
    year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Главная статистика для дашборда."""
    current_year = year or date.today().year
    previous_year = current_year - 1

    # 🎯 KPI 1: Всего планов
    total_plans = (await db.execute(
        select(func.count(PlanHeader.id)).where(PlanHeader.start_year == current_year)
    )).scalar() or 0

    # 🎯 KPI 2: Всего фактов
    total_facts = (await db.execute(
        select(func.count(FactHeader.id)).where(FactHeader.year == current_year)
    )).scalar() or 0

    # 🎯 KPI 3: Сумма утверждённых актов
    approved_acts_sum = (await db.execute(
        select(func.sum(Act.total_amount)).join(FactHeader).where(
            FactHeader.year == current_year,
            Act.status.in_(['APPROVED', 'SIGNED'])
        )
    )).scalar() or Decimal('0')

    # 🎯 KPI 4: Сумма за предыдущий год (для тренда)
    previous_acts_sum = (await db.execute(
        select(func.sum(Act.total_amount)).join(FactHeader).where(
            FactHeader.year == previous_year,
            Act.status.in_(['APPROVED', 'SIGNED'])
        )
    )).scalar() or Decimal('0')

    # Расчёт тренда
    if previous_acts_sum > 0:
        trend_pct = round(float((approved_acts_sum - previous_acts_sum) / previous_acts_sum * 100), 1)
    else:
        trend_pct = 0.0

    # 🎯 Помесячные данные план-факт
    monthly_data = []
    month_names = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    for month in range(1, 13):
        # План за месяц
        plan_sum = (await db.execute(
            select(func.sum(PlanMonthly.amount)).join(PlanItem).join(PlanHeader).where(
                PlanHeader.start_year <= current_year,
                PlanMonthly.month == month,
                PlanMonthly.year == current_year
            )
        )).scalar() or Decimal('0')

        # Факт за месяц
        fact_sum = (await db.execute(
            select(func.sum(FactItem.actual_amount)).join(FactHeader).where(
                FactHeader.year == current_year,
                FactHeader.month == month
            )
        )).scalar() or Decimal('0')

        monthly_data.append({
            "month": month_names[month - 1],
            "month_num": month,
            "plan_amount": float(plan_sum),
            "fact_amount": float(fact_sum),
            "deviation": float(fact_sum - plan_sum),
            "deviation_pct": round(float((fact_sum - plan_sum) / plan_sum * 100), 1) if plan_sum > 0 else 0.0
        })

    # 🎯 Топ-5 отклонений
    top_deviations_query = (
        select(
            ServiceType.name.label("service_name"),
            ServiceCategory.name.label("category_name"),
            func.sum(PlanItem.total_amount).label("plan_amount"),
            func.sum(FactItem.actual_amount).label("fact_amount")
        )
        .join(PlanItem, FactItem.service_type_id == PlanItem.service_type_id, isouter=True)
        .join(ServiceType, FactItem.service_type_id == ServiceType.id)
        .join(ServiceCategory, ServiceType.category_id == ServiceCategory.id, isouter=True)
        .join(FactHeader, FactItem.fact_header_id == FactHeader.id)
        .where(FactHeader.year == current_year)
        .group_by(ServiceType.id, ServiceType.name, ServiceCategory.name)
        .having(func.sum(PlanItem.total_amount) > 0)
        .order_by(func.abs(func.sum(FactItem.actual_amount) - func.sum(PlanItem.total_amount)).desc())
        .limit(5)
    )
    top_deviations_result = await db.execute(top_deviations_query)
    top_deviations = []
    for row in top_deviations_result.all():
        plan_amt = float(row.plan_amount or 0)
        fact_amt = float(row.fact_amount or 0)
        top_deviations.append({
            "service_name": row.service_name,
            "category_name": row.category_name or "Без категории",
            "plan_amount": plan_amt,
            "fact_amount": fact_amt,
            "deviation": fact_amt - plan_amt,
            "deviation_pct": round((fact_amt - plan_amt) / plan_amt * 100, 1) if plan_amt > 0 else 0.0
        })

    # 🎯 Распределение по категориям
    category_query = (
        select(
            ServiceCategory.name.label("category_name"),
            func.sum(FactItem.actual_amount).label("total_amount")
        )
        .join(ServiceType, FactItem.service_type_id == ServiceType.id)
        .join(ServiceCategory, ServiceType.category_id == ServiceCategory.id, isouter=True)
        .join(FactHeader, FactItem.fact_header_id == FactHeader.id)
        .where(FactHeader.year == current_year)
        .group_by(ServiceCategory.id, ServiceCategory.name)
        .order_by(func.sum(FactItem.actual_amount).desc())
    )
    category_result = await db.execute(category_query)
    total_fact_sum = sum(float(r.total_amount or 0) for r in category_result.all())
    category_distribution = []
    # Повторный запрос для формирования ответа
    category_result = await db.execute(category_query)
    for row in category_result.all():
        amount = float(row.total_amount or 0)
        category_distribution.append({
            "category_name": row.category_name or "Без категории",
            "total_amount": amount,
            "percentage": round(amount / total_fact_sum * 100, 1) if total_fact_sum > 0 else 0.0
        })

    # 🎯 Алерты (отклонения > 20%)
    alerts = []
    for dev in top_deviations:
        if abs(dev["deviation_pct"]) > 20:
            alerts.append({
                "object_name": "Все объекты",
                "period": f"{current_year}",
                "service_name": dev["service_name"],
                "deviation_pct": dev["deviation_pct"],
                "severity": "critical" if abs(dev["deviation_pct"]) > 50 else "warning"
            })

    # 🎯 Статусы документов
    status_counts = {
        "plans_draft": (await db.execute(
            select(func.count(PlanHeader.id)).where(PlanHeader.status == 'DRAFT')
        )).scalar() or 0,
        "plans_approved": (await db.execute(
            select(func.count(PlanHeader.id)).where(PlanHeader.status == 'APPROVED')
        )).scalar() or 0,
        "facts_draft": (await db.execute(
            select(func.count(FactHeader.id)).where(FactHeader.status == 'DRAFT')
        )).scalar() or 0,
        "facts_signed": (await db.execute(
            select(func.count(FactHeader.id)).where(FactHeader.status == 'SIGNED')
        )).scalar() or 0,
        "acts_draft": (await db.execute(
            select(func.count(Act.id)).where(Act.status == 'DRAFT')
        )).scalar() or 0,
        "acts_signed": (await db.execute(
            select(func.count(Act.id)).where(Act.status == 'SIGNED')
        )).scalar() or 0,
    }

    return {
        "year": current_year,
        "kpi": [
            {
                "title": "Планов за год",
                "value": str(total_plans),
                "subtitle": f"на {current_year} год",
                "color": "blue"
            },
            {
                "title": "Фактов за год",
                "value": str(total_facts),
                "subtitle": f"введено в {current_year}",
                "color": "green"
            },
            {
                "title": "Сумма актов",
                "value": f"{float(approved_acts_sum):,.2f} ₽".replace(",", " "),
                "subtitle": "утверждённых и подписанных",
                "trend": trend_pct,
                "color": "purple"
            },
            {
                "title": "Критических отклонений",
                "value": str(len(alerts)),
                "subtitle": "с отклонением > 20%",
                "color": "red" if alerts else "green"
            }
        ],
        "monthly_plan_fact": monthly_data,
        "top_deviations": top_deviations,
        "category_distribution": category_distribution,
        "alerts": alerts[:10],
        "status_counts": status_counts,
    }


@router.get("/stats/year-comparison")
async def get_year_comparison(
    year1: int = Query(...),
    year2: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Сравнение двух лет по месяцам."""
    result = {}
    for year in [year1, year2]:
        monthly = []
        month_names = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
        for month in range(1, 13):
            fact_sum = (await db.execute(
                select(func.sum(FactItem.actual_amount)).join(FactHeader).where(
                    FactHeader.year == year, FactHeader.month == month
                )
            )).scalar() or Decimal('0')
            monthly.append({
                "month": month_names[month - 1],
                "amount": float(fact_sum)
            })
        result[str(year)] = monthly
    return result