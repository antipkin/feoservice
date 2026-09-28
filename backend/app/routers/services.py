import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.db.database import get_db
from app.models.services import ServiceType, ServiceRate
from app.models.planning import PlanItem, PlanHeader
from app.models.facts import FactItem, FactHeader
from app.schemas.service import (
    ServiceTypeCreate, ServiceTypeUpdate, ServiceTypeResponse,
    ServiceRateCreate, ServiceRateUpdate, ServiceRateResponse
)
from app.utils.export import export_rates_to_excel, export_rates_to_pdf

router = APIRouter(prefix="/services", tags=["Справочники: Услуги и расценки"])

# ============================================================
# SERVICE TYPES (Услуги)
# ============================================================
@router.get("/types", response_model=List[ServiceTypeResponse])
async def get_service_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceType)
        .options(selectinload(ServiceType.unit), selectinload(ServiceType.category))
        .where(ServiceType.is_active == True)
        .order_by(ServiceType.name)
    )
    return result.scalars().all()

@router.post("/types", response_model=ServiceTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_service_type(item: ServiceTypeCreate, db: AsyncSession = Depends(get_db)):
    db_item = ServiceType(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.patch("/types/{item_id}", response_model=ServiceTypeResponse)
async def update_service_type(item_id: int, item_in: ServiceTypeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServiceType).where(ServiceType.id == item_id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(status_code=404, detail="Услуга не найдена")
    
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/types/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_type(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServiceType).where(ServiceType.id == item_id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(status_code=404, detail="Услуга не найдена")
    await db.delete(item)
    await db.commit()
    return None

# ============================================================
# SERVICE RATES (Расценки)
# ============================================================
@router.get("/rates", response_model=List[ServiceRateResponse])
async def get_service_rates(
    object_id: Optional[int] = None,
    service_type_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(ServiceRate).options(
        selectinload(ServiceRate.service_type).selectinload(ServiceType.unit),
        selectinload(ServiceRate.object)
    )
    if object_id is not None:
        query = query.where(ServiceRate.object_id == object_id)
    if service_type_id is not None:
        query = query.where(ServiceRate.service_type_id == service_type_id)
    
    query = query.order_by(ServiceRate.valid_from.desc())
    result = await db.execute(query)
    rates = result.scalars().all()
    
    response = []
    for r in rates:
        response.append(ServiceRateResponse(
            id=r.id,
            object_id=r.object_id,
            service_type_id=r.service_type_id,
            price_per_unit=r.price_per_unit,
            valid_from=r.valid_from,
            valid_to=r.valid_to,
            service_name=r.service_type.name if r.service_type else "Неизвестно",
            object_name=r.object.name if r.object else "Глобальная"
        ))
    return response

@router.post("/rates", response_model=ServiceRateResponse, status_code=status.HTTP_201_CREATED)
async def create_service_rate(item: ServiceRateCreate, db: AsyncSession = Depends(get_db)):
    # 🎯 ИСПРАВЛЕННАЯ ПРОВЕРКА НА ПЕРЕСЕЧЕНИЕ ПЕРИОДОВ (учитывает None для valid_to)
    # Два периода [start1, end1] и [start2, end2] пересекаются, если:
    # start1 <= end2 (или end2 is None) AND start2 <= end1 (или end1 is None)
    
    if item.valid_to is None:
        # Новая расценка бессрочная. Пересекается с любой существующей, которая:
        # заканчивается после начала новой ИЛИ тоже бессрочная
        overlap_filter = and_(
            ServiceRate.object_id == item.object_id,
            ServiceRate.service_type_id == item.service_type_id,
            or_(ServiceRate.valid_to >= item.valid_from, ServiceRate.valid_to.is_(None))
        )
    else:
        # Новая расценка имеет конец. Пересекается, если:
        # (существующая заканчивается после начала новой ИЛИ бессрочная)
        # AND (новая заканчивается после начала существующей)
        overlap_filter = and_(
            ServiceRate.object_id == item.object_id,
            ServiceRate.service_type_id == item.service_type_id,
            or_(ServiceRate.valid_to >= item.valid_from, ServiceRate.valid_to.is_(None)),
            item.valid_to >= ServiceRate.valid_from
        )

    result = await db.execute(select(ServiceRate).where(overlap_filter))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail="Расценка на этот период для данного объекта уже существует или пересекается с существующей"
        )

    db_item = ServiceRate(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item, attribute_names=['service_type', 'object'])
    
    return ServiceRateResponse(
        id=db_item.id, object_id=db_item.object_id, service_type_id=db_item.service_type_id,
        price_per_unit=db_item.price_per_unit, valid_from=db_item.valid_from, valid_to=db_item.valid_to,
        service_name=db_item.service_type.name, object_name=db_item.object.name if db_item.object else "Глобальная"
    )

@router.patch("/rates/{rate_id}", response_model=ServiceRateResponse)
async def update_service_rate(rate_id: int, item_in: ServiceRateUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServiceRate).where(ServiceRate.id == rate_id))
    item = result.scalar_one_or_none()
    if not item: raise HTTPException(status_code=404, detail="Расценка не найдена")
    
    update_data = item_in.model_dump(exclude_unset=True)
    
    # Если меняем даты, нужно проверить пересечение с ДРУГИМИ расценками
    if 'valid_from' in update_data or 'valid_to' in update_data:
        check_from = update_data.get('valid_from', item.valid_from)
        check_to = update_data.get('valid_to', item.valid_to)
        
        if check_to is None:
            overlap_filter = and_(
                ServiceRate.object_id == item.object_id,
                ServiceRate.service_type_id == item.service_type_id,
                ServiceRate.id != rate_id, # Исключаем текущую расценку
                or_(ServiceRate.valid_to >= check_from, ServiceRate.valid_to.is_(None))
            )
        else:
            overlap_filter = and_(
                ServiceRate.object_id == item.object_id,
                ServiceRate.service_type_id == item.service_type_id,
                ServiceRate.id != rate_id,
                or_(ServiceRate.valid_to >= check_from, ServiceRate.valid_to.is_(None)),
                check_to >= ServiceRate.valid_from
            )
        
        overlap_result = await db.execute(select(ServiceRate).where(overlap_filter))
        if overlap_result.scalar_one_or_none():
            raise HTTPException(
                status_code=400, 
                detail="Измененный период пересекается с другой существующей расценкой"
            )

    for field, value in update_data.items():
        setattr(item, field, value)
        
    await db.commit()
    await db.refresh(item, attribute_names=['service_type', 'object'])
    
    return ServiceRateResponse(
        id=item.id, object_id=item.object_id, service_type_id=item.service_type_id,
        price_per_unit=item.price_per_unit, valid_from=item.valid_from, valid_to=item.valid_to,
        service_name=item.service_type.name, object_name=item.object.name if item.object else "Глобальная"
    )

@router.delete("/rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_rate(rate_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceRate).options(selectinload(ServiceRate.service_type), selectinload(ServiceRate.object))
        .where(ServiceRate.id == rate_id)
    )
    rate = result.scalar_one_or_none()
    if not rate: raise HTTPException(status_code=404, detail="Расценка не найдена")

    # ПРОВЕРКА: используется ли расценка в планах или актах
    plan_check = await db.execute(
        select(PlanItem.id)
        .join(PlanHeader, PlanItem.plan_header_id == PlanHeader.id)
        .where(
            PlanHeader.object_id == rate.object_id,
            PlanItem.service_type_id == rate.service_type_id,
            PlanItem.unit_price == rate.price_per_unit
        )
    )
    act_check = await db.execute(
        select(FactItem.id)
        .join(FactHeader, FactItem.fact_header_id == FactHeader.id)
        .where(
            FactHeader.object_id == rate.object_id,
            FactItem.service_type_id == rate.service_type_id,
            FactItem.unit_price == rate.price_per_unit
        )
    )
    
    if plan_check.scalar_one_or_none() or act_check.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail="Невозможно удалить расценку, так как она используется в существующих планах или актах."
        )

    await db.delete(rate)
    await db.commit()
    return None

# ============================================================
# ЭКСПОРТ РАСЦЕНОК
# ============================================================
@router.get("/rates/export/excel")
async def export_rates_excel(
    object_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(ServiceRate).options(
        selectinload(ServiceRate.service_type).selectinload(ServiceType.unit),
        selectinload(ServiceRate.object)
    )
    if object_id is not None:
        query = query.where(ServiceRate.object_id == object_id)
    query = query.order_by(ServiceRate.object_id, ServiceRate.service_type_id, ServiceRate.valid_from.desc())
    
    result = await db.execute(query)
    rates = result.scalars().all()
    
    rates_data = []
    for r in rates:
        rates_data.append({
            "object_name": r.object.name if r.object else "Глобальная",
            "service_name": r.service_type.name if r.service_type else "Неизвестно",
            "unit_symbol": r.service_type.unit.symbol if r.service_type and r.service_type.unit else "ед.",
            "price_per_unit": str(r.price_per_unit),
            "valid_from": r.valid_from.strftime("%d.%m.%Y"),
            "valid_to": r.valid_to.strftime("%d.%m.%Y") if r.valid_to else "Бессрочно",
        })
    
    file_buffer = export_rates_to_excel(rates_data)
    obj_name = f"объект_{object_id}" if object_id else "все_объекты"
    filename = f"rates_{obj_name}.xlsx"
    
    return StreamingResponse(
        file_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}"}
    )

@router.get("/rates/export/pdf")
async def export_rates_pdf(
    object_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(ServiceRate).options(
        selectinload(ServiceRate.service_type).selectinload(ServiceType.unit),
        selectinload(ServiceRate.object)
    )
    if object_id is not None:
        query = query.where(ServiceRate.object_id == object_id)
    query = query.order_by(ServiceRate.object_id, ServiceRate.service_type_id, ServiceRate.valid_from.desc())
    
    result = await db.execute(query)
    rates = result.scalars().all()
    
    rates_data = []
    for r in rates:
        rates_data.append({
            "object_name": r.object.name if r.object else "Глобальная",
            "service_name": r.service_type.name if r.service_type else "Неизвестно",
            "unit_symbol": r.service_type.unit.symbol if r.service_type and r.service_type.unit else "ед.",
            "price_per_unit": str(r.price_per_unit),
            "valid_from": r.valid_from.strftime("%d.%m.%Y"),
            "valid_to": r.valid_to.strftime("%d.%m.%Y") if r.valid_to else "Бессрочно",
        })
    
    file_buffer = export_rates_to_pdf(rates_data)
    obj_name = f"объект_{object_id}" if object_id else "все_объекты"
    filename = f"rates_{obj_name}.pdf"
    
    return StreamingResponse(
        file_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}"}
    )