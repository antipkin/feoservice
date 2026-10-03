# backend/app/routers/pricing_settings.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.user import User
from app.models.objects import Object
from app.models.services import ServiceType, ServiceRate
from app.models.pricing_settings import ServicePricingSettings
from app.models.services import ResourceNorm
from app.schemas.pricing_settings import (
    PricingSettingsCreate, PricingSettingsUpdate, PricingSettingsResponse,
    PriceCalculationRequest, PriceCalculationResult
)
from app.core.security import require_authenticated, require_economist_or_higher
from app.utils.audit_helper import log_action  # 🎯 ИМПОРТ
from decimal import Decimal

router = APIRouter(prefix="/pricing-settings", tags=["Настройки расчёта расценок"])


@router.get("/", response_model=List[PricingSettingsResponse])
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    result = await db.execute(
        select(ServicePricingSettings)
        .order_by(ServicePricingSettings.valid_from.desc())
    )
    settings_list = result.scalars().all()

    response = []
    for s in settings_list:
        obj_name = None
        svc_name = None
        if s.object_id:
            obj_res = await db.execute(select(Object).where(Object.id == s.object_id))
            obj = obj_res.scalar_one_or_none()
            obj_name = obj.name if obj else None
        if s.service_type_id:
            svc_res = await db.execute(select(ServiceType).where(ServiceType.id == s.service_type_id))
            svc = svc_res.scalar_one_or_none()
            svc_name = svc.name if svc else None

        response.append(PricingSettingsResponse(
            id=s.id, object_id=s.object_id, service_type_id=s.service_type_id,
            overhead_percent=str(s.overhead_percent),
            profit_percent=str(s.profit_percent),
            vat_percent=str(s.vat_percent),
            valid_from=s.valid_from, valid_to=s.valid_to,
            object_name=obj_name, service_name=svc_name
        ))
    return response


@router.post("/", response_model=PricingSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_settings(
    request: Request,  # 🎯 Для IP
    item: PricingSettingsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    db_item = ServicePricingSettings(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)

    obj_name = None
    svc_name = None
    if db_item.object_id:
        obj_res = await db.execute(select(Object).where(Object.id == db_item.object_id))
        obj = obj_res.scalar_one_or_none()
        obj_name = obj.name if obj else None
    if db_item.service_type_id:
        svc_res = await db.execute(select(ServiceType).where(ServiceType.id == db_item.service_type_id))
        svc = svc_res.scalar_one_or_none()
        svc_name = svc.name if svc else None

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ НАСТРОЕК
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="PRICING_SETTINGS",
        resource_id=db_item.id,
        new_values={
            "object_name": obj_name or "Глобально",
            "service_name": svc_name or "Все услуги",
            "overhead_percent": str(db_item.overhead_percent),
            "profit_percent": str(db_item.profit_percent),
            "vat_percent": str(db_item.vat_percent),
            "valid_from": str(db_item.valid_from),
        },
        ip_address=request.client.host if request.client else None
    )

    return PricingSettingsResponse(
        id=db_item.id, object_id=db_item.object_id, service_type_id=db_item.service_type_id,
        overhead_percent=str(db_item.overhead_percent),
        profit_percent=str(db_item.profit_percent),
        vat_percent=str(db_item.vat_percent),
        valid_from=db_item.valid_from, valid_to=db_item.valid_to,
        object_name=obj_name, service_name=svc_name
    )


@router.patch("/{item_id}", response_model=PricingSettingsResponse)
async def update_settings(
    request: Request,  # 🎯 Для IP
    item_id: int,
    item_in: PricingSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(ServicePricingSettings).where(ServicePricingSettings.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Настройки не найдены")

    # 🎯 Сохраняем старые значения
    old_values = {
        "overhead_percent": str(item.overhead_percent),
        "profit_percent": str(item.profit_percent),
        "vat_percent": str(item.vat_percent),
        "valid_from": str(item.valid_from),
        "valid_to": str(item.valid_to) if item.valid_to else None,
    }

    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    obj_name = None
    svc_name = None
    if item.object_id:
        obj_res = await db.execute(select(Object).where(Object.id == item.object_id))
        obj = obj_res.scalar_one_or_none()
        obj_name = obj.name if obj else None
    if item.service_type_id:
        svc_res = await db.execute(select(ServiceType).where(ServiceType.id == item.service_type_id))
        svc = svc_res.scalar_one_or_none()
        svc_name = svc.name if svc else None

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="PRICING_SETTINGS",
        resource_id=item_id,
        old_values=old_values,
        new_values={
            "overhead_percent": str(item.overhead_percent),
            "profit_percent": str(item.profit_percent),
            "vat_percent": str(item.vat_percent),
        },
        ip_address=request.client.host if request.client else None
    )

    return PricingSettingsResponse(
        id=item.id, object_id=item.object_id, service_type_id=item.service_type_id,
        overhead_percent=str(item.overhead_percent),
        profit_percent=str(item.profit_percent),
        vat_percent=str(item.vat_percent),
        valid_from=item.valid_from, valid_to=item.valid_to,
        object_name=obj_name, service_name=svc_name
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_settings(
    request: Request,  # 🎯 Для IP
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher),
):
    result = await db.execute(select(ServicePricingSettings).where(ServicePricingSettings.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Настройки не найдены")

    deleted_data = {
        "overhead_percent": str(item.overhead_percent),
        "profit_percent": str(item.profit_percent),
        "vat_percent": str(item.vat_percent),
    }

    await db.delete(item)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="PRICING_SETTINGS",
        resource_id=item_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )
    return None


async def _find_applicable_settings(
    db: AsyncSession, service_type_id: int, object_id: int, target_date: date
) -> Optional[ServicePricingSettings]:
    """Находит настройки по приоритету: услуга+объект → услуга → объект → глобальные."""
    # 1. Услуга + Объект
    res = await db.execute(select(ServicePricingSettings).where(
        and_(
            ServicePricingSettings.service_type_id == service_type_id,
            ServicePricingSettings.object_id == object_id,
            ServicePricingSettings.valid_from <= target_date,
            or_(ServicePricingSettings.valid_to >= target_date, ServicePricingSettings.valid_to == None)
        )
    ))
    s = res.scalar_one_or_none()
    if s: return s

    # 2. Только услуга
    res = await db.execute(select(ServicePricingSettings).where(
        and_(
            ServicePricingSettings.service_type_id == service_type_id,
            ServicePricingSettings.object_id == None,
            ServicePricingSettings.valid_from <= target_date,
            or_(ServicePricingSettings.valid_to >= target_date, ServicePricingSettings.valid_to == None)
        )
    ))
    s = res.scalar_one_or_none()
    if s: return s

    # 3. Только объект
    res = await db.execute(select(ServicePricingSettings).where(
        and_(
            ServicePricingSettings.service_type_id == None,
            ServicePricingSettings.object_id == object_id,
            ServicePricingSettings.valid_from <= target_date,
            or_(ServicePricingSettings.valid_to >= target_date, ServicePricingSettings.valid_to == None)
        )
    ))
    s = res.scalar_one_or_none()
    if s: return s

    # 4. Глобальные
    res = await db.execute(select(ServicePricingSettings).where(
        and_(
            ServicePricingSettings.service_type_id == None,
            ServicePricingSettings.object_id == None,
            ServicePricingSettings.valid_from <= target_date,
            or_(ServicePricingSettings.valid_to >= target_date, ServicePricingSettings.valid_to == None)
        )
    ))
    return res.scalar_one_or_none()


@router.post("/calculate", response_model=PriceCalculationResult)
async def calculate_price(
    req: PriceCalculationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    # Получаем нормативы для услуги
    norms_res = await db.execute(
        select(ResourceNorm).where(ResourceNorm.service_type_id == req.service_type_id)
    )
    norms = norms_res.scalars().all()

    cost_price = Decimal("0")
    for norm in norms:
        from app.models.resources import ResourceRate
        rates_res = await db.execute(
            select(ResourceRate).where(
                and_(
                    ResourceRate.resource_id == norm.resource_id,
                    ResourceRate.valid_from <= req.target_date,
                    or_(ResourceRate.valid_to >= req.target_date, ResourceRate.valid_to == None)
                )
            ).order_by(ResourceRate.valid_from.desc())
        )
        rate = rates_res.scalars().first()
        if rate:
            cost_price += Decimal(str(norm.quantity_per_unit)) * Decimal(str(rate.price_per_unit))

    # Находим настройки
    settings_obj = await _find_applicable_settings(db, req.service_type_id, req.object_id, req.target_date)

    if settings_obj:
        overhead_pct = Decimal(str(settings_obj.overhead_percent)) / Decimal("100")
        profit_pct = Decimal(str(settings_obj.profit_percent)) / Decimal("100")
        vat_pct = Decimal(str(settings_obj.vat_percent)) / Decimal("100")
        source = "service+object" if (settings_obj.service_type_id and settings_obj.object_id) else \
                 "service" if settings_obj.service_type_id else \
                 "object" if settings_obj.object_id else "global"
    else:
        overhead_pct = profit_pct = vat_pct = Decimal("0")
        source = "none"

    with_overhead = cost_price * (Decimal("1") + overhead_pct)
    with_profit = with_overhead * (Decimal("1") + profit_pct)
    with_vat = with_profit * (Decimal("1") + vat_pct)

    svc_res = await db.execute(select(ServiceType).where(ServiceType.id == req.service_type_id))
    svc = svc_res.scalar_one_or_none()
    obj_res = await db.execute(select(Object).where(Object.id == req.object_id))
    obj = obj_res.scalar_one_or_none()

    return PriceCalculationResult(
        service_name=svc.name if svc else "Неизвестно",
        object_name=obj.name if obj else "Неизвестно",
        cost_price=str(cost_price),
        overhead_amount=str(with_overhead - cost_price),
        profit_amount=str(with_profit - with_overhead),
        vat_amount=str(with_vat - with_profit),
        final_price=str(with_vat),
        overhead_percent=str(settings_obj.overhead_percent) if settings_obj else "0",
        profit_percent=str(settings_obj.profit_percent) if settings_obj else "0",
        vat_percent=str(settings_obj.vat_percent) if settings_obj else "0",
        settings_source=source
    )