# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from decimal import Decimal
from datetime import date

from app.db.database import get_db
from app.models.planning import PlanHeader, PlanItem, PlanMonthly
from app.models.facts import FactHeader, FactItem
from app.models.objects import Object
from app.models.services import ServiceType
from app.models.service_category import ServiceCategory
from app.models.user import User
from app.schemas.dashboard import (
    DashboardResponse, KPICard, MonthlyPlanFact,
    TopDeviation, CategoryDistribution, Alert
)
from app.core.security import require_authenticated

router = APIRouter(prefix="/dashboard", tags=["Дашборд"])


@router.get("/stats", response_model=DashboardResponse)
async def get_dashboard_stats(
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    if year is None:
        year = date.today().year

    # 1. KPI-карточки
    objects_count = await db.execute(select(func.count(Object.id)))
    objects_total = objects_count.scalar() or 0

    plans_count = await db.execute(
        select(func.count(PlanHeader.id)).where(
            PlanHeader.start_year <= year,
            PlanHeader.start_year + (PlanHeader.period_months // 12) >= year
        )
    )
    plans_total = plans_count.scalar() or 0

    plan_sum_query = await db.execute(
        select(func.sum(PlanItem.total_amount))
        .join(PlanHeader, PlanItem.plan_header_id == PlanHeader.id)
        .where(
            PlanHeader.start_year <= year,
            PlanHeader.start_year + (PlanHeader.period_months // 12) >= year
        )
    )
    plan_sum = float(plan_sum_query.scalar() or 0)

    fact_sum_query = await db.execute(
        select(func.sum(FactItem.actual_amount))
        .join(FactHeader, FactItem.fact_header_id == FactHeader.id)
        .where(FactHeader.year == year)
    )
    fact_sum = float(fact_sum_query.scalar() or 0)

    deviation_pct = 0.0
    if plan_sum > 0:
        deviation_pct = round((fact_sum - plan_sum) / plan_sum * 100, 1)

    kpi = [
        KPICard(title="Объектов", value=str(objects_total), subtitle="в системе", color="blue"),
        KPICard(title="Планов на год", value=str(plans_total), subtitle=f"{year} год", color="blue"),
        KPICard(title="Сумма плана", value=f"{plan_sum:,.0f} ₽".replace(",", " "), subtitle="на текущий год", color="amber"),
        KPICard(title="Сумма факта", value=f"{fact_sum:,.0f} ₽".replace(",", " "), subtitle=f"за {year} год", color="green"),
        KPICard(title="Отклонение", value=f"{deviation_pct:+.1f}%", subtitle="факт к плану", color="red" if abs(deviation_pct) > 10 else "green", trend=deviation_pct),
    ]

    # 2. График план-факт по месяцам
    month_names = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    monthly_data = []
    for month_idx in range(1, 13):
        plan_month_query = await db.execute(
            select(func.sum(PlanMonthly.amount))
            .join(PlanItem, PlanMonthly.plan_item_id == PlanItem.id)
            .join(PlanHeader, PlanItem.plan_header_id == PlanHeader.id)
            .where(
                PlanMonthly.month == month_idx,
                PlanMonthly.year == year,
                PlanHeader.start_year <= year,
                PlanHeader.start_year + (PlanHeader.period_months // 12) >= year
            )
        )
        plan_amount = float(plan_month_query.scalar() or 0)

        fact_month_query = await db.execute(
            select(func.sum(FactItem.actual_amount))
            .join(FactHeader, FactItem.fact_header_id == FactHeader.id)
            .where(FactHeader.year == year, FactHeader.month == month_idx)
        )
        fact_amount = float(fact_month_query.scalar() or 0)

        monthly_data.append(MonthlyPlanFact(
            month_label=month_names[month_idx - 1],
            plan_amount=plan_amount,
            fact_amount=fact_amount,
            deviation=fact_amount - plan_amount
        ))

    # 3. Топ-5 услуг по отклонениям
    facts_query = await db.execute(
        select(FactItem, FactHeader, ServiceType, ServiceCategory)
        .join(FactHeader, FactItem.fact_header_id == FactHeader.id)
        .join(ServiceType, FactItem.service_type_id == ServiceType.id)
        .outerjoin(ServiceCategory, ServiceType.category_id == ServiceCategory.id)
        .where(FactHeader.year == year)
    )
    fact_rows = facts_query.all()
    service_stats = {}
    for fact_item, fact_header, service_type, category in fact_rows:
        svc_id = service_type.id
        if svc_id not in service_stats:
            service_stats[svc_id] = {
                'name': service_type.name,
                'category': category.name if category else 'Без категории',
                'fact_amount': 0.0,
                'plan_amount': 0.0,
            }
        service_stats[svc_id]['fact_amount'] += float(fact_item.actual_amount or 0)

    for svc_id, stats in service_stats.items():
        plan_query = await db.execute(
            select(func.sum(PlanMonthly.amount))
            .join(PlanItem, PlanMonthly.plan_item_id == PlanItem.id)
            .join(PlanHeader, PlanItem.plan_header_id == PlanHeader.id)
            .where(
                PlanItem.service_type_id == svc_id,
                PlanMonthly.year == year,
                PlanHeader.start_year <= year,
                PlanHeader.start_year + (PlanHeader.period_months // 12) >= year
            )
        )
        stats['plan_amount'] = float(plan_query.scalar() or 0)

    deviations = []
    for stats in service_stats.values():
        dev_pct = ((stats['fact_amount'] - stats['plan_amount']) / stats['plan_amount'] * 100) if stats['plan_amount'] > 0 else 0.0
        deviations.append({
            'name': stats['name'], 'category': stats['category'],
            'plan': stats['plan_amount'], 'fact': stats['fact_amount'], 'deviation_pct': dev_pct
        })

    deviations.sort(key=lambda x: abs(x['deviation_pct']), reverse=True)
    top_deviations = [
        TopDeviation(service_name=d['name'], category_name=d['category'], plan_amount=d['plan'], fact_amount=d['fact'], deviation_pct=round(d['deviation_pct'], 1))
        for d in deviations[:5]
    ]

    # 4. Распределение по категориям
    categories_query = await db.execute(
        select(ServiceCategory.name, func.sum(PlanItem.total_amount))
        .join(ServiceType, ServiceCategory.id == ServiceType.category_id)
        .join(PlanItem, ServiceType.id == PlanItem.service_type_id)
        .join(PlanHeader, PlanItem.plan_header_id == PlanHeader.id)
        .where(PlanHeader.start_year <= year, PlanHeader.start_year + (PlanHeader.period_months // 12) >= year)
        .group_by(ServiceCategory.name)
    )
    category_rows = categories_query.all()
    total_by_categories = sum(float(row[1] or 0) for row in category_rows)
    category_distribution = [
        CategoryDistribution(
            category_name=row[0] or 'Без категории', 
            total_amount=float(row[1] or 0), 
            percentage=round(float(row[1] or 0) / total_by_categories * 100, 1) if total_by_categories > 0 else 0
        )
        for row in category_rows
    ]

    # 5. Алерты
    alerts = []
    for d in deviations:
        if abs(d['deviation_pct']) >= 20:
            svc_id_match = next((k for k, v in service_stats.items() if v['name'] == d['name']), None)
            if svc_id_match:
                obj_query = await db.execute(
                    select(FactHeader, Object)
                    .join(Object, FactHeader.object_id == Object.id)
                    .join(FactItem, FactHeader.id == FactItem.fact_header_id)
                    .where(FactItem.service_type_id == svc_id_match)
                    .limit(1)
                )
                obj_row = obj_query.first()
                if obj_row:
                    fact_header, obj = obj_row
                    alerts.append(Alert(
                        object_name=obj.name,
                        period=f"{month_names[fact_header.month - 1]} {fact_header.year}",
                        service_name=d['name'],
                        deviation_pct=round(d['deviation_pct'], 1),
                        severity="danger" if abs(d['deviation_pct']) >= 50 else "warning"
                    ))

    return DashboardResponse(
        kpi=kpi, 
        monthly_plan_fact=monthly_data, 
        top_deviations=top_deviations, 
        category_distribution=category_distribution, 
        alerts=alerts[:10]
    )