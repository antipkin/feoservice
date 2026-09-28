// frontend/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ============================================================
// БАЗОВАЯ ФУНКЦИЯ ДЛЯ ЗАПРОСОВ
// ============================================================
export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ============================================================
// API ДЛЯ ОБЪЕКТОВ
// ============================================================
export const objectsApi = {
  getAll: () => fetchAPI('/objects'),
  create: (data: any) => fetchAPI('/objects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/objects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/objects/${id}`, { method: 'DELETE' }),
};

// ============================================================
// API ДЛЯ ЕДИНИЦ ИЗМЕРЕНИЯ
// ============================================================
export const unitsApi = {
  getAll: () => fetchAPI('/units'),
};

// ============================================================
// API ДЛЯ КАТЕГОРИЙ УСЛУГ
// ============================================================
export const serviceCategoriesApi = {
  getAll: () => fetchAPI('/service-categories'),
};

// ============================================================
// API ДЛЯ УСЛУГ И РАСЦЕНОК
// ============================================================
export const servicesApi = {
  // Услуги
  getAll: () => fetchAPI('/services/types'),
  create: (data: any) => fetchAPI('/services/types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchAPI(`/services/types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/services/types/${id}`, { method: 'DELETE' }),

  // Расценки
  getRates: (objectId?: number) => {
    const params = objectId ? `?object_id=${objectId}` : '';
    return fetchAPI(`/services/rates${params}`);
  },
  createRate: (data: any) => fetchAPI('/services/rates', { method: 'POST', body: JSON.stringify(data) }),
  updateRate: (id: number, data: any) => fetchAPI(`/services/rates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRate: (id: number) => fetchAPI(`/services/rates/${id}`, { method: 'DELETE' }),
  exportRatesExcel: (objectId?: number) => {
    const params = objectId ? `?object_id=${objectId}` : '';
    return `${API_URL}/services/rates/export/excel${params}`;
  },
  exportRatesPdf: (objectId?: number) => {
    const params = objectId ? `?object_id=${objectId}` : '';
    return `${API_URL}/services/rates/export/pdf${params}`;
  },
};

// ============================================================
// API ДЛЯ ПЛАНИРОВАНИЯ
// ============================================================
export const plansApi = {
  getAll: (objectId?: number, year?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    return fetchAPI(`/plans?${params.toString()}`);
  },
  create: (data: any) => fetchAPI('/plans', { method: 'POST', body: JSON.stringify(data) }),
  delete: (planId: number) => fetchAPI(`/plans/${planId}`, { method: 'DELETE' }),
  copy: (planId: number, data: any) =>
    fetchAPI(`/plans/${planId}/copy`, { method: 'POST', body: JSON.stringify(data) }),
  getItems: (planId: number) => fetchAPI(`/plans/${planId}/items`),
  addItem: (planId: number, data: any) =>
    fetchAPI(`/plans/${planId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (planId: number, itemId: number, data: any) =>
    fetchAPI(`/plans/${planId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (planId: number, itemId: number) =>
    fetchAPI(`/plans/${planId}/items/${itemId}`, { method: 'DELETE' }),
  getTariff: (planId: number) => fetchAPI(`/plans/${planId}/tariff`),
  exportExcel: (planId: number) => `${API_URL}/plans/${planId}/export/excel`,
  exportPdf: (planId: number) => `${API_URL}/plans/${planId}/export/pdf`,
  
  // 🆕 Получение расценок по месяцам для услуги в рамках плана
  getServiceRates: (planId: number, serviceTypeId: number) =>
    fetchAPI(`/plans/${planId}/services/${serviceTypeId}/rates`),
};

// ============================================================
// API ДЛЯ ВВОДА ФАКТА
// ============================================================
export const factsApi = {
  getAll: (objectId?: number, year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return fetchAPI(`/facts?${params.toString()}`);
  },
  create: (data: any) => fetchAPI('/facts', { method: 'POST', body: JSON.stringify(data) }),
  get: (factId: number) => fetchAPI(`/facts/${factId}`),
  update: (factId: number, data: any) => fetchAPI(`/facts/${factId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (factId: number) => fetchAPI(`/facts/${factId}`, { method: 'DELETE' }),
  copyFromPlan: (factId: number, planId: number, month: number, year: number) =>
    fetchAPI(`/facts/${factId}/copy-from-plan?plan_id=${planId}&month=${month}&year=${year}`, { method: 'POST' }),
  getItems: (factId: number) => fetchAPI(`/facts/${factId}/items`),
  addItem: (factId: number, data: any) =>
    fetchAPI(`/facts/${factId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (itemId: number, data: any) =>
    fetchAPI(`/facts/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (itemId: number) => fetchAPI(`/facts/items/${itemId}`, { method: 'DELETE' }),
  getPlanFactComparison: (factId: number) => fetchAPI(`/facts/${factId}/plan-fact`),
  exportExcel: (factId: number) => `${API_URL}/facts/${factId}/export/excel`,
  exportPdf: (factId: number) => `${API_URL}/facts/${factId}/export/pdf`,
};

// ============================================================
// API ДЛЯ АКТОВ
// ============================================================
export const actsApi = {
  getAll: (objectId?: number, year?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    return fetchAPI(`/acts?${params.toString()}`);
  },
  createFromFact: (factId: number) =>
    fetchAPI(`/acts/from-fact/${factId}`, { method: 'POST' }),
  get: (actId: number) => fetchAPI(`/acts/${actId}`),
  delete: (actId: number) => fetchAPI(`/acts/${actId}`, { method: 'DELETE' }),
  exportPdf: (actId: number) => `${API_URL}/acts/${actId}/export/pdf`,
};

// ============================================================
// API ДЛЯ ОТЧЕТОВ
// ============================================================
export const reportsApi = {
  getAll: (objectId?: number, year?: number) => {
    const params = new URLSearchParams();
    if (objectId) params.append('object_id', objectId.toString());
    if (year) params.append('year', year.toString());
    return fetchAPI(`/reports?${params.toString()}`);
  },
  create: (data: any) => fetchAPI('/reports', { method: 'POST', body: JSON.stringify(data) }),
  get: (reportId: number) => fetchAPI(`/reports/${reportId}`),
  update: (reportId: number, data: any) => fetchAPI(`/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (reportId: number) => fetchAPI(`/reports/${reportId}`, { method: 'DELETE' }),
  exportExcel: (reportId: number) => `${API_URL}/reports/${reportId}/export/excel`,
  exportPdf: (reportId: number) => `${API_URL}/reports/${reportId}/export/pdf`,
};

// ============================================================
// API ДЛЯ ДАШБОРДА
// ============================================================
export const dashboardApi = {
  getStats: (year?: number) => {
    const params = year ? `?year=${year}` : '';
    return fetchAPI(`/dashboard/stats${params}`);
  },
};

// ============================================================
// API ДЛЯ ИМПОРТА ПЛАНА ИЗ EXCEL
// ============================================================
export const importApi = {
  preview: async (file: File, objectId: number, startMonth: number, startYear: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('object_id', objectId.toString());
    formData.append('start_month', startMonth.toString());
    formData.append('start_year', startYear.toString());

    const res = await fetch(`${API_URL}/plans/import-excel/preview`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${res.status}`);
    }
    return res.json();
  },
  confirm: (data: any) =>
    fetchAPI('/plans/import-excel/confirm', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================
// ТИПЫ ДАННЫХ
// ============================================================

// --- Объекты ---
export interface ObjectData {
  id: number;
  name: string;
  type: string;
  address?: string;
  area_sqm: string | null;
  spaces_count: number | null;
  tariff_base: 'area' | 'spaces';
  is_active: boolean;
}

// --- Единицы измерения ---
export interface UnitData {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
}

// --- Категории услуг ---
export interface ServiceCategoryData {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

// --- Услуги ---
export interface ServiceData {
  id: number;
  code: string;
  name: string;
  unit_id: number;
  category_id: number;
  frequency: string | null;
  is_active: boolean;
  unit: UnitData | null;
  category: ServiceCategoryData | null;
}

// --- Расценки на услуги ---
export interface ServiceRateData {
  id: number;
  object_id: number | null;
  service_type_id: number;
  price_per_unit: string;
  valid_from: string;
  valid_to: string | null;
  service_name?: string;
  object_name?: string;
}

// --- Планы ---
export interface PlanData {
  id: number;
  object_id: number;
  start_year: number;
  start_month: number;
  period_months: number;
  name: string;
  status: string;
}

export interface MonthlyData {
  id: number;
  month: number;
  year: number;
  quantity: string;
  unit_price: string;
  amount: string;
}

export interface PlanItemData {
  id: number;
  service_type_id: number;
  total_quantity: string;
  total_amount: string;
  frequency: string | null;
  description: string | null;
  monthly: MonthlyData[];
}

export interface TariffData {
  grand_total: string;
  tariff_per_unit: string;
  object_name: string;
  object_type: string;
  tariff_base: 'area' | 'spaces';
  tariff_unit: string;
  divisor: string;
}

// --- Факт ---
export interface FactHeaderData {
  id: number;
  object_id: number;
  year: number;
  month: number;
  status: string;
  created_by: number | null;
  created_at: string;
  approved_by: number | null;
  approved_at: string | null;
}

export interface FactItemData {
  id: number;
  fact_header_id: number;
  plan_item_id: number | null;
  service_type_id: number;
  actual_quantity: string;
  unit_price: string;
  actual_amount: string;
  executed_at: string | null;
  executor: string | null;
  notes: string | null;
}

export interface PlanFactComparisonItem {
  service_type_id: number;
  service_name: string;
  unit_symbol: string;
  plan_quantity: string;
  fact_quantity: string;
  plan_amount: string;
  fact_amount: string;
  deviation_qty: string;
  deviation_pct: string;
}

// --- Акты ---
export interface ActItemData {
  id: number;
  act_id: number;
  service_type_id: number;
  frequency: string | null;
  quantity: string;
  unit_price: string;
  total_amount: string | null;
}

export interface ActData {
  id: number;
  act_number: string;
  act_date: string;
  fact_header_id: number;
  total_amount: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
  items: ActItemData[];
}

// --- Отчеты ---
export interface ReportItemData {
  id: number;
  report_id: number;
  service_type_id: number;
  service_name: string;
  unit_symbol: string;
  frequency: string | null;
  category_name: string | null;
  total_quantity: string;
  total_amount: string;
  acts_count: number;
}

export interface ReportData {
  id: number;
  object_id: number;
  object_name?: string;
  start_month: number;
  start_year: number;
  end_month: number;
  end_year: number;
  name: string | null;
  status: string;
  total_amount: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: ReportItemData[];
}

export interface ReportListItemData {
  id: number;
  object_id: number;
  object_name: string;
  start_month: number;
  start_year: number;
  end_month: number;
  end_year: number;
  name: string | null;
  status: string;
  total_amount: string;
  created_at: string;
}

// --- Дашборд ---
export interface KPICard {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  color: string;
}

export interface MonthlyPlanFact {
  month_label: string;
  plan_amount: number;
  fact_amount: number;
  deviation: number;
}

export interface TopDeviation {
  service_name: string;
  category_name: string;
  plan_amount: number;
  fact_amount: number;
  deviation_pct: number;
}

export interface CategoryDistribution {
  category_name: string;
  total_amount: number;
  percentage: number;
}

export interface Alert {
  object_name: string;
  period: string;
  service_name: string;
  deviation_pct: number;
  severity: string;
}

export interface DashboardData {
  kpi: KPICard[];
  monthly_plan_fact: MonthlyPlanFact[];
  top_deviations: TopDeviation[];
  category_distribution: CategoryDistribution[];
  alerts: Alert[];
}

// --- Импорт из Excel ---
export interface ImportedServiceRow {
  row_number: number;
  service_code: string | null;
  service_name: string;
  unit_symbol: string;
  monthly_quantities: number[];
  matched_service_id: number | null;
  match_status: string;
}

export interface ImportPreview {
  file_name: string;
  plan_name: string;
  object_id: number;
  object_name: string;
  start_month: number;
  start_year: number;
  period_months: number;
  services: ImportedServiceRow[];
  warnings: string[];
}