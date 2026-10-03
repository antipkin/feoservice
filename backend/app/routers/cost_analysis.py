# backend/app/routers/cost_analysis.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal
from datetime import date

from app.db.database import get_db
from app.models.reports import Report, ReportItem
from app.models.objects import Object
from app.models.services import ServiceType, Resource, ResourceNorm, ResourceRate
from app.models.service_category import ServiceCategory
from app.models.user import User
from app.schemas.cost_analysis import (
    ReportCostAnalysisResponse,
    ServiceCostAnalysis,
    ResourceBreakdown,
    ImpactAnalysisRequest,
    ImpactAnalysisResponse,
    ServiceImpact,
)
from app.core.security import require_authenticated
from app.utils.audit_helper import log_action  # 🎯 ИМПОРТ ЛОГИРОВАНИЯ

router = APIRouter(prefix="/cost-analysis", tags=["Анализ себестоимости"])


async def get_resource_rate_for_date(
    db: AsyncSession,
    resource_id: int,
    target_date: date
) -> Optional[ResourceRate]:
    """Получает актуальную расценку на ресурс на указанную дату."""
    query = select(ResourceRate).where(
        ResourceRate.resource_id == resource_id,
        ResourceRate.valid_from <= target_date,
        or_(ResourceRate.valid_to.is_(None), ResourceRate.valid_to >= target_date)
    ).order_by(ResourceRate.valid_from.desc())
    result = await db.execute(query)
    return result.scalars().first()


async def _calculate_service_cost(
    db: AsyncSession,
    service_type_id: int,
    quantity: Decimal,
    target_date: date,
    price_overrides: dict = None
) -> dict:
    """
    Рассчитывает себестоимость услуги с разбивкой по типам ресурсов.
    price_overrides: {resource_id: new_price} — для анализа влияния изменений.
    """
    if price_overrides is None:
        price_overrides = {}

    norms_query = select(ResourceNorm).where(
        ResourceNorm.service_type_id == service_type_id,
        ResourceNorm.is_active == True,
        ResourceNorm.valid_from <= target_date,
        or_(ResourceNorm.valid_to.is_(None), ResourceNorm.valid_to >= target_date)
    )
    norms_result = await db.execute(norms_query)
    norms = norms_result.scalars().all()

    resource_ids = [norm.resource_id for norm in norms]
    if not resource_ids:
        return {
            'total': Decimal('0'),
            'materials': Decimal('0'),
            'labor': Decimal('0'),
            'transport': Decimal('0'),
            'energy': Decimal('0'),
            'other': Decimal('0'),
            'resources': []
        }

    resources_query = select(Resource).where(Resource.id.in_(resource_ids))
    resources_result = await db.execute(resources_query)
    resources_dict = {r.id: r for r in resources_result.scalars().all()}

    total = Decimal('0')
    materials = Decimal('0')
    labor = Decimal('0')
    transport = Decimal('0')
    energy = Decimal('0')
    other = Decimal('0')
    resources_breakdown = []

    for norm in norms:
        resource = resources_dict.get(norm.resource_id)
        if not resource:
            continue

        if norm.resource_id in price_overrides:
            price = price_overrides[norm.resource_id]
        else:
            rate = await get_resource_rate_for_date(db, norm.resource_id, target_date)
            price = rate.price_per_unit if rate else Decimal('0')

        resource_quantity = norm.quantity_per_unit * quantity
        resource_amount = resource_quantity * price

        if resource.resource_type == 'material':
            materials += resource_amount
        elif resource.resource_type == 'labor':
            labor += resource_amount
        elif resource.resource_type == 'transport':
            transport += resource_amount
        elif resource.resource_type == 'energy':
            energy += resource_amount
        else:
            other += resource_amount

        total += resource_amount
        resources_breakdown.append(ResourceBreakdown(
            resource_id=resource.id,
            resource_name=resource.name,
            resource_type=resource.resource_type,
            unit=resource.unit,
            quantity=resource_quantity,
            price_per_unit=price,
            total_amount=resource_amount
        ))

    return {
        'total': total,
        'materials': materials,
        'labor': labor,
        'transport': transport,
        'energy': energy,
        'other': other,
        'resources': resources_breakdown
    }


@router.get("/reports/{report_id}", response_model=ReportCostAnalysisResponse)
async def analyze_report_cost(
    report_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Анализирует себестоимость отчёта с разбивкой по типам ресурсов."""
    report_result = await db.execute(
        select(Report).options(selectinload(Report.items)).where(Report.id == report_id)
    )
    report = report_result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчёт не найден")

    obj_result = await db.execute(select(Object).where(Object.id == report.object_id))
    obj = obj_result.scalar_one()

    target_date = date(report.start_year, report.start_month, 1)

    services_analysis = []
    total_amount = Decimal('0')
    materials_total = Decimal('0')
    labor_total = Decimal('0')
    transport_total = Decimal('0')
    energy_total = Decimal('0')
    other_total = Decimal('0')

    for item in report.items:
        svc_result = await db.execute(
            select(ServiceType).options(selectinload(ServiceType.category), selectinload(ServiceType.unit))
            .where(ServiceType.id == item.service_type_id)
        )
        service = svc_result.scalar_one_or_none()
        if not service:
            continue

        cost_data = await _calculate_service_cost(
            db, item.service_type_id, item.total_quantity, target_date
        )

        services_analysis.append(ServiceCostAnalysis(
            service_type_id=item.service_type_id,
            service_name=item.service_name,
            category_name=service.category.name if service.category else None,
            unit_symbol=service.unit.symbol if service.unit else 'ед.',
            total_quantity=item.total_quantity,
            total_amount=item.total_amount,
            materials_cost=cost_data['materials'],
            labor_cost=cost_data['labor'],
            transport_cost=cost_data['transport'],
            energy_cost=cost_data['energy'],
            other_cost=cost_data['other'],
            resources=cost_data['resources']
        ))

        total_amount += item.total_amount
        materials_total += cost_data['materials']
        labor_total += cost_data['labor']
        transport_total += cost_data['transport']
        energy_total += cost_data['energy']
        other_total += cost_data['other']

    MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    period = f"{MONTH_NAMES[report.start_month - 1]} {report.start_year} — {MONTH_NAMES[report.end_month - 1]} {report.end_year}"

    return ReportCostAnalysisResponse(
        report_id=report.id,
        report_name=report.name or "Отчёт",
        object_name=obj.name,
        period=period,
        total_amount=total_amount,
        materials_total=materials_total,
        labor_total=labor_total,
        transport_total=transport_total,
        energy_total=energy_total,
        other_total=other_total,
        services=services_analysis
    )


@router.post("/impact", response_model=ImpactAnalysisResponse)
async def analyze_impact(
    request: Request,  # 🎯 Добавлено для получения IP
    payload: ImpactAnalysisRequest,  # 🎯 Переименовано из 'request' во избежание конфликта типов
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)  # 🎯 Проверка прав
):
    """Анализирует влияние изменения цен на ресурсы на итоговую стоимость отчёта."""
    report_result = await db.execute(
        select(Report).options(selectinload(Report.items)).where(Report.id == payload.report_id)
    )
    report = report_result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчёт не найден")

    price_overrides = {change.resource_id: change.new_price for change in payload.price_changes}
    target_date = date(report.start_year, report.start_month, 1)

    services_impact = []
    total_old = Decimal('0')
    total_new = Decimal('0')

    for item in report.items:
        old_cost_data = await _calculate_service_cost(
            db, item.service_type_id, item.total_quantity, target_date, {}
        )
        old_total = old_cost_data['total']

        new_cost_data = await _calculate_service_cost(
            db, item.service_type_id, item.total_quantity, target_date, price_overrides
        )
        new_total = new_cost_data['total']

        price_change = new_total - old_total
        price_change_percent = (price_change / old_total * 100) if old_total > 0 else Decimal('0')

        svc_result = await db.execute(
            select(ServiceType).where(ServiceType.id == item.service_type_id)
        )
        service = svc_result.scalar_one_or_none()

        services_impact.append(ServiceImpact(
            service_type_id=item.service_type_id,
            service_name=service.name if service else "Неизвестно",
            old_price=old_total / item.total_quantity if item.total_quantity > 0 else Decimal('0'),
            new_price=new_total / item.total_quantity if item.total_quantity > 0 else Decimal('0'),
            price_change=price_change / item.total_quantity if item.total_quantity > 0 else Decimal('0'),
            price_change_percent=price_change_percent,
            total_amount_old=item.total_amount,
            total_amount_new=item.total_amount + price_change,
            amount_change=price_change
        ))

        total_old += item.total_amount
        total_new += item.total_amount + price_change

    total_change = total_new - total_old
    total_change_percent = (total_change / total_old * 100) if total_old > 0 else Decimal('0')

    # 🎯 ЛОГИРОВАНИЕ ЗАПУСКА МОДЕЛИРОВАНИЯ (даже если это не меняет БД, это важное действие пользователя)
    await log_action(
        db=db,
        user=current_user,
        action="IMPACT_ANALYSIS",
        resource_type="REPORT",
        resource_id=payload.report_id,
        new_values={
            "price_changes_count": len(payload.price_changes),
            "total_change": str(total_change)
        },
        ip_address=request.client.host if request.client else None
    )

    return ImpactAnalysisResponse(
        report_id=report.id,
        report_name=report.name or "Отчёт",
        total_old=total_old,
        total_new=total_new,
        total_change=total_change,
        total_change_percent=total_change_percent,
        services_impact=services_impact
    )