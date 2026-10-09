# backend/app/routers/cost_analysis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from decimal import Decimal

from app.db.database import get_db
from app.models.reports import Report
from app.models.facts import Act, ActItem, FactHeader
from app.models.objects import Object
from app.models.services import ServiceType, Resource, ResourceRate, ResourceNorm
from app.models.service_category import ServiceCategory
from app.models.user import User
from app.core.security import require_authenticated

router = APIRouter(prefix="/cost-analysis", tags=["Анализ себестоимости"])


@router.get("/reports/{report_id}")
async def analyze_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Детальный анализ себестоимости по отчёту (через акты)."""
    report = (await db.execute(
        select(Report).where(Report.id == report_id)
    )).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчёт не найден")
    
    obj = (await db.execute(
        select(Object).where(Object.id == report.object_id)
    )).scalar_one()
    
    # Получаем акты за период
    acts_query = (
        select(Act)
        .join(FactHeader, Act.fact_header_id == FactHeader.id)
        .where(
            FactHeader.object_id == obj.id,
            Act.status.in_(['APPROVED', 'SIGNED'])
        )
    )
    
    # Фильтр по месяцам и годам периода отчёта
    date_filter = or_(
        and_(FactHeader.year == report.start_year, FactHeader.month >= report.start_month),
        and_(FactHeader.year > report.start_year, FactHeader.year < report.end_year),
        and_(FactHeader.year == report.end_year, FactHeader.month <= report.end_month)
    )
    acts_query = acts_query.where(date_filter)
    
    acts = (await db.execute(acts_query)).scalars().all()
    act_ids = [a.id for a in acts]
    
    if not act_ids:
        return {
            "report_id": report.id,
            "report_name": report.name or f"Отчёт {report.id}",
            "object_name": obj.name,
            "period": f"{report.start_month}.{report.start_year} - {report.end_month}.{report.end_year}",
            "total_amount": "0",
            "materials_total": "0",
            "labor_total": "0",
            "transport_total": "0",
            "energy_total": "0",
            "other_total": "0",
            "services": []
        }
    
    # Группируем позиции по услугам
    services_data = {}
    for act in acts:
        act_items = (await db.execute(
            select(ActItem).where(ActItem.act_id == act.id)
        )).scalars().all()
        
        for item in act_items:
            svc_id = item.service_type_id
            if svc_id not in services_data:
                services_data[svc_id] = {
                    "quantity": Decimal('0'),
                    "amount": Decimal('0'),
                    "acts_count": 0
                }
            services_data[svc_id]["quantity"] += item.quantity or Decimal('0')
            services_data[svc_id]["amount"] += item.total_amount or Decimal('0')
            services_data[svc_id]["acts_count"] += 1
    
    # Детализация по ресурсам для каждой услуги
    services_result = []
    totals = {
        "materials": Decimal('0'),
        "labor": Decimal('0'),
        "transport": Decimal('0'),
        "energy": Decimal('0'),
        "other": Decimal('0')
    }
    
    for svc_id, data in services_data.items():
        # 🎯 ИСПРАВЛЕНО: добавлен selectinload для unit, чтобы избежать lazy loading в async
        svc = (await db.execute(
            select(ServiceType).options(selectinload(ServiceType.unit)).where(ServiceType.id == svc_id)
        )).scalar_one_or_none()
        if not svc:
            continue
        
        category = None
        if svc.category_id:
            category = (await db.execute(
                select(ServiceCategory).where(ServiceCategory.id == svc.category_id)
            )).scalar_one_or_none()
        
        # Получаем нормативы ресурсов для услуги
        norms = (await db.execute(
            select(ResourceNorm, Resource)
            .join(Resource, ResourceNorm.resource_id == Resource.id)
            .where(
                ResourceNorm.service_type_id == svc_id,
                ResourceNorm.is_active == True
            )
        )).all()
        
        resources_breakdown = []
        for norm, resource in norms:
            # Актуальная цена ресурса
            rate = (await db.execute(
                select(ResourceRate)
                .where(ResourceRate.resource_id == resource.id)
                .order_by(ResourceRate.valid_from.desc())
            )).scalars().first()
            
            price = rate.price_per_unit if rate else Decimal('0')
            quantity = data["quantity"] * norm.quantity_per_unit
            total = quantity * price
            
            # Классификация по типу ресурса
            res_type = (resource.resource_type or "other").lower()
            if res_type in ["material", "materials"]:
                totals["materials"] += total
            elif res_type in ["labor"]:
                totals["labor"] += total
            elif res_type in ["transport"]:
                totals["transport"] += total
            elif res_type in ["energy"]:
                totals["energy"] += total
            else:
                totals["other"] += total
            
            resources_breakdown.append({
                "resource_id": resource.id,
                "resource_name": resource.name,
                "resource_type": res_type,
                "unit": resource.unit or "ед.",
                "quantity": str(quantity),
                "price_per_unit": str(price),
                "total_amount": str(total)
            })
        
        # Рассчитываем затраты по типам ресурсов для услуги
        materials_cost = sum(
            Decimal(r["total_amount"]) for r in resources_breakdown 
            if r["resource_type"] in ["material", "materials"]
        )
        labor_cost = sum(
            Decimal(r["total_amount"]) for r in resources_breakdown 
            if r["resource_type"] == "labor"
        )
        transport_cost = sum(
            Decimal(r["total_amount"]) for r in resources_breakdown 
            if r["resource_type"] == "transport"
        )
        energy_cost = sum(
            Decimal(r["total_amount"]) for r in resources_breakdown 
            if r["resource_type"] == "energy"
        )
        other_cost = sum(
            Decimal(r["total_amount"]) for r in resources_breakdown 
            if r["resource_type"] not in ["material", "materials", "labor", "transport", "energy"]
        )
        
        services_result.append({
            "service_type_id": svc_id,
            "service_name": svc.name,
            "category_name": category.name if category else "Без категории",
            "unit_symbol": svc.unit.symbol if svc.unit else "ед.",
            "total_quantity": str(data["quantity"]),
            "total_amount": str(data["amount"]),
            "materials_cost": str(materials_cost),
            "labor_cost": str(labor_cost),
            "transport_cost": str(transport_cost),
            "energy_cost": str(energy_cost),
            "other_cost": str(other_cost),
            "resources": resources_breakdown
        })
    
    grand_total = sum(totals.values())
    
    return {
        "report_id": report.id,
        "report_name": report.name or f"Отчёт {report.id}",
        "object_name": obj.name,
        "period": f"{report.start_month}.{report.start_year} - {report.end_month}.{report.end_year}",
        "total_amount": str(grand_total),
        "materials_total": str(totals["materials"]),
        "labor_total": str(totals["labor"]),
        "transport_total": str(totals["transport"]),
        "energy_total": str(totals["energy"]),
        "other_total": str(totals["other"]),
        "services": services_result
    }


@router.post("/impact")
async def analyze_price_impact(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Анализ влияния изменения цен на итоговую стоимость."""
    report_id = data.get("report_id")
    resource_changes = data.get("resource_changes", {})  # {resource_id: new_price}
    
    report = (await db.execute(select(Report).where(Report.id == report_id))).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчёт не найден")
    
    # Базовый расчёт (как в analyze_report)
    base_analysis = await analyze_report(report_id, db, current_user)
    
    # Пересчёт с новыми ценами
    new_services_impact = []
    total_old = Decimal('0')
    total_new = Decimal('0')
    
    for service in base_analysis["services"]:
        old_amount = Decimal(service["total_amount"])
        new_amount = Decimal('0')
        
        for resource in service["resources"]:
            res_id = resource["resource_id"]
            quantity = Decimal(resource["quantity"])
            old_price = Decimal(resource["price_per_unit"])
            new_price = Decimal(str(resource_changes.get(str(res_id), old_price)))
            
            new_amount += quantity * new_price
        
        total_old += old_amount
        total_new += new_amount
        
        price_change = new_amount - old_amount
        new_services_impact.append({
            "service_type_id": service["service_type_id"],
            "service_name": service["service_name"],
            "old_price": str(old_amount),
            "new_price": str(new_amount),
            "price_change": str(price_change),
            "price_change_percent": str(round(float(price_change / old_amount * 100), 2)) if old_amount > 0 else "0",
            "total_amount_old": str(old_amount),
            "total_amount_new": str(new_amount),
            "amount_change": str(price_change)
        })
    
    total_change = total_new - total_old
    
    return {
        "report_id": report_id,
        "report_name": base_analysis["report_name"],
        "total_old": str(total_old),
        "total_new": str(total_new),
        "total_change": str(total_change),
        "total_change_percent": str(round(float(total_change / total_old * 100), 2)) if total_old > 0 else "0",
        "services_impact": new_services_impact
    }