import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal

from app.db.database import get_db
from app.models.facts import FactHeader, FactItem, FactResource, Act, ActItem
from app.models.planning import PlanHeader, PlanItem, PlanMonthly, PlanResource
from app.models.services import ServiceType
from app.models.objects import Object
from app.models.service_category import ServiceCategory
from app.schemas.fact import (
    FactHeaderCreate, FactHeaderUpdate, FactHeaderResponse,
    FactItemCreate, FactItemUpdate, FactItemResponse,
    PlanFactComparisonItem
)
from app.models.enums import FactStatus
from app.utils.export import export_fact_to_excel, export_fact_to_pdf

router = APIRouter(prefix="/facts", tags=["Учёт факта"])

# --- Fact Headers ---
@router.post("/", response_model=FactHeaderResponse, status_code=status.HTTP_201_CREATED)
async def create_fact_header(fact_in: FactHeaderCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(FactHeader).where(
            FactHeader.object_id == fact_in.object_id,
            FactHeader.year == fact_in.year,
            FactHeader.month == fact_in.month
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Факт для этого объекта на {fact_in.month}/{fact_in.year} уже существует")
    
    db_fact = FactHeader(**fact_in.model_dump())
    db.add(db_fact)
    await db.commit()
    await db.refresh(db_fact)
    return db_fact

@router.get("/", response_model=List[FactHeaderResponse])
async def get_fact_headers(
    object_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(FactHeader)
    if object_id: query = query.where(FactHeader.object_id == object_id)
    if year: query = query.where(FactHeader.year == year)
    if month: query = query.where(FactHeader.month == month)
    
    result = await db.execute(query.order_by(FactHeader.year.desc(), FactHeader.month.desc()))
    return result.scalars().all()

@router.get("/{fact_id}", response_model=FactHeaderResponse)
async def get_fact_header(fact_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    fact = result.scalar_one_or_none()
    if not fact: raise HTTPException(status_code=404, detail="Факт не найден")
    return fact

@router.patch("/{fact_id}", response_model=FactHeaderResponse)
async def update_fact_header(fact_id: int, fact_in: FactHeaderUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    fact = result.scalar_one_or_none()
    if not fact: raise HTTPException(status_code=404, detail="Факт не найден")
    
    for field, value in fact_in.model_dump(exclude_unset=True).items():
        setattr(fact, field, value)
    
    await db.commit()
    await db.refresh(fact)
    return fact

@router.delete("/{fact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fact_header(fact_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    fact = result.scalar_one_or_none()
    if not fact: raise HTTPException(status_code=404, detail="Факт не найден")
    if fact.status != FactStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Нельзя удалить утверждённый факт.")
    
    await db.delete(fact)
    await db.commit()
    return None

# --- Копирование из плана в факт ---
@router.post("/{fact_id}/copy-from-plan", response_model=List[FactItemResponse])
async def copy_plan_to_fact(fact_id: int, plan_id: int, month: int, year: int, db: AsyncSession = Depends(get_db)):
    fact = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    fact_obj = fact.scalar_one_or_none()
    if not fact_obj: raise HTTPException(status_code=404, detail="Факт не найден")
    if fact_obj.status != FactStatus.DRAFT: raise HTTPException(status_code=400, detail="Нельзя изменять утвержденный факт")

    plan_items_query = (
        select(PlanItem, PlanMonthly)
        .join(PlanMonthly, PlanItem.id == PlanMonthly.plan_item_id)
        .where(PlanItem.plan_header_id == plan_id, PlanMonthly.month == month, PlanMonthly.year == year, PlanMonthly.quantity > 0)
    )
    plan_rows = (await db.execute(plan_items_query)).all()
    if not plan_rows: raise HTTPException(status_code=404, detail="В плане на этот месяц нет услуг с количеством > 0")

    created_facts = []
    for plan_item, plan_monthly in plan_rows:
        fact_item = FactItem(
            fact_header_id=fact_id, plan_item_id=plan_item.id, service_type_id=plan_item.service_type_id,
            actual_quantity=plan_monthly.quantity, unit_price=plan_item.unit_price,
            actual_amount=plan_monthly.quantity * plan_item.unit_price
        )
        db.add(fact_item)
        created_facts.append(fact_item)

    await db.commit()
    for item in created_facts: await db.refresh(item)
    return created_facts

# --- Fact Items ---
@router.post("/{fact_id}/items", response_model=FactItemResponse, status_code=status.HTTP_201_CREATED)
async def add_fact_item(fact_id: int, item_in: FactItemCreate, db: AsyncSession = Depends(get_db)):
    fact = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    if not fact.scalar_one_or_none(): raise HTTPException(status_code=404, detail="Факт не найден")
    
    actual_amount = item_in.actual_quantity * item_in.unit_price
    db_item = FactItem(fact_header_id=fact_id, **item_in.model_dump(), actual_amount=actual_amount)
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.get("/{fact_id}/items", response_model=List[FactItemResponse])
async def get_fact_items(fact_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FactItem).where(FactItem.fact_header_id == fact_id))
    return result.scalars().all()

@router.patch("/items/{item_id}", response_model=FactItemResponse)
async def update_fact_item(item_id: int, item_in: FactItemUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FactItem).where(FactItem.id == item_id))
    fact_item = result.scalar_one_or_none()
    if not fact_item: raise HTTPException(status_code=404, detail="Позиция факта не найдена")

    header = await db.execute(select(FactHeader).where(FactHeader.id == fact_item.fact_header_id))
    if header.scalar_one().status != FactStatus.DRAFT: raise HTTPException(status_code=400, detail="Нельзя изменять утвержденный факт")

    update_data = item_in.model_dump(exclude_unset=True)
    if "actual_quantity" in update_data or "unit_price" in update_data:
        qty = update_data.get("actual_quantity", fact_item.actual_quantity)
        price = update_data.get("unit_price", fact_item.unit_price)
        update_data["actual_amount"] = qty * price

    for field, value in update_data.items():
        setattr(fact_item, field, value)

    await db.commit()
    await db.refresh(fact_item)
    return fact_item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fact_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FactItem).where(FactItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(status_code=404, detail="Позиция факта не найдена")
    
    await db.delete(item)
    await db.commit()
    return None

# --- Получение данных для таблицы План-Факт ---
@router.get("/{fact_id}/plan-fact", response_model=List[PlanFactComparisonItem])
async def get_plan_fact_comparison(fact_id: int, db: AsyncSession = Depends(get_db)):
    fact = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    fact_obj = fact.scalar_one_or_none()
    if not fact_obj: raise HTTPException(status_code=404, detail="Факт не найден")

    plan_query = select(PlanHeader).where(PlanHeader.object_id == fact_obj.object_id, PlanHeader.start_year <= fact_obj.year)
    plan_obj = (await db.execute(plan_query)).scalars().first()
    if not plan_obj: raise HTTPException(status_code=404, detail="План для данного объекта не найден")

    plan_data_query = (
        select(PlanItem, PlanMonthly, ServiceType)
        .join(PlanMonthly, PlanItem.id == PlanMonthly.plan_item_id)
        .join(ServiceType, PlanItem.service_type_id == ServiceType.id)
        .options(selectinload(ServiceType.unit))
        .where(PlanItem.plan_header_id == plan_obj.id, PlanMonthly.month == fact_obj.month, PlanMonthly.year == fact_obj.year)
    )
    plan_dict = {}
    for plan_item, plan_monthly, service_type in (await db.execute(plan_data_query)).all():
        plan_dict[plan_item.service_type_id] = {'plan_item': plan_item, 'plan_monthly': plan_monthly, 'service_type': service_type}

    fact_data_query = (
        select(FactItem, ServiceType)
        .join(ServiceType, FactItem.service_type_id == ServiceType.id)
        .options(selectinload(ServiceType.unit))
        .where(FactItem.fact_header_id == fact_id)
    )
    fact_dict = {}
    for fact_item, service_type in (await db.execute(fact_data_query)).all():
        fact_dict[fact_item.service_type_id] = {'fact_item': fact_item, 'service_type': service_type}

    comparison_list = []
    for svc_id in set(plan_dict.keys()) | set(fact_dict.keys()):
        plan_data = plan_dict.get(svc_id)
        fact_data = fact_dict.get(svc_id)

        if plan_data:
            svc_name = plan_data['service_type'].name
            unit_symbol = plan_data['service_type'].unit.symbol if plan_data['service_type'].unit else "ед."
            plan_qty = plan_data['plan_monthly'].quantity
            plan_amt = plan_data['plan_monthly'].amount or (plan_qty * plan_data['plan_item'].unit_price)
        else:
            svc_name = fact_data['service_type'].name
            unit_symbol = fact_data['service_type'].unit.symbol if fact_data['service_type'].unit else "ед."
            plan_qty = Decimal('0')
            plan_amt = Decimal('0')

        fact_qty = fact_data['fact_item'].actual_quantity if fact_data else Decimal('0')
        fact_amt = fact_data['fact_item'].actual_amount if fact_data else Decimal('0')
        dev_qty = fact_qty - plan_qty
        dev_pct = (dev_qty / plan_qty * 100) if plan_qty > 0 else Decimal('0')

        comparison_list.append(PlanFactComparisonItem(
            service_type_id=svc_id,
            service_name=svc_name, unit_symbol=unit_symbol, plan_quantity=plan_qty, fact_quantity=fact_qty,
            plan_amount=plan_amt, fact_amount=fact_amt, deviation_qty=dev_qty, deviation_pct=round(dev_pct, 2)
        ))

    return comparison_list


# ============================================================
# ЭКСПОРТ ФАКТА
# ============================================================
@router.get("/{fact_id}/export/excel")
async def export_fact_excel(fact_id: int, db: AsyncSession = Depends(get_db)):
    fact_result = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    fact_obj = fact_result.scalar_one_or_none()
    if not fact_obj:
        raise HTTPException(status_code=404, detail="Факт не найден")
    
    obj_result = await db.execute(select(Object).where(Object.id == fact_obj.object_id))
    obj_data = obj_result.scalar_one_or_none()
    
    comparison = await get_plan_fact_comparison(fact_id, db)
    comparison_data = [item.model_dump() for item in comparison]
    
    fact_data = {"month": fact_obj.month, "year": fact_obj.year}
    file_buffer = export_fact_to_excel(fact_data, comparison_data, obj_data.name)
    
    month_names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    raw_filename = f"fact_{obj_data.name}_{month_names[fact_obj.month - 1]}_{fact_obj.year}.xlsx"
    encoded_filename = urllib.parse.quote(raw_filename)
    
    return StreamingResponse(
        file_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/{fact_id}/export/pdf")
async def export_fact_pdf(fact_id: int, db: AsyncSession = Depends(get_db)):
    fact_result = await db.execute(select(FactHeader).where(FactHeader.id == fact_id))
    fact_obj = fact_result.scalar_one_or_none()
    if not fact_obj:
        raise HTTPException(status_code=404, detail="Факт не найден")
    
    obj_result = await db.execute(select(Object).where(Object.id == fact_obj.object_id))
    obj_data = obj_result.scalar_one_or_none()
    
    comparison = await get_plan_fact_comparison(fact_id, db)
    comparison_data = [item.model_dump() for item in comparison]
    
    fact_data = {"month": fact_obj.month, "year": fact_obj.year}
    file_buffer = export_fact_to_pdf(fact_data, comparison_data, obj_data.name)
    
    month_names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    raw_filename = f"fact_{obj_data.name}_{month_names[fact_obj.month - 1]}_{fact_obj.year}.pdf"
    encoded_filename = urllib.parse.quote(raw_filename)
    
    return StreamingResponse(
        file_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )