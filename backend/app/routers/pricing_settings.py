# backend/app/routers/pricing_settings.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.db.database import get_db
from app.models.pricing_settings import ServicePricingSettings
from app.models.objects import Object
from app.models.services import ServiceType, ResourceNorm, ResourceRate
from app.schemas.pricing_settings import (
    ServicePricingSettingsCreate,
    ServicePricingSettingsUpdate,
    ServicePricingSettingsResponse,
    PriceCalculationRequest,
    PriceCalculationResponse,
)

router = APIRouter(prefix="/pricing-settings", tags=["Настройки расчёта расценок"])


async def _get_effective_settings(
    db: AsyncSession,
    service_type_id: int,
    object_id: int,
    target_date: date
) -> tuple:
    """Получает действующие настройки с учётом приоритета."""
    # Приоритет 1: Для услуги + объекта
    query = select(ServicePricingSettings).where(
        ServicePricingSettings.service_type_id == service_type_id,
        ServicePricingSettings.object_id == object_id,
        ServicePricingSettings.valid_from <= target_date,
        or_(ServicePricingSettings.valid_to.is_(None), ServicePricingSettings.valid_to >= target_date)
    ).order_by(ServicePricingSettings.valid_from.desc())
    result = await db.execute(query)
    settings = result.scalars().first()
    if settings:
        return settings, "service+object"
    
    # Приоритет 2: Для услуги (все объекты)
    query = select(ServicePricingSettings).where(
        ServicePricingSettings.service_type_id == service_type_id,
        ServicePricingSettings.object_id.is_(None),
        ServicePricingSettings.valid_from <= target_date,
        or_(ServicePricingSettings.valid_to.is_(None), ServicePricingSettings.valid_to >= target_date)
    ).order_by(ServicePricingSettings.valid_from.desc())
    result = await db.execute(query)
    settings = result.scalars().first()
    if settings:
        return settings, "service"
    
    # Приоритет 3: Для объекта (все услуги)
    query = select(ServicePricingSettings).where(
        ServicePricingSettings.service_type_id.is_(None),
        ServicePricingSettings.object_id == object_id,
        ServicePricingSettings.valid_from <= target_date,
        or_(ServicePricingSettings.valid_to.is_(None), ServicePricingSettings.valid_to >= target_date)
    ).order_by(ServicePricingSettings.valid_from.desc())
    result = await db.execute(query)
    settings = result.scalars().first()
    if settings:
        return settings, "object"
    
    # Приоритет 4: Глобальные
    query = select(ServicePricingSettings).where(
        ServicePricingSettings.service_type_id.is_(None),
        ServicePricingSettings.object_id.is_(None),
        ServicePricingSettings.valid_from <= target_date,
        or_(ServicePricingSettings.valid_to.is_(None), ServicePricingSettings.valid_to >= target_date)
    ).order_by(ServicePricingSettings.valid_from.desc())
    result = await db.execute(query)
    settings = result.scalars().first()
    if settings:
        return settings, "global"
    
    # Если настроек нет, возвращаем нулевые
    return ServicePricingSettings(overhead_percent=Decimal('0'), profit_percent=Decimal('0'), vat_percent=Decimal('0')), "none"


async def _calculate_cost_price(
    db: AsyncSession,
    service_type_id: int,
    target_date: date
) -> Decimal:
    """Рассчитывает себестоимость услуги на основе ресурсов и нормативов."""
    norms_query = select(ResourceNorm).where(
        ResourceNorm.service_type_id == service_type_id,
        ResourceNorm.is_active == True,
        ResourceNorm.valid_from <= target_date,
        or_(ResourceNorm.valid_to.is_(None), ResourceNorm.valid_to >= target_date)
    )
    norms_result = await db.execute(norms_query)
    norms = norms_result.scalars().all()
    
    if not norms:
        return Decimal('0')
    
    total_cost = Decimal('0')
    for norm in norms:
        rate_query = select(ResourceRate).where(
            ResourceRate.resource_id == norm.resource_id,
            ResourceRate.valid_from <= target_date,
            or_(ResourceRate.valid_to.is_(None), ResourceRate.valid_to >= target_date)
        ).order_by(ResourceRate.valid_from.desc())
        
        rate_result = await db.execute(rate_query)
        rate = rate_result.scalars().first()
        
        if rate:
            total_cost += norm.quantity_per_unit * rate.price_per_unit
    
    return total_cost


@router.get("/", response_model=List[ServicePricingSettingsResponse])
async def get_pricing_settings(db: AsyncSession = Depends(get_db)):
    query = select(ServicePricingSettings).options(
        selectinload(ServicePricingSettings.object),
        selectinload(ServicePricingSettings.service_type)
    ).order_by(ServicePricingSettings.valid_from.desc(), ServicePricingSettings.object_id, ServicePricingSettings.service_type_id)
    
    result = await db.execute(query)
    settings_list = result.scalars().all()
    
    response = []
    for s in settings_list:
        response.append(ServicePricingSettingsResponse(
            id=s.id, object_id=s.object_id, service_type_id=s.service_type_id,
            overhead_percent=s.overhead_percent, profit_percent=s.profit_percent, vat_percent=s.vat_percent,
            valid_from=s.valid_from, valid_to=s.valid_to,
            object_name=s.object.name if s.object else None,
            service_name=s.service_type.name if s.service_type else None,
        ))
    return response


@router.post("/", response_model=ServicePricingSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_pricing_settings(settings_in: ServicePricingSettingsCreate, db: AsyncSession = Depends(get_db)):
    if settings_in.object_id:
        if not (await db.execute(select(Object).where(Object.id == settings_in.object_id))).scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Объект не найден")
    
    if settings_in.service_type_id:
        if not (await db.execute(select(ServiceType).where(ServiceType.id == settings_in.service_type_id))).scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Услуга не найдена")
    
    overlap_filter = and_(
        ServicePricingSettings.object_id == settings_in.object_id,
        ServicePricingSettings.service_type_id == settings_in.service_type_id,
        ServicePricingSettings.valid_from <= settings_in.valid_from,
        or_(ServicePricingSettings.valid_to.is_(None), ServicePricingSettings.valid_to >= settings_in.valid_from)
    )
    if settings_in.valid_to:
        overlap_filter = and_(overlap_filter, settings_in.valid_to >= ServicePricingSettings.valid_from)
    
    if (await db.execute(select(ServicePricingSettings).where(overlap_filter))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Настройки на этот период для данной комбинации уже существуют")
    
    db_settings = ServicePricingSettings(**settings_in.model_dump())
    db.add(db_settings)
    await db.commit()
    await db.refresh(db_settings, attribute_names=['object', 'service_type'])
    
    return ServicePricingSettingsResponse(
        id=db_settings.id, object_id=db_settings.object_id, service_type_id=db_settings.service_type_id,
        overhead_percent=db_settings.overhead_percent, profit_percent=db_settings.profit_percent, vat_percent=db_settings.vat_percent,
        valid_from=db_settings.valid_from, valid_to=db_settings.valid_to,
        object_name=db_settings.object.name if db_settings.object else None,
        service_name=db_settings.service_type.name if db_settings.service_type else None,
    )


@router.patch("/{settings_id}", response_model=ServicePricingSettingsResponse)
async def update_pricing_settings(settings_id: int, settings_in: ServicePricingSettingsUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServicePricingSettings).where(ServicePricingSettings.id == settings_id))
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    
    for field, value in settings_in.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    
    await db.commit()
    await db.refresh(settings, attribute_names=['object', 'service_type'])
    
    return ServicePricingSettingsResponse(
        id=settings.id, object_id=settings.object_id, service_type_id=settings.service_type_id,
        overhead_percent=settings.overhead_percent, profit_percent=settings.profit_percent, vat_percent=settings.vat_percent,
        valid_from=settings.valid_from, valid_to=settings.valid_to,
        object_name=settings.object.name if settings.object else None,
        service_name=settings.service_type.name if settings.service_type else None,
    )


@router.delete("/{settings_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pricing_settings(settings_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServicePricingSettings).where(ServicePricingSettings.id == settings_id))
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=404, detail="Настройки не найдены")
    
    await db.delete(settings)
    await db.commit()
    return None


@router.post("/calculate", response_model=PriceCalculationResponse)
async def calculate_price(request: PriceCalculationRequest, db: AsyncSession = Depends(get_db)):
    service = (await db.execute(select(ServiceType).where(ServiceType.id == request.service_type_id))).scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    
    obj = (await db.execute(select(Object).where(Object.id == request.object_id))).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Объект не найден")
    
    cost_price = await _calculate_cost_price(db, request.service_type_id, request.target_date)
    settings, source = await _get_effective_settings(db, request.service_type_id, request.object_id, request.target_date)
    
    overhead_amount = cost_price * (settings.overhead_percent / Decimal('100'))
    price_with_overhead = cost_price + overhead_amount
    
    profit_amount = price_with_overhead * (settings.profit_percent / Decimal('100'))
    price_with_profit = price_with_overhead + profit_amount
    
    vat_amount = price_with_profit * (settings.vat_percent / Decimal('100'))
    final_price = price_with_profit + vat_amount
    
    return PriceCalculationResponse(
        service_name=service.name, object_name=obj.name,
        cost_price=round(cost_price, 2), overhead_amount=round(overhead_amount, 2),
        profit_amount=round(profit_amount, 2), vat_amount=round(vat_amount, 2), final_price=round(final_price, 2),
        overhead_percent=settings.overhead_percent, profit_percent=settings.profit_percent, vat_percent=settings.vat_percent,
        settings_source=source,
    )