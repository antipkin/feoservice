from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.units import Unit
from app.schemas.service import UnitCreate, UnitResponse

router = APIRouter(prefix="/units", tags=["Справочники: Единицы измерения"])

@router.post("/", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(item: UnitCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Unit).where(Unit.code == item.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Единица с кодом '{item.code}' уже существует")
    
    db_item = Unit(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[UnitResponse])
async def get_units(active_only: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(Unit)
    if active_only:
        query = query.where(Unit.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()