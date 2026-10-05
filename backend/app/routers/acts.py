# backend/app/routers/acts.py
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal
from datetime import date

from app.db.database import get_db
from app.models.facts import Act, ActItem, FactHeader, FactItem
from app.models.services import ServiceType
from app.models.objects import Object
from app.models.user import User
from app.models.enums import ActStatus, FactStatus, ACT_STATUS_LABELS, FACT_STATUS_LABELS
from app.schemas.act import ActCreate, ActResponse, ActListItem, ActItemResponse
from app.schemas.status_transition import (
    StatusTransitionRequest,
    StatusTransitionResponse,
    AvailableTransitionsResponse
)
from app.utils.status_helper import (
    validate_status_transition,
    can_edit_document,
    get_available_transitions
)
from app.utils.export import export_act_to_pdf
from app.core.security import require_authenticated, require_economist_or_higher
from app.utils.audit_helper import log_action

router = APIRouter(prefix="/acts", tags=["Акты выполненных работ"])

async def _generate_act_number(db: AsyncSession) -> str:
    year = date.today().year
    result = await db.execute(
        select(func.count(Act.id)).where(Act.act_number.like(f'АКТ-{year}-%'))
    )
    count = result.scalar() or 0
    return f"АКТ-{year}-{str(count + 1).zfill(3)}"

@router.post("/from-fact/{fact_id}", response_model=ActResponse, status_code=status.HTTP_201_CREATED)
async def create_act_from_fact(
    request: Request,
    fact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher)
):
    fact_result = await db.execute(
        select(FactHeader).options(selectinload(FactHeader.items)).where(FactHeader.id == fact_id)
    )
    fact = fact_result.scalar_one_or_none()
    if not fact:
        raise HTTPException(status_code=404, detail="Факт не найден")

    fact_status = fact.status.value if hasattr(fact.status, 'value') else str(fact.status).upper()
    if fact_status not in ['APPROVED', 'SIGNED']:
        raise HTTPException(
            status_code=400,
            detail=f"Акт можно создать только из утверждённого или подписанного факта. Текущий статус: {fact_status}"
        )

    existing_act = await db.execute(select(Act).where(Act.fact_header_id == fact_id))
    if existing_act.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Акт для этого факта уже существует")

    service_ids = [item.service_type_id for item in fact.items]
    services_result = await db.execute(select(ServiceType).where(ServiceType.id.in_(service_ids)))
    services_dict = {s.id: s for s in services_result.scalars().all()}

    act_number = await _generate_act_number(db)
    
    # 🎯 ИСПРАВЛЕНО: статус теперь строго DRAFT (верхний регистр)
    act = Act(
        act_number=act_number,
        act_date=date.today(),
        fact_header_id=fact_id,
        total_amount=Decimal('0'),
        status=ActStatus.DRAFT 
    )
    db.add(act)
    await db.flush()

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

    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="ACT",
        resource_id=act.id,
        new_values={
            "act_number": act.act_number,
            "fact_header_id": act.fact_header_id,
            "total_amount": str(act.total_amount),
            "status": ActStatus.DRAFT.value
        },
        ip_address=request.client.host if request.client else None
    )

    result = await db.execute(select(Act).options(selectinload(Act.items)).where(Act.id == act.id))
    return result.scalar_one()

@router.get("/", response_model=List[ActListItem])
async def get_acts(
    object_id: Optional[int] = None,
    year: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    query = select(Act).join(FactHeader, Act.fact_header_id == FactHeader.id)
    if object_id:
        query = query.where(FactHeader.object_id == object_id)
    if year:
        query = query.where(FactHeader.year == year)
    if status_filter:
        try:
            status_enum = ActStatus(status_filter.upper())
            query = query.where(Act.status == status_enum)
        except ValueError:
            pass
    query = query.order_by(Act.act_date.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{act_id}", response_model=ActResponse)
async def get_act(
    act_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    result = await db.execute(select(Act).options(selectinload(Act.items)).where(Act.id == act_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")
    return act

@router.delete("/{act_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_act(
    request: Request,
    act_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher)
):
    result = await db.execute(select(Act).where(Act.id == act_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")

    current_status = act.status.value if hasattr(act.status, 'value') else str(act.status).upper()
    if current_status not in ['DRAFT', 'CREATED']:
        raise HTTPException(
            status_code=400,
            detail=f"Нельзя удалить акт в статусе '{ACT_STATUS_LABELS.get(ActStatus(current_status), current_status)}'."
        )

    deleted_data = {
        "act_number": act.act_number,
        "total_amount": str(act.total_amount),
        "status": current_status
    }

    await db.delete(act)
    await db.commit()

    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="ACT",
        resource_id=act_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )
    return None

@router.post("/{act_id}/transition", response_model=StatusTransitionResponse)
async def transition_act_status(
    request: Request,
    act_id: int,
    transition: StatusTransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    result = await db.execute(select(Act).where(Act.id == act_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")

    old_status = act.status.value if hasattr(act.status, 'value') else str(act.status).upper()
    
    # 🎯 ИСПРАВЛЕНО: принудительный верхний регистр
    new_status_upper = transition.new_status.upper()

    validate_status_transition(
        current_status=old_status,
        new_status=new_status_upper,
        user=current_user,
        document_type="act"
    )

    act.status = ActStatus(new_status_upper)
    await db.commit()
    await db.refresh(act)

    await log_action(
        db=db,
        user=current_user,
        action="STATUS_CHANGE",
        resource_type="ACT",
        resource_id=act_id,
        old_values={"status": old_status},
        new_values={
            "status": new_status_upper,
            "comment": transition.comment,
        },
        ip_address=request.client.host if request.client else None
    )

    available = get_available_transitions(new_status_upper, current_user.role, "act")

    return StatusTransitionResponse(
        id=act.id,
        old_status=old_status,
        new_status=new_status_upper,
        status_label=ACT_STATUS_LABELS.get(ActStatus(new_status_upper), new_status_upper),
        available_transitions=available,
        message=f"Акт переведён в статус '{ACT_STATUS_LABELS.get(ActStatus(new_status_upper))}'"
    )

@router.get("/{act_id}/available-transitions", response_model=AvailableTransitionsResponse)
async def get_act_available_transitions(
    act_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    result = await db.execute(select(Act).where(Act.id == act_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")

    current_status = act.status.value if hasattr(act.status, 'value') else str(act.status).upper()
    available = get_available_transitions(current_status, current_user.role, "act")

    return AvailableTransitionsResponse(
        document_id=act.id,
        current_status=current_status,
        status_label=ACT_STATUS_LABELS.get(ActStatus(current_status), current_status),
        available_transitions=available,
        can_edit=can_edit_document(current_status, "act")
    )

@router.get("/{act_id}/export/pdf")
async def export_act_pdf(
    act_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    result = await db.execute(select(Act).options(selectinload(Act.items)).where(Act.id == act_id))
    act = result.scalar_one_or_none()
    if not act:
        raise HTTPException(status_code=404, detail="Акт не найден")

    fact_result = await db.execute(select(FactHeader).where(FactHeader.id == act.fact_header_id))
    fact = fact_result.scalar_one()
    obj_result = await db.execute(select(Object).where(Object.id == fact.object_id))
    obj = obj_result.scalar_one()

    service_ids = [item.service_type_id for item in act.items]
    services_result = await db.execute(
        select(ServiceType).options(selectinload(ServiceType.unit)).where(ServiceType.id.in_(service_ids))
    )
    services_dict = {s.id: s for s in services_result.scalars().all()}

    act_status_val = act.status.value if hasattr(act.status, 'value') else str(act.status).upper()

    act_data = {
        "act_number": act.act_number,
        "act_date": act.act_date.strftime("%d.%m.%Y"),
        "object_name": obj.name,
        "object_address": obj.address or "",
        "period_month": fact.month,
        "period_year": fact.year,
        "total_amount": str(act.total_amount),
        "status": ACT_STATUS_LABELS.get(ActStatus(act_status_val), act_status_val)
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