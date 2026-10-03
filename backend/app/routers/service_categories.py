# backend/app/routers/service_categories.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.db.database import get_db
from app.models.service_category import ServiceCategory
from app.models.services import ServiceType
from app.models.user import User
from app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryResponse,
)
from app.core.security import require_economist_or_higher
from app.utils.audit_helper import log_action  # 🎯 ИМПОРТ ЛОГИРОВАНИЯ

router = APIRouter(prefix="/service-categories", tags=["Категории услуг"])


@router.get("/", response_model=List[ServiceCategoryResponse])
async def get_service_categories(db: AsyncSession = Depends(get_db)):
    """Получить все категории услуг с количеством услуг в каждой."""
    result = await db.execute(
        select(ServiceCategory)
        .where(ServiceCategory.is_active == True)
        .order_by(ServiceCategory.sort_order, ServiceCategory.name)
    )
    categories = result.scalars().all()
    
    response = []
    for cat in categories:
        count_result = await db.execute(
            select(func.count(ServiceType.id)).where(ServiceType.category_id == cat.id)
        )
        count = count_result.scalar() or 0
        response.append(
            ServiceCategoryResponse(
                id=cat.id,
                code=cat.code,
                name=cat.name,
                sort_order=cat.sort_order,
                is_active=cat.is_active,
                services_count=count,
            )
        )
    return response


@router.post("/", response_model=ServiceCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_service_category(
    request: Request,  # 🎯 Добавлено для получения IP
    category_in: ServiceCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),  # 🎯 Проверка прав
):
    """Создать новую категорию услуг."""
    existing = await db.execute(
        select(ServiceCategory).where(ServiceCategory.code == category_in.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Категория с кодом '{category_in.code}' уже существует",
        )

    if category_in.sort_order == 0:
        max_order = await db.execute(
            select(func.max(ServiceCategory.sort_order))
        )
        category_in.sort_order = (max_order.scalar() or 0) + 1

    db_category = ServiceCategory(**category_in.model_dump())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ КАТЕГОРИИ
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="SERVICE_CATEGORY",
        resource_id=db_category.id,
        new_values=category_in.model_dump(),
        ip_address=request.client.host if request.client else None
    )

    return ServiceCategoryResponse(
        id=db_category.id,
        code=db_category.code,
        name=db_category.name,
        sort_order=db_category.sort_order,
        is_active=db_category.is_active,
        services_count=0,
    )


@router.patch("/{category_id}", response_model=ServiceCategoryResponse)
async def update_service_category(
    request: Request,  # 🎯 Добавлено для получения IP
    category_id: int,
    category_in: ServiceCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),  # 🎯 Проверка прав
):
    """Обновить категорию услуг."""
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    # 🎯 Сохраняем старые значения для лога
    old_values = {
        "code": category.code,
        "name": category.name,
        "sort_order": category.sort_order,
    }

    if category_in.code and category_in.code != category.code:
        existing = await db.execute(
            select(ServiceCategory).where(ServiceCategory.code == category_in.code)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Код '{category_in.code}' уже используется",
            )

    for field, value in category_in.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    
    await db.commit()
    await db.refresh(category)

    count_result = await db.execute(
        select(func.count(ServiceType.id)).where(ServiceType.category_id == category_id)
    )
    count = count_result.scalar() or 0

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ КАТЕГОРИИ
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="SERVICE_CATEGORY",
        resource_id=category_id,
        old_values=old_values,
        new_values=category_in.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None
    )

    return ServiceCategoryResponse(
        id=category.id,
        code=category.code,
        name=category.name,
        sort_order=category.sort_order,
        is_active=category.is_active,
        services_count=count,
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_category(
    request: Request,  # 🎯 Добавлено для получения IP
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),  # 🎯 Проверка прав
):
    """Удалить категорию услуг (только если не используется в услугах)."""
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    usage_count = await db.execute(
        select(func.count(ServiceType.id)).where(ServiceType.category_id == category_id)
    )
    count = usage_count.scalar() or 0
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Невозможно удалить: категория используется в {count} услуг(ах). Сначала перенесите услуги в другую категорию.",
        )

    # 🎯 Сохраняем данные перед удалением
    deleted_data = {
        "code": category.code,
        "name": category.name,
    }

    await db.delete(category)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ КАТЕГОРИИ
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="SERVICE_CATEGORY",
        resource_id=category_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )
    return None


@router.post("/{category_id}/move-up")
async def move_category_up(
    request: Request,  # 🎯 Добавлено для получения IP
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),  # 🎯 Проверка прав
):
    """Переместить категорию вверх (уменьшить sort_order)."""
    result = await db.execute(
        select(ServiceCategory)
        .where(ServiceCategory.is_active == True)
        .order_by(ServiceCategory.sort_order)
    )
    categories = result.scalars().all()
    current_idx = next((i for i, c in enumerate(categories) if c.id == category_id), None)
    
    if current_idx is None or current_idx == 0:
        return {"message": "Категория уже в начале списка"}

    prev_category = categories[current_idx - 1]
    current_category = categories[current_idx]
    
    current_category.sort_order, prev_category.sort_order = (
        prev_category.sort_order,
        current_category.sort_order,
    )
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ ПЕРЕМЕЩЕНИЯ ВВЕРХ
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="SERVICE_CATEGORY",
        resource_id=category_id,
        new_values={"action": "move_up", "new_sort_order": current_category.sort_order},
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Категория перемещена вверх"}


@router.post("/{category_id}/move-down")
async def move_category_down(
    request: Request,  # 🎯 Добавлено для получения IP
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),  # 🎯 Проверка прав
):
    """Переместить категорию вниз (увеличить sort_order)."""
    result = await db.execute(
        select(ServiceCategory)
        .where(ServiceCategory.is_active == True)
        .order_by(ServiceCategory.sort_order)
    )
    categories = result.scalars().all()
    current_idx = next((i for i, c in enumerate(categories) if c.id == category_id), None)
    
    if current_idx is None or current_idx == len(categories) - 1:
        return {"message": "Категория уже в конце списка"}

    next_category = categories[current_idx + 1]
    current_category = categories[current_idx]
    
    current_category.sort_order, next_category.sort_order = (
        next_category.sort_order,
        current_category.sort_order,
    )
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ ПЕРЕМЕЩЕНИЯ ВНИЗ
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="SERVICE_CATEGORY",
        resource_id=category_id,
        new_values={"action": "move_down", "new_sort_order": current_category.sort_order},
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Категория перемещена вниз"}