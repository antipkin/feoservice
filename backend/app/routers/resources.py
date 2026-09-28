from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.db.database import get_db
from app.models.services import Resource, ResourceRate, ResourceNorm, ServiceType
from app.schemas.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    ResourceRateCreate,
    ResourceRateResponse,
    ResourceNormCreate,
    ResourceNormResponse,
    ResourceNormUpdate,
)

router = APIRouter(prefix="/resources", tags=["Справочники: Ресурсы"])


# =============================================
# Resources (Ресурсы)
# =============================================

@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(item: ResourceCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Resource).where(Resource.code == item.code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ресурс с кодом '{item.code}' уже существует",
        )
    db_item = Resource(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.get("/", response_model=List[ResourceResponse])
async def get_resources(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(Resource)
    if active_only:
        query = query.where(Resource.is_active == True)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ресурс не найден")
    return item


@router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int, item_in: ResourceUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ресурс не найден")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(resource_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ресурс не найден")
    await db.delete(item)
    await db.commit()
    return None


# =============================================
# Resource Rates (Расценки на ресурсы)
# =============================================

@router.post("/rates", response_model=ResourceRateResponse, status_code=status.HTTP_201_CREATED)
async def create_resource_rate(item: ResourceRateCreate, db: AsyncSession = Depends(get_db)):
    resource = await db.execute(select(Resource).where(Resource.id == item.resource_id))
    if not resource.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ресурс с ID {item.resource_id} не найден",
        )

    db_item = ResourceRate(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.get("/rates", response_model=List[ResourceRateResponse])
async def get_resource_rates(
    resource_id: Optional[int] = None,  # <-- ИСПРАВЛЕНО ЗДЕСЬ
    db: AsyncSession = Depends(get_db),
):
    query = select(ResourceRate)
    if resource_id is not None:
        query = query.where(ResourceRate.resource_id == resource_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/rates/{rate_id}", response_model=ResourceRateResponse)
async def get_resource_rate(rate_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResourceRate).where(ResourceRate.id == rate_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Расценка не найдена")
    return item


@router.delete("/rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource_rate(rate_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResourceRate).where(ResourceRate.id == rate_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Расценка не найдена")
    await db.delete(item)
    await db.commit()
    return None


# =============================================
# Resource Norms (Нормативы ресурсов на ед. услуги)
# =============================================

@router.post("/norms", response_model=ResourceNormResponse, status_code=status.HTTP_201_CREATED)
async def create_resource_norm(item: ResourceNormCreate, db: AsyncSession = Depends(get_db)):
    resource = await db.execute(select(Resource).where(Resource.id == item.resource_id))
    if not resource.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ресурс с ID {item.resource_id} не найден",
        )

    service = await db.execute(select(ServiceType).where(ServiceType.id == item.service_type_id))
    if not service.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Вид услуги с ID {item.service_type_id} не найден",
        )

    db_item = ResourceNorm(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.get("/norms", response_model=List[ResourceNormResponse])
async def get_resource_norms(
    service_type_id: Optional[int] = None,  # <-- ИСПРАВЛЕНО ЗДЕСЬ
    resource_id: Optional[int] = None,      # <-- ИСПРАВЛЕНО ЗДЕСЬ
    db: AsyncSession = Depends(get_db),
):
    query = select(ResourceNorm)
    if service_type_id is not None:
        query = query.where(ResourceNorm.service_type_id == service_type_id)
    if resource_id is not None:
        query = query.where(ResourceNorm.resource_id == resource_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/norms/{norm_id}", response_model=ResourceNormResponse)
async def get_resource_norm(norm_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResourceNorm).where(ResourceNorm.id == norm_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Норматив не найден")
    return item


@router.patch("/norms/{norm_id}", response_model=ResourceNormResponse)
async def update_resource_norm(
    norm_id: int, item_in: ResourceNormUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ResourceNorm).where(ResourceNorm.id == norm_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Норматив не найден")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/norms/{norm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource_norm(norm_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResourceNorm).where(ResourceNorm.id == norm_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Норматив не найден")
    await db.delete(item)
    await db.commit()
    return None