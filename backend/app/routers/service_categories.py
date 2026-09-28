from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.service_category import ServiceCategory
from app.schemas.service_category import (
    ServiceCategoryCreate, ServiceCategoryUpdate, ServiceCategoryResponse
)

router = APIRouter(prefix="/service-categories", tags=["Справочники: Категории услуг"])


@router.post("/", response_model=ServiceCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(item: ServiceCategoryCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(ServiceCategory).where(ServiceCategory.code == item.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Категория с кодом '{item.code}' уже существует"
        )
    
    db_item = ServiceCategory(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.get("/", response_model=List[ServiceCategoryResponse])
async def get_categories(active_only: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(ServiceCategory)
    if active_only:
        query = query.where(ServiceCategory.is_active == True)
    query = query.order_by(ServiceCategory.sort_order, ServiceCategory.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{category_id}", response_model=ServiceCategoryResponse)
async def get_category(category_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return item


@router.patch("/{category_id}", response_model=ServiceCategoryResponse)
async def update_category(
    category_id: int, item_in: ServiceCategoryUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    await db.delete(item)
    await db.commit()
    return None