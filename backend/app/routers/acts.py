from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal
from datetime import date
import urllib.parse

from app.db.database import get_db
from app.models.facts import Act, ActItem, FactHeader, FactItem
from app.models.services import ServiceType
from app.models.objects import Object
from app.schemas.act import (
    ActCreate, ActResponse, ActListItem, ActItemResponse
)
from app.utils.export import export_act_to_pdf

router = APIRouter(prefix="/acts", tags=["Акты выполненных работ"])


# --- Генерация номера акта ---
async def _generate_act_number(db: AsyncSession) -> str:
    """Генерирует уникальный номер акта вида АКТ-YYYY-NNN."""
    year = date.today().year
    # Считаем количество актов в текущем году
    result = await db.execute(
        select(func.count(Act.id)).where(
            Act.act_number.like(f'АКТ-{year}-%')
        )
    )
    count = result.scalar() or 0
    return f"АКТ-{year}-{str(count + 1).zfill(3)}"


# --- Создание акта из факта ---
@router.post("/from-fact/{fact_id}", response_model=ActResponse, status_code=status.HTTP_201_CREATED)
async def create_act_from_fact(fact_id: int, db: AsyncSession = Depends(get_db)):
    """
    Создаёт акт на основе факта. Копирует все позиции факта в акт,
    включая периодичность из справочника услуг.
    """
    # 1. Получаем факт с позициями
    fact_result = await db.execute(
        select(FactHeader)
        .options(selectinload(FactHeader.items))
        .where(FactHeader.id == fact_id)
    )
    fact = fact_result.scalar_one_or_none()
    if not fact:
        raise HTTPException(status_code=404, detail="Факт не найден")

    # 2. Проверяем, не создан ли уже акт для этого факта
    existing_act = await db.execute(
        select(Act).where(Act.fact_header_id == fact_id)
    )
    if existing_act.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Акт для этого факта уже существует"
        )

    # 3. Получаем услуги с периодичностью
    service_ids = [item.service_type_id for item in fact.items]
    services_result = await db.execute(
        select(ServiceType).where(ServiceType.id.in_(service_ids))
    )
    services_dict = {s.id: s for s in services_result.scalars().all()}

    # 4. Создаём акт
    act_number = await _generate_act_number(db)
    act = Act(
        act_number=act_number,
        act_date=date.today(),
        fact_header_id=fact_id,
        total_amount=Decimal('0'),
        status="created"
    )
    db.add(act)
    await db.flush()

    # 5. Копируем позиции факта в акт
    total = Decimal('0')
    for fact_item in fact.items:
        service = services_dict.get(fact_item.service_type_id)
        act_item = ActItem(
            act_id=act.id,
            service_type_id=fact_item.service_type_id,
            frequency=service.frequency if service else None,
            quantity=fact_item.actual_quantity,
            unit_price=fact_item.unit_price,
            total_amount=fact_item.actual_amount
        )
        db.add(act_item)
        total += fact_item.actual_amount or Decimal('0')

    act.total_amount = total
    await db.commit()

    # 6. Возвращаем созданный акт с позициями
    result = await db.execute(
        select(Act)
        .options(selectinload(Act.items))
        .where(Act.id == act.id)
    )
    return result.scalar_one()


# --- Получение списка актов ---
@router.get("/", response_model=List[ActListItem])
async def get_acts(
    object_id: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Act).join(FactHeader, Act.fact_header_id == FactHeader.id)
    if object_id:
        query = query.where(FactHeader.object_id == object_id)
    if year:
        query = query.where(FactHeader.year == year)
    query = query.order_by(Act.act_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


# --- Получение акта по ID ---
@router.get("/{act_id}", response_model=ActResponse)
async def get_act(act_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Act)
        .options(selectinload(Act.items))
        .where(Act.id == act_id)
    )
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")
    return act


# --- Удаление акта ---
@router.delete("/{act_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_act(act_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Act).where(Act.id == act_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")
    await db.delete(act)
    await db.commit()
    return None


# --- Экспорт акта в PDF ---
@router.get("/{act_id}/export/pdf")
async def export_act_pdf(act_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Act)
        .options(selectinload(Act.items))
        .where(Act.id == act_id)
    )
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")

    # Получаем факт и объект
    fact_result = await db.execute(
        select(FactHeader).where(FactHeader.id == act.fact_header_id)
    )
    fact = fact_result.scalar_one()

    obj_result = await db.execute(
        select(Object).where(Object.id == fact.object_id)
    )
    obj = obj_result.scalar_one()

    # Получаем услуги для названий и единиц измерения
    service_ids = [item.service_type_id for item in act.items]
    services_result = await db.execute(
        select(ServiceType).options(selectinload(ServiceType.unit)).where(
            ServiceType.id.in_(service_ids)
        )
    )
    services_dict = {s.id: s for s in services_result.scalars().all()}

    # Собираем данные для PDF
    act_data = {
        "act_number": act.act_number,
        "act_date": act.act_date.strftime("%d.%m.%Y"),
        "object_name": obj.name,
        "object_address": obj.address or "",
        "period_month": fact.month,
        "period_year": fact.year,
        "total_amount": str(act.total_amount),
    }

    items_data = []
    for item in act.items:
        service = services_dict.get(item.service_type_id)
        items_data.append({
            "service_name": service.name if service else "Неизвестная услуга",
            "unit_symbol": service.unit.symbol if service and service.unit else "ед.",
            "frequency": item.frequency or "—",
            "quantity": str(item.quantity) if item.quantity else "0",
            "unit_price": str(item.unit_price) if item.unit_price else "0",
            "total_amount": str(item.total_amount) if item.total_amount else "0",
        })

    file_buffer = export_act_to_pdf(act_data, items_data)

    raw_filename = f"act_{act.act_number}.pdf"
    encoded_filename = urllib.parse.quote(raw_filename)

    return StreamingResponse(
        file_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )