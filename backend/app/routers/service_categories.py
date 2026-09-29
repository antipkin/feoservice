# backend/app/routers/service_categories.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.db.database import get_db
from app.models.service_category import ServiceCategory
from app.models.services import ServiceType
from app.schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryResponse,
)

router = APIRouter(prefix="/service-categories", tags=["Категории услуг"])


@router.get("/", response_model=List[ServiceCategoryResponse])
async def get_service_categories(db: AsyncSession = Depends(get_db)):
    """Получить все категории услуг с количеством услуг в каждой."""
    # Основной запрос категорий
    result = await db.execute(
        select(ServiceCategory)
        .where(ServiceCategory.is_active == True)
        .order_by(ServiceCategory.sort_order, ServiceCategory.name)
    )
    categories = result.scalars().all()

    # Подсчёт количества услуг в каждой категории
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
    category_in: ServiceCategoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Создать новую категорию услуг."""
    # Проверка уникальности кода
    existing = await db.execute(
        select(ServiceCategory).where(ServiceCategory.code == category_in.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Категория с кодом '{category_in.code}' уже существует",
        )

    # Если sort_order не задан, ставим в конец
    if category_in.sort_order == 0:
        max_order = await db.execute(
            select(func.max(ServiceCategory.sort_order))
        )
        category_in.sort_order = (max_order.scalar() or 0) + 1

    db_category = ServiceCategory(**category_in.model_dump())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)

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
    category_id: int,
    category_in: ServiceCategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Обновить категорию услуг."""
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    # Если меняется код, проверяем уникальность
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

    # Подсчёт услуг
    count_result = await db.execute(
        select(func.count(ServiceType.id)).where(ServiceType.category_id == category_id)
    )
    count = count_result.scalar() or 0

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
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Удалить категорию услуг (только если не используется в услугах)."""
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    # Проверка использования в услугах
    usage_count = await db.execute(
        select(func.count(ServiceType.id)).where(ServiceType.category_id == category_id)
    )
    count = usage_count.scalar() or 0

    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Невозможно удалить: категория используется в {count} услуг(ах). Сначала перенесите услуги в другую категорию.",
        )

    await db.delete(category)
    await db.commit()
    return None


@router.post("/{category_id}/move-up")
async def move_category_up(
    category_id: int,
    db: AsyncSession = Depends(get_db),
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

    # Меняем sort_order с предыдущей категорией
    prev_category = categories[current_idx - 1]
    current_category = categories[current_idx]

    current_category.sort_order, prev_category.sort_order = (
        prev_category.sort_order,
        current_category.sort_order,
    )

    await db.commit()
    return {"message": "Категория перемещена вверх"}


@router.post("/{category_id}/move-down")
async def move_category_down(
    category_id: int,
    db: AsyncSession = Depends(get_db),
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

    # Меняем sort_order со следующей категорией
    next_category = categories[current_idx + 1]
    current_category = categories[current_idx]

    current_category.sort_order, next_category.sort_order = (
        next_category.sort_order,
        current_category.sort_order,
    )

    await db.commit()
    return {"message": "Категория перемещена вниз"}