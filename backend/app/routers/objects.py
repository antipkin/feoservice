from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.objects import Object
from app.schemas.object import ObjectCreate, ObjectUpdate, ObjectResponse

router = APIRouter(prefix="/objects", tags=["Справочники: Объекты"])

@router.post("/", response_model=ObjectResponse, status_code=status.HTTP_201_CREATED)
async def create_object(obj_in: ObjectCreate, db: AsyncSession = Depends(get_db)):
    # Для МКД тариф всегда считается на площадь
    if obj_in.type == "MKD":
        obj_in.tariff_base = "area"
        
    db_obj = Object(**obj_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=List[ObjectResponse])
async def get_objects(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Object).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{obj_id}", response_model=ObjectResponse)
async def get_object(obj_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Object).where(Object.id == obj_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
    return obj

@router.patch("/{obj_id}", response_model=ObjectResponse)
async def update_object(obj_id: int, obj_in: ObjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Object).where(Object.id == obj_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    
    # 🎯 ВАЛИДАЦИЯ: Если тип меняется на МКД или уже МКД, тариф всегда на площадь
    new_type = update_data.get("type", obj.type)
    if new_type == "MKD":
        update_data["tariff_base"] = "area"
    elif "tariff_base" in update_data and update_data["tariff_base"] == "spaces" and new_type == "MKD":
        raise HTTPException(status_code=400, detail="Для МКД тариф может считаться только на площадь")

    for field, value in update_data.items():
        setattr(obj, field, value)
        
    await db.commit()
    await db.refresh(obj)
    return obj

@router.delete("/{obj_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_object(obj_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Object).where(Object.id == obj_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
    await db.delete(obj)
    await db.commit()
    return None