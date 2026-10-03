# backend/app/routers/units.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.units import Unit
from app.models.user import User
from app.schemas.service import UnitCreate, UnitResponse
from app.core.security import require_authenticated, require_economist_or_higher
from app.utils.audit_helper import log_action

router = APIRouter(prefix="/units", tags=["Справочники: Единицы измерения"])


@router.post("/", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    request: Request,
    item: UnitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher)
):
    existing = await db.execute(select(Unit).where(Unit.code == item.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Единица с кодом '{item.code}' уже существует")

    db_item = Unit(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ ЕДИНИЦЫ ИЗМЕРЕНИЯ
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="UNIT",
        resource_id=db_item.id,
        new_values={"code": db_item.code, "name": db_item.name, "symbol": db_item.symbol},
        ip_address=request.client.host if request.client else None
    )
    return db_item


@router.get("/", response_model=List[UnitResponse])
async def get_units(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    query = select(Unit)
    if active_only:
        query = query.where(Unit.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()