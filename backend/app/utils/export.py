"""Утилиты для экспорта данных в Excel и PDF."""
import io
import os
from decimal import Decimal
from typing import List, Dict, Any

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO

# ============================================================
# НАСТРОЙКА ШРИФТА ДЛЯ КИРИЛЛИЦЫ (PDF)
# ============================================================
FONT_PATHS = [
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]

FONT_NAME = "Helvetica"
FONT_NAME_BOLD = "Helvetica-Bold"

for path in FONT_PATHS:
    if os.path.exists(path):
        try:
            pdfmetrics.registerFont(TTFont("CustomFont", path))
            FONT_NAME = "CustomFont"
            FONT_NAME_BOLD = "CustomFont"
            print(f"INFO: Successfully loaded Cyrillic font from {path}")
            break
        except Exception as e:
            print(f"WARNING: Failed to load font from {path}: {e}")


def format_money(value) -> str:
    if value is None:
        return "0,00 ₽"
    try:
        num = float(value)
        return f"{num:,.2f} ₽".replace(",", " ").replace(".", ",")
    except (ValueError, TypeError):
        return "0,00 ₽"


def format_number(value) -> str:
    if value is None:
        return "0"
    try:
        num = float(value)
        if num == int(num):
            return f"{int(num):,}".replace(",", " ")
        return f"{num:,.2f}".replace(",", " ").replace(".", ",")
    except (ValueError, TypeError):
        return "0"


# ============================================================
# ЭКСПОРТ ПЛАНА В EXCEL
# ============================================================
def export_plan_to_excel(
    plan_data: Dict[str, Any],
    items_data: List[Dict[str, Any]],
    categories_data: List[Dict[str, Any]],
    tariff_data: Dict[str, Any],
) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "План ФЭО"
    
    header_font = Font(bold=True, size=12)
    title_font = Font(bold=True, size=14)
    category_font = Font(bold=True, size=11)
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    header_fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")
    category_fill = PatternFill(start_color="E6E6FA", end_color="E6E6FA", fill_type="solid")
    total_fill = PatternFill(start_color="FFD700", end_color="FFD700", fill_type="solid")
    
    ws['A1'] = f"План ФЭО: {plan_data.get('name', '')}"
    ws['A1'].font = title_font
    ws['A2'] = f"Объект: {tariff_data.get('object_name', '')}"
    ws['A3'] = f"Период: {plan_data.get('start_month')}/{plan_data.get('start_year')} - {plan_data.get('period_months')} мес."
    ws['A4'] = f"Тариф: {format_money(tariff_data.get('tariff_per_unit'))} / {tariff_data.get('tariff_unit')}"
    ws['A5'] = f"Итого: {format_money(tariff_data.get('grand_total'))}"
    
    start_month = plan_data.get('start_month', 1)
    start_year = plan_data.get('start_year', 2026)
    period_months = plan_data.get('period_months', 12)
    
    month_names = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    months_headers = []
    for i in range(period_months):
        m = start_month + i
        y = start_year
        while m > 12:
            m -= 12
            y += 1
        months_headers.append(f"{month_names[m-1]} {y}")
    
    row = 7
    headers = ['Услуга', 'Ед.изм.'] + months_headers + ['Итого кол-во', 'Цена за ед.', 'Итого сумма']
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    items_by_category: Dict[int, List] = {}
    for item in items_data:
        cat_id = item.get('category_id') or 0
        if cat_id not in items_by_category:
            items_by_category[cat_id] = []
        items_by_category[cat_id].append(item)
    
    row += 1
    
    for cat in categories_data:
        cat_items = items_by_category.get(cat['id'], [])
        if not cat_items:
            continue
        
        cell = ws.cell(row=row, column=1, value=cat['name'])
        cell.font = category_font
        cell.fill = category_fill
        for c in range(1, len(headers) + 1):
            ws.cell(row=row, column=c).fill = category_fill
            ws.cell(row=row, column=c).border = thin_border
        
        cat_total = sum(float(it.get('total_amount', 0)) for it in cat_items)
        ws.cell(row=row, column=len(headers), value=float(cat_total)).number_format = '#,##0.00'
        ws.cell(row=row, column=len(headers)).font = category_font
        
        row += 1
        
        for item in cat_items:
            ws.cell(row=row, column=1, value=item.get('service_name', ''))
            ws.cell(row=row, column=2, value=item.get('unit_symbol', 'ед.'))
            
            monthly_dict = {f"{m['month']}-{m['year']}": float(m['quantity']) for m in item.get('monthly', [])}
            for i, mh in enumerate(months_headers):
                m = start_month + i
                y = start_year
                while m > 12:
                    m -= 12
                    y += 1
                qty = monthly_dict.get(f"{m}-{y}", 0)
                ws.cell(row=row, column=3 + i, value=qty if qty > 0 else None).number_format = '#,##0.00'
            
            ws.cell(row=row, column=len(headers) - 2, value=float(item.get('total_quantity', 0))).number_format = '#,##0.00'
            ws.cell(row=row, column=len(headers) - 1, value=float(item.get('unit_price', 0))).number_format = '#,##0.00'
            ws.cell(row=row, column=len(headers), value=float(item.get('total_amount', 0))).number_format = '#,##0.00'
            
            for c in range(1, len(headers) + 1):
                ws.cell(row=row, column=c).border = thin_border
            
            row += 1
    
    # 🎯 ИСПРАВЛЕНО: Убран лишний row += 1 перед итоговой строкой
    ws.cell(row=row, column=1, value="ИТОГО ПО ПЛАНУ:")
    ws.cell(row=row, column=1).font = Font(bold=True, size=12)
    ws.cell(row=row, column=len(headers), value=float(tariff_data.get('grand_total', 0))).number_format = '#,##0.00'
    ws.cell(row=row, column=len(headers)).font = Font(bold=True, size=12)
    for c in range(1, len(headers) + 1):
        ws.cell(row=row, column=c).fill = total_fill
        ws.cell(row=row, column=c).border = thin_border
    
    ws.column_dimensions['A'].width = 35
    ws.column_dimensions['B'].width = 10
    for i in range(len(months_headers)):
        ws.column_dimensions[get_column_letter(3 + i)].width = 12
    ws.column_dimensions[get_column_letter(len(headers) - 2)].width = 14
    ws.column_dimensions[get_column_letter(len(headers) - 1)].width = 14
    ws.column_dimensions[get_column_letter(len(headers))].width = 18
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# ============================================================
# ЭКСПОРТ ПЛАНА В PDF
# ============================================================
def export_plan_to_pdf(
    plan_data: Dict[str, Any],
    items_data: List[Dict[str, Any]],
    categories_data: List[Dict[str, Any]],
    tariff_data: Dict[str, Any],
) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=10*mm, rightMargin=10*mm, topMargin=15*mm, bottomMargin=15*mm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontName=FONT_NAME_BOLD, fontSize=14, spaceAfter=8)
    info_style = ParagraphStyle('CustomInfo', parent=styles['Normal'], fontName=FONT_NAME, fontSize=9, spaceAfter=3)
    
    elements = []
    elements.append(Paragraph(f"План ФЭО: {plan_data.get('name', '')}", title_style))
    elements.append(Paragraph(f"Объект: {tariff_data.get('object_name', '')}", info_style))
    elements.append(Paragraph(f"Период: {plan_data.get('start_month')}/{plan_data.get('start_year')} - {plan_data.get('period_months')} мес.", info_style))
    elements.append(Paragraph(f"Тариф: {format_money(tariff_data.get('tariff_per_unit'))} / {tariff_data.get('tariff_unit')}", info_style))
    elements.append(Paragraph(f"Итого: {format_money(tariff_data.get('grand_total'))}", info_style))
    elements.append(Spacer(1, 8*mm))
    
    start_month = plan_data.get('start_month', 1)
    start_year = plan_data.get('start_year', 2026)
    period_months = plan_data.get('period_months', 12)
    month_names = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    months_headers = []
    for i in range(period_months):
        m = start_month + i
        y = start_year
        while m > 12:
            m -= 12
            y += 1
        months_headers.append(f"{month_names[m-1]} {y}")
    
    col_widths = [70*mm, 12*mm] + [10*mm] * len(months_headers) + [15*mm, 15*mm, 25*mm]
    headers = ['Услуга', 'Ед.'] + months_headers + ['Итого кол-во', 'Цена', 'Итого сумма']
    data = [headers]
    
    items_by_category: Dict[int, List] = {}
    for item in items_data:
        cat_id = item.get('category_id') or 0
        if cat_id not in items_by_category:
            items_by_category[cat_id] = []
        items_by_category[cat_id].append(item)
    
    for cat in categories_data:
        cat_items = items_by_category.get(cat['id'], [])
        if not cat_items:
            continue
        
        cat_total = sum(float(it.get('total_amount', 0)) for it in cat_items)
        cat_row = [Paragraph(f"<b>{cat['name']}</b>", info_style)] + [''] * (len(headers) - 2) + [format_money(cat_total)]
        data.append(cat_row)
        
        for item in cat_items:
            monthly_dict = {f"{m['month']}-{m['year']}": float(m['quantity']) for m in item.get('monthly', [])}
            row_data = [item.get('service_name', ''), item.get('unit_symbol', 'ед.')]
            for i in range(len(months_headers)):
                m = start_month + i
                y = start_year
                while m > 12:
                    m -= 12
                    y += 1
                qty = monthly_dict.get(f"{m}-{y}", 0)
                row_data.append(format_number(qty) if qty > 0 else '—')
            
            row_data.append(format_number(item.get('total_quantity', 0)))
            row_data.append(format_money(item.get('unit_price', 0)))
            row_data.append(format_money(item.get('total_amount', 0)))
            data.append(row_data)
    
    total_row = [Paragraph("<b>ИТОГО ПО ПЛАНУ:</b>", info_style)] + [''] * (len(headers) - 2) + [format_money(tariff_data.get('grand_total', 0))]
    data.append(total_row)
    
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.gold),
        ('FONTNAME', (0, -1), (-1, -1), FONT_NAME_BOLD),
    ]))
    
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer


# ============================================================
# ЭКСПОРТ ФАКТА В EXCEL
# ============================================================
def export_fact_to_excel(
    fact_data: Dict[str, Any],
    comparison_data: List[Dict[str, Any]],
    object_name: str,
) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "План-Факт"
    
    title_font = Font(bold=True, size=14)
    header_font = Font(bold=True, size=11)
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    header_fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")
    total_fill = PatternFill(start_color="FFD700", end_color="FFD700", fill_type="solid")
    positive_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
    negative_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
    
    month_names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    
    ws['A1'] = f"План-факт анализ: {object_name}"
    ws['A1'].font = title_font
    ws['A2'] = f"Период: {month_names[fact_data.get('month', 1) - 1]} {fact_data.get('year', 2026)}"
    
    row = 4
    headers = ['Услуга', 'Ед.изм.', 'План кол-во', 'Факт кол-во', 'Отклонение', 'План сумма', 'Факт сумма', 'Отклонение %']
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    row += 1
    total_plan_amt = 0.0
    total_fact_amt = 0.0
    
    for item in comparison_data:
        plan_qty = float(item.get('plan_quantity', 0))
        fact_qty = float(item.get('fact_quantity', 0))
        plan_amt = float(item.get('plan_amount', 0))
        fact_amt = float(item.get('fact_amount', 0))
        dev_qty = float(item.get('deviation_qty', 0))
        dev_pct = float(item.get('deviation_pct', 0))
        
        total_plan_amt += plan_amt
        total_fact_amt += fact_amt
        
        ws.cell(row=row, column=1, value=item.get('service_name', ''))
        ws.cell(row=row, column=2, value=item.get('unit_symbol', 'ед.'))
        ws.cell(row=row, column=3, value=plan_qty).number_format = '#,##0.00'
        ws.cell(row=row, column=4, value=fact_qty).number_format = '#,##0.00'
        ws.cell(row=row, column=5, value=dev_qty).number_format = '#,##0.00'
        ws.cell(row=row, column=6, value=plan_amt).number_format = '#,##0.00'
        ws.cell(row=row, column=7, value=fact_amt).number_format = '#,##0.00'
        ws.cell(row=row, column=8, value=dev_pct).number_format = '0.00"%"'
        
        if dev_pct > 0:
            ws.cell(row=row, column=5).fill = positive_fill
            ws.cell(row=row, column=8).fill = positive_fill
        elif dev_pct < 0:
            ws.cell(row=row, column=5).fill = negative_fill
            ws.cell(row=row, column=8).fill = negative_fill
        
        for c in range(1, len(headers) + 1):
            ws.cell(row=row, column=c).border = thin_border
        
        row += 1
    
    # 🎯 ИСПРАВЛЕНО: Убран лишний row += 1 перед итоговой строкой
    ws.cell(row=row, column=1, value="ИТОГО:")
    ws.cell(row=row, column=1).font = Font(bold=True, size=12)
    ws.cell(row=row, column=6, value=total_plan_amt).number_format = '#,##0.00'
    ws.cell(row=row, column=6).font = Font(bold=True, size=12)
    ws.cell(row=row, column=7, value=total_fact_amt).number_format = '#,##0.00'
    ws.cell(row=row, column=7).font = Font(bold=True, size=12)
    
    for c in range(1, len(headers) + 1):
        ws.cell(row=row, column=c).fill = total_fill
        ws.cell(row=row, column=c).border = thin_border
    
    ws.column_dimensions['A'].width = 40
    ws.column_dimensions['B'].width = 10
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 15
    ws.column_dimensions['F'].width = 18
    ws.column_dimensions['G'].width = 18
    ws.column_dimensions['H'].width = 15
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# ============================================================
# ЭКСПОРТ ФАКТА В PDF
# ============================================================
def export_fact_to_pdf(
    fact_data: Dict[str, Any],
    comparison_data: List[Dict[str, Any]],
    object_name: str,
) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=10*mm, rightMargin=10*mm, topMargin=15*mm, bottomMargin=15*mm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontName=FONT_NAME_BOLD, fontSize=14, spaceAfter=8)
    info_style = ParagraphStyle('CustomInfo', parent=styles['Normal'], fontName=FONT_NAME, fontSize=9, spaceAfter=3)
    
    month_names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    
    elements = []
    elements.append(Paragraph(f"План-факт анализ: {object_name}", title_style))
    elements.append(Paragraph(f"Период: {month_names[fact_data.get('month', 1) - 1]} {fact_data.get('year', 2026)}", info_style))
    elements.append(Spacer(1, 8*mm))
    
    headers = ['Услуга', 'Ед.', 'План кол-во', 'Факт кол-во', 'Отклонение', 'План сумма', 'Факт сумма', 'Откл. %']
    data = [headers]
    
    total_plan_amt = 0.0
    total_fact_amt = 0.0
    
    for item in comparison_data:
        plan_amt = float(item.get('plan_amount', 0))
        fact_amt = float(item.get('fact_amount', 0))
        total_plan_amt += plan_amt
        total_fact_amt += fact_amt
        
        row_data = [
            item.get('service_name', ''),
            item.get('unit_symbol', 'ед.'),
            format_number(item.get('plan_quantity', 0)),
            format_number(item.get('fact_quantity', 0)),
            format_number(item.get('deviation_qty', 0)),
            format_money(item.get('plan_amount', 0)),
            format_money(item.get('fact_amount', 0)),
            f"{float(item.get('deviation_pct', 0)):.1f}%",
        ]
        data.append(row_data)
    
    total_row = [
        Paragraph("<b>ИТОГО:</b>", info_style),
        '', '', '', '',
        format_money(total_plan_amt),
        format_money(total_fact_amt),
        ''
    ]
    data.append(total_row)
    
    col_widths = [75*mm, 15*mm, 25*mm, 25*mm, 25*mm, 30*mm, 30*mm, 20*mm]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.gold),
        ('FONTNAME', (0, -1), (-1, -1), FONT_NAME_BOLD),
    ]))
    
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer

# ============================================================
# ЭКСПОРТ АКТА В PDF
# ============================================================
def export_act_to_pdf(
    act_data: Dict[str, Any],
    items_data: List[Dict[str, Any]],
) -> io.BytesIO:
    """Экспорт акта выполненных работ в PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,  # Книжная ориентация для акта
        leftMargin=20*mm,
        rightMargin=15*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ActTitle',
        parent=styles['Heading1'],
        fontName=FONT_NAME_BOLD,
        fontSize=14,
        alignment=1,  # CENTER
        spaceAfter=10,
    )
    info_style = ParagraphStyle(
        'ActInfo',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=10,
        spaceAfter=4,
    )
    small_style = ParagraphStyle(
        'ActSmall',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=8,
    )

    month_names = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    month_name = month_names[act_data.get('period_month', 1) - 1]
    year = act_data.get('period_year', 2026)

    elements = []

    # Заголовок
    elements.append(Paragraph("АКТ", title_style))
    elements.append(Paragraph(
        f"выполненных работ по обслуживанию",
        ParagraphStyle('subtitle', parent=info_style, alignment=1, fontSize=11)
    ))
    elements.append(Spacer(1, 5*mm))

    # Информация об акте
    elements.append(Paragraph(
        f"<b>№ {act_data.get('act_number', '')}</b> от {act_data.get('act_date', '')}",
        info_style
    ))
    elements.append(Paragraph(
        f"Период: {month_name} {year} г.",
        info_style
    ))
    elements.append(Paragraph(
        f"Объект: <b>{act_data.get('object_name', '')}</b>",
        info_style
    ))
    if act_data.get('object_address'):
        elements.append(Paragraph(
            f"Адрес: {act_data.get('object_address', '')}",
            info_style
        ))
    elements.append(Spacer(1, 5*mm))

    # Таблица
    headers = ['№', 'Наименование услуги', 'Ед.изм.', 'Периодичность', 'Кол-во', 'Цена, ₽', 'Сумма, ₽']
    data = [headers]

    total_amount = 0.0
    for idx, item in enumerate(items_data, 1):
        total_amount += float(item.get('total_amount', 0))
        row = [
            str(idx),
            item.get('service_name', ''),
            item.get('unit_symbol', 'ед.'),
            item.get('frequency', '—'),
            format_number(item.get('quantity', 0)),
            format_money(item.get('unit_price', 0)).replace(' ₽', ''),
            format_money(item.get('total_amount', 0)).replace(' ₽', ''),
        ]
        data.append(row)

    # Итоговая строка
    total_row = ['', '', '', '', '', Paragraph('<b>ИТОГО:</b>', small_style), format_money(total_amount)]
    data.append(total_row)

    # Ширины колонок (в сумме 170 мм = ширина A4 - поля)
    col_widths = [10*mm, 55*mm, 15*mm, 25*mm, 18*mm, 22*mm, 25*mm]

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('FONTNAME', (0, 0), (-1, 0), FONT_NAME_BOLD),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.gold),
        ('FONTNAME', (0, -1), (-1, -1), FONT_NAME_BOLD),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 10*mm))

    # Подписи
    elements.append(Paragraph(
        f"Общая сумма выполненных работ: <b>{format_money(total_amount)}</b>",
        info_style
    ))
    elements.append(Spacer(1, 15*mm))

    # Блок подписей
    signatures = [
        ['Заказчик: _________________', 'Исполнитель: _________________'],
        ['', ''],
        ['М.П.', 'М.П.'],
    ]
    sig_table = Table(signatures, colWidths=[85*mm, 85*mm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer

# ============================================================
# ЭКСПОРТ ОТЧЕТА В EXCEL
# ============================================================
def export_report_to_excel(
    report_data: Dict[str, Any],
    items_data: List[Dict[str, Any]],
) -> io.BytesIO:
    """Экспорт отчета по объекту за период в Excel."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Отчет"

    title_font = Font(bold=True, size=14)
    header_font = Font(bold=True, size=11)
    category_font = Font(bold=True, size=11)
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    header_fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")
    category_fill = PatternFill(start_color="E6E6FA", end_color="E6E6FA", fill_type="solid")
    total_fill = PatternFill(start_color="FFD700", end_color="FFD700", fill_type="solid")

    month_names = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    period_str = (
        f"{month_names[report_data.get('start_month', 1) - 1]} {report_data.get('start_year', 2026)} — "
        f"{month_names[report_data.get('end_month', 1) - 1]} {report_data.get('end_year', 2026)}"
    )

    # Заголовок
    ws['A1'] = f"Отчет по объекту: {report_data.get('object_name', '')}"
    ws['A1'].font = title_font
    ws['A2'] = f"Период: {period_str}"
    if report_data.get('object_address'):
        ws['A3'] = f"Адрес: {report_data.get('object_address', '')}"
    ws['A4'] = f"Итого: {format_money(report_data.get('total_amount', 0))}"

    # Заголовки таблицы
    row = 6
    headers = ['Категория', 'Услуга', 'Ед.изм.', 'Периодичность', 'Кол-во актов', 'Объем', 'Сумма']
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    # Группируем по категориям
    items_by_category: Dict[str, List] = {}
    for item in items_data:
        cat = item.get('category_name') or 'Без категории'
        if cat not in items_by_category:
            items_by_category[cat] = []
        items_by_category[cat].append(item)

    row += 1
    total_amount = 0.0
    total_quantity = 0.0

    for cat_name, cat_items in items_by_category.items():
        # Строка категории
        cell = ws.cell(row=row, column=1, value=cat_name)
        cell.font = category_font
        cell.fill = category_fill
        for c in range(1, len(headers) + 1):
            ws.cell(row=row, column=c).fill = category_fill
            ws.cell(row=row, column=c).border = thin_border
        row += 1

        for item in cat_items:
            qty = float(item.get('total_quantity', 0))
            amt = float(item.get('total_amount', 0))
            total_quantity += qty
            total_amount += amt

            ws.cell(row=row, column=1, value='')  # Категория уже показана
            ws.cell(row=row, column=2, value=item.get('service_name', ''))
            ws.cell(row=row, column=3, value=item.get('unit_symbol', 'ед.'))
            ws.cell(row=row, column=4, value=item.get('frequency', '—'))
            ws.cell(row=row, column=5, value=int(item.get('acts_count', 0)))
            ws.cell(row=row, column=6, value=qty).number_format = '#,##0.00'
            ws.cell(row=row, column=7, value=amt).number_format = '#,##0.00'

            for c in range(1, len(headers) + 1):
                ws.cell(row=row, column=c).border = thin_border

            row += 1

    # Итоговая строка
    row += 1
    ws.cell(row=row, column=1, value="ИТОГО:")
    ws.cell(row=row, column=1).font = Font(bold=True, size=12)
    ws.cell(row=row, column=6, value=total_quantity).number_format = '#,##0.00'
    ws.cell(row=row, column=6).font = Font(bold=True, size=12)
    ws.cell(row=row, column=7, value=total_amount).number_format = '#,##0.00'
    ws.cell(row=row, column=7).font = Font(bold=True, size=12)
    for c in range(1, len(headers) + 1):
        ws.cell(row=row, column=c).fill = total_fill
        ws.cell(row=row, column=c).border = thin_border

    # Ширины колонок
    ws.column_dimensions['A'].width = 25
    ws.column_dimensions['B'].width = 40
    ws.column_dimensions['C'].width = 10
    ws.column_dimensions['D'].width = 18
    ws.column_dimensions['E'].width = 14
    ws.column_dimensions['F'].width = 15
    ws.column_dimensions['G'].width = 18

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# ============================================================
# ЭКСПОРТ ОТЧЕТА В PDF
# ============================================================
def export_report_to_pdf(
    report_data: Dict[str, Any],
    items_data: List[Dict[str, Any]],
) -> io.BytesIO:
    """Экспорт отчета по объекту за период в PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,  # Книжная ориентация
        leftMargin=20*mm,
        rightMargin=15*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName=FONT_NAME_BOLD,
        fontSize=14,
        alignment=1,  # CENTER
        spaceAfter=10,
    )
    info_style = ParagraphStyle(
        'ReportInfo',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=10,
        spaceAfter=4,
    )
    small_style = ParagraphStyle(
        'ReportSmall',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=8,
    )

    month_names = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    month_names_full = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

    period_str = (
        f"{month_names_full[report_data.get('start_month', 1) - 1]} {report_data.get('start_year', 2026)} — "
        f"{month_names_full[report_data.get('end_month', 1) - 1]} {report_data.get('end_year', 2026)}"
    )

    elements = []

    # Заголовок
    elements.append(Paragraph("ОТЧЕТ", title_style))
    elements.append(Paragraph(
        "о выполненных работах по объекту за период",
        ParagraphStyle('subtitle', parent=info_style, alignment=1, fontSize=11)
    ))
    elements.append(Spacer(1, 5*mm))

    # Информация
    elements.append(Paragraph(
        f"Объект: <b>{report_data.get('object_name', '')}</b>",
        info_style
    ))
    if report_data.get('object_address'):
        elements.append(Paragraph(
            f"Адрес: {report_data.get('object_address', '')}",
            info_style
        ))
    elements.append(Paragraph(f"Период: <b>{period_str}</b>", info_style))
    elements.append(Spacer(1, 5*mm))

    # Таблица
    headers = ['№', 'Категория', 'Услуга', 'Ед.', 'Периодичность', 'Актов', 'Объем', 'Сумма']
    data = [headers]

    total_amount = 0.0
    total_quantity = 0.0

    # Группируем по категориям
    items_by_category: Dict[str, List] = {}
    for item in items_data:
        cat = item.get('category_name') or 'Без категории'
        if cat not in items_by_category:
            items_by_category[cat] = []
        items_by_category[cat].append(item)

    row_num = 1
    for cat_name, cat_items in items_by_category.items():
        for item in cat_items:
            qty = float(item.get('total_quantity', 0))
            amt = float(item.get('total_amount', 0))
            total_quantity += qty
            total_amount += amt

            row = [
                str(row_num),
                cat_name if len(cat_items) > 0 and cat_items[0] == item else '',
                item.get('service_name', ''),
                item.get('unit_symbol', 'ед.'),
                item.get('frequency', '—'),
                str(int(item.get('acts_count', 0))),
                format_number(qty),
                format_money(amt).replace(' ₽', ''),
            ]
            data.append(row)
            row_num += 1

    # Итоговая строка
    total_row = [
        '', '', '', '', '',
        Paragraph('<b>ИТОГО:</b>', small_style),
        format_number(total_quantity),
        format_money(total_amount)
    ]
    data.append(total_row)

    # Ширины колонок (в сумме ~170 мм)
    col_widths = [8*mm, 28*mm, 45*mm, 12*mm, 22*mm, 14*mm, 18*mm, 23*mm]

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('FONTNAME', (0, 0), (-1, 0), FONT_NAME_BOLD),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('ALIGN', (5, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, -1), (-1, -1), colors.gold),
        ('FONTNAME', (0, -1), (-1, -1), FONT_NAME_BOLD),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 10*mm))

    # Подпись
    elements.append(Paragraph(
        f"Общая сумма за период: <b>{format_money(total_amount)}</b>",
        info_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer

# ============================================================
# ЭКСПОРТ РАСЦЕНОК В EXCEL
# ============================================================
def export_rates_to_excel(rates_data: List[Dict[str, Any]]) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Расценки"

    header_font = Font(bold=True, size=11)
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    header_fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")

    headers = ['Объект', 'Услуга', 'Ед.изм.', 'Цена за ед.', 'Действует с', 'Действует по']
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center')

    for row_idx, data in enumerate(rates_data, 2):
        ws.cell(row=row_idx, column=1, value=data['object_name'])
        ws.cell(row=row_idx, column=2, value=data['service_name'])
        ws.cell(row=row_idx, column=3, value=data['unit_symbol'])
        ws.cell(row=row_idx, column=4, value=float(data['price_per_unit'])).number_format = '#,##0.00'
        ws.cell(row=row_idx, column=5, value=data['valid_from'])
        ws.cell(row=row_idx, column=6, value=data['valid_to'])
        for c in range(1, 7):
            ws.cell(row=row_idx, column=c).border = thin_border

    ws.column_dimensions['A'].width = 25
    ws.column_dimensions['B'].width = 40
    ws.column_dimensions['C'].width = 10
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 15
    ws.column_dimensions['F'].width = 15

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


# ============================================================
# ЭКСПОРТ РАСЦЕНОК В PDF
# ============================================================
def export_rates_to_pdf(rates_data: List[Dict[str, Any]]) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=15*mm, rightMargin=15*mm, topMargin=20*mm, bottomMargin=20*mm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('RatesTitle', parent=styles['Heading1'], fontName=FONT_NAME_BOLD, fontSize=14, spaceAfter=10, alignment=1)
    info_style = ParagraphStyle('RatesInfo', parent=styles['Normal'], fontName=FONT_NAME, fontSize=8)
    
    elements = []
    elements.append(Paragraph("Справочник расценок на услуги", title_style))
    elements.append(Spacer(1, 5*mm))
    
    headers = ['Объект', 'Услуга', 'Ед.', 'Цена', 'С', 'По']
    data = [headers]
    
    for item in rates_data:
        data.append([
            item['object_name'],
            item['service_name'],
            item['unit_symbol'],
            format_money(item['price_per_unit']).replace(' ₽', ''),
            item['valid_from'],
            item['valid_to']
        ])
    
    col_widths = [50*mm, 70*mm, 15*mm, 25*mm, 25*mm, 25*mm]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NAME),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('FONTNAME', (0, 0), (-1, 0), FONT_NAME_BOLD),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer

def export_audit_to_excel(logs: list) -> BytesIO:
    """
    Экспортирует журнал аудита в Excel с форматированием.
    
    Args:
        logs: Список словарей с записями аудита
    
    Returns:
        BytesIO с содержимым Excel-файла
    """
    from openpyxl import Workbook
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Журнал аудита"

    # === СТИЛИ ===
    header_font = Font(bold=True, size=11, color="FFFFFF")
    header_fill = PatternFill(start_color="2C3E50", end_color="2C3E50", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    
    create_fill = PatternFill(start_color="D4EDDA", end_color="D4EDDA", fill_type="solid")
    update_fill = PatternFill(start_color="CCE5FF", end_color="CCE5FF", fill_type="solid")
    delete_fill = PatternFill(start_color="F8D7DA", end_color="F8D7DA", fill_type="solid")
    
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # === ЗАГОЛОВКИ ===
    headers = [
        "№", "Дата и время", "Пользователь", "Действие", 
        "Тип ресурса", "ID ресурса", "IP-адрес", "Было (old_values)", "Стало (new_values)"
    ]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # === ДАННЫЕ ===
    import json
    
    for idx, log in enumerate(logs, 1):
        row = idx + 1
        
        # Определяем цвет строки по действию
        action = log.get("action", "")
        if action == "CREATE":
            row_fill = create_fill
        elif action == "UPDATE":
            row_fill = update_fill
        elif action == "DELETE":
            row_fill = delete_fill
        else:
            row_fill = None
        
        # Преобразуем JSON-значения в читаемый вид
        old_values = log.get("old_values")
        new_values = log.get("new_values")
        
        if old_values and isinstance(old_values, (dict, list)):
            old_str = json.dumps(old_values, ensure_ascii=False, indent=2, default=str)
        else:
            old_str = str(old_values) if old_values else "—"
        
        if new_values and isinstance(new_values, (dict, list)):
            new_str = json.dumps(new_values, ensure_ascii=False, indent=2, default=str)
        else:
            new_str = str(new_values) if new_values else "—"
        
        # Форматируем дату
        created_at = log.get("created_at")
        if hasattr(created_at, "strftime"):
            date_str = created_at.strftime("%d.%m.%Y %H:%M:%S")
        else:
            date_str = str(created_at)
        
        # Записываем ячейки
        row_data = [
            idx,
            date_str,
            log.get("username", ""),
            action,
            log.get("resource_type", ""),
            log.get("resource_id") or "—",
            log.get("ip_address") or "—",
            old_str,
            new_str,
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="top", wrap_text=(col >= 8))
            if row_fill:
                cell.fill = row_fill

    # === ШИРИНА КОЛОНОК ===
    column_widths = {
        'A': 6,   # №
        'B': 20,  # Дата
        'C': 18,  # Пользователь
        'D': 12,  # Действие
        'E': 20,  # Тип ресурса
        'F': 12,  # ID
        'G': 15,  # IP
        'H': 50,  # Было
        'I': 50,  # Стало
    }
    
    for col_letter, width in column_widths.items():
        ws.column_dimensions[col_letter].width = width

    # === ЗАМОРАЖИВАЕМ ПЕРВУЮ СТРОКУ ===
    ws.freeze_panes = "A2"
    
    # === АВТОФИЛЬТР ===
    ws.auto_filter.ref = ws.dimensions

    # === СОХРАНЯЕМ В BytesIO ===
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output