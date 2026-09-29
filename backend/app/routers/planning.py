# backend/app/routers/planning.py
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal
from datetime import date

from app.db.database import get_db
from app.models.planning import PlanHeader, PlanItem, PlanResource, PlanMonthly
from app.models.objects import Object
from app.models.services import ServiceType, ServiceRate, Resource, ResourceRate, ResourceNorm
from app.models.service_category import ServiceCategory
from app.schemas.plan import (
    PlanHeaderCreate, PlanHeaderUpdate, PlanHeaderResponse,
    PlanItemWithMonthlyCreate, PlanItemUpdate, PlanItemWithMonthlyResponse,
    PlanMonthlyResponse, TariffCalculationResponse, PlanCopyRequest
)
from app.models.enums import PlanStatus
from app.utils.export import export_plan_to_excel, export_plan_to_pdf

router = APIRouter(prefix="/plans", tags=["Планирование"])


# ============================================================
# ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: ПОИСК РАСЦЕНКИ ДЛЯ МЕСЯЦА
# ============================================================
async def _get_rate_for_month(
    db: AsyncSession,
    service_type_id: int,
    object_id: Optional[int],
    year: int,
    month: int
) -> Optional[ServiceRate]:
    """Ищет актуальную расценку для конкретного месяца. Сначала для объекта, потом глобальную."""
    target_date = date(year, month, 1)

    # 1. Ищем расценку для конкретного объекта
    query = select(ServiceRate).where(
        ServiceRate.service_type_id == service_type_id,
        ServiceRate.object_id == object_id,
        ServiceRate.valid_from <= target_date,
        or_(ServiceRate.valid_to.is_(None), ServiceRate.valid_to >= target_date)
    ).order_by(ServiceRate.valid_from.desc())
    result = await db.execute(query)
    rate = result.scalars().first()

    # 2. Если не нашли, ищем глобальную расценку (object_id is None)
    if not rate:
        query = select(ServiceRate).where(
            ServiceRate.service_type_id == service_type_id,
            ServiceRate.object_id.is_(None),
            ServiceRate.valid_from <= target_date,
            or_(ServiceRate.valid_to.is_(None), ServiceRate.valid_to >= target_date)
        ).order_by(ServiceRate.valid_from.desc())
        result = await db.execute(query)
        rate = result.scalars().first()

    return rate


# ============================================================
# CRUD ПЛАНОВ
# ============================================================
@router.post("/", response_model=PlanHeaderResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(plan_in: PlanHeaderCreate, db: AsyncSession = Depends(get_db)):
    obj = await db.execute(select(Object).where(Object.id == plan_in.object_id))
    if not obj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Объект не найден")

    db_plan = PlanHeader(**plan_in.model_dump())
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan


@router.get("/", response_model=List[PlanHeaderResponse])
async def get_plans(
    object_id: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(PlanHeader)
    if object_id:
        query = query.where(PlanHeader.object_id == object_id)
    if year:
        query = query.where(PlanHeader.start_year == year)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{plan_id}", response_model=PlanHeaderResponse)
async def get_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")

    if plan.status != PlanStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить утверждённый или архивный план. Сначала переведите его в статус 'draft'."
        )

    await db.delete(plan)
    await db.commit()
    return None


# ============================================================
# КОПИРОВАНИЕ ПЛАНА С ИНДЕКСАЦИЕЙ
# ============================================================
@router.post("/{plan_id}/copy", response_model=PlanHeaderResponse, status_code=status.HTTP_201_CREATED)
async def copy_plan(
    plan_id: int,
    copy_request: PlanCopyRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PlanHeader)
        .options(selectinload(PlanHeader.items).selectinload(PlanItem.monthly))
        .options(selectinload(PlanHeader.items).selectinload(PlanItem.resources))
        .where(PlanHeader.id == plan_id)
    )
    source_plan = result.scalar_one_or_none()
    if not source_plan:
        raise HTTPException(status_code=404, detail="Исходный план не найден")

    new_plan = PlanHeader(
        object_id=copy_request.new_object_id,
        start_year=copy_request.new_start_year,
        start_month=copy_request.new_start_month,
        period_months=copy_request.new_period_months,
        name=copy_request.new_name or f"{source_plan.name} (копия)",
        status=PlanStatus.DRAFT
    )
    db.add(new_plan)
    await db.flush()

    inflation_multiplier = Decimal('1') + (Decimal(str(copy_request.inflation_percent)) / Decimal('100'))

    for source_item in source_plan.items:
        new_item = PlanItem(
            plan_header_id=new_plan.id,
            service_type_id=source_item.service_type_id,
            total_quantity=Decimal('0'),
            total_amount=Decimal('0'),
            frequency=source_item.frequency,
            description=source_item.description
        )
        db.add(new_item)
        await db.flush()

        total_quantity = Decimal('0')
        total_amount = Decimal('0')

        for source_monthly in source_item.monthly:
            old_month_index = (source_monthly.year - source_plan.start_year) * 12 + (source_monthly.month - source_plan.start_month)
            if old_month_index < 0 or old_month_index >= copy_request.new_period_months:
                continue

            new_month = copy_request.new_start_month + old_month_index
            new_year = copy_request.new_start_year
            while new_month > 12:
                new_month -= 12
                new_year += 1

            # Ищем расценку именно для этого нового месяца и объекта
            rate = await _get_rate_for_month(db, source_item.service_type_id, copy_request.new_object_id, new_year, new_month)

            if rate:
                new_unit_price = rate.price_per_unit * inflation_multiplier
            else:
                new_unit_price = Decimal('0')

            month_amount = source_monthly.quantity * new_unit_price
            total_quantity += source_monthly.quantity
            total_amount += month_amount

            db.add(PlanMonthly(
                plan_item_id=new_item.id,
                month=new_month,
                year=new_year,
                quantity=source_monthly.quantity,
                unit_price=new_unit_price,
                amount=month_amount
            ))

        new_item.total_quantity = total_quantity
        new_item.total_amount = total_amount

        # Ресурсы (агрегируем по итоговому количеству)
        norm_query = select(ResourceNorm).where(
            ResourceNorm.service_type_id == source_item.service_type_id,
            ResourceNorm.is_active == True,
            ResourceNorm.valid_from <= func.current_date(),
            or_(ResourceNorm.valid_to.is_(None), ResourceNorm.valid_to >= func.current_date())
        )
        norms_result = await db.execute(norm_query)
        for norm in norms_result.scalars().all():
            res_rate_query = select(ResourceRate).where(
                ResourceRate.resource_id == norm.resource_id,
                ResourceRate.valid_from <= func.current_date(),
                or_(ResourceRate.valid_to.is_(None), ResourceRate.valid_to >= func.current_date())
            ).order_by(ResourceRate.valid_from.desc())
            res_rate = (await db.execute(res_rate_query)).scalars().first()
            res_price = res_rate.price_per_unit if res_rate else Decimal('0')

            db.add(PlanResource(
                plan_item_id=new_item.id,
                resource_id=norm.resource_id,
                required_quantity=total_quantity * norm.quantity_per_unit,
                unit_price=res_price,
                total_amount=(total_quantity * norm.quantity_per_unit) * res_price
            ))

    await db.commit()
    await db.refresh(new_plan)
    return new_plan


# ============================================================
# 🆕 ЭНДПОИНТ ДЛЯ ПОЛУЧЕНИЯ РАСЦЕНОК ПО МЕСЯЦАМ
# ============================================================
@router.get("/{plan_id}/services/{service_type_id}/rates")
async def get_service_rates_for_plan(
    plan_id: int,
    service_type_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Возвращает актуальные расценки для услуги по каждому месяцу периода плана."""
    plan = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")

    rates_data = []
    for i in range(plan.period_months):
        m = plan.start_month + i
        y = plan.start_year
        while m > 12:
            m -= 12
            y += 1

        rate = await _get_rate_for_month(db, service_type_id, plan.object_id, y, m)
        rates_data.append({
            "month": m,
            "year": y,
            "unit_price": str(rate.price_per_unit) if rate else "0"
        })

    return rates_data


# ============================================================
# CRUD ПОЗИЦИЙ ПЛАНА
# ============================================================
@router.post("/{plan_id}/items", response_model=PlanItemWithMonthlyResponse, status_code=status.HTTP_201_CREATED)
async def add_plan_item(plan_id: int, item_in: PlanItemWithMonthlyCreate, db: AsyncSession = Depends(get_db)):
    plan = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")
    if plan.status != PlanStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Нельзя изменять утвержденный план")

    total_quantity = Decimal('0')
    total_amount = Decimal('0')

    db_item = PlanItem(
        plan_header_id=plan_id,
        service_type_id=item_in.service_type_id,
        total_quantity=total_quantity,
        total_amount=total_amount,
        frequency=item_in.frequency,
        description=item_in.description
    )
    db.add(db_item)
    await db.flush()

    for month_data in item_in.monthly_data:
        month_amount = month_data.quantity * month_data.unit_price
        total_quantity += month_data.quantity
        total_amount += month_amount

        db.add(PlanMonthly(
            plan_item_id=db_item.id,
            month=month_data.month,
            year=month_data.year,
            quantity=month_data.quantity,
            unit_price=month_data.unit_price,
            amount=month_amount
        ))

    db_item.total_quantity = total_quantity
    db_item.total_amount = total_amount
    await db.flush()

    await _create_plan_resources(db, db_item.id, item_in.service_type_id, total_quantity)
    await db.commit()

    result = await db.execute(
        select(PlanItem).options(selectinload(PlanItem.monthly)).where(PlanItem.id == db_item.id)
    )
    return _build_item_response(result.scalar_one())


@router.patch("/{plan_id}/items/{item_id}", response_model=PlanItemWithMonthlyResponse)
async def update_plan_item(
    plan_id: int,
    item_id: int,
    item_in: PlanItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    plan = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan or plan.status != PlanStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Нельзя изменять утвержденный план")

    db_item = (await db.execute(select(PlanItem).where(PlanItem.id == item_id))).scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Позиция не найдена")

    await db.execute(delete(PlanMonthly).where(PlanMonthly.plan_item_id == item_id))
    await db.execute(delete(PlanResource).where(PlanResource.plan_item_id == item_id))
    await db.flush()

    total_quantity = Decimal('0')
    total_amount = Decimal('0')

    for month_data in item_in.monthly_data:
        month_amount = month_data.quantity * month_data.unit_price
        total_quantity += month_data.quantity
        total_amount += month_amount

        db.add(PlanMonthly(
            plan_item_id=item_id,
            month=month_data.month,
            year=month_data.year,
            quantity=month_data.quantity,
            unit_price=month_data.unit_price,
            amount=month_amount
        ))

    db_item.service_type_id = item_in.service_type_id
    db_item.total_quantity = total_quantity
    db_item.total_amount = total_amount
    db_item.frequency = item_in.frequency
    db_item.description = item_in.description
    await db.flush()

    await _create_plan_resources(db, item_id, item_in.service_type_id, total_quantity)
    await db.commit()

    result = await db.execute(
        select(PlanItem).options(selectinload(PlanItem.monthly)).where(PlanItem.id == item_id)
    )
    return _build_item_response(result.scalar_one())


@router.delete("/{plan_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan_item(
    plan_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    plan = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan or plan.status != PlanStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Нельзя изменять утвержденный план")

    item = (await db.execute(
        select(PlanItem).where(PlanItem.id == item_id, PlanItem.plan_header_id == plan_id)
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Позиция не найдена")

    await db.delete(item)
    await db.commit()
    return None


async def _create_plan_resources(
    db: AsyncSession,
    plan_item_id: int,
    service_type_id: int,
    total_quantity: Decimal
):
    norm_query = select(ResourceNorm).where(
        ResourceNorm.service_type_id == service_type_id,
        ResourceNorm.is_active == True,
        ResourceNorm.valid_from <= func.current_date(),
        or_(ResourceNorm.valid_to.is_(None), ResourceNorm.valid_to >= func.current_date())
    )
    norms_result = await db.execute(norm_query)
    for norm in norms_result.scalars().all():
        res_rate = (await db.execute(select(ResourceRate).where(
            ResourceRate.resource_id == norm.resource_id,
            ResourceRate.valid_from <= func.current_date(),
            or_(ResourceRate.valid_to.is_(None), ResourceRate.valid_to >= func.current_date())
        ).order_by(ResourceRate.valid_from.desc()))).scalars().first()

        res_price = res_rate.price_per_unit if res_rate else Decimal('0')
        req_quantity = total_quantity * norm.quantity_per_unit

        db.add(PlanResource(
            plan_item_id=plan_item_id,
            resource_id=norm.resource_id,
            required_quantity=req_quantity,
            unit_price=res_price,
            total_amount=req_quantity * res_price
        ))


def _build_item_response(item: PlanItem) -> dict:
    return {
        "id": item.id,
        "plan_header_id": item.plan_header_id,
        "service_type_id": item.service_type_id,
        "total_quantity": str(item.total_quantity),
        "total_amount": str(item.total_amount),
        "frequency": item.frequency,
        "description": item.description,
        "monthly": [
            {
                "id": m.id,
                "plan_item_id": m.plan_item_id,
                "month": m.month,
                "year": m.year,
                "quantity": str(m.quantity),
                "unit_price": str(m.unit_price),
                "amount": str(m.amount) if m.amount else "0"
            }
            for m in sorted(item.monthly, key=lambda x: (x.year, x.month))
        ]
    }


@router.get("/{plan_id}/items", response_model=List[PlanItemWithMonthlyResponse])
async def get_plan_items(plan_id: int, db: AsyncSession = Depends(get_db)):
    items = (await db.execute(
        select(PlanItem).options(selectinload(PlanItem.monthly)).where(PlanItem.plan_header_id == plan_id)
    )).scalars().all()
    return [_build_item_response(item) for item in items]


@router.get("/{plan_id}/tariff", response_model=TariffCalculationResponse)
async def calculate_tariff(plan_id: int, db: AsyncSession = Depends(get_db)):
    plan = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")

    obj = (await db.execute(select(Object).where(Object.id == plan.object_id))).scalar_one()
    total_services = (await db.execute(
        select(func.sum(PlanItem.total_amount)).where(PlanItem.plan_header_id == plan_id)
    )).scalar() or Decimal('0')

    total_resources = (await db.execute(
        select(func.sum(PlanResource.total_amount)).join(PlanItem).where(PlanItem.plan_header_id == plan_id)
    )).scalar() or Decimal('0')

    grand_total = total_services + total_resources

    tariff_base = obj.tariff_base or "area"
    if tariff_base == "spaces":
        divisor = obj.spaces_count or Decimal('1')
        tariff_unit = "машиноместо"
    else:
        divisor = obj.area_sqm or Decimal('1')
        tariff_unit = "м²"

    tariff_per_unit = grand_total / divisor if divisor > 0 else Decimal('0')

    return TariffCalculationResponse(
        plan_id=plan_id,
        object_name=obj.name,
        object_type=obj.type,
        tariff_base=tariff_base,
        tariff_unit=tariff_unit,
        divisor=divisor,
        total_services_amount=total_services,
        total_resources_amount=total_resources,
        grand_total=grand_total,
        tariff_per_unit=round(tariff_per_unit, 2)
    )


# ============================================================
# 🆕 МАССОВЫЙ ПЕРЕСЧЁТ РАСЦЕНОК В ПЛАНЕ
# ============================================================
@router.post("/{plan_id}/recalculate-rates", response_model=PlanHeaderResponse)
async def recalculate_plan_rates(plan_id: int, db: AsyncSession = Depends(get_db)):
    """Обновляет unit_price во всех месяцах плана на основе актуальных расценок."""
    plan = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")
    if plan.status != PlanStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Нельзя пересчитать утверждённый или архивный план")

    items = (await db.execute(
        select(PlanItem).options(selectinload(PlanItem.monthly)).where(PlanItem.plan_header_id == plan_id)
    )).scalars().all()

    for item in items:
        item_total_amount = Decimal('0')
        item_total_quantity = Decimal('0')

        for monthly in item.monthly:
            rate = await _get_rate_for_month(db, item.service_type_id, plan.object_id, monthly.year, monthly.month)
            if rate:
                new_price = rate.price_per_unit
                monthly.unit_price = new_price
                monthly.amount = monthly.quantity * new_price

            item_total_quantity += monthly.quantity
            item_total_amount += monthly.amount

        # Обновляем итоги по позиции
        item.total_quantity = item_total_quantity
        item.total_amount = item_total_amount

    await db.commit()

    # Возвращаем обновленный план
    return (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one()


# ============================================================
# ЭКСПОРТ ПЛАНА
# ============================================================
@router.get("/{plan_id}/export/excel")
async def export_plan_excel(plan_id: int, db: AsyncSession = Depends(get_db)):
    plan_obj = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan_obj:
        raise HTTPException(status_code=404, detail="План не найден")

    obj_data = (await db.execute(select(Object).where(Object.id == plan_obj.object_id))).scalar_one()
    plan_items = (await db.execute(
        select(PlanItem).options(selectinload(PlanItem.monthly)).where(PlanItem.plan_header_id == plan_id)
    )).scalars().all()
    services_dict = {s.id: s for s in (await db.execute(
        select(ServiceType).options(selectinload(ServiceType.category), selectinload(ServiceType.unit))
    )).scalars().all()}
    categories = [{"id": c.id, "name": c.name} for c in (await db.execute(
        select(ServiceCategory).order_by(ServiceCategory.sort_order)
    )).scalars().all()]

    items_data = []
    for item in plan_items:
        svc = services_dict.get(item.service_type_id)
        items_data.append({
            "service_name": svc.name if svc else "Неизвестная услуга",
            "unit_symbol": svc.unit.symbol if svc and svc.unit else "ед.",
            "category_id": svc.category_id if svc else 0,
            "total_quantity": str(item.total_quantity),
            "unit_price": str(item.total_amount / item.total_quantity if item.total_quantity > 0 else 0),
            "total_amount": str(item.total_amount),
            "monthly": [{"month": m.month, "year": m.year, "quantity": str(m.quantity), "unit_price": str(m.unit_price)} for m in item.monthly]
        })

    total_services = (await db.execute(select(func.sum(PlanItem.total_amount)).where(PlanItem.plan_header_id == plan_id))).scalar() or Decimal('0')
    total_resources = (await db.execute(select(func.sum(PlanResource.total_amount)).join(PlanItem).where(PlanItem.plan_header_id == plan_id))).scalar() or Decimal('0')
    grand_total = total_services + total_resources

    tariff_unit = "машиноместо" if obj_data.tariff_base == "spaces" else "м²"
    divisor = (obj_data.spaces_count or Decimal('1')) if obj_data.tariff_base == "spaces" else (obj_data.area_sqm or Decimal('1'))

    file_buffer = export_plan_to_excel(
        {"name": plan_obj.name, "start_month": plan_obj.start_month, "start_year": plan_obj.start_year, "period_months": plan_obj.period_months},
        items_data, categories,
        {"object_name": obj_data.name, "tariff_unit": tariff_unit, "tariff_per_unit": str(round(grand_total / divisor if divisor > 0 else 0, 2)), "grand_total": str(grand_total)}
    )

    return StreamingResponse(file_buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{urllib.parse.quote(f'plan_{plan_obj.name}_{plan_obj.start_year}.xlsx')}"})


@router.get("/{plan_id}/export/pdf")
async def export_plan_pdf(plan_id: int, db: AsyncSession = Depends(get_db)):
    plan_obj = (await db.execute(select(PlanHeader).where(PlanHeader.id == plan_id))).scalar_one_or_none()
    if not plan_obj:
        raise HTTPException(status_code=404, detail="План не найден")

    obj_data = (await db.execute(select(Object).where(Object.id == plan_obj.object_id))).scalar_one()
    plan_items = (await db.execute(
        select(PlanItem).options(selectinload(PlanItem.monthly)).where(PlanItem.plan_header_id == plan_id)
    )).scalars().all()
    services_dict = {s.id: s for s in (await db.execute(
        select(ServiceType).options(selectinload(ServiceType.category), selectinload(ServiceType.unit))
    )).scalars().all()}
    categories = [{"id": c.id, "name": c.name} for c in (await db.execute(
        select(ServiceCategory).order_by(ServiceCategory.sort_order)
    )).scalars().all()]

    items_data = []
    for item in plan_items:
        svc = services_dict.get(item.service_type_id)
        items_data.append({
            "service_name": svc.name if svc else "Неизвестная услуга",
            "unit_symbol": svc.unit.symbol if svc and svc.unit else "ед.",
            "category_id": svc.category_id if svc else 0,
            "total_quantity": str(item.total_quantity),
            "unit_price": str(item.total_amount / item.total_quantity if item.total_quantity > 0 else 0),
            "total_amount": str(item.total_amount),
            "monthly": [{"month": m.month, "year": m.year, "quantity": str(m.quantity), "unit_price": str(m.unit_price)} for m in item.monthly]
        })

    total_services = (await db.execute(select(func.sum(PlanItem.total_amount)).where(PlanItem.plan_header_id == plan_id))).scalar() or Decimal('0')
    total_resources = (await db.execute(select(func.sum(PlanResource.total_amount)).join(PlanItem).where(PlanItem.plan_header_id == plan_id))).scalar() or Decimal('0')
    grand_total = total_services + total_resources

    tariff_unit = "машиноместо" if obj_data.tariff_base == "spaces" else "м²"
    divisor = (obj_data.spaces_count or Decimal('1')) if obj_data.tariff_base == "spaces" else (obj_data.area_sqm or Decimal('1'))

    file_buffer = export_plan_to_pdf(
        {"name": plan_obj.name, "start_month": plan_obj.start_month, "start_year": plan_obj.start_year, "period_months": plan_obj.period_months},
        items_data, categories,
        {"object_name": obj_data.name, "tariff_unit": tariff_unit, "tariff_per_unit": str(round(grand_total / divisor if divisor > 0 else 0, 2)), "grand_total": str(grand_total)}
    )

    return StreamingResponse(file_buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename*=UTF-8''{urllib.parse.quote(f'plan_{plan_obj.name}_{plan_obj.start_year}.pdf')}"})