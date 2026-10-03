# backend/app/routers/resources.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.services import Resource, ResourceRate, ResourceNorm, ServiceType
from app.models.user import User
from app.schemas.resource import (
    ResourceCreate, ResourceUpdate, ResourceResponse,
    ResourceRateCreate, ResourceRateUpdate, ResourceRateResponse,
    ResourceNormCreate, ResourceNormUpdate, ResourceNormResponse,
)
from app.core.security import (
    require_authenticated,
    require_economist_or_higher,
)
from app.utils.audit_helper import log_action  # 🎯 ИМПОРТ ЛОГИРОВАНИЯ

router = APIRouter(prefix="/resources", tags=["Ресурсы"])


# ============================================================
# RESOURCES (Ресурсы)
# ============================================================
@router.get("/", response_model=List[ResourceResponse])
async def get_resources(
    resource_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    query = select(Resource).where(Resource.is_active == True)
    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    query = query.order_by(Resource.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    request: Request,  # 🎯 Для IP
    resource_in: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    existing = await db.execute(select(Resource).where(Resource.code == resource_in.code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Ресурс с кодом '{resource_in.code}' уже существует"
        )
    db_resource = Resource(**resource_in.model_dump())
    db.add(db_resource)
    await db.commit()
    await db.refresh(db_resource)

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ РЕСУРСА
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="RESOURCE",
        resource_id=db_resource.id,
        new_values={
            "code": db_resource.code,
            "name": db_resource.name,
            "unit": db_resource.unit,
            "resource_type": db_resource.resource_type,
        },
        ip_address=request.client.host if request.client else None
    )

    return db_resource


@router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    request: Request,  # 🎯 Для IP
    resource_id: int,
    resource_in: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Ресурс не найден")

    # 🎯 Сохраняем старые значения
    old_values = {
        "code": resource.code,
        "name": resource.name,
        "unit": resource.unit,
        "resource_type": resource.resource_type,
    }

    if resource_in.code and resource_in.code != resource.code:
        existing = await db.execute(select(Resource).where(Resource.code == resource_in.code))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Код '{resource_in.code}' уже используется"
            )

    for field, value in resource_in.model_dump(exclude_unset=True).items():
        setattr(resource, field, value)

    await db.commit()
    await db.refresh(resource)

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ РЕСУРСА
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="RESOURCE",
        resource_id=resource_id,
        old_values=old_values,
        new_values=resource_in.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None
    )

    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    request: Request,  # 🎯 Для IP
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Ресурс не найден")

    usage_count = await db.execute(
        select(func.count(ResourceNorm.id)).where(ResourceNorm.resource_id == resource_id)
    )
    count = usage_count.scalar() or 0
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Невозможно удалить: ресурс используется в {count} норматив(ах). Сначала удалите нормативы."
        )

    deleted_data = {"code": resource.code, "name": resource.name}

    await db.delete(resource)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ РЕСУРСА
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="RESOURCE",
        resource_id=resource_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )

    return None


# ============================================================
# RESOURCE RATES (Расценки на ресурсы)
# ============================================================
@router.get("/rates", response_model=List[ResourceRateResponse])
async def get_resource_rates(
    resource_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    query = select(ResourceRate).options(selectinload(ResourceRate.resource))
    if resource_id is not None:
        query = query.where(ResourceRate.resource_id == resource_id)
    query = query.order_by(ResourceRate.valid_from.desc())
    result = await db.execute(query)
    rates = result.scalars().all()
    response = []
    for r in rates:
        response.append(ResourceRateResponse(
            id=r.id,
            resource_id=r.resource_id,
            price_per_unit=r.price_per_unit,
            valid_from=r.valid_from,
            valid_to=r.valid_to,
            resource_name=r.resource.name if r.resource else "Неизвестно"
        ))
    return response


@router.post("/rates", response_model=ResourceRateResponse, status_code=status.HTTP_201_CREATED)
async def create_resource_rate(
    request: Request,  # 🎯 Для IP
    rate_in: ResourceRateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    resource = await db.execute(select(Resource).where(Resource.id == rate_in.resource_id))
    if not resource.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Ресурс не найден")

    overlap_filter = and_(
        ResourceRate.resource_id == rate_in.resource_id,
        ResourceRate.valid_from <= rate_in.valid_from,
        or_(ResourceRate.valid_to.is_(None), ResourceRate.valid_to >= rate_in.valid_from)
    )
    if rate_in.valid_to is not None:
        overlap_filter = and_(
            overlap_filter,
            rate_in.valid_to >= ResourceRate.valid_from
        )
    result = await db.execute(select(ResourceRate).where(overlap_filter))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Расценка на этот период для данного ресурса уже существует"
        )

    db_rate = ResourceRate(**rate_in.model_dump())
    db.add(db_rate)
    await db.commit()
    await db.refresh(db_rate, attribute_names=['resource'])

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ РАСЦЕНКИ НА РЕСУРС
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="RESOURCE_RATE",
        resource_id=db_rate.id,
        new_values={
            "resource_name": db_rate.resource.name if db_rate.resource else None,
            "price_per_unit": str(db_rate.price_per_unit),
            "valid_from": str(db_rate.valid_from),
            "valid_to": str(db_rate.valid_to) if db_rate.valid_to else None,
        },
        ip_address=request.client.host if request.client else None
    )

    return ResourceRateResponse(
        id=db_rate.id,
        resource_id=db_rate.resource_id,
        price_per_unit=db_rate.price_per_unit,
        valid_from=db_rate.valid_from,
        valid_to=db_rate.valid_to,
        resource_name=db_rate.resource.name
    )


@router.patch("/rates/{rate_id}", response_model=ResourceRateResponse)
async def update_resource_rate(
    request: Request,  # 🎯 Для IP
    rate_id: int,
    rate_in: ResourceRateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(ResourceRate).where(ResourceRate.id == rate_id))
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(status_code=404, detail="Расценка не найдена")

    # 🎯 Сохраняем старые значения
    old_values = {
        "price_per_unit": str(rate.price_per_unit),
        "valid_from": str(rate.valid_from),
        "valid_to": str(rate.valid_to) if rate.valid_to else None,
    }

    for field, value in rate_in.model_dump(exclude_unset=True).items():
        setattr(rate, field, value)

    await db.commit()
    await db.refresh(rate, attribute_names=['resource'])

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ РАСЦЕНКИ НА РЕСУРС
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="RESOURCE_RATE",
        resource_id=rate_id,
        old_values=old_values,
        new_values={
            "price_per_unit": str(rate.price_per_unit),
            "valid_from": str(rate.valid_from),
            "valid_to": str(rate.valid_to) if rate.valid_to else None,
        },
        ip_address=request.client.host if request.client else None
    )

    return ResourceRateResponse(
        id=rate.id,
        resource_id=rate.resource_id,
        price_per_unit=rate.price_per_unit,
        valid_from=rate.valid_from,
        valid_to=rate.valid_to,
        resource_name=rate.resource.name
    )


@router.delete("/rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource_rate(
    request: Request,  # 🎯 Для IP
    rate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(ResourceRate).where(ResourceRate.id == rate_id))
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(status_code=404, detail="Расценка не найдена")

    deleted_data = {
        "resource_id": rate.resource_id,
        "price_per_unit": str(rate.price_per_unit),
    }

    await db.delete(rate)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ РАСЦЕНКИ НА РЕСУРС
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="RESOURCE_RATE",
        resource_id=rate_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )

    return None


# ============================================================
# RESOURCE NORMS (Нормативы ресурсов на услуги)
# ============================================================
@router.get("/norms", response_model=List[ResourceNormResponse])
async def get_resource_norms(
    service_type_id: Optional[int] = None,
    resource_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    query = select(ResourceNorm).options(
        selectinload(ResourceNorm.service_type),
        selectinload(ResourceNorm.resource)
    ).where(ResourceNorm.is_active == True)
    if service_type_id is not None:
        query = query.where(ResourceNorm.service_type_id == service_type_id)
    if resource_id is not None:
        query = query.where(ResourceNorm.resource_id == resource_id)
    query = query.order_by(ResourceNorm.service_type_id, ResourceNorm.resource_id)
    result = await db.execute(query)
    norms = result.scalars().all()
    response = []
    for n in norms:
        response.append(ResourceNormResponse(
            id=n.id,
            service_type_id=n.service_type_id,
            resource_id=n.resource_id,
            quantity_per_unit=n.quantity_per_unit,
            is_active=n.is_active,
            valid_from=n.valid_from,
            valid_to=n.valid_to,
            service_name=n.service_type.name if n.service_type else "Неизвестно",
            resource_name=n.resource.name if n.resource else "Неизвестно"
        ))
    return response


@router.post("/norms", response_model=ResourceNormResponse, status_code=status.HTTP_201_CREATED)
async def create_resource_norm(
    request: Request,  # 🎯 Для IP
    norm_in: ResourceNormCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    service = await db.execute(select(ServiceType).where(ServiceType.id == norm_in.service_type_id))
    if not service.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    resource = await db.execute(select(Resource).where(Resource.id == norm_in.resource_id))
    if not resource.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Ресурс не найден")

    existing = await db.execute(
        select(ResourceNorm).where(
            ResourceNorm.service_type_id == norm_in.service_type_id,
            ResourceNorm.resource_id == norm_in.resource_id,
            ResourceNorm.valid_from == norm_in.valid_from
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Норматив для этой услуги и ресурса на эту дату уже существует"
        )

    db_norm = ResourceNorm(**norm_in.model_dump())
    db.add(db_norm)
    await db.commit()
    await db.refresh(db_norm, attribute_names=['service_type', 'resource'])

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ НОРМАТИВА
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="RESOURCE_NORM",
        resource_id=db_norm.id,
        new_values={
            "service_name": db_norm.service_type.name if db_norm.service_type else None,
            "resource_name": db_norm.resource.name if db_norm.resource else None,
            "quantity_per_unit": str(db_norm.quantity_per_unit),
            "valid_from": str(db_norm.valid_from),
            "valid_to": str(db_norm.valid_to) if db_norm.valid_to else None,
        },
        ip_address=request.client.host if request.client else None
    )

    return ResourceNormResponse(
        id=db_norm.id,
        service_type_id=db_norm.service_type_id,
        resource_id=db_norm.resource_id,
        quantity_per_unit=db_norm.quantity_per_unit,
        is_active=db_norm.is_active,
        valid_from=db_norm.valid_from,
        valid_to=db_norm.valid_to,
        service_name=db_norm.service_type.name,
        resource_name=db_norm.resource.name
    )


@router.patch("/norms/{norm_id}", response_model=ResourceNormResponse)
async def update_resource_norm(
    request: Request,  # 🎯 Для IP
    norm_id: int,
    norm_in: ResourceNormUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(ResourceNorm).where(ResourceNorm.id == norm_id))
    norm = result.scalar_one_or_none()
    if not norm:
        raise HTTPException(status_code=404, detail="Норматив не найден")

    # 🎯 Сохраняем старые значения
    old_values = {
        "quantity_per_unit": str(norm.quantity_per_unit),
        "valid_from": str(norm.valid_from),
        "valid_to": str(norm.valid_to) if norm.valid_to else None,
    }

    for field, value in norm_in.model_dump(exclude_unset=True).items():
        setattr(norm, field, value)

    await db.commit()
    await db.refresh(norm, attribute_names=['service_type', 'resource'])

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ НОРМАТИВА
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="RESOURCE_NORM",
        resource_id=norm_id,
        old_values=old_values,
        new_values={
            "quantity_per_unit": str(norm.quantity_per_unit),
            "valid_from": str(norm.valid_from),
            "valid_to": str(norm.valid_to) if norm.valid_to else None,
        },
        ip_address=request.client.host if request.client else None
    )

    return ResourceNormResponse(
        id=norm.id,
        service_type_id=norm.service_type_id,
        resource_id=norm.resource_id,
        quantity_per_unit=norm.quantity_per_unit,
        is_active=norm.is_active,
        valid_from=norm.valid_from,
        valid_to=norm.valid_to,
        service_name=norm.service_type.name if norm.service_type else "Неизвестно",
        resource_name=norm.resource.name if norm.resource else "Неизвестно"
    )


@router.delete("/norms/{norm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource_norm(
    request: Request,  # 🎯 Для IP
    norm_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(ResourceNorm).where(ResourceNorm.id == norm_id))
    norm = result.scalar_one_or_none()
    if not norm:
        raise HTTPException(status_code=404, detail="Норматив не найден")

    deleted_data = {
        "service_type_id": norm.service_type_id,
        "resource_id": norm.resource_id,
        "quantity_per_unit": str(norm.quantity_per_unit),
    }

    await db.delete(norm)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ НОРМАТИВА
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="RESOURCE_NORM",
        resource_id=norm_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )

    return None