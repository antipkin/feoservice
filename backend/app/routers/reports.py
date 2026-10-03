# backend/app/routers/reports.py
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from decimal import Decimal
from collections import defaultdict

from app.db.database import get_db
from app.models.reports import Report, ReportItem
from app.models.facts import Act, ActItem, FactHeader
from app.models.objects import Object
from app.models.services import ServiceType
from app.models.service_category import ServiceCategory
from app.models.user import User
from app.schemas.report import ReportCreate, ReportUpdate, ReportResponse, ReportListItem
from app.utils.export import export_report_to_excel, export_report_to_pdf
from app.core.security import require_authenticated, require_economist_or_higher
from app.utils.audit_helper import log_action

router = APIRouter(prefix="/reports", tags=["Отчеты"])

MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]


def period_to_abs(year: int, month: int) -> int:
    return year * 12 + month


async def _aggregate_report_items(
    db: AsyncSession,
    object_id: int,
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int
) -> List[dict]:
    start_abs = period_to_abs(start_year, start_month)
    end_abs = period_to_abs(end_year, end_month)

    query = (
        select(Act, ActItem, FactHeader, ServiceType, ServiceCategory)
        .join(ActItem, Act.id == ActItem.act_id)
        .join(FactHeader, Act.fact_header_id == FactHeader.id)
        .join(ServiceType, ActItem.service_type_id == ServiceType.id)
        .outerjoin(ServiceCategory, ServiceType.category_id == ServiceCategory.id)
        .options(selectinload(ServiceType.unit))
        .where(
            FactHeader.object_id == object_id,
            (FactHeader.year * 12 + FactHeader.month) >= start_abs,
            (FactHeader.year * 12 + FactHeader.month) <= end_abs,
        )
    )
    result = await db.execute(query)
    rows = result.all()

    aggregated = defaultdict(lambda: {
        'service_name': '', 'unit_symbol': '', 'frequency': None, 'category_name': None,
        'total_quantity': Decimal('0'), 'total_amount': Decimal('0'), 'acts_count': 0, 'act_ids': set(),
    })

    for act, act_item, fact_header, service_type, category in rows:
        svc_id = service_type.id
        data = aggregated[svc_id]
        data['service_name'] = service_type.name
        data['unit_symbol'] = service_type.unit.symbol if service_type.unit else 'ед.'
        data['frequency'] = service_type.frequency
        data['category_name'] = category.name if category else None
        data['total_quantity'] += act_item.quantity or Decimal('0')
        data['total_amount'] += act_item.total_amount or Decimal('0')
        data['act_ids'].add(act.id)

    items_data = []
    for svc_id, data in aggregated.items():
        items_data.append({
            'service_type_id': svc_id, 'service_name': data['service_name'], 'unit_symbol': data['unit_symbol'],
            'frequency': data['frequency'], 'category_name': data['category_name'],
            'total_quantity': data['total_quantity'], 'total_amount': data['total_amount'], 'acts_count': len(data['act_ids']),
        })
    return items_data


async def _rebuild_report_items(db: AsyncSession, report: Report) -> None:
    await db.execute(delete(ReportItem).where(ReportItem.report_id == report.id))
    await db.flush()

    items_data = await _aggregate_report_items(
        db, report.object_id, report.start_year, report.start_month, report.end_year, report.end_month
    )

    total = Decimal('0')
    for data in items_data:
        item = ReportItem(report_id=report.id, **data)
        db.add(item)
        total += data['total_amount']
    
    report.total_amount = total
    await db.flush()


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    request: Request,
    report_in: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher)
):
    obj = await db.execute(select(Object).where(Object.id == report_in.object_id))
    if not obj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Объект не найден")

    report = Report(
        object_id=report_in.object_id, start_month=report_in.start_month, start_year=report_in.start_year,
        end_month=report_in.end_month, end_year=report_in.end_year, name=report_in.name,
        notes=report_in.notes, status="draft",
    )
    db.add(report)
    await db.flush()

    await _rebuild_report_items(db, report)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ ОТЧЁТА
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="REPORT",
        resource_id=report.id,
        new_values={"object_id": report.object_id, "start_year": report.start_year, "end_year": report.end_year},
        ip_address=request.client.host if request.client else None
    )

    result = await db.execute(select(Report).options(selectinload(Report.items)).where(Report.id == report.id))
    return result.scalar_one()


@router.get("/", response_model=List[ReportListItem])
async def get_reports(
    object_id: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    query = select(Report).join(Object, Report.object_id == Object.id)
    if object_id:
        query = query.where(Report.object_id == object_id)
    if year:
        query = query.where((Report.start_year <= year) & (Report.end_year >= year))
    query = query.order_by(Report.created_at.desc())
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    items = []
    for r in reports:
        obj = await db.execute(select(Object).where(Object.id == r.object_id))
        obj_data = obj.scalar_one()
        items.append(ReportListItem(
            id=r.id, object_id=r.object_id, object_name=obj_data.name,
            start_month=r.start_month, start_year=r.start_year, end_month=r.end_month, end_year=r.end_year,
            name=r.name, status=r.status, total_amount=r.total_amount, created_at=r.created_at,
        ))
    return items


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    result = await db.execute(select(Report).options(selectinload(Report.items)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")
    return report


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    request: Request,
    report_id: int,
    report_in: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher)
):
    result = await db.execute(select(Report).options(selectinload(Report.items)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    old_values = {"start_year": report.start_year, "start_month": report.start_month, "end_year": report.end_year, "end_month": report.end_month}
    
    update_data = report_in.model_dump(exclude_unset=True)
    period_changed = any(k in update_data for k in ['start_year', 'start_month', 'end_year', 'end_month'])

    for field, value in update_data.items():
        setattr(report, field, value)

    if period_changed:
        await _rebuild_report_items(db, report)
    
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ ОТЧЁТА
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="REPORT",
        resource_id=report_id,
        old_values=old_values,
        new_values=update_data,
        ip_address=request.client.host if request.client else None
    )

    result = await db.execute(select(Report).options(selectinload(Report.items)).where(Report.id == report.id))
    return result.scalar_one()


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    request: Request,
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_economist_or_higher)
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    deleted_data = {"name": report.name, "object_id": report.object_id}

    await db.delete(report)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ ОТЧЁТА
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="REPORT",
        resource_id=report_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )
    return None


@router.get("/{report_id}/export/excel")
async def export_report_excel(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    result = await db.execute(select(Report).options(selectinload(Report.items)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    obj = await db.execute(select(Object).where(Object.id == report.object_id))
    obj_data = obj.scalar_one()

    report_data = {
        "name": report.name or "Отчет по объекту", "object_name": obj_data.name, "object_address": obj_data.address or "",
        "start_month": report.start_month, "start_year": report.start_year, "end_month": report.end_month, "end_year": report.end_year,
        "total_amount": str(report.total_amount),
    }
    items_data = [{"service_name": item.service_name, "unit_symbol": item.unit_symbol, "frequency": item.frequency or "—", "category_name": item.category_name or "—", "total_quantity": str(item.total_quantity), "total_amount": str(item.total_amount), "acts_count": item.acts_count} for item in report.items]

    file_buffer = export_report_to_excel(report_data, items_data)
    raw_filename = f"report_{obj_data.name}_{MONTH_NAMES[report.start_month - 1]}-{MONTH_NAMES[report.end_month - 1]}_{report.end_year}.xlsx"
    encoded_filename = urllib.parse.quote(raw_filename)

    return StreamingResponse(
        file_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/{report_id}/export/pdf")
async def export_report_pdf(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    result = await db.execute(select(Report).options(selectinload(Report.items)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    obj = await db.execute(select(Object).where(Object.id == report.object_id))
    obj_data = obj.scalar_one()

    report_data = {
        "name": report.name or "Отчет по объекту", "object_name": obj_data.name, "object_address": obj_data.address or "",
        "start_month": report.start_month, "start_year": report.start_year, "end_month": report.end_month, "end_year": report.end_year,
        "total_amount": str(report.total_amount),
    }
    items_data = [{"service_name": item.service_name, "unit_symbol": item.unit_symbol, "frequency": item.frequency or "—", "category_name": item.category_name or "—", "total_quantity": str(item.total_quantity), "total_amount": str(item.total_amount), "acts_count": item.acts_count} for item in report.items]

    file_buffer = export_report_to_pdf(report_data, items_data)
    raw_filename = f"report_{obj_data.name}_{MONTH_NAMES[report.start_month - 1]}-{MONTH_NAMES[report.end_month - 1]}_{report.end_year}.pdf"
    encoded_filename = urllib.parse.quote(raw_filename)

    return StreamingResponse(
        file_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )