import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.schemas.report import (
    ReportCreate, ReportUpdate, ReportResponse, ReportListItem
)
from app.utils.export import export_report_to_excel, export_report_to_pdf

router = APIRouter(prefix="/reports", tags=["Отчеты"])


MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]


def period_to_abs(year: int, month: int) -> int:
    """Преобразует (год, месяц) в абсолютный номер месяца для сравнения."""
    return year * 12 + month


async def _aggregate_report_items(
    db: AsyncSession,
    object_id: int,
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int
) -> List[dict]:
    """
    Агрегирует данные актов объекта за период.
    Возвращает список словарей для создания ReportItem.
    """
    start_abs = period_to_abs(start_year, start_month)
    end_abs = period_to_abs(end_year, end_month)

    # Находим все акты объекта, попадающие в период
    query = (
        select(Act, ActItem, FactHeader, ServiceType, ServiceCategory)
        .join(ActItem, Act.id == ActItem.act_id)
        .join(FactHeader, Act.fact_header_id == FactHeader.id)
        .join(ServiceType, ActItem.service_type_id == ServiceType.id)
        .outerjoin(ServiceCategory, ServiceType.category_id == ServiceCategory.id)
        .options(selectinload(ServiceType.unit))  # 🎯 ИСПРАВЛЕНО: жадная загрузка unit
        .where(
            FactHeader.object_id == object_id,
            (FactHeader.year * 12 + FactHeader.month) >= start_abs,
            (FactHeader.year * 12 + FactHeader.month) <= end_abs,
        )
    )
    result = await db.execute(query)
    rows = result.all()

    # Группируем по service_type_id
    aggregated = defaultdict(lambda: {
        'service_name': '',
        'unit_symbol': '',
        'frequency': None,
        'category_name': None,
        'total_quantity': Decimal('0'),
        'total_amount': Decimal('0'),
        'acts_count': 0,
        'act_ids': set(),
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

    # Преобразуем в список словарей
    items_data = []
    for svc_id, data in aggregated.items():
        items_data.append({
            'service_type_id': svc_id,
            'service_name': data['service_name'],
            'unit_symbol': data['unit_symbol'],
            'frequency': data['frequency'],
            'category_name': data['category_name'],
            'total_quantity': data['total_quantity'],
            'total_amount': data['total_amount'],
            'acts_count': len(data['act_ids']),
        })

    return items_data


async def _rebuild_report_items(
    db: AsyncSession,
    report: Report
) -> None:
    """Пересоздает позиции отчета на основе текущего периода."""
    # Используем delete() вместо цикла, чтобы избежать lazy-loading ошибки в async
    await db.execute(delete(ReportItem).where(ReportItem.report_id == report.id))
    await db.flush()

    # Агрегируем новые данные
    items_data = await _aggregate_report_items(
        db, report.object_id,
        report.start_year, report.start_month,
        report.end_year, report.end_month
    )

    # Создаем новые items
    total = Decimal('0')
    for data in items_data:
        item = ReportItem(
            report_id=report.id,
            **data
        )
        db.add(item)
        total += data['total_amount']

    report.total_amount = total
    await db.flush()


# ============================================================
# CRUD
# ============================================================

@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(report_in: ReportCreate, db: AsyncSession = Depends(get_db)):
    """Создает отчет и агрегирует данные актов за период."""
    obj = await db.execute(select(Object).where(Object.id == report_in.object_id))
    if not obj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Объект не найден")

    report = Report(
        object_id=report_in.object_id,
        start_month=report_in.start_month,
        start_year=report_in.start_year,
        end_month=report_in.end_month,
        end_year=report_in.end_year,
        name=report_in.name,
        notes=report_in.notes,
        status="draft",
    )
    db.add(report)
    await db.flush()

    # Агрегируем данные (теперь безопасно для async)
    await _rebuild_report_items(db, report)

    await db.commit()

    # Возвращаем с items
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.items))
        .where(Report.id == report.id)
    )
    return result.scalar_one()


@router.get("/", response_model=List[ReportListItem])
async def get_reports(
    object_id: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Список отчетов с фильтрацией."""
    query = select(Report).join(Object, Report.object_id == Object.id)
    if object_id:
        query = query.where(Report.object_id == object_id)
    if year:
        query = query.where(
            (Report.start_year <= year) & (Report.end_year >= year)
        )
    query = query.order_by(Report.created_at.desc())

    result = await db.execute(query)
    reports = result.scalars().all()

    items = []
    for r in reports:
        obj = await db.execute(select(Object).where(Object.id == r.object_id))
        obj_data = obj.scalar_one()
        items.append(ReportListItem(
            id=r.id,
            object_id=r.object_id,
            object_name=obj_data.name,
            start_month=r.start_month,
            start_year=r.start_year,
            end_month=r.end_month,
            end_year=r.end_year,
            name=r.name,
            status=r.status,
            total_amount=r.total_amount,
            created_at=r.created_at,
        ))
    return items


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """Получить отчет с позициями."""
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.items))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")
    return report


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    report_in: ReportUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Обновить отчет (включая изменение периода с пересчетом)."""
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.items))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    update_data = report_in.model_dump(exclude_unset=True)
    period_changed = any(k in update_data for k in ['start_year', 'start_month', 'end_year', 'end_month'])

    for field, value in update_data.items():
        setattr(report, field, value)

    # Если изменился период — пересчитываем items
    if period_changed:
        await _rebuild_report_items(db, report)

    await db.commit()

    result = await db.execute(
        select(Report)
        .options(selectinload(Report.items))
        .where(Report.id == report.id)
    )
    return result.scalar_one()


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """Удалить отчет (каскадно удалятся items)."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    await db.delete(report)
    await db.commit()
    return None


# ============================================================
# ЭКСПОРТ
# ============================================================

@router.get("/{report_id}/export/excel")
async def export_report_excel(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.items))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    obj = await db.execute(select(Object).where(Object.id == report.object_id))
    obj_data = obj.scalar_one()

    report_data = {
        "name": report.name or "Отчет по объекту",
        "object_name": obj_data.name,
        "object_address": obj_data.address or "",
        "start_month": report.start_month,
        "start_year": report.start_year,
        "end_month": report.end_month,
        "end_year": report.end_year,
        "total_amount": str(report.total_amount),
    }

    items_data = []
    for item in report.items:
        items_data.append({
            "service_name": item.service_name,
            "unit_symbol": item.unit_symbol,
            "frequency": item.frequency or "—",
            "category_name": item.category_name or "—",
            "total_quantity": str(item.total_quantity),
            "total_amount": str(item.total_amount),
            "acts_count": item.acts_count,
        })

    file_buffer = export_report_to_excel(report_data, items_data)

    raw_filename = f"report_{obj_data.name}_{MONTH_NAMES[report.start_month - 1]}-{MONTH_NAMES[report.end_month - 1]}_{report.end_year}.xlsx"
    encoded_filename = urllib.parse.quote(raw_filename)

    return StreamingResponse(
        file_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/{report_id}/export/pdf")
async def export_report_pdf(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Report)
        .options(selectinload(Report.items))
        .where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Отчет не найден")

    obj = await db.execute(select(Object).where(Object.id == report.object_id))
    obj_data = obj.scalar_one()

    report_data = {
        "name": report.name or "Отчет по объекту",
        "object_name": obj_data.name,
        "object_address": obj_data.address or "",
        "start_month": report.start_month,
        "start_year": report.start_year,
        "end_month": report.end_month,
        "end_year": report.end_year,
        "total_amount": str(report.total_amount),
    }

    items_data = []
    for item in report.items:
        items_data.append({
            "service_name": item.service_name,
            "unit_symbol": item.unit_symbol,
            "frequency": item.frequency or "—",
            "category_name": item.category_name or "—",
            "total_quantity": str(item.total_quantity),
            "total_amount": str(item.total_amount),
            "acts_count": item.acts_count,
        })

    file_buffer = export_report_to_pdf(report_data, items_data)

    raw_filename = f"report_{obj_data.name}_{MONTH_NAMES[report.start_month - 1]}-{MONTH_NAMES[report.end_month - 1]}_{report.end_year}.pdf"
    encoded_filename = urllib.parse.quote(raw_filename)

    return StreamingResponse(
        file_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )