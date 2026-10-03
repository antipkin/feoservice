# backend/app/routers/objects.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.objects import Object
from app.models.user import User
from app.schemas.object import ObjectCreate, ObjectUpdate, ObjectResponse
from app.core.security import (
    require_authenticated,
    require_economist_or_higher,
    require_admin,
)
from app.utils.audit_helper import log_action  # 🎯 ИМПОРТ ХЕЛПЕРА

router = APIRouter(prefix="/objects", tags=["Справочники: Объекты"])


@router.get("/", response_model=List[ObjectResponse])
async def get_objects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    result = await db.execute(
        select(Object).where(Object.is_active == True).order_by(Object.name)
    )
    return result.scalars().all()


@router.post("/", response_model=ObjectResponse, status_code=status.HTTP_201_CREATED)
async def create_object(
    request: Request,  # 🎯 Добавляем Request для получения IP
    obj_in: ObjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    db_obj = Object(**obj_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="OBJECT",
        resource_id=db_obj.id,
        new_values=obj_in.model_dump(),
        ip_address=request.client.host if request.client else None
    )

    return db_obj


@router.patch("/{obj_id}", response_model=ObjectResponse)
async def update_object(
    request: Request,  # 🎯 Добавляем Request
    obj_id: int,
    obj_in: ObjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(Object).where(Object.id == obj_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")

    # Сохраняем старые значения до обновления
    old_values = {
        "name": obj.name,
        "type": obj.type,
        "area_sqm": str(obj.area_sqm) if obj.area_sqm else None,
        "spaces_count": obj.spaces_count,
        "tariff_base": obj.tariff_base
    }

    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.commit()
    await db.refresh(obj)

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="OBJECT",
        resource_id=obj_id,
        old_values=old_values,
        new_values=obj_in.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None
    )

    return obj


@router.delete("/{obj_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_object(
    request: Request,  # 🎯 Добавляем Request
    obj_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(Object).where(Object.id == obj_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")

    deleted_data = {
        "name": obj.name,
        "type": obj.type
    }

    await db.delete(obj)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="OBJECT",
        resource_id=obj_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )

    return None