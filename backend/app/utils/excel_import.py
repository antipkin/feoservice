"""Утилита для импорта плана из Excel."""
import io
from typing import List, Dict, Any, Tuple
from openpyxl import load_workbook


def clean_text(text: str) -> str:
    """
    Очищает текст от невидимых символов Excel и приводит к нижнему регистру.
    Удаляет: неразрывные пробелы (\xa0), символы нулевой ширины (\u200b),
    лишние пробелы в начале/конце.
    """
    if not text:
        return ""
    return str(text).replace('\xa0', ' ').replace('\u200b', '').strip().lower()


def parse_plan_excel(file_content: bytes) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Парсит Excel-файл с планом.
    Устойчив к объединенным ячейкам, смещенным заголовкам и строкам-категориям.
    """
    wb = load_workbook(io.BytesIO(file_content), data_only=True)
    ws = wb.active

    # 1. Читаем название плана (обычно A1)
    plan_name = "Импортированный план"
    if ws['A1'].value:
        plan_name = str(ws['A1'].value).strip()

    # 2. Ищем строку заголовков (ищем слово "Услуга" или "Наименование" в первых 20 строках)
    header_row_idx = None
    service_col = None

    for row_idx in range(1, min(20, (ws.max_row or 1) + 1)):
        for col_idx in range(1, (ws.max_column or 1) + 1):
            val = ws.cell(row=row_idx, column=col_idx).value
            if val and isinstance(val, str):
                val_clean = clean_text(val)
                if 'услуг' in val_clean or 'наименование' in val_clean:
                    header_row_idx = row_idx
                    service_col = col_idx - 1  # 0-based index
                    break
        if header_row_idx is not None:
            break

    if header_row_idx is None:
        raise ValueError(
            "Не удалось найти строку заголовков. Убедитесь, что в файле есть колонка "
            "с названием 'Услуга' или 'Наименование'."
        )

    # 3. Парсим заголовки
    headers = []
    for col_idx in range(1, (ws.max_column or 1) + 1):
        val = ws.cell(row=header_row_idx, column=col_idx).value
        headers.append(clean_text(val) if val else "")

    code_col = None
    unit_col = None
    month_cols = []

    for idx, header in enumerate(headers):
        if 'код' in header:
            code_col = idx
        elif 'ед' in header:
            unit_col = idx
        elif any(m in header for m in ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                                        'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']):
            month_cols.append(idx)

    # Fallback: если месяцы не найдены по названиям, берем всё между "Ед.изм" и "Итого"/"Цена"
    if not month_cols and service_col is not None:
        for idx in range(service_col + 1, len(headers)):
            h = headers[idx]
            if 'итого' in h or 'цена' in h or 'сумма' in h:
                break
            if 'код' in h or 'ед' in h:
                continue
            month_cols.append(idx)

    if not month_cols:
        raise ValueError("Не удалось определить колонки с месяцами.")

    # 4. Парсим данные услуг
    services = []
    for row_idx in range(header_row_idx + 1, (ws.max_row or 1) + 1):
        service_val = ws.cell(row=row_idx, column=service_col + 1).value
        if not service_val or str(service_val).strip() == '':
            continue

        service_str = clean_text(service_val)
        if 'итого' in service_str:
            continue

        svc_data = {
            'row_number': row_idx,
            'service_name': str(service_val).strip(),  # Сохраняем оригинал для отображения
            'service_code': None,
            'unit_symbol': 'ед.',
            'monthly_quantities': [],
        }

        if code_col is not None:
            code_val = ws.cell(row=row_idx, column=code_col + 1).value
            if code_val:
                svc_data['service_code'] = str(code_val).strip()

        if unit_col is not None:
            unit_val = ws.cell(row=row_idx, column=unit_col + 1).value
            if unit_val:
                svc_data['unit_symbol'] = str(unit_val).strip()

        # Считываем значения по месяцам
        for col_idx in month_cols:
            qty_val = ws.cell(row=row_idx, column=col_idx + 1).value
            try:
                if isinstance(qty_val, str):
                    qty_val = qty_val.replace(',', '.').replace(' ', '')
                qty = float(qty_val) if qty_val is not None else 0.0
            except (ValueError, TypeError):
                qty = 0.0
            svc_data['monthly_quantities'].append(qty)

        # Пропускаем строки-заголовки категорий (все нули и нет явной ед.изм)
        is_all_zero = all(qty == 0.0 for qty in svc_data['monthly_quantities'])
        if is_all_zero and (not unit_col or clean_text(svc_data['unit_symbol']) == 'ед.'):
            continue

        # Защита от ошибки Pydantic: гарантируем минимум 1 элемент
        if not svc_data['monthly_quantities']:
            svc_data['monthly_quantities'].append(0.0)

        services.append(svc_data)

    return {
        'plan_name': plan_name,
        'headers': headers,
        'month_cols_count': len(month_cols),
    }, services